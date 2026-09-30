import { z } from 'zod';
import {
  idSchema,
  measurementPointSchema,
  typedValueSchema,
} from '../reference';

// Compatibility projection used by existing Run evaluation cards.
export const measurementSummarySchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  measurementDefinitionId: idSchema,
  value: typedValueSchema,
  layer: z.enum(['RAW', 'DERIVED', 'CURATED']),
});

export const measurementDatasetSchema = z.object({
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

export const coordinateValueSchema = z.object({
  coordinateDefinitionId: idSchema,
  value: z.number(),
});

export const measurementValueSchema = z.object({
  id: idSchema,
  datasetId: idSchema,
  waferSubjectId: idSchema,
  physicalWaferId: idSchema.nullable(),
  parameterDefinitionId: idSchema.nullable(),
  value: typedValueSchema,
  unitDefinitionId: idSchema.nullable(),
  granularity: z.enum(['WAFER', 'SITE']),
  siteIdentity: idSchema.nullable(),
  coordinateValues: z.array(coordinateValueSchema),
  observedAt: z.iso.datetime({ offset: true }),
  sourceParameterReference: z.string().nullable(),
  acquisitionMethod: z.enum(['INTERFACE', 'FILE_IMPORT', 'MANUAL', 'DERIVED']).default('INTERFACE'),
  adHocParameter: z.object({
    displayName: z.string().min(1),
    unit: z.string().nullable(),
  }).nullable().default(null),
  sourceMeasurementValueIds: z.array(idSchema).default([]),
});

export const measurementExecutionSchema = z.object({
  id: idSchema, experimentRunId: idSchema, waferSubjectIds: z.array(idSchema).min(1),
  measurementOperationDefinitionId: idSchema, measurementPoint: measurementPointSchema,
  sequence: z.number().int().positive(), startedAt: z.iso.datetime({offset:true}), completedAt: z.iso.datetime({offset:true}).nullable(),
  acquisitionMethod: z.enum(['INTERFACE','FILE_IMPORT','MANUAL']), sourceSystem: z.string().nullable(), sourceRecordReference: z.string().nullable(),
});

export const measurementValidityDecisionSchema = z.object({
  id: idSchema,
  measurementValueId: idSchema,
  state: z.enum(['INCLUDED', 'EXCLUDED']),
  reason: z.string().nullable(),
  actor: z.string().min(1),
  decidedAt: z.iso.datetime({ offset: true }),
});

export const waferMeasurementSummarySchema = z.object({
  id: idSchema,
  datasetId: idSchema,
  waferSubjectId: idSchema,
  parameterDefinitionId: idSchema,
  aggregationMethod: z.enum([
    'MEAN',
    'MIN',
    'MAX',
    'MEDIAN',
    'THREE_SIGMA',
  ]),
  value: typedValueSchema,
  unitDefinitionId: idSchema.nullable(),
  sourceMeasurementIds: z.array(idSchema).min(1),
  summaryOrigin: z.enum(['SOURCE', 'DXT_CALCULATED']),
  rawInputCount: z.number().int().nonnegative().default(0),
  effectiveInputCount: z.number().int().nonnegative().default(0),
});

export const measurementResultSetSchema = z.object({
  executions: z.array(measurementExecutionSchema).default([]),
  datasets: z.array(measurementDatasetSchema),
  values: z.array(measurementValueSchema),
  summaries: z.array(waferMeasurementSummarySchema),
  validityDecisions: z.array(measurementValidityDecisionSchema).default([]),
});

export type MeasurementSummary = z.infer<typeof measurementSummarySchema>;
export type MeasurementDataset = z.infer<typeof measurementDatasetSchema>;
export type MeasurementValue = z.infer<typeof measurementValueSchema>;
export type WaferMeasurementSummary = z.infer<
  typeof waferMeasurementSummarySchema
>;
export type MeasurementResultSet = z.infer<typeof measurementResultSetSchema>;
export type MeasurementValidityDecision = z.infer<typeof measurementValidityDecisionSchema>;
export type MeasurementExecution = z.infer<typeof measurementExecutionSchema>;
export type StandardAggregationMethod = 'MIN' | 'MAX' | 'MEAN' | 'MEDIAN';

export function currentValidity(decisions: readonly MeasurementValidityDecision[]) {
  const latest = new Map<string, MeasurementValidityDecision>();
  for (const decision of decisions) {
    const current = latest.get(decision.measurementValueId);
    if (!current || current.decidedAt < decision.decidedAt)
      latest.set(decision.measurementValueId, decision);
  }
  return latest;
}

export function effectiveMeasurementValues(
  values: readonly MeasurementValue[],
  decisions: readonly MeasurementValidityDecision[],
) {
  const validity = currentValidity(decisions);
  return values.filter((value) => validity.get(value.id)?.state !== 'EXCLUDED');
}

export function aggregateMeasurements(
  values: readonly MeasurementValue[],
  method: StandardAggregationMethod,
) {
  const numbers = values.map((item) => item.value).filter((value): value is {dataType:'NUMBER';value:number} => value.dataType === 'NUMBER').map((value) => value.value).sort((a,b)=>a-b);
  if (!numbers.length) return null;
  if (method === 'MIN') return numbers[0];
  if (method === 'MAX') return numbers.at(-1)!;
  if (method === 'MEAN') return numbers.reduce((sum,value)=>sum+value,0)/numbers.length;
  const middle=Math.floor(numbers.length/2);
  return numbers.length%2 ? numbers[middle] : (numbers[middle-1]+numbers[middle])/2;
}
