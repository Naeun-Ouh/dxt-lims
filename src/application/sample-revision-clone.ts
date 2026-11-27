import type { SampleAggregate, SampleDetail } from './sample-lifecycle';

/** Copy the explicitly selected immutable revision, never infer the predecessor from numbering. */
export function cloneSampleRevision(
  source: SampleDetail,
  revisionId: string,
  createdAt: string,
): SampleAggregate {
  const composition = structuredClone(source.composition);
  composition.nodes = composition.nodes.map((node) =>
    node.nodeType === 'SAMPLE_REVISION' &&
    node.referenceId === source.revision.id
      ? { ...node, referenceId: revisionId }
      : node,
  );
  return {
    owningOrgId: source.owningOrgId,
    sample: structuredClone(source.sample),
    revision: {
      ...source.revision,
      id: revisionId,
      revision: source.latestRevision + 1,
      effectiveAt: '',
      createdAt,
    },
    composition,
    properties: structuredClone(source.properties),
  };
}
