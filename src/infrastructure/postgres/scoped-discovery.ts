import {
  authorizationPolicyVersion,
  type Principal,
} from '@/src/application/authorization';
import {
  discoveryQuerySchema,
  type DiscoveryQuery,
  type DashboardProjection,
  type DiscoveryPage,
  type RunSummary,
  type SearchResult,
} from '@/src/application/discovery';
import type { SqlSession } from './sql-database';
import { savedAnalysisRefsSql } from './saved-analysis-authorization';

/** $1 Principal, $2 dimension, $3 exact dimension ID, $4 Study slug.
 * A requested dimension is an intersection, never an entitlement. */
export const authorizedResourceScopeSql = `WITH RECURSIVE
 accessible AS MATERIALIZED (SELECT * FROM dxt_discoverable_studies($1)),
 org_path(department_id,id,kind,parent_id) AS (
  SELECT id,id,kind,parent_id FROM auth_org_unit WHERE kind='DEPARTMENT'
  UNION SELECT p.department_id,o.id,o.kind,o.parent_id FROM org_path p JOIN auth_org_unit o ON o.id=p.parent_id WHERE o.kind IN ('DEPARTMENT','PART','TEAM')
 ), scoped_studies AS MATERIALIZED (
  SELECT s.*,a.responsible_user_id,a.responsible_department_id,a.area_id FROM accessible v JOIN study s USING(study_id) JOIN study_access a USING(study_id)
  WHERE ($4::text IS NULL OR s.series_slug=$4) AND (
   $2='ACCESSIBLE' OR ($2='MY' AND v.personally_relevant)
   OR ($2='DEPARTMENT' AND a.responsible_department_id=$3 AND EXISTS(SELECT 1 FROM auth_org_unit WHERE id=$3 AND kind='DEPARTMENT'))
   OR ($2='AREA' AND a.area_id=$3 AND EXISTS(SELECT 1 FROM auth_org_unit WHERE id=$3 AND kind='AREA'))
   OR ($2 IN ('PART','TEAM') AND EXISTS(SELECT 1 FROM org_path p WHERE p.department_id=a.responsible_department_id AND p.id=$3 AND p.kind=$2))
   OR ($2='MODULE' AND EXISTS(SELECT 1 FROM study_module_access m JOIN auth_org_unit o ON o.id=m.module_id WHERE m.study_id=s.study_id AND o.kind='MODULE' AND m.module_id=$3))
  )
 ), scoped_runs AS MATERIALIZED (
  SELECT r.*,s.display_name current_study_name,s.series_slug FROM experiment_run r JOIN scoped_studies s USING(study_id)
 )`;
const summariesSql = `,
 activity AS (
  SELECT run_id,created_at at,'PLAN' stage FROM scoped_runs
  UNION ALL SELECT e.run_id,COALESCE(e.ended_at,e.started_at)::timestamptz,'ACTUAL' FROM execution_event e JOIN scoped_runs r USING(run_id)
  UNION ALL SELECT e.run_id,COALESCE(e.payload->>'completedAt',e.payload->>'startedAt')::timestamptz,'MEASUREMENT' FROM measurement_execution e JOIN scoped_runs r USING(run_id)
  UNION ALL SELECT e.run_id,(e.payload->>'evaluatedAt')::timestamptz,'EVALUATION' FROM engineer_evaluation e JOIN scoped_runs r USING(run_id)
  UNION ALL SELECT d.run_id,(d.payload->'decision'->>'recordedAt')::timestamptz,'EVALUATION' FROM decision d JOIN scoped_runs r USING(run_id)
 ), activity_summary AS (
  SELECT run_id,max(at) updated_at,CASE WHEN bool_or(stage='EVALUATION') THEN 'EVALUATION' WHEN bool_or(stage='MEASUREMENT') THEN 'MEASUREMENT' WHEN bool_or(stage='ACTUAL') THEN 'ACTUAL' ELSE 'PLAN' END stage FROM activity GROUP BY run_id
 ), subject_counts AS (SELECT s.run_id,count(*)::int subjects FROM run_subject s JOIN scoped_runs r USING(run_id) GROUP BY s.run_id),
 run_summaries AS MATERIALIZED (
  SELECT r.*,a.updated_at,a.stage,COALESCE(c.subjects,0) subjects,EXISTS(SELECT 1 FROM decision_state d WHERE d.run_id=r.run_id AND d.decision_id IS NOT NULL) has_decision
  FROM scoped_runs r JOIN activity_summary a USING(run_id) LEFT JOIN subject_counts c USING(run_id)
 )`;
const runJson = `jsonb_build_object('id',r.run_domain_id,'studyId',r.study_id,'studySlug',r.series_slug,'studyName',r.current_study_name,'number',r.run_number,'name',r.display_name,'createdAt',r.created_at,'updatedAt',r.updated_at,'stage',r.stage,'subjects',r.subjects,'delta',r.delta,'hasDecision',r.has_decision,'href','/series/'||r.series_slug||'/runs/'||r.run_number||'/engineering-grid?view='||lower(r.stage))`;
const savedSql = `, scoped_saved AS MATERIALIZED (
 SELECT a.* FROM saved_analysis a JOIN scoped_studies s USING(study_id) WHERE a.version>0
 AND dxt_saved_analysis_audience($1,a.id,'VIEW_SAVED_ANALYSIS')
 AND dxt_saved_analysis_sources($1,a.study_id,a.configuration,${savedAnalysisRefsSql})
)`;
function args(principal: Principal, q: DiscoveryQuery) {
  return [
    principal.principalId,
    q.scope.kind,
    'id' in q.scope ? q.scope.id : null,
    q.studySlug ?? null,
  ];
}
/** Diagnostics describe the effective intersection, never hidden row counts or directory inventory. */
export function discoveryDiagnostics(
  principal: Principal,
  projection: string,
  q: DiscoveryQuery,
) {
  return {
    principalId: principal.principalId,
    projection,
    scope: q.scope,
    policyVersion: authorizationPolicyVersion,
  };
}
export async function scopedStudyList(
  sql: SqlSession,
  principal: Principal,
  raw: unknown,
) {
  const q = discoveryQuerySchema.parse(raw ?? {});
  return (
    await sql.query(
      `${authorizedResourceScopeSql} SELECT study_id,series_slug,display_name FROM scoped_studies WHERE strpos(lower(display_name||' '||series_slug),lower($5))>0 ORDER BY display_name,study_id`,
      [...args(principal, q), q.text],
    )
  ).rows;
}
export async function scopedRunSummaries(
  sql: SqlSession,
  principal: Principal,
  raw: unknown,
): Promise<DiscoveryPage<RunSummary>> {
  const q = discoveryQuerySchema.parse(raw ?? {});
  const result = await sql.query<{ result: DiscoveryPage<RunSummary> }>(
    `${authorizedResourceScopeSql}${summariesSql}, matches AS MATERIALIZED (
 SELECT * FROM run_summaries WHERE strpos(lower(display_name||' Run '||run_number||' '||current_study_name),lower($5))>0
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matches),'items',COALESCE((SELECT jsonb_agg(item) FROM (SELECT ${runJson} item FROM matches r ORDER BY r.run_number DESC,r.run_domain_id LIMIT $6 OFFSET $7) page),'[]')) result`,
    [...args(principal, q), q.text, q.limit, q.offset],
  );
  return {
    ...result.rows[0].result,
    diagnostics: discoveryDiagnostics(principal, 'run.summaries', q),
  };
}
export async function scopedSearch(
  sql: SqlSession,
  principal: Principal,
  raw: unknown,
  kind: string,
): Promise<DiscoveryPage<SearchResult>> {
  const q = discoveryQuerySchema.parse(raw ?? {});
  const result = await sql.query<{ result: DiscoveryPage<SearchResult> }>(
    `${authorizedResourceScopeSql}${savedSql}, candidates AS (
 SELECT 'STUDY' kind,series_slug id,display_name name,'/series/'||series_slug href FROM scoped_studies
 UNION ALL SELECT 'RUN',run_domain_id,current_study_name||' · Run '||run_number||' · '||display_name,'/series/'||series_slug||'/runs/'||run_number||'/engineering-grid' FROM scoped_runs
 UNION ALL SELECT 'SAVED_ANALYSIS',domain_id,configuration->>'name','/analysis?savedView='||domain_id FROM scoped_saved
 ), matches AS MATERIALIZED (
 SELECT * FROM candidates WHERE ($8='ALL' OR kind=$8) AND strpos(lower(name),lower($5))>0
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matches),'items',COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM (SELECT * FROM matches ORDER BY kind,name,id LIMIT $6 OFFSET $7) page),'[]')) result`,
    [...args(principal, q), q.text, q.limit, q.offset, kind],
  );
  // IDs are opaque strings, not URL fragments supplied by a caller.
  const page = result.rows[0].result;
  page.items = page.items.map((item) =>
    item.kind === 'SAVED_ANALYSIS'
      ? { ...item, href: `/analysis?savedView=${encodeURIComponent(item.id)}` }
      : item,
  );
  return {
    ...page,
    diagnostics: discoveryDiagnostics(principal, 'search.query', q),
  };
}
export async function scopedDashboard(
  sql: SqlSession,
  principal: Principal,
  raw: unknown,
): Promise<DashboardProjection> {
  const q = discoveryQuerySchema.parse(raw ?? { scope: { kind: 'MY' } });
  const result = await sql.query<{
    result: Omit<DashboardProjection, 'diagnostics'>;
  }>(
    `${authorizedResourceScopeSql}${summariesSql}${savedSql},
 dimensions AS (
 SELECT s.study_id,'DEPARTMENT' dimension,s.responsible_department_id id FROM scoped_studies s
 UNION SELECT s.study_id,p.kind,p.id FROM scoped_studies s JOIN org_path p ON p.department_id=s.responsible_department_id WHERE p.kind IN ('PART','TEAM')
 UNION SELECT s.study_id,'AREA',s.area_id FROM scoped_studies s JOIN auth_org_unit o ON o.id=s.area_id AND o.kind='AREA'
 UNION SELECT s.study_id,'MODULE',m.module_id FROM scoped_studies s JOIN study_module_access m USING(study_id) JOIN auth_org_unit o ON o.id=m.module_id AND o.kind='MODULE'
 ), groups AS (
 SELECT d.dimension,d.id,count(DISTINCT d.study_id)::int studies,count(r.run_id)::int runs FROM dimensions d LEFT JOIN scoped_runs r USING(study_id) GROUP BY d.dimension,d.id
 ), calendar AS MATERIALIZED (
 SELECT * FROM run_summaries WHERE updated_at>=date_trunc('month',statement_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AND created_at<((date_trunc('month',statement_timestamp() AT TIME ZONE 'UTC')+interval '1 month') AT TIME ZONE 'UTC')
 ) SELECT jsonb_build_object(
 'counts',jsonb_build_object('studies',(SELECT count(*) FROM scoped_studies),'runs',(SELECT count(*) FROM scoped_runs),
 'activeRuns',(SELECT count(*) FROM run_summaries WHERE NOT has_decision),
 'thisWeek',(SELECT count(*) FROM run_summaries WHERE updated_at>=(date_trunc('week',statement_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AND updated_at<=statement_timestamp()),
 'needReview',(SELECT count(*) FROM run_summaries WHERE stage IN ('MEASUREMENT','EVALUATION') AND NOT has_decision),
 'measurements',(SELECT count(*) FROM measurement_dataset m JOIN scoped_runs r USING(run_id)),
 'savedAnalyses',(SELECT count(*) FROM scoped_saved)),
 'continueWorking',(SELECT ${runJson} FROM run_summaries r ORDER BY r.updated_at DESC,r.run_domain_id LIMIT 1),
 'recent',COALESCE((SELECT jsonb_agg(item) FROM (SELECT ${runJson} item FROM run_summaries r ORDER BY r.updated_at DESC,r.run_domain_id LIMIT $5) page),'[]'),
 'calendar',COALESCE((SELECT jsonb_agg(item) FROM (SELECT ${runJson} item FROM calendar r ORDER BY r.created_at,r.run_domain_id LIMIT $5) page),'[]'),
 'calendarTotal',(SELECT count(*) FROM calendar),
 'groups',COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY dimension,id) FROM groups g),'[]')) result`,
    [...args(principal, q), q.limit],
  );
  return {
    ...result.rows[0].result,
    diagnostics: discoveryDiagnostics(principal, 'dashboard.query', q),
  };
}
