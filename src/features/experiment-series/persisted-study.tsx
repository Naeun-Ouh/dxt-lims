'use client';
import Link from 'next/link';
import { StudyBootstrap } from './study-bootstrap';
import type { StudyIdentity } from '@/src/application/study-creation';
import { useLocale } from '@/src/shared/i18n/locale';
import { EntryShell } from './entry-shell';

/** Persisted identity/context only; never substitute a fixture Study. */
export function PersistedStudy({ study }: { study: StudyIdentity }) {
  const { t } = useLocale();
  return (
    <EntryShell
      study={{ name: study.name, slug: study.slug }}
      current="Overview"
    >
      <main className="entry-page study-create-final">
        <header className="entry-heading">
          <div>
            <span className="entry-eyebrow">{t('STUDY ·')}</span>
            <h1>{study.name}</h1>
            <p>{study.intent}</p>
          </div>
          <Link className="entry-button" href="/studies">
            {t('Studies')}
          </Link>
        </header>
        <section className="entry-study-form">
          <h2>{t('Identity')}</h2>
          <dl>
            <dt>{t('Study ID')}</dt>
            <dd>{study.slug}</dd>
            <dt>{t('Domain')}</dt>
            <dd>{study.experimentType}</dd>
            <dt>{t('Area')}</dt>
            <dd>{study.area}</dd>
            <dt>{t('Owner')}</dt>
            <dd>{study.responsibleUserId}</dd>
            <dt>{t('Responsible Department')}</dt>
            <dd>{study.departmentId}</dd>
          </dl>
          <h2>{t('Experiment Setup')}</h2>
          <dl>
            <dt>{t('Exact configuration context')}</dt>
            <dd>{study.packageVersionId}</dd>
            <dt>{t('Experiment Type')}</dt>
            <dd>{study.experimentTypeProfileVersionId}</dd>
            <dt>{t('Subject')}</dt>
            <dd>{study.subjectTypeRevisionId}</dd>
            <dt>{t('Revision')}</dt>
            <dd>{study.setupRevision}</dd>
          </dl>
        </section>
        <StudyBootstrap slug={study.slug} />
      </main>
    </EntryShell>
  );
}
