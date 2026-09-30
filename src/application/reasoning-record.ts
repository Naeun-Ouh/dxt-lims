import { z } from 'zod';
import { decisionSchema } from '@/src/domain/decision';
import { ApplicationError, type RepositoryCommand } from './repository-ports';
export const evaluationSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  subjectId: z.string().min(1),
  seriesTargetId: z.string().min(1),
  measurementSummaryId: z.string().min(1),
  disposition: z.enum(['ACCEPT', 'NEEDS_REVIEW', 'UNSUITABLE', 'INFORMATIVE']),
  comment: z.string().trim().min(1),
  evaluator: z.string().min(1),
  evaluatedAt: z.string().refine((v) => Number.isFinite(Date.parse(v))),
});
export const decisionContextSchema = z.object({
  decision: decisionSchema,
  decisionStatement: z.string().min(1),
  engineerEvaluationIds: z.array(z.string()),
  targetAchievementReferences: z.array(
    z.object({
      seriesTargetId: z.string(),
      measurementSummaryId: z.string(),
      status: z.enum([
        'ACHIEVED',
        'NOT_ACHIEVED',
        'MISSING_RESULT',
        'NOT_EVALUABLE',
      ]),
    }),
  ),
  targetScope: z.object({
    subjectIds: z.array(z.string()),
    operationIds: z.array(z.string()),
  }),
  siteScopeLabel: z.string().nullable(),
  destinationRunId: z.string().nullable(),
});
export type ReasoningEnvelope<T> = {
  version: number;
  record: T;
  receipts: Record<
    string,
    { request: string; result: { version: number; record: T } }
  >;
};
export function updateReasoning<T>(
  current: ReasoningEnvelope<T>,
  record: T,
  command: RepositoryCommand,
): ReasoningEnvelope<T> {
  const request = JSON.stringify({
    record,
    expectedVersion: command.expectedVersion,
  });
  const old = current.receipts[command.commandId];
  if (old) {
    if (old.request !== request)
      throw new ApplicationError('CONFLICT', 'Command identity was reused.');
    return current;
  }
  if (
    command.expectedVersion !== undefined &&
    command.expectedVersion !== current.version
  )
    throw new ApplicationError(
      'CONFLICT',
      'Scientific reasoning changed. Reload before saving.',
    );
  const result = {
    version: current.version + 1,
    record: structuredClone(record),
  };
  return {
    ...result,
    receipts: { ...current.receipts, [command.commandId]: { request, result } },
  };
}
