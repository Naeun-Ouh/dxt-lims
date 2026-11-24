import type { RunPlanningSnapshot } from './planning-model';

/** Analysis source identity is the persisted Study identity, not its URL slug. */
export function runAnalysisHref(
  snapshot: RunPlanningSnapshot,
  parameterId?: string,
) {
  const query = new URLSearchParams({
    study: snapshot.series.id.replace(/^series-/, ''),
    runs: String(snapshot.runNumber),
  });
  if (parameterId) query.set('parameters', parameterId);
  return `/analysis?${query.toString()}`;
}
