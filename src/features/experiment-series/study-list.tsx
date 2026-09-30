'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { RunSummary } from '@/src/application/discovery';
import { useLocale } from '@/src/shared/i18n/locale';
import { EntryHeading, EntryIcon, EntryShell } from './entry-shell';

export type StudyListRow = {
  id: string;
  slug: string;
  name: string;
  area: string | null;
  latest: RunSummary | null;
  lastActivity?: string | null;
  contextUnavailable?: boolean;
};
export function filterStudies(
  studies: StudyListRow[],
  search: string,
  area: string,
) {
  const text = search.trim().toLocaleLowerCase();
  return studies.filter(
    (study) =>
      (!area || study.area === area) &&
      `${study.name} ${study.id}`.toLocaleLowerCase().includes(text),
  );
}
export function StudyList({ studies }: { studies: StudyListRow[] }) {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const visible = useMemo(
    () => filterStudies(studies, search, area),
    [studies, search, area],
  );
  return (
    <EntryShell>
      <main className="entry-page study-list-final">
        <EntryHeading
          eyebrow="EXPERIMENTS"
          title="Studies"
          description="Manage experimental studies and their Runs."
        >
          <Link className="entry-button primary" href="/studies/new">
            + {t('Create Study')}
          </Link>
        </EntryHeading>
        <section className="entry-list-toolbar" aria-label={t('Study filters')}>
          <label className="entry-search">
            <EntryIcon name="6a861" />
            <input
              aria-label={t('Search studies')}
              placeholder={t('Search studies…')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            aria-label={t('Domain')}
            value={area}
            onChange={(event) => setArea(event.target.value)}
          >
            <option value="">{t('All domains')}</option>
            {[
              ...new Set(
                studies.flatMap((study) => (study.area ? [study.area] : [])),
              ),
            ]
              .sort()
              .map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
          </select>
          <select
            aria-label={t('Status')}
            disabled
            title={t('Study status is not provided by the current repository.')}
          >
            <option value="">{t('All statuses')}</option>
          </select>
          <select
            aria-label={t('Owner')}
            disabled
            title={t(
              'Study ownership is not provided by the current repository.',
            )}
          >
            <option value="">{t('All owners')}</option>
          </select>
          <span className="entry-list-count">
            {t('{0} studies', [visible.length])}
          </span>
        </section>
        <div className="entry-study-table-wrap">
          <table className="entry-study-table">
            <colgroup>
              <col />
              <col className="study-domain-col" />
              <col className="study-run-col" />
              <col className="study-status-col" />
              <col className="study-activity-col" />
              <col className="study-owner-col" />
              <col className="study-action-col" />
            </colgroup>
            <thead>
              <tr>
                {[
                  'Study',
                  'Domain',
                  'Latest Run',
                  'Status',
                  'Last Activity',
                  'Owner',
                  'Action',
                ].map((label) => (
                  <th key={label}>{t(label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((study) => (
                <tr key={study.id}>
                  <td>
                    <Link
                      className="entry-study-name"
                      href={`/series/${study.slug}`}
                    >
                      {study.name}
                    </Link>
                    <small className="entry-study-id">{study.id}</small>
                  </td>
                  <td>{study.area ?? '—'}</td>
                  <td>
                    {study.latest ? (
                      <Link
                        className="entry-latest-run"
                        href={study.latest.href}
                      >
                        <span>
                          {t('Run')} #{study.latest.number}
                        </span>
                        <span
                          className={`entry-stage ${study.latest.stage.toLowerCase()}`}
                        >
                          {t(
                            {
                              PLAN: 'Plan',
                              ACTUAL: 'Actual',
                              MEASUREMENT: 'Measurement',
                              EVALUATION: 'Evaluation',
                            }[study.latest.stage],
                          )}
                        </span>
                      </Link>
                    ) : (
                      t(study.contextUnavailable ? 'Unavailable' : 'No Runs')
                    )}
                  </td>
                  <td
                    title={t(
                      'Study status is not provided by the current repository.',
                    )}
                  >
                    —
                  </td>
                  <td className="entry-activity">
                    {study.lastActivity
                      ? new Intl.DateTimeFormat(
                          locale === 'ko' ? 'ko-KR' : 'en-GB',
                          {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          },
                        ).format(new Date(study.lastActivity))
                      : '—'}
                    {study.lastActivity && <small>UTC</small>}
                  </td>
                  <td
                    title={t(
                      'Study ownership is not provided by the current repository.',
                    )}
                  >
                    —
                  </td>
                  <td>
                    <Link
                      className="entry-open-study"
                      href={`/series/${study.slug}`}
                      aria-label={t('Open Study {0}', [study.name])}
                    >
                      <EntryIcon name="5f8e6" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={7} className="entry-empty">
                    {t(
                      studies.length
                        ? 'No studies match these filters.'
                        : 'No accessible studies.',
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </EntryShell>
  );
}
