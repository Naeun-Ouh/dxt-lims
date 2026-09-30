import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import {
  handleRepositoryRequest,
  dispatchRepository,
} from '@/app/api/repository/route';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { DxtApplication } from '@/src/application/dxt-application';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import {
  createEmptyLifecycleState,
  recordActualExecution,
  recordManualMeasurement,
  recordEngineerEvaluation,
  recordDecisionAndNextAction,
} from '@/src/features/run-registration/lifecycle-authoring';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { SavedAnalysisView } from '@/src/domain/analysis';

export async function scientificAuthorizationContract(db: SqlDatabase) {
  const call = (p: string, input: Record<string, unknown>) =>
    authorizedOperation(db, `science-${p}`, input, dispatchRepository);
  const api = async (p: string, input: Record<string, unknown>) => {
    const response = await handleRepositoryRequest(
      new Request('http://localhost/api/repository', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-role': 'ADMIN',
          'x-principal-id': 'science-owner',
        },
        body: JSON.stringify(input),
      }),
      (i, d) =>
        authorizedOperation(db, `science-${p}`, i, d ?? dispatchRepository),
    );
    return {
      status: response.status,
      data: (await response.json()) as Record<string, unknown>,
    };
  };
  const ok = async (p: string, input: Record<string, unknown>) => {
    const r = await api(p, input);
    assert.equal(r.status, 200, JSON.stringify(r));
    return r.data;
  };
  await db.query(
    "INSERT INTO auth_org_unit VALUES('science-part','PART',NULL),('science-dept','DEPARTMENT','science-part'),('science-other','DEPARTMENT',NULL)",
  );
  for (const p of [
    'owner',
    'viewer',
    'operator',
    'measurer',
    'validity',
    'evaluator',
    'decider',
    'collaborator',
    'leader',
    'admin',
    'outsider',
  ])
    await db.query('INSERT INTO auth_principal VALUES($1,$2,true,$3)', [
      `science-${p}`,
      `user-${p}`,
      p === 'admin' ? 'ADMIN' : 'GENERAL_USER',
    ]);
  for (const p of [
    'viewer',
    'operator',
    'measurer',
    'validity',
    'evaluator',
    'decider',
  ])
    await db.query(
      "INSERT INTO auth_membership VALUES($1,'science-dept',false)",
      [`science-${p}`],
    );
  await db.query(
    "INSERT INTO auth_membership VALUES('science-leader','science-part',true)",
  );
  await db.query(
    "INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) SELECT study_id,'science-owner','science-dept' FROM study ON CONFLICT(study_id) DO UPDATE SET responsible_user_id='science-owner',responsible_department_id='science-dept',visibility='RESPONSIBLE_DEPARTMENT'",
  );
  const grant = async (p: string, action: string, slug?: string) =>
    db.query(
      'INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) SELECT $1||study_id,study_id,$2,$3,$4 FROM study WHERE ($5::text IS NULL OR series_slug=$5)',
      [randomUUID(), `science-${p}`, action, 'science-owner', slug ?? null],
    );
  for (const [p, a] of [
    ['operator', 'RECORD_ACTUAL'],
    ['measurer', 'RECORD_MEASUREMENT'],
    ['validity', 'MANAGE_MEASUREMENT_VALIDITY'],
    ['evaluator', 'AUTHOR_EVALUATION'],
    ['decider', 'AUTHOR_DECISION'],
    ['collaborator', 'VIEW_RUN'],
    ['collaborator', 'AUTHOR_EVALUATION'],
  ])
    await grant(p, a);
  const config = await hydrateConfigurationPackages(
    db,
    (
      await db.query<{ id: string }>(
        'SELECT DISTINCT configuration_package_version_id id FROM study_setup_version',
      )
    ).rows.map((r) => r.id),
  );
  const trusted = new DxtApplication(
    createProductionSliceRepositories(db, config),
  );
  const proofs = [];
  const counts = async () => {
    const result = [];
    for (const table of [
      'execution_event',
      'measurement_dataset',
      'measurement_value',
      'measurement_validity_decision',
      'engineer_evaluation',
      'decision',
      'next_action',
    ])
      result.push((await db.query(`SELECT count(*) FROM ${table}`)).rows);
    return result;
  };
  const denied = async (
    input: Record<string, unknown>,
    personas = ['viewer', 'leader', 'admin'],
  ) => {
    const before = await counts();
    for (const p of personas)
      assert.equal(
        (await api(p, input)).status,
        403,
        `${p} ${String(input.operation)}`,
      );
    assert.deepEqual(await counts(), before);
  };
  for (const [slug, parameterId, grain, value] of [
    ['dts-improvement', 'parameter-bcd-v1', 'SITE', '17'],
    [
      'adhesion-material-optimization',
      'parameter-peel-force-v1',
      'SUBJECT',
      '5.8',
    ],
  ] as const) {
    const snapshot = (await call('owner', {
      operation: 'run.create',
      slug,
      commandId: randomUUID(),
    })) as RunPlanningSnapshot;
    const model = createExperimentWorkspace(snapshot, config),
      profile = lifecycleAuthoringProfiles[slug];
    const context = await trusted.reasoning.context(snapshot.id);
    let state = {
      ...createEmptyLifecycleState(snapshot, profile),
      targetBindings: context.targetBindings,
      measurementCatalog: context.catalog,
    };
    const actual = recordActualExecution(state, model, {
      id: randomUUID(),
      operationId: model.operations.find((o) => o.role === 'PROCESS')!.id,
      subjectId: model.subjects[0].id,
      status: 'COMPLETED',
      startedAt: '2026-09-20T00:00:00.000Z',
      endedAt: '2026-09-20T00:01:00.000Z',
      actualOverrides: {},
    });
    const actualRequest = {
      operation: 'execution.save',
      runId: snapshot.id,
      records: actual.actualEvidence,
      command: { commandId: randomUUID(), expectedVersion: 0 },
    };
    await denied(actualRequest);
    await denied(actualRequest, ['measurer', 'evaluator']);
    await ok('operator', actualRequest);
    state = {
      ...actual,
      targetBindings: context.targetBindings,
      measurementCatalog: context.catalog,
    };
    const badActual = {
      ...actualRequest,
      records: [
        {
          ...actual.actualEvidence[0],
          event: { ...actual.actualEvidence[0].event, id: randomUUID() },
          resolvedSubjectId: 'foreign-subject',
        },
      ],
      command: { commandId: randomUUID(), expectedVersion: 1 },
    };
    assert.equal((await api('owner', badActual)).status, 409);
    await grant('admin', 'RECORD_ACTUAL', slug);
    assert.equal((await api('admin', badActual)).status, 409);
    const permissions = (await call('owner', {
      operation: 'run.planning',
      runId: snapshot.id,
    })) as { scientificPermissions: Record<string, boolean> };
    assert.ok(Object.values(permissions.scientificPermissions).every(Boolean));
    const operation = model.operations.find((o) => o.role === 'MEASUREMENT')!;
    const coordinates =
      grain === 'SITE'
        ? context.catalog.coordinateSets
            .find((c) =>
              c.measurementOperationDefinitionIds.includes(
                operation.operationDefinitionRevisionId,
              ),
            )!
            .coordinateDefinitionIds.map((id, i) => ({
              coordinateDefinitionId: id,
              value: i,
            }))
        : [];
    const measured = recordManualMeasurement(state, model, context.catalog, {
      id: randomUUID(),
      operationId: operation.id,
      subjectId: model.subjects[0].id,
      parameterDefinitionId: parameterId,
      measurementPoint: snapshot.measurements[0].point,
      value,
      grain,
      siteIdentity: grain === 'SITE' ? 'S1' : undefined,
      coordinateValues: coordinates,
      recordedAt: '2026-09-20T00:02:00.000Z',
    });
    const measurementRequest = {
      operation: 'measurement.save',
      runId: snapshot.id,
      record: measured.measurementResults,
      command: { commandId: randomUUID(), expectedVersion: 0 },
    };
    await denied(measurementRequest);
    await denied(measurementRequest, ['evaluator', 'validity']);
    await ok('measurer', measurementRequest);
    state = {
      ...measured,
      targetBindings: context.targetBindings,
      measurementCatalog: context.catalog,
    };
    const valid = structuredClone(measured.measurementResults);
    valid.validityDecisions.push({
      id: randomUUID(),
      measurementValueId: valid.values[0].id,
      state: 'EXCLUDED',
      reason: 'Check handling',
      actor: 'forged-admin',
      decidedAt: '2026-09-20T00:03:00.000Z',
    });
    const validityRequest = {
      operation: 'measurement.save',
      runId: snapshot.id,
      record: valid,
      command: { commandId: randomUUID(), expectedVersion: 1 },
    };
    await denied(validityRequest);
    await denied(validityRequest, ['measurer']);
    const mixed = {
      ...validityRequest,
      record: {
        ...valid,
        values: [...valid.values, { ...valid.values[0], id: randomUUID() }],
      },
    };
    await denied(mixed, ['measurer', 'validity']);
    await ok('validity', validityRequest);
    let stored = await trusted.measurements.load(snapshot.id);
    assert.equal(stored.record.validityDecisions[0].actor, 'user-validity');
    const restored = structuredClone(stored.record);
    restored.validityDecisions.push({
      id: randomUUID(),
      measurementValueId: valid.values[0].id,
      state: 'INCLUDED',
      reason: 'Checked',
      actor: 'forged-owner',
      decidedAt: '2026-09-20T00:04:00.000Z',
    });
    const restore = {
      operation: 'measurement.save',
      runId: snapshot.id,
      record: restored,
      command: { commandId: randomUUID(), expectedVersion: 2 },
    };
    await denied(restore, ['measurer']);
    await ok('validity', restore);
    await ok('validity', restore);
    stored = await trusted.measurements.load(snapshot.id);
    assert.equal(stored.record.validityDecisions[1].actor, 'user-validity');
    state = { ...state, measurementResults: stored.record };
    const summary = state.measurementResults.summaries[0],
      target = context.targetBindings.find(
        (t) => t.target.parameterDefinitionId === summary.parameterDefinitionId,
      )!;
    const evaluated = recordEngineerEvaluation(state, {
      id: randomUUID(),
      subjectId: summary.subjectId,
      seriesTargetId: target.target.id,
      measurementSummaryId: summary.id,
      disposition: 'ACCEPT',
      comment: 'Controlled evidence',
      evaluator: 'forged-author',
      evaluatedAt: '2026-09-20T00:05:00.000Z',
    });
    const evaluationRequest = {
      operation: 'evaluation.save',
      runId: snapshot.id,
      records: evaluated.engineerEvaluations,
      command: { commandId: randomUUID(), expectedVersion: 0 },
    };
    await denied(evaluationRequest);
    await denied(evaluationRequest, ['measurer', 'decider']);
    await ok('evaluator', evaluationRequest);
    await ok('evaluator', evaluationRequest);
    const evaluations = await trusted.reasoning.loadEvaluation(snapshot.id);
    assert.equal(evaluations.record[0].evaluator, 'user-evaluator');
    const invalidEval = {
      ...evaluationRequest,
      records: [
        {
          ...evaluations.record[0],
          id: randomUUID(),
          measurementSummaryId: 'missing-summary',
        },
      ],
      command: { commandId: randomUUID(), expectedVersion: 1 },
    };
    assert.equal((await api('collaborator', invalidEval)).status, 409);
    state = {
      ...evaluated,
      engineerEvaluations: evaluations.record,
      targetBindings: context.targetBindings,
      measurementCatalog: context.catalog,
    };
    const decided = recordDecisionAndNextAction(state, context.catalog, {
      id: randomUUID(),
      decisionStatement: 'Repeat controlled trial',
      conclusion: 'Continue',
      reason: 'Evidence supports follow-up',
      nextActionTypeDefinitionId: context.catalog.nextActionTypes.find(
        (t) => t.code === 'DESIGN_NEXT_EXPERIMENT',
      )!.id,
      nextActionNote: 'New scientific iteration',
      evaluationIds: state.engineerEvaluations.map((e) => e.id),
      targetReferences: [],
      targetSubjectIds: [summary.subjectId],
      targetOperationIds: [],
      recordedBy: 'forged-decision-author',
      recordedAt: '2026-09-20T00:06:00.000Z',
      nextRunChange: null,
    });
    const decisionRequest = {
      operation: 'decision.save',
      runId: snapshot.id,
      record: {
        context: decided.decisionContext,
        nextRunPreview: decided.nextRunPreview,
      },
      command: { commandId: randomUUID(), expectedVersion: 0 },
    };
    await denied(decisionRequest);
    await denied(decisionRequest, ['evaluator', 'collaborator', 'decider']);
    await grant('decider', 'AUTHOR_NEXT_ACTION', slug);
    await ok('decider', decisionRequest);
    await ok('decider', decisionRequest);
    const decision = await trusted.reasoning.loadDecision(snapshot.id);
    assert.equal(decision.record?.context?.decision.recordedBy, 'user-decider');
    for (const op of [
      'execution.load',
      'measurement.load',
      'evaluation.load',
      'evaluation.context',
      'decision.load',
    ]) {
      await ok('viewer', { operation: op, runId: snapshot.id });
      assert.equal(
        (await api('outsider', { operation: op, runId: snapshot.id })).status,
        404,
      );
    }
    const before = await trusted.reasoning.loadEvaluation(snapshot.id);
    await db.query(
      "DELETE FROM auth_membership WHERE principal_id='science-evaluator'",
    );
    assert.equal(
      (
        await api('evaluator', {
          operation: 'evaluation.load',
          runId: snapshot.id,
        })
      ).status,
      404,
    );
    assert.deepEqual(
      await trusted.reasoning.loadEvaluation(snapshot.id),
      before,
    );
    await db.query(
      "INSERT INTO auth_membership VALUES('science-evaluator','science-dept',false)",
    );
    const plan = await trusted.runs.loadPlanning(snapshot.id);
    const participationAttempt = {...plan!, snapshot: {...plan!.snapshot, subjectOperationIds: Object.fromEntries(plan!.snapshot.subjects.map(subject => [subject.id, []]))}};
    assert.equal((await api('admin', {operation:'run.plan.save', record: participationAttempt, command:{commandId:randomUUID(), expectedVersion:plan!.version}})).status,403);
    await grant('admin', 'EDIT_RUN_PLAN', slug);
    assert.equal(
      (
        await api('admin', {
          operation: 'run.plan.save',
          record: plan,
          command: { commandId: randomUUID(), expectedVersion: plan!.version },
        })
      ).status,
      409,
    );
    assert.deepEqual(
      await trusted.repositories.run.getSnapshot(snapshot.id),
      snapshot,
    );
    proofs.push({ snapshot, results: stored.record });
  }
  // Bounded SQL query excludes unauthorized rows before limits; explicit mixed sources reject.
  assert.deepEqual(
    (
      (await call('outsider', {
        operation: 'measurement.query',
        query: { limit: 1 },
      })) as { values: unknown[] }
    ).values,
    [],
  );
  assert.deepEqual(
    await call('outsider', { operation: 'measurement.datasets' }),
    [],
  );
  const [photo, material] = proofs;
  await db.query(
    "UPDATE study_access SET responsible_department_id='science-other' WHERE study_id=(SELECT study_id FROM study WHERE series_slug='adhesion-material-optimization')",
  );
  assert.equal(
    (
      await api('viewer', {
        operation: 'measurement.query',
        query: {
          datasetIds: [
            photo.results.datasets[0].id,
            material.results.datasets[0].id,
          ],
        },
      })
    ).status,
    404,
  );
  const visible = (await call('viewer', {
    operation: 'measurement.datasets',
  })) as { dataset: { experimentRunId: string } }[];
  assert.ok(
    visible.some((d) => d.dataset.experimentRunId === photo.snapshot.id),
  );
  assert.ok(
    !visible.some((d) => d.dataset.experimentRunId === material.snapshot.id),
  );
  const view: SavedAnalysisView = {
    id: randomUUID(),
    name: 'Cross Study exact sources',
    owner: 'forged-owner',
    visibility: 'SHARED',
    studyId: 'dts-improvement',
    runIds: proofs.map((p) => p.snapshot.id),
    datasetIds: proofs.map((p) => p.results.datasets[0].id),
    subjectIds: proofs.map((p) => p.snapshot.subjects[0].id),
    parameterIds: proofs.map((p) => p.results.values[0].parameterDefinitionId!),
    sourceReferences: proofs.map((p) => ({
      studyId: p.snapshot.series.id.replace(/^series-/, ''),
      runId: p.snapshot.id,
      subjectId: p.snapshot.subjects[0].id,
      datasetId: p.results.datasets[0].id,
      measurementExecutionId: p.results.executions[0].id,
      parameterId: p.results.values[0].parameterDefinitionId!,
      representativeResultId: p.results.summaries[0].id,
    })),
    visualization: { type: 'TABLE', xDimension: 'RUN', groupBy: 'RUN' },
    preparation: {
      aggregation: 'MEAN',
      datasetOrigin: 'ALL',
      includeExcluded: true,
    },
    filters: { text: '', sort: 'RUN' },
    savedAt: '2026-09-20T00:07:00.000Z',
  };
  await trusted.savedAnalyses.save(view, randomUUID(), 0);
  assert.equal(
    (await api('owner', { operation: 'analysis.load', id: view.id })).status,
    404,
    'unmapped legacy audience fails closed',
  );
  await db.query(
    "INSERT INTO saved_analysis_access SELECT id,'science-viewer' FROM saved_analysis WHERE domain_id=$1",
    [view.id],
  );
  assert.equal(
    (await api('viewer', { operation: 'analysis.load', id: view.id })).status,
    404,
    'owner lacks one source',
  );
  assert.deepEqual(await call('viewer', { operation: 'analysis.list' }), []);
  await grant('viewer', 'VIEW_RUN', 'adhesion-material-optimization');
  const bounded = (await call('viewer', {
    operation: 'measurement.query',
    query: { datasetIds: [photo.results.datasets[0].id], limit: 1 },
  })) as { values: unknown[] };
  assert.equal(bounded.values.length, 1);
  await ok('viewer', { operation: 'analysis.load', id: view.id });
  assert.equal(
    (await api('collaborator', { operation: 'analysis.load', id: view.id }))
      .status,
    404,
    'SHARED label does not grant audience',
  );
  await db.query(
    "UPDATE study_access_grant SET active=false WHERE principal_id='science-viewer'",
  );
  assert.equal(
    (await api('viewer', { operation: 'analysis.load', id: view.id })).status,
    404,
  );
  await db.query(
    'UPDATE saved_analysis_source_ref SET dataset_domain_id=$2 WHERE saved_analysis_id=(SELECT id FROM saved_analysis WHERE domain_id=$1)',
    [view.id, 'missing-exact-dataset'],
  );
  assert.equal(
    (await api('admin', { operation: 'analysis.load', id: view.id })).status,
    404,
  );
  for (const op of [
    'configuration.execute',
    'analysis.save',
    'unsupported.write',
  ])
    await assert.rejects(call('owner', { operation: op }), /not available/);
  return proofs;
}
