import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { scientificStudyActions } from '@/src/application/authorization';
import { PostgresAuthorization } from '@/src/infrastructure/postgres/authorization';
import type { PgDatabase } from '@/src/infrastructure/postgres/pg-database';

/** Disposable fixtures only. Production policy + proposed SQL must resolve identically. */
export async function scientificPolicyContract(pool: Pool, db: PgDatabase, study: string) {
 const q=(sql:string,args:unknown[]=[])=>pool.query(sql,args);
 const authorization=new PostgresAuthorization(db);
 const compare=async(actor:string,action:typeof scientificStudyActions[number],expected:string)=>{
  const reason=(await q('SELECT dxt_explicit_scientific_access_reason($1,$2,$3) reason',[actor,study,action])).rows[0].reason;
  const runtime=await authorization.authorize({principalId:actor,userId:actor,role:actor==='review-admin'?'ADMIN':'GENERAL_USER'},action,study);
  assert.equal(reason,expected,`${actor}/${action} SQL`);
  assert.equal(runtime.reason,reason,`${actor}/${action} runtime parity`);
 };
 // Same explicit authority applies to all nine commands; roles never substitute.
 for(const actor of ['review-author','review-admin']) {
  for(const action of scientificStudyActions){
   const old=(await q('SELECT id,active,expires_at FROM study_access_grant WHERE study_id=$1 AND principal_id=$2 AND action=$3',[study,actor,action])).rows;
   await q('UPDATE study_access_grant SET active=false WHERE study_id=$1 AND principal_id=$2 AND action=$3',[study,actor,action]);
   await compare(actor,action,'MISSING_CAPABILITY');
   const id=randomUUID();
   await q('INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$3)',[id,study,actor,action]);
   await compare(actor,action,'EXPLICIT_GRANT');
   await q('UPDATE study_access_grant SET expires_at=statement_timestamp()-interval \'1 second\' WHERE id=$1',[id]);
   await compare(actor,action,'MISSING_CAPABILITY');
   await q('UPDATE study_access_grant SET expires_at=NULL,active=false WHERE id=$1',[id]);
   await compare(actor,action,'MISSING_CAPABILITY');
   await q('DELETE FROM study_access_grant WHERE id=$1',[id]);
   for(const row of old)await q('UPDATE study_access_grant SET active=$2,expires_at=$3 WHERE id=$1',[row.id,row.active,row.expires_at]);
  }
 }
 await q("UPDATE auth_principal SET active=false WHERE id='review-author'");
 await compare('review-author','CREATE_RUN','CONTEXT_UNAVAILABLE');
 await q("UPDATE auth_principal SET active=true WHERE id='review-author'");
 const oldAccess=(await q('SELECT visibility FROM study_access WHERE study_id=$1',[study])).rows[0];
 await q("UPDATE study_access SET visibility='PRIVATE' WHERE study_id=$1",[study]);
 await q("INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES('cross-org-science',$1,'review-denied','MANAGE_REASONING_CONTEXT','review-author')",[study]);
 await compare('review-denied','MANAGE_REASONING_CONTEXT','OUT_OF_SCOPE');
 await q("INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES('explicit-resource',$1,'review-denied','VIEW_RUN','review-author')",[study]);
 await compare('review-denied','MANAGE_REASONING_CONTEXT','EXPLICIT_GRANT');
 await q("UPDATE study_access_grant SET active=false WHERE id='explicit-resource'");
 await compare('review-denied','MANAGE_REASONING_CONTEXT','OUT_OF_SCOPE');
 await q("DELETE FROM study_access_grant WHERE id IN ('cross-org-science','explicit-resource')");
 await q('UPDATE study_access SET visibility=$2 WHERE study_id=$1',[study,oldAccess.visibility]);
 await q("INSERT INTO auth_membership VALUES('review-denied','review-dept',false)");
 await q("INSERT INTO study_access_grant(id,study_id,unit_id,action,granted_by) VALUES('org-capability',$1,'review-dept','MANAGE_REASONING_CONTEXT','review-author')",[study]);
 await compare('review-denied','MANAGE_REASONING_CONTEXT','EXPLICIT_GRANT');
 await q("UPDATE auth_membership SET managed=true WHERE principal_id='review-denied'");
 // Managed membership may retain visibility but is never ordinary grant membership.
 const managed=(await q("SELECT dxt_explicit_scientific_access_reason('review-denied',$1,'MANAGE_REASONING_CONTEXT') reason",[study])).rows[0].reason;
 assert.notEqual(managed,'EXPLICIT_GRANT');
 await q("DELETE FROM auth_membership WHERE principal_id='review-denied'");
 await q("DELETE FROM study_access_grant WHERE id='org-capability'");
 // Corrupt/unavailable visibility must fail closed even with a still-active grant.
 const c=await pool.connect();
 try {
  await c.query('BEGIN');
  await c.query('CREATE OR REPLACE FUNCTION dxt_study_access_reason(pid text,sid uuid,act text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$');
  assert.equal((await c.query("SELECT dxt_explicit_scientific_access_reason('review-author',$1,'CREATE_RUN') reason",[study])).rows[0].reason,'CONTEXT_UNAVAILABLE');
  const runtime=new PostgresAuthorization({query: async <T>(sql:string,args:unknown[]=[])=>{const r=await c.query(sql,args);return {rows:r.rows as T[],rowCount:r.rowCount??0};}});
  assert.equal((await runtime.authorize({principalId:'review-author',userId:'review-author',role:'GENERAL_USER'},'CREATE_RUN',study)).reason,'CONTEXT_UNAVAILABLE');
 } finally {await c.query('ROLLBACK');c.release();}
 console.log('PASS SQL/runtime nine-action parity: owner/admin explicit grants, revoked/expired, inactive principal, resource visibility, cross-org denial, unit scope and NULL fail-closed');

 await q('CREATE ROLE dxt_reasoning_server NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS');
 await q('CREATE ROLE untrusted_researcher NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS');
 await q(await readFile('docs/proposals/issue-16/trusted-server-acl.PROPOSED.sql','utf8'));
 const restricted=await pool.connect();
 try {
  await restricted.query('SET SESSION AUTHORIZATION untrusted_researcher');
  await assert.rejects(restricted.query("SELECT dxt_explicit_scientific_access_reason('review-author',$1,'CREATE_RUN')",[study]),/permission denied/);
  await assert.rejects(restricted.query('SELECT create_reasoning_criteria_revision($1,$1,$2,$3,0,$4,$5)',[randomUUID(),study,'any','review-author',{}]),/permission denied/);
  await assert.rejects(restricted.query("SELECT set_config('dxt.actor','review-author',false); SELECT record_run_reasoning_origin(NULL,'ABSENT',NULL,'review-author','spoof')"),/permission denied/);
  await assert.rejects(restricted.query('SET ROLE dxt_reasoning_server'),/permission denied/);
  for(const table of ['reasoning_criteria_revision','reasoning_criteria_definition','run_reasoning_origin','run_reasoning_interpretation_adoption','reasoning_context']){
   await assert.rejects(restricted.query(`INSERT INTO ${table} DEFAULT VALUES`),/permission denied/);
  }
  await restricted.query('RESET SESSION AUTHORIZATION');
  await restricted.query('SET ROLE dxt_reasoning_server');
  assert.equal((await restricted.query("SELECT dxt_explicit_scientific_access_reason('review-author',$1,'CREATE_RUN') reason",[study])).rows[0].reason,'EXPLICIT_GRANT');
  await assert.rejects(restricted.query('INSERT INTO reasoning_context DEFAULT VALUES'),/permission denied/);
  await assert.rejects(restricted.query('INSERT INTO reasoning_criteria_revision DEFAULT VALUES'),/permission denied/);
  await assert.rejects(restricted.query('CREATE TABLE public.untrusted_shadow(id int)'),/permission denied/);
  await assert.rejects(restricted.query('SELECT create_reasoning_criteria_revision($1,$1,$2,$3,0,$4,$5)',[randomUUID(),study,'any','review-denied',{}]),/explicit capability/);
 } finally {await restricted.query('RESET SESSION AUTHORIZATION');await restricted.query('RESET ROLE');restricted.release();}
 console.log('PASS restricted DB role: caller-chosen actor/GUC/SET ROLE/function/direct-table/legacy-view bypass denied; trusted server still checks capability');
}
