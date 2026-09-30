import { z } from 'zod';
import {
  idSchema,
  measurementPointSchema,
  resolveById,
  typedValueSchema,
  type ReferenceCatalog,
} from '../reference';
import { operationPlanSchema } from './operation-plan';
import { experimentalVariableRoleSchema } from './experimental-intent';

export const experimentSubjectPlanSchema = z.object({
  lotId: idSchema,
  waferIds: z.array(idSchema).min(1),
});
export const plannedReferenceValueSchema = z.object({
  dataType: z.literal('REFERENCE'),
  referenceType: z.enum(['RECIPE', 'EQUIPMENT', 'SAMPLE_REVISION', 'RESOURCE']),
  referenceId: idSchema,
});
export const scopedConditionAssignmentSchema = z.object({
  id: idSchema,
  conditionDefinitionId: idSchema,
  scope: z.enum(['OPERATION', 'RUN', 'LOT', 'WAFER', 'POSITION']),
  target: z.string().nullable(),
  intentRole: experimentalVariableRoleSchema.default('FIXED'),
  value: z.union([typedValueSchema, plannedReferenceValueSchema]),
});
export const plannedMeasurementSchema = z.object({
  id: idSchema,
  measurementOperationDefinitionId: idSchema,
  parameterDefinitionIds: z.array(idSchema).min(1),
  measurementPoint: measurementPointSchema,
  afterProcessStepId: idSchema.nullable(),
});
export const runRegistrationDraftSchema = z.object({
  configurationPackageVersionId: idSchema,
  experimentTypeDefinitionId: idSchema,
  areaDefinitionId: idSchema,
  seriesId: idSchema.nullable(),
  previousRunId: idSchema.nullable(),
  inheritedFromRunId: idSchema.nullable(),
  subject: experimentSubjectPlanSchema,
  operationPlan: operationPlanSchema,
  conditions: z.array(scopedConditionAssignmentSchema),
  measurements: z.array(plannedMeasurementSchema),
});
export type RunRegistrationDraft = z.infer<typeof runRegistrationDraftSchema>;

export function validateRunRegistrationDraft(
  input: unknown,
  definitions: ReferenceCatalog,
  sampleRevisionIds: readonly string[],
) {
  const draft = runRegistrationDraftSchema.parse(input);
  const area = resolveById(definitions.areas, draft.areaDefinitionId);
  if (area.experimentTypeDefinitionId !== draft.experimentTypeDefinitionId)
    throw new Error('Area belongs to another experiment type');
  for (const step of draft.operationPlan.steps)
    if (
      resolveById(definitions.operations, step.operationDefinitionId)
        .areaDefinitionId !== area.id
    )
      throw new Error('Operation is not available in the selected area');
  const usedConditions = new Set<string>();
  for (const assignment of draft.conditions) {
    if (usedConditions.has(assignment.conditionDefinitionId))
      throw new Error('Duplicate planned condition');
    usedConditions.add(assignment.conditionDefinitionId);
    const definition = resolveById(
      definitions.conditions,
      assignment.conditionDefinitionId,
    );
    if (!definition.areaDefinitionIds.includes(area.id))
      throw new Error('Condition is not available in the selected area');
    if (!definition.allowedScopes.includes(assignment.scope))
      throw new Error('Condition does not support the selected scope');
    if (['WAFER', 'POSITION'].includes(assignment.scope) && !assignment.target)
      throw new Error('Scoped condition requires a target');
    if (
      definition.valueType === 'SAMPLE_REVISION_REFERENCE' &&
      (assignment.value.dataType !== 'REFERENCE' ||
        assignment.value.referenceType !== 'SAMPLE_REVISION' ||
        !sampleRevisionIds.includes(assignment.value.referenceId))
    )
      throw new Error('Material condition requires an exact SampleRevision');
  }
  for (const measurement of draft.measurements) {
    const operation = resolveById(
      definitions.measurementOperations,
      measurement.measurementOperationDefinitionId,
    );
    if (operation.areaDefinitionId !== area.id)
      throw new Error(
        'Measurement operation is not available in the selected area',
      );
    for (const id of measurement.parameterDefinitionIds) {
      const parameter = resolveById(definitions.parameters, id);
      if (
        parameter.measurementOperationDefinitionId !== operation.id ||
        parameter.semanticRole !== 'MEASUREMENT'
      )
        throw new Error('Engineers may select measurement parameters only');
      if (
        !parameter.supportedMeasurementPoints.includes(
          measurement.measurementPoint,
        )
      )
        throw new Error(
          'Parameter does not support the selected measurement point',
        );
    }
  }
  return draft;
}

export function collectionParameterIds(
  parameterIds: readonly string[],
  definitions: ReferenceCatalog,
) {
  return [
    ...new Set(
      parameterIds.flatMap((id) => {
        const parameter = resolveById(definitions.parameters, id);
        return [parameter.id, ...parameter.requiredSupportingParameterIds];
      }),
    ),
  ];
}
