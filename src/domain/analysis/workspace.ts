import { z } from 'zod';
import type { SubjectRef } from '../experiment/subject';
import {
  currentSubjectMeasurementValidity,
  type SubjectMeasurementResultSet,
} from '../measurement/subject-measurement';

export type AnalysisMeasurementSource = {
  studyId: string;
  studyLabel: string;
  workspaceContextLabel: string;
  runId: string;
  runNumber: number;
  subjects: SubjectRef[];
  measurements: SubjectMeasurementResultSet;
  parameterLabels: Record<string, string>;
  unitSymbols: Record<string, string>;
};

export type AnalysisAggregation = 'RAW' | 'MEAN' | 'MEDIAN' | 'MIN' | 'MAX';
export type AnalysisVisualization = 'LINE' | 'BAR' | 'SCATTER' | 'TABLE';
export type AnalysisValidity = 'INCLUDED' | 'EXCLUDED' | 'MISSING';

export type AnalysisRow = {
  id: string;
  studyId: string;
  studyLabel: string;
  runId: string;
  runNumber: number;
  subject: SubjectRef;
  measurementExecutionId: string | null;
  datasetId: string | null;
  datasetOrigin: 'SOURCE' | 'DERIVED' | null;
  parameterId: string;
  parameterLabel: string;
  value: number | null;
  unit: string;
  representativeType: AnalysisAggregation;
  representativeResultId: string | null;
  measurementValueId: string | null;
  sourceMeasurementIds: string[];
  validity: AnalysisValidity;
  exclusionReason: string | null;
  sourceSystem: string | null;
  sourceRecordReference: string | null;
  collectedAt: string | null;
  coordinates: Array<{ definitionId: string; value: number }>;
};

export type AnalysisSelection = {
  studyId: string;
  runIds: string[];
  datasetIds: string[];
  parameterIds: string[];
  subjectIds: string[];
  aggregation: AnalysisAggregation;
  datasetOrigin: 'ALL' | 'SOURCE' | 'DERIVED';
  includeExcluded: boolean;
};

const savedAnalysisSourceReferenceSchema = z.object({
  studyId: z.string(),
  runId: z.string(),
  subjectId: z.string(),
  measurementExecutionId: z.string().nullable(),
  datasetId: z.string(),
  parameterId: z.string(),
  representativeResultId: z.string().nullable(),
});

export const savedAnalysisViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  owner: z.string(),
  visibility: z.enum(['PRIVATE', 'SHARED']),
  studyId: z.string(),
  runIds: z.array(z.string()).min(1),
  subjectIds: z.array(z.string()).min(1),
  parameterIds: z.array(z.string()).min(1),
  datasetIds: z.array(z.string()).min(1),
  sourceReferences: z.array(savedAnalysisSourceReferenceSchema),
  visualization: z.object({
    type: z.enum(['LINE', 'BAR', 'SCATTER', 'TABLE']),
    xDimension: z.string(),
    groupBy: z.enum(['SUBJECT', 'RUN', 'PARAMETER']),
  }),
  preparation: z.object({
    aggregation: z.enum(['RAW', 'MEAN', 'MEDIAN', 'MIN', 'MAX']),
    datasetOrigin: z.enum(['ALL', 'SOURCE', 'DERIVED']),
    includeExcluded: z.boolean(),
  }),
  filters: z.object({
    text: z.string(),
    sort: z.enum(['RUN', 'SUBJECT', 'VALUE']),
  }),
  savedAt: z.string(),
});
export type SavedAnalysisView = z.infer<typeof savedAnalysisViewSchema>;

function aggregate(values: number[], method: Exclude<AnalysisAggregation, 'RAW'>) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  if (method === 'MIN') return ordered[0];
  if (method === 'MAX') return ordered.at(-1)!;
  if (method === 'MEDIAN') {
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2
      ? ordered[middle]
      : (ordered[middle - 1] + ordered[middle]) / 2;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function projectAnalysisRows(
  sources: readonly AnalysisMeasurementSource[],
  selection: AnalysisSelection,
): AnalysisRow[] {
  return sources
    .filter(
      (source) =>
        source.studyId === selection.studyId &&
        selection.runIds.includes(source.runId),
    )
    .flatMap((source) => {
      const validity = currentSubjectMeasurementValidity(
        source.measurements.validityDecisions,
      );
      const datasets = source.measurements.datasets.filter(
        (dataset) =>
          selection.datasetIds.includes(dataset.id) &&
          (selection.datasetOrigin === 'ALL' ||
            dataset.datasetOrigin === selection.datasetOrigin),
      );
      return source.subjects
        .filter((subject) => selection.subjectIds.includes(subject.id))
        .flatMap((subject) =>
          selection.parameterIds.flatMap((parameterId) => {
            const matchingDatasets = datasets.filter((dataset) =>
              source.measurements.values.some(
                (value) =>
                  value.datasetId === dataset.id &&
                  value.subjectId === subject.id &&
                  value.parameterDefinitionId === parameterId,
              ),
            );
            if (!matchingDatasets.length)
              return [missingRow(source, subject, parameterId, selection.aggregation)];
            return matchingDatasets.flatMap((dataset): AnalysisRow[] => {
              const execution = source.measurements.executions.find(
                (item) => item.id === dataset.measurementExecutionId,
              );
              const values = source.measurements.values.filter(
                (value) =>
                  value.datasetId === dataset.id &&
                  value.subjectId === subject.id &&
                  value.parameterDefinitionId === parameterId &&
                  value.value.dataType === 'NUMBER',
              );
              if (selection.aggregation === 'RAW')
                return values
                  .filter(
                    (value) =>
                      selection.includeExcluded ||
                      validity.get(value.id)?.state !== 'EXCLUDED',
                  )
                  .map((value) => {
                    const decision = validity.get(value.id);
                    return {
                      ...baseRow(source, subject, dataset, execution?.sourceRecordReference ?? null, parameterId),
                      id: `analysis:${source.runId}:${value.id}`,
                      value: value.value.dataType === 'NUMBER' ? value.value.value : null,
                      representativeType: 'RAW' as const,
                      representativeResultId: null,
                      measurementValueId: value.id,
                      sourceMeasurementIds: [value.id],
                      validity: decision?.state ?? ('INCLUDED' as const),
                      exclusionReason: decision?.reason ?? null,
                      coordinates: value.coordinateValues.map((coordinate) => ({
                        definitionId: coordinate.coordinateDefinitionId,
                        value: coordinate.value,
                      })),
                    };
                  });
              const included = values.filter(
                (value) => validity.get(value.id)?.state !== 'EXCLUDED',
              );
              const summary = source.measurements.summaries.find(
                (item) =>
                  item.datasetId === dataset.id &&
                  item.subjectId === subject.id &&
                  item.parameterDefinitionId === parameterId &&
                  item.aggregationMethod === selection.aggregation,
              );
              const numeric = included.map((value) =>
                value.value.dataType === 'NUMBER' ? value.value.value : Number.NaN,
              ).filter(Number.isFinite);
              return [{
                ...baseRow(source, subject, dataset, execution?.sourceRecordReference ?? null, parameterId),
                id: `analysis:${source.runId}:${dataset.id}:${subject.id}:${parameterId}:${selection.aggregation}`,
                value: summary?.value.dataType === 'NUMBER'
                  ? summary.value.value
                  : aggregate(numeric, selection.aggregation),
                representativeType: selection.aggregation,
                representativeResultId: summary?.id ?? null,
                measurementValueId: null,
                sourceMeasurementIds: summary?.sourceMeasurementIds ?? included.map((value) => value.id),
                validity: included.length ? 'INCLUDED' as const : 'MISSING' as const,
                exclusionReason: null,
                coordinates: [],
              }];
            });
          }),
        );
    });
}

function baseRow(
  source: AnalysisMeasurementSource,
  subject: SubjectRef,
  dataset: SubjectMeasurementResultSet['datasets'][number],
  sourceRecordReference: string | null,
  parameterId: string,
) {
  return {
    studyId: source.studyId,
    studyLabel: source.studyLabel,
    runId: source.runId,
    runNumber: source.runNumber,
    subject,
    measurementExecutionId: dataset.measurementExecutionId,
    datasetId: dataset.id,
    datasetOrigin: dataset.datasetOrigin,
    parameterId,
    parameterLabel: source.parameterLabels[parameterId] ?? parameterId,
    unit: source.unitSymbols[parameterId] ?? '',
    sourceSystem: dataset.sourceSystem,
    sourceRecordReference,
    collectedAt: dataset.collectedAt,
  };
}

function missingRow(
  source: AnalysisMeasurementSource,
  subject: SubjectRef,
  parameterId: string,
  aggregation: AnalysisAggregation,
): AnalysisRow {
  return {
    id: `analysis:missing:${source.runId}:${subject.id}:${parameterId}`,
    studyId: source.studyId,
    studyLabel: source.studyLabel,
    runId: source.runId,
    runNumber: source.runNumber,
    subject,
    measurementExecutionId: null,
    datasetId: null,
    datasetOrigin: null,
    parameterId,
    parameterLabel: source.parameterLabels[parameterId] ?? parameterId,
    value: null,
    unit: source.unitSymbols[parameterId] ?? '',
    representativeType: aggregation,
    representativeResultId: null,
    measurementValueId: null,
    sourceMeasurementIds: [],
    validity: 'MISSING',
    exclusionReason: null,
    sourceSystem: null,
    sourceRecordReference: null,
    collectedAt: null,
    coordinates: [],
  };
}

export function saveAnalysisView(
  input: Omit<SavedAnalysisView, 'sourceReferences'>,
  rows: readonly AnalysisRow[],
): SavedAnalysisView {
  return savedAnalysisViewSchema.parse({
    ...input,
    sourceReferences: rows
      .filter((row) => row.datasetId)
      .map((row) => ({
        studyId: row.studyId,
        runId: row.runId,
        subjectId: row.subject.id,
        measurementExecutionId: row.measurementExecutionId,
        datasetId: row.datasetId!,
        parameterId: row.parameterId,
        representativeResultId: row.representativeResultId,
      })),
  });
}
