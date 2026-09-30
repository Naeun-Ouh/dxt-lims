import { z } from 'zod';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { StudyReadiness } from './study-readiness';
export const runCreationRequestSchema=z.object({
  seriesSlug:z.enum(['dts-improvement','cmp-stability','adhesion-material-optimization']),
  source:z.enum(['STUDY_DEFAULT','PREVIOUS_RUN','EXISTING_RUN','BLANK']),
  sourceRunId:z.string().min(1).optional(),
});
export type RunCreationRequest=z.infer<typeof runCreationRequestSchema>;
export type AuthoritativeRunPreview={snapshot:RunPlanningSnapshot;fingerprint:string;readiness:Pick<StudyReadiness,'status'|'missing'>};
