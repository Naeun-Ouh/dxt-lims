'use client';
import { useContext } from 'react';
import {SampleRevisionPicker} from '@/src/features/samples/revision-picker';
import { DraftFeedbackContext, RunDraftFeedback } from './run-draft-feedback';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { useLocale } from '@/src/shared/i18n/locale';
import { DxtStatus } from '@/src/shared/ui/dxt-grid';
import { validateStudySetupItem } from './study-setup-model';

type Item = RunDraft['operations'][number]['items'][number];
type Definition = BootstrapOperationOption['operation']['items'][number];
/** Empty subject input removes only that scoped assignment; common values stay intact. */
export function editDraftConditionValue(
  items: Item[],
  applicabilityId: string,
  subjectId: string | null,
  value: string,
): Item[] {
  const index = items.findIndex(
    (item) =>
      item.applicabilityId === applicabilityId && item.subjectId === subjectId,
  );
  if (subjectId !== null && !value.trim())
    return items.filter(
      (item) =>
        item.applicabilityId !== applicabilityId ||
        item.subjectId !== subjectId,
    );
  if (index >= 0)
    return items.map((item, i) => (i === index ? { ...item, value, ...(item.value!==value&&('sampleRevisionId' in item||item.sampleAccessDenied)?{sampleRevisionId:null,sampleAccessDenied:false}:{}) } : item));
  if (!value.trim()) return items;
  return [...items, { applicabilityId, subjectId, value, intentRole: 'FIXED' }];
}
export function RunDraftConditionCell({
  feedbackKey,
  def,
  items,
  subjectId,
  required,
  participating,
  label,
  onChange,
}: {
  feedbackKey?: string;
  def: Definition;
  items: Item[];
  subjectId: string | null;
  required?: boolean;
  participating: boolean;
  label: string;
  onChange: (items: Item[]) => void;
}) {
  const { t } = useLocale();
  const feedback = useContext(DraftFeedbackContext);
  const hasFeedback = !!feedbackKey && !!feedback[feedbackKey]?.length;
  if (!participating && subjectId)
    return <DxtStatus>{t('Operation does not apply')}</DxtStatus>;
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
  const displayed = matches.length
    ? matches
    : [
        {
          item: {
            sampleRevisionId:undefined as string|null|undefined, sampleAccessDenied:undefined as boolean|undefined,
            applicabilityId: def.applicabilityId,
            subjectId,
            value: '',
            intentRole: 'FIXED' as const,
          },
          index: -1,
        },
      ];
  return (
    <div className="draft-condition-cell">
      {displayed.map(({ item, index }, slot) => {
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
        const invalid = index >= 0 && status !== 'Value format valid';
        const setValue = (value: string) =>
          onChange(
            editDraftConditionValue(
              items,
              def.applicabilityId,
              subjectId,
              value,
            ),
          );
        return (
          <div key={slot}>
            {subjectId && (
              <small>{t('Subject-specific condition value')}</small>
            )}
            {def.editor === 'BOOLEAN' || def.options.length ? (
              <select
                aria-label={`${label} · ${t('Value')}`}
                aria-invalid={invalid}
                value={item.value}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">
                  {t(subjectId ? 'Use common condition value' : 'Select')}
                </option>
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
                maxLength={4000}
                placeholder={
                  subjectId
                    ? t('Use common condition value')
                    : t('Enter condition value')
                }
                inputMode={def.editor === 'NUMBER' ? 'decimal' : undefined}
                value={item.value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
            {index>=0&&def.kind==='MATERIAL'&&<SampleRevisionPicker value={item.sampleRevisionId} denied={item.sampleAccessDenied} onChange={sampleRevisionId=>update({sampleRevisionId,sampleAccessDenied:false})}/>}
            {index >= 0 && (
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
            )}
            {invalid && (
              <>
                <DxtStatus tone="error">{t(status)}</DxtStatus>
                {!hasFeedback && (
                  <small>
                    {t(
                      status === 'Missing'
                        ? 'Enter a value or remove an optional assignment.'
                        : def.editor === 'NUMBER'
                          ? 'Enter a numeric value.'
                          : 'Choose a supported value.',
                    )}
                  </small>
                )}
              </>
            )}
          </div>
        );
      })}
      {subjectId && !matches.length && (
        <>
          <small>{t('Use common condition value')}</small>
          {common.length ? (
            <div className="draft-common-reference">
              {common.map((item, index) => (
                <div key={index}>
                  {item.value || t('Enter condition value')} {def.unit}
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
            <small>
              {t(
                'Enter the common condition value first, or specify a value for this Subject.',
              )}
            </small>
          )}
        </>
      )}
      {!subjectId && !matches.length && (
        <small>{t(required ? 'Required' : 'Optional')}</small>
      )}
      {feedbackKey && <RunDraftFeedback location={feedbackKey} />}
      {subjectId && (
        <small>
          {t(
            'This value applies only to this Subject. Leave it blank to use the common condition value.',
          )}
        </small>
      )}
    </div>
  );
}
