import { z } from 'zod';
import type { RunPlanningSnapshot, SetupAssignment } from './planning-model';

const identity = z.string().trim().min(1).max(200);
export const operationDesignSchema = z.object({
  mode: z.enum(['COMMON', 'GROUPED']),
  groups: z.array(z.object({ id: identity, kind: z.enum(['BASE', 'SPLIT']), name: identity }).strict()).max(1000),
  allocations: z.record(identity, z.object({
    state: z.enum(['COMMON', 'ASSIGNED', 'SKIP', 'UNASSIGNED']),
    groupId: identity.optional(),
  }).strict()),
}).strict();
export type OperationDesign = z.infer<typeof operationDesignSchema>;
export type Allocation = OperationDesign['allocations'][string];
export type OperationGroup = OperationDesign['groups'][number];

/** Legacy absence is not researcher's Skip or an incomplete Split decision. */
export function allocationFor(plan: RunPlanningSnapshot, stepId: string, subjectId: string): Allocation | {state:'LEGACY_EXCLUDED'} {
  return plan.operationDesign?.[stepId]?.allocations[subjectId] ??
    (plan.subjectOperationIds[subjectId]?.includes(stepId) ? {state:'COMMON'} : {state:'LEGACY_EXCLUDED'});
}
export function isApplied(allocation: {state:string}) {
  return allocation.state === 'COMMON' || allocation.state === 'ASSIGNED';
}
export function commonOperationDesign(subjectIds: string[]): OperationDesign {
  return {mode:'COMMON',groups:[],allocations:Object.fromEntries(subjectIds.map(id=>[id,{state:'COMMON'}]))};
}
/** Explicit transition to a Split design; never run during legacy readback. */
export function addOperationGroup(design: OperationDesign, group: OperationGroup): OperationDesign {
  if(design.groups.some(g=>g.id===group.id) || (group.kind==='BASE'&&design.groups.some(g=>g.kind==='BASE')))
    throw new Error('Duplicate Group identity or Base.');
  return {...design,mode:'GROUPED',groups:[...design.groups,group],allocations:Object.fromEntries(Object.entries(design.allocations).map(([id,a])=>[id,a.state==='COMMON'?{state:'UNASSIGNED'}:a]))};
}
export function removeOperationGroup(design:OperationDesign,id:string):OperationDesign {
  return {...design,groups:design.groups.filter(g=>g.id!==id),allocations:Object.fromEntries(Object.entries(design.allocations).map(([s,a])=>[s,a.groupId===id?{state:'UNASSIGNED'}:a]))};
}
export function applyOperationDesign(plan:RunPlanningSnapshot,stepId:string,design:OperationDesign):RunPlanningSnapshot {
  const next={...plan,operationDesign:{...plan.operationDesign,[stepId]:design},subjectOperationIds:{...plan.subjectOperationIds}};
  for(const subject of plan.subjects){
    const other=(plan.subjectOperationIds[subject.id]??[]).filter(id=>id!==stepId);
    next.subjectOperationIds[subject.id]=isApplied(design.allocations[subject.id]??{state:'UNASSIGNED'})?[...other,stepId]:other;
  }
  return next;
}
export function validateOperationDesign(plan:RunPlanningSnapshot):string[] {
  const errors:string[]=[];
  const steps=new Set(plan.steps.map(s=>s.id)), subjects=new Set(plan.subjects.map(s=>s.id));
  const groupIds=new Set<string>();
  for(const [stepId,raw] of Object.entries(plan.operationDesign??{})){
    const parsed=operationDesignSchema.safeParse(raw);
    if(!steps.has(stepId)||!parsed.success){errors.push('Invalid Operation design.');continue;}
    const design=parsed.data,local=new Set(design.groups.map(g=>g.id));
    if(design.mode==='COMMON'&&design.groups.length) errors.push('Common Operation cannot contain Groups.');
    if(local.size!==design.groups.length||design.groups.filter(g=>g.kind==='BASE').length>1) errors.push('Duplicate Group identity or Base.');
    for(const g of design.groups){if(groupIds.has(g.id))errors.push('Group belongs to one Operation only.');groupIds.add(g.id);}
    if(Object.keys(design.allocations).some(id=>!subjects.has(id)))errors.push('Unknown allocation Subject.');
    for(const id of subjects){
      const a=design.allocations[id];
      if(!a){errors.push('Explicit allocation state is required.');continue;}
      if((a.state==='ASSIGNED')!==!!a.groupId || (a.groupId&&!local.has(a.groupId))) errors.push('Invalid Group allocation.');
      if(design.mode==='COMMON'&&a.state!=='COMMON'&&a.state!=='SKIP')errors.push('Common Operation has invalid allocation.');
      if(design.mode==='GROUPED'&&a.state==='COMMON')errors.push('Split design requires explicit allocation or Skip.');
      if(isApplied(a)!==(plan.subjectOperationIds[id]??[]).includes(stepId)) errors.push('Allocation projection does not match the plan.');
    }
  }
  for(const a of plan.assignments){
    if(a.groupId && (a.subjectId||!a.processStepId||!plan.operationDesign?.[a.processStepId]?.groups.some(g=>g.id===a.groupId)))errors.push('Invalid Group assignment scope.');
  }
  if(plan.conditionResolution!=='GROUPS_V2' && (plan.operationDesign||plan.assignments.some(a=>a.groupId)))errors.push('Group design requires its versioned contract.');
  return errors;
}
/** One scoped assignment remains the authority. Projection never expands values into stored Subject rows. */
export function resolveSubjectAssignments(plan:RunPlanningSnapshot,subjectId:string):Record<string,SetupAssignment>{
  const result:Record<string,SetupAssignment>={};
  for(const a of plan.assignments){
    if(a.positionId||!a.processStepId)continue;
    const state=allocationFor(plan,a.processStepId,subjectId);
    if(!isApplied(state))continue;
    const groupId='groupId' in state?state.groupId:undefined;
    const rank=a.subjectId===subjectId?2:(!a.subjectId&&a.groupId&&a.groupId===groupId)?1:!a.subjectId&&!a.groupId?0:-1;
    if(rank<0 || !a.value.trim())continue;
    const key=`${a.processStepId}:${a.kind}:${a.label}`,old=result[key];
    const oldRank=old?.subjectId?2:old?.groupId?1:0;
    if(!old||rank>oldRank)result[key]=a;
  }
  return result;
}
export function assignmentSource(a:SetupAssignment):'SUBJECT'|'GROUP'|'COMMON'{return a.subjectId?'SUBJECT':a.groupId?'GROUP':'COMMON';}
