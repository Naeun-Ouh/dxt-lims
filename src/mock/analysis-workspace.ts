import type { AnalysisMeasurementSource, SavedAnalysisView } from '@/src/domain/analysis';
import { normalizeLegacyWaferMeasurements } from '@/src/domain/measurement/legacy-wafer-compatibility';
import { subjectMeasurementResultSetSchema } from '@/src/domain/measurement/subject-measurement';
import { materialMeasurementResults, materialRunPlanningSnapshot } from '@/src/features/material-rd/material-rd-scenario';
import { engineeringGridMeasurementScenarios } from './engineering-grid-measurements';
import { runPlanningScenarios } from '@/src/features/run-registration/planning-model';

const photo18 = normalizeLegacyWaferMeasurements(
  engineeringGridMeasurementScenarios.PHOTO,
);
const cmp12 = normalizeLegacyWaferMeasurements(
  engineeringGridMeasurementScenarios.CMP,
);

function clonePhotoRun(runNumber: 17 | 19, lot: string, offset: number) {
  const runId = `run-photo-${runNumber}`;
  const subjectMap = new Map(
    runPlanningScenarios.PHOTO.subjects.map((subject, index) => [
      subject.id,
      `${lot}.${String(index + 1).padStart(2, '0')}`,
    ]),
  );
  const datasetMap = new Map(
    photo18.datasets.map((dataset) => [
      dataset.id,
      dataset.id.replace('photo-cdsem', `photo-${runNumber}-cdsem`),
    ]),
  );
  const valueMap = new Map(
    photo18.values.map((value) => [
      value.id,
      value.id.replace('photo-bcd', `photo-${runNumber}-bcd`),
    ]),
  );
  return {
    subjects: runPlanningScenarios.PHOTO.subjects.map((subject) => ({
      ...subject,
      id: subjectMap.get(subject.id)!,
    })),
    measurements: subjectMeasurementResultSetSchema.parse({
      executions: photo18.executions.map((execution) => ({
        ...execution,
        id: execution.id.replace('photo-cdsem', `photo-${runNumber}-cdsem`),
        experimentRunId: runId,
        subjectIds: execution.subjectIds.map((id) => subjectMap.get(id)!),
      })),
      datasets: photo18.datasets.map((dataset) => ({
        ...dataset,
        id: datasetMap.get(dataset.id)!,
        experimentRunId: runId,
        measurementExecutionId: dataset.measurementExecutionId?.replace(
          'photo-cdsem',
          `photo-${runNumber}-cdsem`,
        ),
        plannedExecutionItemId: null,
        executionEventId: null,
      })),
      values: photo18.values.map((value) => ({
        ...value,
        id: valueMap.get(value.id)!,
        datasetId: datasetMap.get(value.datasetId)!,
        subjectId: subjectMap.get(value.subjectId)!,
        value:
          value.value.dataType === 'NUMBER'
            ? { ...value.value, value: Number((value.value.value + offset).toFixed(3)) }
            : value.value,
      })),
      summaries: photo18.summaries.map((summary) => ({
        ...summary,
        id: summary.id.replace('photo-bcd', `photo-${runNumber}-bcd`),
        datasetId: datasetMap.get(summary.datasetId)!,
        subjectId: subjectMap.get(summary.subjectId)!,
        value:
          summary.value.dataType === 'NUMBER'
            ? { ...summary.value, value: Number((summary.value.value + offset).toFixed(3)) }
            : summary.value,
        sourceMeasurementIds: summary.sourceMeasurementIds.map((id) => valueMap.get(id)!),
      })),
      validityDecisions: [],
    }),
  };
}

const photo17 = clonePhotoRun(17, 'PHO7809', -0.08);
const photo19 = clonePhotoRun(19, 'PHO7820', 0.06);

const bcdMetadata = {
  parameterLabels: { 'parameter-bcd-v1': 'BCD' },
  unitSymbols: { 'parameter-bcd-v1': 'nm' },
};

export const analysisMeasurementSources: AnalysisMeasurementSource[] = [
  {
    studyId: 'dts-improvement', studyLabel: 'DTS Improvement',
    workspaceContextLabel: 'SEMICONDUCTOR R&D',
    runId: 'run-photo-17', runNumber: 17, subjects: photo17.subjects,
    measurements: photo17.measurements, ...bcdMetadata,
  },
  {
    studyId: 'dts-improvement', studyLabel: 'DTS Improvement',
    workspaceContextLabel: 'SEMICONDUCTOR R&D',
    runId: 'run-photo-18', runNumber: 18,
    subjects: runPlanningScenarios.PHOTO.subjects,
    measurements: photo18, ...bcdMetadata,
  },
  {
    studyId: 'dts-improvement', studyLabel: 'DTS Improvement',
    workspaceContextLabel: 'SEMICONDUCTOR R&D',
    runId: 'run-photo-19', runNumber: 19, subjects: photo19.subjects,
    measurements: photo19.measurements, ...bcdMetadata,
  },
  {
    studyId: 'cmp-stability', studyLabel: 'CMP Stability',
    workspaceContextLabel: 'SEMICONDUCTOR R&D',
    runId: 'run-cmp-12', runNumber: 12,
    subjects: runPlanningScenarios.CMP.subjects,
    measurements: cmp12,
    parameterLabels: { 'parameter-thickness-result-v1': 'Thickness' },
    unitSymbols: { 'parameter-thickness-result-v1': 'nm' },
  },
  {
    studyId: 'adhesion-material-optimization',
    studyLabel: 'Adhesion Material Optimization',
    workspaceContextLabel: 'MATERIAL R&D',
    runId: materialRunPlanningSnapshot.id,
    runNumber: materialRunPlanningSnapshot.runNumber,
    subjects: materialRunPlanningSnapshot.subjects,
    measurements: materialMeasurementResults,
    parameterLabels: {
      'parameter-peel-force-v1': 'Peel Force',
      'parameter-specimen-viscosity-v1': 'Viscosity',
    },
    unitSymbols: {
      'parameter-peel-force-v1': 'N',
      'parameter-specimen-viscosity-v1': 'cP',
    },
  },
];

export const savedAnalysisViews: SavedAnalysisView[] = [];
