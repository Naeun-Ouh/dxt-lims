import type { ExperimentContext } from '../experiment';
import { displayValue, resolveById, unitSymbol } from '../reference';
export function evaluationRows(c: ExperimentContext) {
  return (c.decision?.evaluations ?? [])
    .map((e) => {
      const d = resolveById(
        c.definitions.evaluations,
        e.evaluationDefinitionId,
      );
      return {
        id: d.id,
        name: d.name,
        value: displayValue(e.value, d),
        unit: unitSymbol(c.definitions, d.unitId),
        tone: d.optionTones[String(e.value.value)] ?? 'neutral',
        order: d.displayOrder,
        recommended:
          c.experimentType.recommendedEvaluationDefinitionIds.includes(d.id),
      };
    })
    .sort(
      (a, b) =>
        Number(b.recommended) - Number(a.recommended) || a.order - b.order,
    );
}
export function criterionRows(c: ExperimentContext) {
  return (c.decision?.criterionAssessments ?? [])
    .map((assessment) => {
      const criterion = resolveById(
          c.definitions.evaluationCriteria,
          assessment.evaluationCriterionDefinitionId,
        ),
        metric = resolveById(
          c.definitions.measurements,
          criterion.measurementDefinitionId,
        ),
        measurement = resolveById(
          c.measurements,
          assessment.measurementSummaryId,
        ),
        unit = unitSymbol(c.definitions, metric.unitId),
        show = (value: typeof criterion.threshold) =>
          value
            ? `${displayValue(value, metric)}${unit ? ` ${unit}` : ''}`
            : '';
      const rule =
        criterion.operator === 'BETWEEN'
          ? `${show(criterion.lowerBound)} – ${show(criterion.upperBound)}`
          : `${criterion.operator === 'GTE' ? '≥' : criterion.operator === 'LTE' ? '≤' : '='} ${show(criterion.threshold)}`;
      return {
        id: criterion.id,
        name: metric.name,
        rule,
        observed: `${displayValue(measurement.value, metric)}${unit ? ` ${unit}` : ''}`,
        status: assessment.status,
        evidenceIds: assessment.evidenceIds,
        order: criterion.displayOrder,
      };
    })
    .sort((a, b) => a.order - b.order);
}
