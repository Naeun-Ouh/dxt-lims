import { z } from 'zod';
import {
  idSchema,
  measurementPointSchema,
  operationRoleSchema,
} from '../reference';
export const processStepSchema = z.object({
  id: idSchema,
  operationDefinitionId: idSchema,
  order: z.number().int().nonnegative(),
  label: idSchema,
});
export const operationPlanSchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  steps: z.array(processStepSchema).min(1),
});
export const plannedExecutionItemSchema = z
  .object({
    id: idSchema,
    experimentRunId: idSchema,
    waferSubjectId: idSchema,
    processStepId: idSchema,
    operationRole: operationRoleSchema,
    operationDefinitionId: idSchema.nullable(),
    measurementOperationDefinitionId: idSchema.nullable(),
    plannedEquipment: idSchema,
    plannedRecipe: idSchema,
    conditionAssignmentIds: z.array(idSchema),
    sequence: z.number().int().nonnegative(),
    measurementPoint: measurementPointSchema.nullable(),
  })
  .superRefine((item, context) => {
    if (
      item.operationRole === 'PROCESS' &&
      (!item.operationDefinitionId ||
        item.measurementOperationDefinitionId ||
        item.measurementPoint)
    )
      context.addIssue({
        code: 'custom',
        message: 'Process execution item requires a process operation only',
      });
    if (
      item.operationRole === 'MEASUREMENT' &&
      (!item.measurementOperationDefinitionId ||
        item.operationDefinitionId ||
        !item.measurementPoint)
    )
      context.addIssue({
        code: 'custom',
        message:
          'Measurement execution item requires an operation and measurement point',
      });
  });
export type ProcessStep = z.infer<typeof processStepSchema>;
export type OperationPlan = z.infer<typeof operationPlanSchema>;
export type PlannedExecutionItem = z.infer<typeof plannedExecutionItemSchema>;
