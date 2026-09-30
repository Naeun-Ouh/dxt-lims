import { catalog, propertiesFor } from './model';
export function StructureTree({
  nodeId,
  compact = false,
}: {
  nodeId: string;
  compact?: boolean;
}) {
  const node = catalog.nodes.find((n) => n.id === nodeId)!;
  const children = catalog.compositionEdges
    .filter((e) => e.parentNodeId === nodeId)
    .sort((a, b) => a.order - b.order);
  const props = propertiesFor(nodeId);
  return (
    <div className="material-branch">
      <details open={!compact}>
        <summary>
          <span>{node.label}</span>
          {props.length > 0 && <small>{props.length} properties</small>}
        </summary>
        {props.length > 0 && (
          <dl className="node-properties">
            {props.map((p) => (
              <div key={p.id}>
                <dt>{p.name}</dt>
                <dd>
                  {String(p.value)} {p.unit}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </details>
      {children.map((edge) => (
        <div className="material-child" key={edge.id}>
          <span className="tree-ratio">
            {edge.ratioValue}
            {edge.ratioUnit}
          </span>
          <StructureTree nodeId={edge.childNodeId} compact={compact} />
        </div>
      ))}
    </div>
  );
}
