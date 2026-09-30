'use client';
import { LocaleSwitch, useLocale } from '@/src/shared/i18n/locale';
/* oxlint-disable next/no-img-element -- Tiny local Figma SVGs retain their intrinsic geometry; no raster image optimization is needed. */
import Link from 'next/link';
import {
  ArrowUpRight,
  ChevronRight,
  FlaskConical,
  Grid2X2,
} from 'lucide-react';
import { SeriesExplorer } from '@/src/features/experiment-series/series-explorer';
export const seriesPath = '/series/dts-improvement';
export const runPath = (n: number) => `${seriesPath}/runs/${n}`;
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Workspace({
  children,
  page = 'Home',
  run,
  seriesSlug = 'dts-improvement',
  seriesTitle = 'DTS Improvement',
  contextLabel = 'SEMICONDUCTOR R&D',
  planShell = false,
  homeShell = false,
  catalogShell = false,
  lifecyclePhase = 'Plan',
  returnHref,
  entryShell = false,
  entryBreadcrumbs,
  studyShell = false,
  studyView,
  standardEntry = false,
}: {
  children: React.ReactNode;
  page?: string;
  run?: number;
  seriesSlug?: string;
  seriesTitle?: string;
  contextLabel?: string;
  planShell?: boolean;
  homeShell?: boolean;
  catalogShell?: boolean;
  lifecyclePhase?: string;
  returnHref?: string;
  entryShell?: boolean;
  entryBreadcrumbs?: React.ReactNode;
  studyShell?: boolean;
  studyView?: 'overview' | 'setup' | 'runs';
  standardEntry?: boolean;
}) {
  const { t } = useLocale();
  const compactShell =
    planShell || entryShell || studyShell || homeShell || catalogShell;
  const currentSeriesPath = `/series/${seriesSlug}`;
  return (
    <div
      className={`workspace ${compactShell ? 'workspace-plan-final' : ''} ${homeShell ? 'workspace-home-final' : ''} ${catalogShell ? 'workspace-catalog-final' : ''} ${entryShell || studyShell ? 'workspace-entry-final' : ''} ${studyShell ? 'workspace-study-final' : ''} ${standardEntry || studyShell ? 'workspace-entry-standard' : ''}`}
    >
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            {compactShell ? 'D' : <FlaskConical size={19} />}
          </span>
          DXT LIMS
          {homeShell || catalogShell ? (
            <img
              className="home-brand-divider"
              src="/figma/home/80d0c.svg"
              alt=""
            />
          ) : (
            <span className="brand-divider" />
          )}{' '}
          <span className="brand-sub">{t('R&D workspace')}</span>
        </Link>
        <div className="top-right">
          <LocaleSwitch />
          {compactShell ? (
            <span className="plan-environment">
              <img
                src={
                  homeShell || catalogShell
                    ? '/figma/home/16529.svg'
                    : studyShell || standardEntry
                      ? '/figma/study/16529.svg'
                      : entryShell
                        ? '/figma/entry/16529.svg'
                        : '/figma/run-plan/environment.svg'
                }
                alt=""
              />
              {t('Mock environment')}
            </span>
          ) : (
            <>
              <span className="demo-dot" /> {t('Mock environment')}
            </>
          )}
          <span className="workspace-user-name">오나은</span>
          <span className="avatar" aria-label="오나은">
            NO
          </span>
          {compactShell && !homeShell && !catalogShell && (
            <details className="plan-app-navigation">
              <summary aria-label={t('Application navigation')}>
                <img
                  src={
                    lifecyclePhase === 'Evaluation' && planShell
                      ? '/figma/lifecycle/5b57e.svg'
                      : page === 'Analysis' && planShell
                        ? '/figma/lifecycle/bf8ed.svg'
                        : studyShell || standardEntry
                          ? '/figma/study/b7c37.svg'
                          : entryShell
                            ? '/figma/entry/76166.svg'
                            : '/figma/run-plan/user-menu.svg'
                  }
                  alt=""
                />
              </summary>
              <nav>
                <Link
                  href="/samples"
                  aria-current={page === 'Samples' ? 'page' : undefined}
                >
                  {t('Samples')}
                </Link>
                <Link
                  href="/reference"
                  aria-current={page === 'Reference' ? 'page' : undefined}
                >
                  {t('Reference Studio')}
                </Link>
              </nav>
            </details>
          )}
        </div>
      </header>
      <div className="subbar">
        <nav aria-label={t('Breadcrumb')}>
          <Link href="/studies">
            {!compactShell && <Grid2X2 size={15} />} {t('Experiments')}
          </Link>
          {(!compactShell || homeShell || catalogShell) && (
            <>
              <Link
                href="/samples"
                aria-current={page === 'Samples' ? 'page' : undefined}
              >
                {t('Samples')}
              </Link>
              <Link
                href="/reference"
                aria-current={page === 'Reference' ? 'page' : undefined}
              >
                {t('Reference Studio')}
              </Link>
            </>
          )}
          {!entryShell &&
            page !== 'Home' &&
            page !== 'Samples' &&
            page !== 'Reference' &&
            page !== 'Registration' &&
            (page !== 'Analysis' || planShell) && (
              <>
                {studyShell ? <span>›</span> : <ChevronRight size={14} />}
                <Link href={currentSeriesPath}>{seriesTitle}</Link>
              </>
            )}
          {run && (
            <>
              <ChevronRight size={14} />
              <span>
                {t('Run #')}
                {run}
                {planShell && ` · ${t(lifecyclePhase)}`}
              </span>
            </>
          )}
          {entryShell && entryBreadcrumbs}
          {page === 'Analysis' && !planShell && (
            <>
              <ChevronRight size={14} />
              <span>{t('Analysis')}</span>
            </>
          )}
        </nav>
        {compactShell && !homeShell && !catalogShell ? (
          <Link
            className="plan-return-link"
            href={returnHref ?? currentSeriesPath}
          >
            {t('← Study & Runs')}
          </Link>
        ) : (
          <span>{t(contextLabel)}</span>
        )}
      </div>
      {page === 'Series' || page === 'Run' ? (
        <div className="series-workspace-layout">
          <SeriesExplorer
            activeRun={run}
            seriesSlug={seriesSlug}
            compact={studyShell}
            activeView={studyView}
          />
          <main>{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
      <footer>
        <span>
          DXT LIMS <span className="muted">{t('/ Experiment workspace')}</span>
        </span>
        <span>{t('Humans provide context. DXT LIMS resolves identity.')}</span>
      </footer>
    </div>
  );
}
export function SectionLabel({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: string;
}) {
  return (
    <div className="section-label">
      {children}
      {count && <span>{count}</span>}
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
