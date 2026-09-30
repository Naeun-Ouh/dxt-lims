import type { ReferenceCatalog } from '../reference';
import type { MaterialCatalog } from './catalog';
import { createMaterialFingerprintService } from './fingerprint';
export type RevisionChange = {
  path: string;
  label: string;
  previous: string | number | boolean | null;
  current: string | number | boolean | null;
  unit?: string | null;
};
export type SampleRevisionDelta = {
  compositionChanges: RevisionChange[];
  propertyChanges: RevisionChange[];
  structuralChanges: RevisionChange[];
  unchangedCount: number;
  isIdentical: boolean;
};
export interface SampleRevisionComparisonService {
  compareSampleRevisions(
    previousRevisionId: string,
    currentRevisionId: string,
  ): SampleRevisionDelta;
}
export function createSampleRevisionComparisonService(
  c: MaterialCatalog,
  d: ReferenceCatalog,
): SampleRevisionComparisonService {
  const flatten = (revisionId: string) => {
    const root = c.nodes.find(
      (n) => n.nodeType === 'SAMPLE_REVISION' && n.referenceId === revisionId,
    );
    if (!root) throw new Error(`No material structure for ${revisionId}`);
    const nodes = new Map<string, { label: string; value: string }>(),
      ratios = new Map<
        string,
        { label: string; value: number | null; unit: string | null }
      >(),
      props = new Map<
        string,
        { label: string; value: string | number | boolean; unit: string | null }
      >();
    const walk = (id: string, path: string) => {
      const n = c.nodes.find((x) => x.id === id)!;
      const p = `${path}/${n.nodeType}:${n.nodeType === 'SAMPLE_REVISION' ? 'Sample' : n.label}`;
      nodes.set(p, { label: n.label, value: n.nodeType });
      c.propertyValues
        .filter((x) => x.materialNodeId === id)
        .forEach((x) => {
          const def = d.properties.find(
            (q) => q.id === x.propertyDefinitionId,
          )!;
          props.set(`${p}/${def.code}`, {
            label: `${n.label} / ${def.name}`,
            value: x.value,
            unit: x.unit,
          });
        });
      c.compositionEdges
        .filter((x) => x.parentNodeId === id)
        .sort((a, b) => a.order - b.order)
        .forEach((x) => {
          const child = c.nodes.find((n) => n.id === x.childNodeId)!;
          ratios.set(`${p}/${child.nodeType}:${child.label}`, {
            label: `${child.label} ratio`,
            value: x.ratioValue,
            unit: x.ratioUnit,
          });
          walk(child.id, p);
        });
    };
    walk(root.id, 'ROOT');
    return { nodes, ratios, props };
  };
  const compare = <T extends { label: string }>(
    a: Map<string, T>,
    b: Map<string, T>,
    value: (x: T) => string | number | boolean | null,
    unit?: (x: T) => string | null,
  ) => {
    const out: RevisionChange[] = [];
    let unchanged = 0;
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      const x = a.get(key),
        y = b.get(key);
      if (
        x &&
        y &&
        value(x) === value(y) &&
        (unit?.(x) ?? null) === (unit?.(y) ?? null)
      )
        unchanged++;
      else
        out.push({
          path: key,
          label: (y ?? x)!.label,
          previous: x ? value(x) : null,
          current: y ? value(y) : null,
          unit: y && unit ? unit(y) : null,
        });
    }
    return { out, unchanged };
  };
  return {
    compareSampleRevisions(aId, bId) {
      const a = flatten(aId),
        b = flatten(bId),
        composition = compare(
          a.ratios,
          b.ratios,
          (x) => x.value,
          (x) => x.unit,
        ),
        property = compare(
          a.props,
          b.props,
          (x) => x.value,
          (x) => x.unit,
        ),
        structure = compare(a.nodes, b.nodes, (x) => x.value),
        fingerprints = createMaterialFingerprintService(c, d);
      return {
        compositionChanges: composition.out,
        propertyChanges: property.out,
        structuralChanges: structure.out,
        unchangedCount:
          composition.unchanged + property.unchanged + structure.unchanged,
        isIdentical:
          fingerprints.fingerprint(aId) === fingerprints.fingerprint(bId),
      };
    },
  };
}
