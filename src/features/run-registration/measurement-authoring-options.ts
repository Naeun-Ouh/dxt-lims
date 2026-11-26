import type { ReferenceCatalog } from '@/src/domain/reference';
import type { RunPlanningSnapshot } from './planning-model';

/** Entry choices are projected from this exact Run step, never from catalog availability alone. */
export function measurementAuthoringOptions(
  snapshot: RunPlanningSnapshot,
  catalog: ReferenceCatalog,
  operationId: string,
) {
  const plan = snapshot.measurements.find(
    (item) => item.stepId === operationId,
  );
  const parameters = plan
    ? catalog.parameters.filter(
        (item) =>
          plan.parameterDefinitionIds.includes(item.id) &&
          item.semanticRole === 'MEASUREMENT' &&
          item.measurementOperationDefinitionId ===
            plan.measurementOperationDefinitionId &&
          item.supportedMeasurementPoints.includes(plan.point),
      )
    : [];
  return { plan, parameters };
}
