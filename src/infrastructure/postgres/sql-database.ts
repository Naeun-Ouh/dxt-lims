export type SqlRow = Record<string, unknown>;

export type SqlResult<T extends SqlRow = SqlRow> = {
  rows: T[];
  rowCount: number;
};

export interface SqlSession {
  /** Set only by trusted server composition after resolving Principal. Never request input. */
  trustedPrincipalId?: string;
  query<T extends SqlRow = SqlRow>(sql: string, parameters?: unknown[]): Promise<SqlResult<T>>;
}

export interface SqlDatabase extends SqlSession {
  transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
