import test from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { seedProductionSlice } from '@/src/infrastructure/postgres/slice-seed';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { provisionReasoningContexts } from '@/src/infrastructure/postgres/reasoning-context';
import { seedScientificTestPrincipal } from './postgres-reasoning-fixtures';
import { completeLegacyFixtureMeasurementPlans } from './complete-legacy-fixture-measurement-plans';
import { runJudgmentContract } from './postgres-run-judgment-contract';
const run = promisify(execFile);
void test('Run judgment Native PostgreSQL: criteria-free and optional Evaluation with preserved history/permissions', async () => {
  const bin = process.env.DXT_TEST_POSTGRES_BIN;
  if (!bin) throw new Error('DXT_TEST_POSTGRES_BIN must point to a disposable-test PostgreSQL binary installation');
  const directory = await mkdtemp(join(tmpdir(), 'dxt-wp04-'));
  const data = join(directory, 'data');
  let started = false;
  let db: PgDatabase | undefined;
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => {
      const addr = server.address(); const p = typeof addr === 'object' && addr ? addr.port : 0;
      server.close(error => error ? reject(error) : resolve(p));
    });
  });
  try {
    await run(join(bin, 'initdb'), ['-D', data, '-U', 'dxt_test', '--auth=trust', '--no-locale', '--encoding=UTF8']);
    await run(join(bin, 'pg_ctl'), ['-D', data, '-l', join(directory, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1 -k ${directory}`, 'start', '-w']); started = true;
    db = new PgDatabase({ connectionString: `postgresql://dxt_test@127.0.0.1:${port}/postgres`, max: 2 });
    const migrations = 'src/infrastructure/postgres/migrations';
    for (const file of (await readdir(migrations)).filter(f => /^\d+.*\.sql$/.test(f)).sort()) await db.query(await readFile(join(migrations, file), 'utf8'));
    await seedProductionSlice(db, configurationRepository); await seedScientificTestPrincipal(db);
    await provisionMeasurementReferences(db, definitions); await provisionReasoningContexts(db, lifecycleAuthoringProfiles);
    await completeLegacyFixtureMeasurementPlans(db);
    for (const result of await runJudgmentContract(db)) console.log(result);
  } finally {
    await db?.close(); if (started) await run(join(bin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w']);
    await rm(directory, { recursive: true, force: true });
  }
});
