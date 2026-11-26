'use client';
import { useState } from 'react';
import type {
  SampleAggregate,
  SampleDetail,
} from '@/src/application/sample-lifecycle';
import {
  SampleRequestError,
  sampleRequest,
} from '@/src/infrastructure/http/sample-client';
import {
  sampleText,
  type SampleMessage,
} from '@/src/shared/i18n/sample-messages';
import { useLocale } from '@/src/shared/i18n/locale';
export function SampleRevisionForm({
  orgs,
  detail,
  onSaved,
  onCancel,
}: {
  orgs: { id: string }[];
  detail?: SampleDetail;
  onSaved: (d: SampleDetail) => void;
  onCancel: () => void;
}) {
  const { locale } = useLocale(),
    t = (k: SampleMessage) => sampleText(locale, k);
  const [commandId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState<SampleAggregate>(() => {
    const id = detail?.sample.id ?? crypto.randomUUID(),
      rid = crypto.randomUUID(),
      createdAt = new Date().toISOString();
    if (detail) {
      const nodes = detail.composition.nodes.map((n) =>
        n.nodeType === 'SAMPLE_REVISION' && n.referenceId === detail.revision.id
          ? { ...n, referenceId: rid }
          : n,
      );
      return {
        owningOrgId: detail.owningOrgId,
        sample: detail.sample,
        revision: {
          ...detail.revision,
          id: rid,
          revision: detail.latestRevision + 1,
          effectiveAt: '',
          createdAt,
        },
        composition: {
          nodes,
          edges: structuredClone(detail.composition.edges),
        },
        properties: structuredClone(detail.properties),
      };
    }
    return {
      owningOrgId: orgs[0]?.id ?? '',
      sample: {
        id,
        sampleCode: '',
        name: '',
        materialId: null,
        supplierId: null,
        description: null,
        status: 'Draft',
        createdAt,
      },
      revision: {
        id: rid,
        sampleId: id,
        revision: 1,
        requestNumber: null,
        developmentItemNumber: null,
        registrationSource: 'DIRECT_REGISTRATION',
        effectiveAt: '',
        status: 'Draft',
        createdAt,
      },
      composition: {
        nodes: [
          {
            id: crypto.randomUUID(),
            nodeType: 'SAMPLE_REVISION',
            referenceId: rid,
            label: 'Sample',
          },
        ],
        edges: [],
      },
      properties: [],
    };
  });
  const [effectiveLocal, setEffectiveLocal] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<SampleRequestError | null>(null);
  const change = <K extends keyof SampleAggregate>(
    key: K,
    value: SampleAggregate[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await sampleRequest<SampleDetail>({
          operation: 'write',
          commandId,
          expectedLatest: detail?.latestRevision ?? 0,
          aggregate: {
            ...draft,
            revision: {
              ...draft.revision,
              effectiveAt: effectiveLocal
                ? new Date(effectiveLocal).toISOString()
                : '',
            },
          },
        }),
      );
    } catch (e) {
      setError(
        e instanceof SampleRequestError
          ? e
          : new SampleRequestError('PERSISTENCE'),
      );
    } finally {
      setBusy(false);
    }
  };
  const errorKey: SampleMessage =
    error?.code === 'FORBIDDEN'
      ? 'forbidden'
      : error?.code === 'CONFLICT'
        ? 'conflict'
        : error?.code === 'VALIDATION'
          ? 'invalid'
          : 'error';
  return (
    <form
      className="sample-section"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2>{t(detail ? 'revise' : 'create')}</h2>
      <fieldset disabled={busy}>
        <legend>{t('identity')}</legend>
        <div className="bootstrap-controls">
          <label>
            {t('org')}
            <select
              value={draft.owningOrgId}
              disabled={!!detail}
              onChange={(e) => change('owningOrgId', e.target.value)}
            >
              {(detail ? [{ id: detail.owningOrgId }] : orgs).map((o) => (
                <option key={o.id}>{o.id}</option>
              ))}
            </select>
          </label>
          {(['sampleCode', 'name'] as const).map((k) => (
            <label key={k}>
              {t(k === 'sampleCode' ? 'code' : 'name')}
              <input
                required
                disabled={!!detail}
                value={draft.sample[k]}
                onChange={(e) =>
                  change('sample', { ...draft.sample, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <label>
            {t('description')}
            <input
              disabled={!!detail}
              value={draft.sample.description ?? ''}
              onChange={(e) =>
                change('sample', {
                  ...draft.sample,
                  description: e.target.value || null,
                })
              }
            />
          </label>
        </div>
        <p>{t('nullable')}</p>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>
          {t('snapshot')} · {draft.revision.revision}
        </legend>
        <div className="bootstrap-controls">
          <label>
            {t('effective')}
            <input
              type="datetime-local"
              required
              value={effectiveLocal}
              onChange={(e) => setEffectiveLocal(e.target.value)}
            />
          </label>
          <label>
            {t('source')}
            <select
              value={draft.revision.registrationSource}
              onChange={(e) =>
                change('revision', {
                  ...draft.revision,
                  registrationSource: e.target
                    .value as SampleAggregate['revision']['registrationSource'],
                })
              }
            >
              {(
                [
                  'DIRECT_REGISTRATION',
                  'INTERNAL_REQUEST',
                  'SUPPLIER_REQUEST',
                ] as const
              ).map((v) => (
                <option key={v} value={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
          {(['requestNumber', 'developmentItemNumber'] as const).map((k) => (
            <label key={k}>
              {t(k === 'requestNumber' ? 'request' : 'development')}
              <input
                value={draft.revision[k] ?? ''}
                onChange={(e) =>
                  change('revision', {
                    ...draft.revision,
                    [k]: e.target.value || null,
                  })
                }
              />
            </label>
          ))}
        </div>
        <h3>{t('composition')}</h3>
        <p>{t('graphHint')}</p>
        <div className="dxt-grid-scroll">
          <table className="dxt-grid">
            <thead>
              <tr>
                <th>{t('node')}</th>
                <th>{t('label')}</th>
                <th>{t('type')}</th>
                <th>{t('reference')}</th>
                <th>{t('remove')}</th>
              </tr>
            </thead>
            <tbody>
              {draft.composition.nodes.map((n, i) => (
                <tr key={n.id}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      required
                      aria-label={`${t('label')} ${i + 1}`}
                      value={n.label}
                      onChange={(e) =>
                        change('composition', {
                          ...draft.composition,
                          nodes: draft.composition.nodes.map((x) =>
                            x.id === n.id ? { ...x, label: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </td>
                  <td>
                    {i === 0 ? (
                      t('root')
                    ) : (
                      <select
                        value={n.nodeType}
                        onChange={(e) =>
                          change('composition', {
                            ...draft.composition,
                            nodes: draft.composition.nodes.map((x) =>
                              x.id === n.id
                                ? {
                                    ...x,
                                    nodeType: e.target
                                      .value as typeof n.nodeType,
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        {(
                          [
                            'RAW_MATERIAL',
                            'INTERMEDIATE',
                            'SAMPLE_REVISION',
                          ] as const
                        ).map((v) => (
                          <option key={v} value={v}>
                            {t(v)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {i === 0 ? (
                      t('root')
                    ) : (
                      <input
                        required
                        aria-label={t('reference')}
                        value={n.referenceId}
                        onChange={(e) =>
                          change('composition', {
                            ...draft.composition,
                            nodes: draft.composition.nodes.map((x) =>
                              x.id === n.id
                                ? { ...x, referenceId: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    )}
                  </td>
                  <td>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          change('composition', {
                            nodes: draft.composition.nodes.filter(
                              (x) => x.id !== n.id,
                            ),
                            edges: draft.composition.edges.filter(
                              (x) =>
                                x.parentNodeId !== n.id &&
                                x.childNodeId !== n.id,
                            ),
                          })
                        }
                      >
                        {t('remove')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="entry-button"
          onClick={() =>
            change('composition', {
              ...draft.composition,
              nodes: [
                ...draft.composition.nodes,
                {
                  id: crypto.randomUUID(),
                  nodeType: 'RAW_MATERIAL',
                  referenceId: '',
                  label: '',
                },
              ],
            })
          }
        >
          {t('add')} · {t('node')}
        </button>
        <h4>{t('edges')}</h4>
        {draft.composition.edges.map((edge, i) => (
          <div className="bootstrap-controls" key={edge.id}>
            {(['parentNodeId', 'childNodeId'] as const).map((k) => (
              <label key={k}>
                {t(k === 'parentNodeId' ? 'parent' : 'child')}
                <select
                  value={edge[k]}
                  onChange={(e) =>
                    change('composition', {
                      ...draft.composition,
                      edges: draft.composition.edges.map((x) =>
                        x.id === edge.id ? { ...x, [k]: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {draft.composition.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label || n.id}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              {t('ratio')}
              <input
                type="number"
                step="any"
                min="0"
                value={edge.ratioValue ?? ''}
                onChange={(e) =>
                  change('composition', {
                    ...draft.composition,
                    edges: draft.composition.edges.map((x) =>
                      x.id === edge.id
                        ? {
                            ...x,
                            ratioValue:
                              e.target.value === ''
                                ? null
                                : Number(e.target.value),
                          }
                        : x,
                    ),
                  })
                }
              />
            </label>
            <label>
              {t('unit')}
              <input
                value={edge.ratioUnit ?? ''}
                onChange={(e) =>
                  change('composition', {
                    ...draft.composition,
                    edges: draft.composition.edges.map((x) =>
                      x.id === edge.id
                        ? { ...x, ratioUnit: e.target.value || null }
                        : x,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                change('composition', {
                  ...draft.composition,
                  edges: draft.composition.edges.filter(
                    (_, index) => index !== i,
                  ),
                })
              }
            >
              {t('remove')}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="entry-button"
          disabled={draft.composition.nodes.length < 2}
          onClick={() =>
            change('composition', {
              ...draft.composition,
              edges: [
                ...draft.composition.edges,
                {
                  id: crypto.randomUUID(),
                  parentNodeId: draft.composition.nodes[0].id,
                  childNodeId: draft.composition.nodes.at(-1)!.id,
                  ratioValue: null,
                  ratioUnit: null,
                  order: draft.composition.edges.length,
                },
              ],
            })
          }
        >
          {t('add')} · {t('edges')}
        </button>
        <h3>{t('properties')}</h3>
        {draft.properties.map((p, i) => {
          const update = (patch: Partial<typeof p>) =>
            change(
              'properties',
              draft.properties.map((x, j) =>
                i === j ? { ...x, ...patch } : x,
              ),
            );
          return (
            <div className="bootstrap-controls" key={p.id}>
              <label>
                {t('node')}
                <select
                  value={p.materialNodeId}
                  onChange={(e) => update({ materialNodeId: e.target.value })}
                >
                  {draft.composition.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('definition')}
                <input
                  required
                  value={p.propertyDefinitionId}
                  onChange={(e) =>
                    update({ propertyDefinitionId: e.target.value })
                  }
                />
              </label>
              <label>
                {t('type')}
                <select
                  value={p.valueType}
                  onChange={(e) =>
                    update({
                      valueType: e.target.value as typeof p.valueType,
                      value: '',
                    })
                  }
                >
                  {(['NUMBER', 'TEXT', 'BOOLEAN', 'IMAGE'] as const).map(
                    (v) => (
                      <option key={v} value={v}>
                        {t(v)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                {t('value')}
                {p.valueType === 'BOOLEAN' ? (
                  <select
                    value={String(p.value)}
                    onChange={(e) =>
                      update({
                        value:
                          e.target.value === ''
                            ? ''
                            : e.target.value === 'true',
                      })
                    }
                  >
                    <option value="">—</option>
                    <option>true</option>
                    <option>false</option>
                  </select>
                ) : (
                  <input
                    required
                    type={p.valueType === 'NUMBER' ? 'number' : 'text'}
                    step="any"
                    value={String(p.value)}
                    onChange={(e) =>
                      update({
                        value:
                          p.valueType === 'NUMBER' && e.target.value !== ''
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </label>
              <label>
                {t('unit')}
                <input
                  value={p.unit ?? ''}
                  onChange={(e) => update({ unit: e.target.value || null })}
                />
              </label>
              <label>
                {t('author')}
                <select
                  value={p.source}
                  onChange={(e) =>
                    update({ source: e.target.value as typeof p.source })
                  }
                >
                  {(
                    [
                      'DIRECT_ENTRY',
                      'SUPPLIER',
                      'INTERNAL_MEASUREMENT',
                      'CALCULATED',
                    ] as const
                  ).map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  change(
                    'properties',
                    draft.properties.filter((_, j) => j !== i),
                  )
                }
              >
                {t('remove')}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="entry-button"
          onClick={() =>
            change('properties', [
              ...draft.properties,
              {
                id: crypto.randomUUID(),
                materialNodeId: draft.composition.nodes[0].id,
                propertyDefinitionId: '',
                value: '',
                unit: null,
                valueType: 'TEXT',
                source: 'DIRECT_ENTRY',
                effectiveAt: null,
                evidenceId: null,
              },
            ])
          }
        >
          {t('add')} · {t('properties')}
        </button>
      </fieldset>
      {error && (
        <div role="alert">
          <p>{t(errorKey)}</p>
          {error.fields.map((f) => (
            <p key={f.path}>
              <code>{f.path}</code> · {t('invalid')}
            </p>
          ))}
        </div>
      )}
      <div className="dxt-toolbar" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="entry-button"
          disabled={busy}
          onClick={onCancel}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="entry-button primary"
          disabled={busy || !draft.owningOrgId}
        >
          {busy ? t('loading') : t(detail ? 'saveRevision' : 'save')}
        </button>
      </div>
    </form>
  );
}
