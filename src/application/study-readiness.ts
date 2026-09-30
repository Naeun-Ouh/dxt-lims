import { z } from 'zod';
import { experimentSeriesSchema } from '@/src/domain/experiment';
import { measurementPointSchema, referenceCatalogSchema, type ReferenceCatalog } from '@/src/domain/reference';
import { subjectMeasurementSummarySchema } from '@/src/domain/measurement/subject-measurement';

export const targetBindingsSchema = z.array(z.object({
  target: experimentSeriesSchema.shape.targets.unwrap().element,
  measurementPoint: measurementPointSchema,
  resultGrain: z.literal('SUBJECT_SUMMARY'),
  aggregationMethod: subjectMeasurementSummarySchema.shape.aggregationMethod,
})).min(1);
export const reasoningContextSchema = z.object({targetBindings:targetBindingsSchema,catalog:referenceCatalogSchema});
export type StudyReasoningContext = z.infer<typeof reasoningContextSchema>;
export type StudyReadiness = {
  canManageReasoningContext?:boolean;
  status:'READY'|'NOT_READY'; missing:string[]; contextId:string|null;
  proposals:{id:string;packageVersionId:string;context:StudyReasoningContext}[];
};
export const confirmStudyReasoningSchema=z.object({
  packageVersionId:z.string().min(1), sourceContextId:z.string().min(1),
  targetBindings:targetBindingsSchema, confirmed:z.literal(true),
});
export type ConfirmStudyReasoning = z.infer<typeof confirmStudyReasoningSchema>;

const canonical=(x:unknown):unknown=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):x;

/** Validate scientific prerequisites, never calculate achievement or infer targets. */
export function reasoningPrerequisites(context:StudyReasoningContext, measurement:ReferenceCatalog):string[]{
  const missing:string[]=[];
  if(!context.targetBindings.length)missing.push('Target binding');
  const ids=new Set<string>();
  for(const b of context.targetBindings){
    const t=b.target;
    if(ids.has(t.id))missing.push(`Duplicate target ${t.id}`);ids.add(t.id);
    const parameter=measurement.parameters.find(p=>p.id===t.parameterDefinitionId);
    if(!parameter||parameter.dataType!=='NUMBER'||!parameter.supportedMeasurementPoints.includes(b.measurementPoint))missing.push(`Exact numeric Measurement parameter/point: ${t.parameterDefinitionId}`);
    if(!context.catalog.parameters.some(p=>p.id===t.parameterDefinitionId && JSON.stringify(canonical(p))===JSON.stringify(canonical(parameter))))missing.push(`Exact Evaluation parameter: ${t.parameterDefinitionId}`);
    if(parameter && parameter.unitId!==t.unitDefinitionId)missing.push(`Target unit: ${t.id}`);
    if(t.unitDefinitionId && !measurement.units.some(u=>u.id===t.unitDefinitionId))missing.push(`Unit: ${t.unitDefinitionId}`);
    if(t.operator==='BETWEEN' ? t.lowerBound===null||t.upperBound===null||t.lowerBound>t.upperBound : t.threshold===null)missing.push(`Target rule: ${t.id}`);
  }
  if(!context.catalog.evaluations.length)missing.push('Evaluation references');
  if(!context.catalog.nextActionTypes.some(t=>t.active))missing.push('Next Action references');
  return missing;
}
