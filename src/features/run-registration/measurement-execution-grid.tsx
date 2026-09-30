'use client';
import { participatesInOperation } from './grid-plan-context';
import { LifecycleInspectorClose } from '@/src/shared/ui/lifecycle-inspector-close';
import { useLocale } from '@/src/shared/i18n/locale';

import { useMemo, useState } from 'react';
import type { SubjectMeasurementResultSet } from '@/src/domain/measurement/subject-measurement';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { ActualExecutionEvidence } from './actual-execution-model';
import {
  projectMeasurementEvidence,
  measurementRowsForOperation,
  measurementParticipationState,
  type MeasurementEvidenceProjection,
} from './measurement-grid-model';
import type { ExperimentWorkspaceModel } from './workspace-model';
import type { ManualMeasurementCommand } from './lifecycle-authoring';

export function MeasurementExecutionGrid({
  model,
  results,
  catalog,
  executionEvidence,
  onRecord,
  analysisHref,
}: {
  model: ExperimentWorkspaceModel;
  results: SubjectMeasurementResultSet;
  catalog: ReferenceCatalog;
  executionEvidence: readonly ActualExecutionEvidence[];
  onRecord?: (command: Omit<ManualMeasurementCommand, 'id'>) => unknown;
  analysisHref?: string;
  now?: () => string;
}) {
  const { t } = useLocale();
  const projections = useMemo(
    () =>
      projectMeasurementEvidence(model, results, catalog, executionEvidence),
    [model, results, catalog, executionEvidence],
  );
  const [selected, setSelected] =
    useState<MeasurementEvidenceProjection | null>(projections[0] ?? null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [siteDetailOpen, setSiteDetailOpen] = useState(false);
  const [resultFilter, setResultFilter] = useState<
    'ALL' | 'COLLECTED' | 'PENDING'
  >('ALL');
  const operations = model.operations.filter(
    (operation) =>
      model.snapshot.measurements.some(
        (plan) => plan.stepId === operation.id,
      ) ||
      projections.some(
        (projection) => projection.operation.id === operation.id,
      ),
  );
  const pendingCount = operations.reduce(
    (total, operation) =>
      total +
      measurementRowsForOperation(
        model,
        operation.id,
        catalog,
        projections,
      ).reduce(
        (count, row) =>
          count +
          model.subjects.filter((subject) => {
            const projection = projections.find(
              (p) =>
                p.operation.id === operation.id &&
                p.subject.id === subject.id &&
                `${p.measurementExecution.measurementPoint}:${p.parameter.id}` ===
                  row.key,
            );
            return (
              measurementParticipationState(
                participatesInOperation(
                  model.snapshot,
                  subject.id,
                  operation.id,
                ),
                projection,
              ) === 'PENDING'
            );
          }).length,
        0,
      ),
    0,
  );
  const hasSiteEvidence = projections.some(
    (projection) => projection.sites.length > 0,
  );

  return (
    <>
      <section className="engineering-grid-toolbar measurement-grid-toolbar">
        <span className="measurement-source-summary">
          {onRecord
            ? t('USER AUTHORED Measurement')
            : t('Measurement evidence')}{' '}
          · {results.datasets.length} {t('datasets ·')} {results.values.length}{' '}
          {t('raw observations')}
        </span>
        {(['ALL', 'COLLECTED', 'PENDING'] as const).map((filter) => (
          <button
            key={filter}
            className={resultFilter === filter ? 'active' : ''}
            aria-pressed={resultFilter === filter}
            onClick={() => setResultFilter(filter)}
          >
            {t(
              filter === 'ALL'
                ? 'All metrics'
                : filter === 'COLLECTED'
                  ? 'Collected'
                  : 'Pending',
            )}
          </button>
        ))}
        <button
          className=""
          onClick={() => {
            setInspectorOpen(false);
            setSiteDetailOpen(false);
          }}
        >
          {t('Subject Summary')}
        </button>
        <button
          disabled={!selected || !hasSiteEvidence}
          aria-expanded={siteDetailOpen}
          onClick={() => setSiteDetailOpen((open) => !open)}
        >
          {hasSiteEvidence ? t('Site Detail') : t('Subject Result')}
        </button>
        <button
          className={inspectorOpen ? 'active' : ''}
          disabled={!selected}
          onClick={() => setInspectorOpen((open) => !open)}
        >
          {t('Details')}
        </button>
        <span>
          {projections.length} {t('measured subject results ·')}{' '}
          {projections.reduce(
            (count, projection) =>
              count +
              projection.sites.filter((site) => site.validity === 'EXCLUDED')
                .length,
            0,
          )}{' '}
          {t('excluded')} · {pendingCount} {t('Pending')}
        </span>
        {analysisHref && results.datasets.length > 0 && (
          <a className="primary" href={analysisHref}>
            {t('Analyze Measurement →')}
          </a>
        )}
        <div className="lifecycle-primary-actions">
          <span title={t('Tool import is not available in this version')}>
            <button disabled>{t('Import Data')}</button>
          </span>
          {onRecord && (
            <button
              className="primary plan-save"
              aria-expanded={recordOpen}
              onClick={() => setRecordOpen((open) => !open)}
            >
              {recordOpen ? t('Cancel') : t('Save Measurement')}
            </button>
          )}
        </div>
      </section>
      {onRecord && recordOpen && (
        <MeasurementAuthoringBar
          model={model}
          catalog={catalog}
          onRecord={onRecord}
        />
      )}
      <div
        className={`engineering-grid-layout ${inspectorOpen ? 'with-inspector' : ''}`}
      >
        <div className="engineering-grid-shell">
          <div className="engineering-grid-viewport measurement-grid-viewport">
            <table
              className="engineering-grid-table grid-plan-table measurement-engineering-grid"
              style={{
                width: 540 + model.subjects.length * 80,
                minWidth: 540 + model.subjects.length * 80,
              }}
              aria-label={t('Measurement evidence engineering grid')}
            >
              <colgroup>
                {[40, 140, 100, 160, 60, 40].map((width, i) => (
                  <col key={i} style={{ width }} />
                ))}
                {model.subjects.map((subject) => (
                  <col key={subject.id} style={{ width: 80 }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>{t('Seq')}</th>
                  <th>{t('Operation')}</th>
                  <th>{t('Equipment')}</th>
                  <th>{t('Parameter')}</th>
                  <th>{t('Unit')}</th>
                  <th>{t('Status')}</th>
                  {model.subjects.map((subject) => (
                    <th key={subject.id}>{subject.displayLabel}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operations.map((operation) => {
                  const operationProjections = projections.filter(
                    (projection) => projection.operation.id === operation.id,
                  );
                  const rowDefinitions = measurementRowsForOperation(
                    model,
                    operation.id,
                    catalog,
                    operationProjections,
                  );
                  return (
                    <MeasurementOperationRows
                      key={operation.id}
                      model={model}
                      operation={operation}
                      projections={operationProjections}
                      rowDefinitions={rowDefinitions}
                      resultFilter={resultFilter}
                      selected={selected}
                      onSelect={(projection) => {
                        setSelected(projection);
                        setInspectorOpen(true);
                      }}
                    />
                  );
                })}
                {!operations.length && (
                  <tr>
                    <td colSpan={6 + model.subjects.length}>
                      {t('No Measurement results yet.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {siteDetailOpen && selected && selected.sites.length > 0 && (
            <SiteDetail projection={selected} catalog={catalog} />
          )}
          <footer>
            {hasSiteEvidence
              ? t(
                  'Select a representative value to inspect immutable Site observations · × means excluded from the effective state',
                )
              : t(
                  'Select a representative value to inspect immutable subject-level measurement provenance',
                )}
          </footer>
        </div>
        {inspectorOpen && (
          <MeasurementInspector
            projection={selected}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>
    </>
  );
}

function MeasurementAuthoringBar({
  model,
  catalog,
  onRecord,
}: {
  model: ExperimentWorkspaceModel;
  catalog: ReferenceCatalog;
  onRecord: (command: Omit<ManualMeasurementCommand, 'id'>) => unknown;
}) {
  const { t } = useLocale();
  const operations = model.operations.filter(
    (item) => item.role === 'MEASUREMENT',
  );
  const [operationId, setOperationId] = useState(operations[0]?.id ?? '');
  const operation = operations.find((item) => item.id === operationId);
  const parameters = catalog.parameters.filter(
    (item) =>
      item.semanticRole === 'MEASUREMENT' &&
      item.measurementOperationDefinitionId ===
        operation?.operationDefinitionRevisionId,
  );
  const [subjectId, setSubjectId] = useState(model.subjects[0]?.id ?? '');
  const [parameterId, setParameterId] = useState(parameters[0]?.id ?? '');
  const parameter =
    parameters.find((item) => item.id === parameterId) ?? parameters[0];
  const [value, setValue] = useState('');
  const [grain, setGrain] = useState<'SUBJECT' | 'SITE'>('SUBJECT');
  const [site, setSite] = useState('S01');
  const [x, setX] = useState('0');
  const [y, setY] = useState('0');
  const [message, setMessage] = useState('');
  const coordinateSet = catalog.coordinateSets.find((item) =>
    item.measurementOperationDefinitionIds.includes(
      operation?.operationDefinitionRevisionId ?? '',
    ),
  );
  const changeOperation = (id: string) => {
    setOperationId(id);
    const next = model.operations.find((item) => item.id === id);
    const first = catalog.parameters.find(
      (item) =>
        item.semanticRole === 'MEASUREMENT' &&
        item.measurementOperationDefinitionId ===
          next?.operationDefinitionRevisionId,
    );
    setParameterId(first?.id ?? '');
  };
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!parameter || !operation) return;
    setSaving(true);
    setMessage('');
    try {
      const ids = coordinateSet?.coordinateDefinitionIds ?? [];
      await onRecord({
        operationId: operation.id,
        subjectId,
        parameterDefinitionId: parameter.id,
        measurementPoint:
          model.snapshot.measurements.find(
            (item) =>
              item.measurementOperationDefinitionId ===
              operation.operationDefinitionRevisionId,
          )?.point ?? parameter.supportedMeasurementPoints[0],
        value,
        grain,
        siteIdentity: grain === 'SITE' ? site : undefined,
        coordinateValues:
          grain === 'SITE'
            ? ids.slice(0, 2).map((id, index) => ({
                coordinateDefinitionId: id,
                value: Number(index === 0 ? x : y),
              }))
            : [],
        validity: 'INCLUDED',
        recordedAt: new Date().toISOString(),
      });
      setValue('');
      setMessage('Measurement saved and available to Analysis.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save Measurement.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className="lifecycle-authoring-bar"
      aria-label={t('Record manual Measurement')}
    >
      <header>
        <b>{t('RECORD MEASUREMENT')}</b>
        <small>{t('USER AUTHORED · MANUAL')}</small>
      </header>
      <label>
        {t('Operation')}
        <select
          value={operationId}
          onChange={(event) => changeOperation(event.target.value)}
        >
          {operations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Subject')}
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
        >
          {model.subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.displayLabel}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Parameter')}
        <select
          value={parameter?.id ?? ''}
          onChange={(event) => setParameterId(event.target.value)}
        >
          {parameters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Value')}
        <input
          aria-label={t('Measurement value')}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <span className="authoring-unit">
        {parameter
          ? (catalog.units.find((item) => item.id === parameter.unitId)
              ?.symbol ?? '—')
          : '—'}
      </span>
      <label>
        {t('Grain')}
        <select
          value={grain}
          onChange={(event) =>
            setGrain(event.target.value as 'SUBJECT' | 'SITE')
          }
        >
          <option value="SUBJECT">{t('SUBJECT')}</option>
          {coordinateSet && <option value="SITE">{t('SITE')}</option>}
        </select>
      </label>
      {grain === 'SITE' && (
        <>
          <label>
            {t('Site')}
            <input
              value={site}
              onChange={(event) => setSite(event.target.value)}
            />
          </label>
          <label>
            X<input value={x} onChange={(event) => setX(event.target.value)} />
          </label>
          <label>
            Y<input value={y} onChange={(event) => setY(event.target.value)} />
          </label>
        </>
      )}
      <button className="primary" disabled={saving} onClick={submit}>
        {saving ? t('Saving…') : t('Save Measurement')}
      </button>
      {message && <output>{t(message)}</output>}
    </section>
  );
}

function MeasurementOperationRows({
  model,
  operation,
  projections,
  rowDefinitions,
  selected,
  resultFilter,
  onSelect,
}: {
  model: ExperimentWorkspaceModel;
  operation: ExperimentWorkspaceModel['operations'][number];
  projections: MeasurementEvidenceProjection[];
  rowDefinitions: ReturnType<typeof measurementRowsForOperation>;
  resultFilter: 'ALL' | 'COLLECTED' | 'PENDING';
  selected: MeasurementEvidenceProjection | null;
  onSelect: (projection: MeasurementEvidenceProjection) => void;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(true);
  return (
    <>
      <tr className="grid-operation-row">
        <td>{String(operation.sequence).padStart(3, '0')}</td>
        <td>
          <button
            className="lifecycle-operation-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? '▾' : '▸'} {operation.name}
          </button>
        </td>
        <td>
          {operation.equipment}
          <small>{operation.module}</small>
        </td>
        <td>{t('◎ Measurement')}</td>
        <td aria-label={t('No operation unit')} />
        <td aria-label={t('Operation context')} />
        {model.subjects.map((subject) => (
          <td
            key={subject.id}
            aria-label={t('{0} context', [subject.displayLabel])}
          />
        ))}
      </tr>
      {expanded &&
        rowDefinitions.map((row) => {
          const rowKey = row.key;
          const states = model.subjects.map((subject) =>
            measurementParticipationState(
              participatesInOperation(model.snapshot, subject.id, operation.id),
              projections.find(
                (p) =>
                  p.subject.id === subject.id &&
                  `${p.measurementExecution.measurementPoint}:${p.parameter.id}` ===
                    rowKey,
              ),
            ),
          );
          if (resultFilter !== 'ALL' && !states.includes(resultFilter))
            return null;
          return (
            <tr
              className="grid-variable-row measurement-summary-row"
              key={rowKey}
            >
              <td aria-label={t('Inherited sequence')} />
              <td aria-label={t('Inherited operation')} />
              <td aria-label={t('Inherited equipment')} />
              <td>
                <span className="grid-tree">└</span>
                {row.point} · {row.label}
                <small>{t('SUMMARY')}</small>
              </td>
              <td>{row.unit || '—'}</td>
              <td>{t('Result')}</td>
              {model.subjects.map((subject) => {
                const projection = projections.find(
                  (candidate) =>
                    candidate.subject.id === subject.id &&
                    `${candidate.measurementExecution.measurementPoint}:${candidate.parameter.id}` ===
                      rowKey,
                );
                const participant = participatesInOperation(
                  model.snapshot,
                  subject.id,
                  operation.id,
                );
                const state = measurementParticipationState(
                  participant,
                  projection,
                );
                const collected = state === 'COLLECTED';
                if (
                  (resultFilter === 'COLLECTED' && !collected) ||
                  (resultFilter === 'PENDING' && state !== 'PENDING')
                )
                  return (
                    <td
                      key={subject.id}
                      aria-label={t('Hidden by display filter')}
                    />
                  );
                const excluded =
                  projection?.sites.filter(
                    (site) => site.validity === 'EXCLUDED',
                  ).length ?? 0;
                const isSelected =
                  !!projection &&
                  selected?.dataset.id === projection.dataset.id &&
                  selected?.parameter.id === projection?.parameter.id;
                return (
                  <td
                    key={subject.id}
                    className={`${isSelected ? 'selected measurement-selected' : ''} ${excluded ? 'measurement-has-exclusion' : ''}`}
                  >
                    {projection ? (
                      <button
                        aria-label={t('{0} {1} measurement detail', [
                          subject.displayLabel,
                          row.label,
                        ])}
                        onClick={() => onSelect(projection)}
                      >
                        <b>{projection.representativeValue ?? '—'}</b>
                        {excluded > 0 && (
                          <span title={t('{0} excluded Site(s)', [excluded])}>
                            ×{excluded}
                          </span>
                        )}
                        <small>
                          {t(
                            projection.representative?.aggregationMethod ??
                              'MEAN',
                          )}{' '}
                          · {t(projection.dataset.datasetOrigin)}
                        </small>
                      </button>
                    ) : state === 'NOT_PARTICIPATING' ? (
                      <span title={t('Not participating')}>N/A</span>
                    ) : (
                      <span title={t('Pending')}>—</span>
                    )}
                    {projection && !participant && (
                      <small>{t('Out-of-plan evidence')}</small>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
    </>
  );
}

function SiteDetail({
  projection,
  catalog,
}: {
  projection: MeasurementEvidenceProjection;
  catalog: ReferenceCatalog;
}) {
  const { t } = useLocale();
  const coordinateIds = [
    ...new Set(
      projection.sites.flatMap((site) =>
        site.coordinates.map((c) => c.definitionId),
      ),
    ),
  ];
  return (
    <section className="measurement-site-pane">
      <header>
        <div>
          <span>{t('SITE DETAIL')}</span>
          <b>
            {projection.operation.name} ·{' '}
            {projection.measurementExecution.measurementPoint} ·{' '}
            {projection.parameter.name} · {projection.subject.displayLabel}
          </b>
        </div>
        <small>
          {projection.sites.length} {t('raw Sites ·')} {t(projection.grain)}{' '}
          {t('observation grain')}
        </small>
      </header>
      <table>
        <thead>
          <tr>
            <th>{t('Site')}</th>
            {coordinateIds.map((id) => (
              <th key={id}>
                {catalog.coordinateDefinitions.find(
                  (definition) => definition.id === id,
                )?.name ?? id}
              </th>
            ))}
            <th>{t('Value')}</th>
            <th>{t('Validity')}</th>
          </tr>
        </thead>
        <tbody>
          {projection.sites.map((site) => (
            <tr
              className={site.validity === 'EXCLUDED' ? 'excluded' : ''}
              key={site.measurementValue.id}
            >
              <td>{site.siteIdentity}</td>
              {coordinateIds.map((id) => (
                <td key={id}>
                  {site.coordinates.find(
                    (coordinate) => coordinate.definitionId === id,
                  )?.value ?? '—'}
                </td>
              ))}
              <td>
                {site.value} {projection.unit}
              </td>
              <td title={site.exclusionReason ?? undefined}>
                {site.validity === 'EXCLUDED' ? t('× EXCLUDED') : t('INCLUDED')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MeasurementInspector({
  projection,
  onClose,
}: {
  projection: MeasurementEvidenceProjection | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <aside className="engineering-grid-inspector measurement-grid-inspector">
      <header>
        <LifecycleInspectorClose onClose={onClose} />
        <span>{t('INSPECTOR · MEASUREMENT EVIDENCE')}</span>
        <h2>{projection?.parameter.name ?? t('Select a result')}</h2>
        <p>
          {projection
            ? `${projection.operation.name} · ${projection.subject.displayLabel}`
            : t('Measurement provenance appears here.')}
        </p>
      </header>
      {projection && (
        <dl>
          <dt>{t('Execution')}</dt>
          <dd>{projection.measurementExecution.id}</dd>
          <dt>{t('Dataset')}</dt>
          <dd>{projection.dataset.id}</dd>
          <dt>{t('Definition')}</dt>
          <dd>{projection.measurementDefinition.id}</dd>
          <dt>{t('Parameter')}</dt>
          <dd>{projection.parameter.id}</dd>
          <dt>{t('Unit')}</dt>
          <dd>{projection.unit || t('None')}</dd>
          <dt>{t('Grain')}</dt>
          <dd>{t(projection.grain)}</dd>
          <dt>{t('Acquisition')}</dt>
          <dd>{t(projection.provenance.acquisitionMethod)}</dd>
          <dt>{t('Source')}</dt>
          <dd>{projection.provenance.sourceSystem}</dd>
          <dt>{t('Source Record')}</dt>
          <dd>{projection.provenance.sourceRecordReference ?? '—'}</dd>
          <dt>{t('Collected')}</dt>
          <dd>{projection.provenance.collectedAt}</dd>
          <dt>{t('Process Evidence')}</dt>
          <dd>{projection.linkedProcessExecutionEventId ?? t('Not linked')}</dd>
          <dt>{t('Validity')}</dt>
          <dd>
            {
              projection.sites.filter((site) => site.validity === 'EXCLUDED')
                .length
            }{' '}
            {t('excluded /')} {projection.sites.length} {t('raw')}
          </dd>
        </dl>
      )}
      <footer>
        {t(
          'Raw observations remain in the source dataset. Validity decisions change the effective state without deleting evidence.',
        )}
      </footer>
    </aside>
  );
}
