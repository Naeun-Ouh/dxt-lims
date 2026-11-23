'use client';
import { useId } from 'react';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';
import { useLocale } from '@/src/shared/i18n/locale';

export function RunDraftActions({
  busy,
  canPreview,
  readiness,
  onPreview,
  onCreate,
}: {
  busy: boolean;
  canPreview: boolean;
  readiness?: AuthoritativeRunPreview['readiness'];
  onPreview: () => void;
  onCreate: () => void;
}) {
  const { t } = useLocale();
  const reasonId = useId();
  const disabled = busy || !canPreview || readiness?.status !== 'READY';
  const reasons = busy
    ? [t('Request in progress…')]
    : readiness && readiness.status !== 'READY' && readiness.missing.length
      ? readiness.missing.map((missing) => {
          const [key, ...args] = missing.split('|');
          return t(key, args);
        })
      : [t('Please review the preview first.')];

  return (
    <div className="draft-actions">
      <div className="entry-actions">
        <button
          type="button"
          className="entry-button"
          disabled={busy || !canPreview}
          onClick={onPreview}
        >
          {t('Run Preview')}
        </button>
        <button
          type="button"
          className="entry-button primary"
          disabled={disabled}
          aria-describedby={disabled ? reasonId : undefined}
          onClick={onCreate}
        >
          {t('Create Run')}
        </button>
      </div>
      <div id={reasonId} className="draft-action-reason" aria-live="polite">
        {disabled &&
          reasons.map((reason, index) => <p key={index}>{reason}</p>)}
      </div>
    </div>
  );
}
