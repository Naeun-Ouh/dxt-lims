import { z } from 'zod';
export * from './configuration';
export * from './configuration-management';
export const idSchema = z.string().min(1);
export const timestampSchema = z.iso.datetime({ offset: true });
export const scopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('GLOBAL') }),
  z.object({ kind: z.literal('AREA'), ownerId: idSchema }),
  z.object({ kind: z.literal('TEAM'), ownerId: idSchema }),
  z.object({ kind: z.literal('USER'), ownerId: idSchema }),
]);
export const typedValueSchema = z.discriminatedUnion('dataType', [
  z.object({ dataType: z.literal('NUMBER'), value: z.number() }),
  z.object({ dataType: z.literal('TEXT'), value: z.string() }),
  z.object({ dataType: z.literal('BOOLEAN'), value: z.boolean() }),
  z.object({ dataType: z.literal('SELECT'), value: idSchema }),
]);
export type TypedValue = z.infer<typeof typedValueSchema>;
const definitionFields = {
  id: idSchema,
  code: idSchema,
  name: idSchema,
  version: z.number().int().positive(),
  scope: scopeSchema,
  displayOrder: z.number().int(),
  active: z.boolean(),
};
const valueFields = {
  dataType: z.enum(['NUMBER', 'TEXT', 'BOOLEAN', 'SELECT']),
  unitId: idSchema.nullable(),
  options: z.array(z.object({ code: idSchema, label: idSchema })).default([]),
};
export const conditionScopeSchema = z.enum([
  'OPERATION',
  'RUN',
  'LOT',
  'WAFER',
  'SITE',
  'POSITION',
]);
export const conditionValueTypeSchema = z.enum([
  'NUMBER',
  'TEXT',
  'BOOLEAN',
  'SELECT',
  'RECIPE_REFERENCE',
  'EQUIPMENT_REFERENCE',
  'SAMPLE_REVISION_REFERENCE',
  'RESOURCE_REFERENCE',
]);
export const measurementPointSchema = z.enum([
  'PRE',
  'INTERMEDIATE',
  'POST',
  'FINAL',
  'CUSTOM',
]);
export const operationRoleSchema = z.enum(['PROCESS', 'MEASUREMENT']);
export const coordinateDefinitionSchema = z.object({
  ...definitionFields,
  parameterDefinitionId: idSchema,
  axis: z.enum(['X', 'Y', 'ROW', 'COLUMN']),
  description: z.string(),
});
export const coordinateSetDefinitionSchema = z.object({
  ...definitionFields,
  coordinateDefinitionIds: z.array(idSchema).min(1),
  measurementOperationDefinitionIds: z.array(idSchema).min(1),
  description: z.string(),
});
export const unitDefinitionSchema = z.object({
  ...definitionFields,
  symbol: z.string(),
  dimension: idSchema,
});
export const conditionDefinitionSchema = z.object({
  ...definitionFields,
  ...valueFields,
  dataType: z.enum(['NUMBER', 'TEXT', 'BOOLEAN', 'SELECT', 'SAMPLE_REVISION']),
  category: z.enum(['MATERIAL', 'PROCESS', 'EQUIPMENT', 'OTHER']),
  required: z.boolean(),
  selectable: z.boolean(),
  sourceType: z.enum(['INPUT', 'NATIVE_SAMPLE', 'NATIVE_REFERENCE']),
  description: z.string(),
  valueType: conditionValueTypeSchema,
  unitDefinitionId: idSchema.nullable(),
  allowedScopes: z.array(conditionScopeSchema).min(1),
  defaultScope: conditionScopeSchema.optional(),
  areaDefinitionIds: z.array(idSchema),
});
export const propertyDefinitionSchema = z.object({
  ...definitionFields,
  ...valueFields,
  applicableNodeTypes: z.array(
    z.enum(['RAW_MATERIAL', 'INTERMEDIATE', 'SAMPLE_REVISION']),
  ),
  recommendedNodeTypes: z.array(
    z.enum(['RAW_MATERIAL', 'INTERMEDIATE', 'SAMPLE_REVISION']),
  ),
});
export const measurementDefinitionSchema = z.object({
  ...definitionFields,
  ...valueFields,
  preferredDirection: z.enum(['HIGHER', 'LOWER', 'NONE']),
  stableChangePercent: z.number().nonnegative().nullable(),
  parameterDefinitionId: idSchema.nullable(),
  measurementPoint: measurementPointSchema,
});
export const evaluationCriterionDefinitionSchema = z
  .object({
    ...definitionFields,
    measurementDefinitionId: idSchema,
    operator: z.enum(['GTE', 'LTE', 'BETWEEN', 'EQ']),
    threshold: typedValueSchema.nullable(),
    lowerBound: typedValueSchema.nullable(),
    upperBound: typedValueSchema.nullable(),
    required: z.boolean(),
  })
  .superRefine((c, ctx) => {
    const single = c.operator !== 'BETWEEN';
    if (single && !c.threshold)
      ctx.addIssue({
        code: 'custom',
        message: 'Single-bound criterion needs a threshold',
      });
    if (!single && (!c.lowerBound || !c.upperBound))
      ctx.addIssue({
        code: 'custom',
        message: 'Between criterion needs lower and upper bounds',
      });
  });
export const evaluationDefinitionSchema = z.object({
  ...definitionFields,
  ...valueFields,
  criterionDefinitionIds: z.array(idSchema),
  optionTones: z.record(
    z.string(),
    z.enum(['green', 'amber', 'red', 'neutral']),
  ),
});
export const componentDefinitionSchema = z.object({
  ...definitionFields,
  ...valueFields,
});
export const materialCategoryDefinitionSchema = z.object(definitionFields);
export const areaDefinitionSchema = z.object({
  ...definitionFields,
  experimentTypeDefinitionId: idSchema,
  description: z.string(),
});
export const operationDefinitionSchema = z.object({
  ...definitionFields,
  areaDefinitionId: idSchema,
  description: z.string(),
  operationRole: z.literal('PROCESS'),
});
export const parameterDefinitionSchema = z.object({
  ...definitionFields,
  measurementOperationDefinitionId: idSchema,
  description: z.string(),
  semanticRole: z.enum(['MEASUREMENT', 'COORDINATE', 'CONTEXT', 'SUPPORTING']),
  dataType: z.enum(['NUMBER', 'TEXT', 'BOOLEAN']),
  unitId: idSchema.nullable(),
  requiredSupportingParameterIds: z.array(idSchema),
  supportedMeasurementPoints: z.array(measurementPointSchema).min(1),
});
export const measurementOperationDefinitionSchema = z.object({
  ...definitionFields,
  areaDefinitionId: idSchema,
  description: z.string(),
  parameterDefinitionIds: z.array(idSchema),
  operationRole: z.literal('MEASUREMENT'),
});
export const experimentTypeDefinitionSchema = z.object({
  ...definitionFields,
  description: z.string(),
  recommendedConditionDefinitionIds: z.array(idSchema),
  recommendedMeasurementDefinitionIds: z.array(idSchema),
  recommendedEvaluationDefinitionIds: z.array(idSchema),
  recommendedEvidenceTypes: z.array(
    z.enum(['Chart', 'Image', 'Wafer Map', 'Report', 'Engineer Note']),
  ),
  areaDefinitionIds: z.array(idSchema),
});
export const nextActionTypeDefinitionSchema = z.object({
  ...definitionFields,
  description: z.string(),
  active: z.boolean(),
});
export const resourceDefinitionSchema = z.object({
  ...definitionFields,
  description: z.string(),
  resourceCategory: z.string(),
  areaDefinitionIds: z.array(idSchema),
});
export const referenceCatalogSchema = z.object({
  units: z.array(unitDefinitionSchema),
  conditions: z.array(conditionDefinitionSchema),
  properties: z.array(propertyDefinitionSchema),
  measurements: z.array(measurementDefinitionSchema),
  evaluations: z.array(evaluationDefinitionSchema),
  evaluationCriteria: z.array(evaluationCriterionDefinitionSchema),
  components: z.array(componentDefinitionSchema),
  materialCategories: z.array(materialCategoryDefinitionSchema),
  experimentTypes: z.array(experimentTypeDefinitionSchema),
  areas: z.array(areaDefinitionSchema),
  operations: z.array(operationDefinitionSchema),
  measurementOperations: z.array(measurementOperationDefinitionSchema),
  parameters: z.array(parameterDefinitionSchema),
  coordinateDefinitions: z.array(coordinateDefinitionSchema).default([]),
  coordinateSets: z.array(coordinateSetDefinitionSchema).default([]),
  nextActionTypes: z.array(nextActionTypeDefinitionSchema).default([]),
  resources: z.array(resourceDefinitionSchema).default([]),
});
export type ReferenceCatalog = z.infer<typeof referenceCatalogSchema>;
export type ConditionDefinition = z.infer<typeof conditionDefinitionSchema>;
export type ExperimentTypeDefinition = z.infer<
  typeof experimentTypeDefinitionSchema
>;
export type MeasurementDefinition = z.infer<typeof measurementDefinitionSchema>;
export type AreaDefinition = z.infer<typeof areaDefinitionSchema>;
export type OperationDefinition = z.infer<typeof operationDefinitionSchema>;
export type ParameterDefinition = z.infer<typeof parameterDefinitionSchema>;
export type MeasurementOperationDefinition = z.infer<
  typeof measurementOperationDefinitionSchema
>;
export type CoordinateDefinition = z.infer<typeof coordinateDefinitionSchema>;
export type CoordinateSetDefinition = z.infer<
  typeof coordinateSetDefinitionSchema
>;
export function resolveById<T extends { id: string }>(
  records: readonly T[],
  id: string,
): T {
  const result = records.find((r) => r.id === id);
  if (!result) throw new Error(`Unresolved reference: ${id}`);
  return result;
}
export function unitSymbol(catalog: ReferenceCatalog, unitId: string | null) {
  return unitId ? resolveById(catalog.units, unitId).symbol : '';
}
export function validateTypedValue(
  value: TypedValue,
  definition: { dataType: string; options: { code: string }[] },
) {
  typedValueSchema.parse(value);
  if (value.dataType !== definition.dataType)
    throw new Error('Value type does not match its definition');
  if (
    value.dataType === 'SELECT' &&
    !definition.options.some((o) => o.code === value.value)
  )
    throw new Error('Value is not a configured option');
}
export function displayValue(
  value: TypedValue,
  definition: { options: { code: string; label: string }[] },
) {
  return value.dataType === 'SELECT'
    ? (definition.options.find((o) => o.code === value.value)?.label ??
        String(value.value))
    : value.dataType === 'BOOLEAN'
      ? value.value
        ? 'Yes'
        : 'No'
      : value.value;
}
// Codes identify a concept only inside its governance scope; IDs pin an immutable definition revision.
export function definitionIdentity(d: {
  code: string;
  scope: z.infer<typeof scopeSchema>;
}) {
  return JSON.stringify([
    d.scope.kind,
    'ownerId' in d.scope ? d.scope.ownerId : null,
    d.code,
  ]);
}
export function validateReferenceCatalog(input: unknown): ReferenceCatalog {
  const c = referenceCatalogSchema.parse(input);
  for (const group of Object.values(c)) {
    const ids = new Set<string>();
    const versions = new Set<string>();
    for (const d of group) {
      if (ids.has(d.id)) throw new Error(`Duplicate definition ID: ${d.id}`);
      ids.add(d.id);
      const key = definitionIdentity(d) + ':' + d.version;
      if (versions.has(key))
        throw new Error(`Duplicate definition version: ${d.code}`);
      versions.add(key);
      if ('unitId' in d && d.unitId) resolveById(c.units, d.unitId);
      if (
        'options' in d &&
        new Set(d.options.map((o) => o.code)).size !== d.options.length
      )
        throw new Error('Duplicate option code');
    }
  }
  for (const d of c.conditions) {
    if (
      (d.dataType === 'SAMPLE_REVISION') !== (d.category === 'MATERIAL') ||
      (d.category === 'MATERIAL' && d.sourceType !== 'NATIVE_SAMPLE')
    )
      throw new Error('Material conditions must use native sample revisions');
    d.areaDefinitionIds.forEach((id) => resolveById(c.areas, id));
  }
  for (const criterion of c.evaluationCriteria) {
    const metric = resolveById(
      c.measurements,
      criterion.measurementDefinitionId,
    );
    for (const value of [
      criterion.threshold,
      criterion.lowerBound,
      criterion.upperBound,
    ])
      if (value) validateTypedValue(value, metric);
  }
  for (const evaluation of c.evaluations) {
    if (
      new Set(evaluation.criterionDefinitionIds).size !==
      evaluation.criterionDefinitionIds.length
    )
      throw new Error('Duplicate evaluation criterion reference');
    evaluation.criterionDefinitionIds.forEach((id) =>
      resolveById(c.evaluationCriteria, id),
    );
  }
  for (const t of c.experimentTypes) {
    t.recommendedConditionDefinitionIds.forEach((id) =>
      resolveById(c.conditions, id),
    );
    t.recommendedMeasurementDefinitionIds.forEach((id) =>
      resolveById(c.measurements, id),
    );
    t.recommendedEvaluationDefinitionIds.forEach((id) =>
      resolveById(c.evaluations, id),
    );
    t.areaDefinitionIds.forEach((id) => {
      if (resolveById(c.areas, id).experimentTypeDefinitionId !== t.id)
        throw new Error('Area belongs to another experiment type');
    });
  }
  for (const area of c.areas)
    resolveById(c.experimentTypes, area.experimentTypeDefinitionId);
  for (const operation of c.operations)
    resolveById(c.areas, operation.areaDefinitionId);
  for (const operation of c.measurementOperations) {
    resolveById(c.areas, operation.areaDefinitionId);
    operation.parameterDefinitionIds.forEach((id) => {
      if (
        resolveById(c.parameters, id).measurementOperationDefinitionId !==
        operation.id
      )
        throw new Error('Parameter belongs to another measurement operation');
    });
  }
  for (const parameter of c.parameters) {
    resolveById(
      c.measurementOperations,
      parameter.measurementOperationDefinitionId,
    );
    if (parameter.unitId) resolveById(c.units, parameter.unitId);
    parameter.requiredSupportingParameterIds.forEach((id) => {
      const supporting = resolveById(c.parameters, id);
      if (
        supporting.measurementOperationDefinitionId !==
        parameter.measurementOperationDefinitionId
      )
        throw new Error(
          'Supporting parameter belongs to another measurement operation',
        );
      if (
        !['COORDINATE', 'CONTEXT', 'SUPPORTING'].includes(
          supporting.semanticRole,
        )
      )
        throw new Error(
          'Measurement dependency must be a supporting parameter',
        );
    });
  }
  for (const measurement of c.measurements)
    if (measurement.parameterDefinitionId)
      resolveById(c.parameters, measurement.parameterDefinitionId);
  for (const coordinate of c.coordinateDefinitions) {
    const parameter = resolveById(
      c.parameters,
      coordinate.parameterDefinitionId,
    );
    if (parameter.semanticRole !== 'COORDINATE')
      throw new Error('Coordinate definition requires a coordinate parameter');
  }
  for (const set of c.coordinateSets) {
    set.coordinateDefinitionIds.forEach((id) =>
      resolveById(c.coordinateDefinitions, id),
    );
    set.measurementOperationDefinitionIds.forEach((id) =>
      resolveById(c.measurementOperations, id),
    );
  }
  return c;
}
