import { z } from 'zod';
import { idSchema, measurementPointSchema, typedValueSchema } from '../reference';

export const subjectMeasurementDatasetSchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  plannedExecutionItemId: idSchema.nullable(),
  executionEventId: idSchema.nullable(),
  measurementExecutionId: idSchema.nullable().default(null),
  measurementOperationDefinitionId: idSchema,
  equipmentReference: idSchema.nullable(),
  measurementPoint: measurementPointSchema,
  sourceSystem: idSchema,
  collectedAt: z.iso.datetime({ offset: true }),
  status: z.enum(['COLLECTED', 'PARTIAL', 'PENDING']),
  datasetOrigin: z.enum(['SOURCE', 'DERIVED']).default('SOURCE'),
  preprocessingExecutionId: idSchema.nullable().default(null),
});

export const subjectMeasurementValueSchema = z.object({
  id: idSchema,
  datasetId: idSchema,
  subjectId: idSchema,
  physicalSubjectId: idSchema.nullable().default(null),
  parameterDefinitionId: idSchema.nullable(),
  value: typedValueSchema,
  unitDefinitionId: idSchema.nullable(),
  granularity: z.enum(['SUBJECT', 'SITE']),
  siteIdentity: idSchema.nullable(),
  coordinateValues: z.array(
    z.object({ coordinateDefinitionId: idSchema, value: z.number() }),
  ),
  observedAt: z.iso.datetime({ offset: true }),
  sourceParameterReference: z.string().nullable(),
  acquisitionMethod: z
    .enum(['INTERFACE', 'FILE_IMPORT', 'MANUAL', 'DERIVED'])
    .default('INTERFACE'),
  adHocParameter: z
    .object({ displayName: z.string().min(1), unit: z.string().nullable() })
    .nullable()
    .default(null),
  sourceMeasurementValueIds: z.array(idSchema).default([]),
});

export const subjectMeasurementExecutionSchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  subjectIds: z.array(idSchema).min(1),
  measurementOperationDefinitionId: idSchema,
  measurementPoint: measurementPointSchema,
  sequence: z.number().int().positive(),
  startedAt: z.iso.datetime({ offset: true }),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  acquisitionMethod: z.enum(['INTERFACE', 'FILE_IMPORT', 'MANUAL']),
  sourceSystem: z.string().nullable(),
  sourceRecordReference: z.string().nullable(),
});

export const subjectMeasurementSummarySchema = z.object({
  id: idSchema,
  datasetId: idSchema,
  subjectId: idSchema,
  parameterDefinitionId: idSchema,
  aggregationMethod: z.enum(['MEAN', 'MIN', 'MAX', 'MEDIAN', 'THREE_SIGMA']),
  value: typedValueSchema,
  unitDefinitionId: idSchema.nullable(),
  sourceMeasurementIds: z.array(idSchema).min(1),
  summaryOrigin: z.enum(['SOURCE', 'DXT_CALCULATED']),
  rawInputCount: z.number().int().nonnegative().default(0),
  effectiveInputCount: z.number().int().nonnegative().default(0),
});

export const subjectMeasurementValidityDecisionSchema = z.object({
  id: idSchema,
  measurementValueId: idSchema,
  state: z.enum(['INCLUDED', 'EXCLUDED']),
  reason: z.string().nullable(),
  actor: z.string().min(1),
  decidedAt: z.iso.datetime({ offset: true }),
});

export const subjectMeasurementResultSetSchema = z.object({
  executions: z.array(subjectMeasurementExecutionSchema).default([]),
  datasets: z.array(subjectMeasurementDatasetSchema),
  values: z.array(subjectMeasurementValueSchema),
  summaries: z.array(subjectMeasurementSummarySchema),
  validityDecisions: z
    .array(subjectMeasurementValidityDecisionSchema)
    .default([]),
});

export type SubjectMeasurementDataset = z.infer<
  typeof subjectMeasurementDatasetSchema
>;
export type SubjectMeasurementValue = z.infer<
  typeof subjectMeasurementValueSchema
>;
export type SubjectMeasurementExecution = z.infer<
  typeof subjectMeasurementExecutionSchema
>;
export type SubjectMeasurementSummary = z.infer<
  typeof subjectMeasurementSummarySchema
>;
export type SubjectMeasurementValidityDecision = z.infer<
  typeof subjectMeasurementValidityDecisionSchema
>;
export type SubjectMeasurementResultSet = z.infer<
  typeof subjectMeasurementResultSetSchema
>;

export function currentSubjectMeasurementValidity(
  decisions: readonly SubjectMeasurementValidityDecision[],
) {
  const latest = new Map<string, SubjectMeasurementValidityDecision>();
  for (const decision of decisions) {
    const current = latest.get(decision.measurementValueId);
    if (!current || current.decidedAt < decision.decidedAt)
      latest.set(decision.measurementValueId, decision);
  }
  return latest;
}

export function effectiveSubjectMeasurementValues(
  values: readonly SubjectMeasurementValue[],
  decisions: readonly SubjectMeasurementValidityDecision[],
) {
  const validity = currentSubjectMeasurementValidity(decisions);
  return values.filter((value) => validity.get(value.id)?.state !== 'EXCLUDED');
}
