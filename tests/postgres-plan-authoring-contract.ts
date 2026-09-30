import {editOperationParticipation} from '@/src/features/run-registration/participation';
import assert from 'node:assert/strict';
import {DxtApplication} from '@/src/application/dxt-application';
import {createProductionSliceRepositories} from '@/src/infrastructure/postgres/postgres-repositories';
import {hydrateConfigurationPackages} from '@/src/infrastructure/postgres/configuration-hydrator';
import type {SqlDatabase} from '@/src/infrastructure/postgres/sql-database';
import {createExperimentWorkspace} from '@/src/features/run-registration/workspace-model';
import {lifecycleAuthoringProfiles} from '@/src/mock/lifecycle-authoring';
import {createNextRunPreview} from '@/src/features/run-registration/decision-continuation-model';

export async function productionPlanAuthoringContract(db:SqlDatabase){
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
