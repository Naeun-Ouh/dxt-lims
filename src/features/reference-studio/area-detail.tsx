import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import { referenceCatalog, slug } from './model';
import type {
  AreaDefinition,
  ExperimentTypeDefinition,
} from '@/src/domain/reference';
export default function AreaDetail({
  type,
  area,
}: {
  type: ExperimentTypeDefinition;
  area: AreaDefinition;
}) {
  const conditions = referenceCatalog.conditions
      .filter((c) => c.areaDefinitionIds.includes(area.id))
      .sort((a, b) => a.displayOrder - b.displayOrder),
    operations = referenceCatalog.operations.filter(
      (o) => o.areaDefinitionId === area.id,
    ),
    measurements = referenceCatalog.measurementOperations.filter(
      (o) => o.areaDefinitionId === area.id,
    );
  return (
    <Workspace page="Reference">
      <Link href="/reference" className="back-link">
        <ArrowLeft size={14} />
        Reference Studio
      </Link>
      <div className="reference-heading">
        <div>
          <span className="eyebrow">{type.name.toUpperCase()} / AREA</span>
          <h1>{area.name}</h1>
          <p>{area.description}</p>
        </div>
        <Badge tone="green">Active · v{area.version}</Badge>
      </div>
      <div className="representation-map">
        <span>{type.name}</span>
        <ArrowRight />
        <strong>{area.name}</strong>
        <ArrowRight />
        <span>Operation / Condition / Measurement definitions</span>
      </div>
      <div className="reference-layout">
        <section className="reference-section">
          <div className="section-title">
            <div>
              <h2>Operations</h2>
              <p>A Run may plan one or multiple ordered process steps.</p>
            </div>
          </div>
          <div className="compact-definition-list">
            {operations.map((o) => (
              <div key={o.id}>
                <strong>{o.name}</strong>
                <span className="mono">{o.code}</span>
                <p>{o.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="reference-section wide">
          <div className="section-title">
            <div>
              <h2>Conditions</h2>
              <p>
                What engineers may intentionally configure; wafer, lot, and
                operation identities are excluded.
              </p>
            </div>
          </div>
          <div className="condition-definition-table">
            <div>
              <b>Name</b>
              <b>Value type</b>
              <b>Allowed scopes</b>
              <b>Version</b>
            </div>
            {conditions.map((c) => (
              <Link href={`/reference/conditions/${slug(c.code)}`} key={c.id}>
                <strong>{c.name}</strong>
                <span>{c.valueType.replaceAll('_', ' ')}</span>
                <span>{c.allowedScopes.join(' · ')}</span>
                <span>v{c.version} →</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="reference-section wide">
          <div className="section-title">
            <div>
              <h2>Measurement operations</h2>
              <p>
                Engineers select a measurement parameter; supporting coordinates
                resolve behind it.
              </p>
            </div>
          </div>
          <div className="compact-definition-list">
            {measurements.map((m) => (
              <Link
                href={`/reference/measurement-operations/${slug(m.code)}`}
                key={m.id}
              >
                <strong>{m.name}</strong>
                <span>
                  {
                    m.parameterDefinitionIds.filter(
                      (id) =>
                        referenceCatalog.parameters.find((p) => p.id === id)
                          ?.semanticRole === 'MEASUREMENT',
                    ).length
                  }{' '}
                  visible measurements
                </span>
                <p>{m.description}</p>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </section>
        {area.code === 'CMP' && (
          <section className="reference-section wide instance-example">
            <div className="section-title">
              <div>
                <h2>Representative Run instance</h2>
                <p>
                  Example values instantiate CMP definitions; they are not
                  global definitions.
                </p>
              </div>
            </div>
            <dl>
              {[
                ['Lot', 'RSA6420'],
                ['Wafer', 'TT331520'],
                ['Operation', 'M2 CU CMP'],
                ['Recipe', 'RSAcucmp_001'],
                ['Pad', 'EE001'],
                ['Disk', 'AA001'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="mono">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </Workspace>
  );
}
