'use client';
import { useLocale } from '@/src/shared/i18n/locale';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  FlaskConical,
} from 'lucide-react';
import { Workspace } from '@/src/shared/ui/workspace';

type HomeExperiment = {
  series: string;
  run: number;
  stage: 'Planning' | 'Execution' | 'Measurement' | 'Evaluation';
  updated: string;
  href: string;
  seriesHref: string;
  tone: 'blue' | 'green' | 'amber' | 'neutral';
};

const recentExperiments: HomeExperiment[] = [
  {
    series: 'DTS Improvement',
    run: 18,
    stage: 'Evaluation',
    updated: 'Yesterday 17:42',
    href: '/series/dts-improvement/runs/18/engineering-grid?view=evaluation',
    seriesHref: '/series/dts-improvement',
    tone: 'amber',
  },
  {
    series: 'CMP Stability',
    run: 12,
    stage: 'Measurement',
    updated: 'Yesterday 14:18',
    href: '/series/cmp-stability/runs/12/engineering-grid?view=measurement',
    seriesHref: '/series/cmp-stability',
    tone: 'blue',
  },
  {
    series: 'DTS Improvement',
    run: 19,
    stage: 'Planning',
    updated: '10 Sep 11:05',
    href: '/series/dts-improvement/runs/19/engineering-grid?view=plan',
    seriesHref: '/series/dts-improvement',
    tone: 'green',
  },
  {
    series: 'CMP Stability',
    run: 13,
    stage: 'Planning',
    updated: '09 Sep 16:30',
    href: '/series/cmp-stability/runs/13/engineering-grid?view=plan',
    seriesHref: '/series/cmp-stability',
    tone: 'neutral',
  },
  {
    series: 'Adhesion Material Optimization',
    run: 3,
    stage: 'Evaluation',
    updated: '13 Sep 16:00',
    href: '/series/adhesion-material-optimization/runs/3/engineering-grid?view=evaluation',
    seriesHref: '/series/adhesion-material-optimization',
    tone: 'amber',
  },
];

const continueExperiment = recentExperiments[0];

export default function ExperimentHome() {
  const { t } = useLocale();
  return (
    <Workspace contextLabel="R&D EXPERIMENTS">
      <div className="dxt-home-heading">
        <div>
          <p className="eyebrow">{t("DXT HOME")}</p>
          <h1>{t("Good morning, Seunghyun.")}</h1>
          <p className="muted">{t("Continue your experiments and review what needs attention.")}</p>
        </div>
        <span className="date-label">{t("Saturday, 12 September 2026")}</span>
      </div>

      <section
        className="home-section home-continue-section"
        aria-labelledby="continue-working"
      >
        <header className="home-section-heading">
          <div>
            <span className="home-section-kicker">{t("WORKBENCH")}</span>
            <h2 id="continue-working">{t("Continue Working")}</h2>
          </div>
          <Clock3 size={18} aria-hidden="true" />
        </header>
        <div className="home-continue-row">
          <div className="home-continue-identity">
            <span className="home-run-mark">18</span>
            <div>
              <Link href="/series/dts-improvement" className="home-study-link">
                {continueExperiment.series}
              </Link>
              <p>{t("Run")}{" "}{continueExperiment.run}</p>
            </div>
          </div>
          <div className="home-resume-context">
            <span>{t("Last activity")}</span>
            <strong>{continueExperiment.updated}</strong>
          </div>
          <div
            className="home-stage-path"
            aria-label={t("Current lifecycle transition")}
          >
            <span>{t("Measurement")}</span>
            <ArrowRight size={15} aria-hidden="true" />
            <strong>{t("Evaluation")}</strong>
          </div>
          <Link
            href={continueExperiment.href}
            className="primary-button home-continue-action"
          >{t("Continue")}{" "}<ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="home-dashboard-grid">
        <section className="home-section" aria-labelledby="my-experiments">
          <header className="home-section-heading">
            <div>
              <span className="home-section-kicker">{t("OVERVIEW")}</span>
              <h2 id="my-experiments">{t("My Experiments")}</h2>
            </div>
            <FlaskConical size={18} aria-hidden="true" />
          </header>
          <div className="home-metrics">
            <div>
              <span>{t("Active Runs")}</span>
              <strong>5</strong>
              <small>{t("Across 3 studies")}</small>
            </div>
            <div>
              <span>{t("This Week")}</span>
              <strong>3</strong>
              <small>{t("Runs updated")}</small>
            </div>
            <div className="needs-review">
              <span>{t("Need Review")}</span>
              <strong>2</strong>
              <small>
                <CircleAlert size={12} />{" "}{t("Engineer action")}</small>
            </div>
          </div>
        </section>

        <section className="home-section" aria-labelledby="experiment-calendar">
          <header className="home-section-heading">
            <div>
              <span className="home-section-kicker">{t("SEPTEMBER 2026")}</span>
              <h2 id="experiment-calendar">{t("Experiment Calendar")}</h2>
            </div>
            <CalendarDays size={18} aria-hidden="true" />
          </header>
          <div
            className="home-calendar"
            aria-label={t("September experiment timeline")}
          >
            <div className="calendar-axis" aria-hidden="true">
              <span>7</span>
              <span>8</span>
              <span>9</span>
              <span>10</span>
              <span>11</span>
              <span>12</span>
              <span>13</span>
            </div>
            <div className="calendar-today" aria-hidden="true">
              <span>{t("Today")}</span>
            </div>
            <Link
              className="calendar-run run-18"
              href={continueExperiment.href}
            >
              <span>{t("Run 18")}</span>
              <small>{t("Measurement · Evaluation")}</small>
            </Link>
            <Link
              className="calendar-run run-19"
              href="/series/dts-improvement/runs/19/engineering-grid?view=plan"
            >
              <span>{t("Run 19")}</span>
              <small>{t("Planning")}</small>
            </Link>
          </div>
        </section>
      </div>

      <section
        className="home-section home-recent-section"
        aria-labelledby="recent-experiments"
      >
        <header className="home-section-heading">
          <div>
            <span className="home-section-kicker">{t("LATEST ACTIVITY")}</span>
            <h2 id="recent-experiments">{t("Recent Experiments")}</h2>
          </div>
          <Link href="/series/dts-improvement" className="home-view-all">{t("Open DTS Study")}{" "}<ArrowRight size={14} />
          </Link>
        </header>
        <div className="home-recent-table-wrap">
          <table className="home-recent-table">
            <thead>
              <tr>
                <th>{t("Study")}</th>
                <th>{t("Run")}</th>
                <th>{t("Stage")}</th>
                <th>{t("Updated")}</th>
                <th>
                  <span className="sr-only">{t("Open")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recentExperiments.map((experiment) => (
                <tr key={`${experiment.series}-${experiment.run}`}>
                  <td>
                    <Link href={experiment.seriesHref}>
                      {experiment.series}
                    </Link>
                  </td>
                  <td className="mono">
                    <Link href={experiment.href}>
                      {String(experiment.run).padStart(2, '0')}
                    </Link>
                  </td>
                  <td>
                    <span className={`home-stage ${experiment.tone}`}>
                      {experiment.stage}
                    </span>
                  </td>
                  <td>{experiment.updated}</td>
                  <td>
                    <Link
                      href={experiment.href}
                      aria-label={t("Open {0} Run {1}", [experiment.series, experiment.run])}
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Workspace>
  );
}
