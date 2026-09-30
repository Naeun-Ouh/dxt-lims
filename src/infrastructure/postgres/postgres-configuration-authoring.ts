import { createHash, randomUUID } from 'node:crypto';
import { ConfigurationManagementCommands, referenceCatalogSchema, type ConfigurationRegistry, type ReferenceCatalog } from '@/src/domain/reference';
import { ApplicationError } from '@/src/application/repository-ports';
import { configurationMutationSchema,applyConfigurationMutation,configurationCandidate,configurationEditorKeys,type ConfigurationAuthoringBoundary,type ConfigurationAuthoringSnapshot,type ConfigurationMutation } from '@/src/application/configuration-authoring';
import type { SqlDatabase,SqlSession } from './sql-database';
import { seedConfigurationRegistry } from './slice-seed';
import { provisionMeasurementReferences } from './measurement-references';
const canonical=(x:unknown):unknown=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):x;
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
export async function provisionConfigurationCatalog(sql:SqlSession,catalog:ReferenceCatalog){
  for(const [kind,items] of Object.entries(referenceCatalogSchema.parse(catalog)))for(const item of items){
    const existing=(await sql.query<{same:boolean}>('SELECT payload=$3::jsonb AS same FROM configuration_revision WHERE revision_kind=$1 AND revision_id=$2',[`catalog:${kind}`,item.id,JSON.stringify(item)])).rows[0];
    if(existing&&!existing.same)throw new ApplicationError('CONFLICT','Exact catalog revision already differs.');
    if(!existing)await sql.query('INSERT INTO configuration_revision VALUES($1,$2,$3::jsonb)',[item.id,`catalog:${kind}`,JSON.stringify(item)]);
  }
}
export async function readConfigurationAuthoring(sql:SqlSession, access?:{principalId:string;packageIds:string[]}):Promise<ConfigurationAuthoringSnapshot>{
  const args=access?[access.principalId,access.packageIds]:[];
  const scoped=(payload:string)=>`dxt_configuration_allowed($1,${payload}->'scope'->>'kind',COALESCE(${payload}->'scope'->>'ownerId',''),'VIEW_CONFIGURATION')`;
  const rows=await sql.query<{revision_kind:string;payload:unknown}>(`SELECT revision_kind,payload FROM configuration_revision r ${access?`WHERE ${scoped('r.payload')}
    OR EXISTS(SELECT 1 FROM configuration_definition_authorship a WHERE a.revision_id=r.revision_id AND ${scoped('a.payload')})
    OR EXISTS(SELECT 1 FROM configuration_package_member m WHERE m.package_version_id=ANY($2::text[]) AND m.member_revision_id=r.revision_id AND m.member_kind=r.revision_kind)
    OR EXISTS(SELECT 1 FROM measurement_reference m WHERE m.package_version_id=ANY($2::text[]) AND m.revision_id=r.revision_id AND 'catalog:'||m.kind=r.revision_kind)
    OR (r.revision_kind LIKE 'catalog:%' AND EXISTS(SELECT 1 FROM configuration_package_member m WHERE m.package_version_id=ANY($2::text[]) AND m.member_revision_id=r.revision_id))`:''}
    ORDER BY revision_kind,revision_id`,args);
  const registry:ConfigurationRegistry={packages:[],subjectTypes:[],grains:[],departmentAreaProfiles:[],experimentTypeProfiles:[],equipmentCapabilityProfiles:[],applicabilityRuleSets:[],validationProfiles:[],projectionProfiles:[],definitionDescriptors:[],externalReferences:[]};
  const catalog:Record<string,unknown[]>=Object.fromEntries(Object.keys(referenceCatalogSchema.shape).map(k=>[k,[]]));
  for(const row of rows.rows){if(row.revision_kind.startsWith('catalog:'))catalog[row.revision_kind.slice(8)]?.push(row.payload);else if(row.revision_kind in registry)(registry[row.revision_kind as keyof ConfigurationRegistry] as unknown[]).push(row.payload);}
  if(access){
    const historical=await sql.query<{kind:string;payload:{id:string}}>('SELECT kind,payload FROM measurement_reference WHERE package_version_id=ANY($1::text[]) ORDER BY kind,revision_id',[access.packageIds]);
    for(const row of historical.rows){const collection=catalog[row.kind] as {id:string}[]|undefined;if(collection&&!collection.some(v=>v.id===row.payload.id))collection.push(row.payload);}
  }
  if(!access&&!Object.values(catalog).some(items=>items.length))throw new ApplicationError('NOT_FOUND','Configuration authoring catalog must be explicitly provisioned.');
  const packages=await sql.query<{payload:ConfigurationRegistry['packages'][number];status:ConfigurationRegistry['packages'][number]['status']}>(`SELECT payload,status FROM configuration_package_version ${access?'WHERE package_version_id=ANY($2::text[]) AND $1::text IS NOT NULL':''} ORDER BY package_id,version`,args);
  registry.packages=packages.rows.map(r=>({...r.payload,status:r.status}));
  const states=await sql.query<{revision_id:string;status:'DRAFT'|'ACTIVE'|'INACTIVE'}>('SELECT * FROM configuration_rule_state');
  registry.applicabilityRuleSets=registry.applicabilityRuleSets.map(r=>({...r,status:states.rows.find(s=>s.revision_id===r.id)?.status??r.status}));
  const drafts=await sql.query<{payload:ConfigurationAuthoringSnapshot['drafts'][number]}>(`SELECT payload FROM configuration_package_draft ${access?`WHERE ${scoped('payload')} AND $2::text[] IS NOT NULL`:''} ORDER BY id`,args);
  const authored=await sql.query<{payload:ConfigurationAuthoringSnapshot['authoredDefinitions'][number]}>(`SELECT payload FROM configuration_definition_authorship ${access?`WHERE ${scoped('payload')} AND $2::text[] IS NOT NULL`:''} ORDER BY revision_id`,args);
  const version=await sql.query<{version:string}>('SELECT version FROM configuration_authoring_state WHERE singleton=true');
  const usage=await sql.query<{id:string;count:string}>(`SELECT configuration_package_version_id AS id,count(*) AS count FROM experiment_run ${access?`WHERE configuration_package_version_id=ANY($2::text[]) AND dxt_study_access_reason($1,study_id,'VIEW_RUN') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN')`:''} GROUP BY configuration_package_version_id`,args);
  return {runUsage:Object.fromEntries(usage.rows.map(r=>[r.id,Number(r.count)])),registry,catalog:referenceCatalogSchema.parse(catalog),drafts:drafts.rows.map(r=>r.payload),authoredDefinitions:authored.rows.map(r=>r.payload),version:Number(version.rows[0].version)};
}
export class PostgresConfigurationAuthoring implements ConfigurationAuthoringBoundary {
  constructor(private readonly db:SqlDatabase){}
  load(){return this.db.transaction(async sql=>{await sql.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');return readConfigurationAuthoring(sql);});}
  async execute(request:ConfigurationMutation,commandId:string){
    request=configurationMutationSchema.parse(request);
    try{return await this.db.transaction(async sql=>{
      await sql.query('SELECT version FROM configuration_authoring_state WHERE singleton=true FOR UPDATE');
      const receipt=(await sql.query<{request_hash:string;result:unknown}>('SELECT request_hash,result FROM configuration_authoring_receipt WHERE command_id=$1',[commandId])).rows[0];
      const requestHash=hash(request);
      if(receipt){if(receipt.request_hash!==requestHash)throw new ApplicationError('CONFLICT','Configuration command identity was reused.');return receipt.result;}
      const before=await readConfigurationAuthoring(sql),candidate=configurationCandidate(before);
      const result=applyConfigurationMutation(new ConfigurationManagementCommands(candidate,before.catalog,configurationEditorKeys),request);
      const after=candidate.getConfigurationRegistry();
      if(request.name==='createDraftPackage')await sql.query('INSERT INTO configuration_package_draft VALUES($1,$2::jsonb)',[request.input.id,JSON.stringify(result)]);
      if(request.name==='createImmutableDefinitionRevision'){const revision=candidate.getDefinitionRevision(request.input.descriptor.revisionId)!;await sql.query('INSERT INTO configuration_definition_authorship VALUES($1,$2,$3,$4,$5::jsonb)',[revision.descriptor.revisionId,revision.definitionId,revision.version,JSON.stringify(revision.scope),JSON.stringify(revision)]);}
      for(const [kind,items] of Object.entries(after))if(kind!=='packages')for(const value of items){const v=value as {id?:string;revisionId?:string};const id=v.id??v.revisionId!;const old=(before.registry[kind as keyof ConfigurationRegistry] as unknown[]).find(x=>{const r=x as typeof v;return (r.id??r.revisionId)===id;});if(!old)await sql.query('INSERT INTO configuration_revision VALUES($1,$2,$3::jsonb)',[id,kind,JSON.stringify(value)]);}
      // The existing manifest writer inserts new DRAFT manifests and their exact transitive members only.
      await seedConfigurationRegistry(sql,{...after,packages:after.packages.filter(p=>!before.registry.packages.some(old=>old.id===p.id))});
      for(const rule of after.applicabilityRuleSets)await sql.query('INSERT INTO configuration_rule_state VALUES($1,$2) ON CONFLICT(revision_id) DO UPDATE SET status=EXCLUDED.status',[rule.id,rule.status]);
      if(request.name==='activatePackageVersion' || request.name==='deactivatePackageVersion'){
        const target=after.packages.find(p=>p.id===request.input)!;
        const owner='ownerId' in target.scope?target.scope.ownerId:'';
        // Same lineage lock as the existing native activation boundary.
        await sql.query('SELECT package_id FROM configuration_package WHERE package_id=$1 FOR UPDATE',[target.packageId]);
        await sql.query('UPDATE configuration_activation SET active_to=clock_timestamp(),aggregate_version=aggregate_version+1 WHERE scope_type=$1 AND scope_id=$2 AND package_id=$3 AND active_to IS NULL AND ($4::text IS NULL OR package_version_id=$4)',[target.scope.kind,owner,target.packageId,request.name==='deactivatePackageVersion'?target.id:null]);
        if(request.name==='activatePackageVersion')await sql.query('INSERT INTO configuration_activation(activation_id,scope_type,scope_id,package_id,package_version_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),target.scope.kind,owner,target.packageId,target.id]);
        for(const pkg of after.packages)if(before.registry.packages.find(p=>p.id===pkg.id)?.status!==pkg.status)await sql.query('UPDATE configuration_package_version SET status=$2 WHERE package_version_id=$1',[pkg.id,pkg.status]);
      }
      await provisionMeasurementReferences(sql,before.catalog);
      await sql.query('UPDATE configuration_authoring_state SET version=version+1 WHERE singleton=true');
      await sql.query('INSERT INTO configuration_authoring_receipt VALUES($1,$2,$3::jsonb)',[commandId,requestHash,JSON.stringify(result)]);
      return result;
    });}catch(error){if(error instanceof ApplicationError)throw error;throw new ApplicationError('VALIDATION',error instanceof Error?error.message:'Configuration command failed.');}
  }
}
