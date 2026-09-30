// Trusted administrator CLI only. No HTTP provisioning endpoint or inferred ownership.
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {z} from 'zod';
const id=z.string().min(1);
const manifestSchema=z.object({
 configurationScopes:z.array(z.object({kind:z.enum(['GLOBAL','AREA','TEAM','USER']),ownerId:z.string(),unitId:id.nullable(),principalId:id.nullable()})).default([]),
 configurationGrants:z.array(z.object({id,kind:z.enum(['GLOBAL','AREA','TEAM','USER']),ownerId:z.string(),principalId:id.nullable(),unitId:id.nullable(),action:z.enum(['VIEW_CONFIGURATION','AUTHOR_DEFINITION','MANAGE_APPLICABILITY','CREATE_PACKAGE_VERSION','ACTIVATE_PACKAGE_VERSION']),grantedBy:id,active:z.boolean(),expiresAt:z.iso.datetime().nullable()})).default([]),
 savedAnalysisGrants:z.array(z.object({id,savedAnalysisId:id,principalId:id.nullable(),unitId:id.nullable(),action:z.enum(['VIEW_SAVED_ANALYSIS','EDIT_SAVED_ANALYSIS','SHARE_SAVED_ANALYSIS','MANAGE_SAVED_ANALYSIS_ACCESS']),grantedBy:id,active:z.boolean(),expiresAt:z.iso.datetime().nullable()})).default([]),
 analysisOwners:z.array(z.object({savedAnalysisId:id,principalId:id})).default([]),
 principals:z.array(z.object({id,userId:id,role:z.enum(['GENERAL_USER','ADMIN']),active:z.boolean().default(true)})),
 units:z.array(z.object({id,kind:z.enum(['DEPARTMENT','PART','TEAM','AREA','MODULE']),parentId:id.nullable()})),
 memberships:z.array(z.object({principalId:id,unitId:id,managed:z.boolean()})),
 studies:z.array(z.object({slug:id,responsiblePrincipalId:id,departmentId:id,areaId:id.nullable(),visibility:z.enum(['PRIVATE','RESPONSIBLE_DEPARTMENT','AREA']),moduleIds:z.array(id).default([])})),
 grants:z.array(z.object({id,studySlug:id,principalId:id.nullable(),unitId:id.nullable(),action:z.enum(['VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS','VIEW_EXECUTION','RECORD_ACTUAL','VIEW_MEASUREMENT','RECORD_MEASUREMENT','MANAGE_MEASUREMENT_VALIDITY','VIEW_EVALUATION','AUTHOR_EVALUATION','VIEW_DECISION','AUTHOR_DECISION','AUTHOR_NEXT_ACTION','MANAGE_REASONING_CONTEXT']),grantedBy:id,active:z.boolean(),expiresAt:z.iso.datetime().nullable()})).default([]),
});
if(!process.env.DATABASE_URL||!process.argv[2])throw new Error('Usage: DATABASE_URL=... node scripts/provision-authorization-pilot.mjs manifest.json');
const data=manifestSchema.parse(JSON.parse(await readFile(process.argv[2],'utf8')));
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
const db=await pool.connect();
try{
 await db.query('BEGIN');
 for(const p of data.principals){const old=(await db.query('SELECT user_id FROM auth_principal WHERE id=$1',[p.id])).rows[0];if(old&&old.user_id!==p.userId)throw new Error('Existing Principal user identity is immutable; use an explicit identity migration.');}
 for(const p of data.principals)await db.query('INSERT INTO auth_principal VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET active=excluded.active,role=excluded.role',[p.id,p.userId,p.active,p.role]);
 for(const u of data.units)await db.query('INSERT INTO auth_org_unit VALUES($1,$2,NULL) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind',[u.id,u.kind]);
 for(const u of data.units)await db.query('UPDATE auth_org_unit SET parent_id=$2 WHERE id=$1',[u.id,u.parentId]);
 // For named principals, the manifest is the complete current membership set.
 for(const p of data.principals)await db.query('DELETE FROM auth_membership WHERE principal_id=$1',[p.id]);
 for(const m of data.memberships)await db.query('INSERT INTO auth_membership VALUES($1,$2,$3)',[m.principalId,m.unitId,m.managed]);
 for(const s of data.studies){
  const kinds=await db.query('SELECT id,kind FROM auth_org_unit WHERE id=ANY($1::text[])',[[s.departmentId,s.areaId,...s.moduleIds].filter(Boolean)]);
  const kind=id=>kinds.rows.find(x=>x.id===id)?.kind;
  if(kind(s.departmentId)!=='DEPARTMENT'||(s.areaId&&kind(s.areaId)!=='AREA')||s.moduleIds.some(id=>kind(id)!=='MODULE'))throw new Error('Study policy organization kinds do not match.');
  const row=(await db.query('SELECT study_id FROM study WHERE series_slug=$1',[s.slug])).rows[0];
  if(!row)throw new Error('Study must already exist before access provisioning.');
  await db.query('INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id,area_id,visibility) VALUES($1,$2,$3,$4,$5) ON CONFLICT(study_id) DO UPDATE SET responsible_user_id=excluded.responsible_user_id,responsible_department_id=excluded.responsible_department_id,area_id=excluded.area_id,visibility=excluded.visibility,version=study_access.version+1',[row.study_id,s.responsiblePrincipalId,s.departmentId,s.areaId,s.visibility]);
  await db.query('DELETE FROM study_module_access WHERE study_id=$1',[row.study_id]);
  for(const moduleId of s.moduleIds)await db.query('INSERT INTO study_module_access VALUES($1,$2)',[row.study_id,moduleId]);
 }
 const requireGovernanceAdministrator=async id=>{if(!(await db.query("SELECT 1 FROM auth_principal WHERE id=$1 AND active AND role='ADMIN'",[id])).rows.length)throw new Error('Governance grants require an explicit active administrator sponsor through trusted provisioning.');};
 for(const scope of data.configurationScopes){
  if(['AREA','TEAM'].includes(scope.kind)&&!(await db.query('SELECT 1 FROM auth_org_unit WHERE id=$1 AND kind=$2',[scope.unitId,scope.kind])).rows.length)throw new Error('Configuration scope organization kind does not match.');
  await db.query('INSERT INTO configuration_access_scope VALUES($1,$2,$3,$4) ON CONFLICT(scope_kind,scope_owner_id) DO UPDATE SET unit_id=excluded.unit_id,principal_id=excluded.principal_id',[scope.kind,scope.ownerId,scope.unitId,scope.principalId]);
 }
 for(const g of data.configurationGrants){
  await requireGovernanceAdministrator(g.grantedBy);
  await db.query('INSERT INTO configuration_access_grant VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET scope_kind=excluded.scope_kind,scope_owner_id=excluded.scope_owner_id,principal_id=excluded.principal_id,unit_id=excluded.unit_id,action=excluded.action,granted_by=excluded.granted_by,active=excluded.active,expires_at=excluded.expires_at',[g.id,g.kind,g.ownerId,g.principalId,g.unitId,g.action,g.grantedBy,g.active,g.expiresAt]);
 }
 for(const g of data.grants){
  if(g.action==='MANAGE_REASONING_CONTEXT')await requireGovernanceAdministrator(g.grantedBy);
  const study=(await db.query('SELECT study_id FROM study WHERE series_slug=$1',[g.studySlug])).rows[0];
  if(!study)throw new Error('Grant Study is unavailable.');
  await db.query('INSERT INTO study_access_grant VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET study_id=excluded.study_id,principal_id=excluded.principal_id,unit_id=excluded.unit_id,action=excluded.action,granted_by=excluded.granted_by,active=excluded.active,expires_at=excluded.expires_at',[g.id,study.study_id,g.principalId,g.unitId,g.action,g.grantedBy,g.active,g.expiresAt]);
 }
 for(const g of data.savedAnalysisGrants){
  await requireGovernanceAdministrator(g.grantedBy);
  const saved=(await db.query('SELECT id FROM saved_analysis WHERE domain_id=$1 FOR UPDATE',[g.savedAnalysisId])).rows[0];
  if(!saved)throw new Error('Saved Analysis must exist before trusted grants.');
  if(g.unitId&&!(await db.query("SELECT 1 FROM auth_org_unit WHERE id=$1 AND kind IN ('DEPARTMENT','AREA')",[g.unitId])).rows.length)throw new Error('Saved Analysis audience unit must be a Department or Area.');
  await db.query('INSERT INTO saved_analysis_access_grant VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET saved_analysis_id=excluded.saved_analysis_id,principal_id=excluded.principal_id,unit_id=excluded.unit_id,action=excluded.action,granted_by=excluded.granted_by,active=excluded.active,expires_at=excluded.expires_at',[g.id,saved.id,g.principalId,g.unitId,g.action,g.grantedBy,g.active,g.expiresAt]);
  await db.query('UPDATE saved_analysis SET version=version+1 WHERE id=$1',[saved.id]);
 }
 for(const mapping of data.analysisOwners){
  const saved=(await db.query('SELECT id FROM saved_analysis WHERE domain_id=$1 FOR UPDATE',[mapping.savedAnalysisId])).rows[0];
  if(!saved)throw new Error('Saved Analysis must exist before trusted ownership mapping.');
  await db.query('INSERT INTO saved_analysis_access VALUES($1,$2) ON CONFLICT(saved_analysis_id) DO UPDATE SET owner_principal_id=excluded.owner_principal_id',[saved.id,mapping.principalId]);
  await db.query('UPDATE saved_analysis SET version=version+1 WHERE id=$1',[saved.id]);
 }
 await db.query('COMMIT');
 process.stdout.write('Explicit pilot authorization context provisioned. Scientific history unchanged.\n');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
