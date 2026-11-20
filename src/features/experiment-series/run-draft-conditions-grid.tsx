'use client';

import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { validateStudySetupItem } from './study-setup-model';
import { useLocale } from '@/src/shared/i18n/locale';

export function RunDraftConditionsGrid({
  draft,
  options,
  change,
}: {
  draft: RunDraft;
  options: BootstrapOperationOption[];
  change: (
    index: number,
    patch: Partial<RunDraft['operations'][number]>,
  ) => void;
}) {
  const { t } = useLocale();
  const rows = draft.operations.flatMap((op, index) => {
    const operation = options.find(
      (option) => option.id === op.optionId,
    )!.operation;
    if (operation.role === 'MEASUREMENT') return [];
    return operation.items.flatMap((def) => {
      const items = op.items.flatMap((item, itemIndex) =>
        item.applicabilityId === def.applicabilityId
          ? [{ item, itemIndex }]
          : [],
      );
      return (items.length ? items : [{ item: null, itemIndex: -1 }]).map(
        ({ item, itemIndex }) => ({
          op,
          index,
          operation,
          def,
          item,
          itemIndex,
        }),
      );
    });
  });
  return (
    <fieldset className="draft-grid-section">
      <legend>3. {t('Conditions')}</legend>
      <p>
        {t(
          'Value checks describe the entered format only. Preview checks execution readiness and required conditions.',
        )}
      </p>
      <section
        className="draft-grid-scroll"
        aria-label={t('Run condition values')}
      >
        <table className="draft-dense-table draft-conditions-table">
          <thead>
            <tr>
              {[
                'Operation',
                'Condition name',
                'Value',
                'Unit',
                'Role',
                'Apply to',
                'Validation status',
                'Actions',
              ].map((key) => (
                <th scope="col" key={key}>
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ op, index, operation, def, item, itemIndex }) => {
              const add = () =>
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
                });
              const update = (patch: Partial<NonNullable<typeof item>>) =>
                change(index, {
                  items: op.items.map((value, i) =>
                    i === itemIndex ? { ...value, ...patch } : value,
                  ),
                });
              let status = item
                ? item.value.trim()
                  ? 'Value format valid'
                  : 'Missing'
                : op.subjectIds.length
                  ? 'Not entered'
                  : 'Not Participating';
              if (item?.value.trim()) {
                try {
                  validateStudySetupItem(def, item.value);
                } catch {
                  status = 'Invalid';
                }
              }
              const label = `${index + 1}. ${operation.label} · ${def.label} · ${itemIndex + 1}`;
              return (
                <tr key={`${index}-${def.applicabilityId}-${itemIndex}`}>
                  <td>
                    {index + 1}. {operation.label}
                  </td>
                  <th scope="row">{def.label}</th>
                  <td>
                    {!item ? (
                      '—'
                    ) : def.options.length ? (
                      <select
                        aria-label={`${label} · ${t('Value')}`}
                        value={item.value}
                        aria-invalid={
                          status === 'Invalid' || status === 'Missing'
                        }
                        onChange={(e) => update({ value: e.target.value })}
                      >
                        <option value="">{t('Select')}</option>
                        {def.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label={`${label} · ${t('Value')}`}
                        value={item.value}
                        aria-invalid={
                          status === 'Invalid' || status === 'Missing'
                        }
                        onChange={(e) => update({ value: e.target.value })}
                      />
                    )}
                  </td>
                  <td>{def.unit || '—'}</td>
                  <td>
                    {item ? (
                      <select
                        aria-label={`${label} · ${t('Role')}`}
                        title={t('Intentionally Varied definition')}
                        value={item.intentRole}
                        onChange={(e) =>
                          update({
                            intentRole: e.target.value as 'FIXED' | 'VARIED',
                          })
                        }
                      >
                        <option value="FIXED">{t('Fixed')}</option>
                        <option value="VARIED">
                          {t('Intentionally Varied')}
                        </option>
                      </select>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {item && (
                      <select
                        aria-label={`${label} · ${t('Apply to')}`}
                        value={item.subjectId ?? ''}
                        onChange={(e) =>
                          update({ subjectId: e.target.value || null })
                        }
                      >
                        <option value="">
                          {t('All participating Subjects')}
                        </option>
                        {draft.subjects
                          .filter((subject) =>
                            op.subjectIds.includes(subject.id),
                          )
                          .map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.displayLabel}
                            </option>
                          ))}
                      </select>
                    )}
                    <small>
                      {op.subjectIds.length
                        ? t('{0} participating · {1} not participating', [
                            op.subjectIds.length,
                            draft.subjects.length - op.subjectIds.length,
                          ])
                        : t('Not Participating')}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`draft-value-status ${status === 'Invalid' || status === 'Missing' ? 'needs-input' : ''}`}
                    >
                      {t(status)}
                    </span>
                  </td>
                  <td>
                    <div className="draft-grid-actions">
                      <button
                        type="button"
                        className="entry-button"
                        aria-label={`${label} · ${t('Add condition value')}`}
                        onClick={add}
                      >
                        {t('Add value')}
                      </button>
                      {item && (
                        <button
                          type="button"
                          className="entry-button"
                          aria-label={`${label} · ${t('Remove')}`}
                          onClick={() =>
                            change(index, {
                              items: op.items.filter((_, i) => i !== itemIndex),
                            })
                          }
                        >
                          {t('Remove')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8}>
                  {t(
                    'No execution conditions to display for the selected Operations.',
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </fieldset>
  );
}
