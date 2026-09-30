import { PGlite } from '@electric-sql/pglite';
import type { SqlDatabase, SqlResult, SqlRow, SqlSession } from './sql-database';

export class PGliteTestDatabase implements SqlDatabase {
  private constructor(private readonly client: PGlite) {}

  static async open(dataDir?: string) {
    const client = new PGlite(dataDir);
    await client.waitReady;
    return new PGliteTestDatabase(client);
  }

  async exec(sql: string) {
    await this.client.exec(sql);
  }

  async query<T extends SqlRow = SqlRow>(sql: string, parameters: unknown[] = []): Promise<SqlResult<T>> {
    const result = await this.client.query<T>(sql, parameters);
    return { rows: [...result.rows], rowCount: result.rows.length || result.affectedRows || 0 };
  }

  async transaction<T>(work: (session: SqlSession) => Promise<T>) {
    return this.client.transaction(async (transaction) => work({
      async query<R extends SqlRow = SqlRow>(sql: string, parameters: unknown[] = []) {
        const result = await transaction.query<R>(sql, parameters);
        return { rows: [...result.rows], rowCount: result.rows.length || result.affectedRows || 0 };
      },
    }));
  }

  async close() {
    await this.client.close();
  }
}
