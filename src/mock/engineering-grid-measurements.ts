import { measurementResultSetSchema } from '@/src/domain/measurement';
import { plannedMeasurementIdentity } from '@/src/features/run-registration/measurement-grid-model';

const sites = [
  ['S01', -1, -1],
  ['S02', -1, 1],
  ['S03', 0, 0],
  ['S04', 1, -1],
  ['S05', 1, 1],
] as const;

function mean(values: number[]) {
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3),
  );
}

const photoSubjects = [1, 2, 3, 4].map(
  (slot) => `PHO7814.${String(slot).padStart(2, '0')}`,
);
const photoSiteValues = photoSubjects.map((subjectId, subjectIndex) => ({
  subjectId,
  values: sites.map((_, siteIndex) =>
    Number((17 + subjectIndex * 0.05 + (siteIndex - 2) * 0.025).toFixed(3)),
  ),
}));

const photoExecutions = photoSubjects.map((subjectId, index) => ({
  id: `measurement-execution-photo-cdsem-${index + 1}`,
  experimentRunId: 'run-photo-18',
  waferSubjectIds: [subjectId],
  measurementOperationDefinitionId: 'measurement-operation-cdsem-v1',
  measurementPoint: 'POST' as const,
  sequence: index + 1,
  startedAt: `2026-09-10T${13 + index}:00:00+09:00`,
  completedAt: `2026-09-10T${13 + index}:08:00+09:00`,
  acquisitionMethod: 'INTERFACE' as const,
  sourceSystem: 'Mock CD-SEM',
  sourceRecordReference: `CDSEM-PHOTO-18-${String(index + 1).padStart(2, '0')}`,
}));
const photoDatasets = photoSubjects.map((subjectId, index) => ({
  id: `dataset-photo-cdsem-${index + 1}`,
  experimentRunId: 'run-photo-18',
  plannedExecutionItemId: plannedMeasurementIdentity(
    'run-photo-18',
    subjectId,
    'photo-cdsem',
  ),
  executionEventId: `execution-photo-${index + 1}`,
  measurementExecutionId: photoExecutions[index].id,
  measurementOperationDefinitionId: 'measurement-operation-cdsem-v1',
  equipmentReference: 'CDSEM-04',
  measurementPoint: 'POST' as const,
  sourceSystem: 'Mock CD-SEM',
  collectedAt: photoExecutions[index].completedAt,
  status: 'COLLECTED' as const,
}));
const photoValues = photoSiteValues.flatMap(
  ({ subjectId, values }, subjectIndex) =>
    values.map((value, siteIndex) => ({
      id: `measurement-photo-bcd-${subjectIndex + 1}-${siteIndex + 1}`,
      datasetId: photoDatasets[subjectIndex].id,
      waferSubjectId: subjectId,
      physicalWaferId: `PW-PHOTO-${String(subjectIndex + 1).padStart(2, '0')}`,
      parameterDefinitionId: 'parameter-bcd-v1',
      value: { dataType: 'NUMBER' as const, value },
      unitDefinitionId: 'unit-nm',
      granularity: 'SITE' as const,
      siteIdentity: sites[siteIndex][0],
      coordinateValues: [
        {
          coordinateDefinitionId: 'coordinate-chip-x-v1',
          value: sites[siteIndex][1],
        },
        {
          coordinateDefinitionId: 'coordinate-chip-y-v1',
          value: sites[siteIndex][2],
        },
      ],
      observedAt: `2026-09-10T${13 + subjectIndex}:0${siteIndex}:00+09:00`,
      sourceParameterReference: 'BCD_AVG',
      acquisitionMethod: 'INTERFACE' as const,
    })),
);
const photoSummaries = photoSiteValues.map(({ subjectId, values }, index) => {
  const effective =
    index === 0 ? values.filter((_, siteIndex) => siteIndex !== 2) : values;
  return {
    id: `summary-photo-bcd-${index + 1}`,
    datasetId: photoDatasets[index].id,
    waferSubjectId: subjectId,
    parameterDefinitionId: 'parameter-bcd-v1',
    aggregationMethod: 'MEAN' as const,
    value: { dataType: 'NUMBER' as const, value: mean(effective) },
    unitDefinitionId: 'unit-nm',
    sourceMeasurementIds: values.map(
      (_, siteIndex) => `measurement-photo-bcd-${index + 1}-${siteIndex + 1}`,
    ),
    summaryOrigin: 'DXT_CALCULATED' as const,
    rawInputCount: values.length,
    effectiveInputCount: effective.length,
  };
});

const photo = measurementResultSetSchema.parse({
  executions: photoExecutions,
  datasets: photoDatasets,
  values: photoValues,
  summaries: photoSummaries,
  validityDecisions: [
    {
      id: 'validity-photo-bcd-w01-s03',
      measurementValueId: 'measurement-photo-bcd-1-3',
      state: 'EXCLUDED',
      reason: 'Focus failure during capture',
      actor: 'Lee Seunghyun',
      decidedAt: '2026-09-10T18:10:00+09:00',
    },
  ],
});

const cmpSubjects = [1, 2, 3, 4].map(
  (slot) => `RSA6420.${String(slot).padStart(2, '0')}`,
);

const cmpExecutions = cmpSubjects.flatMap((subjectId, subjectIndex) =>
  (['PRE', 'POST'] as const).map((point, pointIndex) => {
    const hour = String(point === 'PRE' ? 7 : 14).padStart(2, '0');
    return {
      id: `measurement-execution-cmp-${point.toLowerCase()}-${subjectIndex + 1}`,
      experimentRunId: 'run-cmp-12',
      waferSubjectIds: [subjectId],
      measurementOperationDefinitionId: 'measurement-operation-cmp-metro-v1',
      measurementPoint: point,
      sequence: subjectIndex * 2 + pointIndex + 1,
      startedAt: `2026-09-10T${hour}:${String(subjectIndex * 10).padStart(2, '0')}:00+09:00`,
      completedAt: `2026-09-10T${hour}:${String(subjectIndex * 10 + 5).padStart(2, '0')}:00+09:00`,
      acquisitionMethod:
        point === 'PRE' ? ('FILE_IMPORT' as const) : ('INTERFACE' as const),
      sourceSystem:
        point === 'PRE' ? 'Thickness File Import' : 'Mock Thickness Metrology',
      sourceRecordReference: `THK-${point}-RUN12-${String(subjectIndex + 1).padStart(2, '0')}`,
    };
  }),
);

const cmpDatasets = cmpSubjects.flatMap((subjectId, subjectIndex) =>
  (['PRE', 'POST'] as const).map((point) => {
    const operationId = point === 'PRE' ? 'cmp-thk-pre' : 'cmp-thk-post';
    const execution = cmpExecutions.find(
      (candidate) =>
        candidate.waferSubjectIds[0] === subjectId &&
        candidate.measurementPoint === point,
    )!;
    return {
      id: `dataset-cmp-${point.toLowerCase()}-${subjectIndex + 1}`,
      experimentRunId: 'run-cmp-12',
      plannedExecutionItemId: plannedMeasurementIdentity(
        'run-cmp-12',
        subjectId,
        operationId,
      ),
      executionEventId:
        point === 'POST' ? `execution-cmp-${subjectIndex + 1}` : null,
      measurementExecutionId: execution.id,
      measurementOperationDefinitionId: 'measurement-operation-cmp-metro-v1',
      equipmentReference: 'THK-02',
      measurementPoint: point,
      sourceSystem: execution.sourceSystem,
      collectedAt: execution.completedAt,
      status: 'COLLECTED' as const,
    };
  }),
);

const cmpValues = cmpDatasets.flatMap((dataset, datasetIndex) => {
  const subjectIndex = Math.floor(datasetIndex / 2);
  const base = dataset.measurementPoint === 'PRE' ? 505 : 499;
  return sites.map(([siteIdentity, x, y], siteIndex) => ({
    id: `measurement-cmp-${dataset.measurementPoint.toLowerCase()}-${subjectIndex + 1}-${siteIndex + 1}`,
    datasetId: dataset.id,
    waferSubjectId: cmpSubjects[subjectIndex],
    physicalWaferId: `PW-CMP-${String(subjectIndex + 1).padStart(2, '0')}`,
    parameterDefinitionId: 'parameter-thickness-result-v1',
    value: {
      dataType: 'NUMBER' as const,
      value: Number(
        (base + subjectIndex * 0.4 + (siteIndex - 2) * 0.3).toFixed(2),
      ),
    },
    unitDefinitionId: 'unit-nm',
    granularity: 'SITE' as const,
    siteIdentity,
    coordinateValues: [
      { coordinateDefinitionId: 'coordinate-position-x-v1', value: x * 25 },
      { coordinateDefinitionId: 'coordinate-position-y-v1', value: y * 25 },
    ],
    observedAt: dataset.collectedAt,
    sourceParameterReference: 'FILM_THK',
    acquisitionMethod:
      dataset.measurementPoint === 'PRE'
        ? ('FILE_IMPORT' as const)
        : ('INTERFACE' as const),
  }));
});

const cmpSummaries = cmpDatasets.map((dataset, datasetIndex) => {
  const subjectIndex = Math.floor(datasetIndex / 2);
  const values = cmpValues.filter((value) => value.datasetId === dataset.id);
  return {
    id: `summary-cmp-${dataset.measurementPoint.toLowerCase()}-${subjectIndex + 1}`,
    datasetId: dataset.id,
    waferSubjectId: cmpSubjects[subjectIndex],
    parameterDefinitionId: 'parameter-thickness-result-v1',
    aggregationMethod: 'MEAN' as const,
    value: {
      dataType: 'NUMBER' as const,
      value: mean(values.map((value) => value.value.value)),
    },
    unitDefinitionId: 'unit-nm',
    sourceMeasurementIds: values.map((value) => value.id),
    summaryOrigin: 'DXT_CALCULATED' as const,
    rawInputCount: values.length,
    effectiveInputCount: values.length,
  };
});

const cmp = measurementResultSetSchema.parse({
  executions: cmpExecutions,
  datasets: cmpDatasets,
  values: cmpValues,
  summaries: cmpSummaries,
  validityDecisions: [],
});

export const engineeringGridMeasurementScenarios = { PHOTO: photo, CMP: cmp };
