import { randomUUID } from 'node:crypto';
import { ApplicationError } from '@/src/application/repository-ports';
import type { LifecycleAuthoringProfile } from '@/src/features/run-registration/lifecycle-authoring';
import type { SqlSession } from './sql-database';
import { createHash } from 'node:crypto';
import { confirmStudyReasoningSchema, reasoningPrerequisites, type ConfirmStudyReasoning, type StudyReadiness } from '@/src/application/study-readiness';
import { readMeasurementCatalog } from './measurement-references';
import { hydrateConfigurationPackages } from './configuration-hydrator';

export async function studyReadiness(sql:SqlSession,slug:string,pin:string):Promise<StudyReadiness>{
  const study=(await sql.query<{study_id:string}>('SELECT study_id FROM study WHERE series_slug=$1',[slug])).rows[0];
  if(!study)throw new ApplicationError('NOT_FOUND','Study is not persisted.');
  await hydrateConfigurationPackages(sql,[pin]);
  const contexts=await sql.query<{id:string;package_version_id:string;payload:ReasoningContext}>('SELECT id,package_version_id,payload FROM reasoning_context WHERE study_id=$1 ORDER BY package_version_id',[study.study_id]);
  const exact=contexts.rows.find(c=>c.package_version_id===pin);
  const missing=exact?reasoningPrerequisites(exact.payload,await readMeasurementCatalog(sql,pin)):['Exact Study/package Target and Evaluation context'];
  return {status:missing.length?'NOT_READY':'READY',missing,contextId:exact?.id??null,proposals:contexts.rows.map(c=>({id:c.id,packageVersionId:c.package_version_id,context:c.payload}))};
}
export async function requireStudyReadiness(sql:SqlSession,slug:string,pin:string){
  const readiness=await studyReadiness(sql,slug,pin);
  if(readiness.status!=='READY')throw new ApplicationError('VALIDATION',`Study lifecycle not ready for ${pin}: ${readiness.missing.join('; ')}. Confirm reasoning context in Study Experiment Setup.`);
}
export async function confirmStudyReasoning(sql:SqlSession,slug:string,raw:ConfirmStudyReasoning,commandId:string){
  const input=confirmStudyReasoningSchema.parse(raw);
  const study=(await sql.query<{study_id:string}>('SELECT study_id FROM study WHERE series_slug=$1 FOR UPDATE',[slug])).rows[0];
  if(!study)throw new ApplicationError('NOT_FOUND','Study is not persisted.');
  const requestHash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const receipt=(await sql.query<{request_hash:string}>('SELECT request_hash FROM study_reasoning_adoption WHERE study_id=$1 AND command_id=$2',[study.study_id,commandId])).rows[0];
  if(receipt){if(receipt.request_hash!==requestHash)throw new ApplicationError('CONFLICT','Reasoning confirmation identity reused.');return;}
  const source=(await sql.query<{payload:ReasoningContext}>('SELECT payload FROM reasoning_context WHERE id=$1 AND study_id=$2',[input.sourceContextId,study.study_id])).rows[0];
  if(!source)throw new ApplicationError('NOT_FOUND','Exact proposed context is unavailable for this Study.');
  await hydrateConfigurationPackages(sql,[input.packageVersionId]);
  const payload={targetBindings:input.targetBindings,catalog:source.payload.catalog};
  const missing=reasoningPrerequisites(payload,await readMeasurementCatalog(sql,input.packageVersionId));
  if(missing.length)throw new ApplicationError('VALIDATION',missing.join('; '));
  const existing=(await sql.query<{id:string;same:boolean}>('SELECT id,payload=$3::jsonb AS same FROM reasoning_context WHERE study_id=$1 AND package_version_id=$2',[study.study_id,input.packageVersionId,JSON.stringify(payload)])).rows[0];
  if(existing&&!existing.same)throw new ApplicationError('CONFLICT','Exact reasoning context is immutable. Select a new package version.');
  const id=existing?.id??randomUUID();
  if(!existing)await sql.query('INSERT INTO reasoning_context VALUES($1,$2,$3,$4::jsonb)',[id,study.study_id,input.packageVersionId,JSON.stringify(payload)]);
  await sql.query('INSERT INTO study_reasoning_adoption(study_id,command_id,context_id,source_context_id,request_hash) VALUES($1,$2,$3,$4,$5)',[study.study_id,commandId,id,input.sourceContextId,requestHash]);
}
export type ReasoningContext = import('@/src/application/study-readiness').StudyReasoningContext;
export async function readReasoningContext(sql: SqlSession, runId: string) {
  const result = await sql.query<{ id: string; payload: ReasoningContext }>(
    `SELECT c.id,c.payload FROM reasoning_context c JOIN experiment_run r ON r.study_id=c.study_id AND r.configuration_package_version_id=c.package_version_id WHERE r.run_domain_id=$1`,
    [runId],
  );
  if (!result.rows[0])
    throw new ApplicationError(
      'NOT_FOUND',
      'Exact scientific reasoning definitions are not provisioned for this Run.',
    );
  return result.rows[0];
}
/** Explicit development/bootstrap provisioning. Never invoked by production reads. */
export async function provisionReasoningContexts(
  sql: SqlSession,
  profiles: Record<string, LifecycleAuthoringProfile>,
) {
  const rows = await sql.query<{
    study_id: string;
    series_slug: string;
    configuration_package_version_id: string;
  }>(
    `SELECT s.study_id,s.series_slug,v.configuration_package_version_id FROM study s JOIN study_setup_version v ON v.setup_version_id=s.current_setup_version_id`,
  );
  for (const row of rows.rows) {
    const p = profiles[row.series_slug];
    if (!p) continue;
    const payload = JSON.stringify({
      targetBindings: p.targetBindings,
      catalog: p.catalog,
    });
    const existing = await sql.query<{ same: boolean }>(
      'SELECT payload=$3::jsonb AS same FROM reasoning_context WHERE study_id=$1 AND package_version_id=$2',
      [row.study_id, row.configuration_package_version_id, payload],
    );
    if (existing.rows[0]) {
      if (!existing.rows[0].same)
        throw new ApplicationError(
          'CONFLICT',
          'Reasoning definition context is immutable.',
        );
      continue;
    }
    await sql.query(
      'INSERT INTO reasoning_context(id,study_id,package_version_id,payload) VALUES($1,$2,$3,$4::jsonb)',
      [
        randomUUID(),
        row.study_id,
        row.configuration_package_version_id,
        payload,
      ],
    );
  }
}
