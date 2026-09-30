import { participatesInOperation } from './grid-plan-context';
import type { RunPlanningSnapshot } from './planning-model';
import type { EngineeringGridRow } from './engineering-grid-model';
/** Translate only the frozen grid's role/value edits into its full Run snapshot. */
export function applyGridPlanEdits(snapshot:RunPlanningSnapshot,rows:EngineeringGridRow[],dirty:Record<string,string>,roles:Record<string,'FIXED'|'VARIED'>){
 let assignments=[...snapshot.assignments];
 for(const row of rows){
  if(!row.assignment||!row.definition)continue;
  const base=row.assignment,definition=row.definition;
  const matches=(a:typeof base)=>a.processStepId===row.operation.sourceOperationId&&a.kind===base.kind&&a.label===base.label&&!a.positionId;
  if(roles[row.id])assignments=assignments.map(a=>matches(a)?{...a,intentRole:roles[row.id]}:a);
  for(const subject of snapshot.subjects){
   if(!participatesInOperation(snapshot,subject.id,row.operation.sourceOperationId))continue;
   const value=dirty[`${row.id}:${subject.id}`];if(value===undefined)continue;
   const existing=assignments.find(a=>matches(a)&&a.subjectId===subject.id);
   const selectedReference=existing?.referenceId??base.referenceId;
   const option=definition.options.find(o=>o.value===value&&o.referenceId===selectedReference)??definition.options.find(o=>o.value===value);
   const item={...base,...existing,id:existing?.id??`${base.id}:subject:${subject.id}`,processStepId:row.operation.sourceOperationId,subjectId:subject.id,positionId:null,value,intentRole:roles[row.id]??existing?.intentRole??base.intentRole,referenceId:option?.referenceId??selectedReference};
   assignments=existing?assignments.map(a=>a.id===existing.id?item:a):[...assignments,item];
  }
 }
 return {...snapshot,assignments};
}
