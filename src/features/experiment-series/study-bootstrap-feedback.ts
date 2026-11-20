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
      key: 'Initial Evaluation Criteria are already confirmed or a Run exists. Keep the saved criteria; contact the Study manager for later changes.',
    });
  else if (!state.canInitializeReasoning)
    reasons.push({
      key: 'You do not have permission to set Evaluation Criteria. Ask the Study manager for access.',
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
  if (state.executionReadiness?.status === 'NOT_READY')
    reasons.push({
      key: 'Complete and save the required execution conditions before confirming optional Evaluation Criteria.',
    });
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
  if (!state.catalog.evaluations.length)
    reasons.push({
      key: 'Evaluation references are unavailable. Ask the configuration administrator to prepare eligible references before confirming a Target.',
    });
  return reasons;
}

/** Do not pass transport, storage or internal identifiers into researcher-facing errors. */
export function bootstrapActionError(
  error: unknown,
  scope: 'setup' | 'reasoning' | 'run' | 'load',
): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === 'FORBIDDEN')
    return 'You do not have permission for this action. Ask the Study manager for access.';
  if (
    e?.code === 'NOT_FOUND' &&
    e.message === 'A persisted source Run in this Study is required.'
  )
    return 'No previous Run is available. Choose Blank or Study Default.';
  if (e?.code === 'NOT_FOUND')
    return 'This Study or its selected configuration is unavailable. Check your access with the Study manager.';
  if (e?.code === 'CONFLICT')
    return 'The Study has changed. Keep your entered values and review the latest saved state before retrying.';
  const known: Record<string, string> = {
    'This source contains unscoped conditions. Choose another source.':
      'This source contains unscoped conditions. Choose another source.',
    'Check Operation participation.': 'Check Operation participation.',
    'Conditions must belong to participating Subjects.':
      'Conditions must belong to participating Subjects.',
    'Duplicate assignment.':
      'Each condition may have only one value per Subject or one common value.',
    'A persisted source Run in this Study is required.':
      'No previous Run is available. Choose Blank or Study Default.',
    'This source contains position-specific conditions.':
      'This source contains position-specific conditions. Choose another source.',
    'Duplicate Subject identity.':
      'Subject IDs must be unique. Check the repeated IDs and save again.',
    'Measurement point and parameters are required.':
      'Select a Measurement point and parameters for the selected Measurement Operation, then save again.',
    'Measurement parameter or point is incompatible.':
      'Select compatible Measurement parameters and a point, including required supporting parameters.',
    'Assignment is not applicable.':
      'Select a condition available for this Operation and try again.',
    'Operation is not eligible for this exact configuration.':
      'Select an Operation available in the selected configuration and try again.',
    'Enter explicit Target values.': 'Enter explicit Target values.',
    'Check required Setup and Target fields.':
      'Check the Target parameter, point, rule, values and Evaluation reference.',
    'Setup not saved: enter at least one Subject ID.':
      'Setup not saved: enter at least one Subject ID.',
    'Setup not saved: add at least one Operation.':
      'Setup not saved: add at least one Operation.',
    'Complete and save the required execution conditions before creating a Run.':
      'Complete and save the required execution conditions before creating a Run.',
  };
  return (
    known[e?.message ?? ''] ??
    {
      setup: 'Could not save Setup. Check your entered values and try again.',
      reasoning:
        'Could not save Evaluation Criteria. Check the Target values and selected references, then try again.',
      run: 'Could not create or preview the Run. Check that Setup is saved and execution conditions are complete, then try again.',
      load: 'Could not load this Study. Check your connection and try again.',
    }[scope]
  );
}
