'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  SampleDetail,
  SampleSummary,
} from '@/src/application/sample-lifecycle';
import {
  sampleRequest,
  SampleRequestError,
} from '@/src/infrastructure/http/sample-client';
import { useLocale } from '@/src/shared/i18n/locale';
import {
  sampleText,
  type SampleMessage,
} from '@/src/shared/i18n/sample-messages';
import { Workspace } from '@/src/shared/ui/workspace';
import { SampleRevisionForm } from './revision-form';
export default function ProductionSamples({
  id,
  revision,
}: {
  id?: string;
  revision?: number;
}) {
  const router = useRouter();
  const { locale, t: global } = useLocale(),
    t = (k: SampleMessage) => sampleText(locale, k);
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [version, setVersion] = useState(0),
    [form, setForm] = useState(false),
    [saved, setSaved] = useState(false);
  const [result, setResult] = useState<{
      rows: SampleSummary[];
      total: number;
      detail?: SampleDetail;
      orgs: { id: string }[];
    } | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setResult(null);
    setError(null);
    void Promise.all([
      sampleRequest<{ id: string }[]>({ operation: 'options' }),
      id
        ? sampleRequest<SampleDetail>({ operation: 'detail', id, revision })
        : sampleRequest<{ rows: SampleSummary[]; total: number }>({
            operation: 'list',
            search,
            offset,
            limit: 25,
          }),
    ])
      .then(([orgs, data]) => {
        if (active)
          setResult(
            'sample' in data
              ? { rows: [], total: 0, detail: data, orgs }
              : { ...data, orgs },
          );
      })
      .catch((e) => {
        if (active)
          setError(e instanceof SampleRequestError ? e.code : 'PERSISTENCE');
      });
    return () => {
      active = false;
    };
  }, [id, revision, search, offset, version]);
  const detail = result?.detail;
  return (
    <Workspace
      page="Samples"
      catalogShell
      contextLabel="MATERIAL / SAMPLE MASTER"
    >
      <main className="catalog-page dxt-density">
        <div className="dxt-toolbar">
          <div>
            <Link href="/samples">{t('samples')}</Link>
            <h1>
              {detail
                ? `${detail.sample.sampleCode} · ${detail.sample.name}`
                : t('samples')}
            </h1>
          </div>
          {result && !form && (
            <button
              type="button"
              className="entry-button primary"
              style={{ marginLeft: 'auto' }}
              disabled={detail ? !detail.canRevise : !result.orgs.length}
              onClick={() => setForm(true)}
            >
              {t(detail ? 'revise' : 'create')}
            </button>
          )}
        </div>
        <p>{t('planOnly')}</p>
        {saved && <p role="status">{t('saved')}</p>}
        {error && (
          <p role="alert">
            {t(
              error === 'NOT_FOUND'
                ? 'missing'
                : error === 'FORBIDDEN'
                  ? 'forbidden'
                  : 'error',
            )}{' '}
            <button type="button" onClick={() => setVersion((v) => v + 1)}>
              {global('Retry')}
            </button>
          </p>
        )}
        {!result && !error && <p>{t('loading')}</p>}
        {form && result && (
          <SampleRevisionForm
            orgs={result.orgs}
            detail={detail}
            onCancel={() => setForm(false)}
            onSaved={(d) => {
              setForm(false);
              setSaved(true);
              router.push(
                `/samples/${encodeURIComponent(d.sample.id)}/revisions/${d.revision.revision}`,
              );
            }}
          />
        )}
        {!form && result && !detail && (
          <>
            <div className="dxt-toolbar">
              <label>
                {t('search')}
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOffset(0);
                  }}
                />
              </label>
              <span>{result.total}</span>
            </div>
            {!result.orgs.length && <p>{t('noRegister')}</p>}
            <div className="dxt-grid-scroll">
              <table className="dxt-grid">
                <thead>
                  <tr>
                    {(['code', 'name', 'org', 'latest'] as const).map((k) => (
                      <th key={k}>{t(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/samples/${encodeURIComponent(r.id)}`}>
                          {r.sampleCode}
                        </Link>
                      </td>
                      <td>{r.name}</td>
                      <td>{r.owningOrgId}</td>
                      <td>{r.latestRevision}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!result.rows.length && <p>{t('empty')}</p>}
            <div className="dxt-toolbar">
              <button
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 25))}
              >
                {t('previous')}
              </button>
              <button
                disabled={offset + 25 >= result.total}
                onClick={() => setOffset(offset + 25)}
              >
                {t('next')}
              </button>
            </div>
          </>
        )}
        {!form && detail && (
          <>
            <p>
              {t('revision')} {detail.revision.revision} · {t('latest')}{' '}
              {detail.latestRevision}
            </p>
            {!detail.canRevise && <p>{t('readOnly')}</p>}
            <section className="sample-section">
              <h2>{t('snapshot')}</h2>
              <p>
                {t('effective')}: {detail.revision.effectiveAt}
              </p>
              <p>
                {t('source')}: {t(detail.revision.registrationSource)}
              </p>
              <p>
                {t('request')}: {detail.revision.requestNumber ?? '—'}
              </p>
              <h3>{t('nodes')}</h3>
              <table className="dxt-grid">
                <thead>
                  <tr>
                    <th>{t('label')}</th>
                    <th>{t('type')}</th>
                    <th>{t('reference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.composition.nodes.map((n) => (
                    <tr key={n.id}>
                      <td>{n.label}</td>
                      <td>{t(n.nodeType)}</td>
                      <td>
                        <details>
                          <summary>{global('Details')}</summary>
                          <code>{n.referenceId}</code>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>{t('edges')}</h3>
              <table className="dxt-grid">
                <tbody>
                  {detail.composition.edges.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {
                          detail.composition.nodes.find(
                            (n) => n.id === e.parentNodeId,
                          )?.label
                        }
                      </td>
                      <td>
                        →{' '}
                        {
                          detail.composition.nodes.find(
                            (n) => n.id === e.childNodeId,
                          )?.label
                        }
                      </td>
                      <td>
                        {e.ratioValue ?? '—'} {e.ratioUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>{t('properties')}</h3>
              <table className="dxt-grid">
                <thead>
                  <tr>
                    <th>{t('definition')}</th>
                    <th>{t('value')}</th>
                    <th>{t('unit')}</th>
                    <th>{t('author')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.properties.map((p) => (
                    <tr key={p.id}>
                      <td>{p.propertyDefinitionId}</td>
                      <td>{String(p.value)}</td>
                      <td>{p.unit ?? '—'}</td>
                      <td>{t(p.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="sample-section">
              <h2>{t('history')}</h2>
              {detail.history.map((r) => (
                <p key={r.id}>
                  <Link
                    href={`/samples/${encodeURIComponent(detail.sample.id)}/revisions/${r.revision}`}
                  >
                    {t('revision')} {r.revision}
                  </Link>
                </p>
              ))}
            </section>
            <section className="sample-section">
              <h2>{t('usage')}</h2>
              <table className="dxt-grid">
                <thead>
                  <tr>
                    <th>{global('Study')}</th>
                    <th>{global('Run')}</th>
                    <th>{t('revision')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.usage.map((u, i) => (
                    <tr key={`${u.assignment}-${i}`}>
                      <td>{u.study}</td>
                      <td>
                        <Link
                          href={`/series/${encodeURIComponent(u.slug)}/runs/${u.run}/engineering-grid?view=plan`}
                        >
                          {u.run}
                        </Link>
                      </td>
                      <td>{u.revision}</td>
                      <td>
                        {t(u.state === 'CURRENT' ? 'CURRENT' : 'HISTORICAL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </Workspace>
  );
}
