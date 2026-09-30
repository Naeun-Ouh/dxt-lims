'use client';
import type { Locale } from '@/src/shared/i18n/messages';
import { useLocale } from '@/src/shared/i18n/locale';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { RunSummary } from '@/src/application/discovery';

const stamp = (value: string, locale: Locale) =>
  new Date(value).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Clip recorded activity to the displayed UTC month; never invent planned dates. */
export function calendarInterval(
  createdAt: string,
  updatedAt: string,
  month: Date,
) {
  const start = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1);
  const end = Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1);
  const from = Date.parse(createdAt),
    to = Date.parse(updatedAt);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    to < from ||
    to < start ||
    from >= end
  )
    return null;
  const left = Math.max(from, start);
  return {
    left: ((left - start) / (end - start)) * 100,
    width: ((Math.min(to, end) - left) / (end - start)) * 100,
  };
}

const daysInMonth = (month: Date) =>
  new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();

export function ExperimentCalendar({
  rows,
  month = new Date(),
}: {
  rows: RunSummary[];
  month?: Date;
}) {
  const { t, locale } = useLocale();
  const days = daysInMonth(month);
  const heading = month.toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-GB',
    { timeZone: 'UTC', month: 'long', year: 'numeric' },
  );
  return (
    <>
      <div className="home-gantt-caption">
        <strong>{heading}</strong>
        <span>{t('Recorded activity · UTC · Created → latest record')}</span>
      </div>
      <section
        className="home-gantt-scroll"
        aria-label={t('Experiment activity timeline')}
      >
        <table
          className="home-gantt"
          style={{ '--calendar-days': days } as CSSProperties}
        >
          <colgroup>
            <col className="home-gantt-study-column" />
            <col />
            <col className="home-gantt-date-column" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{t('Study / Run')}</th>
              <th scope="col" aria-label={t('{0} · day of month', [heading])}>
                <div className="home-gantt-days">
                  {Array.from({ length: days }, (_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
              </th>
              <th scope="col">{t('Recorded period · UTC')}</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={3} className="home-calendar-empty">
                  {t('No experiment activity this month.')}
                </td>
              </tr>
            )}
            {rows.map((run) => {
              const interval = calendarInterval(
                run.createdAt,
                run.updatedAt,
                month,
              );
              const range = `${stamp(run.createdAt, locale)} → ${stamp(run.updatedAt, locale)}`;
              return (
                <tr key={run.id}>
                  <th scope="row">
                    <Link
                      href={run.href}
                      title={t('{0} · Run {1}', [run.studyName, run.number])}
                    >
                      {run.studyName}
                      <span>
                        {t('Run')} {run.number}
                      </span>
                    </Link>
                  </th>
                  <td className="home-gantt-track-cell">
                    <div className="home-gantt-track">
                      {interval && (
                        <Link
                          className={`home-gantt-bar stage-${run.stage.toLowerCase()}`}
                          href={run.href}
                          style={{
                            left: `${interval.left}%`,
                            width: `${interval.width}%`,
                          }}
                          title={t('{0} · Run {1} · {2}', [
                            run.studyName,
                            run.number,
                            range,
                          ])}
                          aria-label={t('{0} Run {1}: {2}', [
                            run.studyName,
                            run.number,
                            range,
                          ])}
                        />
                      )}
                    </div>
                  </td>
                  <td className="home-gantt-period">
                    {interval ? range : t('No activity in this month')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
