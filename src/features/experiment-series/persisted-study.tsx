'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { StudyIdentity } from '@/src/application/study-creation';
import type { StudyPermissions } from '@/src/application/authorization';
import type { DiscoveryPage, RunSummary } from '@/src/application/discovery';
import {
  loadRunSummaries,
  loadStudyPermissions,
} from '@/src/infrastructure/http/http-repositories';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import { useLocale } from '@/src/shared/i18n/locale';
import { EntryShell } from './entry-shell';

/** Study is reusable context. Concrete execution authoring belongs to Run Draft. */
export function PersistedStudy({ study }: { study: StudyIdentity }) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const registry =
    application.repositories.configuration.getConfigurationRegistry();
  const [permissions, setPermissions] = useState<StudyPermissions | null>(null);
  const [runs, setRuns] = useState<DiscoveryPage<RunSummary> | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      loadStudyPermissions(study.slug),
      loadRunSummaries({ studySlug: study.slug, limit: 25, offset }),
    ])
      .then(([p, r]) => {
        if (active) {
          setError(false);
          setPermissions(p);
          setRuns(r);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [study.slug, offset]);
  const pkg = registry.packages.find((p) => p.id === study.packageVersionId);
  return (
    <EntryShell
      study={{ name: study.name, slug: study.slug }}
      current="Overview"
    >
      <main className="entry-page study-create-final">
        <header className="entry-heading">
          <div>
            <span className="entry-eyebrow">{t('Study')}</span>
            <h1>{study.name}</h1>
            <p>{study.intent}</p>
          </div>
          <div className="draft-source-buttons">
            <Link className="entry-button" href="/studies">
              {t('Studies')}
            </Link>
            {permissions?.canCreateRun && (
              <Link
                className="entry-button primary"
                href={`/runs/new?series=${study.slug}&from=blank`}
              >
                {t('Create Run')}
              </Link>
            )}
          </div>
        </header>
        <section className="entry-study-form">
          <h2>{t('Study context')}</h2>
          <dl>
            <dt>{t('Responsible Department')}</dt>
            <dd>{study.departmentId}</dd>
            <dt>{t('Subject Type')}</dt>
            <dd>
              {registry.subjectTypes.find(
                (s) => s.id === study.subjectTypeRevisionId,
              )?.label ?? t('Not specified')}
            </dd>
            <dt>{t('Experiment reference information')}</dt>
            <dd>
              {study.experimentType} · {study.area} · {t('Version')}{' '}
              {pkg?.version}
            </dd>
          </dl>
          <p>{t('Experiment reference information help')}</p>
          <details>
            <summary>{t('Technical details')}</summary>
            <dl>
              <dt>{t('Study ID')}</dt>
              <dd>{study.slug}</dd>
              <dt>{t('Exact configuration context')}</dt>
              <dd>{study.packageVersionId}</dd>
              <dt>{t('Experiment Type')}</dt>
              <dd>{study.experimentTypeProfileVersionId}</dd>
              <dt>{t('Subject Type')}</dt>
              <dd>{study.subjectTypeRevisionId}</dd>
            </dl>
          </details>
        </section>
        <section className="entry-study-form">
          <h2>
            {t('Study Default')} · {t('Optional')}
          </h2>
          <p>
            {t(
              'Defaults are reusable starting points. Start Blank without creating a default.',
            )}
          </p>
          {permissions?.canCreateRun && (
            <Link
              className="entry-button"
              href={`/runs/new?series=${study.slug}&from=study-default`}
            >
              {t('Create Run from Study Default')}
            </Link>
          )}
        </section>
        <section className="entry-study-form">
          <h2>{t('Existing Runs')}</h2>
          {error && (
            <p role="alert">
              {t(
                'Could not load this Study. Check your connection and try again.',
              )}
            </p>
          )}
          {!runs && !error && <p>{t('Loading…')}</p>}
          {runs?.items.map((r) => (
            <p key={r.id}>
              <Link href={r.href}>
                {t('Run')} {r.number} · {r.subjects} {t('Subjects')}
              </Link>
            </p>
          ))}
          {runs && !runs.total && (
            <p>{t('No Runs yet. Create a Run to define this iteration.')}</p>
          )}
          <div className="draft-source-buttons">
            {offset > 0 && (
              <button
                className="entry-button"
                onClick={() => setOffset((o) => o - 25)}
              >
                {t('Previous')}
              </button>
            )}
            {runs && offset + runs.items.length < runs.total && (
              <button
                className="entry-button"
                onClick={() => setOffset((o) => o + 25)}
              >
                {t('Next')}
              </button>
            )}
          </div>
        </section>
        {permissions && !permissions.canCreateRun && (
          <p className="entry-alert">
            {t(
              'You do not have permission to create Runs. Ask the Study manager for access.',
            )}
          </p>
        )}
      </main>
    </EntryShell>
  );
}
