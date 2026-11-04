import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapSetupSchema,
  initialReasoningSchema,
} from '@/src/application/study-bootstrap';
import { runCreationRequestSchema } from '@/src/application/run-creation';
import {
  projectEngineeringGridRows,
  scaleGridOperations,
} from '@/src/features/run-registration/engineering-grid-model';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { runPlanningScenarios } from '@/src/features/run-registration/planning-model';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { translate } from '@/src/shared/i18n/messages';

void test('Bootstrap contracts admit generic slugs but require explicit Subjects, Operations and Targets', () => {
  assert.equal(
    runCreationRequestSchema.parse({
      seriesSlug: 'new-research-study',
      source: 'STUDY_DEFAULT',
    }).seriesSlug,
    'new-research-study',
  );
  assert.equal(
    runCreationRequestSchema.safeParse({
      seriesSlug: '../fixture',
      source: 'STUDY_DEFAULT',
    }).success,
    false,
  );
  assert.equal(
    bootstrapSetupSchema.safeParse({
      expectedRevision: 1,
      subjects: [],
      operations: [],
    }).success,
    false,
  );
  assert.equal(
    initialReasoningSchema.safeParse({
      packageVersionId: 'exact',
      confirmed: true,
      evaluationIds: ['e'],
      nextActionIds: ['n'],
      targetBindings: [],
    }).success,
    false,
  );
});
void test('Explicit Study projection does not invent unchecked Plan variables; legacy projection remains unchanged', () => {
  const snapshot = structuredClone(runPlanningScenarios.PHOTO);
  snapshot.assignments = snapshot.assignments.filter(
    (a) => a.label === 'Energy',
  );
  const model = createExperimentWorkspace(snapshot, configurationRepository);
  const operations = scaleGridOperations(model, model.operations.length);
  const expanded = new Set(operations.map((o) => o.id));
  const legacy = projectEngineeringGridRows(model, operations, expanded).filter(
    (r) => r.kind === 'VARIABLE',
  );
  const explicit = projectEngineeringGridRows(
    { ...model, explicitAssignments: true },
    operations,
    expanded,
  ).filter((r) => r.kind === 'VARIABLE');
  assert.ok(legacy.length > explicit.length);
  assert.ok(explicit.length > 0);
  assert.ok(explicit.every((r) => r.definition?.label === 'Energy'));
  assert.deepEqual(
    model.snapshot,
    snapshot,
    'projection cannot write default assignments',
  );
});
void test('Bootstrap primary actions and readiness explanations have KO/EN labels', () => {
  for (const key of [
    'Save Setup',
    'Initial Target context',
    'Confirm initial Target context',
    'Preview first Run',
    'Create first Run',
    'Structural Setup',
    'Scientific readiness',
    'Required supporting parameters',
  ]) {
    assert.equal(translate('en', key), key);
    assert.notEqual(translate('ko', key), key);
  }
});
