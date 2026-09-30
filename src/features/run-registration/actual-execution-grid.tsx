'use client';
import { LifecycleInspectorClose } from '@/src/shared/ui/lifecycle-inspector-close';
import { participatesInOperation } from './grid-plan-context';
/* oxlint-disable next/no-img-element -- Exact Figma SVG assets. */
import { useLocale } from '@/src/shared/i18n/locale';

import { useMemo, useRef, useState } from 'react';
import type { SubjectRef } from '@/src/domain/experiment/subject';
import type { ActualExecutionEvidence } from './actual-execution-model';
import {
  projectActualExecution,
  projectOperationExecution,
  type ExecutionComparison,
  type ExecutionDelta,
  type OperationExecutionProjection,
} from './actual-execution-model';
import type { ExperimentWorkspaceModel } from './workspace-model';
import type { ActualExecutionCommand } from './lifecycle-authoring';

type ActualFilter = 'ALL' | 'DEVIATION' | 'MISSING';
type ActualRow = {
  id: string;
  label: string;
  unit: string;
  intentRole: 'FIXED' | 'VARIED' | null;
  cells: Record<
    string,
    {
      projection: OperationExecutionProjection;
      comparison: ExecutionComparison | null;
      value: string;
      delta: ExecutionDelta;
    }
  >;
};

const deltaSymbol: Record<ExecutionDelta, string> = {
  NOT_PARTICIPATING: 'N/A',
  MATCH: '',
  CHANGED: '●',
  MISSING_ACTUAL: '—',
  UNPLANNED_ACTUAL: '+',
  NOT_COMPARABLE: '—',
};

function cellDisplay(comparison: ExecutionComparison) {
  if (comparison.delta === 'CHANGED')
    return `${comparison.planned} → ${comparison.actual}`;
  if (comparison.delta === 'UNPLANNED_ACTUAL') return comparison.actual ?? '—';
  return comparison.actual ?? '—';
}

function operationRows(projections: OperationExecutionProjection[]) {
  const first = projections[0];
  if (!first) return [];
  const status: ActualRow = {
    id: `${first.operation.id}:status`,
    label: 'Execution Status',
    unit: '',
    intentRole: null,
    cells: Object.fromEntries(
      projections.map((projection) => [
        projection.subject.id,
        {
          projection,
          comparison: null,
          value: projection.unexpected
            ? 'Out-of-plan evidence'
            : projection.status === 'NOT_EXECUTED'
              ? 'No execution record'
              : projection.status.replaceAll('_', ' '),
          delta:
            projection.status === 'NOT_PARTICIPATING'
              ? 'NOT_PARTICIPATING'
              : projection.unexpected
                ? 'UNPLANNED_ACTUAL'
                : projection.status === 'EXECUTED'
                  ? 'MATCH'
                  : projection.status === 'NOT_EXECUTED'
                    ? 'MISSING_ACTUAL'
                    : 'CHANGED',
        },
      ]),
    ),
  };
  const timestamp: ActualRow = {
    id: `${first.operation.id}:time`,
    label: 'Execution Time',
    unit: '',
    intentRole: null,
    cells: Object.fromEntries(
      projections.map((projection) => [
        projection.subject.id,
        {
          projection,
          comparison: null,
          value: projection.event
            ? new Date(projection.event.startedAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '—',
          delta: projection.unexpected
            ? 'UNPLANNED_ACTUAL'
            : projection.event
              ? 'MATCH'
              : projection.plannedParticipant
                ? 'MISSING_ACTUAL'
                : 'NOT_PARTICIPATING',
        },
      ]),
    ),
  };
  const comparisons = first.comparisons.map((template) => ({
    id: `${first.operation.id}:${template.key}`,
    label: template.label,
    unit: template.unit,
    intentRole: template.intentRole,
    cells: Object.fromEntries(
      projections.map((projection) => {
        const comparison = projection.comparisons.find(
          (candidate) => candidate.key === template.key,
        )!;
        return [
          projection.subject.id,
          {
            projection,
            comparison,
            value: cellDisplay(comparison),
            delta: comparison.delta,
          },
        ];
      }),
    ),
  }));
  return [status, timestamp, ...comparisons];
}

export function ActualExecutionGrid({
  model,
  evidence,
  onRecord,
  onContinue,
  onComparePlan,
}: {
  model: ExperimentWorkspaceModel;
  evidence: readonly ActualExecutionEvidence[];
  onRecord?: (command: Omit<ActualExecutionCommand, 'id'>) => unknown;
  onContinue?: () => void;
  onComparePlan?: () => void;
  now?: () => string;
}) {
  const { t } = useLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ActualFilter>('ALL');
  const [subjectId, setSubjectId] = useState(model.subjects[0]?.id ?? '');
  const [selection, setSelection] = useState<{
    subject: SubjectRef;
    row: ActualRow;
  } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const projections = useMemo(
    () => projectActualExecution(model, model.operations, evidence),
    [model, evidence],
  );
  const groups = useMemo(
    () =>
      model.operations.map((operation) => {
        const operationProjections = projections.filter(
          (projection) => projection.operation.id === operation.id,
        );
        const allRows = operationRows(operationProjections);
        const rows = allRows.filter((row) => {
          const deltas = Object.values(row.cells).map((cell) => cell.delta);
          return filter === 'ALL'
            ? true
            : filter === 'MISSING'
              ? deltas.includes('MISSING_ACTUAL')
              : deltas.some((delta) =>
                  ['CHANGED', 'UNPLANNED_ACTUAL'].includes(delta),
                );
        });
        return { operation, projections: operationProjections, rows };
      }),
    [model.operations, projections, filter],
  );
  const counts = projections
    .flatMap((projection) => projection.comparisons)
    .reduce(
      (result, comparison) => {
        result[comparison.delta]++;
        return result;
      },
      {
        NOT_PARTICIPATING: 0,
        MATCH: 0,
        CHANGED: 0,
        MISSING_ACTUAL: 0,
        UNPLANNED_ACTUAL: 0,
        NOT_COMPARABLE: 0,
      } as Record<ExecutionDelta, number>,
    );

  const jump = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    requestAnimationFrame(() =>
      viewport.current
        ?.querySelector<HTMLElement>(`[data-actual-subject="${nextSubjectId}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'center' }),
    );
  };

  return (
    <>
      <section className="engineering-grid-toolbar actual-grid-toolbar">
        <span className="actual-source-summary">
          {t('Recorded execution ·')} {evidence.length} {t('records')}
        </span>
        {(['ALL', 'DEVIATION', 'MISSING'] as const).map((value) => (
          <button
            key={value}
            className={filter === value ? 'active' : ''}
            aria-pressed={filter === value}
            title={
              value === 'DEVIATION'
                ? t(
                    'Show rows with actual values that differ from the plan or were not planned.',
                  )
                : value === 'MISSING'
                  ? t('Show rows missing actual execution evidence.')
                  : t('Show all recorded and unrecorded items.')
            }
            onClick={() => setFilter(value)}
          >
            {value === 'ALL'
              ? t('All items')
              : value === 'DEVIATION'
                ? t('● Differs from plan')
                : t('— Not recorded')}
          </button>
        ))}
        <label className="subject-jump">
          {t('Jump to column')}
          <select
            aria-label={t('Jump to actual Subject')}
            value={subjectId}
            onChange={(event) => jump(event.target.value)}
          >
            {model.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.displayLabel}
              </option>
            ))}
          </select>
        </label>
        <button
          className={inspectorOpen ? 'active' : ''}
          disabled={!selection}
          onClick={() => setInspectorOpen((open) => !open)}
        >
          {t('Selected cell details')}
        </button>
        {onContinue && evidence.length > 0 && (
          <button
            className="active"
            title={t(
              'Open the Measurement tab to enter measured results. This does not save an execution record.',
            )}
            onClick={onContinue}
          >
            {t('Go to Measurement →')}
          </button>
        )}
        <div className="lifecycle-primary-actions">
          {onComparePlan && (
            <button onClick={onComparePlan}>{t('Compare to Plan')}</button>
          )}
          <span title={t('Tool import is not available in this version')}>
            <button disabled>{t('Import from Tool')}</button>
          </span>
          {onRecord && (
            <button
              className="primary plan-save"
              aria-expanded={recordOpen}
              onClick={() => setRecordOpen((open) => !open)}
            >
              {recordOpen ? t('Cancel') : t('Save Actual')}
            </button>
          )}
        </div>
      </section>
      {onRecord && recordOpen && (
        <ActualAuthoringBar model={model} onRecord={onRecord} />
      )}
      <p className="actual-view-help">
        {t(
          'Compare planned and recorded values across all subjects. Click a cell for its source and details; jumping to a column does not change the recording target above.',
        )}
      </p>
      <div
        className={`engineering-grid-layout ${inspectorOpen ? 'with-inspector' : ''}`}
      >
        <div className="engineering-grid-shell">
          <div className="engineering-grid-viewport" ref={viewport}>
            <table
              className="engineering-grid-table grid-plan-table actual-final-table"
              style={{
                width: 540 + model.subjects.length * 80,
                minWidth: 540 + model.subjects.length * 80,
              }}
              aria-label={t('ACTUAL execution engineering grid')}
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
                  {[
                    'Seq',
                    'Operation',
                    'Equipment',
                    'Actual Item',
                    'Unit',
                    'Int',
                  ].map((label) => (
                    <th key={label}>{t(label)}</th>
                  ))}
                  {model.subjects.map((subject) => (
                    <th
                      key={subject.id}
                      data-actual-subject={subject.id}
                      className={
                        subjectId === subject.id ? 'active-subject' : ''
                      }
                    >
                      {subject.displayLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups
                  .filter((group) => group.rows.length > 0)
                  .map(({ operation, rows }) => (
                    <ActualOperationRows
                      key={operation.id}
                      operation={operation}
                      model={model}
                      rows={rows}
                      subjects={model.subjects}
                      activeSubjectId={subjectId}
                      onSelect={(subject, row) => {
                        setSubjectId(subject.id);
                        setSelection({ subject, row });
                        setInspectorOpen(true);
                      }}
                    />
                  ))}
                {!groups.some((group) => group.rows.length > 0) && (
                  <tr>
                    <td colSpan={6 + model.subjects.length}>
                      {t('No items match this filter.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer>
            {' '}
            <span>
              {counts.MATCH} {t('matching ·')}{' '}
              {counts.CHANGED + counts.UNPLANNED_ACTUAL} {t('different ·')}{' '}
              {counts.MISSING_ACTUAL} {t('unrecorded values')}
            </span>
            {t(
              '● actual differs from plan · — actual evidence missing · VARIED remains experimental intent',
            )}
          </footer>
        </div>
        {inspectorOpen && (
          <ActualInspector
            selection={selection}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>
    </>
  );
}

function ActualAuthoringBar({
  model,
  onRecord,
}: {
  model: ExperimentWorkspaceModel;
  onRecord: (command: Omit<ActualExecutionCommand, 'id'>) => unknown;
}) {
  const { t } = useLocale();
  const operations = model.operations.filter((item) => item.role === 'PROCESS');
  const [operationId, setOperationId] = useState(operations[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(model.subjects[0]?.id ?? '');
  const [status, setStatus] =
    useState<ActualExecutionCommand['status']>('COMPLETED');
  const [startedAt, setStartedAt] = useState('2026-09-14T09:00');
  const [endedAt, setEndedAt] = useState('2026-09-14T09:30');
  const operation = operations.find((item) => item.id === operationId);
  const subject = model.subjects.find((item) => item.id === subjectId);
  const planned =
    operation && subject
      ? projectOperationExecution(model, operation, subject, []).comparisons
      : [];
  const overrideOptions = planned.filter(
    (item) => item.key !== 'equipment' && item.label !== 'Recipe',
  );
  const [overrideId, setOverrideId] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    setMessage('');
    try {
      await onRecord({
        operationId,
        subjectId,
        status,
        startedAt: new Date(startedAt).toISOString(),
        endedAt:
          status === 'COMPLETED' ? new Date(endedAt).toISOString() : null,
        actualOverrides:
          overrideId && overrideValue.trim()
            ? { [overrideId]: overrideValue.trim() }
            : {},
      });
      setMessage('Actual execution saved. Plan remains unchanged.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save execution.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className="lifecycle-authoring-bar actual-authoring-form"
      aria-label={t('Record actual execution')}
    >
      <header>
        <b>{t('Record an execution')}</b>
        <small>
          {t(
            'Choose the operation and subject that were actually processed. Saving adds an execution record; the original plan stays unchanged.',
          )}
        </small>
      </header>
      <label>
        {t('Operation')}
        <select
          value={operationId}
          onChange={(event) => {
            setOperationId(event.target.value);
            setOverrideId('');
          }}
        >
          {operations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Recording subject')}
        <select
          value={subjectId}
          onChange={(event) => {
            setSubjectId(event.target.value);
            setOverrideId('');
            setOverrideValue('');
          }}
        >
          {model.subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.displayLabel}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Status')}
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ActualExecutionCommand['status'])
          }
        >
          <option value="OBSERVED">{t('IN PROGRESS')}</option>
          <option value="COMPLETED">{t('COMPLETED')}</option>
          <option value="INTERRUPTED">{t('INTERRUPTED')}</option>
        </select>
      </label>
      <label>
        {t('Started')}
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(event) => setStartedAt(event.target.value)}
        />
      </label>
      {status === 'COMPLETED' && (
        <label>
          {t('Completed')}
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(event) => setEndedAt(event.target.value)}
          />
        </label>
      )}
      <div className="actual-record-actions">
        <label>
          {t('Value different from plan (optional)')}
          <select
            value={overrideId}
            onChange={(event) => {
              const id = event.target.value;
              setOverrideId(id);
              setOverrideValue(
                overrideOptions.find((item) => item.key === id)?.planned ?? '',
              );
            }}
          >
            <option value="">{t('Use planned values')}</option>
            {overrideOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} {t('· planned')} {item.planned ?? '—'} {item.unit}
              </option>
            ))}
          </select>
        </label>
        {overrideId && (
          <label>
            {t('Actual value')}
            <input
              value={overrideValue}
              onChange={(event) => setOverrideValue(event.target.value)}
            />
          </label>
        )}
        <button className="primary" disabled={saving} onClick={submit}>
          {saving ? t('Saving…') : t('Save Actual')}
        </button>
      </div>
      <p className="actual-record-help">
        {t(
          'Planned values are used unless you select an item and enter its actual value. Confirm they match what was used before saving.',
        )}
      </p>
      {message && <output>{t(message)}</output>}
    </section>
  );
}

function ActualOperationRows({
  operation,
  model,
  rows,
  subjects,
  activeSubjectId,
  onSelect,
}: {
  operation: ExperimentWorkspaceModel['operations'][number];
  model: ExperimentWorkspaceModel;
  rows: ActualRow[];
  subjects: SubjectRef[];
  activeSubjectId: string;
  onSelect: (subject: SubjectRef, row: ActualRow) => void;
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
        <td>{operation.equipment}</td>
        <td>{operation.role === 'MEASUREMENT' ? t('Measurement') : ''}</td>
        <td aria-label={t('Operation context')} />
        <td aria-label={t('Operation context')} />
        {subjects.map((subject) => (
          <td
            key={subject.id}
            aria-label={t('{0} operation context', [subject.displayLabel])}
            className={subject.id === activeSubjectId ? 'active-subject' : ''}
          >
            {rows[0]?.cells[subject.id]?.projection.event ? (
              <img
                src="/figma/run-plan/participant.svg"
                alt={t('Recorded execution')}
              />
            ) : participatesInOperation(
                model.snapshot,
                subject.id,
                operation.id,
              ) ? (
              <span title={t('No execution record')}>○</span>
            ) : (
              <span title={t('Not participating')}>N/A</span>
            )}
          </td>
        ))}
      </tr>
      {expanded &&
        rows.map((row) => (
          <tr className="grid-variable-row actual-item-row" key={row.id}>
            <td aria-label={t('Operation context')} />
            <td aria-label={t('Operation context')} />
            <td aria-label={t('Operation context')} />
            <td>
              <span className="grid-tree">└</span>
              {row.id.endsWith(':status') ||
              row.id.endsWith(':time') ||
              row.label === 'Equipment'
                ? t(row.label)
                : row.label}
              {row.intentRole === 'VARIED' && (
                <span
                  className="actual-varied"
                  title={t('Planned experimental intent')}
                >
                  ◆
                </span>
              )}
            </td>
            <td>{row.unit || '—'}</td>
            <td>
              <span
                className={`plan-intent-label ${row.intentRole === 'VARIED' ? 'varied' : ''}`}
              >
                {row.intentRole ? t(row.intentRole) : ''}
              </span>
            </td>

            {subjects.map((subject) => {
              const cell = row.cells[subject.id];
              const active = subject.id === activeSubjectId;
              if (
                !cell.projection.event &&
                !participatesInOperation(
                  model.snapshot,
                  subject.id,
                  operation.id,
                )
              )
                return (
                  <td key={subject.id} title={t('Not participating')}>
                    N/A
                  </td>
                );
              return (
                <td
                  key={subject.id}
                  className={`${active ? 'active-subject' : ''} actual-${cell.delta.toLowerCase()}`}
                  title={
                    cell.comparison
                      ? t('Plan: {0} · Actual: {1} · {2}', [
                          cell.comparison.planned ?? '—',
                          cell.comparison.actual ?? '—',
                          cell.delta,
                        ])
                      : cell.value
                  }
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(subject, row);
                    }
                  }}
                  onClick={() => onSelect(subject, row)}
                >
                  <span className="actual-cell-value">
                    {row.id.endsWith(':status') ? t(cell.value) : cell.value}
                  </span>
                  <span className="actual-delta-symbol">
                    {cell.value !== '—' && cell.value !== 'No execution record'
                      ? deltaSymbol[cell.delta]
                      : ''}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}

function ActualInspector({
  selection,
  onClose,
}: {
  selection: { subject: SubjectRef; row: ActualRow } | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const cell = selection ? selection.row.cells[selection.subject.id] : null;
  const projection = cell?.projection;
  return (
    <aside className="engineering-grid-inspector actual-grid-inspector">
      <header>
        <LifecycleInspectorClose onClose={onClose} />
        <span>{t('INSPECTOR · EXECUTION EVIDENCE')}</span>
        <h2>{selection?.row.label ?? t('Select an actual cell')}</h2>
        <p>
          {projection
            ? `${projection.operation.name} · ${projection.subject.displayLabel}`
            : t('Source and identity context appears here.')}
        </p>
      </header>
      {projection && (
        <dl>
          <dt>{t('Status')}</dt>
          <dd>{t(projection.status)}</dd>
          <dt>{t('Plan')}</dt>
          <dd>{cell?.comparison?.planned ?? '—'}</dd>
          <dt>{t('Actual')}</dt>
          <dd>{cell?.comparison?.actual ?? cell?.value ?? '—'}</dd>
          <dt>{t('Delta')}</dt>
          <dd>{cell?.delta}</dd>
          <dt>{t('Source')}</dt>
          <dd>{projection.provenance?.sourceSystem ?? t('No evidence')}</dd>
          <dt>{t('Source Record')}</dt>
          <dd>{projection.provenance?.sourceRecordReference ?? '—'}</dd>
          <dt>{t('Execution')}</dt>
          <dd>{projection.event?.id ?? '—'}</dd>
          {projection.identityContext?.attributes.map((attribute) => (
            <div key={attribute.label}>
              <dt>{t(attribute.label)}</dt>
              <dd>{attribute.value}</dd>
            </div>
          ))}
          <dt>{t('Retrieved')}</dt>
          <dd>{projection.provenance?.retrievedAt ?? '—'}</dd>
        </dl>
      )}
      <footer>
        {t(
          'MES/source history remains immutable. DXT presents the evidence in Run, Operation and Subject context.',
        )}
      </footer>
    </aside>
  );
}
