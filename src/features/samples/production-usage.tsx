'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/src/shared/i18n/locale';
import { Workspace } from '@/src/shared/ui/workspace';
import { DxtGridFrame } from '@/src/shared/ui/dxt-grid';
import { httpMaterialUsage } from '@/src/infrastructure/http/http-repositories';
import type { DiscoveryPage } from '@/src/application/discovery';
import type { MaterialAssignmentUsage } from '@/src/application/material-usage';

export function MaterialUsageTable({
  rows,
}: {
  rows: MaterialAssignmentUsage[];
}) {
  const { t } = useLocale();
  return (
    <DxtGridFrame label={t('Recorded material Plan assignments')}>
      <table className="dxt-grid material-usage-grid">
        <thead>
          <tr>
            {[
              'Study',
              'Run',
              'Operation',
              'Subject',
              'Material',
              'Planned value',
              'Role',
              'Reference detail',
            ].map((k) => (
              <th key={k}>{t(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.assignmentId}>
              <td>{row.study}</td>
              <td>
                <Link
                  href={`/series/${encodeURIComponent(row.studySlug)}/runs/${row.runNumber}/engineering-grid?view=plan`}
                >
                  {row.runNumber}
                </Link>
              </td>
              <td>{row.operation}</td>
              <td>{row.subject ?? t('Common material assignment')}</td>
              <td>{row.label}</td>
              <td>{row.value}</td>
              <td>
                {t(
                  row.intentRole === 'VARIED'
                    ? 'Intentionally Varied'
                    : 'Fixed',
                )}
              </td>
              <td aria-label={t('Reference detail')}>
                <details>
                  <summary>{t('Details')}</summary>
                  <code>{row.referenceId}</code>
                  <p>
                    {t(
                      'This exact material reference is not a verified Sample Revision link.',
                    )}
                  </p>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DxtGridFrame>
  );
}

/** Production must not substitute fixture identity or usage for unavailable Sample persistence. */
export default function ProductionSampleUsage({
  unavailableDetail = false,
}: {
  unavailableDetail?: boolean;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState({ text: '', offset: 0, attempt: 0 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{
    query: typeof query;
    page?: DiscoveryPage<MaterialAssignmentUsage>;
    error?: boolean;
  } | null>(null);
  const loading = result?.query !== query;
  const page = !loading ? result?.page : undefined;
  useEffect(() => {
    let active = true;
    void httpMaterialUsage({
      text: query.text,
      offset: query.offset,
      limit: 25,
    })
      .then((page) => {
        if (active) setResult({ query, page });
      })
      .catch(() => {
        if (active) setResult({ query, error: true });
      });
    return () => {
      active = false;
    };
  }, [query]);
  return (
    <Workspace
      page="Samples"
      catalogShell
      contextLabel="MATERIAL / SAMPLE MASTER"
    >
      <div className="catalog-page dxt-density sample-usage-page">
        <h1>{t('Samples')}</h1>
        <section className="sample-section" role="note">
          <p>
            {t(
              'Sample registration and revision history are not available yet. No demo Sample records are shown here.',
            )}
          </p>
          {unavailableDetail && (
            <p>
              {t(
                'This Sample detail cannot be verified. Review recorded material assignments below or return to Samples.',
              )}
            </p>
          )}
          <p>
            {t(
              'The table shows material assignments recorded in accessible Run Plans. Planned use is not evidence of actual consumption or a verified Sample Revision link.',
            )}
          </p>
          {unavailableDetail && <Link href="/samples">{t('Samples')}</Link>}
        </section>
        <section className="sample-section">
          <h2>{t('Recorded material Plan assignments')}</h2>
          <form
            className="dxt-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery({ text: search.trim(), offset: 0, attempt: 0 });
            }}
          >
            <label>
              {t('Search')}{' '}
              <input
                value={search}
                maxLength={200}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button className="entry-button" type="submit">
              {t('Search')}
            </button>
          </form>
          {loading ? (
            <output>{t('Loading…')}</output>
          ) : result?.error ? (
            <div role="alert">
              <p>
                {t(
                  'Could not load material assignments. Check your connection and access, then try again.',
                )}
              </p>
              <button
                className="entry-button"
                onClick={() =>
                  setQuery({ ...query, attempt: query.attempt + 1 })
                }
              >
                {t('Retry')}
              </button>
            </div>
          ) : page?.total === 0 ? (
            <p>
              {t(
                'No material Plan assignments are visible in your current access scope.',
              )}
            </p>
          ) : (
            page && (
              <>
                <MaterialUsageTable rows={page.items} />
                <nav className="dxt-toolbar" aria-label={t('Pagination')}>
                  <button
                    className="entry-button"
                    disabled={query.offset === 0}
                    onClick={() =>
                      setQuery({
                        ...query,
                        offset: Math.max(0, query.offset - 25),
                      })
                    }
                  >
                    {t('Previous')}
                  </button>
                  <span>{t('{0} assignments', [page.total])}</span>
                  <button
                    className="entry-button"
                    disabled={query.offset + 25 >= page.total}
                    onClick={() =>
                      setQuery({ ...query, offset: query.offset + 25 })
                    }
                  >
                    {t('Next')}
                  </button>
                </nav>
              </>
            )
          )}
        </section>
      </div>
    </Workspace>
  );
}
