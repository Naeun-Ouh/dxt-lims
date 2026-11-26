'use client';
import { RunDraftWarnings } from './run-draft-warnings';
import { allocationLabel } from '@/src/shared/i18n/allocation-messages';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';
import { ConditionCopyNotice } from './condition-copy-notice';
import { effectiveAssignments } from '@/src/features/run-registration/planning-model';
import { useLocale } from '@/src/shared/i18n/locale';

export function RunCreationReview({
  preview,
  confirmationAttempted = false,
  busy,
  onCancel,
  onConfirm,
}: {
  preview: AuthoritativeRunPreview;
  confirmationAttempted?: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t, locale } = useLocale();
  const { snapshot } = preview;
  const effective = new Map(snapshot.subjects.map(subject => [subject.id, effectiveAssignments(snapshot, subject.id)]));
  return (
    <section className="draft-preview" aria-label={t('Confirm Run creation')}>
      <h2 className="draft-review-heading" tabIndex={-1}>
        {t('Confirm Run creation')}
      </h2>
      <p>
        {t(
          confirmationAttempted
            ? 'If confirmation was interrupted, retry Final Create to check the same request.'
            : 'Nothing has been saved yet. Review this plan. Only Final Create saves the Run.',
        )}
      </p>
      <ConditionCopyNotice preview={preview} />
      <RunDraftWarnings warnings={preview.readiness.warnings} />
      <h3>
        {t('Subjects')} · {snapshot.subjects.length}
      </h3>
      <ul className="draft-review-subjects">
        {snapshot.subjects.map((s) => (
          <li key={s.id}>
            {s.displayLabel}
            {s.displayLabel !== s.id && ` (${s.id})`}
          </li>
        ))}
      </ul>
      <div className="dxt-grid-scroll draft-preview-scroll">
        <table className="dxt-grid">
          <thead>
            <tr>
              {[
                'Order',
                'Operation',
                'Operation applies',
                'Operation does not apply',
                'Conditions',
                'Measurement Plan',
              ].map((key) => (
                <th key={key}>{t(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshot.steps.map((step, index) => {
              const applies = (id: string) =>
                snapshot.subjectOperationIds[id]?.includes(step.id);
              return (
                <tr key={step.id}>
                  <td>{index + 1}</td>
                  <th scope="row">{step.label}</th>
                  <td>
                    {snapshot.subjects
                      .filter((s) => applies(s.id))
                      .map((s) => {const allocation=snapshot.operationDesign?.[step.id]?.allocations[s.id];const group=snapshot.operationDesign?.[step.id]?.groups.find(g=>g.id===allocation?.groupId);return group?`${s.displayLabel} · ${group.name}`:s.displayLabel;})
                      .join(', ') || '—'}
                  </td>
                  <td>
                    {snapshot.subjects
                      .filter((s) => !applies(s.id))
                      .map((s) => `${s.displayLabel} · ${allocationLabel(locale,snapshot,step.id,s.id)}`)
                      .join(', ') || '—'}
                  </td>
                  <td>
                    {snapshot.subjects.map(subject => <div key={subject.id}>
                      <strong>{subject.displayLabel}: </strong>
                      {!applies(subject.id) ? allocationLabel(locale,snapshot,step.id,subject.id) :
                        [...new Set(snapshot.assignments.filter(a => a.processStepId === step.id).map(a => `${a.kind}:${a.label}`))].map(key => {
                          const value = effective.get(subject.id)?.[`${step.id}:${key}`];
                          return <div key={key}>{key.slice(key.indexOf(':') + 1)}: {value?.value || t('Missing')} · {value ? t(value.intentRole === 'VARIED' ? 'Intentionally Varied' : 'Fixed') : '—'}</div>;
                        })}
                    </div>)}
                  </td>
                  <td>
                    {snapshot.measurements
                      .filter((m) => m.stepId === step.id)
                      .map((m) => `${m.point} · ${m.parameters.join(', ')}`)
                      .join(' / ') || t('Not required')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="entry-actions">
        <button
          type="button"
          className="entry-button"
          disabled={busy}
          onClick={onCancel}
        >
          {t('Cancel')}
        </button>
        <button
          type="button"
          className="entry-button primary"
          disabled={busy || preview.readiness.status !== 'READY'}
          onClick={onConfirm}
        >
          {t('Final Create')}
        </button>
      </div>
    </section>
  );
}
