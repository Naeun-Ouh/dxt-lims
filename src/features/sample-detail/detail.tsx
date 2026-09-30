'use client';
import { useState } from 'react';
import { useLocale } from '@/src/shared/i18n/locale';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import { sampleView, catalog, propertiesFor, usages } from '../samples/model';
import { StructureTree } from '../samples/structure-tree';
export default function SampleDetail({ code }: { code: string }) {
  const { t } = useLocale();
  const v = sampleView(code)!;
  const [revisionId, setRevisionId] = useState(v.revisions[0].id);
  const latest = v.revisions.find((r) => r.id === revisionId) ?? v.revisions[0],
    root = catalog.nodes.find(
      (n) => n.nodeType === 'SAMPLE_REVISION' && n.referenceId === latest.id,
    )!;
  const levelGroups = [
    'SAMPLE_REVISION',
    'INTERMEDIATE',
    'RAW_MATERIAL',
  ] as const;
  const usage = usages().filter((u) =>
    v.revisions.some((r) => r.id === u.revisionId),
  );
  const reachable = new Set<string>();
  const walk = (id: string) => {
    reachable.add(id);
    catalog.compositionEdges
      .filter((edge) => edge.parentNodeId === id)
      .forEach((edge) => walk(edge.childNodeId));
  };
  walk(root.id);
  return (
    <Workspace
      page="Samples"
      catalogShell
      contextLabel="MATERIAL / SAMPLE MASTER"
    >
      <div className="catalog-page sample-detail-final">
        <Link href="/samples" className="back-link">
          <ArrowLeft size={14} />
          {t('Sample Explorer')}
        </Link>
        <div className="sample-identity">
          <div>
            <span className="eyebrow">{t('SAMPLE')}</span>
            <h1>
              {v.sample.sampleCode}
              <span>{v.sample.name}</span>
            </h1>
          </div>
          <Badge tone="green">
            {t(
              v.sample.status === 'Active'
                ? 'Reference active'
                : v.sample.status,
            )}
          </Badge>
          <dl>
            <div>
              <dt>{t('Supplier')}</dt>
              <dd>{v.supplier?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('Latest Revision')}</dt>
              <dd>
                {t('Rev.')}
                {String(v.revisions[0].revision).padStart(2, '0')}
              </dd>
            </div>
          </dl>
        </div>
        <section className="sample-section">
          <h2>{t('Core Information')}</h2>
          <dl className="overview-grid">
            {[
              ['Sample Code', v.sample.sampleCode],
              ['Name', v.sample.name],
              ['Material Family', v.material?.name ?? '—'],
              ['Supplier', v.supplier?.name ?? '—'],
              ['Description', v.sample.description ?? '—'],
              ['Status', v.sample.status],
            ].map(([k, x]) => (
              <div key={k}>
                <dt>{t(k)}</dt>
                <dd>
                  {k === 'Status'
                    ? t(x === 'Active' ? 'Reference active' : String(x))
                    : x}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="sample-section">
          <h2>{t('Revision history')}</h2>
          <table className="catalog-table">
            <thead>
              <tr>
                {[
                  'Revision',
                  'Date',
                  'Registration source',
                  'Status',
                  'Details',
                ].map((x) => (
                  <th key={x}>{t(x)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.revisions.map((r) => (
                <tr
                  key={r.id}
                  className={latest.id === r.id ? 'selected' : ''}
                  onClick={() => setRevisionId(r.id)}
                >
                  <td>
                    <button
                      className="catalog-text-button"
                      onClick={() => setRevisionId(r.id)}
                    >
                      {t('Rev.')}
                      {r.revision}
                    </button>
                  </td>
                  <td>{r.effectiveAt.slice(0, 10)}</td>
                  <td>{t(r.registrationSource.replaceAll('_', ' '))}</td>
                  <td>
                    {t(r.status === 'Active' ? 'Reference active' : r.status)}
                  </td>
                  <td>
                    <Link href={`/samples/${code}/revisions/${r.revision}`}>
                      {t('Open Details')} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="catalog-inspector sample-revision-summary">
          <header>{t('Selected revision')}</header>
          <div className="catalog-inspector-title">
            <h2>
              {t('Rev.')}
              {latest.revision}
            </h2>
            <Badge tone="green">
              {t(
                latest.status === 'Active' ? 'Reference active' : latest.status,
              )}
            </Badge>
          </div>
          <section>
            <h3>{t('Revision Information')}</h3>
            <dl>
              {[
                ['Used in experiments', usages(latest.id).length],
                ['Created', latest.createdAt.slice(0, 10)],
                [
                  'Registration source',
                  t(latest.registrationSource.replaceAll('_', ' ')),
                ],
                ['Request number', latest.requestNumber ?? '—'],
                [
                  'Development item number',
                  latest.developmentItemNumber ?? '—',
                ],
              ].map(([k, x]) => (
                <div key={k}>
                  <dt>{t(String(k))}</dt>
                  <dd>
                    {k === 'Status'
                      ? t(x === 'Active' ? 'Reference active' : String(x))
                      : x}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <div className="catalog-actions">
            <Link href={`/samples/${code}/revisions/${latest.revision}`}>
              {t('Open Details')} →
            </Link>
          </div>
        </aside>
        <div className="sample-two-col">
          <section className="sample-section">
            <h2>{t('Material structure')}</h2>
            <StructureTree nodeId={root.id} compact />
          </section>
          <section className="sample-section">
            <h2>{t('Key Attributes')}</h2>
            {levelGroups.map((type) => {
              const nodes = catalog.nodes.filter(
                (n) => n.nodeType === type && reachable.has(n.id),
              );
              const props = nodes.flatMap((n) =>
                propertiesFor(n.id).map((p) => ({ ...p, node: n.label })),
              );
              return props.length ? (
                <div className="property-group" key={type}>
                  <h3>
                    {type === 'SAMPLE_REVISION'
                      ? 'Sample'
                      : type === 'INTERMEDIATE'
                        ? 'Intermediate'
                        : 'Raw Material'}{' '}
                    {t('Properties')}
                  </h3>
                  {props.map((p) => (
                    <p key={p.id}>
                      <span>
                        {type === 'SAMPLE_REVISION'
                          ? p.name
                          : `${p.node} / ${p.name}`}
                      </span>
                      <strong>
                        {String(p.value)} {p.unit}
                      </strong>
                    </p>
                  ))}
                </div>
              ) : null;
            })}
          </section>
        </div>
        <section className="sample-section" id="sample-usage">
          <h2>{t('Used in experiments')}</h2>
          <UsageTable rows={usage} />
        </section>
      </div>
    </Workspace>
  );
}
export function UsageTable({ rows }: { rows: ReturnType<typeof usages> }) {
  const { t } = useLocale();
  return (
    <div className="usage-table">
      <div>
        <b>{t('Study')}</b>
        <b>{t('Run')}</b>
        <b>{t('Role')}</b>
        <b>{t('Project Context')}</b>
        <b>{t('Used At')}</b>
        <b>{t('Decision')}</b>
      </div>
      {rows.map((u, i) => (
        <div key={`${u.revisionId}-${i}`}>
          <span>{u.series}</span>
          <Link href={`/series/dts-improvement/runs/${u.run}`}>
            {t('Run #')}
            {u.run}
          </Link>
          <span>{u.role}</span>
          <span>{u.project}</span>
          <span>{u.date}</span>
          <span>{u.decision}</span>
        </div>
      ))}
    </div>
  );
}
