import { z } from 'zod';
import { studySlugSchema } from './study-creation';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { StudyReadiness } from './study-readiness';
import { runDraftSchema } from './run-draft';
import type { BootstrapOperationOption } from './study-bootstrap';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { ConditionInterpretationChange } from './condition-resolution';
export const runCreationRequestSchema = z
  .object({
    seriesSlug: studySlugSchema,
    source: z.enum(['STUDY_DEFAULT', 'PREVIOUS_RUN', 'EXISTING_RUN', 'BLANK']),
    sourceRunId: z.string().min(1).optional(),
    draft: runDraftSchema.optional(),
    includeDraftOptions: z.literal(true).optional(),
    sourceFingerprint: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (r) => !r.draft || !!r.sourceFingerprint,
    'Review the starting source before editing.',
  );
export type RunCreationRequest = z.infer<typeof runCreationRequestSchema>;
export type AuthoritativeRunPreview = {
  sourceChanges?: ConditionInterpretationChange[];
  legacySourceAmbiguous?: boolean;
  snapshot: RunPlanningSnapshot;
  fingerprint: string;
  sourceFingerprint?: string;
  options?: BootstrapOperationOption[];
  catalog?: ReferenceCatalog;
  readiness: Pick<StudyReadiness, 'status' | 'missing'> & {warnings?:string[]};
};
