import { ApplicationError } from './repository-ports';
import { effectiveAssignments, type RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';

export type ConditionInterpretationChange = {
  operation: string;
  subject: string;
  condition: string;
  before: string | null;
  after: string | null;
  beforeRole: 'FIXED' | 'VARIED' | null;
  afterRole: 'FIXED' | 'VARIED' | null;
};

/** Application policy for NEW plans only. Never call from historical readback. */
export function prospectiveConditions(snapshot: RunPlanningSnapshot): RunPlanningSnapshot {
  const keys = new Set<string>();
  for (const a of snapshot.assignments) {
    const key = JSON.stringify([a.processStepId, a.kind, a.label, a.subjectId, a.positionId]);
    if (keys.has(key)) throw new ApplicationError('VALIDATION', 'Duplicate assignment.');
    keys.add(key);
  }
  return {
    ...snapshot,
    conditionResolution: 'SUBJECT_FIRST_V1',
    assignments: snapshot.assignments.filter(a => a.subjectId === null || !!a.value.trim()),
  };
}

/** Explain changes before confirmation without mutating the copied source. */
export function conditionInterpretationChanges(before: RunPlanningSnapshot, after: RunPlanningSnapshot): ConditionInterpretationChange[] {
  const changes: ConditionInterpretationChange[] = [];
  before.steps.forEach((step, index) => {
    const next = after.steps[index];
    if (!next || next.operationDefinitionId !== step.operationDefinitionId) return;
    for (const subject of before.subjects) {
      if (!before.subjectOperationIds[subject.id]?.includes(step.id) ||
          !after.subjectOperationIds[subject.id]?.includes(next.id)) continue;
      const oldValues = effectiveAssignments(before, subject.id);
      const newValues = effectiveAssignments(after, subject.id);
      const conditions = before.assignments.filter(a => a.processStepId === step.id && !a.positionId);
      const seen = new Set<string>();
      for (const a of conditions) {
        const key = `${a.kind}:${a.label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const old = oldValues[`${step.id}:${key}`];
        const value = newValues[`${next.id}:${key}`];
        if (old?.value === value?.value && old?.intentRole === value?.intentRole && old?.referenceId === value?.referenceId) continue;
        changes.push({operation: step.label, subject: subject.displayLabel, condition: a.label,
          before: old?.value ?? null, after: value?.value ?? null,
          beforeRole: old?.intentRole ?? null, afterRole: value?.intentRole ?? null});
      }
    }
  });
  return changes;
}

/** Flag legacy order sensitivity; do not change its existing interpretation. */
export function legacyConditionAmbiguities(snapshot: RunPlanningSnapshot): boolean {
  if (snapshot.conditionResolution) return false;
  const seen = new Set<string>();
  return snapshot.assignments.some(a => {
    const key = JSON.stringify([a.processStepId, a.kind, a.label, a.subjectId, a.positionId]);
    const duplicate = seen.has(key);
    seen.add(key);
    return duplicate || (a.subjectId !== null && !a.positionId && snapshot.assignments.some(common =>
      common.subjectId === null && !common.positionId && common.processStepId === a.processStepId &&
      common.kind === a.kind && common.label === a.label));
  });
}
