import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DxtApplication } from '@/src/application/dxt-application';
import type {
  ExecutionRecord,
  PlanningWorkspaceRecord,
  MeasurementRecord,
} from '@/src/application/repository-ports';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { measurementParticipationState } from '@/src/features/run-registration/measurement-grid-model';
import { createProductionSliceRepositories } from './explicit-scientific-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';

/** Explicit isolated test data only. No lifecycleAuthoringProfile / Target / fixture Study slug. */
export async function genericLifecycleContract(
  db: SqlDatabase,
  call: (principal: string, body: Record<string, unknown>) => Promise<unknown>,
  studyId: string,
  processRun: RunPlanningSnapshot,
  measurementRun: RunPlanningSnapshot,
) {
  const owner = (body: Record<string, unknown>) =>
    call('bootstrap-reader', body);
  const configuration = await hydrateConfigurationPackages(db, [
    processRun.configurationPackageVersionId,
  ]);
  const repositories = createProductionSliceRepositories(db, configuration);
  repositories.execution.getStateByRun = (runId) =>
    owner({ operation: 'execution.load', runId }) as Promise<ExecutionRecord>;
  repositories.execution.saveByRun = async (runId, records, command) => {
    await owner({ operation: 'execution.save', runId, records, command });
    return repositories.execution.getStateByRun(runId);
  };
  repositories.measurement.getStateByRun = (runId) =>
    owner({
      operation: 'measurement.load',
      runId,
    }) as Promise<MeasurementRecord>;
  repositories.measurement.saveByRun = async (runId, record, command) => {
    await owner({ operation: 'measurement.save', runId, record, command });
    return repositories.measurement.getStateByRun(runId);
  };
  let reasoningReads = 0;
  repositories.evaluation.getStateByRun = async () => {
    reasoningReads++;
    throw new Error('Must not request optional Evaluation');
  };
  const app = new DxtApplication(repositories);
  const state = await app.loadPersistedLifecycle(processRun.id, 'MEASUREMENT');
  assert.equal(state.measurementCatalog, undefined);
  assert.deepEqual(state.measurementResults.datasets, []);
  const model = createExperimentWorkspace(processRun, configuration);
  const operation = model.operations.find((o) => o.role === 'PROCESS')!;
  const ownerPermissions = (await call('bootstrap-owner', {
    operation: 'run.planning',
    runId: processRun.id,
  })) as PlanningWorkspaceRecord;
  assert.equal(
    ownerPermissions.scientificPermissions?.canRecordActual,
    false,
    'Study responsibility alone does not grant scientific write permission',
  );
  const command = {
    id: randomUUID(),
    operationId: operation.id,
    subjectId: 'DRAFT-01',
    status: 'COMPLETED' as const,
    startedAt: '2026-11-25T01:00:00Z',
    endedAt: '2026-11-25T01:30:00Z',
    actualOverrides: {},
  };
  await assert.rejects(
    app.recordActual(state, model, command),
    /permission|denied|grant/i,
  );
  for (const action of ['RECORD_ACTUAL', 'RECORD_MEASUREMENT'])
    await db.query(
      "INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES($1,$2,'bootstrap-reader',$3,'bootstrap-owner')",
      [randomUUID(), studyId, action],
    );
  const actual = await app.recordActual(state, model, command);
  assert.equal(actual.actualEvidence.length, 1);
  assert.equal(actual.executionVersion, 1);
  assert.deepEqual(
    (await app.loadPersistedLifecycle(processRun.id, 'ACTUAL')).actualEvidence,
    actual.actualEvidence,
  );
  assert.deepEqual(
    await repositories.run.getSnapshot(processRun.id),
    processRun,
    'Actual never rewrites the Plan',
  );
  assert.equal(
    measurementParticipationState(false, undefined),
    'NOT_PARTICIPATING',
  );
  const measurementState = await app.loadPersistedLifecycle(
    measurementRun.id,
    'MEASUREMENT',
  );
  const measurementModel = createExperimentWorkspace(
    measurementRun,
    configuration,
  );
  const plan = measurementRun.measurements[0];
  const parameter = measurementState.measurementCatalog!.parameters.find(
    (p) =>
      plan.parameterDefinitionIds.includes(p.id) &&
      p.semanticRole === 'MEASUREMENT',
  )!;
  const measured = await app.recordMeasurement(
    measurementState,
    measurementModel,
    measurementState.measurementCatalog!,
    {
      id: randomUUID(),
      operationId: plan.stepId,
      subjectId: 'DRAFT-01',
      parameterDefinitionId: parameter.id,
      measurementPoint: plan.point,
      value: '12',
      grain: 'SUBJECT',
      recordedAt: '2026-11-25T02:00:00Z',
    },
  );
  assert.equal(measured.measurementResults.values.length, 1);
  assert.deepEqual(
    (await app.loadPersistedLifecycle(measurementRun.id, 'MEASUREMENT'))
      .measurementResults,
    measured.measurementResults,
  );
  const invalid = structuredClone(measured.measurementResults);
  invalid.values[0].value = { dataType: 'NUMBER', value: 99 };
  await assert.rejects(
    owner({
      operation: 'measurement.save',
      runId: measurementRun.id,
      record: invalid,
      command: {
        commandId: randomUUID(),
        expectedVersion: measured.measurementVersion,
      },
    }),
    /immutable|different|changed|overwrite/i,
  );
  const excluded = structuredClone(measured.measurementResults);
  excluded.validityDecisions.push({
    id: randomUUID(),
    measurementValueId: excluded.values[0].id,
    state: 'EXCLUDED',
    reason: 'TEST ONLY validity separation',
    actor: 'bootstrap-owner',
    decidedAt: '2026-11-25T03:00:00Z',
  });
  await assert.rejects(
    owner({
      operation: 'measurement.save',
      runId: measurementRun.id,
      record: excluded,
      command: {
        commandId: randomUUID(),
        expectedVersion: measured.measurementVersion,
      },
    }),
    /permission|denied|grant/i,
  );
  const source = (await app.analysisSourceCatalog()).find(
    (s) => s.runId === measurementRun.id,
  )!;
  const canonicalStudy = await db.query<{ series_slug: string }>(
    'SELECT series_slug FROM study WHERE study_id=$1',
    [studyId],
  );
  assert.equal(source.studySlug, canonicalStudy.rows[0].series_slug);
  assert.equal(
    source.studyId,
    measurementRun.series.id.replace(/^series-/, ''),
  );
  assert.equal(reasoningReads, 0);
  assert.equal(
    (
      await db.query('SELECT 1 FROM reasoning_context WHERE study_id=$1', [
        studyId,
      ])
    ).rowCount,
    0,
  );
  assert.deepEqual(
    await repositories.run.getSnapshot(measurementRun.id),
    measurementRun,
  );
}
