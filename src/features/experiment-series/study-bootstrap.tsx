'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/src/shared/i18n/locale';
import { httpStudyBootstrap as api } from '@/src/infrastructure/http/http-repositories';
import {
  initialReasoningSchema,
  type BootstrapSetupInput,
  type StudyBootstrapState,
} from '@/src/application/study-bootstrap';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';

export function StudyBootstrap({ slug }: { slug: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<StudyBootstrapState | null>(null);
  const [subjects, setSubjects] = useState('');
  const [operations, setOperations] = useState<
    BootstrapSetupInput['operations']
  >([]);
  const [optionId, setOptionId] = useState('');
  const [target, setTarget] = useState({
    parameter: '',
    point: '',
    aggregation: '',
    operator: '',
    threshold: '',
    lower: '',
    upper: '',
    evaluation: '',
    nextAction: '',
  });
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<AuthoritativeRunPreview | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const attempts = useRef<Record<string, { hash: string; id: string }>>({});
  const pending = useRef(false);
  function command(kind: string, input: unknown) {
    const hash = JSON.stringify(input);
    if (attempts.current[kind]?.hash !== hash)
      attempts.current[kind] = { hash, id: crypto.randomUUID() };
    return attempts.current[kind].id;
  }
  function hydrate(s: StudyBootstrapState) {
    setDirty(false);
    setState(s);
    setSubjects(
      s.subjects
        .map((v) =>
          v.id === v.displayLabel ? v.id : `${v.id} | ${v.displayLabel}`,
        )
        .join('\n'),
    );
    setOperations(
      s.setup.operations.map((op) => ({
        optionId:
          s.options.find(
            (o) =>
              o.operation.operationDefinitionRevisionId ===
                op.operationDefinitionRevisionId &&
              o.operation.context?.equipmentReferenceId ===
                op.context?.equipmentReferenceId &&
              o.operation.context?.moduleReferenceId ===
                op.context?.moduleReferenceId,
          )?.id ?? '',
        point: op.measurementPoint,
        parameterIds: op.measurements.flatMap((m) => m.parameterDefinitionIds),
        items: op.items.map((i) => ({
          applicabilityId: i.applicabilityId,
          value: i.value,
          intentRole: i.intentRole,
        })),
      })),
    );
  }
  useEffect(() => {
    let active = true;
    api
      .load(slug)
      .then((s) => {
        if (active) hydrate(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);
  async function execute(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Repository request failed.');
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  function change(
    index: number,
    patch: Partial<BootstrapSetupInput['operations'][number]>,
  ) {
    setOperations((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setPreview(null);
    setDirty(true);
  }
  const field = (
    key: keyof typeof target,
    label: string,
    children?: React.ReactNode,
  ) => (
    <label>
      {t(label)}
      {children ?? (
        <input
          type="number"
          step="any"
          value={target[key]}
          onChange={(e) => setTarget({ ...target, [key]: e.target.value })}
        />
      )}
    </label>
  );
  if (!state)
    return (
      <section className="study-bootstrap" aria-label={t('Experiment Setup')}>
        {error ? <p role="alert">{t(error)}</p> : <p>{t('Loading…')}</p>}
      </section>
    );
  const plans = state.setup.operations.flatMap((o) => o.measurements);
  const parameters = state.catalog.parameters.filter(
    (p) =>
      p.dataType === 'NUMBER' &&
      plans.some((m) => m.parameterDefinitionIds.includes(p.id)),
  );
  const parameter = parameters.find((p) => p.id === target.parameter);
  const readOnly = busy || !state.canEditSetup;
  return (
    <section className="study-bootstrap" aria-label={t('Experiment Setup')}>
      <h2>{t('Experiment Setup')}</h2>
      <p>
        {t('Structural Setup')}:{' '}
        {t(state.structuralMissing.length ? 'Incomplete' : 'Complete')}{' '}
        {state.structuralMissing.map((m) => t(m)).join(' · ')}
      </p>
      <p>
        {t('Scientific readiness')}: {t(state.readiness.status)}{' '}
        {state.readiness.missing.map((m) => t(m)).join(' · ')}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output>{t(notice)}</output>}
      {dirty && <p>{t('Save Setup before continuing.')}</p>}
      <fieldset disabled={readOnly}>
        <legend>{t('Subjects and ordered Operations')}</legend>
        <label>
          {t('Subjects — one ID per line; optional ID | label')}
          <textarea
            rows={4}
            value={subjects}
            onChange={(e) => {
              setSubjects(e.target.value);
              setPreview(null);
              setDirty(true);
            }}
          />
        </label>
        <div className="bootstrap-controls">
          <label>
            {t('Operation')}
            <select
              value={optionId}
              onChange={(e) => setOptionId(e.target.value)}
            >
              <option value="">{t('Select')}</option>
              {state.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.operation.label} ·{' '}
                  {o.operation.context?.equipmentLabel || t('Not specified')}{' '}
                  {o.operation.context?.moduleLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            className="entry-button"
            onClick={() => {
              if (optionId) {
                setOperations([
                  ...operations,
                  { optionId, point: null, parameterIds: [], items: [] },
                ]);
                setDirty(true);
                setPreview(null);
              }
            }}
            disabled={!optionId}
          >
            {t('Add Operation')}
          </button>
        </div>
        {operations.map((row, index) => {
          const option = state.options.find((o) => o.id === row.optionId);
          if (!option) return null;
          return (
            <section className="bootstrap-operation" key={index}>
              <div className="bootstrap-controls">
                <strong>
                  {index + 1}. {option.operation.label} ·{' '}
                  {option.operation.context?.equipmentLabel}
                </strong>
                <button
                  className="entry-button"
                  disabled={index === 0}
                  onClick={() => {
                    const rows = [...operations];
                    [rows[index - 1], rows[index]] = [
                      rows[index],
                      rows[index - 1],
                    ];
                    setOperations(rows);
                    setDirty(true);
                    setPreview(null);
                  }}
                >
                  {t('Move up')}
                </button>
                <button
                  className="entry-button"
                  onClick={() => {
                    setOperations(operations.filter((_, i) => i !== index));
                    setDirty(true);
                    setPreview(null);
                  }}
                >
                  {t('Remove')}
                </button>
              </div>
              {option.operation.role === 'MEASUREMENT' ? (
                <>
                  <label>
                    {t('Measurement point')}
                    <select
                      value={row.point ?? ''}
                      onChange={(e) =>
                        change(index, {
                          point: e.target.value as typeof row.point,
                          parameterIds: [],
                        })
                      }
                    >
                      <option value="">{t('Select')}</option>
                      {['PRE', 'INTERMEDIATE', 'POST', 'FINAL', 'CUSTOM'].map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <div className="bootstrap-controls">
                    {state.catalog.parameters
                      .filter(
                        (p) =>
                          option.parameterIds.includes(p.id) &&
                          (!row.point ||
                            p.supportedMeasurementPoints.includes(row.point)),
                      )
                      .map((p) => (
                        <label key={p.id}>
                          <input
                            type="checkbox"
                            checked={row.parameterIds.includes(p.id)}
                            onChange={(e) =>
                              change(index, {
                                parameterIds: e.target.checked
                                  ? [...row.parameterIds, p.id]
                                  : row.parameterIds.filter(
                                      (id) => id !== p.id,
                                    ),
                              })
                            }
                          />
                          {p.name}
                          {!!p.requiredSupportingParameterIds.length && (
                            <small>
                              {t('Required supporting parameters')}:{' '}
                              {p.requiredSupportingParameterIds
                                .map(
                                  (id) =>
                                    state.catalog.parameters.find(
                                      (p) => p.id === id,
                                    )?.name ?? id,
                                )
                                .join(' · ')}
                            </small>
                          )}
                        </label>
                      ))}
                  </div>
                </>
              ) : (
                option.operation.items.map((def) => {
                  const value = row.items.find(
                    (i) => i.applicabilityId === def.applicabilityId,
                  );
                  return (
                    <div
                      className="bootstrap-controls"
                      key={def.applicabilityId}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(e) =>
                            change(index, {
                              items: e.target.checked
                                ? [
                                    ...row.items,
                                    {
                                      applicabilityId: def.applicabilityId,
                                      value: '',
                                      intentRole: 'FIXED',
                                    },
                                  ]
                                : row.items.filter((i) => i !== value),
                            })
                          }
                        />
                        {def.label} {def.unit}
                      </label>
                      {value && (
                        <>
                          <label>
                            {t('Value')}
                            {def.options.length ? (
                              <select
                                value={value.value}
                                onChange={(e) =>
                                  change(index, {
                                    items: row.items.map((i) =>
                                      i === value
                                        ? { ...i, value: e.target.value }
                                        : i,
                                    ),
                                  })
                                }
                              >
                                <option value="">{t('Select')}</option>
                                {def.options.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={value.value}
                                onChange={(e) =>
                                  change(index, {
                                    items: row.items.map((i) =>
                                      i === value
                                        ? { ...i, value: e.target.value }
                                        : i,
                                    ),
                                  })
                                }
                              />
                            )}
                          </label>
                          <label>
                            {t('Role')}
                            <select
                              value={value.intentRole}
                              onChange={(e) =>
                                change(index, {
                                  items: row.items.map((i) =>
                                    i === value
                                      ? {
                                          ...i,
                                          intentRole: e.target.value as
                                            | 'FIXED'
                                            | 'VARIED',
                                        }
                                      : i,
                                  ),
                                })
                              }
                            >
                              <option value="FIXED">{t('Fixed')}</option>
                              <option value="VARIED">
                                {t('Intentionally Varied')}
                              </option>
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          );
        })}
        <div className="entry-actions">
          <button
            className="entry-button primary"
            onClick={() =>
              execute(async () => {
                const input: BootstrapSetupInput = {
                  expectedRevision: state.setup.revision,
                  subjects: subjects
                    .split('\n')
                    .filter((s) => s.trim())
                    .map((line) => {
                      const [id, label] = line.split('|').map((s) => s.trim());
                      return { id, displayLabel: label || id };
                    }),
                  operations,
                };
                hydrate(await api.save(slug, input, command('setup', input)));
                setPreview(null);
                setNotice('Setup saved.');
              })
            }
          >
            {t('Save Setup')}
          </button>
        </div>
      </fieldset>
      {!state.canEditSetup && <p>{t('Setup is read-only.')}</p>}
      {state.readiness.contextId && (
        <section>
          <h3>{t('Initial Target context')}</h3>
          {state.readiness.proposals
            .find((p) => p.id === state.readiness.contextId)
            ?.context.targetBindings.map((b) => (
              <p key={b.target.id}>
                {state.catalog.parameters.find(
                  (p) => p.id === b.target.parameterDefinitionId,
                )?.name ?? b.target.parameterDefinitionId}{' '}
                · {b.measurementPoint} · {b.aggregationMethod} ·{' '}
                {b.target.operator} ·{' '}
                {b.target.operator === 'BETWEEN'
                  ? `${b.target.lowerBound} – ${b.target.upperBound}`
                  : b.target.threshold}{' '}
                {
                  state.catalog.units.find(
                    (u) => u.id === b.target.unitDefinitionId,
                  )?.symbol
                }
              </p>
            ))}
        </section>
      )}
      {!state.readiness.contextId && (
        <fieldset
          disabled={
            busy ||
            dirty ||
            !state.canInitializeReasoning ||
            !!state.structuralMissing.length
          }
        >
          <legend>{t('Initial Target context')}</legend>
          <p>
            {t(
              'Enter scientific Target values explicitly. Confirmation is immutable for this package.',
            )}
          </p>
          <div className="bootstrap-controls">
            {field(
              'parameter',
              'Parameter',
              <select
                value={target.parameter}
                onChange={(e) =>
                  setTarget({ ...target, parameter: e.target.value, point: '' })
                }
              >
                <option value="">{t('Select')}</option>
                {parameters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ·{' '}
                    {state.catalog.units.find((u) => u.id === p.unitId)?.symbol}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'point',
              'Measurement point',
              <select
                value={target.point}
                onChange={(e) =>
                  setTarget({ ...target, point: e.target.value })
                }
              >
                <option value="">{t('Select')}</option>
                {[
                  ...new Set(
                    plans
                      .filter((m) =>
                        m.parameterDefinitionIds.includes(target.parameter),
                      )
                      .map((m) => m.point),
                  ),
                ].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>,
            )}
            {field(
              'aggregation',
              'Aggregation',
              <select
                value={target.aggregation}
                onChange={(e) =>
                  setTarget({ ...target, aggregation: e.target.value })
                }
              >
                <option value="">{t('Select')}</option>
                {['MEAN', 'MIN', 'MAX', 'MEDIAN', 'THREE_SIGMA'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>,
            )}
            {field(
              'operator',
              'Target rule',
              <select
                value={target.operator}
                onChange={(e) =>
                  setTarget({ ...target, operator: e.target.value })
                }
              >
                <option value="">{t('Select')}</option>
                {['GTE', 'LTE', 'EQ', 'BETWEEN'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>,
            )}
            {target.operator === 'BETWEEN' ? (
              <>
                {field('lower', 'Lower bound')}
                {field('upper', 'Upper bound')}
              </>
            ) : (
              field('threshold', 'Threshold')
            )}
            {field(
              'evaluation',
              'Evaluation reference',
              <select
                value={target.evaluation}
                onChange={(e) =>
                  setTarget({ ...target, evaluation: e.target.value })
                }
              >
                <option value="">{t('Select')}</option>
                {state.catalog.evaluations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'nextAction',
              'Next Action reference',
              <select
                value={target.nextAction}
                onChange={(e) =>
                  setTarget({ ...target, nextAction: e.target.value })
                }
              >
                <option value="">{t('Select')}</option>
                {state.catalog.nextActionTypes
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>,
            )}
          </div>
          {(!state.catalog.evaluations.length ||
            !state.catalog.nextActionTypes.some((p) => p.active)) && (
            <p>
              {t(
                'Exact reasoning references are missing from this package. Configuration must be prepared before confirmation.',
              )}
            </p>
          )}
          <div className="entry-actions">
            <button
              className="entry-button primary"
              onClick={() =>
                execute(async () => {
                  if (
                    !parameter ||
                    !target.operator ||
                    (target.operator === 'BETWEEN'
                      ? target.lower === '' || target.upper === ''
                      : target.threshold === '')
                  )
                    throw new Error('Enter explicit Target values.');
                  const parsed = initialReasoningSchema.safeParse({
                    packageVersionId: state.setup.configurationPackageVersionId,
                    confirmed: true,
                    evaluationIds: [target.evaluation],
                    nextActionIds: [target.nextAction],
                    targetBindings: [
                      {
                        target: {
                          id: `${state.setup.seriesId}-target-1`,
                          parameterDefinitionId: target.parameter,
                          unitDefinitionId: parameter.unitId,
                          operator: target.operator,
                          threshold:
                            target.operator === 'BETWEEN'
                              ? null
                              : Number(target.threshold),
                          lowerBound:
                            target.operator === 'BETWEEN'
                              ? Number(target.lower)
                              : null,
                          upperBound:
                            target.operator === 'BETWEEN'
                              ? Number(target.upper)
                              : null,
                        },
                        measurementPoint: target.point,
                        resultGrain: 'SUBJECT_SUMMARY',
                        aggregationMethod: target.aggregation,
                      },
                    ],
                  });
                  if (!parsed.success)
                    throw new Error('Check required Setup and Target fields.');
                  const input = parsed.data;
                  await api.initialize(
                    slug,
                    input,
                    command('reasoning', input),
                  );
                  hydrate(await api.load(slug));
                  setNotice('Initial Target context confirmed.');
                })
              }
            >
              {t('Confirm initial Target context')}
            </button>
          </div>
        </fieldset>
      )}
      {!state.canInitializeReasoning && !state.closed && (
        <p>
          {t(
            'Explicit reasoning permission is required. Contact the responsible administrator.',
          )}
        </p>
      )}
      <div className="entry-actions">
        <button
          className="entry-button"
          disabled={
            busy ||
            dirty ||
            !!state.runNumbers.length ||
            !state.canCreateRun ||
            state.readiness.status !== 'READY' ||
            !!state.structuralMissing.length
          }
          onClick={() =>
            execute(async () => setPreview(await api.preview(slug)))
          }
        >
          {t('Preview first Run')}
        </button>
      </div>
      {preview && (
        <section>
          <h3>{t('Review first Run')}</h3>
          <p>
            {preview.snapshot.series.name} · {preview.snapshot.subjects.length}{' '}
            {t('Subjects')} · {preview.snapshot.steps.length} {t('Operations')}
          </p>
          <ol>
            {preview.snapshot.steps.map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ol>
          <p>
            {t('Exact configuration context')}:{' '}
            {preview.snapshot.configurationPackageVersionId}
          </p>
          <div className="entry-actions">
            <button
              className="entry-button primary"
              disabled={busy || created !== null}
              onClick={() =>
                execute(async () => {
                  const run = await api.create(
                    slug,
                    preview.fingerprint,
                    command('run', preview.fingerprint),
                  );
                  setCreated(run.runNumber);
                  setNotice('Run created.');
                })
              }
            >
              {t('Create first Run')}
            </button>
          </div>
        </section>
      )}
      {!!state.runNumbers.length && (
        <section>
          <h3>{t('Existing Runs')}</h3>
          {state.runNumbers.map((n) => (
            <Link
              key={n}
              className="entry-button"
              href={`/series/${slug}/runs/${n}/engineering-grid?view=plan`}
            >
              {t('Open Run')} {n}
            </Link>
          ))}
        </section>
      )}
      {created !== null && (
        <Link
          className="entry-button primary"
          href={`/series/${slug}/runs/${created}/engineering-grid?view=plan`}
        >
          {t('Open Run')} {created}
        </Link>
      )}
    </section>
  );
}
