import {editOperationParticipation} from '@/src/features/run-registration/participation';
import assert from 'node:assert/strict';
import {DxtApplication} from '@/src/application/dxt-application';
import {createProductionSliceRepositories} from './explicit-scientific-repositories';
import {hydrateConfigurationPackages} from '@/src/infrastructure/postgres/configuration-hydrator';
import type {SqlDatabase} from '@/src/infrastructure/postgres/sql-database';
import {createExperimentWorkspace} from '@/src/features/run-registration/workspace-model';
import {lifecycleAuthoringProfiles} from '@/src/mock/lifecycle-authoring';
import {createNextRunPreview} from '@/src/features/run-registration/decision-continuation-model';

export async function productionPlanAuthoringContract(db:SqlDatabase){
 await stableOperationIdentityContract(db);
 const pins=(await db.query<{id:string}>('SELECT DISTINCT configuration_package_version_id id FROM study_setup_version')).rows.map(r=>r.id);
 const configuration=await hydrateConfigurationPackages(db,pins);
 const app=new DxtApplication(createProductionSliceRepositories(db,configuration));
 const proofs=[];
 for(const slug of ['dts-improvement','adhesion-material-optimization'] as const){
  const setup=await app.studies.load(slug);
  const snapshot=await app.createRunFromStudy(slug,'STUDY_DEFAULT',`7b-create-${slug}`);
  const original=(await app.runs.loadPlanning(snapshot.id))!;
  assert.equal(original.version,1);assert.equal(original.lockReason,null);
  const numeric=snapshot.assignments.find(a=>a.kind==='CONDITION'&&Number.isFinite(Number(a.value)))!;
  const next={...original,snapshot:{...editOperationParticipation(snapshot,snapshot.steps[0].id,[snapshot.subjects.at(-1)!.id],false),assignments:snapshot.assignments.map(a=>a.id===numeric.id?{...a,value:'37',intentRole:'FIXED' as const}:a)}};
  await app.runs.savePlanning(next,`7b-edit-${slug}`);
  await app.runs.savePlanning(next,`7b-edit-${slug}`);
  const saved=(await app.runs.loadPlanning(snapshot.id))!;
  assert.equal(saved.snapshot.subjectOperationIds[snapshot.subjects.at(-1)!.id].includes(snapshot.steps[0].id),false);
  assert.equal(saved.version,2);assert.equal(saved.snapshot.assignments.find(a=>a.id===numeric.id)?.value,'37');
  assert.equal(saved.snapshot.assignments.find(a=>a.id===numeric.id)?.intentRole,'FIXED');
  assert.ok(saved.snapshot.delta.items.some(d=>d.change==='CHANGED'&&d.after==='37'));
  assert.deepEqual(await app.studies.load(slug),setup);
  await assert.rejects(app.runs.savePlanning(next,`7b-stale-${slug}`),/changed/);
  await assert.rejects(app.runs.savePlanning({...next,snapshot:{...next.snapshot,intent:'different'}},`7b-edit-${slug}`),/identity/);
  await assert.rejects(app.runs.savePlanning({...saved,snapshot:{...saved.snapshot,configurationPackageVersionId:'latest'}},`7b-rebase-${slug}`),/configurationPackageVersionId/);
  const receipts=Number((await db.query<{count:string}>('SELECT count(*) FROM idempotency_record')).rows[0].count);
  await db.query("CREATE OR REPLACE FUNCTION fail_plan_assignment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected Plan failure'; END $$");
  await db.query('CREATE TRIGGER fail_plan_assignment BEFORE INSERT ON run_assignment FOR EACH ROW EXECUTE FUNCTION fail_plan_assignment()');
  try{await assert.rejects(app.runs.savePlanning({...saved,snapshot:{...saved.snapshot,intent:'must roll back'}},`7b-fail-${slug}`));}finally{await db.query('DROP TRIGGER fail_plan_assignment ON run_assignment');}
  assert.deepEqual(await app.runs.loadPlanning(snapshot.id),saved);
  assert.equal(Number((await db.query<{count:string}>('SELECT count(*) FROM idempotency_record')).rows[0].count),receipts);
  // Existing full-snapshot creation contract also proves an independent editable Next Run.
  const nextSnapshot=createNextRunPreview(saved.snapshot,`7b-next-${slug}`,[]).snapshot;
  const createdNext=await app.repositories.run.saveSnapshot(nextSnapshot,{commandId:`7b-next-create-${slug}`});
  const editableNext=(await app.runs.loadPlanning(createdNext.id))!;
  assert.equal(editableNext.lockReason,null);
  await app.runs.savePlanning({...editableNext,snapshot:{...editableNext.snapshot,assignments:editableNext.snapshot.assignments.map(a=>a.id===createdNext.assignments.find(x=>x.label===numeric.label)!.id?{...a,value:'38'}:a)}},`7b-next-edit-${slug}`);
  assert.deepEqual(await app.repositories.run.getSnapshot(snapshot.id),saved.snapshot);
  const model=createExperimentWorkspace(saved.snapshot,configuration);
  const state=await app.loadLifecycle(saved.snapshot,lifecycleAuthoringProfiles[slug],'ACTUAL');
  await app.recordActual(state,model,{id:`7b-actual-${slug}`,operationId:numeric.processStepId!,subjectId:model.subjects[0].id,status:'COMPLETED',startedAt:'2026-09-18T00:00:00.000Z',endedAt:'2026-09-18T00:10:00.000Z',actualOverrides:{}});
  await assert.rejects(app.runs.savePlanning({...saved,snapshot:editOperationParticipation(saved.snapshot,saved.snapshot.steps[0].id,[saved.snapshot.subjects.at(-1)!.id],true)},`7b-race-${slug}`),/locked/);
  const locked=(await app.runs.loadPlanning(snapshot.id))!;assert.match(locked.lockReason!,/execution/);assert.equal(locked.version,2);
  assert.deepEqual(locked.snapshot,saved.snapshot);
  await app.runs.savePlanning(next,`7b-edit-${slug}`); // successful replay never rewrites locked data
  proofs.push({locked,editable:(await app.runs.loadPlanning(createdNext.id))!});
 }
 const measurementOnly=await app.createRunFromStudy('adhesion-material-optimization','STUDY_DEFAULT','7b-measurement-only');
 const measurementModel=createExperimentWorkspace(measurementOnly,configuration);
 const measurementState=await app.loadLifecycle(measurementOnly,lifecycleAuthoringProfiles['adhesion-material-optimization'],'MEASUREMENT');
 const catalog=await app.repositories.measurement.getCatalog(measurementOnly.configurationPackageVersionId);
 const measurementPlan=measurementOnly.measurements[0];
 await app.recordMeasurement(measurementState,measurementModel,catalog,{id:'7b-only-observation',operationId:measurementPlan.stepId,subjectId:measurementOnly.subjects[0].id,parameterDefinitionId:measurementPlan.parameterDefinitionIds[0],measurementPoint:measurementPlan.point,value:'5.7',grain:'SUBJECT',coordinateValues:[],recordedAt:'2026-09-18T01:00:00.000Z'});
 assert.equal((await app.executions.load(measurementOnly.id)).records.length,0);
 const measurementLocked=(await app.runs.loadPlanning(measurementOnly.id))!;
 assert.match(measurementLocked.lockReason!,/measurement/);
 await assert.rejects(app.runs.savePlanning(measurementLocked,'7b-only-observation-reject'),/locked/);
 const measurementRuns=(await db.query<{run_domain_id:string}>(`SELECT DISTINCT r.run_domain_id FROM experiment_run r JOIN measurement_execution m USING(run_id)`)).rows;
 for(const row of measurementRuns){const record=(await app.runs.loadPlanning(row.run_domain_id))!;assert.ok(record.lockReason);await assert.rejects(app.runs.savePlanning(record,'7b-measurement-'+row.run_domain_id),/locked/);}
 return proofs;
}

/** Real two-connection ordering: Actual owns the root lock before stale Plan attempts save. */
export async function nativePlanEvidenceRace(db:SqlDatabase){
 const pins=(await db.query<{id:string}>('SELECT DISTINCT configuration_package_version_id id FROM study_setup_version')).rows.map(r=>r.id);
 const configuration=await hydrateConfigurationPackages(db,pins);
 const app=new DxtApplication(createProductionSliceRepositories(db,configuration));
 const snapshot=await app.createRunFromStudy('dts-improvement','STUDY_DEFAULT','7b-concurrent-run');
 const plan=(await app.runs.loadPlanning(snapshot.id))!;
 const model=createExperimentWorkspace(snapshot,configuration);
 const state=await app.loadLifecycle(snapshot,lifecycleAuthoringProfiles['dts-improvement'],'ACTUAL');
 let signal!:()=>void,release!:()=>void;
 const locked=new Promise<void>(resolve=>{signal=resolve;});
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const gated:SqlDatabase={query:db.query.bind(db),close:async()=>{},transaction:work=>db.transaction(sql=>work({query:async <T extends import('@/src/infrastructure/postgres/sql-database').SqlRow>(text:string,args?:unknown[])=>{const result=await sql.query<T>(text,args);if(text.includes('FROM experiment_run WHERE run_domain_id')&&text.endsWith('FOR UPDATE')){signal();await gate;}return result;}}))};
 const writer=new DxtApplication(createProductionSliceRepositories(gated,configuration));
 const operation=model.operations.find(o=>o.role==='PROCESS')!;
 const evidence=writer.recordActual(state,model,{id:'7b-concurrent-actual',operationId:operation.id,subjectId:model.subjects[0].id,status:'COMPLETED',startedAt:'2026-09-18T00:00:00.000Z',endedAt:'2026-09-18T00:10:00.000Z',actualOverrides:{}});
 await locked;
 const stale=assert.rejects(app.runs.savePlanning({...plan,snapshot:{...snapshot,intent:'concurrent overwrite'}},'7b-concurrent-save'),/locked/);
 release();await evidence;await stale;
 assert.deepEqual(await app.repositories.run.getSnapshot(snapshot.id),snapshot);
}

/** Operation instances and all surviving Plan children retain relational identity. */
export async function stableOperationIdentityContract(db:SqlDatabase){
 const pins=(await db.query<{id:string}>('SELECT DISTINCT configuration_package_version_id id FROM study_setup_version')).rows.map(r=>r.id);
 const configuration=await hydrateConfigurationPackages(db,pins);
 const app=new DxtApplication(createProductionSliceRepositories(db,configuration));
 const created=await app.createRunFromStudy('adhesion-material-optimization','STUDY_DEFAULT','stable-operation-create');
 const physical=async()=>{
  const root=(await db.query<{run_id:string}>('SELECT run_id FROM experiment_run WHERE run_domain_id=$1',[created.id])).rows[0].run_id;
  const operations=(await db.query<{id:string;domain:string;sequence:number}>('SELECT run_operation_id id,operation_domain_id domain,sequence FROM run_operation WHERE run_id=$1 ORDER BY operation_domain_id',[root])).rows;
  const subjects=(await db.query<{id:string;domain:string;ordinal:number}>('SELECT rs.run_subject_id id,s.subject_domain_id domain,ordinal FROM run_subject rs JOIN subject s USING(subject_id) WHERE rs.run_id=$1 ORDER BY s.subject_domain_id',[root])).rows;
  const assignments=(await db.query<{id:string;domain:string}>('SELECT run_assignment_id id,assignment_domain_id domain FROM run_assignment WHERE run_id=$1 ORDER BY assignment_domain_id',[root])).rows;
  const measurements=(await db.query<{id:string;domain:string}>('SELECT measurement_plan_id id,measurement_domain_id domain FROM run_measurement_plan WHERE run_id=$1 ORDER BY measurement_domain_id',[root])).rows;
  return {operations,subjects,assignments,measurements};
 };
 const before=await physical();
 const original=(await app.runs.loadPlanning(created.id))!;
 const processSteps=created.steps.filter(step=>step.role==='PROCESS');
 if(processSteps.length>1)await assert.rejects(app.runs.savePlanning({...original,snapshot:{...created,steps:created.steps.map(step=>step.id===processSteps[0].id?{...step,operationDefinitionId:processSteps[1].operationDefinitionId}:step)}},'stable-operation-forged-definition'),/instance identity/);
 assert.deepEqual(await physical(),before);
 await app.runs.savePlanning({...original,snapshot:{...created,steps:[...created.steps].reverse().map(step=>({...step,label:`${step.label} renamed`})),subjects:[...created.subjects].reverse()}},'stable-operation-reorder');
 const reordered=(await app.runs.loadPlanning(created.id))!;
 const after=await physical();
 const identities=(rows:{id:string;domain:string}[])=>rows.map(({id,domain})=>({id,domain}));
 for(const kind of ['operations','subjects','assignments','measurements'] as const)assert.deepEqual(identities(after[kind]),identities(before[kind]),`${kind} identity changed during reorder`);
 assert.deepEqual(reordered.snapshot.steps.map(step=>step.id),[...created.steps].reverse().map(step=>step.id));
 assert.deepEqual(after.operations.map(row=>row.sequence),before.operations.map(row=>created.steps.length+1-row.sequence));
 // Repeating a definition is a new explicit instance, never an alias of the first.
 const source=created.steps.find(step=>step.role==='PROCESS')!;
 const repeated={...source,id:`${created.id}-repeat-instance`,label:`${source.label} repeat`};
 const repeatedAssignments=created.assignments.filter(a=>a.processStepId===source.id).map(a=>({...a,id:`${a.id}-repeat`,processStepId:repeated.id}));
 await app.runs.savePlanning({...reordered,snapshot:{...reordered.snapshot,steps:[repeated,...reordered.snapshot.steps],assignments:[...reordered.snapshot.assignments,...repeatedAssignments],subjectOperationIds:Object.fromEntries(Object.entries(reordered.snapshot.subjectOperationIds).map(([id,steps])=>[id,[...steps,repeated.id]]))}},'stable-operation-repeat');
 const repeatRecord=(await app.runs.loadPlanning(created.id))!;
 const repeatedPhysical=await physical();
 assert.notEqual(repeatedPhysical.operations.find(row=>row.domain===source.id)!.id,repeatedPhysical.operations.find(row=>row.domain===repeated.id)!.id);
 for(const row of before.operations)assert.equal(repeatedPhysical.operations.find(next=>next.domain===row.domain)!.id,row.id);
 // Remove only the repeated instance and one Subject; survivors keep their IDs.
 const removedSubject=repeatRecord.snapshot.subjects.at(-1)!;
 const remainingSubjects=repeatRecord.snapshot.subjects.filter(subject=>subject.id!==removedSubject.id);
 await app.runs.savePlanning({...repeatRecord,snapshot:{...repeatRecord.snapshot,subjects:remainingSubjects,steps:repeatRecord.snapshot.steps.filter(step=>step.id!==repeated.id),assignments:repeatRecord.snapshot.assignments.filter(a=>a.processStepId!==repeated.id&&a.subjectId!==removedSubject.id),subjectOperationIds:Object.fromEntries(remainingSubjects.map(subject=>[subject.id,repeatRecord.snapshot.subjectOperationIds[subject.id].filter(id=>id!==repeated.id)]))}},'stable-operation-remove');
 const removed=await physical();
 assert.deepEqual(identities(removed.operations),identities(before.operations));
 assert.deepEqual(identities(removed.subjects),identities(before.subjects.filter(row=>row.domain!==removedSubject.id)));
 assert.deepEqual(identities(removed.assignments),identities(before.assignments));
 const saved=(await app.runs.loadPlanning(created.id))!;
 assert.ok(!saved.snapshot.steps.some(step=>step.id===repeated.id));
 assert.ok(!saved.snapshot.subjects.some(subject=>subject.id===removedSubject.id));
 return {snapshot:saved.snapshot,identities:removed};
}
