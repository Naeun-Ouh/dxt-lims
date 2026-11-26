import { scientificStudyActions } from '@/src/application/authorization';
import { PostgresAuthorization, resolvePrincipal } from './authorization';
import type { SqlSession } from './sql-database';

/** Read-only operator review aid. Never grants, revokes, or runs during startup. */
export async function inventoryImplicitScientificAccess(sql: SqlSession) {
  const legacy = (
    await sql.query<{
      principal_id: string;
      study_id: string;
      series_slug: string;
      action: string;
    }>(
      `
    SELECT a.responsible_user_id principal_id,a.study_id,s.series_slug,x.action
    FROM study_access a JOIN study s USING(study_id)
    JOIN auth_principal p ON p.id=a.responsible_user_id AND p.active
    CROSS JOIN unnest($1::text[]) AS x(action)
    WHERE dxt_study_access_reason(p.id,a.study_id,x.action)='RESPONSIBLE_USER'
    ORDER BY s.series_slug,p.id,x.action
  `,
      [[...scientificStudyActions]],
    )
  ).rows;
  const policy = new PostgresAuthorization(sql);
  const result = [];
  for (const row of legacy) {
    const principal = await resolvePrincipal(sql, row.principal_id);
    const action = scientificStudyActions.find(
      (candidate) => candidate === row.action,
    )!;
    const proposed = await policy.authorize(principal, action, row.study_id);
    result.push({
      ...row,
      legacyReason: 'RESPONSIBLE_USER',
      proposedEffect: proposed.effect,
      proposedReason: proposed.reason,
      transition:
        proposed.effect === 'ALLOW'
          ? 'EXPLICIT_GRANT_PRESERVED'
          : 'REVIEW_REQUIRED',
    });
  }
  return result;
}
