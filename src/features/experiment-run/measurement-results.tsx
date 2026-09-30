'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CircleDot, Grid3X3, Table2 } from 'lucide-react';
import type { ExperimentContext } from '@/src/domain/experiment';
import { measurementRows } from '@/src/domain/measurement/presentation';
import { measurementResults } from '@/src/mock/measurement-results';
import { Badge } from '@/src/shared/ui/workspace';

export function MeasurementResults({
  context,
  previous,
}: {
  context: ExperimentContext;
  previous?: ExperimentContext;
}) {
  const datasets = measurementResults.datasets.filter(
    (item) => item.experimentRunId === context.run.id,
  );
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [selection, setSelection] = useState<{
    wafer: string;
    parameter: string;
  } | null>(null);
  const [detailView, setDetailView] = useState<'TABLE' | 'SCATTER'>('TABLE');
  if (!datasets.length)
    return <LegacyResults context={context} previous={previous} />;
  const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];
  const operation = context.definitions.measurementOperations.find(
    (item) => item.id === dataset.measurementOperationDefinitionId,
  )!;
  const summaries = measurementResults.summaries.filter(
    (item) => item.datasetId === dataset.id,
  );
  const waferIds = [...new Set(summaries.map((item) => item.waferSubjectId))];
  const parameterIds = [
    ...new Set(summaries.map((item) => item.parameterDefinitionId)),
  ];
  const selectedSummary =
    selection &&
    summaries.find(
      (item) =>
        item.waferSubjectId === selection.wafer &&
        item.parameterDefinitionId === selection.parameter,
    );
  const siteValues = selectedSummary
    ? measurementResults.values.filter((item) =>
        selectedSummary.sourceMeasurementIds.includes(item.id),
      )
    : [];
  const coordinateSet = context.definitions.coordinateSets.find((set) =>
    set.measurementOperationDefinitionIds.includes(operation.id),
  );
  const coordinates =
    coordinateSet?.coordinateDefinitionIds.map((id) =>
      context.definitions.coordinateDefinitions.find((item) => item.id === id)!,
    ) ?? [];
  return (
    <div className="measurement-results-workbench">
      <div className="prepare-data-entry"><div><span>MEASUREMENT NEXT STEPS</span><p>Prepare observations or compare wafer-level results across Studies.</p></div><div className="measurement-next-actions"><Link className="secondary-button" href={`/series/dts-improvement/runs/${context.run.runNumber}/data-preparation`}>Prepare Data</Link><Link className="secondary-button" href="/analysis">Analyze</Link></div></div>
      <div className="measurement-dataset-tabs">
        {datasets.map((item) => {
          const definition = context.definitions.measurementOperations.find(
            (op) => op.id === item.measurementOperationDefinitionId,
          )!;
          return (
            <button
              className={item.id === dataset.id ? 'active' : ''}
              key={item.id}
              onClick={() => {
                setDatasetId(item.id);
                setSelection(null);
              }}
            >
              <span>{definition.name}</span>
              <small>
                {item.measurementPoint} · {item.equipmentReference}
              </small>
            </button>
          );
        })}
      </div>
      {!selection ? (
        <>
          <div className="measurement-result-heading">
            <div>
              <span>WAFER COMPARISON</span>
              <h3>{operation.name} results</h3>
            </div>
            <p>
              {waferIds.length} wafers · {parameterIds.length} business
              parameters <Badge tone="green">{dataset.status}</Badge>
            </p>
          </div>
          <div className="wafer-result-table-wrap">
            <table className="wafer-result-table">
              <thead>
                <tr>
                  <th>Wafer</th>
                  {parameterIds.map((id) => (
                    <th key={id}>
                      {parameterName(context, id)}
                      <small>
                        {unitName(
                          context,
                          summaries.find((s) => s.parameterDefinitionId === id)
                            ?.unitDefinitionId ?? null,
                        )}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waferIds.map((wafer) => (
                  <tr key={wafer}>
                    <td>
                      <b>{wafer}</b>
                      <small>Lot RSA6420</small>
                    </td>
                    {parameterIds.map((parameter) => (
                      <td key={parameter}>
                        <button
                          onClick={() => setSelection({ wafer, parameter })}
                        >
                          {numberValue(
                            summaries.find(
                              (item) =>
                                item.waferSubjectId === wafer &&
                                item.parameterDefinitionId === parameter,
                            )?.value,
                          )}
                          <small>
                            {
                              summaries.find(
                                (item) =>
                                  item.waferSubjectId === wafer &&
                                  item.parameterDefinitionId === parameter,
                              )?.aggregationMethod
                            }
                          </small>
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="measurement-context-foot">
            <span>
              <Check size={12} /> Site detail remains available behind every
              representative value.
            </span>
            <small>
              {coordinateSet?.name} supports spatial detail; coordinate
              parameters are collected automatically.
            </small>
          </div>
        </>
      ) : (
        selectedSummary && (
          <div className="site-result-detail">
            <div className="site-detail-head">
              <button onClick={() => setSelection(null)}>
                <ArrowLeft size={13} /> Wafer comparison
              </button>
              <div>
                <span>SITE DETAIL</span>
                <h3>
                  {selection.wafer} /{' '}
                  {parameterName(context, selection.parameter)}
                </h3>
                <p>
                  {operation.name} · {dataset.measurementPoint} ·{' '}
                  {dataset.equipmentReference}
                </p>
              </div>
              <div className="detail-view-toggle">
                <button
                  className={detailView === 'TABLE' ? 'active' : ''}
                  onClick={() => setDetailView('TABLE')}
                >
                  <Table2 size={13} /> Table
                </button>
                <button
                  className={detailView === 'SCATTER' ? 'active' : ''}
                  onClick={() => setDetailView('SCATTER')}
                >
                  <CircleDot size={13} /> Scatter
                </button>
              </div>
            </div>
            <div className="representative-value">
              <span>WAFER REPRESENTATIVE</span>
              <strong>
                {numberValue(selectedSummary.value)}{' '}
                <small>
                  {unitName(context, selectedSummary.unitDefinitionId)}
                </small>
              </strong>
              <Badge tone="blue">{selectedSummary.aggregationMethod}</Badge>
              <p>
                {selectedSummary.summaryOrigin.replace('_', ' ')} · traced to{' '}
                {selectedSummary.sourceMeasurementIds.length} site measurements
              </p>
            </div>
            {detailView === 'TABLE' ? (
              <div className="site-value-table-wrap">
                <table className="site-value-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      {coordinates.map((item) => (
                        <th key={item.id}>{item.name}</th>
                      ))}
                      <th>{parameterName(context, selection.parameter)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteValues.map((value) => (
                      <tr key={value.id}>
                        <td>
                          <b>{value.siteIdentity}</b>
                        </td>
                        {coordinates.map((coordinate) => (
                          <td key={coordinate.id}>
                            {
                              value.coordinateValues.find(
                                (item) =>
                                  item.coordinateDefinitionId === coordinate.id,
                              )?.value
                            }
                          </td>
                        ))}
                        <td>
                          <b>{numberValue(value.value)}</b>{' '}
                          {unitName(context, value.unitDefinitionId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="site-scatter">
                <div className="scatter-axis y">Y</div>
                <div className="scatter-plane">
                  {siteValues.map((value) => {
                    const x = value.coordinateValues[0]?.value ?? 0,
                      y = value.coordinateValues[1]?.value ?? 0;
                    const max = Math.max(
                      ...siteValues.flatMap((v) =>
                        v.coordinateValues.map((c) => Math.abs(c.value)),
                      ),
                      2,
                    );
                    return (
                      <span
                        key={value.id}
                        style={{
                          left: `${50 + (x / max) * 38}%`,
                          top: `${50 - (y / max) * 38}%`,
                        }}
                        title={`${value.siteIdentity}: ${numberValue(value.value)}`}
                      >
                        <b>{value.siteIdentity}</b>
                        <small>{numberValue(value.value)}</small>
                      </span>
                    );
                  })}
                  <i className="axis-x" />
                  <i className="axis-y" />
                </div>
                <div className="scatter-axis x">X</div>
                <p>
                  <Grid3X3 size={13} /> Lightweight spatial view using{' '}
                  {coordinateSet?.name}
                </p>
              </div>
            )}
            <details className="measurement-provenance">
              <summary>Measurement provenance</summary>
              <p>
                {dataset.sourceSystem} · collected{' '}
                {dataset.collectedAt.slice(0, 16).replace('T', ' ')} · source
                parameters remain mapped per value.
              </p>
              <p>
                Coordinate set: {coordinateSet?.name} (
                {coordinates.map((item) => item.code).join(' + ')})
              </p>
            </details>
          </div>
        )
      )}
    </div>
  );
}
function parameterName(context: ExperimentContext, id: string) {
  return (
    context.definitions.parameters.find((item) => item.id === id)?.name ?? id
  );
}
function unitName(context: ExperimentContext, id: string | null) {
  return id
    ? (context.definitions.units.find((item) => item.id === id)?.symbol ?? '')
    : '';
}
function numberValue(value: { dataType: string; value: unknown } | undefined) {
  return value ? String(value.value) : '—';
}
function LegacyResults({
  context,
  previous,
}: {
  context: ExperimentContext;
  previous?: ExperimentContext;
}) {
  const metrics = useMemo(
    () => measurementRows(context, previous),
    [context, previous],
  );
  return (
    <div className="metrics-row">
      {metrics.map((m) => (
        <div className="metric" key={m.id}>
          <span>{m.parameter}</span>
          <div className="metric-value mono">
            {m.value}
            <small>{m.unit}</small>
          </div>
          <span className={m.tone}>{m.trendLabel}</span>
        </div>
      ))}
    </div>
  );
}
