'use client';
/* oxlint-disable next/no-img-element */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { catalog, sampleView, usages } from '../samples/model';
import { CreateSample } from '../sample-create/create-sample';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import { useLocale } from '@/src/shared/i18n/locale';
export default function SampleExplorer() {
  const { t } = useLocale();
  const [q, setQ] = useState(''),
    [supplier, setSupplier] = useState('all'),
    [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      catalog.samples.filter((s) => {
        const sup =
          catalog.suppliers.find((x) => x.id === s.supplierId)?.name ?? '';
        return (
          `${s.sampleCode} ${s.name} ${sup} ${s.status}`
            .toLowerCase()
            .includes(q.toLowerCase()) &&
          (supplier === 'all' || s.supplierId === supplier) &&
          (status === 'all' || s.status === status)
        );
      }),
    [q, supplier, status],
  );
  const detail = selected ? sampleView(selected) : null;
  const usage = detail
    ? usages().filter((u) =>
        detail.revisions.some((r) => r.id === u.revisionId),
      )
    : [];
  return (
    <Workspace
      page="Samples"
      catalogShell
      contextLabel="MATERIAL / SAMPLE MASTER"
    >
      <div className="catalog-page">
        <header className="catalog-heading">
          <div>
            <h1>{t('Samples')}</h1>
            <p>
              {t(
                'Find materials and trace the exact revision used in an experiment.',
              )}
            </p>
          </div>
          <CreateSample />
        </header>
        <div className="catalog-filters">
          <label className="catalog-search">
            <img src="/figma/catalog/search.svg" alt="" />
            <input
              aria-label={t('Search samples')}
              placeholder={t('Search code, name, supplier, or status')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            aria-label={t('Supplier filter')}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="all">{t('All suppliers')}</option>
            {catalog.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label={t('Status filter')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">{t('All statuses')}</option>
            {['Active', 'Draft', 'Retired'].map((s) => (
              <option key={s} value={s}>
                {t(s === 'Active' ? 'Reference active' : s)}
              </option>
            ))}
          </select>
          <span>
            {rows.length} {t('Samples')}
          </span>
        </div>
        <div className={`catalog-split ${detail ? 'has-inspector' : ''}`}>
          <div className="catalog-table-scroll">
            <table className="catalog-table">
              <thead>
                <tr>
                  {[
                    'Sample Code',
                    'Name',
                    'Latest Revision',
                    'Supplier',
                    'Status',
                    'Last used',
                    'Used in experiments',
                  ].map((x) => (
                    <th key={x}>{t(x)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const v = sampleView(s.sampleCode)!;
                  const u = usages().filter((x) =>
                    v.revisions.some((r) => r.id === x.revisionId),
                  );
                  return (
                    <tr
                      key={s.id}
                      className={selected === s.sampleCode ? 'selected' : ''}
                      onClick={() => setSelected(s.sampleCode)}
                    >
                      <td>
                        <button
                          className="catalog-text-button"
                          onClick={() => setSelected(s.sampleCode)}
                        >
                          {s.sampleCode}
                        </button>
                      </td>
                      <td>{s.name}</td>
                      <td>
                        {t('Rev.')}
                        {v.revisions[0]?.revision ?? '—'}
                      </td>
                      <td>{v.supplier?.name ?? '—'}</td>
                      <td>
                        <Badge
                          tone={s.status === 'Active' ? 'green' : 'neutral'}
                        >
                          {t(
                            s.status === 'Active'
                              ? 'Reference active'
                              : s.status,
                          )}
                        </Badge>
                      </td>
                      <td>{u.at(-1)?.date ?? '—'}</td>
                      <td>{u.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && (
              <p className="catalog-empty">
                {t('No samples match these filters.')}
              </p>
            )}
          </div>
          {detail && (
            <aside
              className="catalog-inspector"
              aria-label={t('Sample detail')}
            >
              <header>
                <span>{t('Sample detail')}</span>
                <button
                  aria-label={t('Close')}
                  onClick={() => setSelected(null)}
                >
                  <img src="/figma/catalog/close.svg" alt="" />
                </button>
              </header>
              <div className="catalog-inspector-title">
                <h2>{detail.sample.name}</h2>
                <p>{detail.sample.sampleCode}</p>
              </div>
              <section>
                <h3>{t('Core Information')}</h3>
                <dl>
                  {[
                    ['Supplier', detail.supplier?.name ?? '—'],
                    [
                      'Status',
                      t(
                        detail.sample.status === 'Active'
                          ? 'Reference active'
                          : detail.sample.status,
                      ),
                    ],
                    ['Latest Revision', `Rev.${detail.revisions[0]?.revision}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{t(k)}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section>
                <h3>{t('Recent Usage')}</h3>
                {usage.slice(-3).map((u) => (
                  <p key={`${u.revisionId}-${u.run}`}>
                    <Link href={`/series/dts-improvement/runs/${u.run}`}>
                      {u.series} · {t('Run')} {u.run}
                    </Link>
                  </p>
                ))}
                {!usage.length && <p>{t('No recorded usage')}</p>}
              </section>
              <section>
                <h3>{t('Revision history')}</h3>
                {detail.revisions.map((r) => (
                  <p key={r.id}>
                    <Link
                      href={`/samples/${detail.sample.sampleCode}/revisions/${r.revision}`}
                    >
                      {t('Rev.')}
                      {r.revision}
                    </Link>
                    <span>{r.effectiveAt.slice(0, 10)}</span>
                  </p>
                ))}
              </section>
              <div className="catalog-actions">
                <Link
                  className="catalog-primary"
                  href={`/samples/${detail.sample.sampleCode}`}
                >
                  {t('Open Details')}
                </Link>
                <Link
                  href={`/samples/${detail.sample.sampleCode}#sample-usage`}
                >
                  {t('View Experiments')}
                </Link>
              </div>
            </aside>
          )}
        </div>
      </div>
    </Workspace>
  );
}
