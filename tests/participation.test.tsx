import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { participation25 } from './fixtures/participation-25';
import {
  editOperationParticipation,
  inheritNewOperationParticipation,
} from '../src/features/run-registration/participation';
import { createExperimentWorkspace } from '../src/features/run-registration/workspace-model';
import {
  projectActualExecution,
  type ActualExecutionEvidence,
} from '../src/features/run-registration/actual-execution-model';
import {
  measurementRowsForOperation,
  measurementParticipationState,
  type MeasurementEvidenceProjection,
} from '../src/features/run-registration/measurement-grid-model';
import { configurationRepository } from '../src/mock/configuration-packages';
import { definitions } from '../src/mock/reference';
import { LocaleProvider } from '../src/shared/i18n/locale';
import { ParticipationEditor } from '../src/features/run-registration/participation-editor';
import { MeasurementExecutionGrid } from '../src/features/run-registration/measurement-execution-grid';
import { ActualExecutionGrid } from '../src/features/run-registration/actual-execution-grid';
import { validatePlanEdit } from '../src/application/plan-authoring';

const members = (s: ReturnType<typeof participation25>, op: string) =>
  s.subjects
    .filter((x) => s.subjectOperationIds[x.id].includes(op))
    .map((x) => x.id);
void test('25-wafer branch/rejoin is membership lineage, with ten excluded wafers throughout', () => {
  const s = participation25();
  const a = members(s, 'A'),
    b = members(s, 'B'),
    c = members(s, 'C');
  assert.deepEqual(
    a,
    s.subjects.filter((_, i) => i < 10 && i % 2 === 0).map((s) => s.id),
  );
  assert.equal(
    new Set([...a, ...b, ...c]).size,
    a.length + b.length + c.length,
  );
  assert.deepEqual([...a, ...b, ...c].sort(), members(s, 'P').sort());
  assert.deepEqual(members(s, 'D'), members(s, 'P'));
  assert.ok(
    s.subjects.slice(15).every((x) => s.subjectOperationIds[x.id].length === 0),
  );
  assert.equal('splitGroups' in s, false);
});
void test('single and multi-subject changes are immutable and preserve assignments/other operations', () => {
  const s = participation25(),
    before = JSON.stringify(s);
  const ids = s.subjects.slice(15, 18).map((x) => x.id);
  const single = editOperationParticipation(s, 'A', [ids[0]], true);
  assert.equal(members(single, 'A').length, 6);
  const multi = editOperationParticipation(single, 'B', ids, true);
  assert.equal(members(multi, 'B').length, 8);
  assert.deepEqual(members(multi, 'D'), members(s, 'D'));
  assert.deepEqual(multi.assignments, s.assignments);
  assert.deepEqual(
    editOperationParticipation(multi, 'B', ids, false).subjectOperationIds,
    single.subjectOperationIds,
  );
  assert.equal(JSON.stringify(s), before);
});
void test('readonly edits and unknown subject/operation IDs are rejected', () => {
  const s = participation25();
  assert.throws(
    () => editOperationParticipation(s, 'A', [s.subjects[0].id], false, true),
    /read-only/,
  );
  assert.throws(
    () => editOperationParticipation(s, 'unknown', [], true),
    /Unknown operation/,
  );
  assert.throws(
    () => editOperationParticipation(s, 'A', ['alien'], true),
    /Unknown subject/,
  );
});
void test('new downstream operation inherits previous participants; explicit membership and subsequent deltas win', () => {
  const s = participation25();
  const next = { ...s, steps: [...s.steps, { ...s.steps[4], id: 'E' }] };
  const inherited = inheritNewOperationParticipation(s, next);
  assert.deepEqual(members(inherited, 'E'), members(s, 'D'));
  const explicit = editOperationParticipation(
    next,
    'E',
    [s.subjects[0].id],
    true,
  );
  assert.deepEqual(
    members(inheritNewOperationParticipation(s, explicit), 'E'),
    [s.subjects[0].id],
  );
  const empty = editOperationParticipation(
    inherited,
    'E',
    members(inherited, 'E'),
    false,
  );
  assert.deepEqual(
    members(inheritNewOperationParticipation(inherited, empty), 'E'),
    [],
  );
  assert.deepEqual(
    members(validatePlanEdit(s, next, configurationRepository), 'E'),
    members(s, 'D'),
  );
});
void test('Actual projection excludes every nonparticipant from missing counts', () => {
  const s = participation25(),
    model = createExperimentWorkspace(s, configurationRepository);
  const rows = projectActualExecution(model, model.operations, []);
  assert.equal(rows.filter((p) => p.status === 'NOT_PARTICIPATING').length, 80);
  assert.equal(rows.filter((p) => p.status === 'NOT_EXECUTED').length, 45);
  assert.ok(
    rows
      .filter((p) => !p.plannedParticipant)
      .every((p) =>
        p.comparisons.every((c) => c.delta === 'NOT_PARTICIPATING'),
      ),
  );
  assert.ok(
    rows
      .filter((p) => p.plannedParticipant)
      .every((p) => p.comparisons.some((c) => c.delta === 'MISSING_ACTUAL')),
  );
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <ActualExecutionGrid model={model} evidence={[]} />
    </LocaleProvider>,
  );
  assert.match(html, /N\/A/);
  assert.match(html, /No execution record/);
});
void test('unexpected Actual with null planned identity remains traceable and flagged without missing expectations', () => {
  const s = participation25(),
    model = createExperimentWorkspace(s, configurationRepository);
  const e: ActualExecutionEvidence = {
    event: {
      id: 'unplanned-evidence',
      experimentRunId: s.id,
      processStepId: 'A',
      plannedExecutionItemId: null,
      observedOperation: 'A',
      observedRecipe: 'EXP-R01',
      equipment: 'EXP-03',
      startedAt: '2026-09-01T00:00:00Z',
      endedAt: null,
      executionStatus: 'COMPLETED',
      sourceSystem: 'isolated test',
      sourceRecordReference: 'test-source',
    },
    resolvedSubjectId: s.subjects[15].id,
    observedValues: [],
    retrievedAt: '2026-09-01T00:00:00Z',
  };
  const row = projectActualExecution(model, model.operations, [e]).find(
    (p) => p.operation.id === 'A' && p.subject.id === s.subjects[15].id,
  )!;
  assert.equal(row.event?.id, e.event.id);
  assert.equal(row.unexpected, true);
  assert.equal(row.status, 'EXECUTED');
  assert.ok(row.comparisons.some((c) => c.delta === 'UNPLANNED_ACTUAL'));
  assert.ok(row.comparisons.every((c) => c.delta !== 'MISSING_ACTUAL'));
  assert.equal(row.provenance?.sourceRecordReference, 'test-source');
});
void test('planned Measurement exists before acquisition; only 15 participating Subjects are pending', () => {
  const s = participation25(),
    model = createExperimentWorkspace(s, configurationRepository);
  const rows = measurementRowsForOperation(model, 'D', definitions, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].parameterId, 'parameter-bcd-v1');
  assert.equal(
    measurementRowsForOperation(model, 'A', definitions, []).length,
    0,
  );
  const states = s.subjects.map((subject) =>
    measurementParticipationState(
      s.subjectOperationIds[subject.id].includes('D'),
    ),
  );
  assert.equal(states.filter((x) => x === 'PENDING').length, 15);
  assert.equal(states.filter((x) => x === 'NOT_PARTICIPATING').length, 10);
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <MeasurementExecutionGrid
        model={model}
        results={{
          executions: [],
          datasets: [],
          values: [],
          summaries: [],
          validityDecisions: [],
        }}
        catalog={definitions}
        executionEvidence={[]}
      />
    </LocaleProvider>,
  );
  assert.match(html, /15.*Pending/);
  assert.match(html, /BCD/);
  assert.equal((html.match(/>N\/A</g) || []).length, 10);
});
void test('out-of-plan Measurement observations remain visible even if excluded from effective summary', () => {
  const result = { representativeValue: '0' } as MeasurementEvidenceProjection;
  assert.equal(measurementParticipationState(false, result), 'COLLECTED');
  assert.equal(
    measurementParticipationState(false, {
      ...result,
      representativeValue: null,
    }),
    'OUT_OF_PLAN',
  );
  assert.equal(
    measurementParticipationState(true, {
      ...result,
      representativeValue: null,
    }),
    'PENDING',
  );
});
void test('compact bilingual participation editor supports 25 checkboxes and readonly Apply', () => {
  const s = participation25();
  for (const locale of ['en', 'ko'] as const) {
    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale={locale} persist={false}>
        <ParticipationEditor
          snapshot={s}
          operationId="A"
          readOnly
          onApply={() => {
            throw Error('render wrote');
          }}
          onCancel={() => {}}
        />
      </LocaleProvider>,
    );
    assert.equal((html.match(/type="checkbox"/g) || []).length, 26);
    assert.match(html, /fieldset disabled/);
    assert.match(html, /W25/);
  }
});
