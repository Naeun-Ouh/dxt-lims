import { z } from 'zod';
import { ApplicationError, type ExecutionRecord, type RepositoryCommand } from './repository-ports';

// Transport validation of the existing frozen evidence shape, not a new domain model.
export const executionEvidenceSchema = z.object({
  event: z.object({
    id: z.string().min(1), experimentRunId: z.string().min(1), processStepId: z.string().min(1),
    plannedExecutionItemId: z.string().nullable(), observedOperation: z.string(), observedRecipe: z.string(),
    equipment: z.string(), startedAt: z.string().min(1), endedAt: z.string().nullable(),
    executionStatus: z.enum(['OBSERVED', 'COMPLETED', 'INTERRUPTED']),
    sourceSystem: z.string(), sourceRecordReference: z.string(),
  }),
  identityContext: z.object({ attributes: z.array(z.object({ label: z.string(), value: z.string() })) }).nullable().optional(),
  resolvedSubjectId: z.string().min(1),
  observedValues: z.array(z.object({ definitionId: z.string().min(1), value: z.string() })),
  retrievedAt: z.string().min(1),
});
export const executionCommandSchema = z.object({ commandId: z.string().min(1), expectedVersion: z.number().int().nonnegative() });
export type ExecutionEnvelope = ExecutionRecord & {
  receipts: Record<string, { request: string; result: ExecutionRecord }>;
};
export function updateExecutionEnvelope(current: ExecutionEnvelope, records: ExecutionRecord['records'], command: RepositoryCommand): ExecutionEnvelope {
  const request = JSON.stringify({ records, expectedVersion: command.expectedVersion });
  const receipt = current.receipts[command.commandId];
  if (receipt) {
    if (receipt.request !== request) throw new ApplicationError('CONFLICT', 'Execution command identity was reused with different data.');
    return current;
  }
  if (command.expectedVersion !== current.version) throw new ApplicationError('CONFLICT', 'Execution changed before this command completed. Reload Actual before retrying.');
  const evidence = new Map(Object.values(current.receipts).flatMap((receipt) => receipt.result.records).map((item) => [item.event.id, item]));
  for (const item of records) {
    const old = evidence.get(item.event.id);
    if (old && JSON.stringify(old) !== JSON.stringify(item)) throw new ApplicationError('CONFLICT', 'Execution evidence identity is immutable. Re-author using a new command.');
  }
  const result = { version: current.version + 1, records: structuredClone(records) };
  return { ...result, receipts: { ...current.receipts, [command.commandId]: { request, result } } };
}
