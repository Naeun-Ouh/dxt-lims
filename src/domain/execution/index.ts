import { z } from 'zod';

export const identityStatusSchema = z.enum([
  'UNRESOLVED',
  'CANDIDATE',
  'CONFIRMED',
  'CONFLICT',
]);

export const physicalWaferSchema = z.object({
  id: z.string().min(1),
  canonicalLabel: z.string().min(1),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
});

export const waferIdentityObservationSchema = z.object({
  id: z.string().min(1),
  physicalWaferId: z.string().min(1).nullable(),
  observedLotId: z.string().min(1),
  observedWaferId: z.string().min(1),
  slotPosition: z.string().min(1),
  operationDefinitionId: z.string().min(1).nullable(),
  observedOperationCode: z.string().min(1),
  observedAt: z.iso.datetime({ offset: true }),
  sourceSystem: z.string().min(1),
  sourceRecordReference: z.string().min(1),
  identityStatus: identityStatusSchema,
});

export const waferIdentityCandidateSchema = z.object({
  observationId: z.string().min(1),
  candidatePhysicalWaferId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export const executionEventSchema = z.object({
  id: z.string().min(1),
  experimentRunId: z.string().min(1),
  processStepId: z.string().min(1),
  plannedExecutionItemId: z.string().min(1).nullable(),
  physicalWaferId: z.string().min(1).nullable(),
  waferIdentityObservationId: z.string().min(1),
  observedOperation: z.string().min(1),
  observedRecipe: z.string().min(1),
  equipment: z.string().min(1),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }),
  executionStatus: z.enum(['OBSERVED', 'COMPLETED', 'INTERRUPTED']),
  sourceSystem: z.string().min(1),
  sourceRecordReference: z.string().min(1),
});

export type IdentityStatus = z.infer<typeof identityStatusSchema>;
export type PhysicalWafer = z.infer<typeof physicalWaferSchema>;
export type WaferIdentityObservation = z.infer<
  typeof waferIdentityObservationSchema
>;
export type WaferIdentityCandidate = z.infer<
  typeof waferIdentityCandidateSchema
>;
export type ExecutionEvent = z.infer<typeof executionEventSchema>;
