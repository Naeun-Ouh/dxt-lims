import type { AnalysisMeasurementSource } from '@/src/domain/analysis';
import { plannedMeasurementIdentity } from '@/src/features/run-registration/measurement-grid-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';

/** Read projection of the exact persisted Run plan, never Study defaults. */
export function analysisMeasurementApplicability(
  snapshot: RunPlanningSnapshot,
): NonNullable<AnalysisMeasurementSource['measurementApplicability']> {
  return snapshot.measurements.flatMap((plan) => {
    const operation = snapshot.steps.find(
      (step) => step.id === plan.stepId && step.role === 'MEASUREMENT',
    );
    if (!operation) return [];
    return [
      {
        operationId: operation.id,
        operationLabel: operation.label,
        measurementOperationDefinitionId: plan.measurementOperationDefinitionId,
        measurementPoint: plan.point,
        parameterIds: [...plan.parameterDefinitionIds],
        subjects: snapshot.subjects.map((subject) => ({
          id: subject.id,
          applies:
            snapshot.subjectOperationIds[subject.id]?.includes(operation.id) ??
            null,
          plannedExecutionItemId: plannedMeasurementIdentity(
            snapshot.id,
            subject.id,
            operation.id,
          ),
        })),
      },
    ];
  });
}
