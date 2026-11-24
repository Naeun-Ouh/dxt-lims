'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/src/shared/i18n/locale';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import { draftFromSnapshot, type RunDraft } from '@/src/application/run-draft';
import type {
  AuthoritativeRunPreview,
  RunCreationRequest,
} from '@/src/application/run-creation';
import { EntryShell } from './entry-shell';
import { RunDraftEditor } from './run-draft-editor';
import { RunDraftActions } from './run-draft-actions';
import { RunCreationReview } from './run-creation-review';
import {
  DraftFeedbackContext,
  locateDraftFeedback,
  summarizeDraftFeedback,
} from './run-draft-feedback';
import { bootstrapActionError } from './study-bootstrap-feedback';
import type { SeriesSlug, RunCreationSource } from './run-entry-model';

function runDraftError(error: unknown) {
  const message = bootstrapActionError(error, 'run');
  return message ===
    'Could not create or preview the Run. Check that Setup is saved and execution conditions are complete, then try again.'
    ? 'Could not check or create the Run. Your draft is kept. Check your inputs and connection, then try again.'
    : message;
}

function RunDraftPage({
  seriesSlug,
  initialSource,
}: {
  seriesSlug: SeriesSlug;
  initialSource: RunCreationSource;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const router = useRouter();
  const [source, setSource] = useState(initialSource);
  const [context, setContext] = useState<AuthoritativeRunPreview | null>(null);
  const [draft, setDraft] = useState<RunDraft | null>(null);
  const [preview, setPreview] = useState<AuthoritativeRunPreview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [confirmationAttempted, setConfirmationAttempted] = useState(false);
  const surface = useRef<HTMLElement>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const pending = useRef(false);
  const command = useRef<string | null>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    void application.runs
      .previewCreation({ seriesSlug, source, includeDraftOptions: true })
      .then((base) => {
        if (!active) return;
        const candidate = draftFromSnapshot(base.snapshot, base.options ?? []);
        setContext(base);
        setDraft(candidate);
        setDirty(false);
        command.current = null;
      })
      .catch((e) => {
        if (active) setError(runDraftError(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [application, seriesSlug, source, generation]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  useEffect(() => {
    if (busy) return;
    const target = error
      ? surface.current?.querySelector<HTMLElement>('.draft-action-reason')
      : reviewing
        ? surface.current?.querySelector<HTMLElement>('.draft-review-heading')
        : preview?.readiness.status === 'NOT_READY'
          ? surface.current?.querySelector<HTMLElement>(
              '[data-draft-error], .draft-action-reason',
            )
          : null;
    target?.focus();
    target?.scrollIntoView({ block: 'center' });
  }, [busy, reviewing, preview, error]);
  function resetSource() {
    setReviewing(false);
    setBusy(true);
    setError('');
    setPreview(null);
    setDraft(null);
    setContext(null);
  }
  const request = (): RunCreationRequest => ({
    seriesSlug,
    source,
    draft: draft!,
    sourceFingerprint: context!.sourceFingerprint,
  });
  async function act(intent: 'review' | 'confirm') {
    if (pending.current || !context || !draft) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (intent === 'review') {
        setConfirmationAttempted(false);
        setReviewing(false);
        setPreview(null);
        const checked = await application.runs.previewCreation(request());
        setPreview(checked);
        setReviewing(checked.readiness.status === 'READY');
        command.current = null;
      } else if (reviewing && preview?.readiness.status === 'READY') {
        setConfirmationAttempted(true);
        command.current ??= crypto.randomUUID();
        const saved = await application.runs.createFromPreview(
          request(),
          preview.fingerprint,
          command.current,
        );
        setDirty(false);
        router.push(
          `/series/${seriesSlug}/runs/${saved.runNumber}/engineering-grid?view=plan`,
        );
      }
    } catch (e) {
      setError(runDraftError(e));
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  return (
    <EntryShell
      standard
      study={{
        name: context?.snapshot.series.name ?? seriesSlug,
        slug: seriesSlug,
      }}
      current="Create Run"
    >
      <main className="entry-page run-entry-final">
        <header className="entry-heading">
          <div>
            <h1>{t('Run Draft')}</h1>
            <p>
              {t('Draft changes stay in this page until Create Run succeeds.')}
            </p>
          </div>
        </header>
        <section
          className="study-bootstrap run-draft dxt-density"
          aria-busy={busy}
          ref={surface}
        >
          <fieldset disabled={busy || reviewing}>
            <legend>{t('Run starting point')}</legend>
            <div className="draft-source-buttons">
              {(['BLANK', 'STUDY_DEFAULT', 'PREVIOUS_RUN'] as const).map(
                (value) => (
                  <button
                    key={value}
                    className={`entry-button ${source === value ? 'dxt-action-selected' : ''}`}
                    aria-pressed={source === value}
                    onClick={() => {
                      if (source === value) return;
                      if (
                        !dirty ||
                        window.confirm(
                          t(
                            'Replace the current draft with the selected source?',
                          ),
                        )
                      ) {
                        resetSource();
                        setSource(value);
                        setDirty(false);
                      }
                    }}
                  >
                    {t(
                      value === 'BLANK'
                        ? 'Blank'
                        : value === 'STUDY_DEFAULT'
                          ? 'Study Default'
                          : 'Previous Run',
                    )}
                  </button>
                ),
              )}
            </div>
          </fieldset>
          {source === 'STUDY_DEFAULT' &&
            context &&
            !context.snapshot.subjects.length &&
            !context.snapshot.steps.length && (
              <p>
                {t(
                  'No Study Default is configured. Author this draft or choose Blank.',
                )}
              </p>
            )}
          {!busy && !draft && (
            <button
              className="entry-button"
              onClick={() => {
                resetSource();
                setGeneration((g) => g + 1);
              }}
            >
              {t('Retry')}
            </button>
          )}
          {busy && <output>{t('Request in progress…')}</output>}
          {context && (
            <p>
              {t('Experiment reference information')} · {context.snapshot.area}{' '}
              · {context.snapshot.experimentType}
            </p>
          )}
          <p>
            {t(
              'Execution only. Target and Evaluation Criteria are not configured in this flow.',
            )}
          </p>
          {draft && context?.catalog && (
            <fieldset className="draft-content" disabled={busy || reviewing}>
              <DraftFeedbackContext.Provider
                value={locateDraftFeedback(
                  draft,
                  context.options ?? [],
                  preview?.readiness.missing ?? [],
                )}
              >
                <RunDraftEditor
                  key={`${source}-${generation}`}
                  draft={draft}
                  options={context.options ?? []}
                  catalog={context.catalog}
                  onChange={(value) => {
                    setDraft(value);
                    setDirty(true);
                    setPreview(null);
                    setReviewing(false);
                    command.current = null;
                    setError('');
                  }}
                />
              </DraftFeedbackContext.Provider>
            </fieldset>
          )}
          <RunDraftActions
            busy={busy}
            available={Boolean(draft && context?.catalog)}
            reviewing={reviewing}
            missing={summarizeDraftFeedback(
              draft,
              context?.options ?? [],
              preview?.readiness.missing ?? [],
            )}
            error={error}
            onCreate={() => void act('review')}
          />
          {reviewing && preview?.readiness.status === 'READY' && (
            <RunCreationReview
              preview={preview}
              confirmationAttempted={confirmationAttempted}
              busy={busy}
              onCancel={() => {
                setReviewing(false);
                setPreview(null);
                setError('');
              }}
              onConfirm={() => void act('confirm')}
            />
          )}
        </section>
      </main>
    </EntryShell>
  );
}

export function ProductionRunEntry(props: {
  seriesSlug: SeriesSlug;
  initialSource: RunCreationSource;
}) {
  return (
    <RunDraftPage
      key={`${props.seriesSlug}-${props.initialSource}`}
      {...props}
    />
  );
}
