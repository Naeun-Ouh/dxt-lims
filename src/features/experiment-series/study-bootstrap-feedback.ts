import {
  bootstrapSetupSchema,
  type StudyBootstrapState,
} from '@/src/application/study-bootstrap';

export type BootstrapMessage = { key: string; values?: string[] };

/** Presentation of the existing command schema; never changes or fills the input. */
export function setupInputProblems(input: unknown): BootstrapMessage[] {
  const parsed = bootstrapSetupSchema.safeParse(input);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => {
    if (issue.path.length === 1 && issue.code === 'too_small') {
      if (issue.path[0] === 'subjects')
        return { key: 'Setup not saved: enter at least one Subject ID.' };
      if (issue.path[0] === 'operations')
        return { key: 'Setup not saved: add at least one Operation.' };
    }
    return {
      key: 'Setup not saved: check field {0}.',
      values: [issue.path.join('.')],
    };
  });
}

/** Reasons derive from saved authoritative state, not unsaved draft completeness. */
export function initialTargetBlockers(
  state: StudyBootstrapState,
  busy: boolean,
  dirty: boolean,
): BootstrapMessage[] {
  const reasons: BootstrapMessage[] = [];
  if (busy)
    reasons.push({
      key: 'A request is in progress. Wait for it to finish before entering the initial Target.',
    });
  if (dirty)
    reasons.push({
      key: 'Initial Target is unavailable while Setup has unsaved changes. Save Setup successfully first; correct any displayed save error.',
    });
  if (state.closed)
    reasons.push({
      key: 'Initial Target authoring is closed after a reasoning context or Run exists. Use the existing reasoning/adoption process for later changes.',
    });
  else if (!state.canInitializeReasoning)
    reasons.push({
      key: 'Initial Target requires explicit reasoning permission. Ask the responsible administrator for MANAGE_REASONING_CONTEXT.',
    });
  for (const missing of state.structuralMissing) {
    reasons.push({
      key:
        missing === 'Measurement plan'
          ? 'Initial Target is unavailable because the saved Setup has no Measurement plan. Add a Measurement Operation, select its point and parameters, then save Setup.'
          : missing === 'Subjects'
            ? 'Initial Target is unavailable because the saved Setup has no Subjects. Enter Subject IDs and save Setup.'
            : missing === 'Operations'
              ? 'Initial Target is unavailable because the saved Setup has no Operations. Add Operations and save Setup.'
              : 'Initial Target requires saved Setup prerequisites: {0}. Complete them and save Setup.',
      values: [missing],
    });
  }
  if (!state.structuralMissing.length) {
    const plans = state.setup.operations.flatMap((op) => op.measurements);
    if (
      !state.catalog.parameters.some(
        (p) =>
          p.dataType === 'NUMBER' &&
          plans.some((m) => m.parameterDefinitionIds.includes(p.id)),
      )
    )
      reasons.push({
        key: 'No numeric Target parameter is available in the saved Measurement plan. Select an eligible numeric measurement parameter and save Setup; ask the configuration administrator if none is available.',
      });
  }
  if (
    !state.catalog.evaluations.length ||
    !state.catalog.nextActionTypes.some((p) => p.active)
  )
    reasons.push({
      key: 'Exact Evaluation or active Next Action references are unavailable. Ask the configuration administrator to prepare eligible exact references before confirming a Target.',
    });
  return reasons;
}
