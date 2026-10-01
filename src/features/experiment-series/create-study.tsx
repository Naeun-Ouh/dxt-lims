'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/src/shared/i18n/locale';
import {
  createStudyAndReadBack,
  studyCreateSchema,
  type StudyCreationOptions,
} from '@/src/application/study-creation';
import { httpStudyCreation } from '@/src/infrastructure/http/http-repositories';
import { EntryHeading, EntryShell } from './entry-shell';

export function CreateStudy({
  options = { departments: [], contexts: [] },
  loadError = '',
}: {
  options?: StudyCreationOptions;
  loadError?: string;
}) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [intent, setIntent] = useState('');
  const [departmentId, setDepartmentId] = useState(
    options.departments[0] ?? '',
  );
  const [contextIndex, setContextIndex] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const attempt = useRef<{ fingerprint: string; commandId: string } | null>(
    null,
  );
  const context = options.contexts[Number(contextIndex)];
  const available = options.departments.length > 0 && !!context && !loadError;
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !available) return;
    const parsed = studyCreateSchema.safeParse({
      slug,
      name,
      intent,
      departmentId,
      packageVersionId: context.packageVersionId,
      experimentTypeProfileVersionId: context.experimentTypeProfileVersionId,
      subjectTypeRevisionId: context.subjectTypeRevisionId,
      areaDefinitionRevisionId: context.areaDefinitionRevisionId,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues.find((issue) => issue.code === 'custom')?.message ??
          'Enter a title and a Study ID using lowercase letters, numbers and hyphens.',
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, commandId: crypto.randomUUID() };
    try {
      const saved = await createStudyAndReadBack(
        httpStudyCreation,
        parsed.data,
        attempt.current.commandId,
      );
      window.location.assign(`/series/${encodeURIComponent(saved.slug)}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Study creation failed. Retry the same request.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <EntryShell current="New Study">
      <main className="entry-page study-create-final">
        <EntryHeading
          eyebrow="NEW STUDY"
          title="Create Study"
          description="Define Study identity and exact configuration context."
        >
          <div className="entry-actions">
            <Link className="entry-button" href="/studies">
              {t('Cancel')}
            </Link>
            <button
              className="entry-button primary"
              type="submit"
              form="create-study"
              disabled={!available || busy}
            >
              {t(busy ? 'Creating Study…' : 'Create Study')}
            </button>
          </div>
        </EntryHeading>
        <form
          id="create-study"
          className="entry-study-form"
          onSubmit={submit}
          aria-busy={busy}
        >
          <fieldset
            disabled={!available || busy}
            className="study-create-fields"
          >
            <section>
              <h2>{t('Identity')}</h2>
              <div className="entry-form-columns">
                <label className="entry-field">
                  {t('Study Title')}
                  <input
                    required
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="entry-field">
                  {t('Study ID')}
                  <input
                    required
                    maxLength={120}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    aria-describedby="study-id-help"
                  />
                </label>
              </div>
              <p id="study-id-help">
                {t(
                  'Use a unique ID with lowercase letters, numbers and hyphens.',
                )}
              </p>
              <label className="entry-field">
                {t('Objective')}
                <textarea
                  maxLength={4000}
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                />
              </label>
            </section>
            <section>
              <h2>{t('Ownership')}</h2>
              <label className="entry-field">
                {t('Responsible Department')}
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  {options.departments.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                {t(
                  'You will be the responsible user. Existing department visibility applies.',
                )}
              </p>
            </section>
            <section>
              <h2>{t('Experiment Setup')}</h2>
              <label className="entry-field">
                {t('Exact configuration context')}
                <select
                  value={contextIndex}
                  onChange={(e) => setContextIndex(e.target.value)}
                >
                  {options.contexts.map((item, index) => (
                    <option key={index} value={index}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {context && (
                <dl>
                  <dt>{t('Domain')}</dt>
                  <dd>{context.experimentType}</dd>
                  <dt>{t('Area')}</dt>
                  <dd>{context.area}</dd>
                  <dt>{t('Subject')}</dt>
                  <dd>{context.subjectTypeRevisionId}</dd>
                </dl>
              )}
              <p>
                {t(
                  'The Study starts with an empty Setup. No Subjects, Operations, targets or measurements are copied.',
                )}
              </p>
            </section>
          </fieldset>
          {!available && (
            <output>
              {t(
                loadError ||
                  (options.departments.length
                    ? 'No readable valid configuration context is available.'
                    : 'Study creation requires an explicit department grant.'),
              )}
            </output>
          )}
          {error && <p role="alert">{t(error)}</p>}
        </form>
      </main>
    </EntryShell>
  );
}
