import { z } from 'zod';
import {
  sampleSchema,
  sampleRevisionSchema,
} from '@/src/domain/material/sample';
import {
  materialNodeSchema,
  materialCompositionEdgeSchema,
} from '@/src/domain/material/structure';
import { materialPropertyValueSchema } from '@/src/domain/material/property';

export const sampleAggregateSchema = z
  .object({
    owningOrgId: z.string().min(1).max(200),
    sample: sampleSchema.strict(),
    revision: sampleRevisionSchema.strict(),
    composition: z
      .object({
        nodes: materialNodeSchema.strict().array().max(1000),
        edges: materialCompositionEdgeSchema.strict().array().max(2000),
      })
      .strict(),
    properties: materialPropertyValueSchema.array().max(5000),
  })
  .strict()
  .superRefine((d, c) => {
    const fail = (message: string, path: (string | number)[]) =>
      c.addIssue({ code: 'custom', message, path });
    if (d.sample.materialId !== null || d.sample.supplierId !== null)
      fail('Verified material or supplier reference is unavailable.', [
        'sample',
      ]);
    if (d.revision.sampleId !== d.sample.id)
      fail('Revision must belong to this Sample.', ['revision', 'sampleId']);
    const nodes = new Map(d.composition.nodes.map((n) => [n.id, n]));
    if (nodes.size !== d.composition.nodes.length)
      fail('Node identities must be unique.', ['composition', 'nodes']);
    if (
      new Set(d.composition.edges.map((e) => e.id)).size !==
      d.composition.edges.length
    )
      fail('Composition edge identities must be unique.', [
        'composition',
        'edges',
      ]);
    if (new Set(d.properties.map((p) => p.id)).size !== d.properties.length)
      fail('Property identities must be unique.', ['properties']);
    const roots = d.composition.nodes.filter(
      (n) =>
        n.nodeType === 'SAMPLE_REVISION' && n.referenceId === d.revision.id,
    );
    if (roots.length !== 1)
      fail('Include exactly one root node for this Sample revision.', [
        'composition',
        'nodes',
      ]);
    const adjacency = new Map<string, string[]>();
    d.composition.edges.forEach((e, i) => {
      if (
        !nodes.has(e.parentNodeId) ||
        !nodes.has(e.childNodeId) ||
        e.parentNodeId === e.childNodeId
      )
        fail('Composition edge must connect two existing distinct nodes.', [
          'composition',
          'edges',
          i,
        ]);
      if (
        e.ratioValue !== null &&
        (!Number.isFinite(e.ratioValue) || e.ratioValue < 0)
      )
        fail('Composition ratio must be non-negative.', [
          'composition',
          'edges',
          i,
          'ratioValue',
        ]);
      adjacency.set(e.parentNodeId, [
        ...(adjacency.get(e.parentNodeId) ?? []),
        e.childNodeId,
      ]);
    });
    const visited = new Set<string>(),
      active = new Set<string>();
    const walk = (id: string) => {
      if (active.has(id)) {
        fail('Composition must not contain cycles.', ['composition', 'edges']);
        return;
      }
      if (visited.has(id)) return;
      active.add(id);
      for (const child of adjacency.get(id) ?? []) walk(child);
      active.delete(id);
      visited.add(id);
    };
    for (const id of nodes.keys()) walk(id);
    const reachable = new Set<string>();
    const mark = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const child of adjacency.get(id) ?? []) mark(child);
    };
    if (roots[0]) mark(roots[0].id);
    if (reachable.size !== nodes.size)
      fail('All composition nodes must connect to the revision root.', [
        'composition',
        'nodes',
      ]);
    d.properties.forEach((p, i) => {
      if (!nodes.has(p.materialNodeId))
        fail('Property must refer to a node in this revision.', [
          'properties',
          i,
          'materialNodeId',
        ]);
    });
  });
export type SampleAggregate = z.infer<typeof sampleAggregateSchema>;
export const sampleCommandSchema = z
  .discriminatedUnion('operation', [
    z.object({ operation: z.literal('options') }),
    z.object({
      operation: z.literal('list'),
      search: z.string().max(200).default(''),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(25),
    }),
    z.object({
      operation: z.literal('detail'),
      id: z.string().min(1),
      revision: z.number().int().positive().optional(),
    }),
    z.object({
      operation: z.literal('write'),
      commandId: z.string().min(1).max(200),
      expectedLatest: z.number().int().min(0),
      copiedFromRevisionId: z.string().min(1).max(200).optional(),
      changeReason: z.string().trim().max(2000).optional(),
      aggregate: sampleAggregateSchema,
    }),
    z.object({
      operation: z.literal('selection'),
      revisionId: z.string().min(1),
    }),
    z.object({
      operation: z.literal('revisions'),
      search: z.string().max(200).default(''),
    }),
  ])
  .superRefine((command, context) => {
    if (
      command.operation === 'write' &&
      command.changeReason &&
      !command.copiedFromRevisionId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['copiedFromRevisionId'],
        message: 'Choose the clone source before recording a change reason.',
      });
    }
  });
export type SampleCloneOrigin = {
  copiedFromRevisionId: string;
  copiedFromRevision: number;
  changeReason: string | null;
};
export type SampleCommand = z.infer<typeof sampleCommandSchema>;
export type SampleSummary = {
  id: string;
  owningOrgId: string;
  sampleCode: string;
  name: string;
  latestRevision: number;
  canRevise: boolean;
};
export type SampleDetail = {
  sample: SampleAggregate['sample'];
  owningOrgId: string;
  revision: SampleAggregate['revision'];
  composition: SampleAggregate['composition'];
  properties: SampleAggregate['properties'];
  latestRevision: number;
  canRevise: boolean;
  cloneOrigin: SampleCloneOrigin | null;
  history: {
    id: string;
    revision: number;
    copiedFromRevisionId: string | null;
    copiedFromRevision: number | null;
    changeReason: string | null;
  }[];
  usage: {
    study: string;
    slug: string;
    run: number;
    revision: number;
    assignment: string;
    state: string;
  }[];
};
export type SampleRevisionChoice = {
  id: string;
  sampleId: string;
  sampleCode: string;
  name: string;
  revision: number;
};
