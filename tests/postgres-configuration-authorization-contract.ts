import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import { handleRepositoryRequest, dispatchRepository } from '@/app/api/repository/route';
import { PostgresConfigurationAuthoring, provisionConfigurationCatalog } from '@/src/infrastructure/postgres/postgres-configuration-authoring';
import type { ConfigurationAuthoringSnapshot, ConfigurationMutation } from '@/src/application/configuration-authoring';
import { configurationActions } from '@/src/application/configuration-permissions';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import type { StudyReadiness } from '@/src/application/study-readiness';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { selectStudyReferenceSet } from '@/src/features/experiment-series/study-setup-model';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { packageAssembly } from '@/src/features/reference-studio/authoring-model';
import { definitions } from '@/src/mock/reference';

export async function configurationAuthorizationContract(db:SqlDatabase){
 await provisionConfigurationCatalog(db,definitions);
 const boundary=new PostgresConfigurationAuthoring(db);
 const call=(p:string,input:Record<string,unknown>)=>authorizedOperation(db,`gov-${p}`,input,dispatchRepository);
 const api=async(p:string,input:Record<string,unknown>)=>handleRepositoryRequest(new Request('http://localhost/api/repository',{method:'POST',headers:{'content-type':'application/json','x-principal-id':'gov-admin','x-role':'ADMIN'},body:JSON.stringify(input)}),(i,d)=>authorizedOperation(db,`gov-${p}`,i,d??dispatchRepository));
 const command=(request:ConfigurationMutation)=>({operation:'configuration.execute',request,commandId:randomUUID()});
 const principals=['owner','viewer','leader','admin','author','rules','packages','activation','readiness','outsider'];
 for(const p of principals)await db.query('INSERT INTO auth_principal VALUES($1,$2,true,$3)',[`gov-${p}`,`gov-user-${p}`,p==='admin'?'ADMIN':'GENERAL_USER']);
 await db.query("INSERT INTO auth_org_unit VALUES('gov-part','PART',NULL),('gov-dept','DEPARTMENT','gov-part'),('gov-team','TEAM','gov-part')");
 for(const p of principals.filter(p=>p!=='outsider'))await db.query('INSERT INTO auth_membership VALUES($1,$2,$3)',[`gov-${p}`,p==='leader'?'gov-part':'gov-dept',p==='leader']);
 const roots=(await db.query<{study_id:string;series_slug:string}>('SELECT study_id,series_slug FROM study')).rows;
 for(const root of roots)await db.query("INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id,visibility) VALUES($1,'gov-owner','gov-dept','RESPONSIBLE_DEPARTMENT') ON CONFLICT(study_id) DO UPDATE SET responsible_user_id='gov-owner',responsible_department_id='gov-dept',visibility='RESPONSIBLE_DEPARTMENT'",[root.study_id]);
 await db.query("INSERT INTO configuration_access_scope VALUES('GLOBAL','',NULL,NULL) ON CONFLICT DO NOTHING");
 const grant=async(p:string,action:string,kind:string,owner:string,unit:string|null=null)=>db.query('INSERT INTO configuration_access_grant VALUES($1,$2,$3,$4,$5,$6,$7,true,NULL)',[randomUUID(),kind,owner,unit?null:`gov-${p}`,unit,action,'gov-admin']);
 const governanceState=async()=>({configuration:await boundary.load(),reasoning:await db.query('SELECT * FROM reasoning_context ORDER BY id'),adoptions:await db.query('SELECT * FROM study_reasoning_adoption ORDER BY study_id,command_id'),receipts:await db.query('SELECT * FROM configuration_authoring_receipt ORDER BY command_id'),activations:await db.query('SELECT * FROM configuration_activation ORDER BY activation_id')});
 const pairs=[['dts-improvement','config-package-photo-v1'],['adhesion-material-optimization','config-package-material-rd-v1']] as const;
 for(const [slug] of pairs){
  const setup=await call('owner',{operation:'study.load',slug}) as StudySetupSnapshot;
  const pin=setup.configurationPackageVersionId;
  const initial=await boundary.load(),source=initial.registry.packages.find(p=>p.id===pin)!;
  const scope=source.scope,owner='ownerId' in scope?scope.ownerId:'';
  assert.ok(scope.kind==='AREA'||scope.kind==='TEAM');
  const unit=`gov-${slug}`;
  await db.query('INSERT INTO auth_org_unit VALUES($1,$2,$3)',[unit,scope.kind,'gov-part']);
  await db.query('INSERT INTO configuration_access_scope VALUES($1,$2,$3,NULL) ON CONFLICT(scope_kind,scope_owner_id) DO UPDATE SET unit_id=excluded.unit_id',[scope.kind,owner,unit]);
  const sid=roots.find(r=>r.series_slug===slug)!.study_id;
  const old=await call('owner',{operation:'run.create',slug,commandId:randomUUID()}) as RunPlanningSnapshot;
  const sourceSet=initial.registry.applicabilityRuleSets.find(s=>source.applicabilityRuleSetVersionIds.includes(s.id))!;
  const revisionId=`gov-definition-${slug}-v1`;
  const definition:ConfigurationMutation={name:'createImmutableDefinitionRevision',input:{definitionId:`gov-definition-${slug}`,version:1,scope,descriptor:{revisionId,label:'Governed characteristic',editorKey:'NUMBER',unit:'',unitDefinitionRevisionId:null,intrinsicAllowedGrainRevisionIds:['grain-subject-r1'],intrinsicOptions:[]}}};
  const rule:ConfigurationMutation={name:'createApplicabilityRuleSetVersion',input:{...sourceSet,id:`gov-rules-${slug}`,code:`gov-rules-${slug}`,version:1,status:'DRAFT'}};
  const version=Math.max(...initial.registry.packages.filter(p=>p.packageId===source.packageId).map(p=>p.version))+1;
  const draft:ConfigurationMutation={name:'createDraftPackage',input:{id:`gov-draft-${slug}`,packageId:source.packageId,targetVersion:version,scope}};
  const newPin=`gov-package-${slug}-${version}`;
  const assembly:ConfigurationMutation={name:'assemblePackageVersion',input:{draftId:draft.input.id,packageVersionId:newPin,assembly:{...packageAssembly(source),definitionRevisionIds:[...source.definitionRevisionIds,revisionId],applicabilityRuleSetVersionIds:[rule.input.id]}}};
  const activation:ConfigurationMutation={name:'activatePackageVersion',input:newPin};
  const readiness=await call('owner',{operation:'study.readiness',slug,pin}) as StudyReadiness;
  const proposal=readiness.proposals.find(p=>p.packageVersionId===pin)!;
  const reasoning={operation:'study.reasoning.confirm',slug,input:{packageVersionId:pin,sourceContextId:proposal.id,targetBindings:proposal.context.targetBindings,confirmed:true},command:{commandId:randomUUID()}};
  const before=await governanceState();
  const deniedCommands:ConfigurationMutation[]=[definition,rule,draft,{name:'activatePackageVersion',input:pin}];
  for(const p of ['owner','viewer','leader','admin','outsider']){
   for(let i=0;i<deniedCommands.length;i++){const mutation:ConfigurationMutation=deniedCommands[i];assert.equal((await api(p,command(mutation))).status,403,`${p}: ${mutation.name}`);}
   assert.equal((await api(p,reasoning)).status,p==='outsider'?404:403);
  }
  assert.deepEqual(await governanceState(),before,'direct denied commands make zero PostgreSQL changes');
  for(const [p,action] of [['author','AUTHOR_DEFINITION'],['rules','MANAGE_APPLICABILITY'],['packages','CREATE_PACKAGE_VERSION'],['activation','ACTIVATE_PACKAGE_VERSION']] as const)await grant(p,action,scope.kind,owner);
  // Every capability independent: own right only, no technical-admin shortcut.
  for(const [p,own] of [['author','AUTHOR_DEFINITION'],['rules','MANAGE_APPLICABILITY'],['packages','CREATE_PACKAGE_VERSION'],['activation','ACTIVATE_PACKAGE_VERSION']] as const){
   for(const action of configurationActions){const result:boolean=(await db.query<{allowed:boolean}>('SELECT dxt_configuration_allowed($1,$2,$3,$4) allowed',[`gov-${p}`,scope.kind,owner,action])).rows[0].allowed;assert.equal(result,action===own||action==='VIEW_CONFIGURATION');}
  }
  const other=initial.registry.packages.find(p=>p.scope.kind===scope.kind&&'ownerId' in p.scope&&p.scope.ownerId!==owner)!;
  assert.ok(other,'fixture contains another independent governance scope');
  assert.equal((await api('author',command({...definition,input:{...definition.input,scope:other.scope}}))).status,403,'forged cross-scope author command');
  assert.equal((await api('activation',command({name:'activatePackageVersion',input:other.id}))).status,403,'activation scope comes from persisted target');
  const authorSnapshot=await call('author',{operation:'configuration.load'}) as ConfigurationAuthoringSnapshot;
  assert.equal(authorSnapshot.permissions?.find(p=>p.scope.kind===scope.kind&&'ownerId' in p.scope&&p.scope.ownerId===owner)?.canAuthorDefinition,true);
  assert.ok(authorSnapshot.registry.packages.some(p=>p.id===pin));
  const leaderSnapshot=await call('leader',{operation:'configuration.load'}) as ConfigurationAuthoringSnapshot;
  assert.ok(leaderSnapshot.permissions?.some(p=>p.canViewConfiguration));
  assert.equal(leaderSnapshot.permissions?.some(p=>p.canActivatePackageVersion||p.canAuthorDefinition),false);
  assert.equal((await api('author',command(draft))).status,403);
  assert.equal((await api('packages',command(definition))).status,403);
  assert.equal((await api('activation',reasoning)).status,403);
  const create={...command(definition),request:{...definition,input:{...definition.input,createdBy:'forged-author',authoredBy:'forged-author'}}};assert.equal((await api('author',create)).status,200);assert.equal((await api('author',create)).status,200,'same-principal receipt retry');
  const immutableBefore=await governanceState();
  assert.notEqual((await api('author',command({...definition,input:{...definition.input,descriptor:{...definition.input.descriptor,label:'overwrite'}}}))).status,200);
  assert.deepEqual(await governanceState(),immutableBefore);
  assert.equal((await api('rules',command(rule))).status,200);
  assert.equal((await api('packages',command(draft))).status,200);
  assert.equal((await api('author',command(assembly))).status,403);
  assert.equal((await api('packages',command(assembly))).status,200);
  assert.equal((await api('packages',command(activation))).status,403);
  const activated=await api('activation',command(activation));assert.equal(activated.status,200,await activated.clone().text());
  assert.equal(Number((await db.query<{count:string}>("SELECT count(*) count FROM configuration_activation WHERE scope_type=$1 AND scope_id=$2 AND package_id=$3 AND active_to IS NULL",[scope.kind,owner,source.packageId])).rows[0].count),1);
  const released=await governanceState();
  assert.notEqual((await api('author',command({...definition,input:{...definition.input,descriptor:{...definition.input.descriptor,label:'released overwrite'}}}))).status,200);
  assert.deepEqual(await governanceState(),released,'released immutable revision cannot be rewritten by an authorized author');
  assert.equal(JSON.stringify(released.configuration.authoredDefinitions).includes('forged-author'),false,'no client-attributed author fields invented');
  // SQL invariant is still enforced even for trusted SQL: second active lineage is rejected.
  await assert.rejects(db.query('INSERT INTO configuration_activation(activation_id,scope_type,scope_id,package_id,package_version_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),scope.kind,owner,source.packageId,pin]));
  // Authorized invalid package activation is a domain rejection, with atomic rollback.
  const invalidDraft={...draft.input,id:`${draft.input.id}-invalid`,targetVersion:version+1};
  assert.equal((await api('packages',command({name:'createDraftPackage',input:invalidDraft}))).status,200);
  const invalidPin=`${newPin}-invalid`;
  assert.equal((await api('packages',command({name:'assemblePackageVersion',input:{draftId:invalidDraft.id,packageVersionId:invalidPin,assembly:{...assembly.input.assembly,definitionRevisionIds:[]}}}))).status,200);
  const beforeInvalid=await governanceState();
  const invalidActivation=await api('activation',command({name:'activatePackageVersion',input:invalidPin}));
  assert.equal(invalidActivation.status,409);assert.equal((await invalidActivation.json() as {code:string}).code,'VALIDATION');
  assert.deepEqual(await governanceState(),beforeInvalid);
  assert.equal((await api('packages',command({name:'deactivatePackageVersion',input:invalidPin}))).status,403);
  assert.equal((await api('activation',command({name:'deactivatePackageVersion',input:invalidPin}))).status,200);
  // Give consumption visibility without activation/readiness, then adopt through normal Study edit.
  await grant('owner','VIEW_CONFIGURATION',scope.kind,owner);
  const selected=selectStudyReferenceSet(setup,newPin,await hydrateConfigurationPackages(db,[newPin]));
  const adopted=await api('owner',{operation:'study.save',setup:selected,command:{commandId:randomUUID(),expectedVersion:setup.revision}});assert.equal(adopted.status,200,await adopted.clone().text());
  const notReady=await call('owner',{operation:'study.readiness',slug,pin:newPin}) as StudyReadiness;assert.equal(notReady.status,'NOT_READY');assert.equal(notReady.canManageReasoningContext,false);
  await db.query('INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$5)',[randomUUID(),sid,'gov-readiness','MANAGE_REASONING_CONTEXT','gov-admin']);
  const confirmation={...reasoning,input:{...reasoning.input,packageVersionId:newPin},command:{commandId:randomUUID()}};
  assert.equal((await api('activation',confirmation)).status,403);
  assert.equal((await api('readiness',command(activation))).status,403);
  const invalid=await api('readiness',{...confirmation,input:{...confirmation.input,targetBindings:confirmation.input.targetBindings.map(b=>({...b,target:{...b.target,parameterDefinitionId:'missing-exact'}}))}});assert.equal(invalid.status,409,'authorized reasoning still subject to scientific validation');
  assert.equal((await invalid.json() as {code:string}).code,'VALIDATION');
  assert.equal((await api('readiness',confirmation)).status,200);
  assert.equal((await call('owner',{operation:'study.readiness',slug,pin:newPin}) as StudyReadiness).status,'READY');
  const next=await call('owner',{operation:'run.create',slug,commandId:randomUUID()}) as RunPlanningSnapshot;assert.equal(next.configurationPackageVersionId,newPin);assert.equal(next.subjects[0].type,old.subjects[0].type);
  // New immutable revision and governance revocation do not rewrite historical exact pins.
  assert.equal((await api('author',command({...definition,input:{...definition.input,version:2,descriptor:{...definition.input.descriptor,revisionId:`${revisionId}-2`,label:'Next revision'}}}))).status,200);
  assert.equal((await boundary.load()).authoredDefinitions.find(d=>d.descriptor.revisionId===revisionId)?.descriptor.label,'Governed characteristic');
  await db.query('UPDATE configuration_access_grant SET active=false WHERE scope_kind=$1 AND scope_owner_id=$2',[scope.kind,owner]);
  assert.equal((await api('author',create)).status,403,'revocation checked before receipt replay');
  const historical=await call('viewer',{operation:'configuration.load'}) as ConfigurationAuthoringSnapshot;assert.ok(historical.registry.packages.some(p=>p.id===old.configurationPackageVersionId));assert.ok(historical.registry.definitionDescriptors.some(d=>d.revisionId===revisionId));
  assert.deepEqual(await call('viewer',{operation:'run.get',runId:old.id}),old);
  assert.equal((await api('viewer',command(activation))).status,403);
  // Current unit membership controls delegated scope; transfer removes rights immediately.
  await grant('author','AUTHOR_DEFINITION',scope.kind,owner,'gov-team');
  await db.query("INSERT INTO auth_membership VALUES('gov-author','gov-team',false)");
  const allowed=async()=> (await db.query<{allowed:boolean}>("SELECT dxt_configuration_allowed('gov-author',$1,$2,'AUTHOR_DEFINITION') allowed",[scope.kind,owner])).rows[0].allowed;
  assert.equal(await allowed(),true);await db.query("DELETE FROM auth_membership WHERE principal_id='gov-author' AND unit_id='gov-team'");assert.equal(await allowed(),false);
 }
 // Unknown/mismatched mapped scope fails closed; global never means wildcard mutation.
 assert.equal((await db.query<{allowed:boolean}>("SELECT dxt_configuration_allowed('gov-admin','AREA','unregistered','ACTIVATE_PACKAGE_VERSION') allowed")).rows[0].allowed,false);
 const outsider=await call('outsider',{operation:'configuration.load'}) as ConfigurationAuthoringSnapshot;
 assert.equal(outsider.registry.packages.length,0,'global reference visibility is not enterprise package discovery');
 assert.equal(outsider.drafts.length,0);
 assert.ok(!JSON.stringify(outsider).includes('gov-definition-'),'no unassembled private definition leakage');
 await db.query("INSERT INTO configuration_access_scope VALUES('AREA','gov-invalid-map','gov-team',NULL)");
 await grant('author','AUTHOR_DEFINITION','AREA','gov-invalid-map');
 assert.equal((await db.query<{allowed:boolean}>("SELECT dxt_configuration_allowed('gov-author','AREA','gov-invalid-map','AUTHOR_DEFINITION') allowed")).rows[0].allowed,false,'mismatched organization mapping fails closed');
 await assert.rejects(call('missing',{operation:'configuration.load'}));
 return {scenarioCount:pairs.length};
}
