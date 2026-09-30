import {
  subjectMeasurementResultSetSchema,
  type SubjectMeasurementResultSet,
} from '@/src/domain/measurement/subject-measurement';
import {
  ApplicationError,
  type MeasurementRecord,
  type RepositoryCommand,
} from './repository-ports';
export const emptyMeasurements = () =>
  subjectMeasurementResultSetSchema.parse({
    datasets: [],
    values: [],
    summaries: [],
  });
export type MeasurementEnvelope = MeasurementRecord & {
  receipts: Record<string, { request: string; result: MeasurementRecord }>;
};
export function updateMeasurementEnvelope(
  current: MeasurementEnvelope,
  input: SubjectMeasurementResultSet,
  command: RepositoryCommand,
): MeasurementEnvelope {
  const record = subjectMeasurementResultSetSchema.parse(input);
  const request = JSON.stringify({
    record,
    expectedVersion: command.expectedVersion,
  });
  const old = current.receipts[command.commandId];
  if (old) {
    if (old.request !== request)
      throw new ApplicationError(
        'CONFLICT',
        'Measurement command identity was reused.',
      );
    return current;
  }
  if (
    command.expectedVersion !== undefined &&
    command.expectedVersion !== current.version
  )
    throw new ApplicationError(
      'CONFLICT',
      'Measurement changed. Reload before saving.',
    );
  const merged = emptyMeasurements();
  for (const key of Object.keys(merged) as Array<
    keyof SubjectMeasurementResultSet
  >) {
    const existing = new Map(current.record[key].map((row) => [row.id, row]));
    for (const row of record[key]) {
      const previous = existing.get(row.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(row))
        throw new ApplicationError(
          'CONFLICT',
          'Measurement identity is immutable. Record a new observation or validity decision.',
        );
      existing.set(row.id, row);
    }
    (merged[key] as unknown[]).push(...existing.values());
  }
  const result = {
    version: current.version + 1,
    record: structuredClone(merged),
  };
  return {
    ...result,
    receipts: { ...current.receipts, [command.commandId]: { request, result } },
  };
}
