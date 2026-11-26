/** Translate infrastructure failures at the researcher-facing lifecycle boundary. */
export function lifecycleErrorMessage(
  error: unknown,
  stage: 'load' | 'actual' | 'measurement',
): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === 'FORBIDDEN')
    return 'You do not have permission for this action. Ask the Study manager for access.';
  if (e?.code === 'CONFLICT')
    return 'The saved evidence has changed. Keep your entered values, reload the latest evidence and try again.';
  if (e?.code === 'NOT_FOUND')
    return 'This Run or its Measurement definitions are unavailable. Ask the Study manager to check the experiment configuration.';
  const known = [
    'Measurement value is required.',
    'Measurement value must be a valid number.',
    'Site is required for Site-grain Measurement.',
    'Site coordinates are required for Site-grain Measurement.',
    'Execution start is required.',
    'Completion time is required for a completed execution.',
    'Select a valid Operation and Subject.',
    'Select a valid Measurement Operation and Subject.',
  ];
  if (known.includes(e?.message ?? '')) return e.message!;
  return {
    load: 'Could not load saved execution or Measurement evidence. Check your connection and access, then reload.',
    actual:
      'Could not save Actual. Check the Operation, applicable Subject and execution times, then try again.',
    measurement:
      'Could not save Measurement. Check the selected Operation, parameter, value and measurement location, then try again.',
  }[stage];
}
