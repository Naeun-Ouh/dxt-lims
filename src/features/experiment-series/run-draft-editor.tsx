'use client';
import { useState } from 'react';
import { DxtGridFrame, DxtStatus, DxtCellText } from '@/src/shared/ui/dxt-grid';
import { RunDraftMeasurementGrid } from './run-draft-measurement-grid';
import { RunDraftConditionsGrid } from './run-draft-conditions-grid';
import { OperationMasterPicker } from './operation-master-picker';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import type { ReferenceCatalog } from '@/src/domain/reference';
import { useLocale } from '@/src/shared/i18n/locale';

export function RunDraftEditor({
  draft,
  options,
  catalog,
  onChange,
}: {
  draft: RunDraft;
  options: BootstrapOperationOption[];
  catalog: ReferenceCatalog;
  onChange: (draft: RunDraft) => void;
}) {
  const { t } = useLocale();
  const [subjectText, setSubjectText] = useState(() =>
    draft.subjects
      .map((s) =>
        s.id === s.displayLabel ? s.id : `${s.id} | ${s.displayLabel}`,
      )
      .join('\n'),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const change = (
    index: number,
    patch: Partial<RunDraft['operations'][number]>,
  ) =>
    onChange({
      ...draft,
      operations: draft.operations.map((op, i) =>
        i === index ? { ...op, ...patch } : op,
      ),
    });
  return (
    <>
      <fieldset>
        <legend>1. {t('Subjects')}</legend>
        <label>
          {t('Subjects — one ID per line; optional ID | label')}
          <textarea
            rows={3}
            value={subjectText}
            onChange={(e) => {
              setSubjectText(e.target.value);
              const subjects = e.target.value
                .split('\n')
                .filter((s) => s.trim())
                .map((line) => {
                  const [id, label] = line.split('|').map((s) => s.trim());
                  return { id, displayLabel: label || id };
                });
              const ids = new Set(subjects.map((s) => s.id));
              onChange({
                ...draft,
                subjects,
                operations: draft.operations.map((op) => ({
                  ...op,
                  subjectIds: op.subjectIds.filter((id) => ids.has(id)),
                  items: op.items.filter(
                    (i) => !i.subjectId || ids.has(i.subjectId),
                  ),
                })),
              });
            }}
          />
        </label>
        <p>{t('Draft Subject count: {0}', [String(draft.subjects.length)])}</p>
      </fieldset>
      <fieldset className="draft-grid-section">
        <legend>2. {t('Process Flow')}</legend>
        <div className="draft-flow-actions">
          <p>
            {t(
              'Select Operations from reference data, then arrange the execution order below.',
            )}
          </p>
          <button
            type="button"
            className="entry-button"
            onClick={() => setPickerOpen(true)}
          >
            {t('Operation master lookup')}
          </button>
        </div>
        {pickerOpen && (
          <OperationMasterPicker
            catalog={catalog}
            options={options}
            onClose={() => setPickerOpen(false)}
            onAdd={(ids) =>
              onChange({
                ...draft,
                operations: [
                  ...draft.operations,
                  ...ids.map((optionId) => ({
                    optionId,
                    subjectIds: draft.subjects.map((s) => s.id),
                    items: [],
                    parameterIds: [],
                    point: null,
                  })),
                ],
              })
            }
          />
        )}
        <DxtGridFrame label={t('Ordered Operations')}>
          <table className="dxt-grid draft-operation-table">
            <thead>
              <tr>
                {[
                  'Order',
                  'Operation',
                  'Operation type',
                  'Area',
                  'Equipment',
                  'Module',
                  'Condition summary',
                  'Move',
                  'Remove',
                ].map((key) => (
                  <th scope="col" key={key}>
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.operations.map((op, index) => {
                const option = options.find((o) => o.id === op.optionId)!;
                const context = option.operation.context;
                const displayName = (id?: string | null, label?: string) =>
                  catalog.resources.find((r) => r.id === id)?.name ||
                  (label && label !== id
                    ? label
                    : id
                      ? t('Display name unavailable')
                      : '—');
                const participation = (ids: string[]) =>
                  change(index, {
                    subjectIds: ids,
                    items: op.items.filter(
                      (item) => !item.subjectId || ids.includes(item.subjectId),
                    ),
                  });
                const move = (offset: number) => {
                  const operations = [...draft.operations];
                  [operations[index], operations[index + offset]] = [
                    operations[index + offset],
                    operations[index],
                  ];
                  onChange({ ...draft, operations });
                };
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <th scope="row">
                      <strong>
                        <DxtCellText>{option.operation.label}</DxtCellText>
                      </strong>
                      <details className="draft-participation">
                        <summary>
                          {t('Operation participation')} ·{' '}
                          {op.subjectIds.length}/{draft.subjects.length}
                        </summary>
                        <div className="draft-grid-actions">
                          <button
                            type="button"
                            className="entry-button"
                            onClick={() =>
                              participation(
                                draft.subjects.map((subject) => subject.id),
                              )
                            }
                          >
                            {t('Select all')}
                          </button>
                          <button
                            type="button"
                            className="entry-button"
                            onClick={() => participation([])}
                          >
                            {t('Clear selection')}
                          </button>
                        </div>
                        <div className="draft-subjects">
                          {draft.subjects.map((subject, si) => (
                            <label key={`${subject.id}-${si}`}>
                              <input
                                type="checkbox"
                                checked={op.subjectIds.includes(subject.id)}
                                onChange={(event) =>
                                  participation(
                                    event.target.checked
                                      ? [...op.subjectIds, subject.id]
                                      : op.subjectIds.filter(
                                          (id) => id !== subject.id,
                                        ),
                                  )
                                }
                              />
                              {subject.displayLabel}
                              {!op.subjectIds.includes(subject.id) && (
                                <small>{t('Not Participating')}</small>
                              )}
                            </label>
                          ))}
                        </div>
                        {!draft.subjects.length && (
                          <p>{t('Add Subjects to choose participation.')}</p>
                        )}
                      </details>
                    </th>
                    <td>
                      <DxtStatus
                        tone={
                          option.operation.role === 'MEASUREMENT'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {t(
                          option.operation.role === 'MEASUREMENT'
                            ? 'Measurement'
                            : 'Process Operation',
                        )}
                      </DxtStatus>
                    </td>
                    <td>
                      <DxtCellText>
                        {catalog.areas.find(
                          (area) =>
                            area.id === context?.areaDefinitionRevisionId,
                        )?.name ||
                          displayName(
                            context?.areaDefinitionRevisionId,
                            context?.areaLabel,
                          )}
                      </DxtCellText>
                    </td>
                    <td>
                      <DxtCellText>
                        {displayName(
                          context?.equipmentReferenceId,
                          context?.equipmentLabel,
                        )}
                      </DxtCellText>
                    </td>
                    <td>
                      <DxtCellText>
                        {displayName(
                          context?.moduleReferenceId,
                          context?.moduleLabel,
                        )}
                      </DxtCellText>
                    </td>
                    <td>
                      <DxtCellText>
                        {option.operation.items
                          .map((def) => def.label)
                          .join(' · ') || '—'}
                      </DxtCellText>
                      <small>
                        {t('{0} condition rows', [op.items.length])}
                      </small>
                    </td>
                    <td>
                      <div className="draft-grid-actions">
                        <button
                          type="button"
                          className="entry-button dxt-action-text"
                          disabled={!index}
                          aria-label={`${index + 1}. ${option.operation.label} · ${t('Move up')}`}
                          title={t('Move up')}
                          onClick={() => move(-1)}
                        >
                          <span aria-hidden="true">↑</span>
                        </button>
                        <button
                          type="button"
                          className="entry-button dxt-action-text"
                          disabled={index === draft.operations.length - 1}
                          aria-label={`${index + 1}. ${option.operation.label} · ${t('Move down')}`}
                          title={t('Move down')}
                          onClick={() => move(1)}
                        >
                          <span aria-hidden="true">↓</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="entry-button dxt-action-danger"
                        aria-label={`${index + 1}. ${option.operation.label} · ${t('Remove')}`}
                        onClick={() =>
                          onChange({
                            ...draft,
                            operations: draft.operations.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      >
                        {t('Remove')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!draft.operations.length && (
                <tr>
                  <td colSpan={9}>
                    {t(
                      'Add Operations for this Run. Study defaults are optional.',
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DxtGridFrame>
      </fieldset>
      <RunDraftConditionsGrid draft={draft} options={options} change={change} />
      <RunDraftMeasurementGrid
        draft={draft}
        options={options}
        catalog={catalog}
        change={change}
      />
    </>
  );
}
