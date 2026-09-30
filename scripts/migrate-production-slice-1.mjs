import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
/* Migration 001 remains checksum-locked. Apply incremental migrations in order. */
const migrations = ['001_production_adapter_slice_1', '002_actual_execution', '003_measurement', '004_evaluation_decision', '005_saved_analysis', '006_configuration_study_authoring', '007_run_plan_authoring', '008_study_reasoning_adoption', '009_authorization_study_run', '010_authorization_scientific', '011_authorization_configuration', '012_authorization_saved_analysis', '013_authorization_discovery'];
const pool = new pg.Pool({ connectionString, max: 1 });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('dxt-schema-migrations'))");
  await client.query('CREATE TABLE IF NOT EXISTS dxt_schema_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of migrations) {
    const sql = await readFile(new URL(`../src/infrastructure/postgres/migrations/${name}.sql`, import.meta.url), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const applied = await client.query('SELECT checksum FROM dxt_schema_migration WHERE name = $1', [name]);
    if (applied.rows[0]) {
      if (applied.rows[0].checksum !== checksum) throw new Error('Applied migration checksum differs; a corrective migration is required.');
      process.stdout.write('Migration already applied; checksum verified.\n');
    } else {
      await client.query(sql.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
      await client.query('INSERT INTO dxt_schema_migration (name, checksum) VALUES ($1,$2)', [name, checksum]);
      process.stdout.write(`${name} migration applied.\n`);
    }
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
