'use client';
/* oxlint-disable next/no-img-element -- Exact local Figma SVG. */
import { useLocale } from '@/src/shared/i18n/locale';

import Link from 'next/link';
import { useRepositorySeriesRuns } from './use-repository-series-runs';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
} from 'lucide-react';
import { contexts, previousContext } from '@/src/mock/experiments';
import { createExperimentDelta } from '@/src/domain/experiment/delta';
import {
  createSeriesNavigationScale,
  type RunNavigationProjection,
} from '@/src/mock/series-navigation';
import { seriesWorkspaceScenarios } from '@/src/mock/series-workspaces';
const runPath = (number: number) => `/series/dts-improvement/runs/${number}`;

const completed = contexts.map((context) => {
  const delta = createExperimentDelta(context, previousContext(context));
  const change = delta.changed[0];
  const summary = delta.isBaseline
    ? 'Baseline'
    : !change
      ? 'No configuration change'
      : change.change === 'ADDED'
        ? `+ ${change.label}`
        : `${change.label} ${change.previous ?? ''} → ${change.current ?? 'Removed'}`;
  return {
    number: context.run.runNumber,
    title: context.run.title,
    summary,
    available: true,
  };
});
// Navigation-only scale fixture; these entries are not ExperimentRun records.
export const seriesNavigationRuns = createSeriesNavigationScale(completed);

export function SeriesExplorer({
  activeRun,
  seriesSlug = 'dts-improvement',
  compact = false,
  activeView = 'overview',
}: {
  activeRun?: number;
  seriesSlug?: string;
  compact?: boolean;
  activeView?: 'overview' | 'setup' | 'runs';
}) {
  const { t } = useLocale();
  const scenario =
    seriesWorkspaceScenarios[
      seriesSlug as keyof typeof seriesWorkspaceScenarios
    ] ?? seriesWorkspaceScenarios['dts-improvement'];
  const path = `/series/${scenario.slug}`;
  const scenarioCompleted: RunNavigationProjection[] =
    scenario.slug === 'dts-improvement'
      ? completed
      : scenario.runs.map((run) => ({
          number: run.number,
          title: run.name,
          summary: run.delta[0],
          available: false,
        }));
  const [query, setQuery] = useState('');
  const repository = useRepositorySeriesRuns(scenario.slug, query);
  const navigationRuns = repository.connected
    ? (repository.rows ?? []).map((r) => ({
        number: r.number,
        title: r.name,
        summary: r.delta[0] ?? 'Plan',
        available: Boolean(r.workspaceHref),
        href: r.workspaceHref,
      }))
    : createSeriesNavigationScale(scenarioCompleted, scenario.runCount);
  const [collapsed, setCollapsed] = useState(false),
    [openRange, setOpenRange] = useState<string | null>(null);
  const recent = navigationRuns.slice(0, 6);
  const older = navigationRuns.slice(6),
    ranges: RunNavigationProjection[][] = [];
  for (let i = 0; i < older.length; i += 20)
    ranges.push(older.slice(i, i + 20));
  const matches = query.trim()
    ? navigationRuns
        .filter((run) =>
          `run ${run.number} ${run.title}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 12)
    : null;
  if (compact)
    return (
      <aside className="study-final-sidebar" aria-label={t('Study Navigator')}>
        <span className="study-final-section-label">{t('STUDY')}</span>
        <nav aria-label={t('Study navigation')}>
          {(['overview', 'setup', 'runs'] as const).map((view) => (
            <Link
              key={view}
              href={`${path}?view=${view}`}
              aria-current={activeView === view ? 'page' : undefined}
            >
              {t(
                {
                  overview: 'Overview',
                  setup: 'Experiment Setup',
                  runs: 'Runs',
                }[view],
              )}
            </Link>
          ))}
        </nav>
        <div className="study-final-run-count">
          <span>{t('RUNS')}</span>
          <b>
            {repository.connected
              ? (repository.total ?? repository.rows?.length ?? 0)
              : scenario.runCount}
          </b>
        </div>
        <label className="study-final-search">
          <img src="/figma/study/59cfe.svg" alt="" />
          <input
            aria-label={t('Search Runs')}
            placeholder={t('Search runs…')}
            value={query}
            onChange={(event) => {
              repository.resetSearch();
              setQuery(event.target.value);
            }}
          />
        </label>
        <span className="study-final-section-label">{t('RECENT')}</span>
        {repository.error && <p role="alert">{t(repository.error)}</p>}
        <RunItems runs={matches ?? recent} activeRun={activeRun} />
        {repository.hasMore && (
          <button
            className="study-final-load-more"
            onClick={repository.loadMore}
          >
            {t('Load more Runs')}
          </button>
        )}
        {repository.canCreateRun && (
          <div className="study-final-sidebar-action">
            <Link
              href={`/runs/new?series=${scenario.slug}`}
              className="explorer-create"
            >
              + {t('Create Next Run')}
            </Link>
          </div>
        )}
      </aside>
    );
  return (
    <aside
      className={`series-explorer ${collapsed ? 'collapsed' : ''}`}
      aria-label={t('Study Navigator')}
    >
      <header>
        <div>
          <span>{t('STUDY')}</span>
          <strong>
            {collapsed ? scenario.name.slice(0, 3) : scenario.name}
          </strong>
          {activeRun && (
            <small>
              {t('Run #')}
              {activeRun}
            </small>
          )}
        </div>
        <button
          aria-label={
            collapsed
              ? t('Expand Study Navigator')
              : t('Collapse Study Navigator')
          }
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </header>
      {!collapsed && (
        <>
          <nav className="series-level-nav" aria-label={t('Study navigation')}>
            <span>{t('STUDY')}</span>
            <a href={`${path}?view=overview`}>{t('Overview')}</a>
            <a href={`${path}?view=setup`}>{t('Experiment Setup')}</a>
            <a href={`${path}?view=runs`}>{t('Runs')}</a>
          </nav>
          <div className="explorer-run-head">
            <span>{t('RUNS')}</span>
            <b>
              {repository.connected
                ? (repository.total ?? 0)
                : scenario.runCount}
            </b>
          </div>
          <label className="run-search">
            <Search size={13} />
            <input
              value={query}
              onChange={(event) => {
                repository.resetSearch();
                setQuery(event.target.value);
              }}
              placeholder={t('Search number or title')}
            />
          </label>
          <div className="explorer-run-scroll">
            {repository.error && <p role="alert">{t(repository.error)}</p>}
            {matches ? (
              <RunItems runs={matches} activeRun={activeRun} />
            ) : (
              <>
                {activeRun && (
                  <>
                    <span className="run-group-label">{t('CURRENT')}</span>
                    <RunItems
                      runs={navigationRuns.filter(
                        (run) => run.number === activeRun,
                      )}
                      activeRun={activeRun}
                    />
                  </>
                )}
                <span className="run-group-label">{t('RECENT')}</span>
                <RunItems runs={recent} activeRun={activeRun} />
                {ranges.map((group) => {
                  const key = `${group.at(-1)!.number}-${group[0].number}`;
                  return (
                    <div className="run-range" key={key}>
                      <button
                        onClick={() =>
                          setOpenRange(openRange === key ? null : key)
                        }
                      >
                        <ChevronDown
                          className={openRange === key ? 'open' : ''}
                          size={13}
                        />{' '}
                        {t('Run #')}
                        {group.at(-1)!.number} – #{group[0].number}
                      </button>
                      {openRange === key && (
                        <RunItems runs={group} activeRun={activeRun} />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
          {repository.hasMore && (
            <button onClick={repository.loadMore}>{t('Load more Runs')}</button>
          )}
          {repository.canCreateRun && (
            <>
              <Link
                className="explorer-create"
                href={`/runs/new?series=${scenario.slug}&from=${navigationRuns[0]?.number ?? ''}`}
              >
                <Plus size={13} /> {t('Create Next Run')}
              </Link>
              <p className="explorer-note">
                {t('New Run in')} {scenario.name}
              </p>
            </>
          )}
        </>
      )}
    </aside>
  );
}
function RunItems({
  runs,
  activeRun,
}: {
  runs: RunNavigationProjection[];
  activeRun?: number;
}) {
  const { t } = useLocale();
  return (
    <div className="explorer-run-items">
      {runs.map((run) =>
        run.available ? (
          <Link
            key={run.number}
            href={
              'href' in run && typeof run.href === 'string'
                ? run.href
                : runPath(run.number)
            }
            aria-current={run.number === activeRun ? 'page' : undefined}
          >
            <b>
              {t('Run #')}
              {run.number}
            </b>
            <small>{run.summary}</small>
          </Link>
        ) : (
          <div key={run.number} className="projection-run">
            <b>
              {t('Run #')}
              {run.number}
            </b>
            <small>{run.summary}</small>
          </div>
        ),
      )}
    </div>
  );
}
