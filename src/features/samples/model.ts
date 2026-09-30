import { materialCatalog } from '@/src/mock/materials';
import { definitions } from '@/src/mock/reference';
import { contexts } from '@/src/mock/experiments';
import { createSampleRevisionComparisonService } from '@/src/domain/material';
export const catalog = materialCatalog;
export function sampleView(code: string) {
  const sample = catalog.samples.find((s) => s.sampleCode === code);
  if (!sample) return null;
  const revisions = catalog.sampleRevisions
    .filter((r) => r.sampleId === sample.id)
    .sort((a, b) => b.revision - a.revision);
  const supplier = catalog.suppliers.find((s) => s.id === sample.supplierId);
  const material = catalog.materials.find((m) => m.id === sample.materialId);
  return { sample, revisions, supplier, material };
}
export function revisionView(code: string, revision: number) {
  const view = sampleView(code),
    rev = view?.revisions.find((r) => r.revision === revision);
  if (!view || !rev) return null;
  const root = catalog.nodes.find(
    (n) => n.nodeType === 'SAMPLE_REVISION' && n.referenceId === rev.id,
  )!;
  const previous = view.revisions.find((r) => r.revision === revision - 1);
  return {
    ...view,
    rev,
    root,
    previous,
    delta: previous
      ? createSampleRevisionComparisonService(
          catalog,
          definitions,
        ).compareSampleRevisions(previous.id, rev.id)
      : null,
  };
}
export const propertiesFor = (nodeId: string) =>
  catalog.propertyValues
    .filter((p) => p.materialNodeId === nodeId)
    .map((p) => ({
      ...p,
      name:
        definitions.properties.find((d) => d.id === p.propertyDefinitionId)
          ?.name ?? p.propertyDefinitionId,
    }));
export function usages(revisionId?: string) {
  return contexts.flatMap((c) =>
    c.materials
      .filter((m) => !revisionId || m.sampleRevision.id === revisionId)
      .map((m) => ({
        series: c.series.title,
        run: c.run.runNumber,
        role: m.usage.role,
        project: c.projectContext[0]?.project.title ?? '—',
        date: c.run.startedAt?.slice(0, 10) ?? '—',
        decision: c.decision?.evaluations[0]?.value.value ?? '—',
        revisionId: m.sampleRevision.id,
      })),
  );
}
