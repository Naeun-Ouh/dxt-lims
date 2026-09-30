import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import { referenceCatalog, unit } from './model';
import type { ConditionDefinition } from '@/src/domain/reference';
export default function ConditionDetail({
  condition: c,
}: {
  condition: ConditionDefinition;
}) {
  return (
    <Workspace page="Reference">
      <Link href="/reference" className="back-link">
        <ArrowLeft size={14} />
        Reference Studio
      </Link>
      <div className="reference-heading">
        <div>
          <span className="eyebrow">CONDITION DEFINITION</span>
          <h1>{c.name}</h1>
          <p>{c.description}</p>
        </div>
        <Badge tone="green">Active · v{c.version}</Badge>
      </div>
      <section className="reference-section">
        <h2>Representation</h2>
        <dl className="definition-detail-grid">
          {[
            ['Code', c.code],
            ['Value type', c.valueType.replaceAll('_', ' ')],
            ['Unit', unit(c.unitDefinitionId)],
            ['Category', c.category],
            ['Display order', String(c.displayOrder)],
            ['Definition identity', c.id],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd
                className={
                  k === 'Code' || k === 'Definition identity' ? 'mono' : ''
                }
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="reference-two-col">
        <section className="reference-section">
          <h2>Supported scopes</h2>
          <div className="scope-pills">
            {c.allowedScopes.map((scope) => (
              <Badge key={scope}>{scope}</Badge>
            ))}
          </div>
          <p className="muted definition-note">
            Reference Studio defines availability only. Site-level condition
            editing is outside this phase.
          </p>
        </section>
        <section className="reference-section">
          <h2>Available in areas</h2>
          {c.areaDefinitionIds.map((id) => {
            const area = referenceCatalog.areas.find((a) => a.id === id)!;
            return (
              <p className="linked-definition" key={id}>
                {area.name}
                <span>
                  {
                    referenceCatalog.experimentTypes.find(
                      (t) => t.id === area.experimentTypeDefinitionId,
                    )?.name
                  }
                </span>
              </p>
            );
          })}
        </section>
      </div>
      <section className="reference-section version-note">
        <h2>Historical meaning</h2>
        <p>
          Experiment instances pin this definition ID and version. Activating a
          later version does not reinterpret conditions already recorded with v
          {c.version}.
        </p>
      </section>
    </Workspace>
  );
}
