import type { ExperimentContext } from '../experiment';
import {
  definitionIdentity,
  displayValue,
  resolveById,
  unitSymbol,
} from '../reference';
export function measurementRows(
  c: ExperimentContext,
  previous?: ExperimentContext,
) {
  return c.measurements
    .map((m) => {
      const d = resolveById(
          c.definitions.measurements,
          m.measurementDefinitionId,
        ),
        p = previous?.measurements.find(
          (x) =>
            x.layer === m.layer &&
            definitionIdentity(
              resolveById(
                previous.definitions.measurements,
                x.measurementDefinitionId,
              ),
            ) === definitionIdentity(d),
        );
      const pd =
        p && previous
          ? resolveById(
              previous.definitions.measurements,
              p.measurementDefinitionId,
            )
          : null;
      const comparable =
        p &&
        pd &&
        pd.unitId === d.unitId &&
        pd.id === d.id &&
        p.value.dataType === 'NUMBER' &&
        m.value.dataType === 'NUMBER';
      const percent =
        comparable &&
        p.value.dataType === 'NUMBER' &&
        m.value.dataType === 'NUMBER' &&
        p.value.value !== 0
          ? ((m.value.value - p.value.value) / Math.abs(p.value.value)) * 100
          : null;
      const stable =
        percent !== null &&
        d.stableChangePercent !== null &&
        Math.abs(percent) <= d.stableChangePercent;
      const improved =
        percent !== null &&
        !stable &&
        ((d.preferredDirection === 'HIGHER' && percent > 0) ||
          (d.preferredDirection === 'LOWER' && percent < 0));
      const recommended =
        c.experimentType.recommendedMeasurementDefinitionIds.includes(d.id);
      return {
        id: m.id,
        parameter: d.name,
        value: displayValue(m.value, d),
        unit: unitSymbol(c.definitions, d.unitId),
        layer: m.layer,
        trendVsPreviousRun: percent,
        trendLabel: !previous
          ? 'Baseline'
          : percent === null
            ? 'Not comparable'
            : stable
              ? '≈ stable'
              : `${percent >= 0 ? '↑' : '↓'} ${Math.abs(percent).toFixed(1)}%`,
        tone: improved ? 'trend-good' : 'muted',
        order: d.displayOrder,
        recommended,
      };
    })
    .sort(
      (a, b) =>
        Number(b.recommended) - Number(a.recommended) || a.order - b.order,
    );
}
