import type {
  ExecutionEvent,
  WaferIdentityObservation,
} from '@/src/domain/execution';
import type { ActualExecutionEvidence } from './actual-execution-model';

export type LegacySemiconductorExecutionEvidence = {
  event: ExecutionEvent;
  identityObservation: WaferIdentityObservation | null;
  resolvedSubjectId: string;
  observedValues: Array<{ definitionId: string; value: string }>;
  retrievedAt: string;
};

/** Converts valid wafer/MES evidence into the generic Subject execution contract. */
export function normalizeLegacySemiconductorExecution(
  legacy: readonly LegacySemiconductorExecutionEvidence[],
): ActualExecutionEvidence[] {
  return legacy.map((record) => ({
    event: {
      id: record.event.id,
      experimentRunId: record.event.experimentRunId,
      processStepId: record.event.processStepId,
      plannedExecutionItemId: record.event.plannedExecutionItemId,
      observedOperation: record.event.observedOperation,
      observedRecipe: record.event.observedRecipe,
      equipment: record.event.equipment,
      startedAt: record.event.startedAt,
      endedAt: record.event.endedAt,
      executionStatus: record.event.executionStatus,
      sourceSystem: record.event.sourceSystem,
      sourceRecordReference: record.event.sourceRecordReference,
    },
    identityContext: record.identityObservation
      ? {
          attributes: [
            {
              label: 'Observed Lot',
              value: record.identityObservation.observedLotId ?? 'Unresolved',
            },
            {
              label: 'Physical Wafer',
              value: record.identityObservation.physicalWaferId ?? 'Unresolved',
            },
          ],
        }
      : null,
    resolvedSubjectId: record.resolvedSubjectId,
    observedValues: structuredClone(record.observedValues),
    retrievedAt: record.retrievedAt,
  }));
}
