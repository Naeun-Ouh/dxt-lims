import type { RunPlanningSnapshot } from './planning-model';

/** Membership, not a split-group identity. Assignments and evidence are untouched. */
export function editOperationParticipation(
  snapshot: RunPlanningSnapshot,
  operationId: string,
  subjectIds: readonly string[],
  participating: boolean,
  readOnly = false,
): RunPlanningSnapshot {
  if (readOnly) throw new Error('Plan is read-only');
  if (!snapshot.steps.some((step) => step.id === operationId))
    throw new Error('Unknown operation');
  if (
    subjectIds.some(
      (id) => !snapshot.subjects.some((subject) => subject.id === id),
    )
  )
    throw new Error('Unknown subject');
  const selected = new Set(subjectIds);
  return {
    ...snapshot,
    subjectOperationIds: Object.fromEntries(
      snapshot.subjects.map((subject) => {
        const ids = snapshot.subjectOperationIds[subject.id] ?? [];
        return [
          subject.id,
          !selected.has(subject.id)
            ? [...ids]
            : participating
              ? snapshot.steps
                  .filter(
                    (step) => step.id === operationId || ids.includes(step.id),
                  )
                  .map((step) => step.id)
              : ids.filter((id) => id !== operationId),
        ];
      }),
    ),
  };
}

/** Call only when inserting a NEW downstream operation; explicit existing membership wins. */
export function inheritNewOperationParticipation(
  previous: RunPlanningSnapshot,
  next: RunPlanningSnapshot,
) {
  const existing = new Set(previous.steps.map((step) => step.id));
  let result = next;
  for (const [index, step] of next.steps.entries()) {
    if (
      existing.has(step.id) ||
      Object.values(next.subjectOperationIds).some((ids) =>
        ids.includes(step.id),
      )
    )
      continue;
    const upstream = next.steps[index - 1];
    const participants = next.subjects
      .filter((subject) =>
        upstream
          ? result.subjectOperationIds[subject.id]?.includes(upstream.id)
          : false,
      )
      .map((subject) => subject.id);
    result = editOperationParticipation(result, step.id, participants, true);
  }
  return result;
}
