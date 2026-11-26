import { createHash, randomUUID } from 'node:crypto';
import { ApplicationError } from '@/src/application/repository-ports';
import {
  criteriaSaveSchema,
  criteriaAdoptSchema,
  type RunCriteriaState,
} from '@/src/application/run-criteria';
import {
  reasoningPrerequisites,
  type StudyReasoningContext,
} from '@/src/application/study-readiness';
import {
  referenceCatalogSchema,
  type ReferenceCatalog,
} from '@/src/domain/reference';
import type { SqlSession } from './sql-database';
import { PostgresAuthorization, resolvePrincipal } from './authorization';
import { readConfigurationAuthoring } from './postgres-configuration-authoring';
import { readMeasurementCatalog } from './measurement-references';
const hash = (x: unknown) =>
  createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail = (message: string): never => {
  throw new ApplicationError('VALIDATION', message);
};
async function root(sql: SqlSession, runId: string, lock = false) {
  const r = (
    await sql.query<{
      run_id: string;
      study_id: string;
      configuration_package_version_id: string;
    }>(
      `SELECT run_id,study_id,configuration_package_version_id FROM experiment_run WHERE run_domain_id=$1${lock ? ' FOR UPDATE' : ''}`,
      [runId],
    )
  ).rows[0];
  if (!r) throw new ApplicationError('NOT_FOUND', 'Run is unavailable.');
  return r;
}
async function exactCatalog(
  sql: SqlSession,
  pin: string,
  principalId: string,
): Promise<ReferenceCatalog> {
  const p = (
    await sql.query<{
      payload: {
        definitionRevisionIds: string[];
        nextActionTypeRevisionIds: string[];
      };
    }>(
      'SELECT payload FROM configuration_package_version WHERE package_version_id=$1',
      [pin],
    )
  ).rows[0];
  if (!p)
    throw new ApplicationError(
      'NOT_FOUND',
      'Experiment references are unavailable.',
    );
  const source = await readConfigurationAuthoring(sql, {
    principalId,
    packageIds: [pin],
  });
  const ids = new Set(p.payload.definitionRevisionIds);
  const catalog = referenceCatalogSchema.parse(
    Object.fromEntries(
      Object.entries(source.catalog).map(([kind, items]) => [
        kind,
        items.filter((item) =>
          kind === 'nextActionTypes'
            ? p.payload.nextActionTypeRevisionIds.includes(item.id)
            : ids.has(item.id),
        ),
      ]),
    ),
  );
  const measurement = await readMeasurementCatalog(sql, pin);
  for (const key of [
    'parameters',
    'units',
    'measurementOperations',
    'coordinateSets',
    'coordinateDefinitions',
  ] as const)
    Object.assign(catalog, { [key]: measurement[key] });
  return catalog;
}
export async function readRunCriteria(
  sql: SqlSession,
  runId: string,
  principalId: string,
): Promise<RunCriteriaState> {
  const r = await root(sql, runId),
    policy = new PostgresAuthorization(sql),
    principal = await resolvePrincipal(sql, principalId);
  await policy.require(principal, 'VIEW_EVALUATION', r.study_id);
  const state = (
    await sql.query<{
      origin_state: RunCriteriaState['origin'];
      creation_context_id: string | null;
      interpretation_context_id: string | null;
      interpretation_sequence: string;
    }>('SELECT * FROM run_reasoning_resolution WHERE run_id=$1', [r.run_id])
  ).rows[0];
  if (!state)
    throw new ApplicationError(
      'PERSISTENCE',
      'Run criteria could not be loaded. Reload and try again.',
    );
  const revisions = (
    await sql.query<{
      id: string;
      definition_id: string;
      revision: number;
      payload: StudyReasoningContext;
    }>(
      'SELECT id,definition_id,revision,payload FROM reasoning_criteria_revision WHERE study_id=$1 AND package_version_id=$2 ORDER BY recorded_at NULLS FIRST,definition_id,revision',
      [r.study_id, r.configuration_package_version_id],
    )
  ).rows;
  const plans = (
    await sql.query<{
      measurement_point: string;
      parameter_definition_ids: string[];
    }>(
      'SELECT m.measurement_point,ARRAY(SELECT p.parameter_definition_id FROM run_measurement_plan_parameter p WHERE p.measurement_plan_id=m.measurement_plan_id ORDER BY p.ordinal) parameter_definition_ids FROM run_measurement_plan m WHERE m.run_id=$1',
      [r.run_id],
    )
  ).rows;
  return {
    runId,
    packageVersionId: r.configuration_package_version_id,
    actor: principal.userId,
    canManage:
      (
        await policy.authorize(
          principal,
          'MANAGE_REASONING_CONTEXT',
          r.study_id,
        )
      ).effect === 'ALLOW',
    origin: state.origin_state,
    creationContextId: state.creation_context_id,
    activeContextId: state.interpretation_context_id,
    sequence: Number(state.interpretation_sequence),
    revisions: revisions.map((v) => ({
      id: v.id,
      definitionId: v.definition_id,
      revision: v.revision,
      context: v.payload,
    })),
    catalog: await exactCatalog(
      sql,
      r.configuration_package_version_id,
      principalId,
    ),
    plans: plans.map((p) => ({
      point: p.measurement_point,
      parameterIds: p.parameter_definition_ids,
    })),
  };
}
export async function runCriteriaOperation(
  sql: SqlSession,
  principalId: string,
  op: string,
  runId: string,
  raw: unknown,
  commandId: string,
) {
  const r = await root(sql, runId, op !== 'run.criteria.load'),
    policy = new PostgresAuthorization(sql),
    principal = await resolvePrincipal(sql, principalId);
  await policy.require(
    principal,
    op === 'run.criteria.load' ? 'VIEW_EVALUATION' : 'MANAGE_REASONING_CONTEXT',
    r.study_id,
  );
  if (op === 'run.criteria.load')
    return readRunCriteria(sql, runId, principalId);
  if (!commandId) fail('Reload and try saving again.');
  try {
    if (op === 'run.criteria.save') {
      const parsed = criteriaSaveSchema.safeParse(raw);
      if (!parsed.success)
        fail('Check the Target values and selected references.');
      const input = parsed.data!;
      if (
        input.criteria.packageVersionId !== r.configuration_package_version_id
      )
        fail('Choose criteria for this Run’s experiment references.');
      const exact = await exactCatalog(
        sql,
        r.configuration_package_version_id,
        principalId,
      );
      const catalog = {
        ...exact,
        evaluations: exact.evaluations.filter((e) =>
          input.criteria.evaluationIds.includes(e.id),
        ),
        nextActionTypes: exact.nextActionTypes.filter(
          (e) => input.criteria.nextActionIds.includes(e.id) && e.active,
        ),
      };
      if (
        catalog.evaluations.length !==
          new Set(input.criteria.evaluationIds).size ||
        catalog.nextActionTypes.length !==
          new Set(input.criteria.nextActionIds).size
      )
        fail('Selected Evaluation or Next Action references are unavailable.');
      if (
        catalog.evaluations.some((e) =>
          e.criterionDefinitionIds.some(
            (id) => !catalog.evaluationCriteria.some((c) => c.id === id),
          ),
        )
      )
        fail('Selected Evaluation criteria are unavailable.');
      const payload = {
        targetBindings: input.criteria.targetBindings,
        catalog,
      };
      if (reasoningPrerequisites(payload, exact).length)
        fail(
          'Check the numeric Target, unit, measurement point and Evaluation reference.',
        );
      const plans = (
        await sql.query<{
          measurement_point: string;
          parameter_definition_ids: string[];
        }>(
          'SELECT m.measurement_point,ARRAY(SELECT p.parameter_definition_id FROM run_measurement_plan_parameter p WHERE p.measurement_plan_id=m.measurement_plan_id ORDER BY p.ordinal) parameter_definition_ids FROM run_measurement_plan m WHERE m.run_id=$1',
          [r.run_id],
        )
      ).rows;
      if (
        payload.targetBindings.some(
          (b) =>
            !plans.some(
              (p) =>
                p.measurement_point === b.measurementPoint &&
                p.parameter_definition_ids.includes(
                  b.target.parameterDefinitionId,
                ),
            ),
        )
      )
        fail(
          'Add the matching Measurement plan before configuring these Evaluation Criteria.',
        );
      await sql.query(
        'SELECT create_reasoning_criteria_revision($1,$2,$3,$4,$5,$6,$7)',
        [
          input.revisionId,
          input.definitionId,
          r.study_id,
          r.configuration_package_version_id,
          input.expectedRevision,
          principalId,
          payload,
        ],
      );
      await sql.query(
        'SELECT append_run_reasoning_adoption($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          randomUUID(),
          r.run_id,
          input.revisionId,
          input.expectedSequence,
          principalId,
          commandId,
          hash(input),
          input.rationale,
        ],
      );
    } else if (op === 'run.criteria.adopt') {
      const parsed = criteriaAdoptSchema.safeParse(raw);
      if (!parsed.success)
        fail('Select Evaluation Criteria and explain the change.');
      const input = parsed.data!;
      const chosen = (
        await sql.query<{ payload: StudyReasoningContext }>(
          'SELECT payload FROM reasoning_criteria_revision WHERE id=$1 AND study_id=$2 AND package_version_id=$3',
          [input.contextId, r.study_id, r.configuration_package_version_id],
        )
      ).rows[0];
      const plans = (
        await sql.query<{
          measurement_point: string;
          parameter_definition_ids: string[];
        }>(
          'SELECT m.measurement_point,ARRAY(SELECT p.parameter_definition_id FROM run_measurement_plan_parameter p WHERE p.measurement_plan_id=m.measurement_plan_id ORDER BY p.ordinal) parameter_definition_ids FROM run_measurement_plan m WHERE m.run_id=$1',
          [r.run_id],
        )
      ).rows;
      if (
        !chosen ||
        chosen.payload.targetBindings.some(
          (b) =>
            !plans.some(
              (p) =>
                p.measurement_point === b.measurementPoint &&
                p.parameter_definition_ids.includes(
                  b.target.parameterDefinitionId,
                ),
            ),
        )
      )
        fail('Selected criteria do not match this Run’s Measurement plan.');
      await sql.query(
        'SELECT append_run_reasoning_adoption($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          randomUUID(),
          r.run_id,
          input.contextId,
          input.expectedSequence,
          principalId,
          commandId,
          hash(input),
          input.rationale,
        ],
      );
    } else fail('This criteria action is unavailable.');
    return readRunCriteria(sql, runId, principalId);
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    const code = (error as { code?: string })?.code;
    throw new ApplicationError(
      code === '40001' || code === '23505'
        ? 'CONFLICT'
        : code === '42501'
          ? 'FORBIDDEN'
          : 'VALIDATION',
      code === '40001' || code === '23505'
        ? 'Evaluation Criteria changed. Reload before saving.'
        : code === '42501'
          ? 'You do not have permission to change Evaluation Criteria.'
          : 'Could not save Evaluation Criteria. Check the Target values and selected references, then try again.',
      { cause: error },
    );
  }
}
