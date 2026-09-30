import { z } from 'zod';
import { idSchema } from '../reference';

/** Shared intent vocabulary; participating entities keep their own identities. */
export const experimentalVariableRoleSchema = z.enum(['FIXED','VARIED']);
export type ExperimentalVariableRole = z.infer<typeof experimentalVariableRoleSchema>;

export const recipeAssignmentSchema = z.object({
  id:idSchema, experimentRunId:idSchema, processStepId:idSchema,
  recipeRevisionId:idSchema, waferSubjectId:idSchema.nullable(),
  intentRole:experimentalVariableRoleSchema,
  provenance:z.enum(['SERIES_DEFAULT','RUN_SNAPSHOT','WAFER_OVERRIDE']),
});
export type RecipeAssignment = z.infer<typeof recipeAssignmentSchema>;
