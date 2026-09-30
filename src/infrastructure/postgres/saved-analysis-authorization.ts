import type { SqlSession } from './sql-database';
export const savedAnalysisRefsSql=`COALESCE((SELECT jsonb_agg(jsonb_build_object('studyId',s.study_domain_id,'runId',s.run_domain_id,'subjectId',s.subject_domain_id,'measurementExecutionId',s.execution_domain_id,'datasetId',s.dataset_domain_id,'parameterId',s.parameter_domain_id,'representativeResultId',s.representative_domain_id) ORDER BY s.ordinal) FROM saved_analysis_source_ref s WHERE s.saved_analysis_id=a.id),'[]'::jsonb)`;
/** Audience AND complete exact source identity/access; filtering precedes retrieval of titles. */
export async function accessibleSavedAnalysisIds(sql:SqlSession,principalId:string,id?:string){
 const rows=await sql.query<{domain_id:string}>(`SELECT a.domain_id FROM saved_analysis a WHERE a.version>0
 AND ($2::text IS NULL OR a.domain_id=$2)
 AND dxt_saved_analysis_audience($1,a.id,'VIEW_SAVED_ANALYSIS')
 AND dxt_saved_analysis_sources($1,a.study_id,a.configuration,${savedAnalysisRefsSql})
 ORDER BY a.created_at DESC,a.domain_id`,[principalId,id??null]);
 return rows.rows.map(r=>r.domain_id);
}
