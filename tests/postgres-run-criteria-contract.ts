import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { seedConfigurationRegistry } from '@/src/infrastructure/postgres/slice-seed';
import { provisionConfigurationCatalog } from '@/src/infrastructure/postgres/postgres-configuration-authoring';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { DxtApplication } from '@/src/application/dxt-application';
import { ApplicationError } from '@/src/application/repository-ports';
import type {
  CriteriaSaveInput,
  RunCriteriaState,
} from '@/src/application/run-criteria';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import {
  seedScientificTestPrincipal,
  scientificTestPrincipal,
} from './postgres-reasoning-fixtures';
const code = (expected: string) => (e: unknown) =>
  e instanceof ApplicationError && e.code === expected;
/** Runs against both native PostgreSQL and PGlite; independent synthetic data only. */
export async function runCriteriaContract(db: SqlDatabase) {
  await seedScientificTestPrincipal(db);
  const registry = structuredClone(
    configurationRepository.getConfigurationRegistry(),
  );
  const source = registry.packages.find(
    (p) => p.id === 'config-package-material-rd-v1',
  )!;
  const refs = [
    ...definitions.evaluations,
    ...definitions.evaluationCriteria,
    ...definitions.nextActionTypes,
  ].map((r) => ({ ...r, scope: source.scope }));
  const pkg = {
    ...source,
    id: 'criteria-contract-exact-package',
    packageId: 'criteria-contract',
    definitionRevisionIds: [
      ...source.definitionRevisionIds,
      ...refs.map((r) => r.id),
    ],
    nextActionTypeRevisionIds: definitions.nextActionTypes.map((r) => r.id),
  };
  await provisionConfigurationCatalog(db, definitions);
  await seedConfigurationRegistry(db, {
    ...registry,
    packages: [pkg],
    externalReferences: [
      ...registry.externalReferences,
      ...refs
        .filter((r) => !registry.externalReferences.some((e) => e.id === r.id))
        .map((r) => ({ id: r.id, scope: r.scope })),
    ],
  });
  await provisionMeasurementReferences(db, definitions);
  const config = await hydrateConfigurationPackages(db, [
    'config-package-material-rd-v1',
    pkg.id,
  ]);
  const app = new DxtApplication(
    createProductionSliceRepositories(db, config, scientificTestPrincipal),
  );
  const original = await app.createRunFromStudy(
    'adhesion-material-optimization',
    'STUDY_DEFAULT',
    'criteria-runtime-source',
  );
  const snapshot = await app.repositories.run.saveSnapshot(
    {
      ...original,
      id: 'criteria-runtime-generic-run',
      configurationPackageVersionId: pkg.id,
    },
    { commandId: 'criteria-runtime-run' },
  );
  const operation = async (
    op: string,
    input?: unknown,
    commandId = randomUUID(),
    principal = scientificTestPrincipal,
  ) =>
    authorizedOperation(
      db,
      principal,
      { operation: op, runId: snapshot.id, input, commandId },
      async () => {
        throw new Error('Criteria bypassed trusted route');
      },
    ) as Promise<RunCriteriaState>;
  const initial = await operation('run.criteria.load');
  assert.equal(initial.origin, 'ABSENT');
  assert.equal(initial.activeContextId, null);
  assert.equal(
    (await app.repositories.evaluation.getContext!(snapshot.id)).targetBindings
      .length,
    0,
  );
  const base = lifecycleAuthoringProfiles['adhesion-material-optimization'];
  const binding = structuredClone(
    base.targetBindings.find(
      (b) => b.target.parameterDefinitionId === 'parameter-peel-force-v1',
    )!,
  );
  binding.target.threshold = 0;
  binding.target.operator = 'GTE';
  binding.target.lowerBound = null;
  binding.target.upperBound = null;
  const input: CriteriaSaveInput = {
    revisionId: randomUUID(),
    definitionId: randomUUID(),
    expectedRevision: 0,
    expectedSequence: 0,
    rationale: 'Explicit isolated numeric zero criteria',
    criteria: {
      packageVersionId: snapshot.configurationPackageVersionId,
      targetBindings: [binding],
      evaluationIds: base.catalog.evaluations.map((e) => e.id),
      nextActionIds: [],
      confirmed: true,
    },
  };
  const command = randomUUID();
  const saved = await operation('run.criteria.save', input, command);
  assert.equal(saved.sequence, 1);
  assert.equal(saved.activeContextId, input.revisionId);
  assert.equal(saved.origin, 'ABSENT');
  assert.equal(saved.creationContextId, null);
  assert.equal(
    (await operation('run.criteria.save', input, command)).sequence,
    1,
    'uncertain save retry creates neither revision nor adoption twice',
  );
  await assert.rejects(
    operation(
      'run.criteria.save',
      { ...input, rationale: 'changed retry' },
      command,
    ),
    code('CONFLICT'),
  );
  const actualModel = createExperimentWorkspace(snapshot, config);
  let state: import('@/src/features/run-registration/lifecycle-authoring').AuthoredLifecycleState = await app.loadPersistedLifecycle(snapshot.id, 'ALL');
  state = await app.recordActual(state, actualModel, {
    id: 'criteria-actual',
    operationId: actualModel.operations.find((o) => o.role === 'PROCESS')!.id,
    subjectId: actualModel.subjects[0].id,
    status: 'COMPLETED',
    startedAt: '2026-11-20T01:00:00Z',
    endedAt: '2026-11-20T01:30:00Z',
    actualOverrides: {},
  });
  state = await app.recordMeasurement(
    state,
    actualModel,
    state.measurementCatalog!,
    {
      id: 'criteria-measurement',
      operationId: actualModel.operations.find((o) => o.role === 'MEASUREMENT')!
        .id,
      subjectId: actualModel.subjects[0].id,
      parameterDefinitionId: binding.target.parameterDefinitionId,
      measurementPoint: binding.measurementPoint,
      value: '5.8',
      grain: 'SUBJECT',
      coordinateValues: [],
      recordedAt: '2026-11-20T02:00:00Z',
    },
  );
  state = await app.loadPersistedLifecycle(snapshot.id, 'ALL');
  const summary = state.measurementResults.summaries.find(
    (s) => s.parameterDefinitionId === binding.target.parameterDefinitionId,
  )!;
  assert.ok(summary);
  state = await app.recordEvaluation(state, {
    id: 'criteria-evaluation',
    subjectId: summary.subjectId,
    seriesTargetId: binding.target.id,
    measurementSummaryId: summary.id,
    disposition: 'INFORMATIVE',
    comment: 'Saved under first explicit criteria',
    evaluator: state.actor!,
    evaluatedAt: '2026-11-20T03:00:00Z',
  });
  state = await app.recordDecision(state, state.measurementCatalog!, {
    id: 'criteria-decision',
    decisionStatement: 'Preserve exploratory conclusion',
    conclusion: 'Preserve exploratory conclusion',
    reason: 'No continuation required',
    nextActionTypeDefinitionId: '',
    nextActionNote: '',
    evaluationIds: ['criteria-evaluation'],
    targetReferences: [
      {
        seriesTargetId: binding.target.id,
        measurementSummaryId: summary.id,
        status: 'ACHIEVED',
      },
    ],
    targetSubjectIds: [summary.subjectId],
    targetOperationIds: [],
    recordedBy: state.actor!,
    recordedAt: '2026-11-20T03:05:00Z',
    nextRunChange: null,
  });
  assert.equal(
    state.decisionContext!.decision.nextAction,
    null,
    'Next Action is optional',
  );
  const evalBefore = await app.repositories.evaluation.getStateByRun(
      snapshot.id,
    ),
    decisionBefore = await app.repositories.decision.getStateByRun(snapshot.id);
  const evRetry = {
    commandId: 'historical-eval-receipt',
    expectedVersion: evalBefore.version,
    expectedInterpretation: state.interpretation!,
  };
  const dcRetry = {
    commandId: 'historical-decision-receipt',
    expectedVersion: decisionBefore.version,
    expectedInterpretation: state.interpretation!,
  };
  await app.repositories.evaluation.saveByRun(
    snapshot.id,
    evalBefore.record,
    evRetry,
  );
  await app.repositories.decision.saveByRun(
    snapshot.id,
    decisionBefore.record!,
    dcRetry,
  );
  const newer = structuredClone(input);
  newer.revisionId = randomUUID();
  newer.expectedRevision = 1;
  newer.expectedSequence = 1;
  newer.criteria.targetBindings[0].target.threshold = 100;
  const second = await operation('run.criteria.save', newer);
  assert.equal(second.sequence, 2);
  assert.equal(
    second.revisions.find((r) => r.id === newer.revisionId)!.revision,
    2,
  );
  await assert.rejects(
    operation('run.criteria.adopt', {
      contextId: input.revisionId,
      expectedSequence: 1,
      rationale: 'stale',
    }),
    code('CONFLICT'),
  );
  await app.repositories.evaluation.saveByRun(
    snapshot.id,
    evalBefore.record,
    evRetry,
  );
  await app.repositories.decision.saveByRun(
    snapshot.id,
    decisionBefore.record!,
    dcRetry,
  );
  assert.equal(
    (
      await app.repositories.evaluation.getStateByRun(snapshot.id)
    ).provenance!.find((r) => r.recordId === 'criteria-evaluation')!.contextId,
    input.revisionId,
  );
  assert.equal(
    (
      await app.repositories.decision.getStateByRun(snapshot.id)
    ).provenance!.find((r) => r.recordId === 'criteria-decision')!.contextId,
    input.revisionId,
  );
  const reloaded = await app.loadPersistedLifecycle(snapshot.id, 'ALL');
  assert.equal(reloaded.engineerEvaluations.length, 0);
  assert.equal(reloaded.decisionContext, null);
  assert.equal(reloaded.evaluationProvenance!.length, 1);
  await assert.rejects(
    app.repositories.evaluation.saveByRun(
      snapshot.id,
      [{ ...evalBefore.record[0], id: 'stale-new-evaluation' }],
      {
        commandId: 'stale-new-eval',
        expectedVersion: (
          await app.repositories.evaluation.getStateByRun(snapshot.id)
        ).version,
        expectedInterpretation: state.interpretation!,
      },
    ),
    code('CONFLICT'),
  );
  await assert.rejects(
    db.query(
      'UPDATE reasoning_criteria_revision SET payload=payload WHERE id=$1',
      [input.revisionId],
    ),
    /immutable/,
  );
  await db.query(
    "INSERT INTO auth_principal VALUES('criteria-denied','criteria-denied',true,'ADMIN')",
  );
  await assert.rejects(
    operation('run.criteria.save', newer, randomUUID(), 'criteria-denied'),
    code('FORBIDDEN'),
  );
  const study = (
    await db.query<{ study_id: string }>(
      'SELECT study_id FROM experiment_run WHERE run_domain_id=$1',
      [snapshot.id],
    )
  ).rows[0];
  await db.query(
    "UPDATE study_access_grant SET active=false WHERE study_id=$1 AND principal_id=$2 AND action='MANAGE_REASONING_CONTEXT'",
    [study.study_id, scientificTestPrincipal],
  );
  try {
    await assert.rejects(
      operation('run.criteria.save', input, command),
      code('FORBIDDEN'),
    );
  } finally {
    await db.query(
      "UPDATE study_access_grant SET active=true WHERE study_id=$1 AND principal_id=$2 AND action='MANAGE_REASONING_CONTEXT'",
      [study.study_id, scientificTestPrincipal],
    );
  }
  const processSnapshot = await app.repositories.run.saveSnapshot(
    {
      ...snapshot,
      id: 'criteria-process-only',
      steps: snapshot.steps.filter((o) => o.role !== 'MEASUREMENT'),
      measurements: [],
      subjectOperationIds: Object.fromEntries(
        Object.entries(snapshot.subjectOperationIds ?? {}).map(([id, ops]) => [
          id,
          ops.filter((op) =>
            snapshot.steps.some((s) => s.id === op && s.role !== 'MEASUREMENT'),
          ),
        ]),
      ),
    },
    { commandId: 'criteria-process-only' },
  );
  await assert.rejects(
    authorizedOperation(
      db,
      scientificTestPrincipal,
      {
        operation: 'run.criteria.adopt',
        runId: processSnapshot.id,
        input: {
          contextId: input.revisionId,
          expectedSequence: 0,
          rationale: 'incompatible measurement',
        },
        commandId: randomUUID(),
      },
      async () => null,
    ),
    code('VALIDATION'),
  );
  const raced = await Promise.allSettled(
    [1, 2].map(() =>
      operation(
        'run.criteria.save',
        {
          ...newer,
          revisionId: randomUUID(),
          expectedRevision: 2,
          expectedSequence: 2,
        },
        randomUUID(),
      ),
    ),
  );
  assert.equal(
    raced.filter((r) => r.status === 'fulfilled').length,
    1,
    'one atomic revision/adoption wins CAS race',
  );
  const family = (
    await db.query<{ count: string }>(
      'SELECT count(*) count FROM reasoning_criteria_revision WHERE definition_id=$1',
      [input.definitionId],
    )
  ).rows[0];
  assert.equal(
    Number(family.count),
    3,
    'losing adoption leaves no orphan criteria revision',
  );
  await db.query('CREATE ROLE criteria_untrusted NOLOGIN');
  await db.query('SET ROLE criteria_untrusted');
  try {
    await assert.rejects(
      db.query(
        'SELECT append_run_reasoning_adoption($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          randomUUID(),
          study.study_id,
          input.revisionId,
          0,
          scientificTestPrincipal,
          'forged',
          'forged',
          'forged',
        ],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query('SELECT * FROM reasoning_criteria_revision'),
      /permission denied/,
    );
  } finally {
    await db.query('RESET ROLE');
    await db.query('DROP ROLE criteria_untrusted');
  }
  assert.deepEqual(
    await app.repositories.run.getSnapshot(snapshot.id),
    snapshot,
    'historical Plan unchanged',
  );
  return { snapshot, input, newer };
}
