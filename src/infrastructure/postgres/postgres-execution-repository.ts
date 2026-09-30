import { createHash, randomUUID } from 'node:crypto';
import { ApplicationError, type ExecutionRecord, type ExecutionRepository, type RepositoryCommand } from '@/src/application/repository-ports';
import { executionEvidenceSchema } from '@/src/application/execution-record';
import { plannedExecutionIdentity, type ActualExecutionEvidence } from '@/src/features/run-registration/actual-execution-model';
import type { SqlDatabase, SqlSession } from './sql-database';

async function root(session: SqlSession, runId: string, lock: 'SHARE' | 'UPDATE') {
  const result = await session.query<{ run_id: string }>(`SELECT run_id FROM experiment_run WHERE run_domain_id = $1 FOR ${lock}`, [runId]);
  if (!result.rows[0]) throw new ApplicationError('NOT_FOUND', 'Run is not persisted.');
  return result.rows[0].run_id;
}
async function readEvidence(session: SqlSession, ids: string[]): Promise<ActualExecutionEvidence[]> {
  if (!ids.length) return [];
  const rows = await session.query<{
    execution_event_id: string; event_domain_id: string; run_domain_id: string; subject_domain_id: string;
    operation_domain_id: string; planned_execution_item_id: string | null; observed_operation: string;
    observed_recipe: string; equipment: string; started_at: string; ended_at: string | null;
    execution_status: ActualExecutionEvidence['event']['executionStatus']; source_system: string;
    source_record_reference: string; retrieved_at: string; identity_context: ActualExecutionEvidence['identityContext'];
    identity_context_present: boolean;
  }>(`SELECT e.*, r.run_domain_id, s.subject_domain_id, o.operation_domain_id
    FROM execution_event e JOIN experiment_run r USING(run_id)
    JOIN run_subject rs ON rs.run_subject_id=e.run_subject_id JOIN subject s USING(subject_id)
    JOIN run_operation o ON o.run_operation_id=e.run_operation_id
    WHERE e.execution_event_id = ANY($1::uuid[])`, [ids]);
  const values = await session.query<{ execution_event_id: string; definition_revision_id: string; value_text: string }>(
    'SELECT * FROM execution_observed_value WHERE execution_event_id = ANY($1::uuid[]) ORDER BY ordinal', [ids]);
  const byId = new Map(rows.rows.map((row) => [row.execution_event_id, row]));
  return ids.map((id) => {
    const row = byId.get(id);
    if (!row) throw new ApplicationError('PERSISTENCE', 'Execution evidence reference could not be resolved.');
    return {
      event: {
        id: row.event_domain_id, experimentRunId: row.run_domain_id, processStepId: row.operation_domain_id,
        plannedExecutionItemId: row.planned_execution_item_id, observedOperation: row.observed_operation,
        observedRecipe: row.observed_recipe, equipment: row.equipment, startedAt: row.started_at,
        endedAt: row.ended_at, executionStatus: row.execution_status, sourceSystem: row.source_system,
        sourceRecordReference: row.source_record_reference,
      },
      ...(row.identity_context_present ? { identityContext: row.identity_context } : {}),
      resolvedSubjectId: row.subject_domain_id,
      observedValues: values.rows.filter((v) => v.execution_event_id === id).map((v) => ({ definitionId: v.definition_revision_id, value: v.value_text })),
      retrievedAt: row.retrieved_at,
    };
  });
}
async function readState(session: SqlSession, runId: string): Promise<ExecutionRecord> {
  const state = await session.query<{ aggregate_version: number }>('SELECT aggregate_version FROM execution_state WHERE run_id=$1', [runId]);
  const current = await session.query<{ execution_event_id: string }>('SELECT execution_event_id FROM execution_current WHERE run_id=$1 ORDER BY ordinal', [runId]);
  return { version: state.rows[0]?.aggregate_version ?? 0, records: await readEvidence(session, current.rows.map((r) => r.execution_event_id)) };
}
export class PostgresExecutionRepository implements ExecutionRepository {
  constructor(private readonly database: SqlDatabase) {}
  async getStateByRun(runId: string) {
    return this.database.transaction(async (session) => readState(session, await root(session, runId, 'SHARE')));
  }
  async getByRun(runId: string) { return (await this.getStateByRun(runId)).records; }
  async saveByRun(runId: string, records: ActualExecutionEvidence[], command: RepositoryCommand): Promise<ExecutionRecord> {
    const parsed = executionEvidenceSchema.array().safeParse(records);
    if (!parsed.success || !command.commandId) throw new ApplicationError('VALIDATION', 'Invalid execution evidence.');
    const hash = createHash('sha256').update(JSON.stringify({ records: parsed.data, expectedVersion: command.expectedVersion })).digest('hex');
    try {
      return await this.database.transaction(async (session) => {
        const id = await root(session, runId, 'UPDATE');
        const receipt = await session.query<{ request_hash: string; result_version: number }>('SELECT * FROM execution_command_receipt WHERE run_id=$1 AND command_id=$2', [id, command.commandId]);
        if (receipt.rows[0]) {
          if (receipt.rows[0].request_hash !== hash) throw new ApplicationError('CONFLICT', 'Execution command identity was reused with different data.');
          const result = await session.query<{ execution_event_id: string }>('SELECT execution_event_id FROM execution_command_result WHERE run_id=$1 AND command_id=$2 ORDER BY ordinal', [id, command.commandId]);
          return { version: receipt.rows[0].result_version, records: await readEvidence(session, result.rows.map((r) => r.execution_event_id)) };
        }
        const current = await readState(session, id);
        if (command.expectedVersion !== current.version) throw new ApplicationError('CONFLICT', 'Execution changed before this command completed. Reload Actual before retrying.');
        const version = current.version + 1;
        await session.query('INSERT INTO execution_state(run_id,aggregate_version) VALUES($1,$2) ON CONFLICT(run_id) DO UPDATE SET aggregate_version=EXCLUDED.aggregate_version', [id, version]);
        const identities: Array<{ eventId: string; subjectId: string; operationId: string }> = [];
        for (const evidence of parsed.data) {
          const event = evidence.event;
          if (event.experimentRunId !== runId || (event.plannedExecutionItemId !== null && event.plannedExecutionItemId !== plannedExecutionIdentity(runId, evidence.resolvedSubjectId, event.processStepId)))
            throw new ApplicationError('VALIDATION', 'Execution does not reference the exact planned item.');
          const members = await session.query<{ run_subject_id: string; run_operation_id: string }>(`SELECT rs.run_subject_id,o.run_operation_id
            FROM run_subject rs JOIN subject s USING(subject_id)
            JOIN run_subject_operation link ON link.run_subject_id=rs.run_subject_id
            JOIN run_operation o ON o.run_operation_id=link.run_operation_id
            WHERE rs.run_id=$1 AND s.subject_domain_id=$2 AND o.operation_domain_id=$3`, [id, evidence.resolvedSubjectId, event.processStepId]);
          const member = members.rows[0];
          if (!member) throw new ApplicationError('VALIDATION', 'Subject / Operation is outside this Run execution membership.');
          const old = await session.query<{ execution_event_id: string }>('SELECT execution_event_id FROM execution_event WHERE event_domain_id=$1', [event.id]);
          const eventId = old.rows[0]?.execution_event_id ?? randomUUID();
          if (old.rows[0]) {
            const existing = (await readEvidence(session, [eventId]))[0];
            if (JSON.stringify(executionEvidenceSchema.parse(existing)) !== JSON.stringify(evidence)) throw new ApplicationError('CONFLICT', 'Execution evidence identity is immutable. Re-author using a new command.');
          } else {
            await session.query(`INSERT INTO execution_event (execution_event_id,event_domain_id,run_id,run_subject_id,run_operation_id,planned_execution_item_id,
              observed_operation,observed_recipe,equipment,started_at,ended_at,execution_status,source_system,source_record_reference,retrieved_at,identity_context,identity_context_present)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [eventId,event.id,id,member.run_subject_id,member.run_operation_id,event.plannedExecutionItemId,event.observedOperation,event.observedRecipe,event.equipment,
              event.startedAt,event.endedAt,event.executionStatus,event.sourceSystem,event.sourceRecordReference,evidence.retrievedAt,
              evidence.identityContext ? JSON.stringify(evidence.identityContext) : null, evidence.identityContext !== undefined]);
            for (const [ordinal, value] of evidence.observedValues.entries()) {
              await session.query('INSERT INTO execution_observed_value(execution_event_id,ordinal,definition_revision_id,value_text) VALUES($1,$2,$3,$4)', [eventId,ordinal,value.definitionId,value.value]);
            }
          }
          identities.push({ eventId, subjectId: member.run_subject_id, operationId: member.run_operation_id });
        }
        await session.query('DELETE FROM execution_current WHERE run_id=$1', [id]);
        await session.query('INSERT INTO execution_command_receipt(run_id,command_id,request_hash,result_version) VALUES($1,$2,$3,$4)', [id,command.commandId,hash,version]);
        for (const [ordinal, item] of identities.entries()) {
          await session.query('INSERT INTO execution_current(run_id,run_subject_id,run_operation_id,execution_event_id,ordinal) VALUES($1,$2,$3,$4,$5)', [id,item.subjectId,item.operationId,item.eventId,ordinal]);
          await session.query('INSERT INTO execution_command_result(run_id,command_id,ordinal,execution_event_id) VALUES($1,$2,$3,$4)', [id,command.commandId,ordinal,item.eventId]);
        }
        return readState(session, id);
      });
    } catch (cause) {
      if (cause instanceof ApplicationError) throw cause;
      throw new ApplicationError('PERSISTENCE', 'Execution could not be saved. No partial change was committed.', { cause });
    }
  }
}
