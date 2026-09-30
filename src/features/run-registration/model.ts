import { definitions } from '@/src/mock/reference';
import { materialCatalog } from '@/src/mock/materials';
import { getContext } from '@/src/mock/experiments';
import type { ExperimentContext } from '@/src/domain/experiment';

export const registrationDefinitions = definitions;
export const registrationSamples = materialCatalog.samples.flatMap((sample) =>
  materialCatalog.sampleRevisions
    .filter((revision) => revision.sampleId === sample.id)
    .map((revision) => ({
      id: revision.id,
      label: `${sample.sampleCode} · Rev.${String(revision.revision).padStart(2, '0')}`,
    })),
);
export const areaConfiguration = (areaId: string) => ({
  area: definitions.areas.find((item) => item.id === areaId)!,
  operations: definitions.operations.filter(
    (item) => item.areaDefinitionId === areaId,
  ),
  conditions: definitions.conditions
    .filter((item) => item.areaDefinitionIds.includes(areaId))
    .sort((a, b) => a.displayOrder - b.displayOrder),
  measurementOperations: definitions.measurementOperations.filter(
    (item) => item.areaDefinitionId === areaId,
  ),
});
export function inheritedContext(
  runNumber: number | null,
): ExperimentContext | null {
  return runNumber ? (getContext(runNumber) ?? null) : null;
}
