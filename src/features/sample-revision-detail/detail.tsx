'use client';
/* oxlint-disable next/no-img-element -- Local Figma SVG icons retain their intrinsic 10px geometry. */

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Workspace } from '@/src/shared/ui/workspace';
import { useLocale } from '@/src/shared/i18n/locale';
import type { RevisionChange } from '@/src/domain/material/revision-delta';
import { revisionView, catalog, propertiesFor, usages } from '../samples/model';

const revisionLabel = (revision: number) =>
  `Rev.${String(revision).padStart(2, '0')}`;
// Display decimal values without exposing binary floating-point noise.
const displayValue = (value: RevisionChange['current']) =>
  typeof value === 'number'
    ? String(Number(value.toPrecision(14)))
    : String(value ?? '—');

export default function SampleRevisionDetail({
  code,
  revision,
}: {
  code: string;
  revision: number;
}) {
  const { t } = useLocale();
  const v = revisionView(code, revision)!;
  const usage = usages(v.rev.id);
  const [showProvenance, setShowProvenance] = useState(true);
  const provenanceTrigger = useRef<HTMLButtonElement>(null);
  const previousHref = v.previous
    ? `/samples/${code}/revisions/${v.previous.revision}`
    : undefined;
  return (
    <Workspace page="Samples" catalogShell contextLabel="R&D EXPERIMENTS">
      <article className="sample-revision-final">
        <header className="sample-revision-header">
          <dl className="sample-revision-metadata">
            <div>
              <dt>{t('Sample')}</dt>
              <dd>
                <h1>{code}</h1>
              </dd>
            </div>
            <div>
              <dt>{t('Revision')}</dt>
              <dd>{revisionLabel(revision)}</dd>
            </div>
            <div>
              <dt>{t('Status')}</dt>
              <dd
                className={`revision-status status-${v.rev.status.toLowerCase()}`}
              >
                <span aria-hidden="true">●</span>{' '}
                {t(
                  v.rev.status === 'Active' ? 'Reference active' : v.rev.status,
                )}
              </dd>
            </div>
            <div>
              <dt>{t('Effective')}</dt>
              <dd>{v.rev.effectiveAt?.slice(0, 10) || '—'}</dd>
            </div>
            <div>
              <dt>{t('Supplier')}</dt>
              <dd>{v.supplier?.name ?? '—'}</dd>
            </div>
          </dl>
          <div className="sample-revision-actions">
            <Link href={`/samples/${code}`}>← {t('Back to Sample')}</Link>
            {!showProvenance && (
              <button
                ref={provenanceTrigger}
                type="button"
                aria-expanded={false}
                aria-controls="revision-provenance"
                onClick={() => setShowProvenance(true)}
              >
                {t('Provenance')}
              </button>
            )}
            <span title={t('Revision creation is not available yet.')}>
              <button
                type="button"
                disabled
                title={t('Revision creation is not available yet.')}
              >
                {t('Create New Revision')}
              </button>
            </span>
          </div>
        </header>
        <div
          className={`sample-revision-layout ${showProvenance ? 'has-provenance' : ''}`}
        >
          <div className="sample-revision-content">
            <section aria-labelledby="revision-structure-title">
              <header className="revision-section-heading">
                <h2 id="revision-structure-title">{t('Material structure')}</h2>
              </header>
              <div className="revision-structure">
                <RevisionStructure
                  nodeId={v.root.id}
                  description={v.sample.description ?? undefined}
                />
              </div>
            </section>
            <section aria-labelledby="revision-changes-title">
              <header className="revision-section-heading">
                <h2 id="revision-changes-title">{t('Revision Changes')}</h2>
                {v.previous && (
                  <span>
                    {revisionLabel(v.previous.revision)} →{' '}
                    {revisionLabel(revision)}
                  </span>
                )}
              </header>
              {!v.delta ? (
                <p className="revision-baseline">{t('Baseline revision')}</p>
              ) : (
                <div className="revision-table-scroll">
                  <table className="revision-table revision-delta-table">
                    <thead>
                      <tr>
                        <th>{t('Category')}</th>
                        <th>{t('Property')}</th>
                        <th>
                          {t('Previous')} ({revisionLabel(v.previous!.revision)}
                          )
                        </th>
                        <th>
                          {t('Current')} ({revisionLabel(revision)})
                        </th>
                        <th>{t('Delta')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DeltaRows
                        category="Property"
                        rows={v.delta.propertyChanges}
                        empty="No property changes"
                        rootLabel={v.root.label}
                      />
                      <DeltaRows
                        category="Composition"
                        rows={v.delta.compositionChanges}
                        empty="No composition changes"
                        rootLabel={v.root.label}
                      />
                      <DeltaRows
                        category="Structure"
                        rows={v.delta.structuralChanges}
                        empty="No structural changes"
                        rootLabel={v.root.label}
                      />
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section aria-labelledby="revision-usage-title">
              <header className="revision-section-heading">
                <h2 id="revision-usage-title">{t('Experiment usage')}</h2>
                <small>{t('{0} experiments', [usage.length])}</small>
              </header>
              <div className="revision-table-scroll">
                <table className="revision-table revision-usage-table">
                  <thead>
                    <tr>
                      {[
                        'Study',
                        'Run',
                        'Role',
                        'Project Context',
                        'Used At',
                        'Decision',
                      ].map((label) => (
                        <th key={label}>{t(label)}</th>
                      ))}
                      <th>
                        <span className="sr-only">{t('Open Details')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="revision-empty">
                          {t(
                            'This revision has not been used in any experiments yet.',
                          )}
                        </td>
                      </tr>
                    ) : (
                      usage.map((u, i) => (
                        <tr key={`${u.revisionId}-${i}`}>
                          <td>{u.series}</td>
                          <td>
                            <Link
                              href={`/series/dts-improvement/runs/${u.run}`}
                            >
                              {t('Run #')}
                              {u.run}
                            </Link>
                          </td>
                          <td>{u.role}</td>
                          <td>{u.project}</td>
                          <td className="revision-date">{u.date}</td>
                          <td>{u.decision}</td>
                          <td>
                            <Link
                              href={`/series/dts-improvement/runs/${u.run}`}
                              aria-label={`${u.series} · ${t('Run #')}${u.run}`}
                            >
                              <img
                                src="/figma/sample-revision/arrow-right.svg"
                                width={10}
                                height={10}
                                alt=""
                              />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          {showProvenance && (
            <aside
              className="revision-provenance"
              id="revision-provenance"
              aria-labelledby="revision-provenance-title"
            >
              <header>
                <h2 id="revision-provenance-title">{t('Provenance')}</h2>
                <button
                  type="button"
                  aria-label={t('Close {0}', [t('Provenance')])}
                  onClick={() => {
                    setShowProvenance(false);
                    requestAnimationFrame(() =>
                      provenanceTrigger.current?.focus(),
                    );
                  }}
                >
                  <img
                    src="/figma/sample-revision/close.svg"
                    width={10}
                    height={10}
                    alt=""
                  />
                </button>
              </header>
              <ProvenanceGroup
                title={t('Registration')}
                rows={[
                  [
                    t('Source'),
                    t(v.rev.registrationSource.replaceAll('_', ' ')),
                  ],
                  [t('Request number'), v.rev.requestNumber ?? '—'],
                  [
                    t('Development item number'),
                    v.rev.developmentItemNumber ?? '—',
                  ],
                  [t('Registered'), v.rev.createdAt.slice(0, 10)],
                ]}
              />
              <ProvenanceGroup
                title={t('Supplier detail')}
                rows={[[t('Supplier'), v.supplier?.name ?? '—']]}
              />
              <ProvenanceGroup
                title={t('Revision identity')}
                technical
                rows={[
                  [t('Revision ID'), v.rev.id],
                  [
                    t('Previous'),
                    previousHref ? (
                      <Link key="previous-revision" href={previousHref}>
                        {v.previous!.id}
                      </Link>
                    ) : (
                      '—'
                    ),
                  ],
                  [t('Created'), v.rev.createdAt],
                ]}
              />
              <ProvenanceGroup
                title={t('Technical references')}
                technical
                rows={[
                  [t('Sample ID'), v.sample.id],
                  [t('Material ID'), v.sample.materialId],
                  [t('Structure node'), v.root.id],
                ]}
              />
              <p className="revision-provenance-note">
                {t(
                  'Registration provenance and supplier traceability for this exact revision.',
                )}
              </p>
            </aside>
          )}
        </div>
      </article>
    </Workspace>
  );
}

function RevisionStructure({
  nodeId,
  depth = 0,
  ratio,
  description,
}: {
  nodeId: string;
  depth?: number;
  ratio?: string;
  description?: string;
}) {
  const node = catalog.nodes.find((n) => n.id === nodeId)!;
  const children = catalog.compositionEdges
    .filter((e) => e.parentNodeId === nodeId)
    .sort((a, b) => a.order - b.order);
  return (
    <>
      <div className={`revision-structure-row ${depth === 0 ? 'root' : ''}`}>
        <div
          className="revision-node-label"
          style={{ paddingLeft: depth * 16 }}
        >
          <strong>
            <span aria-hidden="true">{depth ? '└ ' : '◼ '}</span>
            {node.label}
          </strong>
          {ratio && <span>{ratio}</span>}
          {description && <span>{description}</span>}
        </div>
        <dl className="revision-inline-properties">
          {propertiesFor(nodeId).map((p) => (
            <div key={p.id}>
              <dt>{p.name}:</dt>
              <dd>
                {displayValue(p.value)}
                {p.unit ? ` ${p.unit}` : ''}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {children.map((edge) => (
        <RevisionStructure
          key={edge.id}
          nodeId={edge.childNodeId}
          depth={depth + 1}
          ratio={
            edge.ratioValue === null
              ? undefined
              : `${displayValue(edge.ratioValue)}${edge.ratioUnit ?? ''}`
          }
        />
      ))}
    </>
  );
}

function DeltaRows({
  category,
  rows,
  empty,
  rootLabel,
}: {
  category: string;
  rows: RevisionChange[];
  empty: string;
  rootLabel: string;
}) {
  const { t } = useLocale();
  if (!rows.length)
    return (
      <tr>
        <td>{t(category)}</td>
        <td>—</td>
        <td colSpan={3} className="revision-unchanged">
          {t(empty)}
        </td>
      </tr>
    );
  return rows.map((row) => {
    const numeric =
      typeof row.previous === 'number' && typeof row.current === 'number';
    const difference = numeric
      ? Number(row.current) - Number(row.previous)
      : null;
    const label = row.label.startsWith(`${rootLabel} / `)
      ? row.label.slice(rootLabel.length + 3)
      : row.label;
    const unit = row.unit ? ` ${row.unit}` : '';
    return (
      <tr key={row.path}>
        <td>{t(category)}</td>
        <td title={row.label}>{label}</td>
        <td>
          {row.previous === null ? '—' : `${displayValue(row.previous)}${unit}`}
        </td>
        <td className="revision-changed">
          {row.current === null ? '—' : `${displayValue(row.current)}${unit}`}
        </td>
        <td className="revision-changed">
          {difference !== null
            ? `${difference > 0 ? '+' : ''}${displayValue(Number(difference.toFixed(12)))}${unit}`
            : t(
                row.previous === null
                  ? 'Added'
                  : row.current === null
                    ? 'Removed'
                    : 'Changed',
              )}
        </td>
      </tr>
    );
  });
}

function ProvenanceGroup({
  title,
  rows,
  technical = false,
}: {
  title: string;
  rows: [string, ReactNode][];
  technical?: boolean;
}) {
  return (
    <section>
      <h3>{title}</h3>
      <dl className={technical ? 'technical' : undefined}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
