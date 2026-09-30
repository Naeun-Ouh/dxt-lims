import {
  materialCatalogSchema,
  type MaterialRepository,
  type MaterialUsage,
} from '@/src/domain/material';
const at = (d: string) => `${d}T09:00:00+09:00`;
const createdAt = at('2026-07-01');
const revisions = [
  ['D031', 1, '2026-07-02', 'SUPPLIER_REQUEST'],
  ['D031', 2, '2026-07-28', 'INTERNAL_REQUEST'],
  ['D031', 3, '2026-08-20', 'DIRECT_REGISTRATION'],
  ['D035', 1, '2026-07-10', 'SUPPLIER_REQUEST'],
  ['D035', 2, '2026-08-21', 'DIRECT_REGISTRATION'],
] as const;
const root = (code: string, rev: number) => ({
  id: `node-${code}-r${rev}`,
  nodeType: 'SAMPLE_REVISION' as const,
  referenceId: `sample-${code}-r${rev}`,
  label: `Sample ${code} Rev${String(rev).padStart(2, '0')}`,
});
const raws = [
  {
    id: 'node-raw-a1',
    nodeType: 'RAW_MATERIAL' as const,
    referenceId: 'material-raw-a1',
    label: 'Raw Material A1',
  },
  {
    id: 'node-raw-a2',
    nodeType: 'RAW_MATERIAL' as const,
    referenceId: 'material-raw-a2',
    label: 'Raw Material A2',
  },
  {
    id: 'node-raw-b',
    nodeType: 'RAW_MATERIAL' as const,
    referenceId: 'material-raw-b',
    label: 'Raw Material B',
  },
];
const prop = (
  id: string,
  node: string,
  definition: string,
  value: number,
  unit: string | null,
  source: 'SUPPLIER' | 'DIRECT_ENTRY' = 'DIRECT_ENTRY',
) => ({
  id,
  materialNodeId: node,
  propertyDefinitionId: `property-${definition}-v1`,
  value,
  unit,
  valueType: 'NUMBER' as const,
  source,
  effectiveAt: null,
  evidenceId: null,
});
export const materialCatalog = materialCatalogSchema.parse({
  suppliers: [
    { id: 'supplier-a', name: 'Supplier A' },
    { id: 'supplier-b', name: 'Supplier B' },
    { id: 'supplier-rd', name: 'Internal R&D materials laboratory' },
  ],
  materials: [
    {
      id: 'material-d03',
      materialCode: 'MAT-D03',
      name: 'D03 development formulation family',
      categoryId: 'category-development',
      supplierId: null,
      description: 'Photo material development family.',
      status: 'Active',
      createdAt,
    },
    ...[
      ['material-raw-a1', 'RAW-A1', 'Raw Material A1', 'supplier-a'],
      ['material-raw-a2', 'RAW-A2', 'Raw Material A2', 'supplier-a'],
      ['material-raw-b', 'RAW-B', 'Raw Material B', 'supplier-b'],
    ].map(([id, materialCode, name, supplierId]) => ({
      id,
      materialCode,
      name,
      categoryId: null,
      supplierId,
      description: null,
      status: 'Active' as const,
      createdAt,
    })),
  ],
  materialRevisions: [
    'material-d03',
    'material-raw-a1',
    'material-raw-a2',
    'material-raw-b',
  ].map((id) => ({
    id: `${id}-r1`,
    materialId: id,
    revision: 1,
    effectiveAt: createdAt,
    status: 'Active',
    createdAt,
  })),
  samples: [
    {
      id: 'sample-D031',
      sampleCode: 'D031',
      name: 'Photo Sample A',
      materialId: 'material-d03',
      supplierId: 'supplier-a',
      description: 'Baseline photo material sample.',
      status: 'Active',
      createdAt,
    },
    {
      id: 'sample-D035',
      sampleCode: 'D035',
      name: 'Photo Sample B',
      materialId: 'material-d03',
      supplierId: 'supplier-b',
      description: 'Nested blend candidate for DTS improvement.',
      status: 'Active',
      createdAt,
    },
  ],
  sampleRevisions: revisions.map(
    ([code, revision, date, registrationSource]) => ({
      id: `sample-${code}-r${revision}`,
      sampleId: `sample-${code}`,
      revision,
      requestNumber:
        registrationSource === 'SUPPLIER_REQUEST'
          ? `REQ-2026-${code === 'D035' ? '00129' : `00${revision}`}`
          : null,
      developmentItemNumber: `DEV-${code}`,
      registrationSource,
      effectiveAt: at(date),
      status: 'Active',
      createdAt: at(date),
    }),
  ),
  nodes: [
    ...revisions.map(([code, rev]) => root(code, rev)),
    ...raws,
    {
      id: 'node-D035-blend-r1',
      nodeType: 'INTERMEDIATE',
      referenceId: 'blend-a-r1',
      label: 'Intermediate Blend A',
    },
    {
      id: 'node-D035-blend-r2',
      nodeType: 'INTERMEDIATE',
      referenceId: 'blend-a-r2',
      label: 'Intermediate Blend A',
    },
  ],
  compositionEdges: [
    ...[1, 2, 3].map((rev) => ({
      id: `edge-D031-r${rev}-b`,
      parentNodeId: `node-D031-r${rev}`,
      childNodeId: 'node-raw-b',
      ratioValue: 100,
      ratioUnit: '%',
      order: 0,
    })),
    ...[1, 2].flatMap((rev) => [
      {
        id: `edge-D035-r${rev}-blend`,
        parentNodeId: `node-D035-r${rev}`,
        childNodeId: `node-D035-blend-r${rev}`,
        ratioValue: 40,
        ratioUnit: '%',
        order: 0,
      },
      {
        id: `edge-D035-r${rev}-b`,
        parentNodeId: `node-D035-r${rev}`,
        childNodeId: 'node-raw-b',
        ratioValue: 60,
        ratioUnit: '%',
        order: 1,
      },
      {
        id: `edge-D035-r${rev}-a1`,
        parentNodeId: `node-D035-blend-r${rev}`,
        childNodeId: 'node-raw-a1',
        ratioValue: rev === 1 ? 60 : 61,
        ratioUnit: '%',
        order: 0,
      },
      {
        id: `edge-D035-r${rev}-a2`,
        parentNodeId: `node-D035-blend-r${rev}`,
        childNodeId: 'node-raw-a2',
        ratioValue: rev === 1 ? 40 : 39,
        ratioUnit: '%',
        order: 1,
      },
    ]),
  ],
  propertyValues: [
    prop('p-a1-mw', 'node-raw-a1', 'molecular-weight', 350, null, 'SUPPLIER'),
    prop('p-a1-purity', 'node-raw-a1', 'purity', 99.9, '%', 'SUPPLIER'),
    prop('p-a2-density', 'node-raw-a2', 'density', 1.08, null, 'SUPPLIER'),
    prop('p-b-purity', 'node-raw-b', 'purity', 99.5, '%', 'SUPPLIER'),
    prop('p-blend-r1-vis', 'node-D035-blend-r1', 'viscosity', 8.2, 'cP'),
    prop('p-blend-r2-vis', 'node-D035-blend-r2', 'viscosity', 8.2, 'cP'),
    prop('p-D035-r1-vis', 'node-D035-r1', 'viscosity', 12.4, 'cP'),
    prop('p-D035-r1-size', 'node-D035-r1', 'particle-size', 45, 'nm'),
    prop('p-D035-r2-vis', 'node-D035-r2', 'viscosity', 12.8, 'cP'),
    prop('p-D035-r2-size', 'node-D035-r2', 'particle-size', 42, 'nm'),
    ...[1, 2, 3].flatMap((rev) => [
      prop(
        `p-D031-r${rev}-vis`,
        `node-D031-r${rev}`,
        'viscosity',
        11.6 + rev * 0.1,
        'cP',
      ),
      prop(
        `p-D031-r${rev}-size`,
        `node-D031-r${rev}`,
        'particle-size',
        48 - rev,
        'nm',
      ),
    ]),
  ],
  evidence: [],
});
export function createMockMaterialRepository(
  usages: MaterialUsage[],
): MaterialRepository {
  return {
    async getMaterial(id) {
      return materialCatalog.materials.find((m) => m.id === id) ?? null;
    },
    async findSamples(query) {
      const q = query.toLowerCase();
      return materialCatalog.samples.filter((s) => {
        const supplier =
          materialCatalog.suppliers.find((x) => x.id === s.supplierId)?.name ??
          '';
        return `${s.sampleCode} ${s.name} ${supplier} ${s.status}`
          .toLowerCase()
          .includes(q);
      });
    },
    async listSampleRevisions(sampleId) {
      return materialCatalog.sampleRevisions
        .filter((r) => r.sampleId === sampleId)
        .sort((a, b) => a.revision - b.revision);
    },
    async listUsage(sampleId) {
      const ids = new Set(
        materialCatalog.sampleRevisions
          .filter((r) => r.sampleId === sampleId)
          .map((r) => r.id),
      );
      return usages.filter((u) => ids.has(u.sampleRevisionId));
    },
  };
}
