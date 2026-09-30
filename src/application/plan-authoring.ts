import { inheritNewOperationParticipation } from '@/src/features/run-registration/participation';
import { ApplicationError } from './repository-ports';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { validatePlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { resolvedVariableDefinitions } from '@/src/features/run-registration/variable-model';
import { validateVariableValue } from '@/src/features/run-registration/applicability';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';

/** Values and intentional variation are independent. Existing source identity never changes. */
export function validatePlanEdit(current:RunPlanningSnapshot,next:RunPlanningSnapshot,configuration:ConfigurationRegistrySource){
  for(const key of ['id','configurationPackageVersionId','experimentTypeProfileVersionId','subjectTypeRevisionId','runNumber','createdAt','area','experimentType'] as const)
    if(current[key]!==next[key])throw new ApplicationError('VALIDATION',`Plan edit cannot change ${key}.`);
  if(JSON.stringify(current.series)!==JSON.stringify(next.series)||JSON.stringify(current.provenance)!==JSON.stringify(next.provenance))throw new ApplicationError('VALIDATION','Plan source identity must remain unchanged.');
  const registry=configuration.getConfigurationRegistry();
  const profile=registry.experimentTypeProfiles.find(p=>p.id===next.experimentTypeProfileVersionId);
  const allowedOperations=registry.departmentAreaProfiles.filter(p=>profile?.departmentAreaProfileVersionIds.includes(p.id)).flatMap(p=>p.operationDefinitionRevisionIds);
  if(!profile||next.steps.some(step=>!allowedOperations.includes(step.operationDefinitionId)))throw new ApplicationError('VALIDATION','Operation must belong to the exact experiment profile.');
  const eligible=current.candidateSubjects??current.subjects;
  if(next.subjects.some(subject=>!eligible.some(candidate=>candidate.id===subject.id&&candidate.type===subject.type)))throw new ApplicationError('VALIDATION','Subject is outside the Run planning context.');
  next=inheritNewOperationParticipation(current,next);
  const errors=validatePlanningSnapshot(next);
  if(errors.length)throw new ApplicationError('VALIDATION',errors.join('; '));
  if(new Set(next.assignments.map(a=>a.id)).size!==next.assignments.length)throw new ApplicationError('VALIDATION','Duplicate assignment identity.');
  if(!next.steps.length||next.steps.some(step=>!step.context))throw new ApplicationError('VALIDATION','Persisted exact Operation context is required.');
  const model=createExperimentWorkspace(next,configuration);
  for(const a of next.assignments){
    const definition=resolvedVariableDefinitions(model,a.processStepId??'').find(d=>d.assignmentKind===a.kind&&(d.assignmentReferenceId===a.referenceId||d.options.some(o=>o.referenceId===a.referenceId)));
    if(!definition||a.positionId||!['FIXED','VARIED'].includes(a.intentRole))throw new ApplicationError('VALIDATION','Plan assignment is not applicable in its exact pinned context.');
    validateVariableValue(definition,a.value);
    if(definition.editor==='REFERENCE'&&!definition.options.some(o=>o.value===a.value&&o.referenceId===a.referenceId))throw new ApplicationError('VALIDATION','Reference value must match its exact revision.');
  }
  return withPlanDelta(current,next);
}
export function withPlanDelta(current:RunPlanningSnapshot,next:RunPlanningSnapshot):RunPlanningSnapshot {
  const items=[...current.delta.items];
  const assignments=next.assignments.map(a=>{
    const old=current.assignments.find(o=>o.id===a.id)??current.assignments.find(o=>o.processStepId===a.processStepId&&o.kind===a.kind&&o.label===a.label&&!o.subjectId&&!o.positionId);
    if(old?.value===a.value&&old.referenceId===a.referenceId)return {...a,provenance:old.provenance};
    const id=`plan-edit-${a.id}`;const previous=items.find(d=>d.id===id);
    const entry={id,kind:a.kind,label:a.label,change:old?'CHANGED' as const:'ADDED' as const,before:previous?.before??old?.value??null,after:a.value};
    const index=items.findIndex(d=>d.id===id);if(index>=0)items[index]=entry;else items.push(entry);
    return {...a,provenance:'AD_HOC' as const};
  });
  return {...next,assignments,delta:{...current.delta,items,unchangedCount:Math.max(0,assignments.length-items.length)}};
}
