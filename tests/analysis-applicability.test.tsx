import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DxtApplication } from '../src/application/dxt-application';
import { analysisMeasurementApplicability } from '../src/application/analysis-applicability';
import { filterMeasurements } from '../src/application/measurement-query';
import {
  projectAnalysisRows,
  saveAnalysisView,
  type AnalysisMeasurementSource,
  type AnalysisSelection,
} from '../src/domain/analysis';
import type { SubjectMeasurementValue } from '../src/domain/measurement/subject-measurement';
import { AnalysisChart } from '../src/features/analysis/result-chart';
import { AnalysisResultTable } from '../src/features/analysis/workspace';
import { projectSavedAnalysisRows } from '../src/features/analysis/saved-view-repository';
import { plannedMeasurementIdentity } from '../src/features/run-registration/measurement-grid-model';
import { createInMemoryRepositories } from '../src/infrastructure/memory/in-memory-repositories';
import { configurationRepository } from '../src/mock/configuration-packages';
import { LocaleProvider } from '../src/shared/i18n/locale';
import { participation25 } from './fixtures/participation-25';

function source(
  type: 'WAFER' | 'SPECIMEN' = 'SPECIMEN',
): AnalysisMeasurementSource {
  const scope = (id: string, point: string, applied: string[]) => ({
    operationId: id,
    operationLabel: `Operation ${id}`,
    measurementOperationDefinitionId: 'measurement-def',
    measurementPoint: point,
    parameterIds: ['parameter'],
    subjects: ['S1', 'S2', 'S3'].map((subject) => ({
      id: subject,
      applies: applied.includes(subject),
      plannedExecutionItemId: plannedMeasurementIdentity('run', subject, id),
    })),
  });
  const dataset = (
    id: string,
    operation: string,
    subject: string,
    point: 'PRE' | 'POST',
  ) => ({
    id,
    experimentRunId: 'run',
    plannedExecutionItemId: plannedMeasurementIdentity(
      'run',
      subject,
      operation,
    ),
    executionEventId: null,
    measurementExecutionId: `execution-${id}`,
    measurementOperationDefinitionId: 'measurement-def',
    equipmentReference: null,
    measurementPoint: point,
    sourceSystem: 'isolated projection test',
    collectedAt: '2026-11-25T00:00:00Z',
    status: 'COLLECTED' as const,
    datasetOrigin: 'SOURCE' as const,
    preprocessingExecutionId: null,
  });
  const datasets = [
    dataset('dataset-A', 'A', 'S1', 'PRE'),
    dataset('dataset-B', 'B', 'S2', 'POST'),
  ];
  return {
    studyId: 'generic-study',
    studyLabel: 'Isolated Analysis contract',
    workspaceContextLabel: 'Test',
    runId: 'run',
    runNumber: 1,
    subjects: ['S1', 'S2', 'S3'].map((id) => ({ id, type, displayLabel: id })),
    parameterLabels: { parameter: 'Parameter' },
    unitSymbols: { parameter: 'nm' },
    measurementApplicability: [
      scope('A', 'PRE', ['S1', 'S3']),
      scope('B', 'POST', ['S2', 'S3']),
    ],
    measurements: {
      datasets,
      values: [
        value('value-A', 'dataset-A', 'S1', 0),
        value('value-B', 'dataset-B', 'S2', 2),
      ],
      summaries: [],
      validityDecisions: [],
      executions: datasets.map((d) => ({
        id: d.measurementExecutionId,
        experimentRunId: 'run',
        subjectIds: [d.id === 'dataset-A' ? 'S1' : 'S2'],
        measurementOperationDefinitionId: d.measurementOperationDefinitionId,
        measurementPoint: d.measurementPoint,
        sequence: 1,
        startedAt: d.collectedAt,
        completedAt: d.collectedAt,
        acquisitionMethod: 'MANUAL',
        sourceSystem: d.sourceSystem,
        sourceRecordReference: 'test-only',
      })),
    },
  };
}
function value(
  id: string,
  datasetId: string,
  subjectId: string,
  numeric: number,
): SubjectMeasurementValue {
  return {
    id,
    datasetId,
    subjectId,
    physicalSubjectId: null,
    parameterDefinitionId: 'parameter',
    value: { dataType: 'NUMBER', value: numeric },
    unitDefinitionId: 'unit-nm',
    granularity: 'SUBJECT',
    siteIdentity: null,
    coordinateValues: [],
    observedAt: '2026-11-25T00:00:00Z',
    sourceParameterReference: null,
    acquisitionMethod: 'MANUAL',
    adHocParameter: null,
    sourceMeasurementValueIds: [],
  };
}
const selection: AnalysisSelection = {
  studyId: 'generic-study',
  runIds: ['run'],
  datasetIds: ['dataset-A'],
  parameterIds: ['parameter'],
  subjectIds: ['S1', 'S2', 'S3'],
  aggregation: 'RAW',
  datasetOrigin: 'ALL',
  includeExcluded: true,
};

void test('Wafer and Specimen distinguish applicable Missing, non-applied N/A and numeric zero from exact plan scope', () => {
  for (const type of ['WAFER', 'SPECIMEN'] as const) {
    const input = source(type);
    const before = JSON.stringify(input);
    const rows = projectAnalysisRows([input], selection);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].value, 0);
    assert.equal(rows[0].validity, 'INCLUDED');
    assert.equal(rows[1].validity, null);
    assert.equal(rows[1].expectation?.applies, false);
    assert.equal(rows[1].datasetId, null);
    assert.equal(rows[2].validity, 'MISSING');
    assert.equal(rows[2].expectation?.applies, true);
    assert.equal(JSON.stringify(input), before);
  }
});

void test('same parameter at repeated Operations stays scoped by exact planned execution and measurement point', () => {
  const rows = projectAnalysisRows([source()], {
    ...selection,
    datasetIds: ['dataset-A', 'dataset-B'],
  });
  assert.equal(rows.length, 6);
  const cell = (subject: string, operation: string) =>
    rows.find(
      (row) =>
        row.subject.id === subject &&
        row.expectation?.operationId === operation,
    )!;
  assert.equal(cell('S1', 'A').value, 0);
  assert.equal(cell('S1', 'B').validity, null);
  assert.equal(cell('S2', 'A').validity, null);
  assert.equal(cell('S2', 'B').value, 2);
  assert.equal(cell('S3', 'A').validity, 'MISSING');
  assert.equal(cell('S3', 'B').validity, 'MISSING');
  assert.notEqual(cell('S3', 'A').id, cell('S3', 'B').id);
  const onlyB = projectAnalysisRows([source()], {
    ...selection,
    datasetIds: ['dataset-B'],
    subjectIds: ['S1'],
  });
  assert.equal(onlyB.length, 1);
  assert.equal(onlyB[0].expectation?.point, 'POST');
  assert.equal(onlyB[0].validity, null);
});

void test('real out-of-plan evidence is retained with original IDs and official inclusion/exclusion', () => {
  const input = source();
  input.measurements.values.push(value('unexpected', 'dataset-A', 'S2', 3));
  input.measurements.validityDecisions.push({
    id: 'excluded',
    measurementValueId: 'unexpected',
    state: 'EXCLUDED',
    reason: 'Isolated test decision',
    actor: 'test',
    decidedAt: '2026-11-25T01:00:00Z',
  });
  const row = projectAnalysisRows([input], selection).find(
    (r) => r.subject.id === 'S2',
  )!;
  assert.equal(row.value, 3);
  assert.equal(row.validity, 'EXCLUDED');
  assert.equal(row.measurementValueId, 'unexpected');
  assert.equal(row.expectation?.applies, false);
  assert.equal(row.datasetId, 'dataset-A');
  assert.deepEqual(row.sourceMeasurementIds, ['unexpected']);
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <AnalysisResultTable rows={[row]} onSelect={() => {}} />
    </LocaleProvider>,
  );
  assert.match(html, /Out-of-plan evidence/);
  assert.match(html, /EXCLUDED/);
});

void test('Subject-only filtering retains authorized dataset context for a non-applied expectation with no acquired values', async () => {
  const input = source();
  const app = new DxtApplication(
    createInMemoryRepositories(configurationRepository),
    [input],
  );
  const filteredSelection = { ...selection, subjectIds: ['S2'] };
  assert.equal(
    filterMeasurements([input.measurements], {
      subjectIds: ['S2'],
      datasetIds: ['dataset-A'],
    }).datasets.length,
    0,
  );
  const queried = await app.queryAnalysisSources([input], filteredSelection);
  assert.equal(queried[0].measurements.values.length, 0);
  assert.equal(queried[0].measurementDatasetContexts?.length, 2);
  const rows = projectAnalysisRows(queried, filteredSelection);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].validity, null);
  assert.equal(rows[0].expectation?.operationId, 'A');
  assert.equal(rows[0].sourceMeasurementIds.length, 0);
});

void test('unknown legacy, unplanned, ambiguous and mismatched contexts never infer non-application', () => {
  const variants = [source(), source(), source(), source(), source()];
  delete variants[0].measurementApplicability;
  variants[1].measurements.datasets[0].plannedExecutionItemId = null;
  variants[2].measurementApplicability!.push(
    structuredClone(variants[2].measurementApplicability![0]),
  );
  variants[3].measurements.datasets[0].measurementPoint = 'POST';
  variants[4].measurementApplicability![0].subjects.find(
    (s) => s.id === 'S2',
  )!.applies = null;
  for (const input of variants) {
    const row = projectAnalysisRows([input], selection).find(
      (r) => r.subject.id === 'S2',
    )!;
    assert.equal(row.validity, 'MISSING');
    assert.notEqual(row.expectation?.applies, false);
  }
  const unknownParameter = projectAnalysisRows([source()], {
    ...selection,
    parameterIds: ['unknown-parameter'],
  });
  assert.deepEqual(unknownParameter, []);
  const noMatchingDatasets = projectAnalysisRows([source()], {
    ...selection,
    datasetIds: ['not-selected'],
  });
  assert.ok(noMatchingDatasets.every((row) => !row.expectation));
});

void test('disjoint parameters do not invent expectations at unrelated Operations; unexpected values remain visible', () => {
  const input = source();
  input.measurementApplicability![1].parameterIds = ['parameter-B'];
  input.measurements.values[1].parameterDefinitionId = 'parameter-B';
  const rows = projectAnalysisRows([input], {
    ...selection,
    datasetIds: ['dataset-A', 'dataset-B'],
    parameterIds: ['parameter', 'parameter-B'],
  });
  assert.equal(rows.length, 6);
  assert.ok(
    rows.every(
      (row) =>
        row.expectation?.operationId ===
        (row.parameterId === 'parameter' ? 'A' : 'B'),
    ),
  );
  input.measurements.values.push(
    value('unexpected-parameter', 'dataset-B', 'S1', 8),
  );
  const observed = projectAnalysisRows([input], {
    ...selection,
    datasetIds: ['dataset-A', 'dataset-B'],
  });
  assert.equal(observed.length, 4);
  assert.equal(
    observed.find((row) => row.measurementValueId === 'unexpected-parameter')
      ?.value,
    8,
  );
  assert.equal(
    observed.filter(
      (row) => row.subject.id === 'S3' && row.validity === 'MISSING',
    ).length,
    1,
  );
});

void test('exact snapshot metadata preserves split/merge membership without treating an absent membership record as false', () => {
  const snapshot = participation25();
  const before = JSON.stringify(snapshot);
  const contexts = analysisMeasurementApplicability(snapshot);
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].operationId, 'D');
  assert.equal(
    contexts[0].subjects.filter((s) => s.applies === true).length,
    15,
  );
  assert.equal(
    contexts[0].subjects.filter((s) => s.applies === false).length,
    10,
  );
  assert.equal(
    contexts[0].subjects[0].plannedExecutionItemId,
    plannedMeasurementIdentity(snapshot.id, snapshot.subjects[0].id, 'D'),
  );
  assert.equal(JSON.stringify(snapshot), before);
  delete snapshot.subjectOperationIds[snapshot.subjects[0].id];
  assert.equal(
    analysisMeasurementApplicability(snapshot)[0].subjects[0].applies,
    null,
  );
});

void test('Saved Analysis keeps exact evidence pins and restores N/A without inventing source references', () => {
  const input = source();
  const rows = projectAnalysisRows([input], selection);
  const view = saveAnalysisView(
    {
      id: 'saved',
      name: 'Isolated saved view',
      owner: 'test',
      visibility: 'PRIVATE',
      studyId: selection.studyId,
      runIds: selection.runIds,
      datasetIds: selection.datasetIds,
      subjectIds: selection.subjectIds,
      parameterIds: selection.parameterIds,
      visualization: {
        type: 'TABLE',
        xDimension: 'SUBJECT',
        groupBy: 'SUBJECT',
      },
      preparation: {
        aggregation: 'RAW',
        datasetOrigin: 'ALL',
        includeExcluded: true,
      },
      filters: { text: '', sort: 'SUBJECT' },
      savedAt: '2026-11-25T00:00:00Z',
    },
    rows,
  );
  assert.equal(view.sourceReferences.length, 1);
  assert.equal(view.sourceReferences[0].datasetId, 'dataset-A');
  const before = JSON.stringify(view);
  assert.deepEqual(projectSavedAnalysisRows(view, [input]), rows);
  const missing = structuredClone(input);
  missing.measurements.datasets = missing.measurements.datasets.filter(
    (d) => d.id !== 'dataset-A',
  );
  assert.deepEqual(projectSavedAnalysisRows(view, [missing]), []);
  assert.equal(JSON.stringify(view), before);
});

void test('KO/EN table shows explicit N/A and Operation scope; chart counts only genuinely Missing rows', () => {
  const rows = projectAnalysisRows([source()], selection);
  for (const locale of ['ko', 'en'] as const) {
    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale={locale} persist={false}>
        <AnalysisResultTable rows={rows} onSelect={() => {}} />
      </LocaleProvider>,
    );
    assert.match(html, /N\/A/);
    assert.match(html, /Operation A/);
    assert.ok(
      html.includes(locale === 'ko' ? '미적용' : 'Not applicable'),
    );
  }
  const chart = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <AnalysisChart
        rows={rows}
        type="BAR"
        xDimension="SUBJECT"
        groupBy="SUBJECT"
        onSelect={() => {}}
      />
    </LocaleProvider>,
  );
  assert.match(chart, /1 missing/);
  assert.doesNotMatch(chart, /2 missing/);
});
