'use client';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { useLocale } from '@/src/shared/i18n/locale';
import { DxtStatus } from '@/src/shared/ui/dxt-grid';
import { validateStudySetupItem } from './study-setup-model';

type Item = RunDraft['operations'][number]['items'][number];
type Definition = BootstrapOperationOption['operation']['items'][number];
export function RunDraftConditionCell({
  def,
  items,
  subjectId,
  required,
  participating,
  label,
  onChange,
}: {
  def: Definition;
  items: Item[];
  subjectId: string | null;
  required?: boolean;
  participating: boolean;
  label: string;
  onChange: (items: Item[]) => void;
}) {
  const { t } = useLocale();
  if (!participating && subjectId)
    return <DxtStatus>{t('Not Participating')}</DxtStatus>;
  const matches = items.flatMap((item, index) =>
    item.applicabilityId === def.applicabilityId && item.subjectId === subjectId
      ? [{ item, index }]
      : [],
  );
  const common = subjectId
    ? items.filter(
        (item) =>
          item.applicabilityId === def.applicabilityId &&
          item.subjectId === null,
      )
    : [];
  const add = () =>
    onChange([
      ...items,
      {
        applicabilityId: def.applicabilityId,
        subjectId,
        value: '',
        intentRole: 'FIXED',
      },
    ]);
  return (
    <div className="draft-condition-cell">
      {matches.map(({ item, index }) => {
        let status = item.value.trim() ? 'Value format valid' : 'Missing';
        if (item.value.trim()) {
          try {
            validateStudySetupItem(def, item.value);
          } catch {
            status = 'Invalid';
          }
        }
        const update = (patch: Partial<Item>) =>
          onChange(
            items.map((value, i) =>
              i === index ? { ...value, ...patch } : value,
            ),
          );
        const invalid = status !== 'Value format valid';
        return (
          <div key={index}>
            {def.editor === 'BOOLEAN' || def.options.length ? (
              <select
                aria-label={`${label} · ${t('Value')}`}
                aria-invalid={invalid}
                value={item.value}
                onChange={(e) => update({ value: e.target.value })}
              >
                <option value="">{t('Select')}</option>
                {def.editor === 'BOOLEAN' ? (
                  <>
                    <option value="true">{t('True')}</option>
                    <option value="false">{t('False')}</option>
                  </>
                ) : (
                  def.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <input
                aria-label={`${label} · ${t('Value')}`}
                aria-invalid={invalid}
                inputMode={def.editor === 'NUMBER' ? 'decimal' : undefined}
                value={item.value}
                onChange={(e) => update({ value: e.target.value })}
              />
            )}
            <div className="draft-cell-role">
              <select
                aria-label={`${label} · ${t('Role')}`}
                title={t('Intentionally Varied definition')}
                value={item.intentRole}
                onChange={(e) =>
                  update({ intentRole: e.target.value as 'FIXED' | 'VARIED' })
                }
              >
                <option value="FIXED">{t('Fixed')}</option>
                <option value="VARIED">{t('Intentionally Varied')}</option>
              </select>
              <button
                type="button"
                className="entry-button dxt-action-danger"
                aria-label={`${label} · ${t('Remove condition value')}`}
                title={t('Remove condition value')}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
            {invalid && (
              <>
                <DxtStatus tone="error">{t(status)}</DxtStatus>
                <small>
                  {t(
                    status === 'Missing'
                      ? 'Enter a value or remove an optional assignment.'
                      : def.editor === 'NUMBER'
                        ? 'Enter a numeric value.'
                        : 'Choose a supported value.',
                  )}
                </small>
              </>
            )}
          </div>
        );
      })}
      {!matches.length && (
        <>
          {common.length ? (
            <div className="draft-common-reference">
              <small>{t('Common assignment')}</small>
              {common.map((item, index) => (
                <div key={index}>
                  {item.value || t('Missing')} {def.unit}
                  <small>
                    {t(
                      item.intentRole === 'VARIED'
                        ? 'Intentionally Varied'
                        : 'Fixed',
                    )}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <DxtStatus tone={subjectId && required ? 'warning' : 'neutral'}>
              {t(
                !participating
                  ? 'Not Participating'
                  : subjectId && required
                    ? 'Missing'
                    : 'Not entered',
              )}
            </DxtStatus>
          )}
          <button
            type="button"
            className="entry-button dxt-action-text"
            aria-label={`${label} · ${t('Add condition value')}`}
            onClick={add}
          >
            {t(subjectId ? 'Add individual value' : 'Add common value')}
          </button>
        </>
      )}
      {!!matches.length && !!common.length && (
        <small>
          {t('Individual and common assignments are both recorded.')}
        </small>
      )}
    </div>
  );
}
