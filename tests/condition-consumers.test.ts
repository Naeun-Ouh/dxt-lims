import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runPlanningScenarios,
  type RunPlanningSnapshot,
} from '../src/features/run-registration/planning-model';
import { configurationRepository } from '../src/mock/configuration-packages';
import { createExperimentWorkspace } from '../src/features/run-registration/workspace-model';
import {
  projectEngineeringGridRows,
  scaleGridOperations,
} from '../src/features/run-registration/engineering-grid-model';
import { projectOperationExecution } from '../src/features/run-registration/actual-execution-model';
import { definitions } from '../src/mock/reference';
import {
  createEmptyLifecycleState,
  recordActualExecution,
} from '../src/features/run-registration/lifecycle-authoring';
import { applyGridPlanEdits } from '../src/features/run-registration/engineering-grid-plan-edit';

function fixture(
  prospective = true,
  overrideFirst = true,
): RunPlanningSnapshot {
  const snapshot = structuredClone(runPlanningScenarios.PHOTO);
  if (prospective) snapshot.conditionResolution = 'SUBJECT_FIRST_V1';
  const original = snapshot.assignments.find(
    (a) => a.label === 'Energy' && !a.subjectId,
  )!;
  const common = { ...original, value: '25', intentRole: 'FIXED' as const };
  const scoped = {
    ...common,
    id: 'explicit-test-override',
    subjectId: snapshot.subjects[0].id,
    value: '0',
    intentRole: 'VARIED' as const,
  };
  snapshot.assignments = [
    ...snapshot.assignments.filter((a) => a.label !== 'Energy'),
    ...(overrideFirst ? [scoped, common] : [common, scoped]),
  ];
  return snapshot;
}
function projections(snapshot: RunPlanningSnapshot) {
  const model = createExperimentWorkspace(snapshot, configurationRepository);
  const rows = projectEngineeringGridRows(
    model,
    scaleGridOperations(model, model.operations.length),
    new Set(model.operations.map((o) => o.id)),
  );
  const energy = rows.find((r) => r.definition?.label === 'Energy')!;
  const comparison = (subjectIndex: number) =>
    projectOperationExecution(
      model,
      model.operations.find(
        (o) => o.id === energy.operation.sourceOperationId,
      )!,
      model.subjects[subjectIndex],
      [],
    ).comparisons.find((c) => c.label === 'Energy')!;
  return { model, rows, energy, comparison };
}

void test('V1 Plan and Actual consumers preserve zero and effective Subject intent in either order', () => {
  for (const overrideFirst of [true, false]) {
    const snapshot = fixture(true, overrideFirst);
    const { energy, comparison } = projections(snapshot);
    assert.equal(energy.values?.[snapshot.subjects[0].id], '0');
    assert.equal(energy.subjectRoles?.[snapshot.subjects[0].id], 'VARIED');
    assert.equal(energy.subjectRoles?.[snapshot.subjects[1].id], 'FIXED');
    assert.equal(comparison(0).planned, '0');
    assert.equal(comparison(0).intentRole, 'VARIED');
    assert.equal(comparison(1).planned, '25');
    assert.equal(comparison(1).intentRole, 'FIXED');
  }
});

void test('V1 Plan clearing restores common value and role; invalid nonblank input remains explicit', () => {
  const snapshot = fixture();
  const { rows, energy } = projections(snapshot);
  const key = `${energy.id}:${snapshot.subjects[0].id}`;
  const cleared = applyGridPlanEdits(snapshot, rows, { [key]: '  ' }, {});
  assert.equal(
    cleared.assignments.some((a) => a.id === 'explicit-test-override'),
    false,
  );
  const after = projections(cleared);
  assert.equal(after.energy.values?.[snapshot.subjects[0].id], '25');
  assert.equal(after.comparison(0).planned, '25');
  assert.equal(after.comparison(0).intentRole, 'FIXED');
  const invalid = applyGridPlanEdits(
    snapshot,
    rows,
    { [key]: 'not-a-number' },
    {},
  );
  assert.equal(
    invalid.assignments.find((a) => a.id === 'explicit-test-override')?.value,
    'not-a-number',
  );
  assert.equal(
    snapshot.assignments.find((a) => a.id === 'explicit-test-override')?.value,
    '0',
  );
});

void test('V1 non-applicable Subject stays N/A and rejects cell edits regardless of override', () => {
  const snapshot = fixture();
  const subject = snapshot.subjects[0];
  snapshot.subjectOperationIds[subject.id] = [];
  const { rows, energy, comparison } = projections(snapshot);
  assert.equal(comparison(0).planned, null);
  assert.equal(comparison(0).delta, 'NOT_PARTICIPATING');
  assert.deepEqual(
    applyGridPlanEdits(
      snapshot,
      rows,
      { [`${energy.id}:${subject.id}`]: '99' },
      {},
    ),
    snapshot,
  );
});

void test('Legacy consumers retain historical order and common role with no prospective cell badges', () => {
  const snapshot = fixture(false, true);
  const { rows, energy, comparison } = projections(snapshot);
  assert.equal(energy.values?.[snapshot.subjects[0].id], '25');
  assert.equal(energy.subjectRoles, undefined);
  assert.equal(comparison(0).planned, '25');
  assert.equal(comparison(0).intentRole, 'FIXED');
  const cleared = applyGridPlanEdits(
    snapshot,
    rows,
    { [`${energy.id}:${snapshot.subjects[0].id}`]: '' },
    {},
  );
  assert.equal(
    cleared.assignments.find((a) => a.id === 'explicit-test-override')?.value,
    '',
  );
});

void test('V1 Actual Recipe acquisition follows effective Subject Recipe and explicit commands, legacy unchanged', () => {
  const snapshot = fixture();
  const common = snapshot.assignments.find(
    (a) => a.kind === 'RECIPE' && !a.subjectId,
  )!;
  const scoped = {
    ...common,
    id: 'test-recipe-override',
    subjectId: snapshot.subjects[0].id,
    value: 'EXPLICIT-TEST-RECIPE',
    intentRole: 'VARIED' as const,
  };
  snapshot.assignments = [scoped, ...snapshot.assignments];
  const record = (
    source: RunPlanningSnapshot,
    actualOverrides: Record<string, string> = {},
    recipe?: string,
  ) => {
    const model = createExperimentWorkspace(source, configurationRepository);
    const state = createEmptyLifecycleState(source, {
      studyId: 'dts-improvement',
      studyLabel: 'Agent test',
      workspaceContextLabel: 'PHOTO',
      catalog: definitions,
      targetBindings: [],
      actor: 'Agent test',
    });
    const before = structuredClone(state);
    const result = recordActualExecution(state, model, {
      id: 'test-actual-recipe',
      operationId: common.processStepId!,
      subjectId: source.subjects[0].id,
      status: 'COMPLETED',
      startedAt: '2026-11-26T01:00:00Z',
      endedAt: '2026-11-26T01:30:00Z',
      actualOverrides,
      recipe,
    });
    assert.deepEqual(state, before);
    return result.actualEvidence[0].event.observedRecipe;
  };
  const model = createExperimentWorkspace(snapshot, configurationRepository);
  const operation = model.operations.find(
    (o) => o.id === common.processStepId,
  )!;
  const recipe = projectOperationExecution(
    model,
    operation,
    model.subjects[0],
    [],
  ).comparisons.find((c) => c.label === 'Recipe')!;
  assert.equal(recipe.planned, 'EXPLICIT-TEST-RECIPE');
  assert.equal(record(snapshot), 'EXPLICIT-TEST-RECIPE');
  assert.equal(
    record(snapshot, { [recipe.key]: 'EXPLICIT-TEST-ACTUAL' }),
    'EXPLICIT-TEST-ACTUAL',
  );
  assert.equal(
    record(
      snapshot,
      { [recipe.key]: 'EXPLICIT-TEST-ACTUAL' },
      'EXPLICIT-COMMAND',
    ),
    'EXPLICIT-COMMAND',
  );
  const historical = structuredClone(snapshot);
  delete historical.conditionResolution;
  assert.equal(record(historical), operation.recipe);
});
