import { operationGroupLabel } from '@/src/features/run-registration/operation-group-display';
import { inheritNewOperationParticipation } from '@/src/features/run-registration/participation';
import { ApplicationError } from './repository-ports';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { effectiveAssignments,validatePlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { resolvedVariableDefinitions } from '@/src/features/run-registration/variable-model';
import { validateVariableValue } from '@/src/features/run-registration/applicability';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';
import { prospectiveConditions } from './condition-resolution';

/** Values and intentional variation are independent. Existing source identity never changes. */
export function validatePlanEdit(current:RunPlanningSnapshot,next:RunPlanningSnapshot,configuration:ConfigurationRegistrySource){
  if(current.conditionResolution!==next.conditionResolution)throw new ApplicationError('VALIDATION','Plan condition resolution must remain unchanged.');
  if(current.conditionResolution==='SUBJECT_FIRST_V1'||current.conditionResolution==='GROUPS_V2')next=prospectiveConditions(next);
  for(const key of ['id','configurationPackageVersionId','experimentTypeProfileVersionId','subjectTypeRevisionId','runNumber','createdAt','area','experimentType'] as const)
    if(current[key]!==next[key])throw new ApplicationError('VALIDATION',`Plan edit cannot change ${key}.`);
  if(JSON.stringify(current.series)!==JSON.stringify(next.series)||JSON.stringify(current.provenance)!==JSON.stringify(next.provenance))throw new ApplicationError('VALIDATION','Plan source identity must remain unchanged.');
  const registry=configuration.getConfigurationRegistry();
  const profile=registry.experimentTypeProfiles.find(p=>p.id===next.experimentTypeProfileVersionId);
  const allowedOperations=registry.departmentAreaProfiles.filter(p=>profile?.departmentAreaProfileVersionIds.includes(p.id)).flatMap(p=>p.operationDefinitionRevisionIds);
  if(!profile||next.steps.some(step=>!allowedOperations.includes(step.operationDefinitionId)))throw new ApplicationError('VALIDATION','Operation must belong to the exact experiment profile.');
  const eligible=current.candidateSubjects??current.subjects;
  if(next.subjects.some(subject=>!eligible.some(candidate=>candidate.id===subject.id&&candidate.type===subject.type)))throw new ApplicationError('VALIDATION','Subject is outside the Run planning context.');
  for(const step of next.steps){
    const existing=current.steps.find(candidate=>candidate.id===step.id);
    if(existing&&(existing.operationDefinitionId!==step.operationDefinitionId||existing.role!==step.role))
      throw new ApplicationError('VALIDATION','Existing Operation instance identity cannot change its definition or role. Create a new Operation instance instead.');
  }
  for(const [operationId,design] of Object.entries(current.operationDesign??{})){
    if(next.steps.some(s=>s.id===operationId)&&!next.operationDesign?.[operationId])throw new ApplicationError('VALIDATION','Explicit Operation design cannot be discarded.');
    for(const group of design.groups){
      const matches=Object.entries(next.operationDesign??{}).flatMap(([op,d])=>d.groups.filter(g=>g.id===group.id).map(g=>({op,g})));
      if(matches.some(({op,g})=>op!==operationId||g.kind!==group.kind))throw new ApplicationError('VALIDATION','Existing Group identity cannot change Operation or kind.');
    }
  }
  if(next.conditionResolution!=='GROUPS_V2') next=inheritNewOperationParticipation(current,next);
  const errors=validatePlanningSnapshot(next);
  if(errors.length)throw new ApplicationError('VALIDATION',errors.join('; '));
  if(new Set(next.assignments.map(a=>a.id)).size!==next.assignments.length)throw new ApplicationError('VALIDATION','Duplicate assignment identity.');
  if(!next.steps.length||next.steps.some(step=>!step.context))throw new ApplicationError('VALIDATION','Persisted exact Operation context is required.');
  const model=createExperimentWorkspace(next,configuration);
  const scopes=new Set<string>();
  for(const a of next.assignments){
    const definition=resolvedVariableDefinitions(model,a.processStepId??'').find(d=>d.assignmentKind===a.kind&&(d.assignmentReferenceId===a.referenceId||d.options.some(o=>o.referenceId===a.referenceId)));
    if(!definition||a.positionId||!['FIXED','VARIED'].includes(a.intentRole))throw new ApplicationError('VALIDATION','Plan assignment is not applicable in its exact pinned context.');
    if(next.conditionResolution){
      if(a.label!==definition.label)throw new ApplicationError('VALIDATION','Condition name must match its exact definition.');
      const scope=JSON.stringify([a.processStepId,definition.applicabilityId,a.subjectId,a.positionId,a.groupId??null]);
      if(scopes.has(scope))throw new ApplicationError('VALIDATION','Duplicate assignment.');
      scopes.add(scope);
    }
    validateVariableValue(definition,a.value);
    if(definition.editor==='REFERENCE'&&!definition.options.some(o=>o.value===a.value&&o.referenceId===a.referenceId))throw new ApplicationError('VALIDATION','Reference value must match its exact revision.');
  }
  next={...next,assignments:next.assignments.map(a=>{const old=current.assignments.find(x=>x.id===a.id);return a.kind==='MATERIAL'&&old&&old.referenceId!==a.referenceId?{...a,sampleRevisionId:null,sampleAccessDenied:false}:a;})};
  return withPlanDelta(current,next);
}
export function withPlanDelta(current:RunPlanningSnapshot,next:RunPlanningSnapshot):RunPlanningSnapshot {
  const items=[...current.delta.items];
  const assignments=next.assignments.map(a=>{
    const old=current.assignments.find(o=>o.id===a.id)??(next.conditionResolution==='GROUPS_V2'&&a.subjectId?effectiveAssignments(current,a.subjectId)[`${a.processStepId}:${a.kind}:${a.label}`]:current.assignments.find(o=>o.processStepId===a.processStepId&&o.kind===a.kind&&o.label===a.label&&!o.subjectId&&!o.positionId&&(o.groupId??null)===(a.groupId??null)));
    if(old?.value===a.value&&old.referenceId===a.referenceId&&old.intentRole===a.intentRole)return {...a,provenance:old.provenance};
    const id=`plan-edit-${a.id}`;const previous=items.find(d=>d.id===id);
    const entry={id,kind:a.kind,label:a.label,change:old?'CHANGED' as const:'ADDED' as const,before:previous?previous.before:old?.value??null,after:a.value,...(next.conditionResolution==='GROUPS_V2'?{beforeRole:previous&&'beforeRole' in previous?previous.beforeRole:old?.intentRole??null,afterRole:a.intentRole}: {})};
    const index=items.findIndex(d=>d.id===id);if(index>=0)items[index]=entry;else items.push(entry);
    return {...a,provenance:'AD_HOC' as const};
  });
  if(next.conditionResolution==='GROUPS_V2'){
    const append=(entry:typeof items[number])=>{const index=items.findIndex(x=>x.id===entry.id);if(index<0)items.push(entry);else items[index]={...entry,before:items[index].before,...('beforeRole' in items[index]?{beforeRole:items[index].beforeRole}: {})};};
    for(const old of current.assignments)if(!next.assignments.some(a=>a.id===old.id))append({id:`plan-edit-${old.id}`,kind:old.kind,label:old.label,change:'REMOVED',before:old.value,after:null,beforeRole:old.intentRole,afterRole:null});
    const ids=new Set([...Object.keys(current.operationDesign??{}),...Object.keys(next.operationDesign??{})]);
    for(const id of ids){
      const before=current.operationDesign?.[id],after=next.operationDesign?.[id],operation=next.steps.find(o=>o.id===id)?.label??current.steps.find(o=>o.id===id)?.label??id;
      const groups=(d:typeof before)=>d?`${d.mode}: ${d.groups.map(g=>operationGroupLabel(d,g.id)).join(', ')}`:null;
      if(before?.mode!==after?.mode || JSON.stringify(before?.groups)!==JSON.stringify(after?.groups))append({id:`plan-groups-${id}`,kind:'OPERATION_GROUP',label:operation,change:before?'CHANGED':'ADDED',before:groups(before),after:groups(after)});
      const subjects=new Set([...Object.keys(before?.allocations??{}),...Object.keys(after?.allocations??{})]);
      const display=(d:typeof before,subject:string)=>{const a=d?.allocations[subject];return a?`${a.state}${a.groupId?' · '+(operationGroupLabel(d,a.groupId)??a.groupId):''}`:null;};
      for(const subject of subjects)if(JSON.stringify(before?.allocations[subject])!==JSON.stringify(after?.allocations[subject]))append({id:`plan-allocation-${id}-${subject}`,kind:'ALLOCATION',label:`${operation} · ${subject}`,change:before?.allocations[subject]?'CHANGED':'ADDED',before:display(before,subject),after:display(after,subject)});
    }
  }
  return {...next,assignments,delta:{...current.delta,items,unchangedCount:Math.max(0,assignments.length-items.length)}};
}
