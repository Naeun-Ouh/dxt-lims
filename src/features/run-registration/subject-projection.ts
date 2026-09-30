import type { PhysicalWafer } from '@/src/domain/execution';
import type { SubjectRef } from '@/src/domain/experiment/subject';

// PROJECTION: PhysicalWafer remains the semiconductor model; the workspace sees SubjectRef.
export function physicalWaferToSubjectRef(wafer: PhysicalWafer): SubjectRef {
  return {
    id: wafer.id,
    type: 'WAFER',
    displayLabel: wafer.canonicalLabel,
  };
}

export function semiconductorSubjectCandidates(
  lotId: string,
  count = 25,
): SubjectRef[] {
  return Array.from({ length: count }, (_, index) =>
    physicalWaferToSubjectRef({
      id: `${lotId}.${String(index + 1).padStart(2, '0')}`,
      canonicalLabel: `W${String(index + 1).padStart(2, '0')}`,
      status: 'ACTIVE',
    }),
  );
}
