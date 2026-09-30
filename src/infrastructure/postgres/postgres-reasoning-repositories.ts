import { validatePlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { createHash, randomUUID } from 'node:crypto';
import {
  ApplicationError,
  type EvaluationRepository,
  type DecisionRepository,
  type DecisionRecord,
  type RepositoryCommand,
} from '@/src/application/repository-ports';
import {
  evaluationSchema,
  decisionContextSchema,
} from '@/src/application/reasoning-record';
import type { EngineerEvaluationRecord } from '@/src/features/run-registration/evaluation-grid-model';
import type { SqlDatabase, SqlSession } from './sql-database';
import { readReasoningContext } from './reasoning-context';
const canonical = (x: unknown): unknown =>
  Array.isArray(x)
    ? x.map(canonical)
    : x && typeof x === 'object'
      ? Object.fromEntries(
          Object.entries(x)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : x;
const hash = (x: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(x)))
    .digest('hex');
async function run(sql: SqlSession, id: string, lock = false) {
  const r = await sql.query<{ run_id: string }>(
    'SELECT run_id FROM experiment_run WHERE run_domain_id=$1' +
      (lock ? ' FOR UPDATE' : ''),
    [id],
  );
  if (!r.rows[0])
    throw new ApplicationError('NOT_FOUND', 'Run is not persisted.');
  return r.rows[0].run_id;
}
async function evaluations(sql: SqlSession, id: string) {
  const r = await sql.query<{ payload: EngineerEvaluationRecord }>(
    `SELECT e.payload FROM evaluation_current c JOIN engineer_evaluation e ON e.id=c.evaluation_id WHERE c.run_id=$1 ORDER BY c.ordinal`,
    [id],
  );
  return r.rows.map((x) => x.payload);
}
async function decision(
  sql: SqlSession,
  id: string,
): Promise<DecisionRecord | null> {
  const r = await sql.query<{
    payload: NonNullable<DecisionRecord['context']>;
    preview: DecisionRecord['nextRunPreview'];
    action: NonNullable<DecisionRecord['context']>['decision']['nextAction'];
  }>(
    `SELECT d.payload,d.preview,a.payload AS action FROM decision_state s JOIN decision d ON d.id=s.decision_id LEFT JOIN next_action a ON a.decision_id=d.id WHERE s.run_id=$1`,
    [id],
  );
  const v = r.rows[0];
  if (!v) return null;
  const refs = await sql.query<{ domain_id: string }>(
    `SELECT e.domain_id FROM decision_state s JOIN decision_evaluation_ref r ON r.decision_id=s.decision_id JOIN engineer_evaluation e ON e.id=r.evaluation_id WHERE s.run_id=$1 ORDER BY r.ordinal`,
    [id],
  );
  const results = await sql.query<{
    seriesTargetId: string;
    measurementSummaryId: string;
    status: NonNullable<
      DecisionRecord['context']
    >['targetAchievementReferences'][number]['status'];
  }>(
    `SELECT r.target_id AS "seriesTargetId",m.domain_id AS "measurementSummaryId",r.status FROM decision_state s JOIN decision_result_ref r ON r.decision_id=s.decision_id JOIN measurement_summary m ON m.id=r.summary_id WHERE s.run_id=$1 ORDER BY r.ordinal`,
    [id],
  );
  return {
    context: {
      ...v.payload,
      engineerEvaluationIds: refs.rows.map((e) => e.domain_id),
      targetAchievementReferences: results.rows,
      decision: { ...v.payload.decision, nextAction: v.action ?? null },
    },
    nextRunPreview: v.preview,
  };
}
async function version(
  sql: SqlSession,
  kind: 'evaluation' | 'decision',
  id: string,
) {
  const r = await sql.query<{ version: number }>(
    `SELECT version FROM ${kind}_state WHERE run_id=$1`,
    [id],
  );
  return r.rows[0]?.version ?? 0;
}
async function commandWrite(
  db: SqlDatabase,
  kind: 'evaluation' | 'decision',
  runId: string,
  input: unknown,
  cmd: RepositoryCommand,
  write: (sql: SqlSession, id: string) => Promise<string[]>,
) {
  try {
    await db.transaction(async (sql) => {
      const id = await run(sql, runId, true);
      const requestInput = { input, expectedVersion: cmd.expectedVersion };
      const request = hash(requestInput);
      const receipt = await sql.query<{ request_hash: string }>(
        'SELECT request_hash FROM reasoning_command_receipt WHERE run_id=$1 AND kind=$2 AND command_id=$3',
        [id, kind, cmd.commandId],
      );
      if (receipt.rows[0]) {
        if (
          receipt.rows[0].request_hash !== request &&
          receipt.rows[0].request_hash !==
            createHash('sha256')
              .update(JSON.stringify(requestInput))
              .digest('hex')
        )
          throw new ApplicationError(
            'CONFLICT',
            'Scientific command identity was reused.',
          );
        return;
      }
      const current = await version(sql, kind, id);
      if (cmd.expectedVersion === undefined || cmd.expectedVersion !== current)
        throw new ApplicationError(
          'CONFLICT',
          'Scientific reasoning changed. Reload before saving.',
        );
      const ids = await write(sql, id);
      await sql.query(
        `INSERT INTO ${kind}_state(run_id,version) VALUES($1,$2) ON CONFLICT(run_id) DO UPDATE SET version=EXCLUDED.version`,
        [id, current + 1],
      );
      if (kind === 'decision')
        await sql.query(
          'UPDATE decision_state SET decision_id=$2 WHERE run_id=$1',
          [id, ids[0]],
        );
      await sql.query(
        'INSERT INTO reasoning_command_receipt(run_id,kind,command_id,request_hash,result_version,result_ids) VALUES($1,$2,$3,$4,$5,$6::jsonb)',
        [id, kind, cmd.commandId, request, current + 1, JSON.stringify(ids)],
      );
    });
  } catch (e) {
    if (e instanceof ApplicationError) throw e;
    throw new ApplicationError(
      'PERSISTENCE',
      'Scientific reasoning could not be saved.',
      { cause: e },
    );
  }
}
async function summary(
  sql: SqlSession,
  runId: string,
  id: string,
  subject?: string,
) {
  const r = await sql.query<{
    id: string;
    subject_id: string;
    parameter_id: string;
  }>(
    `SELECT m.id,s.subject_domain_id AS subject_id,m.parameter_id FROM measurement_summary m JOIN measurement_dataset d ON d.id=m.dataset_id JOIN run_subject rs ON rs.run_subject_id=m.run_subject_id JOIN subject s ON s.subject_id=rs.subject_id WHERE d.run_id=$1 AND m.domain_id=$2`,
    [runId, id],
  );
  const v = r.rows[0];
  if (!v || (subject && v.subject_id !== subject))
    throw new ApplicationError(
      'VALIDATION',
      'Exact measured Subject result is unavailable.',
    );
  return v;
}
export class PostgresEvaluationRepository implements EvaluationRepository {
  constructor(private db: SqlDatabase) {}
  async getContext(id: string) {
    const p = (await readReasoningContext(this.db, id)).payload;
    return { ...p, targetBindings: [...p.targetBindings] };
  }
  async getStateByRun(id: string) {
    return this.db.transaction(async (sql) => {
      const rid = await run(sql, id, true);
      return {
        version: await version(sql, 'evaluation', rid),
        record: await evaluations(sql, rid),
      };
    });
  }
  async getByRun(id: string) {
    return (await this.getStateByRun(id)).record;
  }
  async saveByRun(
    id: string,
    input: EngineerEvaluationRecord[],
    cmd: RepositoryCommand,
  ) {
    const parsed = evaluationSchema.array().safeParse(input);
    if (!parsed.success)
      throw new ApplicationError('VALIDATION', 'Invalid Engineer Evaluation.');
    const records = parsed.data;
    await commandWrite(
      this.db,
      'evaluation',
      id,
      records,
      cmd,
      async (sql, rid) => {
        const ctx = await readReasoningContext(sql, id);
        const ids: string[] = [];
        const scopes = new Set<string>();
        for (const item of records) {
          if (item.runId !== id)
            throw new ApplicationError(
              'VALIDATION',
              'Evaluation belongs to another Run.',
            );
          const scope = JSON.stringify([item.subjectId, item.seriesTargetId]);
          if (scopes.has(scope))
            throw new ApplicationError(
              'VALIDATION',
              'Duplicate Evaluation scope.',
            );
          scopes.add(scope);
          const source = await summary(
            sql,
            rid,
            item.measurementSummaryId,
            item.subjectId,
          );
          const target = ctx.payload.targetBindings.find(
            (b) => b.target.id === item.seriesTargetId,
          );
          if (
            !target ||
            target.target.parameterDefinitionId !== source.parameter_id
          )
            throw new ApplicationError(
              'VALIDATION',
              'Evaluation Target does not match the exact result.',
            );
          const old = await sql.query<{ id: string; content_hash: string }>(
            'SELECT id,content_hash FROM engineer_evaluation WHERE domain_id=$1',
            [item.id],
          );
          if (old.rows[0]) {
            if (
              old.rows[0].content_hash !== hash(item) &&
              old.rows[0].content_hash !==
                createHash('sha256').update(JSON.stringify(item)).digest('hex')
            )
              throw new ApplicationError(
                'CONFLICT',
                'Evaluation identity already has different content.',
              );
            ids.push(old.rows[0].id);
            continue;
          }
          const subject = await sql.query<{ run_subject_id: string }>(
            'SELECT rs.run_subject_id FROM run_subject rs JOIN subject s ON s.subject_id=rs.subject_id WHERE rs.run_id=$1 AND s.subject_domain_id=$2',
            [rid, item.subjectId],
          );
          const eid = randomUUID();
          await sql.query(
            'INSERT INTO engineer_evaluation(id,domain_id,run_id,run_subject_id,context_id,target_id,summary_id,payload,content_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)',
            [
              eid,
              item.id,
              rid,
              subject.rows[0].run_subject_id,
              ctx.id,
              item.seriesTargetId,
              source.id,
              JSON.stringify(item),
              hash(item),
            ],
          );
          ids.push(eid);
        }
        await sql.query('DELETE FROM evaluation_current WHERE run_id=$1', [
          rid,
        ]);
        for (const [ordinal, eid] of ids.entries())
          await sql.query(
            'INSERT INTO evaluation_current(run_id,evaluation_id,ordinal) VALUES($1,$2,$3)',
            [rid, eid, ordinal],
          );
        return ids;
      },
    );
  }
}
export class PostgresDecisionRepository implements DecisionRepository {
  constructor(private db: SqlDatabase) {}
  async getStateByRun(id: string) {
    return this.db.transaction(async (sql) => {
      const rid = await run(sql, id, true);
      return {
        version: await version(sql, 'decision', rid),
        record: await decision(sql, rid),
      };
    });
  }
  async getByRun(id: string) {
    return (await this.getStateByRun(id)).record;
  }
  async saveByRun(id: string, record: DecisionRecord, cmd: RepositoryCommand) {
    const parsed = decisionContextSchema.safeParse(record.context);
    if (!parsed.success)
      throw new ApplicationError('VALIDATION', 'Invalid Decision context.');
    const context = parsed.data;
    if (!context.decision.conclusion.trim() || !context.decision.reason.trim())
      throw new ApplicationError(
        'VALIDATION',
        'Decision and scientific rationale are required.',
      );
    if (
      new Set(context.engineerEvaluationIds).size !==
      context.engineerEvaluationIds.length
    )
      throw new ApplicationError(
        'VALIDATION',
        'Duplicate Evaluation references.',
      );
    if (record.nextRunPreview) {
      try {
        const p = record.nextRunPreview;
        if (
          p.previousRunId !== id ||
          p.snapshot.id !== context.destinationRunId ||
          !Array.isArray(p.inherited) ||
          !Array.isArray(p.changed) ||
          validatePlanningSnapshot(p.snapshot).length
        )
          throw new Error('Invalid preview');
      } catch {
        throw new ApplicationError('VALIDATION', 'Invalid Next Run preview.');
      }
    }
    await commandWrite(
      this.db,
      'decision',
      id,
      record,
      cmd,
      async (sql, rid) => {
        const ctx = await readReasoningContext(sql, id);
        if (context.decision.experimentRunId !== id)
          throw new ApplicationError(
            'VALIDATION',
            'Decision belongs to another Run.',
          );
        const action = context.decision.nextAction;
        if (
          action &&
          !ctx.payload.catalog.nextActionTypes.some(
            (t) => t.id === action.nextActionTypeDefinitionId,
          )
        )
          throw new ApplicationError(
            'VALIDATION',
            'Exact Next Action definition is unavailable.',
          );
        const existing = await sql.query<{ id: string; content_hash: string }>(
          'SELECT id,content_hash FROM decision WHERE domain_id=$1',
          [context.decision.id],
        );
        if (existing.rows[0]) {
          if (existing.rows[0].content_hash !== hash(record))
            throw new ApplicationError(
              'CONFLICT',
              'Decision identity already has different content.',
            );
          return [existing.rows[0].id];
        }
        const eidRefs: string[] = [];
        for (const ref of context.engineerEvaluationIds) {
          const e = await sql.query<{ id: string }>(
            'SELECT id FROM engineer_evaluation WHERE run_id=$1 AND domain_id=$2',
            [rid, ref],
          );
          if (!e.rows[0])
            throw new ApplicationError(
              'VALIDATION',
              'Exact Engineer Evaluation is unavailable.',
            );
          eidRefs.push(e.rows[0].id);
        }
        for (const sid of context.targetScope.subjectIds) {
          const s = await sql.query(
            'SELECT 1 FROM run_subject rs JOIN subject s ON s.subject_id=rs.subject_id WHERE rs.run_id=$1 AND s.subject_domain_id=$2',
            [rid, sid],
          );
          if (!s.rowCount)
            throw new ApplicationError(
              'VALIDATION',
              'Decision Subject is outside this Run.',
            );
        }
        for (const oid of context.targetScope.operationIds) {
          const o = await sql.query(
            'SELECT 1 FROM run_operation WHERE run_id=$1 AND operation_domain_id=$2',
            [rid, oid],
          );
          if (!o.rowCount)
            throw new ApplicationError(
              'VALIDATION',
              'Decision Operation is outside this Run.',
            );
        }
        if (record.nextRunPreview && record.nextRunPreview.previousRunId !== id)
          throw new ApplicationError(
            'VALIDATION',
            'Next Run preview has another source Run.',
          );
        const did = randomUUID();
        const payload = {
          ...context,
          engineerEvaluationIds: [],
          targetAchievementReferences: [],
          decision: { ...context.decision, nextAction: null },
        };
        await sql.query(
          'INSERT INTO decision(id,domain_id,run_id,context_id,payload,preview,content_hash) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)',
          [
            did,
            context.decision.id,
            rid,
            ctx.id,
            JSON.stringify(payload),
            JSON.stringify(record.nextRunPreview),
            hash(record),
          ],
        );
        if (action)
          await sql.query(
            'INSERT INTO next_action(id,decision_id,type_revision_id,payload) VALUES($1,$2,$3,$4::jsonb)',
            [
              randomUUID(),
              did,
              action.nextActionTypeDefinitionId,
              JSON.stringify(action),
            ],
          );
        for (const [i, eid] of eidRefs.entries())
          await sql.query(
            'INSERT INTO decision_evaluation_ref VALUES($1,$2,$3)',
            [did, eid, i],
          );
        for (const [i, ref] of context.targetAchievementReferences.entries()) {
          const result = await summary(sql, rid, ref.measurementSummaryId);
          if (
            !ctx.payload.targetBindings.some(
              (b) =>
                b.target.id === ref.seriesTargetId &&
                b.target.parameterDefinitionId === result.parameter_id,
            )
          )
            throw new ApplicationError(
              'VALIDATION',
              'Decision Target does not match source result.',
            );
          await sql.query(
            'INSERT INTO decision_result_ref VALUES($1,$2,$3,$4,$5)',
            [did, result.id, ref.seriesTargetId, ref.status, i],
          );
        }
        return [did];
      },
    );
  }
}
