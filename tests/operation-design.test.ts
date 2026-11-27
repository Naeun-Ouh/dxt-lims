import test from 'node:test';
import assert from 'node:assert/strict';
import {addOperationGroup,allocationFor,applyOperationDesign,commonOperationDesign,removeOperationGroup,validateOperationDesign} from '@/src/features/run-registration/operation-design';
import {effectiveAssignments} from '@/src/features/run-registration/planning-model';
import {materialRunPlanningSnapshot} from '@/src/features/material-rd/material-rd-scenario';
import {executionReadiness} from '@/src/application/execution-readiness';
import {configurationRepository} from '@/src/mock/configuration-packages';
import {definitions} from '@/src/mock/reference';

function plan(){
 const p=structuredClone(materialRunPlanningSnapshot);p.conditionResolution='GROUPS_V2';
 p.steps=p.steps.filter(s=>s.role==='PROCESS');p.measurements=[];
 p.subjectOperationIds=Object.fromEntries(p.subjects.map(s=>[s.id,p.steps.map(o=>o.id)]));
 return p;
}
void test('Group membership is explicit: COMMON is not Base; deleting Group is UNASSIGNED, not Skip',()=>{
 const p=plan(),op=p.steps[0].id,s=p.subjects[0].id;
 const common=commonOperationDesign(p.subjects.map(s=>s.id));
 assert.equal(common.groups.length,0);
 let d=addOperationGroup(common,{id:'base',kind:'BASE',name:'Base'});
 assert.equal(d.allocations[s].state,'UNASSIGNED');
 assert.throws(()=>addOperationGroup(d,{id:'base2',kind:'BASE',name:'Base2'}));
 d.allocations[s]={state:'ASSIGNED',groupId:'base'};
 const assigned=applyOperationDesign(p,op,d);
 assert.deepEqual(validateOperationDesign(assigned),[]);
 assert.equal(allocationFor(assigned,op,s).state,'ASSIGNED');
 d=removeOperationGroup(d,'base');
 assert.equal(d.allocations[s].state,'UNASSIGNED');
 assert.equal(allocationFor({...p,subjectOperationIds:{[s]:[]}},op,s).state,'LEGACY_EXCLUDED');
});
void test('Subject > Group > common resolves value and role together, independently of storage order, including zero/false',()=>{
 let p=plan();const a=p.assignments.find(a=>a.kind==='CONDITION')!,op=a.processStepId!,[s1,s2,s3]=p.subjects;
 const d=addOperationGroup(commonOperationDesign(p.subjects.map(s=>s.id)),{id:'split',kind:'SPLIT',name:'Split'});
 d.allocations[s1.id]={state:'ASSIGNED',groupId:'split'};d.allocations[s2.id]={state:'ASSIGNED',groupId:'split'};d.allocations[s3.id]={state:'SKIP'};
 p=applyOperationDesign(p,op,d);
 const values=[{...a,id:'common',subjectId:null,value:'5',intentRole:'FIXED' as const},{...a,id:'group',subjectId:null,groupId:'split',value:'7',intentRole:'VARIED' as const},{...a,id:'subject',subjectId:s1.id,value:'0',intentRole:'FIXED' as const}];
 const key=`${op}:${a.kind}:${a.label}`;
 for(const assignments of [values,[...values].reverse()]){
  const current={...p,assignments};assert.equal(effectiveAssignments(current,s1.id)[key].value,'0');assert.equal(effectiveAssignments(current,s1.id)[key].intentRole,'FIXED');
  assert.equal(effectiveAssignments(current,s2.id)[key].value,'7');assert.equal(effectiveAssignments(current,s2.id)[key].intentRole,'VARIED');assert.equal(effectiveAssignments(current,s3.id)[key],undefined);
 }
 for(const value of ['false','invalid explicit'])assert.equal(effectiveAssignments({...p,assignments:values.map(a=>a.id==='subject'?{...a,value}:a)},s1.id)[key].value,value,'not truthiness or fallback');
 assert.equal(effectiveAssignments({...p,assignments:values.map(a=>a.id==='subject'?{...a,value:''}:a)},s1.id)[key].value,'7');
 const moved=applyOperationDesign({...p,assignments:values},op,{...d,allocations:{...d.allocations,[s1.id]:{state:'UNASSIGNED'}}});
 assert.deepEqual(moved.assignments,values,'moving never erases overrides');
});
void test('Missing and Unassigned warn without blocking; structural invalidity remains distinct',()=>{
 let p=plan();p.assignments=[];const d=addOperationGroup(commonOperationDesign(p.subjects.map(s=>s.id)),{id:'split',kind:'SPLIT',name:'Split'});
 p=applyOperationDesign(p,p.steps[0].id,d);
 const ready=executionReadiness(p,configurationRepository,definitions);
 assert.ok(!ready.execution.missing.some(m=>/required execution|Unassigned/.test(m)));assert.ok(ready.execution.warnings.some(m=>m.startsWith('Unassigned')));
 const invalid=structuredClone(p);invalid.operationDesign![p.steps[0].id].allocations[p.subjects[0].id]={state:'ASSIGNED',groupId:'unknown'};
 assert.ok(validateOperationDesign(invalid).length);
});
void test('1200 Operations x 25 Subjects resolves bounded state without expanding Group condition storage',()=>{
 const p=plan(),source=p.steps[0],assignment=p.assignments.find(a=>a.processStepId===source.id)!;
 p.subjects=Array.from({length:25},(_,i)=>({id:`W${i+1}`,displayLabel:`W${i+1}`,type:'WAFER' as const}));
 p.steps=Array.from({length:1200},(_,i)=>({...source,id:`op${i}`}));p.assignments=p.steps.map(s=>({...assignment,id:`a-${s.id}`,subjectId:null,processStepId:s.id}));
 p.subjectOperationIds=Object.fromEntries(p.subjects.map(s=>[s.id,p.steps.map(o=>o.id)]));
 p.operationDesign=Object.fromEntries(p.steps.map(o=>[o.id,commonOperationDesign(p.subjects.map(s=>s.id))]));
 const started=performance.now();assert.deepEqual(validateOperationDesign(p),[]);
 for(const s of p.subjects)assert.equal(Object.keys(effectiveAssignments(p,s.id)).length,1200);
 assert.equal(p.assignments.length,1200);assert.ok(performance.now()-started<5000,'bounded local projection under 5s');
});
void test('Planned Skip preserves unexpected Actual evidence and has no fabricated planned/default condition',async()=>{
 const {createExperimentWorkspace}=await import('@/src/features/run-registration/workspace-model');
 const {projectOperationExecution}=await import('@/src/features/run-registration/actual-execution-model');
 let p=plan();const op=p.steps[0].id,s=p.subjects[0];const d=commonOperationDesign(p.subjects.map(s=>s.id));d.allocations[s.id]={state:'SKIP'};p=applyOperationDesign(p,op,d);
 const model=createExperimentWorkspace(p,configurationRepository),operation=model.operations.find(o=>o.id===op)!;
 const evidence=[{event:{id:'unexpected',experimentRunId:p.id,processStepId:op,plannedExecutionItemId:null,observedOperation:operation.name,observedRecipe:'observed-only',equipment:'Observed',startedAt:'2026-11-27T00:00:00Z',endedAt:null,executionStatus:'OBSERVED' as const,sourceSystem:'TEST',sourceRecordReference:'raw-1'},resolvedSubjectId:s.id,observedValues:[],retrievedAt:'2026-11-27T00:00:00Z'}];
 const before=JSON.stringify(evidence);const projection=projectOperationExecution(model,operation,s,evidence);
 assert.equal(projection.unexpected,true);assert.deepEqual(projection.event,evidence[0].event);assert.ok(projection.comparisons.every(c=>c.planned===null));assert.equal(JSON.stringify(evidence),before);
 assert.equal(projectOperationExecution(model,operation,s,[]).event,null);
});
void test('Missing V2 Plan rows stay editable and value-only Subject edits retain inherited Group intent',async()=>{
 const {createExperimentWorkspace}=await import('@/src/features/run-registration/workspace-model');
 const {projectEngineeringGridRows}=await import('@/src/features/run-registration/engineering-grid-model');
 const {applyGridPlanEdits}=await import('@/src/features/run-registration/engineering-grid-plan-edit');
 let p=plan();const a=p.assignments.find(a=>a.kind==='CONDITION')!,op=a.processStepId!,subject=p.subjects[0];
 const d=addOperationGroup(commonOperationDesign(p.subjects.map(s=>s.id)),{id:'g',kind:'SPLIT',name:'G'});d.allocations[subject.id]={state:'ASSIGNED',groupId:'g'};p=applyOperationDesign(p,op,d);
 p.assignments=[{...a,subjectId:null,value:'10',intentRole:'FIXED'},{...a,id:'gvalue',groupId:'g',subjectId:null,value:'20',intentRole:'VARIED'}];
 const model=createExperimentWorkspace(p,configurationRepository);model.explicitAssignments=true;
 const operations=model.operations.map(o=>({...o,sourceOperationId:o.id}));
 const rows=projectEngineeringGridRows(model,operations,new Set(operations.map(o=>o.id)));
 const row=rows.find(r=>r.assignment?.label===a.label&&r.operation.id===op)!;assert.ok(row);
 const edited=applyGridPlanEdits(p,rows,{[`${row.id}:${subject.id}`]:'21'},{});
 assert.equal(edited.assignments.find(a=>a.subjectId===subject.id)?.intentRole,'VARIED');
 const missingModel=createExperimentWorkspace({...p,assignments:[]},configurationRepository);missingModel.explicitAssignments=true;
 const missingRows=projectEngineeringGridRows(missingModel,operations,new Set(operations.map(o=>o.id)));assert.ok(missingRows.some(r=>r.kind==='VARIABLE'));
 assert.ok(missingRows.filter(r=>r.kind==='VARIABLE').every(r=>r.assignment?.value===''));
});
