import {authorizationPolicyVersion} from '@/src/application/authorization';
import type { AuthorizationService,AuthorizationDecision,Principal,StudyAction,StudyPermissions } from '@/src/application/authorization';
import { ApplicationError } from '@/src/application/repository-ports';
import type { SqlSession } from './sql-database';
export const allowReasons=['RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN'];
export class PostgresAuthorization implements AuthorizationService {
 constructor(private readonly sql:SqlSession){}
 async authorize(principal:Principal,action:StudyAction,studyId:string):Promise<AuthorizationDecision>{
  const r=(await this.sql.query<{reason:string;version:string|null}>(`SELECT dxt_study_access_reason($1,$2,$3) reason,(SELECT version FROM study_access WHERE study_id=$2) version`,[principal.principalId,studyId,action])).rows[0];
  return {effect:allowReasons.includes(r.reason)?'ALLOW':'DENY',reason:r.reason,principalId:principal.principalId,action,studyId,policyVersion:authorizationPolicyVersion,contextVersion:r.version===null?null:Number(r.version)};
 }
 async require(principal:Principal,action:StudyAction,studyId:string){
  const d=await this.authorize(principal,action,studyId);
  if(d.effect==='DENY')throw new ApplicationError(action.startsWith('VIEW')||['OUT_OF_SCOPE','CONTEXT_UNAVAILABLE'].includes(d.reason)?'NOT_FOUND':'FORBIDDEN','Resource unavailable or access denied.');
  return d;
 }
 async scientificPermissions(principal:Principal,studyId:string){
  const pairs=[['canRecordActual','RECORD_ACTUAL'],['canRecordMeasurement','RECORD_MEASUREMENT'],['canManageMeasurementValidity','MANAGE_MEASUREMENT_VALIDITY'],['canEvaluate','AUTHOR_EVALUATION'],['canDecide','AUTHOR_DECISION'],['canAuthorNextAction','AUTHOR_NEXT_ACTION']] as const;
  const result={} as import('@/src/application/authorization').ScientificPermissions;
  for(const [key,action] of pairs)result[key]=(await this.authorize(principal,action,studyId)).effect==='ALLOW';
  return result;
 }
 async permissions(principal:Principal,studyId:string):Promise<StudyPermissions>{
  const decisions:AuthorizationDecision[]=[];
  for(const action of ['EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS'] as const)decisions.push(await this.authorize(principal,action,studyId));
  const [a,b,c,d,e]=decisions;
  return {canEditStudy:a.effect==='ALLOW',canEditStudySetup:b.effect==='ALLOW',canCreateRun:c.effect==='ALLOW',canEditPlan:d.effect==='ALLOW',canManageAccess:e.effect==='ALLOW'};
 }
}
/** Trusted server configuration only. No Request headers/cookies/body are consulted. */
export function developmentPrincipalId(env:Record<string,string|undefined>=process.env):string{
 if(env.DXT_AUTH_PROVIDER!=='server-development'||!env.DXT_DEV_PRINCIPAL)throw new ApplicationError('FORBIDDEN','Trusted pilot identity is unavailable.');
 return env.DXT_DEV_PRINCIPAL;
}
export async function resolvePrincipal(sql:SqlSession,id:string):Promise<Principal>{
 const row=(await sql.query<{id:string;user_id:string;role:Principal['role']}>('SELECT id,user_id,role FROM auth_principal WHERE id=$1 AND active',[id])).rows[0];
 if(!row)throw new ApplicationError('FORBIDDEN','Trusted pilot identity is unavailable.');
 return {principalId:row.id,userId:row.user_id,role:row.role};
}
export const accessibleStudySql=`SELECT s.study_id,s.series_slug,s.display_name FROM study s JOIN dxt_discoverable_studies($1) a USING(study_id) WHERE a.reason=ANY($2::text[])`;
