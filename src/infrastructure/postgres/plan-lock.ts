import type { SqlSession } from './sql-database';
/** Historical evidence, including superseded records, permanently protects the Plan. */
export async function planLockReason(sql:SqlSession,runId:string):Promise<string|null>{
 const result=await sql.query<{actual:boolean;measurement:boolean;reasoning:boolean}>(`SELECT
 EXISTS(SELECT 1 FROM execution_event WHERE run_id=$1) AS actual,
 EXISTS(SELECT 1 FROM measurement_execution WHERE run_id=$1) AS measurement,
 (EXISTS(SELECT 1 FROM engineer_evaluation WHERE run_id=$1) OR EXISTS(SELECT 1 FROM decision WHERE run_id=$1)) AS reasoning`,[runId]);
 const row=result.rows[0];
 return row.actual?'Plan locked after execution evidence was recorded.':row.measurement?'Plan locked after measurement evidence was recorded.':row.reasoning?'Plan locked after evaluation or decision evidence was recorded.':null;
}
