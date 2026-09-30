import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import type { SqlDatabase, SqlResult, SqlRow, SqlSession } from './sql-database';

export class PgDatabase implements SqlDatabase {
  private readonly pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  static fromEnvironment(environment: NodeJS.ProcessEnv = process.env) {
    const connectionString = environment.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required for the PostgreSQL adapter.');
    return new PgDatabase({ connectionString, max: 10 });
  }

  async query<T extends SqlRow = SqlRow>(sql: string, parameters: unknown[] = []): Promise<SqlResult<T>> {
    const result = await this.pool.query<QueryResultRow>(sql, parameters);
    // node-postgres returns an array for a multi-statement migration.
    const last = Array.isArray(result) ? result.at(-1) : result;
    return { rows: (last?.rows ?? []) as T[], rowCount: last?.rowCount ?? last?.rows?.length ?? 0 };
  }

  async transaction<T>(work: (session: SqlSession) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await work({
        async query<R extends SqlRow = SqlRow>(sql: string, parameters: unknown[] = []) {
          const result = await client.query<QueryResultRow>(sql, parameters);
          return { rows: result.rows as R[], rowCount: result.rowCount ?? result.rows.length };
        },
      });
      await client.query('COMMIT');
      return value;
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}
