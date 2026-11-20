'use client';
import { useState, Fragment } from 'react';
import { DxtGridFrame, DxtStatus, DxtCellText } from '@/src/shared/ui/dxt-grid';
import { RunDraftMeasurementGrid } from './run-draft-measurement-grid';
import { RunDraftSubjects } from './run-draft-subjects';
import { RunDraftConditionCell } from './run-draft-condition-cell';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attributes, setAttributes] = useState(true);
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
  const leftColumns = attributes ? 7 : 3;
  const leftWidth = attributes ? 644 : 304;
  const displayName = (id?: string | null, label?: string) =>
    catalog.resources.find((r) => r.id === id)?.name ||
    (label && label !== id ? label : id ? t('Display name unavailable') : '—');
  return (
    <>
      <RunDraftSubjects draft={draft} onChange={onChange} />
      <fieldset className="draft-grid-section">
        <legend>2. {t('Process Flow & Conditions')}</legend>
        <div className="draft-flow-actions">
          <p>
            {t(
              'Choose which Subjects each Operation applies to. Edit planned conditions directly below it; Subjects remain in the same columns.',
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
        <div className="draft-flow-actions">
          <button
            type="button"
            className="entry-button"
            aria-expanded={attributes}
            onClick={() => setAttributes(!attributes)}
          >
            {t(
              attributes
                ? 'Hide Operation attributes'
                : 'Show Operation attributes',
            )}
          </button>
          <small>
            {t(
              'Common planned values define conditions for all applicable Subjects. Subject-specific planned values define conditions for one Subject. Preview verifies the plan.',
            )}
          </small>
        </div>
        <p>
          {t(
            'Specify whether this Subject will perform the Operation. Not applicable means the Subject is not assigned to this Operation, not that a result is Missing.',
          )}
        </p>
        <DxtGridFrame
          label={t('Operation and Subject matrix')}
          className="draft-matrix-scroll"
        >
          <table
            className={`dxt-grid draft-matrix ${attributes ? 'with-attributes' : ''}`}
            style={{ width: leftWidth + 190 * (draft.subjects.length + 1) }}
          >
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 166 }} />
              {attributes && (
                <>
                  <col style={{ width: 90 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 80 }} />
                </>
              )}
              <col style={{ width: 94 }} />
              <col style={{ width: 190 }} />
              {draft.subjects.map((s) => (
                <col key={s.id} style={{ width: 190 }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" aria-label={t('Order')}>
                  #
                </th>
                <th scope="col">
                  {t('Operation')} / {t('Condition name')}
                </th>
                {attributes &&
                  ['Operation type', 'Area', 'Equipment', 'Module'].map(
                    (key) => (
                      <th scope="col" key={key}>
                        {t(key)}
                      </th>
                    ),
                  )}
                <th scope="col">{t('Actions')}</th>
                <th scope="col" className="matrix-common">
                  {t('Common planned value')}
                  <small>{t('All Subjects this Operation applies to')}</small>
                </th>
                {draft.subjects.map((s) => (
                  <th scope="col" key={s.id} className="matrix-subject">
                    <DxtCellText>{s.displayLabel}</DxtCellText>
                    {s.displayLabel !== s.id && <small>{s.id}</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.operations.map((op, index) => {
                const option = options.find((o) => o.id === op.optionId)!;
                const context = option.operation.context;
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
                  <Fragment key={index}>
                    <tr className="matrix-operation">
                      <td>{index + 1}</td>
                      <th scope="row">
                        <DxtCellText>{option.operation.label}</DxtCellText>
                        <small>
                          {t('Operation application')} · {op.subjectIds.length}/
                          {draft.subjects.length}
                        </small>
                      </th>
                      {attributes && (
                        <>
                          <td>
                            <DxtStatus>
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
                                (a) =>
                                  a.id === context?.areaDefinitionRevisionId,
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
                        </>
                      )}
                      <td>
                        <div className="draft-grid-actions">
                          {[-1, 1].map((offset) => (
                            <button
                              key={offset}
                              type="button"
                              className="entry-button dxt-action-text"
                              disabled={
                                offset === -1
                                  ? !index
                                  : index === draft.operations.length - 1
                              }
                              aria-label={`${index + 1}. ${option.operation.label} · ${t(offset === -1 ? 'Move up' : 'Move down')}`}
                              onClick={() => move(offset)}
                            >
                              {offset === -1 ? '↑' : '↓'}
                            </button>
                          ))}
                        </div>
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
                      <td
                        className="matrix-common"
                        aria-label={t('Operation application')}
                      >
                        <div className="draft-bulk-actions">
                          <button
                            type="button"
                            className="entry-button dxt-action-text"
                            onClick={() =>
                              participation(draft.subjects.map((s) => s.id))
                            }
                          >
                            {t('Select all')}
                          </button>
                          <button
                            type="button"
                            className="entry-button dxt-action-text"
                            onClick={() => participation([])}
                          >
                            {t('Clear selection')}
                          </button>
                        </div>
                      </td>
                      {draft.subjects.map((subject) => (
                        <td
                          key={subject.id}
                          className={`matrix-subject ${op.subjectIds.includes(subject.id) ? '' : 'matrix-na'}`}
                        >
                          <label className="matrix-participation">
                            <input
                              type="checkbox"
                              checked={op.subjectIds.includes(subject.id)}
                              aria-label={`${index + 1}. ${option.operation.label} · ${subject.id} · ${t('Operation application')}`}
                              onChange={(e) =>
                                participation(
                                  e.target.checked
                                    ? [...op.subjectIds, subject.id]
                                    : op.subjectIds.filter(
                                        (id) => id !== subject.id,
                                      ),
                                )
                              }
                            />
                            {t(
                              op.subjectIds.includes(subject.id)
                                ? 'Operation applies'
                                : 'Operation does not apply',
                            )}
                          </label>
                        </td>
                      ))}
                    </tr>
                    {option.operation.role === 'PROCESS' &&
                      option.operation.items.map((def) => (
                        <tr
                          key={def.applicabilityId}
                          className="matrix-condition"
                        >
                          <td aria-label={t('Condition name')}>↳</td>
                          <th scope="row" colSpan={leftColumns - 1}>
                            <span>↳ {def.label}</span>{' '}
                            <span className="matrix-unit">
                              {def.unit || '—'}
                            </span>
                            <small>
                              {t(
                                option.conditionRequirements?.[
                                  def.applicabilityId
                                ] === undefined
                                  ? 'Requiredness checked in Preview'
                                  : option.conditionRequirements[
                                        def.applicabilityId
                                      ]
                                    ? 'Required'
                                    : 'Optional',
                              )}
                            </small>
                          </th>
                          {[null, ...draft.subjects.map((s) => s.id)].map(
                            (subjectId) => (
                              <td
                                key={JSON.stringify(subjectId)}
                                className={
                                  subjectId
                                    ? `matrix-subject ${op.subjectIds.includes(subjectId) ? '' : 'matrix-na'}`
                                    : 'matrix-common'
                                }
                              >
                                <RunDraftConditionCell
                                  def={def}
                                  items={op.items}
                                  subjectId={subjectId}
                                  required={
                                    option.conditionRequirements?.[
                                      def.applicabilityId
                                    ]
                                  }
                                  participating={
                                    subjectId
                                      ? op.subjectIds.includes(subjectId)
                                      : op.subjectIds.length > 0
                                  }
                                  label={`${index + 1}. ${option.operation.label} · ${def.label} · ${subjectId ?? t('Common planned value')}`}
                                  onChange={(items) => change(index, { items })}
                                />
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
              {!draft.operations.length && (
                <tr>
                  <td colSpan={leftColumns + 1 + draft.subjects.length}>
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
      <RunDraftMeasurementGrid
        draft={draft}
        options={options}
        catalog={catalog}
        change={change}
      />
    </>
  );
}
