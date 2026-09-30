import {scopedDashboard,scopedStudyList,scopedRunSummaries,scopedSearch} from './scoped-discovery';
import {accessibleSavedAnalysisIds} from './saved-analysis-authorization';
import {authorizeConfigurationMutation, configurationPermissions, requireReadableConfigurationReferences} from './configuration-authorization';
import {PostgresConfigurationAuthoring,readConfigurationAuthoring} from './postgres-configuration-authoring';
import {authorizeScientificInput} from './scientific-authorization';
import {PostgresMeasurementRepository} from './postgres-measurement-repository';
import {savedAnalysisOperation} from './saved-analysis-sharing';
import { createHash } from 'node:crypto';
import { DxtApplication } from '@/src/application/dxt-application';
import { ApplicationError } from '@/src/application/repository-ports';
import type { StudyAction } from '@/src/application/authorization';
import type { SqlDatabase } from './sql-database';
import { PostgresAuthorization,resolvePrincipal,allowReasons } from './authorization';
import { hydrateConfigurationPackages } from './configuration-hydrator';
import { createProductionSliceRepositories } from './postgres-repositories';

const object=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'?x as Record<string,unknown>:{};
const text=(x:unknown)=>typeof x==='string'?x:'';
const denied=()=>{throw new ApplicationError('FORBIDDEN','Operation is not available in this authorization pilot.');};
/** Only entry point for production HTTP. Authorization and core writes share one transaction. */
export async function authorizedOperation<T>(database:SqlDatabase,principalId:string,raw:Record<string,unknown>,dispatch:(app:DxtApplication,input:Record<string,unknown>)=>Promise<T>):Promise<unknown>{
 return database.transaction(async sql=>{
  await sql.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  // Pilot-scale stable policy snapshot. Revocation/transfer DML waits until this command completes.
  await sql.query('LOCK TABLE auth_principal,auth_org_unit,auth_membership,study_access,study_module_access,study_access_grant,configuration_access_scope,configuration_access_grant IN SHARE MODE');
  const principal=await resolvePrincipal(sql,principalId), policy=new PostgresAuthorization(sql);
  const input=structuredClone(raw), op=text(input.operation);
  if(op.startsWith('analysis.'))return savedAnalysisOperation(sql,principal,input);
  if(op==='dashboard.query')return scopedDashboard(sql,principal,input.query);
  if(op==='study.list')return scopedStudyList(sql,principal,input.query);
  if(op==='run.summaries')return scopedRunSummaries(sql,principal,input.query);
  if(op==='search.query')return scopedSearch(sql,principal,input.query,text(input.kind)||'ALL');
  const study=async(slug:string,action:StudyAction)=>{
   const r=(await sql.query<{study_id:string}>('SELECT study_id FROM study WHERE series_slug=$1',[slug])).rows[0];
   if(!r)throw new ApplicationError('NOT_FOUND','Resource unavailable or access denied.');
   await policy.require(principal,action,r.study_id);return r.study_id;
  };
  const run=async(id:string,action:StudyAction)=>{
   const r=(await sql.query<{study_id:string}>('SELECT study_id FROM experiment_run WHERE run_domain_id=$1',[id])).rows[0];
   if(!r)throw new ApplicationError('NOT_FOUND','Resource unavailable or access denied.');
   await policy.require(principal,action,r.study_id);return r.study_id;
  };
  let sid:string|undefined;
  const configurationRequest=op==='configuration.execute'?await authorizeConfigurationMutation(sql,principalId,input.request):undefined;
  if(configurationRequest)input.request=configurationRequest;
  if(op==='study.edit'){
   const id=await study(text(input.slug),'EDIT_STUDY');
   const result=await sql.query(`UPDATE study SET display_name=$2,intent=$3,aggregate_version=aggregate_version+1 WHERE study_id=$1 AND aggregate_version=$4 RETURNING aggregate_version`,[id,input.displayName,input.intent,input.expectedVersion]);
   if(!result.rows.length)throw new ApplicationError('CONFLICT','Study changed; reload before editing.');
   return {version:Number(result.rows[0].aggregate_version)};
  }
  if(op==='study.permissions'){sid=await study(text(input.slug),'VIEW_STUDY');return policy.permissions(principal,sid);}
  if(op==='study.reasoning.confirm')sid=await study(text(input.slug),'MANAGE_REASONING_CONTEXT');
  else if(op==='study.load'||op==='study.readiness'||op==='run.created')sid=await study(text(input.slug),'VIEW_STUDY');
  else if(op==='study.save')sid=await study(text(object(input.setup).seriesSlug),'EDIT_STUDY_SETUP');
  else if(op==='run.create')sid=await study(text(input.slug),'CREATE_RUN');
  else if(op==='run.preview'||op==='run.create.preview'){
   const req=object(input.input);sid=await study(text(req.seriesSlug),'CREATE_RUN');
   if(req.source==='EXISTING_RUN'){if(await run(text(req.sourceRunId),'VIEW_RUN')!==sid)denied();}
   if(req.source==='PREVIOUS_RUN'){
    const previous=(await sql.query<{run_domain_id:string}>('SELECT run_domain_id FROM experiment_run WHERE study_id=$1 ORDER BY run_number DESC LIMIT 1',[sid])).rows[0];
    if(previous)await run(previous.run_domain_id,'VIEW_RUN');
   }
  }else if(op==='run.next'){
   sid=await run(text(input.sourceRunId),'VIEW_RUN');await policy.require(principal,'CREATE_RUN',sid);
  }else if(op==='run.plan.save')sid=await run(text(object(object(input.record).snapshot).id),'EDIT_RUN_PLAN');
  else if(op==='execution.save')sid=await run(text(input.runId),'RECORD_ACTUAL');
  else if(['measurement.save','evaluation.save','decision.save'].includes(op))sid=await run(text(input.runId),'VIEW_RUN');
  else if(['run.get','run.planning','execution.load','measurement.load','evaluation.load','evaluation.context','decision.load'].includes(op)){
   const readActions:Record<string,StudyAction>={'execution.load':'VIEW_EXECUTION','measurement.load':'VIEW_MEASUREMENT','evaluation.load':'VIEW_EVALUATION','evaluation.context':'VIEW_EVALUATION','decision.load':'VIEW_DECISION'};
   sid=await run(text(input.runId),readActions[op]??'VIEW_RUN');
  }
  else if(!['bootstrap','configuration.load','configuration.execute','run.list','measurement.catalog','measurement.query','measurement.datasets','analysis.load','analysis.list'].includes(op))denied();

  const pins=(await sql.query<{id:string}>(`WITH accessible AS MATERIALIZED (SELECT study_id FROM dxt_discoverable_studies($1) WHERE reason=ANY($2::text[])) SELECT v.configuration_package_version_id id FROM study_setup_version v JOIN accessible USING(study_id) UNION SELECT r.configuration_package_version_id id FROM experiment_run r JOIN accessible USING(study_id)`,[principalId,allowReasons])).rows.map(r=>r.id);
  const discoverable=(await sql.query<{id:string}>(`SELECT package_version_id id FROM configuration_package_version WHERE dxt_configuration_allowed($1,scope_kind,COALESCE(scope_owner_id,''),'VIEW_CONFIGURATION')`,[principalId])).rows.map(r=>r.id);
  const readablePackages=[...new Set([...pins,...discoverable])];
  if(op==='measurement.catalog'&&!readablePackages.includes(text(input.packageId)))denied();
  if(op==='study.readiness'&&!readablePackages.includes(text(input.pin)))denied();
  if(op==='study.save'&&!readablePackages.includes(text(object(input.setup).configurationPackageVersionId)))denied();
  if(op==='study.reasoning.confirm'&&!readablePackages.includes(text(object(input.input).packageVersionId)))denied();
  if(op==='bootstrap'||op==='configuration.load'){
   return {...await readConfigurationAuthoring(sql,{principalId,packageIds:readablePackages}),permissions:await configurationPermissions(sql,principalId)};
  }
  if(configurationRequest)await requireReadableConfigurationReferences(sql,configurationRequest,await readConfigurationAuthoring(sql,{principalId,packageIds:readablePackages}));
  const requestedPin=op==='study.save'?text(object(input.setup).configurationPackageVersionId):op==='study.readiness'?text(input.pin):op==='study.reasoning.confirm'?text(object(input.input).packageVersionId):'';
  const configuration=await hydrateConfigurationPackages(sql,[...new Set([...pins,...(requestedPin?[requestedPin]:[])])]);
  // Nested repository read transactions inherit this already-established repeatable snapshot.
  // They must not change the outer command into a read-only transaction.
  const joined={query:async <R extends import('./sql-database').SqlRow>(query:string,args?:unknown[])=>query==='SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'?{rows:[] as R[],rowCount:0}:sql.query<R>(query,args)};
  const transactionDb:SqlDatabase={query:joined.query,transaction:work=>work(joined),close:async()=>{}};
  const repositories=createProductionSliceRepositories(transactionDb,configuration);
  repositories.measurement=new PostgresMeasurementRepository(transactionDb,principalId);
  const app=new DxtApplication(repositories,[],[],{},new PostgresConfigurationAuthoring(transactionDb));
  if(op==='measurement.query'){
   const query=object(input.query);
   if(typeof query.savedAnalysisId==='string'&&!(await accessibleSavedAnalysisIds(sql,principalId,query.savedAnalysisId)).length)throw new ApplicationError('NOT_FOUND','Saved Analysis or required sources are unavailable or inaccessible.');
   // Explicit source selection is strict: one inaccessible/missing ID rejects the whole request.
   for(const [key,source] of [
    ['runIds',"SELECT 1 FROM experiment_run r WHERE r.run_domain_id=x.id AND dxt_study_access_reason($2,r.study_id,'VIEW_MEASUREMENT')=ANY($3::text[])"],
    ['datasetIds',"SELECT 1 FROM measurement_dataset d JOIN experiment_run r ON r.run_id=d.run_id WHERE d.domain_id=x.id AND dxt_study_access_reason($2,r.study_id,'VIEW_MEASUREMENT')=ANY($3::text[])"]
   ] as const){
    if(Array.isArray(query[key])){
     const unavailable=await sql.query(`SELECT id FROM unnest($1::text[]) x(id) WHERE NOT EXISTS(${source}) LIMIT 1`,[query[key],principalId,allowReasons]);
     if(unavailable.rows.length)throw new ApplicationError('NOT_FOUND','Scientific source unavailable or access denied.');
    }
   }
  }
  if(['measurement.save','evaluation.save','decision.save'].includes(op))await authorizeScientificInput(sql,app,policy,principal,sid!,input);
  if(op==='run.list'){
   const rows=await sql.query<{run_domain_id:string}>(`SELECT run_domain_id FROM experiment_run JOIN dxt_discoverable_studies($1) a USING(study_id) WHERE a.reason=ANY($2::text[]) ORDER BY created_at,run_number`,[principalId,allowReasons]);
   const snapshots=[];for(const row of rows.rows)snapshots.push(await app.repositories.run.getSnapshot(row.run_domain_id));return snapshots;
  }
  // Receipts cannot be replayed as a different actor. Reauthorization always happens first.
  const receipt=(id:string)=>{const h=createHash('sha256').update(JSON.stringify([principalId,op,id])).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
  if(typeof input.commandId==='string')input.commandId=receipt(input.commandId);
  if(typeof object(input.command).commandId==='string')input.command={...object(input.command),commandId:receipt(text(object(input.command).commandId))};
  const result=await dispatch(app,input);
  if(op==='study.readiness')return {...object(result),canManageReasoningContext:(await policy.authorize(principal,'MANAGE_REASONING_CONTEXT',sid!)).effect==='ALLOW'};
  if(op==='run.planning'&&result)return {...object(result),...await policy.permissions(principal,sid!),scientificPermissions:await policy.scientificPermissions(principal,sid!)};
  return result;
 });
}
