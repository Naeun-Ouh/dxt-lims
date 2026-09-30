import type { SubjectRef } from '@/src/domain/experiment/subject';
import type { RunPlanningSnapshot } from './planning-model';

/** Read-only compatibility shape for persisted semiconductor planning fixtures. */
export type LegacySemiconductorPlanningSnapshot = Omit<
  RunPlanningSnapshot,
  'subjects' | 'subjectOperationIds' | 'manufacturingContext'
> & {
  lotId: string;
  wafers: Array<{ id: string; slot: number }>;
  waferStepIds: Record<string, string[]>;
};

/**
 * Legacy names are consumed only here. The returned forward contract contains
 * one authoritative Subject identity and Subject-to-Operation connectivity.
 */
export function normalizeLegacySemiconductorPlanning(
  legacy: LegacySemiconductorPlanningSnapshot,
): RunPlanningSnapshot {
  const subjects: SubjectRef[] = legacy.wafers.map((wafer) => ({
    id: wafer.id,
    type: 'WAFER',
    displayLabel: `W${String(wafer.slot).padStart(2, '0')}`,
  }));
  const {
    lotId,
    wafers: _wafers,
    waferStepIds,
    ...generic
  } = legacy;
  return {
    ...generic,
    subjects,
    subjectOperationIds: structuredClone(waferStepIds),
    manufacturingContext: [{ label: 'Lot', value: lotId }],
  };
}
