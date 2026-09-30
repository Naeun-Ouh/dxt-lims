import { z } from 'zod';
import { idSchema, timestampSchema, typedValueSchema } from '../reference';
export const criterionAssessmentSchema = z.object({
  evaluationCriterionDefinitionId: idSchema,
  measurementSummaryId: idSchema,
  status: z.enum(['PASS', 'FAIL', 'NOT_EVALUATED']),
  evidenceIds: z.array(idSchema),
});
export const decisionSchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  evaluations: z.array(
    z.object({
      evaluationDefinitionId: idSchema,
      value: typedValueSchema,
    }),
  ),
  criterionAssessments: z.array(criterionAssessmentSchema),
  conclusion: z.string(),
  reason: z.string(),
  nextAction: z.object({ nextActionTypeDefinitionId:idSchema, note:z.string().nullable() }).nullable(),
  recordedBy: idSchema,
  recordedAt: timestampSchema,
});
export type CriterionAssessment = z.infer<typeof criterionAssessmentSchema>;
export type Decision = z.infer<typeof decisionSchema>;
