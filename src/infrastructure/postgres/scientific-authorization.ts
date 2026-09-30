import { ApplicationError } from '@/src/application/repository-ports';
import type { DxtApplication } from '@/src/application/dxt-application';
import type { Principal } from '@/src/application/authorization';
import type { SqlSession } from './sql-database';
import type { PostgresAuthorization } from './authorization';
import { subjectMeasurementResultSetSchema } from '@/src/domain/measurement/subject-measurement';
import {
  evaluationSchema,
  decisionContextSchema,
} from '@/src/application/reasoning-record';
const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => [k, canonical(x)]),
        )
      : v;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
/** Attribute only new scientific identities. Existing immutable authors are never rewritten. */
async function attribute(
  sql: SqlSession,
  table: string,
  record: { id: string } & Record<string, unknown>,
  key: string,
  principal: Principal,
) {
  const existing = (
    await sql.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM ${table} WHERE domain_id=$1`,
      [record.id],
    )
  ).rows[0];
  return {
    ...record,
    [key]: existing ? existing.payload[key] : principal.userId,
  };
}
export async function authorizeScientificInput(
  sql: SqlSession,
  app: DxtApplication,
  policy: PostgresAuthorization,
  principal: Principal,
  studyId: string,
  input: Record<string, unknown>,
) {
  const id = String(input.runId);
  if (input.operation === 'measurement.save') {
    const record = subjectMeasurementResultSetSchema.parse(input.record);
    const old = (await app.measurements.load(id)).record;
    // Row omission cannot delete immutable Measurement history; only new/changed rows mutate it.
    for (let i = 0; i < record.validityDecisions.length; i++)
      record.validityDecisions[i] = (await attribute(
        sql,
        'measurement_validity_decision',
        record.validityDecisions[i],
        'actor',
        principal,
      )) as (typeof record.validityDecisions)[number];
    const changed = (key: keyof typeof record) =>
      record[key].some(
        (row) =>
          !same(
            row,
            old[key].find((x) => x.id === row.id),
          ),
      );
    const validity = changed('validityDecisions');
    const observations = (
      ['executions', 'datasets', 'values', 'summaries'] as const
    ).some(changed);
    if (validity)
      await policy.require(principal, 'MANAGE_MEASUREMENT_VALIDITY', studyId);
    if (observations)
      await policy.require(principal, 'RECORD_MEASUREMENT', studyId);
    if (!validity && !observations) {
      const p = await policy.scientificPermissions(principal, studyId);
      if (!p.canRecordMeasurement && !p.canManageMeasurementValidity)
        throw new ApplicationError(
          'FORBIDDEN',
          'Scientific authoring permission required.',
        );
    }
    input.record = record;
  }
  if (input.operation === 'evaluation.save') {
    await policy.require(principal, 'AUTHOR_EVALUATION', studyId);
    const records = evaluationSchema.array().parse(input.records);
    const attributed = [];
    for (const row of records)
      attributed.push(
        await attribute(
          sql,
          'engineer_evaluation',
          row,
          'evaluator',
          principal,
        ),
      );
    input.records = attributed;
  }
  if (input.operation === 'decision.save') {
    await policy.require(principal, 'AUTHOR_DECISION', studyId);
    const record = input.record as {
      context: unknown;
      nextRunPreview: unknown;
    };
    const context = decisionContextSchema.parse(record.context);
    const previous = await app.reasoning.loadDecision(id);
    if (
      context.decision.nextAction ||
      previous.record?.context?.decision.nextAction ||
      record.nextRunPreview ||
      previous.record?.nextRunPreview
    )
      await policy.require(principal, 'AUTHOR_NEXT_ACTION', studyId);
    // Decision storage keeps the complete context under payload; preserve its original actor.
    const old = (
      await sql.query<{ payload: { decision: { recordedBy: string } } }>(
        'SELECT payload FROM decision WHERE domain_id=$1',
        [context.decision.id],
      )
    ).rows[0];
    context.decision.recordedBy =
      old?.payload.decision.recordedBy ?? principal.userId;
    input.record = { ...record, context };
  }
}
