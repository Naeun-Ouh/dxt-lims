'use client';
import { useState } from 'react';
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
  const [optionId, setOptionId] = useState('');
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
      <fieldset>
        <legend>
          2. {t('Process Flow')} · 3. {t('Conditions')}
        </legend>
        <div className="bootstrap-controls">
          <label>
            {t('Operation')}
            <select
              value={optionId}
              onChange={(e) => setOptionId(e.target.value)}
            >
              <option value="">{t('Select')}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.operation.label} · {o.operation.context?.equipmentLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            className="entry-button"
            disabled={!optionId}
            onClick={() =>
              onChange({
                ...draft,
                operations: [
                  ...draft.operations,
                  {
                    optionId,
                    subjectIds: draft.subjects.map((s) => s.id),
                    items: [],
                    parameterIds: [],
                    point: null,
                  },
                ],
              })
            }
          >
            {t('Add Operation')}
          </button>
        </div>
        {draft.operations.map((op, index) => {
          const option = options.find((o) => o.id === op.optionId)!;
          const participation = (ids: string[]) =>
            change(index, {
              subjectIds: ids,
              items: op.items.filter(
                (i) => !i.subjectId || ids.includes(i.subjectId),
              ),
            });
          return (
            <section className="bootstrap-operation" key={index}>
              <div className="bootstrap-controls">
                <strong>
                  {index + 1}. {option.operation.label}
                </strong>
                <button
                  className="entry-button"
                  disabled={!index}
                  onClick={() => {
                    const rows = [...draft.operations];
                    [rows[index - 1], rows[index]] = [
                      rows[index],
                      rows[index - 1],
                    ];
                    onChange({ ...draft, operations: rows });
                  }}
                >
                  {t('Move up')}
                </button>
                <button
                  className="entry-button"
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
              </div>
              <fieldset>
                <legend>{t('Operation participation')}</legend>
                <div className="bootstrap-controls">
                  <button
                    className="entry-button"
                    onClick={() =>
                      participation(draft.subjects.map((s) => s.id))
                    }
                  >
                    {t('Select all')}
                  </button>
                  <button
                    className="entry-button"
                    onClick={() => participation([])}
                  >
                    {t('Clear selection')}
                  </button>
                  <span>
                    {op.subjectIds.length} / {draft.subjects.length}
                  </span>
                </div>
                <div className="draft-subjects">
                  {draft.subjects.map((s, si) => (
                    <label key={`${s.id}-${si}`}>
                      <input
                        type="checkbox"
                        checked={op.subjectIds.includes(s.id)}
                        onChange={(e) =>
                          participation(
                            e.target.checked
                              ? [...op.subjectIds, s.id]
                              : op.subjectIds.filter((id) => id !== s.id),
                          )
                        }
                      />
                      {s.displayLabel}
                      {!op.subjectIds.includes(s.id) && (
                        <small>{t('Not Participating')}</small>
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
              {option.operation.role === 'MEASUREMENT' ? (
                <>
                  <h3>4. {t('Measurement Plan')}</h3>
                  <label>
                    {t('Measurement point')}
                    <select
                      value={op.point ?? ''}
                      onChange={(e) =>
                        change(index, {
                          point: (e.target.value || null) as typeof op.point,
                          parameterIds: [],
                        })
                      }
                    >
                      <option value="">{t('Select')}</option>
                      {['PRE', 'INTERMEDIATE', 'POST', 'FINAL', 'CUSTOM'].map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <div className="draft-subjects">
                    {catalog.parameters
                      .filter(
                        (p) =>
                          option.parameterIds.includes(p.id) &&
                          (!op.point ||
                            p.supportedMeasurementPoints.includes(op.point)),
                      )
                      .map((p) => (
                        <label key={p.id}>
                          <input
                            type="checkbox"
                            checked={op.parameterIds.includes(p.id)}
                            onChange={(e) =>
                              change(index, {
                                parameterIds: e.target.checked
                                  ? [...op.parameterIds, p.id]
                                  : op.parameterIds.filter((id) => id !== p.id),
                              })
                            }
                          />
                          {p.name}
                          {!!p.requiredSupportingParameterIds.length && (
                            <small>
                              {t('Required supporting parameters')}:{' '}
                              {p.requiredSupportingParameterIds
                                .map(
                                  (id) =>
                                    catalog.parameters.find((p) => p.id === id)
                                      ?.name,
                                )
                                .join(', ')}
                            </small>
                          )}
                        </label>
                      ))}
                  </div>
                </>
              ) : (
                option.operation.items.map((def) => (
                  <div key={def.applicabilityId} className="draft-condition">
                    <div className="bootstrap-controls">
                      <strong>
                        {def.label} {def.unit}
                      </strong>
                      <button
                        className="entry-button"
                        onClick={() =>
                          change(index, {
                            items: [
                              ...op.items,
                              {
                                applicabilityId: def.applicabilityId,
                                value: '',
                                intentRole: 'FIXED',
                                subjectId: null,
                              },
                            ],
                          })
                        }
                      >
                        {t('Add condition value')}
                      </button>
                    </div>
                    {op.items.map((item, ii) =>
                      item.applicabilityId !== def.applicabilityId ? null : (
                        <div className="bootstrap-controls" key={ii}>
                          <label>
                            {t('Apply to')}
                            <select
                              value={item.subjectId ?? ''}
                              onChange={(e) =>
                                change(index, {
                                  items: op.items.map((v, i) =>
                                    i === ii
                                      ? {
                                          ...v,
                                          subjectId: e.target.value || null,
                                        }
                                      : v,
                                  ),
                                })
                              }
                            >
                              <option value="">
                                {t('All participating Subjects')}
                              </option>
                              {draft.subjects
                                .filter((s) => op.subjectIds.includes(s.id))
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.displayLabel}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            {t('Value')}
                            {def.options.length ? (
                              <select
                                value={item.value}
                                onChange={(e) =>
                                  change(index, {
                                    items: op.items.map((v, i) =>
                                      i === ii
                                        ? { ...v, value: e.target.value }
                                        : v,
                                    ),
                                  })
                                }
                              >
                                <option value="">{t('Select')}</option>
                                {def.options.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={item.value}
                                onChange={(e) =>
                                  change(index, {
                                    items: op.items.map((v, i) =>
                                      i === ii
                                        ? { ...v, value: e.target.value }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            )}
                          </label>
                          <label>
                            {t('Role')}
                            <select
                              title={t('Intentionally Varied definition')}
                              value={item.intentRole}
                              onChange={(e) =>
                                change(index, {
                                  items: op.items.map((v, i) =>
                                    i === ii
                                      ? {
                                          ...v,
                                          intentRole: e.target.value as
                                            | 'FIXED'
                                            | 'VARIED',
                                        }
                                      : v,
                                  ),
                                })
                              }
                            >
                              <option value="FIXED">{t('Fixed')}</option>
                              <option value="VARIED">
                                {t('Intentionally Varied')}
                              </option>
                            </select>
                          </label>
                          <button
                            className="entry-button"
                            onClick={() =>
                              change(index, {
                                items: op.items.filter((_, i) => i !== ii),
                              })
                            }
                          >
                            {t('Remove')}
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ))
              )}
            </section>
          );
        })}
        {!draft.operations.length && (
          <p>
            {t('Add Operations for this Run. Study defaults are optional.')}
          </p>
        )}
      </fieldset>
    </>
  );
}
