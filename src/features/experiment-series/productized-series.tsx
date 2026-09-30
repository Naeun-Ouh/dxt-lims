'use client';
/* oxlint-disable next/no-img-element -- Exact local Figma row action. */
import { useLocale } from '@/src/shared/i18n/locale';
import RepositorySeriesRuns from './repository-series-runs';
import Link from 'next/link';
import {
  seriesWorkspaceScenarios,
  type SeriesWorkspaceProjection,
} from '@/src/mock/series-workspaces';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import StudySetupWorkspace from './study-setup-workspace';
import type { SeriesSlug } from './run-entry-model';

export type StudyView = 'overview' | 'setup' | 'runs';

const stageLabel = {
  PLAN: 'Plan',
  ACTUAL: 'Actual',
  MEASUREMENT: 'Measurement',
  EVALUATION: 'Evaluation',
} as const;
const primaryRunSurfaceClass = 'study-runs';

export default function ProductizedSeries({
  seriesSlug,
  productionSummary,
  canCreateRun = true,
  initialView = 'overview',
  initialPickerOpen = false,
  initialPickerOperationId,
  initialInspectorOpen = false,
  initialItemRevisionId,
}: {
  seriesSlug: SeriesSlug;
  productionSummary?: { runCount: number; updatedAt: string | null };
  canCreateRun?: boolean;
  initialView?: StudyView;
  initialPickerOpen?: boolean;
  initialPickerOperationId?: string;
  initialInspectorOpen?: boolean;
  initialItemRevisionId?: string;
}) {
  const { t } = useLocale();
  const series = seriesWorkspaceScenarios[seriesSlug];
  const targetSummary = series.targets
    .map((target) => `${target.parameter} ${target.rule} ${target.unit}`.trim())
    .join(' · ');
  return (
    <Workspace
      studyShell
      studyView={initialView}
      returnHref="/studies"
      page="Series"
      seriesSlug={series.slug}
      seriesTitle={series.name}
      contextLabel={series.workspaceContextLabel}
    >
      <div className="study-entry-page" id="overview">
        <header className="study-entry-head">
          <div>
            <p className="eyebrow">
              {t('STUDY ·')} {series.id}
            </p>
            <div className="study-title-line">
              <h1>{series.name}</h1>
              <Badge tone="green">{t(series.status)}</Badge>
            </div>
            <p>{series.intent.purpose}</p>
          </div>
          <div className="study-entry-actions">
            <Link
              href={`/analysis?study=${series.slug}`}
              className="secondary-button"
            >
              {t('Analyze Runs')}
            </Link>
            {canCreateRun && (
              <Link
                href={`/runs/new?series=${series.slug}`}
                className="primary-button"
              >
                + {t('New Run')}
              </Link>
            )}
          </div>
        </header>

        <nav className="study-view-tabs" aria-label={t('Study views')}>
          <a
            className={initialView === 'overview' ? 'active' : ''}
            href={`/series/${series.slug}?view=overview`}
          >
            {t('Overview')}
          </a>
          <a
            className={initialView === 'setup' ? 'active' : ''}
            href={`/series/${series.slug}?view=setup`}
          >
            {t('Experiment Setup')}
          </a>
          <a
            className={initialView === 'runs' ? 'active' : ''}
            href={`/series/${series.slug}?view=runs`}
          >
            {t('Runs')}
          </a>
        </nav>

        {initialView === 'overview' && (
          <div className="study-overview-columns">
            <section
              className="study-details-card"
              aria-label={t('Study scientific context')}
            >
              <h2>{t('Study details')}</h2>
              <dl>
                <div>
                  <dt>{t('Purpose')}</dt>
                  <dd>{series.intent.purpose}</dd>
                </div>
                <div>
                  <dt>{t('Target')}</dt>
                  <dd>{targetSummary || '—'}</dd>
                </div>
                <div>
                  <dt>{t('Area')}</dt>
                  <dd>{series.area}</dd>
                </div>
                <div>
                  <dt>{t('Owner')}</dt>
                  <dd>{series.owner}</dd>
                </div>
                <div>
                  <dt>{t('Status')}</dt>
                  <dd>
                    <Badge tone="green">{t(series.status)}</Badge>
                  </dd>
                </div>
                <div>
                  <dt>{t('Runs')}</dt>
                  <dd>{productionSummary?.runCount ?? series.runCount}</dd>
                </div>
              </dl>
            </section>
            <div className="study-overview-right">
              <section id="targets" className="study-secondary-panel">
                <header>
                  <span>{t('TARGETS')}</span>
                </header>
                {series.targets.map((target) => (
                  <div className="study-target-row" key={target.id}>
                    <b>{target.parameter}</b>
                    <span>
                      {target.rule} {target.unit}
                    </span>
                  </div>
                ))}
              </section>
              <section className="study-secondary-panel study-setup-entry">
                <header>
                  <span>{t('EXPERIMENT SETUP')}</span>
                </header>
                <p>
                  {t(
                    'Review the Operation → Item defaults inherited by a new Run.',
                  )}
                </p>
                <Link href={`/series/${series.slug}?view=setup`}>
                  {t('Open Experiment Setup')} →
                </Link>
              </section>
            </div>
          </div>
        )}

        {initialView === 'setup' && (
          <StudySetupWorkspace
            seriesSlug={seriesSlug}
            initialPickerOpen={initialPickerOpen}
            initialPickerOperationId={initialPickerOperationId}
            initialInspectorOpen={initialInspectorOpen}
            initialItemRevisionId={initialItemRevisionId}
          />
        )}

        {initialView === 'runs' && (
          <section
            className={primaryRunSurfaceClass}
            id="runs"
            aria-labelledby="study-runs-heading"
          >
            <header>
              <div>
                <span className="eyebrow">{t('RUNS · LATEST FIRST')}</span>
                <h2 className="sr-only" id="study-runs-heading">
                  {t('Experimental iterations')}
                </h2>
                <p>{t('Open a Run where its scientific work last stopped.')}</p>
              </div>
              {canCreateRun && (
                <Link
                  href={`/runs/new?series=${series.slug}`}
                  className="secondary-button"
                >
                  + {t('New Run')}
                </Link>
              )}
            </header>
            <RepositorySeriesRuns series={series} canCreateRun={canCreateRun} />
          </section>
        )}
      </div>
    </Workspace>
  );
}

export function SeriesRunList({
  series,
  canCreateRun = true,
}: {
  series: SeriesWorkspaceProjection;
  canCreateRun?: boolean;
}) {
  const { t, locale } = useLocale();
  if (series.runs.length === 0)
    return (
      <div className="study-runs-empty">
        <b>{t('No Runs yet.')}</b>
        <p>
          {t('Create the first Run from the Study Default or start Blank.')}
        </p>
        {canCreateRun && (
          <Link
            href={`/runs/new?series=${series.slug}`}
            className="primary-button"
          >
            + {t('New Run')}
          </Link>
        )}
      </div>
    );
  return (
    <div className="study-run-table-wrap">
      <table className="study-run-table">
        <thead>
          <tr>
            <th>{t('Run')}</th>
            <th>{t('Lifecycle Stage')}</th>
            <th>{t('Status')}</th>
            <th>{t('Updated')}</th>
            <th>{t('Experiment delta')}</th>
            <th>{t('Action')}</th>
          </tr>
        </thead>
        <tbody>
          {series.runs.map((run) => (
            <tr
              key={run.number}
              className={!run.workspaceHref ? 'unavailable' : ''}
            >
              <td>
                {run.workspaceHref ? (
                  <Link href={run.workspaceHref}>
                    {t('Run')} {run.number}
                  </Link>
                ) : (
                  <b>
                    {t('Run')} {run.number}
                  </b>
                )}
                <small className="sr-only">{run.name}</small>
              </td>
              <td>
                <span
                  className={`study-lifecycle ${run.lifecycle.toLowerCase()}`}
                >
                  {t(stageLabel[run.lifecycle])}
                </span>
              </td>
              <td>
                <span
                  className={`study-run-status ${run.runStatus.toLowerCase()}`}
                >
                  {run.runStatus === 'IN_PROGRESS'
                    ? t('In Progress')
                    : t('Completed')}
                </span>
              </td>
              <td>
                {Number.isNaN(Date.parse(run.updated))
                  ? run.updated
                  : new Intl.DateTimeFormat(
                      locale === 'ko' ? 'ko-KR' : 'en-GB',
                      {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      },
                    ).format(new Date(run.updated))}
                {!Number.isNaN(Date.parse(run.updated)) && ' UTC'}
              </td>
              <td>
                <b>{run.delta[0]}</b>
                <small>
                  {run.delta.slice(1).join(' · ') ||
                    t('{0} settings unchanged', [run.unchanged])}
                </small>
              </td>
              <td>
                {run.workspaceHref ? (
                  <Link
                    href={run.workspaceHref}
                    aria-label={t('Open {0} Run {1}', [
                      series.name,
                      run.number,
                    ])}
                  >
                    <img src="/figma/study/f8e0b.svg" alt="" />
                  </Link>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
