import { ApplicationError } from '@/src/application/repository-ports';
import { configurationMutationSchema, type ConfigurationMutation, type ConfigurationAuthoringSnapshot } from '@/src/application/configuration-authoring';
import { configurationActions, type ConfigurationScopePermissions, type ConfigurationAction } from '@/src/application/configuration-permissions';
import type { ConfigurationScope } from '@/src/domain/reference';
import type { SqlSession } from './sql-database';

export async function configurationPermissions(sql:SqlSession,principalId:string):Promise<ConfigurationScopePermissions[]> {
 const rows=await sql.query<{scope_kind:ConfigurationScope['kind'];scope_owner_id:string}>('SELECT scope_kind,scope_owner_id FROM configuration_access_scope WHERE dxt_configuration_allowed($1,scope_kind,scope_owner_id,\'VIEW_CONFIGURATION\')',[principalId]);
 const result:ConfigurationScopePermissions[]=[];
 for(const row of rows.rows){
  const rights:boolean[]=[];
  for(const action of configurationActions)rights.push((await sql.query<{allowed:boolean}>('SELECT dxt_configuration_allowed($1,$2,$3,$4) allowed',[principalId,row.scope_kind,row.scope_owner_id,action])).rows[0].allowed);
  result.push({scope:row.scope_kind==='GLOBAL'?{kind:'GLOBAL'}:{kind:row.scope_kind,ownerId:row.scope_owner_id},canViewConfiguration:rights[0],canAuthorDefinition:rights[1],canManageApplicability:rights[2],canCreatePackageVersion:rights[3],canActivatePackageVersion:rights[4]});
 }
 return result;
}
export async function authorizeConfigurationMutation(sql:SqlSession,principalId:string,raw:unknown):Promise<ConfigurationMutation> {
 const parsed=configurationMutationSchema.safeParse(raw);
 if(!parsed.success)throw new ApplicationError('FORBIDDEN','Configuration operation is not available without a valid governed resource.');
 const request=parsed.data;
 let scope:ConfigurationScope|undefined;
 let action:ConfigurationAction;
 switch(request.name){
  case 'createImmutableDefinitionRevision':scope=request.input.scope;action='AUTHOR_DEFINITION';break;
  case 'createApplicabilityRuleSetVersion':scope=request.input.scope;action='MANAGE_APPLICABILITY';break;
  case 'createDraftPackage':scope=request.input.scope;action='CREATE_PACKAGE_VERSION';break;
  case 'assemblePackageVersion':{
   scope=(await sql.query<{payload:{scope:ConfigurationScope}}>('SELECT payload FROM configuration_package_draft WHERE id=$1',[request.input.draftId])).rows[0]?.payload.scope;
   action='CREATE_PACKAGE_VERSION';break;
  }
  default:{
   scope=(await sql.query<{payload:{scope:ConfigurationScope}}>('SELECT payload FROM configuration_package_version WHERE package_version_id=$1',[request.input])).rows[0]?.payload.scope;
   action='ACTIVATE_PACKAGE_VERSION';
  }
 }
 if(!scope||(await sql.query<{allowed:boolean}>('SELECT dxt_configuration_allowed($1,$2,$3,$4) allowed',[principalId,scope.kind,'ownerId' in scope?scope.ownerId:'',action])).rows[0]?.allowed!==true)
  throw new ApplicationError('FORBIDDEN','Configuration capability is unavailable for this scope.');
 return request;
}
/** A scoped author cannot use the privileged internal command snapshot to discover foreign references. */
export async function requireReadableConfigurationReferences(sql:SqlSession,request:ConfigurationMutation,snapshot:ConfigurationAuthoringSnapshot){
 const requested=new Set<string>();
 const visit=(value:unknown,key='')=>{
  if(typeof value==='string'&&/(RevisionIds?|ReferenceIds?|VersionIds?)$/.test(key))requested.add(value);
  else if(Array.isArray(value))value.forEach(v=>visit(v,key));
  else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>visit(v,k));
 };
 visit(request.input);
 const readable=new Set(Object.values(snapshot.registry).flatMap(items=>items.map(item=>'revisionId' in item?item.revisionId:item.id)));
 Object.values(snapshot.catalog).forEach(items=>items.forEach(item=>readable.add(item.id)));
 const existing=await sql.query<{revision_id:string}>('SELECT DISTINCT revision_id FROM configuration_revision WHERE revision_id=ANY($1::text[])',[[...requested]]);
 if(existing.rows.some(r=>!readable.has(r.revision_id)))throw new ApplicationError('FORBIDDEN','A configuration reference is outside the readable scope.');
}
