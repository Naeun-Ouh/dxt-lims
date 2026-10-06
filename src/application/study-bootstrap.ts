import { z } from 'zod';
import {
  measurementPointSchema,
  type ReferenceCatalog,
} from '@/src/domain/reference';
import { targetBindingsSchema, type StudyReadiness } from './study-readiness';
import type {
  StudySetupSnapshot,
  StudySetupOperation,
} from '@/src/features/experiment-series/study-setup-model';

const identity = z.string().trim().min(1).max(200);
export const bootstrapSetupSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    subjects: z
      .array(z.object({ id: identity, displayLabel: identity }).strict())
      .min(1)
      .max(500),
    operations: z
      .array(
        z
          .object({
            optionId: identity,
            point: measurementPointSchema.nullable(),
            parameterIds: z.array(identity),
            items: z.array(
              z
                .object({
                  applicabilityId: identity,
                  value: z.string().max(4000),
                  intentRole: z.enum(['FIXED', 'VARIED']),
                })
                .strict(),
            ),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();
export type BootstrapSetupInput = z.infer<typeof bootstrapSetupSchema>;
export const initialReasoningSchema = z
  .object({
    packageVersionId: identity,
    targetBindings: targetBindingsSchema,
    evaluationIds: z.array(identity).min(1),
    nextActionIds: z.array(identity).min(1),
    confirmed: z.literal(true),
  })
  .strict();
export type InitialReasoningInput = z.infer<typeof initialReasoningSchema>;
export type BootstrapOperationOption = {
  id: string;
  operation: StudySetupOperation;
  parameterIds: string[];
};
export type StudyBootstrapState = {
  setup: StudySetupSnapshot;
  subjects: BootstrapSetupInput['subjects'];
  options: BootstrapOperationOption[];
  catalog: ReferenceCatalog;
  structuralMissing: string[];
  readiness: StudyReadiness;
  canEditSetup: boolean;
  canInitializeReasoning: boolean;
  canCreateRun: boolean;
  closed: boolean;
  runNumbers: number[];
};
