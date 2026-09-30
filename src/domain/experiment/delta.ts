import type { ExperimentContext } from './index';
import {
  resolveById,
  unitSymbol,
  displayValue,
  definitionIdentity,
} from '../reference';
export type ExperimentConditionState = {
  key: string;
  type: 'MATERIAL' | 'CONDITION';
  category: string;
  label: string;
  value: string | number;
  unit: string;
  detail: string | null;
  order: number;
  identity: string;
};
export type ExperimentDeltaEntry = {
  key: string;
  type: 'MATERIAL' | 'CONDITION';
  category: string;
  label: string;
  change: 'ADDED' | 'CHANGED' | 'REMOVED' | 'UNCHANGED';
  previous: string | number | null;
  current: string | number | null;
  unit: string;
  previousUnit: string | null;
  previousDetail: string | null;
  currentDetail: string | null;
};
export type ExperimentDelta = {
  isBaseline: boolean;
  changed: ExperimentDeltaEntry[];
  unchanged: ExperimentDeltaEntry[];
  unchangedCount: number;
  totalCurrentCount: number;
};
export function experimentConditionState(
  c: ExperimentContext,
): ExperimentConditionState[] {
  const scalar = c.conditionSet.conditions.map((v) => {
    const d = resolveById(c.definitions.conditions, v.conditionDefinitionId);
    return {
      key: `condition:${definitionIdentity(d)}`,
      type: 'CONDITION' as const,
      category: d.category,
      label: d.name,
      value: displayValue(v.value, d),
      unit: unitSymbol(c.definitions, d.unitId),
      detail: null,
      order: d.displayOrder,
      identity: JSON.stringify([d.id, v.value]),
    };
  });
  const material = c.materials.map((m) => {
    const d = resolveById(
      c.definitions.conditions,
      m.condition.conditionDefinitionId,
    );
    return {
      key: `material:${definitionIdentity(d)}:${m.condition.bindingKey}`,
      type: 'MATERIAL' as const,
      category: 'MATERIAL',
      label: d.name,
      value: m.sample.sampleCode,
      unit: '',
      detail: `Revision ${m.sampleRevision.revision} · ${m.usage.role}`,
      order: d.displayOrder,
      identity: JSON.stringify([d.id, m.sampleRevision.id, m.usage.role]),
    };
  });
  return [...scalar, ...material].sort(
    (a, b) => a.order - b.order || a.key.localeCompare(b.key),
  );
}
export function createExperimentDelta(
  current: ExperimentContext,
  previous?: ExperimentContext,
): ExperimentDelta {
  if (previous && current.series.id !== previous.series.id)
    throw new Error('Cannot compare runs from different series');
  const now = experimentConditionState(current),
    before = previous ? experimentConditionState(previous) : [],
    old = new Map(before.map((x) => [x.key, x])),
    keys = new Set(now.map((x) => x.key));
  const entries: ExperimentDeltaEntry[] = now.map((x) => {
    const p = old.get(x.key);
    return {
      key: x.key,
      type: x.type,
      category: x.category,
      label: x.label,
      change: !p
        ? 'ADDED'
        : p.identity === x.identity
          ? 'UNCHANGED'
          : 'CHANGED',
      previous: p?.value ?? null,
      current: x.value,
      unit: x.unit,
      previousUnit: p?.unit ?? null,
      previousDetail: p?.detail ?? null,
      currentDetail: x.detail,
    };
  });
  for (const p of before)
    if (!keys.has(p.key))
      entries.push({
        key: p.key,
        type: p.type,
        category: p.category,
        label: p.label,
        change: 'REMOVED',
        previous: p.value,
        current: null,
        unit: p.unit,
        previousUnit: p.unit,
        previousDetail: p.detail,
        currentDetail: null,
      });
  const unchanged = entries.filter((x) => x.change === 'UNCHANGED');
  return {
    isBaseline: !previous,
    changed: entries.filter((x) => x.change !== 'UNCHANGED'),
    unchanged,
    unchangedCount: unchanged.length,
    totalCurrentCount: now.length,
  };
}
