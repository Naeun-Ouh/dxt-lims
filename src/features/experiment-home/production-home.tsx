'use client';
/* oxlint-disable next/no-img-element -- Intrinsic local Figma SVG separators. */
import type { Locale } from '@/src/shared/i18n/messages';
import { useLocale } from '@/src/shared/i18n/locale';
import Link from 'next/link';
import { ExperimentCalendar } from './experiment-calendar';
import { Workspace } from '@/src/shared/ui/workspace';
import type {
  DashboardProjection,
  RunSummary,
} from '@/src/application/discovery';
const label = {
  PLAN: 'Planning',
  ACTUAL: 'Execution',
  MEASUREMENT: 'Measurement',
  EVALUATION: 'Evaluation',
};
const date = (value: string, locale: Locale) =>
  new Date(value).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-GB', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
/** Presentation only: membership, counts and scope are resolved by the server. */
export function ProductionHome({
  dashboard,
  studies,
}: {
  dashboard: DashboardProjection;
  studies: { series_slug: string; display_name: string }[];
}) {
  const { t, locale } = useLocale();
  const current = dashboard.continueWorking,
    c = dashboard.counts;
  return (
    <Workspace homeShell contextLabel="R&D EXPERIMENTS">
      <div className="home-final">
        <header className="home-final-heading">
          <div>
            <p className="home-final-eyebrow">{t('DXT HOME')}</p>
            <h1>{t('My Experiments')}</h1>
            <p>
              {t(
                'Continue experiments you are responsible for or explicitly collaborate on.',
              )}
            </p>
          </div>
          <Link className="home-final-primary" href="/studies">
            + {t('Study & Runs')}
          </Link>
        </header>
        <section aria-labelledby="continue-working">
          <div className="home-final-section-label">
            <h2 id="continue-working">{t('Continue Working')}</h2>
          </div>
          {current ? (
            <div className="home-final-continue">
              <div className="home-final-identity">
                <span className="home-final-run-badge">{current.number}</span>
                <Link href={`/series/${current.studySlug}`}>
                  {current.studyName}
                </Link>
                <span>
                  {t('Run')} {current.number}
                </span>
              </div>
              <span className="home-final-last-activity">
                {t('Last activity · UTC')}: {date(current.updatedAt, locale)}
              </span>
              <div className="home-final-resume">
                <span
                  className={`home-final-phase phase-${current.stage.toLowerCase()}`}
                >
                  {t(label[current.stage])}
                </span>
                <Link href={current.href}>{t('Continue')} →</Link>
              </div>
            </div>
          ) : (
            <p className="home-final-empty home-final-continue">
              {t('No personal experiment work is available.')}
            </p>
          )}
        </section>
        <section aria-labelledby="home-metrics-title">
          <div className="home-final-section-label">
            <h2 id="home-metrics-title">{t('My Experiments')}</h2>
            <span>{t('{0} Runs · {1} Studies', [c.runs, c.studies])}</span>
          </div>
          <div className="home-final-metrics">
            <div>
              <span>{t('Active Runs')}</span>
              <strong>{c.activeRuns}</strong>
              <small>
                {t('Across')} {c.studies} {t('studies · no Decision yet')}
              </small>
            </div>
            <img
              width={258.4}
              height={1}
              className="home-final-metric-line first"
              src="/figma/home/c7328.svg"
              alt=""
            />
            <div>
              <span>{t('This Week')}</span>
              <strong>{c.thisWeek}</strong>
              <small>{t('Recorded activity · UTC')}</small>
            </div>
            <img
              width={258.4}
              height={1}
              className="home-final-metric-line second"
              src="/figma/home/153d5.svg"
              alt=""
            />
            <div>
              <span>{t('Need Review')}</span>
              <strong>{c.needReview}</strong>
              <small>{t('Measurement available · no Decision yet')}</small>
            </div>
          </div>
        </section>
        <section aria-labelledby="experiment-calendar">
          <div className="home-final-section-label">
            <h2 id="experiment-calendar">{t('Experiment Calendar')}</h2>
            <span>
              {dashboard.calendarTotal} {t('Runs · this month (UTC)')}
            </span>
          </div>
          <div className="home-final-card">
            <ExperimentCalendar rows={dashboard.calendar} />
          </div>
          {dashboard.calendarTotal > dashboard.calendar.length && (
            <p className="home-final-more">
              {dashboard.calendarTotal - dashboard.calendar.length}{' '}
              {t('more authorized Runs this month.')}
            </p>
          )}
        </section>
        <section aria-labelledby="recent-experiments">
          <div className="home-final-section-label">
            <h2 id="recent-experiments">{t('Recent Experiments')}</h2>
          </div>
          <RunRows rows={dashboard.recent} />
        </section>
        <section aria-labelledby="accessible-studies">
          <div className="home-final-section-label">
            <h2 id="accessible-studies">{t('Accessible Studies')}</h2>
            <span>
              {studies.length} {t('Studies')}
            </span>
          </div>
          {studies.length ? (
            <ul className="home-final-studies">
              {studies.map((s) => (
                <li key={s.series_slug}>
                  <Link href={`/series/${s.series_slug}`}>
                    {s.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="home-final-empty home-final-studies-empty">
              {t('No accessible Studies.')}{' '}
              <Link href="/studies">{t('Browse Study & Runs to begin.')}</Link>
            </p>
          )}
        </section>
      </div>
    </Workspace>
  );
}
function RunRows({ rows }: { rows: RunSummary[] }) {
  const { t, locale } = useLocale();
  return (
    <div className="home-final-card home-final-table-scroll">
      <table className="home-final-recent">
        <colgroup>
          <col className="study" />
          <col className="run" />
          <col className="stage" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>{t('Study')}</th>
            <th>{t('Run')}</th>
            <th>{t('Stage')}</th>
            <th>{t('Recorded activity · UTC')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/series/${r.studySlug}`}>{r.studyName}</Link>
                </td>
                <td>
                  <Link href={r.href}>{r.number}</Link>
                </td>
                <td>{t(label[r.stage])}</td>
                <td>{date(r.updatedAt, locale)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="home-final-empty" colSpan={4}>
                {t('No recent personal experiments.')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
