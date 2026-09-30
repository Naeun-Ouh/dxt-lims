import assert from 'node:assert/strict';
import type { RunRepository } from '@/src/application/repository-ports';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';

/** Identical read/save semantics required by the frozen Plan projection. */
export async function runRepositoryContract(repository: RunRepository, input: RunPlanningSnapshot, commandId: string) {
  const candidate = structuredClone(input);
  const saved = await repository.saveSnapshot(candidate, { commandId });
  candidate.assignments[0].value = 'caller mutation after save';
  assert.deepEqual(await repository.getSnapshot(saved.id), saved);
  assert.equal(saved.createdAt, input.createdAt);
  assert.equal(saved.configurationPackageVersionId, input.configurationPackageVersionId);
  assert.deepEqual(await repository.getCreatedRun(saved.series.id.replace(/^series-/, '') as SeriesSlug, saved.runNumber), saved);
  const all = await repository.listSnapshots();
  assert.ok(all.some((item) => item.id === saved.id));
}
