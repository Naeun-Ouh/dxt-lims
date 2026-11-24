'use client';
import { useLocale } from '@/src/shared/i18n/locale';
import { draftMessage } from './run-draft-feedback';

export function RunDraftActions({
  busy,
  available,
  reviewing,
  missing,
  error,
  onCreate,
}: {
  busy: boolean;
  available: boolean;
  reviewing: boolean;
  missing: string[];
  error: string;
  onCreate: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="draft-actions">
      <div className="entry-actions">
        <button
          type="button"
          className="entry-button primary"
          disabled={busy || !available || reviewing}
          onClick={onCreate}
        >
          {t('Create Run')}
        </button>
      </div>
      <div className="draft-action-reason" aria-live="polite" tabIndex={-1}>
        {busy ? (
          <p>{t('Request in progress…')}</p>
        ) : error ? (
          <p role="alert">{t(error)}</p>
        ) : missing.length ? (
          <>
            <p>
              {t(
                'Nothing has been saved. Correct the highlighted inputs, then select Create Run again.',
              )}
            </p>
            <ul>
              {[...new Set(missing)].map((message) => {
                const [key, ...args] = message.split('|');
                return <li key={message}>{t(draftMessage(key), args)}</li>;
              })}
            </ul>
          </>
        ) : (
          !reviewing && (
            <p>
              {t(
                'We will check your plan and ask for final confirmation before saving.',
              )}
            </p>
          )
        )}
      </div>
    </div>
  );
}
