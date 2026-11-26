import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { createServer } from 'node:net';
import { promisify } from 'node:util';
import test from 'node:test';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { seedProductionSlice } from '@/src/infrastructure/postgres/slice-seed';
import { seedScientificTestPrincipal } from './postgres-reasoning-fixtures';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { definitions } from '@/src/mock/reference';
import { provisionReasoningContexts } from '@/src/infrastructure/postgres/reasoning-context';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { completeLegacyFixtureMeasurementPlans } from './complete-legacy-fixture-measurement-plans';
import { recipeSourceContract } from './postgres-recipe-source-contract';
import { readdir } from 'node:fs/promises';
void test('native PostgreSQL 18 persists exact Recipe Source selections with scoped grants and immutable usage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dxt-native-postgres-'));
  const postgresBin = process.env.DXT_POSTGRES_BIN;
  if (!postgresBin)
    throw new Error(
      'DXT_POSTGRES_BIN must point to a native PostgreSQL bin directory.',
    );
  const run = promisify(execFile);
  const dataDir = join(directory, 'data');
  const socketDir = join(directory, 'socket');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(socketDir));
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const selected =
        typeof address === 'object' && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(selected)));
    });
  });
  const initdb = join(postgresBin, 'initdb');
  const pgCtl = join(postgresBin, 'pg_ctl');
  await run(initdb, [
    '-D',
    dataDir,
    '-U',
    'dxt_test',
    '--auth=trust',
    '--no-locale',
    '--encoding=UTF8',
  ]);
  const start = () =>
    run(pgCtl, [
      '-D',
      dataDir,
      '-l',
      join(directory, 'postgres.log'),
      '-o',
      `-p ${port} -h 127.0.0.1 -k ${socketDir}`,
      'start',
      '-w',
    ]);
  const stop = () => run(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast', '-w']);
  let running = false;
  let database: PgDatabase | undefined;
  try {
    await start();
    running = true;
    const connectionString = `postgresql://dxt_test@127.0.0.1:${port}/postgres`;
    database = new PgDatabase({ connectionString, max: 2 });
    for (const file of (await readdir('src/infrastructure/postgres/migrations'))
      .filter((f) => /^\d{3}.*\.sql$/.test(f))
      .sort())
      await database.query(
        await readFile(
          join('src/infrastructure/postgres/migrations', file),
          'utf8',
        ),
      );
    await seedProductionSlice(database, configurationRepository);
    await seedScientificTestPrincipal(database);
    await provisionMeasurementReferences(database, definitions);
    await provisionReasoningContexts(database, lifecycleAuthoringProfiles);
    await completeLegacyFixtureMeasurementPlans(database);
    const proof = await recipeSourceContract(database);
    const persisted = (
      await database.query(
        'SELECT * FROM dxt_sample.recipe_source_selection WHERE run_id=$1 ORDER BY binding_id',
        [proof.physical],
      )
    ).rows;
    await database.close();
    await stop();
    running = false;
    await start();
    running = true;
    database = new PgDatabase({ connectionString, max: 2 });
    assert.deepEqual(
      (
        await database.query(
          'SELECT * FROM dxt_sample.recipe_source_selection WHERE run_id=$1 ORDER BY binding_id',
          [proof.physical],
        )
      ).rows,
      persisted,
    );
    await database.close();
  } finally {
    await database?.close().catch(() => undefined);
    if (running) await stop().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
