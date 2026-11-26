import { z } from 'zod';
import { initialReasoningSchema } from './study-bootstrap';
import type { StudyReasoningContext } from './study-readiness';
import type { ReferenceCatalog } from '@/src/domain/reference';
export const criteriaSaveSchema = z
  .object({
    revisionId: z.uuid(),
    definitionId: z.uuid(),
    expectedRevision: z.number().int().min(0),
    expectedSequence: z.number().int().min(0),
    rationale: z.string().trim().min(1).max(4000),
    criteria: initialReasoningSchema,
  })
  .strict();
export const criteriaAdoptSchema = z
  .object({
    contextId: z.uuid(),
    expectedSequence: z.number().int().min(0),
    rationale: z.string().trim().min(1).max(4000),
  })
  .strict();
export type RunCriteriaState = {
  runId: string;
  packageVersionId: string;
  canManage: boolean;
  actor: string;
  origin: 'ABSENT' | 'SELECTED' | 'UNKNOWN_LEGACY';
  creationContextId: string | null;
  activeContextId: string | null;
  sequence: number;
  revisions: {
    id: string;
    definitionId: string;
    revision: number;
    context: StudyReasoningContext;
  }[];
  catalog: ReferenceCatalog;
  plans: { point: string; parameterIds: string[] }[];
};
export type CriteriaSaveInput = z.infer<typeof criteriaSaveSchema>;
export type CriteriaAdoptInput = z.infer<typeof criteriaAdoptSchema>;
