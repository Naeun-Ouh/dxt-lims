import { runAnalysisHref } from '@/src/features/run-registration/run-analysis-link';
import { measurementAuthoringOptions } from '@/src/features/run-registration/measurement-authoring-options';
import { definitions } from '@/src/mock/reference';
import assert from 'node:assert/strict';
import test from 'node:test';
import { DxtApplication } from '@/src/application/dxt-application';
import { createInMemoryRepositories } from '@/src/infrastructure/memory/in-memory-repositories';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { participation25 } from './fixtures/participation-25';
import { lifecycleErrorMessage } from '@/src/features/run-registration/lifecycle-feedback';

void test('persisted generic lifecycle reads exact Run without profile, reasoning, or implicit initialization', async () => {
  const repo = createInMemoryRepositories(configurationRepository);
  const s = participation25();
  s.id = 'test-generic';
  s.series = {
    ...s.series,
    id: 'series-test-generic',
    name: 'TEST ONLY generic',
  };
  s.measurements = [];
  await repo.run.saveSnapshot(s, { commandId: 'fixture' });
  repo.run.saveSnapshot = async () => {
    throw new Error('Read must not initialize');
  };
  repo.evaluation.getStateByRun = async () => {
    throw new Error('No Evaluation prerequisite');
  };
  repo.measurement.getCatalog = async () => {
    throw new Error('No Measurement plan needs no catalog');
  };
  const app = new DxtApplication(repo);
  const result = await app.loadPersistedLifecycle(s.id, 'MEASUREMENT');
  assert.deepEqual(result.snapshot, s);
  assert.equal(result.studyLabel, 'TEST ONLY generic');
  assert.deepEqual(result.actualEvidence, []);
  assert.deepEqual(result.measurementResults.datasets, []);
  await assert.rejects(
    app.loadPersistedLifecycle('unknown', 'ACTUAL'),
    /Saved Run could not be loaded/,
  );
});
void test('lifecycle messages distinguish actionable permission/conflict from infrastructure detail', () => {
  assert.match(
    lifecycleErrorMessage(
      { code: 'FORBIDDEN', message: 'adapter database API' },
      'actual',
    ),
    /permission/,
  );
  assert.match(
    lifecycleErrorMessage({ code: 'CONFLICT' }, 'measurement'),
    /Keep your entered values/,
  );
  for (const stage of ['load', 'actual', 'measurement'] as const) {
    const message = lifecycleErrorMessage(
      new Error('database repository API failure'),
      stage,
    );
    assert.doesNotMatch(message, /database|repository|API|adapter/);
  }
});

void test('Measurement entry offers only the exact configured step parameters and point', () => {
  const snapshot = participation25();
  const definition = definitions.parameters.find(
    (p) => p.semanticRole === 'MEASUREMENT',
  )!;
  snapshot.measurements = [
    {
      id: 'test-plan',
      operation: 'TEST ONLY',
      parameters: [],
      stepId: 'test-step',
      measurementOperationDefinitionId:
        definition.measurementOperationDefinitionId!,
      point: definition.supportedMeasurementPoints[0],
      parameterDefinitionIds: [definition.id],
    },
  ];
  const options = measurementAuthoringOptions(
    snapshot,
    definitions,
    'test-step',
  );
  assert.deepEqual(
    options.parameters.map((p) => p.id),
    [definition.id],
  );
  assert.equal(options.plan?.point, definition.supportedMeasurementPoints[0]);
  assert.deepEqual(
    measurementAuthoringOptions(snapshot, definitions, 'another-step')
      .parameters,
    [],
  );
});

void test('Analysis entry keeps exact persisted Study identity instead of a generic route slug', () => {
  const snapshot = participation25();
  snapshot.series.id = 'study-test-generic-wafer';
  snapshot.runNumber = 2;
  const query = new URL(
    runAnalysisHref(snapshot, 'parameter-bcd-v1'),
    'http://localhost',
  ).searchParams;
  assert.equal(query.get('study'), 'study-test-generic-wafer');
  assert.equal(query.get('runs'), '2');
  assert.equal(query.get('parameters'), 'parameter-bcd-v1');
  snapshot.series.id = 'series-dts-improvement';
  assert.match(runAnalysisHref(snapshot), /study=dts-improvement/);
});
