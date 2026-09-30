import { createHash } from 'node:crypto';
import { savedAnalysisViewSchema, type SavedAnalysisView } from '@/src/domain/analysis';
import { ApplicationError } from '@/src/application/repository-ports';
import type { Principal } from '@/src/application/authorization';
import { savedAnalysisSharingSchema, type SavedAnalysisAccess, type SavedAnalysisSharing, type SavedAnalysisAction } from '@/src/application/saved-analysis-access';
import type { SqlSession, SqlDatabase } from './sql-database';
import { accessibleSavedAnalysisIds } from './saved-analysis-authorization';
import { PostgresSavedAnalysisRepository } from './postgres-saved-analysis-repository';
import { allowReasons } from './authorization';
function unavailable():never{throw new ApplicationError('NOT_FOUND','Saved Analysis or required sources are unavailable or inaccessible.');};
function forbidden():never{throw new ApplicationError('FORBIDDEN','Saved Analysis action is not available.');};
const text=(x:unknown)=>typeof x==='string'?x:'';
const object=(x:unknown)=>x&&typeof x==='object'?x as Record<string,unknown>:{};
const canonical=(x:unknown):unknown=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):x;
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
type AccessRow={id:string;study_id:string;version:number;owner_principal_id:string;visibility:SavedAnalysisSharing['visibility'];audience_study_id:string|null;audience_unit_id:string|null};
async function sourceStudies(sql:SqlSession,view:SavedAnalysisView){
 return (await sql.query<{study_id:string;series_slug:string;display_name:string;visibility:string;responsible_department_id:string;area_id:string|null}>(`WITH RECURSIVE observations(id) AS (
 SELECT v.id FROM measurement_value v JOIN measurement_dataset d ON d.id=v.dataset_id WHERE d.domain_id=ANY($3::text[])
 OR EXISTS(SELECT 1 FROM measurement_summary_source ms JOIN measurement_summary m ON m.id=ms.summary_id WHERE ms.value_id=v.id AND m.domain_id=ANY($4::text[]))
 UNION SELECT l.source_value_id FROM measurement_value_lineage l JOIN observations o ON o.id=l.value_id
 ) SELECT DISTINCT s.study_id,s.series_slug,s.display_name,p.visibility,p.responsible_department_id,p.area_id
 FROM study s JOIN study_access p USING(study_id) WHERE s.series_slug=$1 OR EXISTS(SELECT 1 FROM experiment_run r WHERE r.study_id=s.study_id AND (r.run_domain_id=ANY($2::text[]) OR EXISTS(SELECT 1 FROM observations o JOIN measurement_value v ON v.id=o.id WHERE v.run_id=r.run_id)))`,[view.studyId,view.runIds,view.datasetIds,view.sourceReferences.flatMap(r=>r.representativeResultId?[r.representativeResultId]:[])])).rows;
}
async function ceiling(sql:SqlSession,pid:string,view:SavedAnalysisView,sharing?:SavedAnalysisSharing){
 const sources=await sourceStudies(sql,view);
 if(!sources.length)return false;
 for(const source of sources){
  if(!(await sql.query<{allowed:boolean}>("SELECT dxt_study_access_reason($1,$2,'MANAGE_ACCESS')=ANY($3::text[]) allowed",[pid,source.study_id,allowReasons])).rows[0].allowed)return false;
 }
 if(!sharing)return true;
 const targetAllowed=(kind:string,id:string)=>kind==='STUDY'?sources.some(s=>s.series_slug===id):kind==='DEPARTMENT'?sources.every(s=>s.visibility!=='PRIVATE'&&s.responsible_department_id===id):kind==='AREA'?sources.every(s=>s.visibility==='AREA'&&s.area_id===id):false;
 if(['DEPARTMENT','AREA'].includes(sharing.visibility)&&!(await sql.query('SELECT 1 FROM auth_org_unit WHERE id=$1 AND kind=$2',[sharing.targetId,sharing.visibility])).rows.length)return false;
 if(sharing.visibility!=='PRIVATE'&&!targetAllowed(sharing.visibility,sharing.targetId!))return false;
 for(const audience of sharing.audiences){
  if(audience.kind==='PRINCIPAL'){
   if(!(await sql.query('SELECT 1 FROM auth_principal WHERE id=$1 AND active',[audience.id])).rows.length)return false;
  }else if(!targetAllowed(audience.kind,audience.id)||!(await sql.query('SELECT 1 FROM auth_org_unit WHERE id=$1 AND kind=$2',[audience.id,audience.kind])).rows.length)return false;
 }
 return true;
}
async function audienceRight(sql:SqlSession,pid:string,id:string,action:SavedAnalysisAction){return (await sql.query<{allowed:boolean}>('SELECT dxt_saved_analysis_audience($1,$2,$3) allowed',[pid,id,action])).rows[0].allowed;}
async function readSharing(sql:SqlSession,row:AccessRow):Promise<SavedAnalysisSharing>{
 const target=row.visibility==='STUDY'?(await sql.query<{series_slug:string}>('SELECT series_slug FROM study WHERE study_id=$1',[row.audience_study_id])).rows[0]?.series_slug:row.audience_unit_id;
 const grants=await sql.query<{principal_id:string|null;unit_id:string|null;kind:'DEPARTMENT'|'AREA'}>(`SELECT g.principal_id,g.unit_id,u.kind FROM saved_analysis_access_grant g LEFT JOIN auth_org_unit u ON u.id=g.unit_id WHERE g.saved_analysis_id=$1 AND g.action='VIEW_SAVED_ANALYSIS' AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp()) ORDER BY g.id`,[row.id]);
 return {visibility:row.visibility,targetId:target??null,audiences:grants.rows.map(g=>g.principal_id?{kind:'PRINCIPAL' as const,id:g.principal_id}:{kind:g.kind,id:g.unit_id!})};
}
async function requireSources(sql:SqlSession,pid:string,view:SavedAnalysisView){
 const study=(await sql.query<{study_id:string}>('SELECT study_id FROM study WHERE series_slug=$1',[view.studyId])).rows[0];
 if(!study||!(await sql.query<{allowed:boolean}>('SELECT dxt_saved_analysis_sources($1,$2,$3::jsonb,$4::jsonb) allowed',[pid,study.study_id,JSON.stringify(view),JSON.stringify(view.sourceReferences)])).rows[0].allowed)unavailable();
}
async function executeSavedAnalysisOperation(sql:SqlSession,principal:Principal,input:Record<string,unknown>){
 const pid=principal.principalId,op=text(input.operation),rawView=object(input.view),id=text(op==='analysis.save'?rawView.id:input.id);
 const db:SqlDatabase={query:(q,args)=>sql.query(q,args),transaction:work=>work(sql),close:async()=>{}};
 const repository=new PostgresSavedAnalysisRepository(db);
 const publicView=async(view:SavedAnalysisView|null)=>{
  if(!view)return view;
  const shared=(await sql.query<{shared:boolean}>(`SELECT p.visibility<>'PRIVATE' OR EXISTS(SELECT 1 FROM saved_analysis_access_grant g WHERE g.saved_analysis_id=a.id AND g.action='VIEW_SAVED_ANALYSIS' AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())) shared FROM saved_analysis a JOIN saved_analysis_access p ON p.saved_analysis_id=a.id WHERE a.domain_id=$1`,[view.id])).rows[0]?.shared;
  return {...view,visibility:shared?'SHARED' as const:'PRIVATE' as const};
 };
 if(op==='analysis.list'){const ids=await accessibleSavedAnalysisIds(sql,pid);const result=[];for(const id of ids)result.push(await publicView(await repository.get(id)));return result;}
 const write=op==='analysis.save'||op==='analysis.share';
 if(write)await sql.query('SELECT id FROM saved_analysis WHERE domain_id=$1 FOR UPDATE',[id]);
 const existing=(await sql.query<{id:string;version:number}>('SELECT id,version FROM saved_analysis WHERE domain_id=$1',[id])).rows[0];
 let row:AccessRow|undefined;
 if(existing){
  if(!(await accessibleSavedAnalysisIds(sql,pid,id)).length)unavailable();
  row=(await sql.query<AccessRow>('SELECT a.id,a.study_id,a.version,p.owner_principal_id,p.visibility,p.audience_study_id,p.audience_unit_id FROM saved_analysis a JOIN saved_analysis_access p ON p.saved_analysis_id=a.id WHERE a.id=$1',[existing.id])).rows[0];
 }else if(op!=='analysis.save')unavailable();
 const state=existing?await repository.getState(id):null;
 const current=state?.record;
 const canEdit=row?await audienceRight(sql,pid,row.id,'EDIT_SAVED_ANALYSIS'):false;
 const canShare=row&&current?await audienceRight(sql,pid,row.id,'SHARE_SAVED_ANALYSIS')&&await ceiling(sql,pid,current):false;
 if(op==='analysis.access'){
  const sharing=await readSharing(sql,row!);
  const sources=await sourceStudies(sql,current!);
  const candidates:SavedAnalysisSharing[]=[{visibility:'PRIVATE',targetId:null,audiences:[]},...sources.map(s=>({visibility:'STUDY' as const,targetId:s.series_slug,audiences:[]})),...sources.flatMap(s=>[{visibility:'DEPARTMENT' as const,targetId:s.responsible_department_id,audiences:[]},...(s.area_id?[{visibility:'AREA' as const,targetId:s.area_id,audiences:[]}]:[])])];
  const options:SavedAnalysisSharing[]=[];for(const candidate of candidates)if(await ceiling(sql,pid,current!,candidate)&&!options.some(o=>o.visibility===candidate.visibility&&o.targetId===candidate.targetId))options.push(candidate);
  return {version:Number(row!.version),ownerPrincipalId:row!.owner_principal_id,sharing:{...sharing,audiences:canShare?sharing.audiences:[]},canEditSavedAnalysis:canEdit,canShareSavedAnalysis:canShare,canDeleteSavedAnalysis:false,canManageSavedAnalysisAccess:await audienceRight(sql,pid,row!.id,'MANAGE_SAVED_ANALYSIS_ACCESS'),sharingOptions:options} satisfies SavedAnalysisAccess;
 }
 if(op==='analysis.load')return {...state,record:await publicView(current??null),permissions:{canEditSavedAnalysis:canEdit,canShareSavedAnalysis:canShare,canDeleteSavedAnalysis:false}};
 const command=object(input.command);
 if(typeof command.commandId!=='string'||!Number.isInteger(command.expectedVersion))forbidden();
 const commandId=hash([pid,op,command.commandId]);
 if(op==='analysis.save'){
  const parsed=savedAnalysisViewSchema.safeParse(input.view);if(!parsed.success)forbidden();
  if(existing&&!canEdit)forbidden();
  const view=parsed.data;
  await requireSources(sql,pid,view);
  // Ownership and publication are not editable scientific/view payload properties.
  view.owner=current?.owner??principal.userId;
  view.visibility=current?.visibility??'PRIVATE';
  if(current){
   const sharing=await readSharing(sql,row!);
   // An editor cannot expand a shared view's source set beyond its publication ceiling.
   const oldRoots=(await sourceStudies(sql,current)).map(s=>s.study_id).sort();
   const nextRoots=(await sourceStudies(sql,view)).map(s=>s.study_id).sort();
   if((sharing.visibility!=='PRIVATE'||sharing.audiences.length)&&hash(oldRoots)!==hash(nextRoots)&&!await ceiling(sql,pid,view,sharing))forbidden();
  }
  await repository.save(view,{commandId,expectedVersion:Number(command.expectedVersion)});
  if(!existing){
   // Racing creates with the same domain ID cannot steal an existing mapped view.
   const stored=(await sql.query<{id:string}>('SELECT id FROM saved_analysis WHERE domain_id=$1',[view.id])).rows[0];
   await sql.query("INSERT INTO saved_analysis_access(saved_analysis_id,owner_principal_id,created_by_principal_id) VALUES($1,$2,$2)",[stored.id,pid]);
  }
  return null;
 }
 if(op==='analysis.share'){
  if(!row||!current||!canShare)forbidden();
  const sharing=savedAnalysisSharingSchema.parse(input.sharing);
  if(!await ceiling(sql,pid,current,sharing))forbidden();
  const requestHash=hash({sharing,expectedVersion:command.expectedVersion});
  const receipt=(await sql.query<{request_hash:string;successful_version:number}>('SELECT request_hash,successful_version FROM saved_analysis_command_receipt WHERE saved_analysis_id=$1 AND command_id=$2',[row.id,commandId])).rows[0];
  if(receipt&&receipt.request_hash!==requestHash)throw new ApplicationError('CONFLICT','Saved Analysis command identity was reused.');
  if(!receipt){
   if(Number(row.version)!==command.expectedVersion)throw new ApplicationError('CONFLICT','Saved Analysis changed. Reload before changing access.');
   let studyId:string|null=null;if(sharing.visibility==='STUDY')studyId=(await sql.query<{study_id:string}>('SELECT study_id FROM study WHERE series_slug=$1',[sharing.targetId])).rows[0]?.study_id??null;
   await sql.query('UPDATE saved_analysis_access SET visibility=$2,audience_study_id=$3,audience_unit_id=$4 WHERE saved_analysis_id=$1',[row.id,sharing.visibility,studyId,['DEPARTMENT','AREA'].includes(sharing.visibility)?sharing.targetId:null]);
   await sql.query("UPDATE saved_analysis_access_grant SET active=false WHERE saved_analysis_id=$1 AND action='VIEW_SAVED_ANALYSIS'",[row.id]);
   for(const audience of sharing.audiences)await sql.query(`INSERT INTO saved_analysis_access_grant(id,saved_analysis_id,principal_id,unit_id,action,granted_by) VALUES($1,$2,$3,$4,'VIEW_SAVED_ANALYSIS',$5) ON CONFLICT(id) DO UPDATE SET active=true,expires_at=NULL,granted_by=excluded.granted_by`,[hash([row.id,audience.kind,audience.id]),row.id,audience.kind==='PRINCIPAL'?audience.id:null,audience.kind==='PRINCIPAL'?null:audience.id,pid]);
   await sql.query('UPDATE saved_analysis SET version=version+1,updated_at=now() WHERE id=$1',[row.id]);
   await sql.query('INSERT INTO saved_analysis_command_receipt VALUES($1,$2,$3,$4)',[row.id,commandId,requestHash,Number(row.version)+1]);
  }
  return {actor:pid,savedAnalysisId:id,action:'SHARE_SAVED_ANALYSIS',audience:sharing,result:'ALLOW',reason:'AUDIENCE_CAPABILITY_AND_SOURCE_CEILING',version:Number(receipt?.successful_version??Number(row.version)+1)};
 }
 forbidden();
}

/** Metadata for a future audit sink; no audit persistence or scientific payload logging. */
export class SavedAnalysisCommandFailure extends ApplicationError {
 constructor(error:ApplicationError,public readonly commandContext:{actor:string;savedAnalysisId:string;action:string;audience:SavedAnalysisSharing|null;result:'DENY'|'ERROR';reason:string}){super(error.code,error.message,{cause:error});}
}
export async function savedAnalysisOperation(sql:SqlSession,principal:Principal,input:Record<string,unknown>){
 try{return await executeSavedAnalysisOperation(sql,principal,input);}
 catch(error){
  const serialization=error&&typeof error==='object'&&'code' in error&&['40001','40P01'].includes(String(error.code));
  const failure=serialization?new ApplicationError('CONFLICT','Saved Analysis changed concurrently. Reload before retrying.'):error instanceof ApplicationError?error:new ApplicationError('PERSISTENCE','Saved Analysis command could not be completed.');
  const audience=savedAnalysisSharingSchema.safeParse(input.sharing);
  throw new SavedAnalysisCommandFailure(failure,{actor:principal.principalId,savedAnalysisId:text(input.id??object(input.view).id),action:text(input.operation),audience:audience.success?audience.data:null,result:['NOT_FOUND','FORBIDDEN'].includes(failure.code)?'DENY':'ERROR',reason:failure.code});
 }
}
