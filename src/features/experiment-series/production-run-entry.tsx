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
import { bootstrapActionError } from './study-bootstrap-feedback';
import type { SeriesSlug, RunCreationSource } from './run-entry-model';

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
        if (active) setError(bootstrapActionError(e, 'run'));
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
  function resetSource() {
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
  async function act(create: boolean) {
    if (pending.current || !context || !draft) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (!create) {
        setPreview(await application.runs.previewCreation(request()));
        command.current = null;
      } else if (preview?.readiness.status === 'READY') {
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
      setError(bootstrapActionError(e, 'run'));
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
        <section className="study-bootstrap run-draft">
          <fieldset disabled={busy}>
            <legend>{t('Choose creation source')}</legend>
            <div className="draft-source-buttons">
              {(['BLANK', 'STUDY_DEFAULT', 'PREVIOUS_RUN'] as const).map(
                (value) => (
                  <button
                    key={value}
                    className={`entry-button ${source === value ? 'primary' : ''}`}
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
          {error && <p role="alert">{t(error)}</p>}
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
            <fieldset className="draft-content" disabled={busy}>
              <RunDraftEditor
                key={`${source}-${generation}`}
                draft={draft}
                options={context.options ?? []}
                catalog={context.catalog}
                onChange={(value) => {
                  setDraft(value);
                  setDirty(true);
                  setPreview(null);
                  command.current = null;
                  setError('');
                }}
              />
              <div className="entry-actions">
                <button
                  className="entry-button primary"
                  onClick={() => void act(false)}
                >
                  {t('Check readiness and preview')}
                </button>
              </div>
            </fieldset>
          )}
          {preview && (
            <section className="draft-preview" aria-label={t('Run Preview')}>
              <h2>{t('Run Preview')}</h2>
              <output>
                {t('Execution Readiness')}: {t(preview.readiness.status)}
              </output>
              <ul>
                {preview.readiness.missing.map((m, i) => {
                  const [key, ...args] = m.split('|');
                  return <li key={i}>{t(key, args)}</li>;
                })}
              </ul>
              <div className="draft-preview-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Operation')}</th>
                      <th>{t('Subjects')}</th>
                      <th>{t('Conditions')}</th>
                      <th>{t('Measurement Plan')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.snapshot.steps.map((step) => (
                      <tr key={step.id}>
                        <td>{step.label}</td>
                        <td>
                          {preview.snapshot.subjects
                            .filter((s) =>
                              preview.snapshot.subjectOperationIds[
                                s.id
                              ]?.includes(step.id),
                            )
                            .map((s) => s.displayLabel)
                            .join(', ') || t('Not Participating')}
                        </td>
                        <td>
                          {preview.snapshot.assignments
                            .filter((a) => a.processStepId === step.id)
                            .map((a) => (
                              <div key={a.id}>
                                {a.label}: {a.value} ·{' '}
                                {a.subjectId ?? t('All participating Subjects')}{' '}
                                · {t(a.intentRole)}
                              </div>
                            ))}
                        </td>
                        <td>
                          {preview.snapshot.measurements
                            .filter((m) => m.stepId === step.id)
                            .map(
                              (m) => `${m.point} · ${m.parameters.join(', ')}`,
                            )
                            .join(' / ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="entry-actions">
                <button
                  className="entry-button primary"
                  disabled={busy || preview.readiness.status !== 'READY'}
                  onClick={() => void act(true)}
                >
                  {t('Create Run')}
                </button>
              </div>
            </section>
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
