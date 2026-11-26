'use client';
import { useContext, useId, useState } from 'react';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { useLocale } from '@/src/shared/i18n/locale';
import { RunDraftConditionCell } from './run-draft-condition-cell';
import {
  conditionFeedbackKey,
  DraftFeedbackContext,
} from './run-draft-feedback';

export function RunDraftConditionRow({
  index,
  option,
  def,
  op,
  subjects,
  leftColumns,
  onChange,
}: {
  index: number;
  option: BootstrapOperationOption;
  def: BootstrapOperationOption['operation']['items'][number];
  op: RunDraft['operations'][number];
  subjects: RunDraft['subjects'];
  leftColumns: number;
  onChange: (items: RunDraft['operations'][number]['items']) => void;
}) {
  const { t } = useLocale();
  const id = useId();
  const feedback = useContext(DraftFeedbackContext);
  const scopedCount = op.items.filter(
    (item) =>
      item.applicabilityId === def.applicabilityId && item.subjectId !== null,
  ).length;
  const [disclosed, setDisclosed] = useState<boolean | null>(null);
  const hasSubjectErrors = subjects.some(
    (s) =>
      feedback[conditionFeedbackKey(index, def.applicabilityId, s.id)]?.length,
  );
  // Existing scoped values and authoritative field errors must not be hidden on entry.
  const expanded = hasSubjectErrors || (disclosed ?? scopedCount > 0);
  const required = option.conditionRequirements?.[def.applicabilityId];
  const cell = (subjectId: string | null) => (
    <RunDraftConditionCell
      feedbackKey={conditionFeedbackKey(index, def.applicabilityId, subjectId)}
      def={def}
      items={op.items}
      subjectId={subjectId}
      required={required}
      participating={
        subjectId ? op.subjectIds.includes(subjectId) : op.subjectIds.length > 0
      }
      label={`${index + 1}. ${option.operation.label} · ${def.label} · ${subjectId ?? t('Condition value')}`}
      onChange={onChange}
    />
  );
  return (
    <tr className="matrix-condition">
      <td aria-label={t('Condition name')}>↳</td>
      <th scope="row" colSpan={leftColumns - 1}>
        <span>↳ {def.label}</span>{' '}
        <span className="matrix-unit">{def.unit || '—'}</span>
        <small>
          {t(
            required === undefined
              ? 'Requiredness checked when creating'
              : required
                ? 'Required'
                : 'Optional',
          )}
        </small>
      </th>
      <td className="matrix-common">
        {cell(null)}
        {!!subjects.length && (
          <button
            type="button"
            className="entry-button dxt-action-text draft-condition-disclosure"
            aria-expanded={expanded}
            aria-controls={id}
            aria-label={`${def.label} · ${t(expanded ? 'Hide Subject-specific condition values' : 'Set differently by Subject')}`}
            disabled={hasSubjectErrors}
            onClick={() => setDisclosed(!expanded)}
          >
            {t(
              expanded
                ? 'Hide Subject-specific condition values'
                : 'Set differently by Subject',
            )}
          </button>
        )}
        {!expanded && scopedCount > 0 && (
          <small>
            {t('{0} Subject-specific condition values retained.', [
              String(scopedCount),
            ])}
          </small>
        )}
      </td>
      {expanded
        ? subjects.map((s, i) => (
            <td
              key={s.id}
              id={i === 0 ? id : undefined}
              className={`matrix-subject ${op.subjectIds.includes(s.id) ? '' : 'matrix-na'}`}
            >
              {cell(s.id)}
            </td>
          ))
        : !!subjects.length && (
            <td
              id={id}
              colSpan={subjects.length}
              className="draft-condition-inheritance"
            >
              {t(
                scopedCount
                  ? 'Subject-specific values are retained when hidden.'
                  : 'The condition value is used for all applicable Subjects.',
              )}
            </td>
          )}
    </tr>
  );
}
