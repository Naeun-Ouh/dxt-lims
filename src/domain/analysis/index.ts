import { z } from 'zod';
export * from './workspace';

export const analysisValueSchema = z.discriminatedUnion('dataType', [
  z.object({ dataType: z.literal('NUMBER'), value: z.number(), unit: z.string().nullable() }),
  z.object({ dataType: z.literal('CATEGORY'), value: z.string() }),
  z.object({ dataType: z.literal('TEXT'), value: z.string() }),
  z.object({ dataType: z.literal('REFERENCE'), referenceType: z.string(), referenceId: z.string(), label: z.string() }),
]);
export type AnalysisValue = z.infer<typeof analysisValueSchema>;

export const analysisConditionSchema = z.object({
  definitionId: z.string(), label: z.string(), value: analysisValueSchema,
  assignmentId: z.string(), scope: z.enum(['OPERATION','RUN','LOT','WAFER','POSITION','PROCESS_STEP']),
  sourceLabel: z.string(),
});
export const analysisResultSchema = z.object({
  id:z.string(), parameterId: z.string(), label: z.string(), value: z.number(), unit: z.string().nullable(),
  acquisitionMethod: z.enum(['INTERFACE','FILE_IMPORT','MANUAL','DERIVED']),
  aggregationMethod: z.enum(['MEAN','MEDIAN','MIN','MAX','SOURCE']),
  datasetId: z.string(), sourceMeasurementIds: z.array(z.string()), sourceLabel: z.string(),
});
export const waferAnalysisContextSchema = z.object({
  waferRef: z.string(), waferLabel: z.string(), runId: z.string(), runNumber: z.number(),
  seriesId: z.string(), seriesLabel: z.string(), lotLabel: z.string(),
  operationLabel: z.string(), recipeLabel: z.string(), equipmentLabel: z.string(),
  conditions: z.array(analysisConditionSchema), results: z.array(analysisResultSchema),
});
export type WaferAnalysisContext = z.infer<typeof waferAnalysisContextSchema>;

export const analysisWaferReferenceSchema = z.object({
  seriesId: z.string(), runId: z.string(), waferSubjectId: z.string(), physicalWaferId: z.string().nullable(),
});
export const analysisSiteReferenceSchema = z.object({
  seriesId:z.string(), runId:z.string(), waferSubjectId:z.string(), physicalWaferId:z.string().nullable(),
  datasetId:z.string(), siteIdentity:z.string(), coordinateDefinitionIds:z.array(z.string()),
});
export const savedResultReferenceSchema = z.object({
  seriesId:z.string(), runId:z.string(), waferSubjectId:z.string(), parameterId:z.string(),
  datasetId:z.string(), representativeResultId:z.string(), acquisitionMethod:z.enum(['INTERFACE','FILE_IMPORT','MANUAL','DERIVED']),
});

export const savedAnalysisSchema = z.object({
  id: z.string(), name: z.string().min(1), owner: z.string(), visibility: z.enum(['PRIVATE','SHARED']),
  grain: z.enum(['WAFER','SITE']).default('WAFER'),
  waferRefs: z.array(analysisWaferReferenceSchema).min(1),
  siteRefs: z.array(analysisSiteReferenceSchema).default([]),
  conditionDefinitionIds: z.array(z.string()), resultParameterIds: z.array(z.string()),
  sourceReferenceRevisionIds: z.array(z.string()).default([]),
  resultReferences: z.array(savedResultReferenceSchema).default([]),
  view: z.object({ type: z.enum(['TABLE','SCATTER','BAR']), xRef: z.string().nullable(), yRef: z.string().nullable(), groupRef: z.string().nullable() }),
  savedAt: z.string(),
}).superRefine((analysis,ctx)=>{
  if(analysis.grain==='SITE'&&!analysis.siteRefs.length)ctx.addIssue({code:'custom',message:'SITE grain requires site references with parent wafer provenance'});
  const wafers=new Set(analysis.waferRefs.map(ref=>`${ref.seriesId}/${ref.runId}/${ref.waferSubjectId}`));
  for(const site of analysis.siteRefs)if(!wafers.has(`${site.seriesId}/${site.runId}/${site.waferSubjectId}`))ctx.addIssue({code:'custom',message:'Site reference must belong to an explicitly selected wafer'});
});
export type SavedAnalysis = z.infer<typeof savedAnalysisSchema>;

export function composeWaferAnalysisContexts(all: WaferAnalysisContext[], waferRefs: Array<string | z.infer<typeof analysisWaferReferenceSchema>>) {
  const selected = new Set(waferRefs.map((ref)=>typeof ref==='string'?ref:`${ref.seriesId}/${ref.runId}/${ref.waferSubjectId}`));
  return all.filter((context) => selected.has(context.waferRef) || selected.has(`${context.seriesId}/${context.runId}/${context.waferLabel}`));
}

export function plottableContexts(contexts: WaferAnalysisContext[], xRef: string, yRef: string) {
  return contexts.filter((context) => resolveAnalysisValue(context, xRef) !== null && resolveAnalysisValue(context, yRef) !== null);
}

export function resolveAnalysisValue(context: WaferAnalysisContext, ref: string): AnalysisValue | null {
  const condition = context.conditions.find((item) => item.definitionId === ref);
  if (condition) return condition.value;
  const result = context.results.find((item) => item.parameterId === ref);
  return result ? { dataType:'NUMBER', value:result.value, unit:result.unit } : null;
}
