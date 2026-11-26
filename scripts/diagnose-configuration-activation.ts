/** Fixed five-run diagnostic in new in-memory databases. Never opens a configured database. */
import { writeFile, readFile, readdir } from 'node:fs/promises';
import { PGliteTestDatabase } from '../src/infrastructure/postgres/pglite-test-database';
import { seedProductionSlice } from '../src/infrastructure/postgres/slice-seed';
import { configurationRepository } from '../src/mock/configuration-packages';
import { seedScientificTestPrincipal } from '../tests/postgres-reasoning-fixtures';
import { provisionMeasurementReferences } from '../src/infrastructure/postgres/measurement-references';
import { provisionReasoningContexts } from '../src/infrastructure/postgres/reasoning-context';
import { definitions } from '../src/mock/reference';
import { lifecycleAuthoringProfiles } from '../src/mock/lifecycle-authoring';
import { completeLegacyFixtureMeasurementPlans } from '../tests/complete-legacy-fixture-measurement-plans';
import { productionConfigurationStudyContract } from '../tests/postgres-configuration-study-contract';
import type {
  SqlDatabase,
  SqlSession,
} from '../src/infrastructure/postgres/sql-database';
const results: unknown[] = [];
for (let iteration = 1; iteration <= 5; iteration++) {
  const db = await PGliteTestDatabase.open();
  const events: unknown[] = [];
  let tx = 0;
  try {
    for (const f of (await readdir('src/infrastructure/postgres/migrations'))
      .filter((f) => /^\d{3}_.*\.sql$/.test(f))
      .sort())
      await db.exec(
        await readFile('src/infrastructure/postgres/migrations/' + f, 'utf8'),
      );
    await seedProductionSlice(db, configurationRepository);
    await seedScientificTestPrincipal(db);
    await provisionMeasurementReferences(db, definitions);
    await provisionReasoningContexts(db, lifecycleAuthoringProfiles);
    await completeLegacyFixtureMeasurementPlans(db);
    const wrap = (session: SqlSession, id: number): SqlSession => ({
      async query(sql, parameters = []) {
        const interesting =
          /^(UPDATE|INSERT INTO) configuration_activation/i.test(sql.trim());
        if (interesting)
          events.push({
            tx: id,
            sql,
            parameters,
            wallMs: Date.now(),
            monoMs: performance.now(),
            before: (
              await session.query(
                `SELECT activation_id, active_from::text, active_to::text, clock_timestamp()::text AS wall_clock, transaction_timestamp()::text AS transaction_clock, txid_current()::text AS xid FROM configuration_activation WHERE active_to IS NULL`,
              )
            ).rows,
          });
        try {
          return await session.query(sql, parameters);
        } catch (e) {
          if (interesting)
            events.push({
              tx: id,
              error: String(e),
              detail: (e as { detail?: string }).detail,
              wallMs: Date.now(),
              monoMs: performance.now(),
            });
          throw e;
        }
      },
    });
    const instrumented: SqlDatabase = {
      ...wrap(db, 0),
      transaction: (work) => db.transaction((s) => work(wrap(s, ++tx))),
      close: () => db.close(),
    };
    await productionConfigurationStudyContract(instrumented);
    results.push({ iteration, status: 'PASS', events });
  } catch (e) {
    results.push({ iteration, status: 'FAIL', error: String(e), events });
  } finally {
    await db.close();
  }
  await writeFile(
    'tmp/activation-diagnostic.json',
    JSON.stringify(results, null, 2),
  );
  console.log(
    'iteration',
    iteration,
    (results.at(-1) as { status: string }).status,
  );
}

if (results.some((r) => (r as { status: string }).status === 'FAIL'))
  process.exitCode = 1;
