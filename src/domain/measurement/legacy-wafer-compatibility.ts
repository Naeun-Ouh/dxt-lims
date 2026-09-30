import type { MeasurementResultSet } from './index';
import {
  subjectMeasurementResultSetSchema,
  type SubjectMeasurementResultSet,
} from './subject-measurement';

/**
 * Read-only transition adapter. Legacy wafer-shaped records are normalized
 * once; all shared workspace behavior consumes the Subject contract returned.
 */
export function normalizeLegacyWaferMeasurements(
  legacy: MeasurementResultSet,
): SubjectMeasurementResultSet {
  return subjectMeasurementResultSetSchema.parse({
    executions: legacy.executions.map((execution) => ({
      ...execution,
      subjectIds: execution.waferSubjectIds,
      waferSubjectIds: undefined,
    })),
    datasets: legacy.datasets,
    values: legacy.values.map((value) => ({
      ...value,
      subjectId: value.waferSubjectId,
      physicalSubjectId: value.physicalWaferId,
      granularity: value.granularity === 'WAFER' ? 'SUBJECT' : 'SITE',
      waferSubjectId: undefined,
      physicalWaferId: undefined,
    })),
    summaries: legacy.summaries.map((summary) => ({
      ...summary,
      subjectId: summary.waferSubjectId,
      waferSubjectId: undefined,
    })),
    validityDecisions: legacy.validityDecisions,
  });
}
