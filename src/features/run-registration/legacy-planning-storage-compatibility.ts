/** Normalizes persisted v0 assignment keys before generic schema validation. */
export function normalizeLegacyPlanningStorage(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const record = input as Record<string, unknown>;
  if (!Array.isArray(record.assignments)) return input;
  return {
    ...record,
    assignments: record.assignments.map((value) => {
      if (!value || typeof value !== 'object') return value;
      const legacy = value as Record<string, unknown>;
      if ('subjectId' in legacy) return legacy;
      const { waferId, ...rest } = legacy;
      return { ...rest, subjectId: waferId ?? null };
    }),
  };
}
