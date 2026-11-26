import type { SqlSession } from './sql-database';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { OperationDesign } from '@/src/features/run-registration/operation-design';

export async function readOperationDesign(sql:SqlSession,runId:string):Promise<Record<string,OperationDesign>> {
 const ops=(await sql.query<{operation_domain_id:string;design_mode:'COMMON'|'GROUPED'}>('SELECT operation_domain_id,design_mode FROM run_operation WHERE run_id=$1 AND design_mode IS NOT NULL',[runId])).rows;
 const result:Record<string,OperationDesign>=Object.fromEntries(ops.map(o=>[o.operation_domain_id,{mode:o.design_mode,groups:[],allocations:{}}]));
 const groups=(await sql.query<{operation_domain_id:string;group_domain_id:string;kind:'BASE'|'SPLIT';name:string}>(`SELECT o.operation_domain_id,g.* FROM run_operation_group g JOIN run_operation o USING(run_operation_id) WHERE g.run_id=$1 ORDER BY g.ordinal`,[runId])).rows;
 for(const g of groups)result[g.operation_domain_id].groups.push({id:g.group_domain_id,kind:g.kind,name:g.name});
 const states=(await sql.query<{operation_domain_id:string;subject_domain_id:string;plan_state:OperationDesign['allocations'][string]['state'];group_domain_id:string|null}>(`SELECT o.operation_domain_id,s.subject_domain_id,l.plan_state,l.group_domain_id FROM run_subject_operation l JOIN run_operation o USING(run_operation_id) JOIN run_subject rs USING(run_subject_id) JOIN subject s USING(subject_id) WHERE l.run_id=$1 AND o.design_mode IS NOT NULL`,[runId])).rows;
 for(const s of states)result[s.operation_domain_id].allocations[s.subject_domain_id]={state:s.plan_state,...(s.group_domain_id?{groupId:s.group_domain_id}:{})};
 return result;
}
/** The root Run lock, explicit authoring permission and Plan evidence lock are held by the caller. */
export async function syncOperationDesign(sql:SqlSession,runId:string,plan:RunPlanningSnapshot,subjects:Map<string,string>,operations:Map<string,string>){
 const allocations:Array<{subject:string;operation:string;state:string;group:string|null}>=[];
 for(const step of plan.steps){
  const operationId=operations.get(step.id)!,design=plan.operationDesign?.[step.id];
  await sql.query('UPDATE run_operation SET design_mode=$3 WHERE run_id=$1 AND run_operation_id=$2',[runId,operationId,design?.mode??null]);
  if(design){
   // A renamed/replaced Base must not collide with an explicitly removed Base in this transaction.
   const old=(await sql.query<{group_domain_id:string}>('SELECT group_domain_id FROM run_operation_group WHERE run_operation_id=$1',[operationId])).rows;
   for(const g of old)if(!design.groups.some(n=>n.id===g.group_domain_id)){
    await sql.query('DELETE FROM run_assignment WHERE run_id=$1 AND group_domain_id=$2',[runId,g.group_domain_id]);
    await sql.query('DELETE FROM run_subject_operation WHERE run_id=$1 AND group_domain_id=$2',[runId,g.group_domain_id]);
    await sql.query('DELETE FROM run_operation_group WHERE run_id=$1 AND group_domain_id=$2',[runId,g.group_domain_id]);
   }
   for(const [i,g] of design.groups.entries()){const saved=await sql.query(`INSERT INTO run_operation_group(run_id,run_operation_id,group_domain_id,kind,name,ordinal) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(run_id,group_domain_id) DO UPDATE SET name=EXCLUDED.name,ordinal=EXCLUDED.ordinal WHERE run_operation_group.run_operation_id=EXCLUDED.run_operation_id AND run_operation_group.kind=EXCLUDED.kind`,[runId,operationId,g.id,g.kind,g.name,i+1]);if(saved.rowCount!==1)throw new Error('Existing Group identity cannot change Operation or kind.');}
  }
  for(const s of plan.subjects){
   const allocation=design?.allocations[s.id];
   if(!allocation&&!plan.subjectOperationIds[s.id]?.includes(step.id))continue;
   const subjectId=subjects.get(s.id)!;
   allocations.push({subject:subjectId,operation:operationId,state:allocation?.state??'COMMON',group:allocation?.groupId??null});
  }
 }
 // One statement for the Operation×Subject matrix, rather than one round trip per cell.
 const payload=JSON.stringify(allocations);
 await sql.query(`INSERT INTO run_subject_operation(run_id,run_subject_id,run_operation_id,plan_state,group_domain_id)
 SELECT $1,(x->>'subject')::uuid,(x->>'operation')::uuid,x->>'state',x->>'group' FROM jsonb_array_elements($2::jsonb) x
 ON CONFLICT(run_subject_id,run_operation_id) DO UPDATE SET plan_state=EXCLUDED.plan_state,group_domain_id=EXCLUDED.group_domain_id`,[runId,payload]);
 await sql.query(`DELETE FROM run_subject_operation l WHERE run_id=$1 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements($2::jsonb) x WHERE (x->>'subject')::uuid=l.run_subject_id AND (x->>'operation')::uuid=l.run_operation_id)`,[runId,payload]);
}
