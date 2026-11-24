import {
  materialUsageQuerySchema,
  type MaterialAssignmentUsage,
} from '@/src/application/material-usage';
import type { DiscoveryPage } from '@/src/application/discovery';
import type { Principal } from '@/src/application/authorization';
import type { SqlSession } from './sql-database';
import { authorizedResourceScopeSql } from './scoped-discovery';

/** Read-only Plan projection. Scope is applied before search, counts and paging.
 * No label/code matching is allowed to invent a Sample Revision relationship. */
export async function scopedMaterialUsage(
  sql: SqlSession,
  principal: Principal,
  raw: unknown,
): Promise<DiscoveryPage<MaterialAssignmentUsage>> {
  const q = materialUsageQuerySchema.parse(raw ?? {});
  const result = await sql.query<{
    result: DiscoveryPage<MaterialAssignmentUsage>;
  }>(
    `${authorizedResourceScopeSql}, assignments AS MATERIALIZED (
    SELECT a.run_assignment_id::text AS "assignmentId", r.run_domain_id AS "runId",
      r.current_study_name AS study, r.series_slug AS "studySlug", r.run_number AS "runNumber",
      o.label AS operation, s.display_label AS subject, a.label, a.value_text AS value,
      a.assignment_reference_revision_id AS "referenceId", a.intent_role AS "intentRole"
    FROM scoped_runs r JOIN run_assignment a USING(run_id)
    JOIN run_material_usage m USING(run_assignment_id)
    JOIN run_operation o ON o.run_operation_id=a.run_operation_id AND o.run_id=r.run_id
    LEFT JOIN run_subject s ON s.run_subject_id=a.run_subject_id AND s.run_id=r.run_id
    WHERE a.assignment_kind='MATERIAL'
  ), matches AS MATERIALIZED (
    SELECT * FROM assignments WHERE strpos(lower(study||' '||operation||' '||label||' '||value),lower($5))>0
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matches),'items',COALESCE((
    SELECT jsonb_agg(item) FROM (SELECT row_to_json(m) item FROM matches m
    ORDER BY "studySlug","runNumber" DESC,"assignmentId" LIMIT $6 OFFSET $7) page),'[]')) result`,
    [
      principal.principalId,
      q.scope.kind,
      'id' in q.scope ? q.scope.id : null,
      q.studySlug ?? null,
      q.text,
      q.limit,
      q.offset,
    ],
  );
  return result.rows[0].result;
}
