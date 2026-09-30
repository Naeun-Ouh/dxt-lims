import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import { referenceCatalog, unit } from './model';
import type { MeasurementOperationDefinition } from '@/src/domain/reference';
export default function MeasurementOperationDetail({
  operation: o,
}: {
  operation: MeasurementOperationDefinition;
}) {
  const parameters = o.parameterDefinitionIds.map((id) =>
      referenceCatalog.parameters.find((p) => p.id === id)!,
    ),
    measurements = parameters.filter((p) => p.semanticRole === 'MEASUREMENT'),
    support = parameters.filter((p) => p.semanticRole !== 'MEASUREMENT'),
    area = referenceCatalog.areas.find((a) => a.id === o.areaDefinitionId)!,
    coordinateSet = referenceCatalog.coordinateSets.find((set) =>
      set.measurementOperationDefinitionIds.includes(o.id),
    ),
    coordinates =
      coordinateSet?.coordinateDefinitionIds.map((id) =>
        referenceCatalog.coordinateDefinitions.find((item) => item.id === id),
      ) ?? [];
  return (
    <Workspace page="Reference">
      <Link
        href={`/reference/experiment-types/process-experiment/areas/${area.code}`}
        className="back-link"
      >
        <ArrowLeft size={14} />
        {area.name} area
      </Link>
      <div className="reference-heading">
        <div>
          <span className="eyebrow">MEASUREMENT OPERATION / {area.name}</span>
          <h1>{o.name}</h1>
          <p>{o.description}</p>
        </div>
        <Badge tone="green">Active · v{o.version}</Badge>
      </div>
      <section className="reference-section">
        <div className="section-title">
          <div>
            <h2>Engineer-visible parameters</h2>
            <p>
              Selecting a measurement automatically includes its configured
              collection requirements.
            </p>
          </div>
        </div>
        <div className="measurement-parameters">
          {measurements.map((p) => (
            <div key={p.id}>
              <header>
                <div>
                  <strong>{p.name}</strong>
                  <span className="mono">{p.code}</span>
                </div>
                <Badge tone="blue">{p.semanticRole}</Badge>
              </header>
              <p>{p.description}</p>
              <dl>
                <div>
                  <dt>Unit</dt>
                  <dd>{unit(p.unitId)}</dd>
                </div>
                <div>
                  <dt>Measurement points</dt>
                  <dd>{p.supportedMeasurementPoints.join(' · ')}</dd>
                </div>
              </dl>
              <div className="dependency-line">
                <span>User selects {p.name}</span>
                <Plus size={14} />
                <span>
                  Collection includes{' '}
                  {p.requiredSupportingParameterIds
                    .map((id) => parameters.find((x) => x.id === id)?.code)
                    .join(' + ') || 'no supporting parameters'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      {coordinateSet && (
        <section className="reference-section coordinate-set-section">
          <div className="section-title">
            <div>
              <h2>Coordinate set</h2>
              <p>
                Reusable spatial semantics collected automatically for this
                measurement context.
              </p>
            </div>
            <Badge>{coordinateSet.name}</Badge>
          </div>
          <div className="coordinate-definition-row">
            {coordinates.map(
              (coordinate) =>
                coordinate && (
                  <div key={coordinate.id}>
                    <span>{coordinate.axis} AXIS</span>
                    <b>{coordinate.name}</b>
                    <small className="mono">{coordinate.code}</small>
                    <p>{coordinate.description}</p>
                  </div>
                ),
            )}
          </div>
          <p className="coordinate-note">
            Coordinates describe where a value was observed. They do not appear
            as normal business measurement choices.
          </p>
        </section>
      )}
      <section className="reference-section">
        <div className="section-title">
          <div>
            <h2>Technical collection parameters</h2>
            <p>
              Available to collection and visualization logic without requiring
              engineer selection.
            </p>
          </div>
        </div>
        <div className="support-table">
          <div>
            <b>Parameter</b>
            <b>Semantic role</b>
            <b>Purpose</b>
          </div>
          {support.map((p) => (
            <div key={p.id}>
              <strong>{p.code}</strong>
              <Badge>{p.semanticRole}</Badge>
              <span>{p.description}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="reference-section version-note">
        <h2>Measurement-point boundary</h2>
        <p>
          PRE, INTERMEDIATE, POST, FINAL, and CUSTOM describe future observation
          context. This configuration does not calculate Pre/Post differences or
          resolve physical wafer identity.
        </p>
      </section>
    </Workspace>
  );
}
