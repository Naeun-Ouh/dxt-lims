import { ArrowRight } from 'lucide-react';
import type { ExperimentContext } from '@/src/domain/experiment';
import { createExperimentDelta } from '@/src/domain/experiment/delta';
import { resolveById } from '@/src/domain/reference';
export function ExperimentConditions({
  context,
  previous,
}: {
  context: ExperimentContext;
  previous?: ExperimentContext;
}) {
  const delta = createExperimentDelta(context, previous);
  return (
    <>
      <div className="change-list">
        {(delta.isBaseline ? delta.changed.slice(0, 2) : delta.changed).map(
          (x) => (
            <div className="changed-condition" key={x.key}>
              <span>
                {x.label}
                <small className="condition-provenance">{x.change === 'ADDED' ? 'Added' : x.change === 'REMOVED' ? 'Removed' : 'Modified'}</small>
              </span>
              <strong className="mono">
                {x.previous !== null && (
                  <>
                    <span className="previous">
                      {x.previous}
                      {x.previousUnit !== x.unit
                        ? ` ${x.previousUnit ?? ''}`
                        : ''}
                    </span>
                    <ArrowRight size={20} />
                  </>
                )}
                {x.current ?? 'Removed'}
                {x.unit && <small>{x.unit}</small>}
              </strong>
              {(x.previousDetail || x.currentDetail) && (
                <p className="muted">
                  {x.previousDetail && x.previousDetail !== x.currentDetail
                    ? `${x.previousDetail} → `
                    : ''}
                  {x.currentDetail ?? x.previousDetail}
                </p>
              )}
            </div>
          ),
        )}
        {!delta.isBaseline &&
          delta.unchanged
            .filter((x) => x.type === 'MATERIAL')
            .map((x) => (
              <div className="unchanged-material" key={x.key}>
                <span>{x.label}</span>
                <strong className="mono">{x.current}</strong>
                <span className="muted">{x.currentDetail} · Unchanged</span>
              </div>
            ))}
      </div>
      <details className="conditions-details">
        <summary>
          {delta.isBaseline
            ? `View all ${delta.totalCurrentCount} experiment conditions`
            : `${delta.unchangedCount} conditions unchanged`}
        </summary>
        <dl className="condition-values">
          {(delta.isBaseline ? delta.changed : delta.unchanged).map((x) => (
            <div key={x.key}>
              <dt>{x.label}</dt>
              <dd className="mono">
                {x.current} {x.unit}
                {x.currentDetail && <small> · {x.currentDetail}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      {context.materials.length > 0 && (
        <details className="conditions-details">
          <summary>Sample details</summary>
          {context.materials.map((m) => (
            <div className="sample-context" key={m.condition.id}>
              <strong>
                {m.sample.sampleCode} · Revision {m.sampleRevision.revision}
              </strong>
              <p className="muted">
                {m.material.name} · {m.usage.role}
              </p>
              <p className="muted">
                Request {m.sampleRevision.requestNumber ?? 'Not assigned'} ·
                Effective {m.sampleRevision.effectiveAt.slice(0, 10)}
              </p>
              <dl className="condition-values">
                {m.propertyValues
                  .filter((p) => p.materialNodeId === m.rootNode.id)
                  .map((p) => {
                    const d = resolveById(
                      context.definitions.properties,
                      p.propertyDefinitionId,
                    );
                    return (
                      <div key={p.id}>
                        <dt>{d.name}</dt>
                        <dd>
                          {String(p.value)} {p.unit ?? ''}
                        </dd>
                      </div>
                    );
                  })}
                {m.compositionEdges
                  .filter((p) => p.parentNodeId === m.rootNode.id)
                  .map((p) => {
                    const child = resolveById(m.nodes, p.childNodeId);
                    return (
                      <div key={p.id}>
                        <dt>{child.label}</dt>
                        <dd>
                          {p.ratioValue} {p.ratioUnit ?? ''}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
