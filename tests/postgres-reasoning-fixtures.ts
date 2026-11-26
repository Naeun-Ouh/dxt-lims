/** Synthetic isolated-test principal only. Never imported by production code. */
import { randomUUID } from 'node:crypto';
import type {
  SqlDatabase,
  SqlSession,
} from '@/src/infrastructure/postgres/sql-database';
import { scientificStudyActions } from '@/src/application/authorization';
export const scientificTestPrincipal = 'contract-scientific-service';
export async function seedScientificTestPrincipal(sql: SqlSession) {
  await sql.query(
    "INSERT INTO auth_principal VALUES($1,$1,true,'GENERAL_USER') ON CONFLICT(id) DO NOTHING",
    [scientificTestPrincipal],
  );
  await sql.query(
    "INSERT INTO auth_org_unit VALUES('contract-scientific-department','DEPARTMENT',NULL) ON CONFLICT(id) DO NOTHING",
  );
  await sql.query(
    "INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) SELECT study_id,$1,'contract-scientific-department' FROM study ON CONFLICT(study_id) DO NOTHING",
    [scientificTestPrincipal],
  );
  for (const action of ['VIEW_RUN', ...scientificStudyActions])
    await sql.query(
      'INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) SELECT study_id::text||$2||$1,study_id,$1,$2,$1 FROM study ON CONFLICT(id) DO NOTHING',
      [scientificTestPrincipal, action],
    );
}
export function scientificTestDatabase(source: SqlDatabase): SqlDatabase {
  const session = (sql: SqlSession): SqlSession => ({
    query: sql.query.bind(sql),
    trustedPrincipalId: scientificTestPrincipal,
  });
  return {
    ...session(source),
    transaction: (work) => source.transaction((sql) => work(session(sql))),
    close: () => source.close(),
  };
}
export async function adoptTestCriteria(sql: SqlSession, runId: string) {
  const row = (
    await sql.query<{ run_id: string; id: string; sequence: string }>(
      'SELECT r.run_id,c.id,p.interpretation_sequence sequence FROM experiment_run r JOIN reasoning_context c ON c.study_id=r.study_id AND c.package_version_id=r.configuration_package_version_id JOIN run_reasoning_resolution p USING(run_id) WHERE r.run_domain_id=$1',
      [runId],
    )
  ).rows[0];
  if (!row)
    throw new Error('Exact test criteria must be provisioned explicitly.');
  await sql.query(
    'SELECT append_run_reasoning_adoption($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      randomUUID(),
      row.run_id,
      row.id,
      Number(row.sequence),
      scientificTestPrincipal,
      randomUUID(),
      'isolated-fixture',
      'Explicit isolated test criteria selection',
    ],
  );
  return { contextId: row.id, sequence: Number(row.sequence) + 1 };
}
