import type { ReferenceCatalog } from '../reference';
import type { MaterialCatalog } from './catalog';
const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => `${JSON.stringify(k)}:${stable(x)}`)
          .join(',')}}`
      : JSON.stringify(v);
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};
export interface MaterialFingerprintService {
  fingerprint(sampleRevisionId: string): string;
}
export function createMaterialFingerprintService(
  c: MaterialCatalog,
  d: ReferenceCatalog,
): MaterialFingerprintService {
  const build = (id: string): unknown => {
    const n = c.nodes.find((x) => x.id === id);
    if (!n) throw new Error(`Unresolved material node: ${id}`);
    const properties = c.propertyValues
      .filter((p) => p.materialNodeId === id)
      .map((p) => {
        const def = d.properties.find((x) => x.id === p.propertyDefinitionId);
        return {
          property: def
            ? `${def.scope.kind}:${'ownerId' in def.scope ? def.scope.ownerId : ''}:${def.code}:v${def.version}`
            : p.propertyDefinitionId,
          value: p.value,
          unit: p.unit,
          valueType: p.valueType,
        };
      })
      .sort((a, b) => a.property.localeCompare(b.property));
    const children = c.compositionEdges
      .filter((e) => e.parentNodeId === id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .map((e) => ({
        ratioValue: e.ratioValue,
        ratioUnit: e.ratioUnit,
        material: build(e.childNodeId),
      }));
    return {
      nodeType: n.nodeType,
      meaning:
        n.nodeType === 'SAMPLE_REVISION'
          ? 'sample'
          : n.label.trim().toLowerCase(),
      properties,
      children,
    };
  };
  return {
    fingerprint(revisionId) {
      const root = c.nodes.find(
        (n) => n.nodeType === 'SAMPLE_REVISION' && n.referenceId === revisionId,
      );
      if (!root) throw new Error(`No material structure for ${revisionId}`);
      return `meaning-v1-${hash(stable(build(root.id)))}`;
    },
  };
}
