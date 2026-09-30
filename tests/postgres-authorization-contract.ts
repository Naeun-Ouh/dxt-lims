import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type {SqlDatabase} from '@/src/infrastructure/postgres/sql-database';
import {authorizedOperation} from '@/src/infrastructure/postgres/authorized-application';
import {developmentPrincipalId,PostgresAuthorization,resolvePrincipal} from '@/src/infrastructure/postgres/authorization';
import {handleRepositoryRequest,dispatchRepository} from '@/app/api/repository/route';
import type {PlanningWorkspaceRecord} from '@/src/application/repository-ports';
import type {AuthoritativeRunPreview} from '@/src/application/run-creation';
import type {RunPlanningSnapshot} from '@/src/features/run-registration/planning-model';
import type {StudySetupSnapshot} from '@/src/features/experiment-series/study-setup-model';
import {DxtApplication} from '@/src/application/dxt-application';
import {createProductionSliceRepositories} from '@/src/infrastructure/postgres/postgres-repositories';
import {hydrateConfigurationPackages} from '@/src/infrastructure/postgres/configuration-hydrator';
import {createExperimentWorkspace} from '@/src/features/run-registration/workspace-model';
import {lifecycleAuthoringProfiles} from '@/src/mock/lifecycle-authoring';

export async function authorizationContract(db:SqlDatabase){
 const call=(p:string,input:Record<string,unknown>)=>authorizedOperation(db,p,input,dispatchRepository);
 const api=async(p:string,input:Record<string,unknown>)=>{const result=await handleRepositoryRequest(new Request('http://localhost/api/repository',{method:'POST',headers:{'content-type':'application/json','x-role':'ADMIN','x-principal-id':'owner'},body:JSON.stringify(input)}),(i,d)=>authorizedOperation(db,p,i,d??dispatchRepository));return result;};
 await db.query("INSERT INTO auth_org_unit VALUES ('part','PART',NULL),('dept','DEPARTMENT','part'),('other-dept','DEPARTMENT',NULL),('area','AREA',NULL),('module','MODULE',NULL)");
 for(const id of ['owner','viewer','outsider','leader','module-leader','area-user','collaborator','admin'])await db.query('INSERT INTO auth_principal VALUES ($1,$1,true,$2)',[id,id==='admin'?'ADMIN':'GENERAL_USER']);
 await db.query("INSERT INTO auth_membership VALUES ('viewer','dept',false),('leader','part',true),('module-leader','module',true),('area-user','area',false),('outsider','other-dept',false)");
 await db.query("INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) SELECT study_id,'owner','dept' FROM study");
 await db.query("INSERT INTO study_module_access SELECT study_id,'module' FROM study_access");
 const slugs=['dts-improvement','adhesion-material-optimization'] as const;
 const ids=(await db.query<{study_id:string;series_slug:string}>('SELECT study_id,series_slug FROM study')).rows;
 const photoId=ids.find(s=>s.series_slug===slugs[0])!.study_id;
 assert.throws(()=>developmentPrincipalId({}),/identity/);
 assert.equal(developmentPrincipalId({DXT_AUTH_PROVIDER:'server-development',DXT_DEV_PRINCIPAL:'viewer'}),'viewer');
 await assert.rejects(call('unknown',{operation:'study.list'}),/identity/);
 assert.equal((await call('outsider',{operation:'study.list'}) as unknown[]).length,0);
 assert.deepEqual(await call('outsider',{operation:'run.list'}),[]);
 const emptyBootstrap=await call('outsider',{operation:'bootstrap'});
 assert.ok(!JSON.stringify(emptyBootstrap).includes('DTS Improvement'));
 for(const p of ['owner','viewer','leader','module-leader','admin'])assert.equal((await call(p,{operation:'study.list'}) as unknown[]).length,ids.length);
 for(const slug of slugs){
  const setup=await call('owner',{operation:'study.load',slug}) as StudySetupSnapshot;
  await assert.rejects(call('outsider',{operation:'study.load',slug}),/unavailable/);
  const before=await db.query('SELECT * FROM study_setup_version ORDER BY setup_version_id');
  for(const p of ['viewer','leader','outsider','admin']){
   const denied=await api(p,{operation:'study.save',setup,command:{commandId:randomUUID(),expectedVersion:setup.revision}});assert.equal(denied.status,p==='outsider'?404:403);
   for(const source of ['STUDY_DEFAULT','PREVIOUS_RUN','EXISTING_RUN','BLANK'])assert.equal((await api(p,{operation:'run.create.preview',input:{seriesSlug:slug,source,sourceRunId:'unavailable'},fingerprint:'forged',command:{commandId:randomUUID()}})).status,p==='outsider'?404:403);
   assert.equal((await api(p,{operation:'run.create',slug,commandId:randomUUID()})).status,p==='outsider'?404:403);
   assert.equal((await api(p,{operation:'study.edit',slug,displayName:'attack',intent:'attack',expectedVersion:1})).status,p==='outsider'?404:403);
  }
  assert.deepEqual(await db.query('SELECT * FROM study_setup_version ORDER BY setup_version_id'),before);
  const runsBefore=await db.query('SELECT * FROM experiment_run ORDER BY run_id');
  assert.equal((await api('viewer',{operation:'run.next',sourceRunId:'missing',decisionId:'x',commandId:'x'})).status,404);
  assert.deepEqual(await db.query('SELECT * FROM experiment_run ORDER BY run_id'),runsBefore);
  let first:RunPlanningSnapshot|undefined;
  for(const source of ['STUDY_DEFAULT','PREVIOUS_RUN','EXISTING_RUN','BLANK'] as const){
   const input={seriesSlug:slug,source,...(source==='EXISTING_RUN'?{sourceRunId:first!.id}:{})};
   const preview=await call('owner',{operation:'run.preview',input}) as AuthoritativeRunPreview;
   const command={commandId:randomUUID()};
   const created=await call('owner',{operation:'run.create.preview',input,fingerprint:preview.fingerprint,command}) as RunPlanningSnapshot;
   assert.equal(created.subjectTypeRevisionId,setup.subjectTypeRevisionId);
   first??=created;
  }
  const run=first!;
  assert.equal((await call('viewer',{operation:'run.get',runId:run.id}) as RunPlanningSnapshot).id,run.id);
  assert.equal((await api('outsider',{operation:'run.get',runId:run.id})).status,404);
  assert.equal((await api('leader',{operation:'run.next',sourceRunId:run.id,decisionId:'forged',commandId:randomUUID()})).status,403);
  const original=await call('owner',{operation:'run.planning',runId:run.id}) as PlanningWorkspaceRecord;
  assert.equal(original.canEditPlan,true);
  assert.equal((await call('viewer',{operation:'run.planning',runId:run.id}) as PlanningWorkspaceRecord).canEditPlan,false);
  for(const p of ['viewer','leader','outsider','admin'])assert.equal((await api(p,{operation:'run.plan.save',record:original,command:{commandId:randomUUID(),expectedVersion:original.version}})).status,p==='outsider'?404:403);
  assert.deepEqual((await call('owner',{operation:'run.planning',runId:run.id})),original);
  assert.equal((await api('owner',{operation:'run.plan.save',record:original,command:{commandId:randomUUID(),expectedVersion:original.version}})).status,200);
  // Cross-department collaboration is explicit; VIEW alone cannot write.
  const sid=ids.find(s=>s.series_slug===slug)!.study_id;
  const grant=async(p:string,action:string)=>db.query('INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$5)',[randomUUID(),sid,p,action,'owner']);
  await grant('collaborator','VIEW_STUDY');
  assert.equal((await api('collaborator',{operation:'study.save',setup,command:{commandId:randomUUID(),expectedVersion:setup.revision}})).status,403);
  await grant('collaborator','EDIT_STUDY_SETUP');
  assert.equal((await api('collaborator',{operation:'study.save',setup:{...setup,revision:setup.revision+1},command:{commandId:randomUUID(),expectedVersion:setup.revision}})).status,200);
  await grant('viewer','CREATE_RUN');
  assert.equal((await api('viewer',{operation:'run.create',slug,commandId:randomUUID()})).status,200);
  const current=await call('owner',{operation:'run.planning',runId:run.id}) as PlanningWorkspaceRecord;
  const pins=(await db.query<{id:string}>('SELECT DISTINCT configuration_package_version_id id FROM study_setup_version')).rows.map(x=>x.id);
  const config=await hydrateConfigurationPackages(db,pins);
  const trusted=new DxtApplication(createProductionSliceRepositories(db,config));
  const model=createExperimentWorkspace(current.snapshot,config);
  const state=await trusted.loadLifecycle(current.snapshot,lifecycleAuthoringProfiles[slug],'ACTUAL');
  await trusted.recordActual(state,model,{id:randomUUID(),operationId:model.operations.find(o=>o.role==='PROCESS')!.id,subjectId:model.subjects[0].id,status:'COMPLETED',startedAt:'2026-09-19T00:00:00.000Z',endedAt:'2026-09-19T00:01:00.000Z',actualOverrides:{}});
  await grant('admin','EDIT_RUN_PLAN');
  for(const p of ['owner','admin']){
   const result=await api(p,{operation:'run.plan.save',record:current,command:{commandId:randomUUID(),expectedVersion:current.version}});
   assert.equal(result.status,409);assert.match(((await result.json()) as {error:string}).error,/locked/);
  }
  assert.deepEqual(await trusted.repositories.run.getSnapshot(run.id),current.snapshot);
  // Membership revocation changes discovery, never scientific identity/provenance.
  await db.query("DELETE FROM auth_membership WHERE principal_id='viewer'");
  assert.equal((await call('viewer',{operation:'study.list'}) as unknown[]).length,0);
  assert.deepEqual(await trusted.repositories.run.getSnapshot(run.id),current.snapshot);
  await db.query("INSERT INTO auth_membership VALUES ('viewer','dept',false)");
 }
 const foreign=(await db.query<{run_domain_id:string}>("SELECT r.run_domain_id FROM experiment_run r JOIN study s USING(study_id) WHERE s.series_slug='adhesion-material-optimization' LIMIT 1")).rows[0];
 await db.query("INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES('source-test', $1,'area-user','VIEW_STUDY','owner'),('source-create',$1,'area-user','CREATE_RUN','owner')",[photoId]);
 assert.equal((await api('area-user',{operation:'run.preview',input:{seriesSlug:slugs[0],source:'EXISTING_RUN',sourceRunId:foreign.run_domain_id}})).status,404);
 await db.query("DELETE FROM study_access_grant WHERE id IN ('source-test','source-create')");
 await db.query("INSERT INTO study_access_grant(id,study_id,unit_id,action,granted_by,expires_at) VALUES('expired',$1,'other-dept','VIEW_STUDY','owner','2000-01-01')",[photoId]);
 assert.equal((await api('outsider',{operation:'study.load',slug:slugs[0]})).status,404);
 await db.query("UPDATE study_access_grant SET expires_at=NULL WHERE id='expired'");
 assert.equal((await api('outsider',{operation:'study.load',slug:slugs[0]})).status,200);
 await db.query("UPDATE study_access_grant SET active=false WHERE id='expired'");
 await db.query("UPDATE study_access SET visibility='PRIVATE',version=version+1 WHERE study_id=$1",[photoId]);
 for(const p of ['viewer','leader','module-leader'])assert.equal((await api(p,{operation:'study.load',slug:slugs[0]})).status,404);
 for(const p of ['owner','admin','collaborator'])assert.equal((await api(p,{operation:'study.load',slug:slugs[0]})).status,200);
 await db.query("UPDATE study_access SET visibility='AREA',area_id='area',version=version+1 WHERE study_id=$1",[photoId]);
 assert.equal((await api('area-user',{operation:'study.load',slug:slugs[0]})).status,200);
 await db.query('UPDATE study_access SET area_id=NULL WHERE study_id=$1',[photoId]);
 assert.equal((await api('area-user',{operation:'study.load',slug:slugs[0]})).status,404);
 assert.equal((await api('viewer',{operation:'study.load',slug:slugs[0]})).status,200);
 await db.query("UPDATE study_access_grant SET active=false WHERE principal_id='collaborator'");
 assert.equal((await api('collaborator',{operation:'study.load',slug:slugs[0]})).status,404);
 await db.query("UPDATE auth_principal SET active=false WHERE id='owner'");
 await assert.rejects(call('owner',{operation:'study.list'}),/identity/);
 await db.query("UPDATE auth_principal SET active=true WHERE id='owner'");
 const policy=new PostgresAuthorization(db),admin=await resolvePrincipal(db,'admin');
 assert.equal((await policy.authorize(admin,'MANAGE_ACCESS',photoId)).effect,'ALLOW');
 assert.equal((await policy.authorize(admin,'EDIT_STUDY_SETUP',photoId)).effect,'DENY');
 for(const op of ['configuration.execute','analysis.save','unsupported.write'])await assert.rejects(call('admin',{operation:op}),/not available/);
 const preserved=await db.query('SELECT * FROM experiment_run ORDER BY run_id');
 const metadata=(await db.query<{aggregate_version:string;display_name:string;intent:string}>('SELECT aggregate_version,display_name,intent FROM study WHERE study_id=$1',[photoId])).rows[0];
 assert.equal((await api('owner',{operation:'study.edit',slug:slugs[0],displayName:metadata.display_name,intent:metadata.intent,expectedVersion:Number(metadata.aggregate_version)})).status,200);
 assert.deepEqual(await db.query('SELECT * FROM experiment_run ORDER BY run_id'),preserved);
 await db.query('DELETE FROM study_module_access WHERE study_id=$1',[photoId]);
 await db.query('DELETE FROM study_access_grant WHERE study_id=$1',[photoId]);
 await db.query('DELETE FROM study_access WHERE study_id=$1',[photoId]);
 assert.equal((await api('admin',{operation:'study.load',slug:slugs[0]})).status,404);
}
