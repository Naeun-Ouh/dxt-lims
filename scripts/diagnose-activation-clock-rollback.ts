/** Controlled clock fault in an isolated in-memory database; never a production fix. */
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { PGliteTestDatabase } from '../src/infrastructure/postgres/pglite-test-database';
import { seedConfigurationRegistry } from '../src/infrastructure/postgres/slice-seed';
import { configurationRepository } from '../src/mock/configuration-packages';
const db = await PGliteTestDatabase.open();
const realNow = Date.now;
const out: Record<string, unknown> = {
  label: 'CONTROLLED CLOCK-ROLLBACK PROBE; NOT PROOF OF ORIGINAL CAUSE',
};
try {
  await db.exec(
    await readFile(
      'src/infrastructure/postgres/migrations/001_production_adapter_slice_1.sql',
      'utf8',
    ),
  );
  await seedConfigurationRegistry(
    db,
    configurationRepository.getConfigurationRegistry(),
  );
  const before = (
    await db.query(
      'SELECT activation_id,active_from::text,active_to FROM configuration_activation WHERE active_to IS NULL LIMIT 1',
    )
  ).rows[0];
  out.before = before;
  Date.now = () => realNow() - 3600000;
  try {
    await db.query(
      'UPDATE configuration_activation SET active_to=clock_timestamp() WHERE activation_id=$1',
      [before.activation_id],
    );
    out.unexpected = 'UPDATE succeeded';
  } catch (e) {
    out.error = {
      message: String(e),
      code: (e as { code?: string }).code,
      detail: (e as { detail?: string }).detail,
    };
  } finally {
    Date.now = realNow;
  }
  out.after = (
    await db.query(
      'SELECT active_from::text,active_to FROM configuration_activation WHERE activation_id=$1',
      [before.activation_id],
    )
  ).rows[0];
  assert.equal((out.error as { code: string }).code, '23514');
  assert.equal((out.after as { active_to: unknown }).active_to, null);
  await writeFile(
    'tmp/activation-clock-control.json',
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out));
} finally {
  Date.now = realNow;
  await db.close();
}
