'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import { loadStudyPermissions } from '@/src/infrastructure/http/http-repositories';
import { StudyReadinessPanel } from './study-readiness-panel';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Search, Trash2 } from 'lucide-react';
import { InspectorDrawer } from '@/src/shared/ui/inspector-drawer';
import {
  addStudySetupItem,
  selectStudyReferenceSet,
  createInitialStudySetup,
  definitionAvailableInPinnedPackage,
  removeStudySetupItem,
  resolvedStudySetupItems,
  updateStudySetupItem,
  studyObservationGrainLabel,
  studySubjectLabel,
  type StudySetupItem,
  type StudySetupSnapshot,
} from './study-setup-model';
import type { SeriesSlug } from './run-entry-model';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export default function StudySetupWorkspace(
  props: Omit<Parameters<typeof StudySetupWorkspaceLoaded>[0], 'initialSetup'>,
) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const [canEdit, setCanEdit] = useState(false);
  const [setup, setSetup] = useState<StudySetupSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      application.studies.load(props.seriesSlug),
      application.configurationAuthoringBoundary
        ? loadStudyPermissions(props.seriesSlug)
        : Promise.resolve({ canEditStudySetup: true }),
    ])
      .then(([stored, permissions]) => {
        if (active) setCanEdit(permissions.canEditStudySetup);
        if (!stored && application.configurationAuthoringBoundary)
          throw new Error('Study Setup is not persisted.');
        if (active)
          setSetup(
            stored ??
              createInitialStudySetup(
                props.seriesSlug,
                application.repositories.configuration,
              ),
          );
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            error instanceof Error ? error.message : 'Study Setup unavailable.',
          );
      });
    return () => {
      active = false;
    };
  }, [application, props.seriesSlug]);
  if (error) return <p role="alert">{t(error)}</p>;
  if (!setup) return <p>{t('Loading Study Setup…')}</p>;
  return (
    <fieldset
      disabled={!canEdit}
      style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
    >
      <StudySetupWorkspaceLoaded {...props} initialSetup={setup} />
    </fieldset>
  );
}

function StudySetupWorkspaceLoaded({
  initialSetup,
  seriesSlug,
  initialPickerOpen = false,
  initialPickerOperationId,
  initialInspectorOpen = false,
  initialItemRevisionId,
}: {
  initialSetup: StudySetupSnapshot;
  seriesSlug: SeriesSlug;
  initialPickerOpen?: boolean;
  initialPickerOperationId?: string;
  initialInspectorOpen?: boolean;
  initialItemRevisionId?: string;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const configuration = application.repositories.configuration;
  const [setup, setSetup] = useState(initialSetup);
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        initialSetup.operations
          .filter((operation) => operation.items.length > 0)
          .map((operation) => operation.id),
      ),
  );
  const initialItems = setup.operations.flatMap((operation) => operation.items);
  const firstItem =
    initialItems.find(
      (item) => item.definitionRevisionId === initialItemRevisionId,
    ) ??
    initialItems[0] ??
    null;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    firstItem?.id ?? null,
  );
  const [inspectorOpen, setInspectorOpen] = useState(initialInspectorOpen);
  const [pickerOperationId, setPickerOperationId] = useState<string | null>(
    () =>
      initialPickerOpen
        ? (setup.operations.find(
            (operation) => operation.id === initialPickerOperationId,
          )?.id ??
          setup.operations.find((operation) => operation.items.length > 0)
            ?.id ??
          null)
        : null,
  );
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const persist = useCallback(
    async (next: StudySetupSnapshot, message: string) => {
      if (saving) return;
      setSaving(true);
      const request = JSON.stringify(next);
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(request),
      );
      const id =
        `study-${seriesSlug}-` +
        Array.from(new Uint8Array(digest))
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('');
      setNotice('Saving Study Setup…');
      try {
        await application.studies.save(next, id);
        const stored = await application.studies.load(seriesSlug);
        if (!stored)
          throw new Error('Saved Study Setup read-back unavailable.');
        setSetup(stored);
        setNotice(message);
      } catch (error: unknown) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Study Setup could not be saved.',
        );
      } finally {
        setSaving(false);
      }
    },
    [application, seriesSlug, saving],
  );
  const selected =
    setup.operations
      .flatMap((operation) => operation.items)
      .find((item) => item.id === selectedItemId) ?? null;
  const selectedOperation = setup.operations.find(
    (operation) => operation.id === selected?.operationId,
  );
  const pickerOperation = setup.operations.find(
    (operation) => operation.id === pickerOperationId,
  );
  const pickerItems = useMemo(() => {
    if (!pickerOperationId) return [];
    return resolvedStudySetupItems(
      setup,
      pickerOperationId,
      configuration,
    ).filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  }, [configuration, pickerOperationId, query, setup]);

  return (
    <section
      className="study-setup-surface"
      aria-labelledby="study-setup-heading"
    >
      <header className="study-setup-toolbar">
        <div>
          <h2 id="study-setup-heading">
            {t('Study-level experimental defaults')}
          </h2>
          <p>
            {t(
              'Future Runs inherit this exact setup as an independent full snapshot.',
            )}
          </p>
        </div>
        <div className="study-setup-pin">
          <span>{t('Reference Kit')}</span>

          <select
            aria-label={t('Reference Set version')}
            value={setup.configurationPackageVersionId}
            disabled={saving}
            onChange={(event) => {
              try {
                void persist(
                  selectStudyReferenceSet(
                    setup,
                    event.target.value,
                    configuration,
                  ),
                  'Exact Reference Set saved for future Runs.',
                );
              } catch (error: unknown) {
                setNotice(
                  error instanceof Error
                    ? error.message
                    : 'Reference Set cannot be adopted.',
                );
              }
            }}
          >
            {configuration
              .getConfigurationRegistry()
              .packages.filter(
                (pkg) =>
                  pkg.id === setup.configurationPackageVersionId ||
                  (pkg.status === 'ACTIVE' &&
                    pkg.packageId ===
                      configuration.getPackageVersion(
                        setup.configurationPackageVersionId,
                      )?.packageId &&
                    pkg.subjectTypeRevisionIds.includes(
                      setup.subjectTypeRevisionId,
                    ) &&
                    pkg.experimentTypeProfileVersionIds.includes(
                      setup.experimentTypeProfileVersionId,
                    )),
              )
              .map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.id} · {t(pkg.status)}
                </option>
              ))}
          </select>
        </div>
      </header>
      <StudyReadinessPanel
        compact
        key={setup.configurationPackageVersionId}
        slug={seriesSlug}
        pin={setup.configurationPackageVersionId}
      />
      {notice && (
        <div className="study-setup-notice">
          <Check size={14} />
          {t(notice)}
        </div>
      )}
      <div className="study-setup-grid-wrap">
        <table className="study-setup-grid">
          <thead>
            <tr>
              <th>{t('Operation')}</th>
              <th>{t('Item')}</th>
              <th>{t('Default')}</th>
              <th>{t('Intent')}</th>
              <th>{t('Grain')}</th>
              <th>{t('Detail')}</th>
            </tr>
          </thead>
          <tbody>
            {setup.operations.map((operation) => {
              const open = expanded.has(operation.id);
              const rows = [
                ...operation.items.map((item) => ({
                  type: 'item' as const,
                  item,
                })),
                ...operation.measurements.map((measurement) => ({
                  type: 'measurement' as const,
                  measurement,
                })),
              ];
              if (!rows.length)
                rows.push({
                  type: 'measurement' as const,
                  measurement: null as never,
                });
              return (
                <Fragment key={operation.id}>
                  <tr className="study-setup-operation-row">
                    <th scope="row">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={t('{0} Operation', [operation.label])}
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(operation.id))
                              next.delete(operation.id);
                            else next.add(operation.id);
                            return next;
                          })
                        }
                      >
                        {open ? '⌄' : '›'} {operation.label}
                      </button>
                    </th>
                    <td colSpan={5}>
                      <span>
                        {t(operation.role)} ·{' '}
                        {operation.role === 'MEASUREMENT'
                          ? operation.measurements
                              .flatMap((item) => item.parameters)
                              .join(' · ')
                          : t('{0} items configured', [operation.items.length])}
                      </span>
                    </td>
                  </tr>
                  {open &&
                    rows.map((row) => (
                      <tr
                        key={
                          row.type === 'item'
                            ? row.item.id
                            : (row.measurement?.id ?? `${operation.id}-empty`)
                        }
                        className={
                          inspectorOpen &&
                          selectedItemId ===
                            (row.type === 'item' ? row.item.id : null)
                            ? 'selected'
                            : ''
                        }
                      >
                        <td
                          className="study-setup-parent"
                          aria-label={t('Parent Operation')}
                        />
                        {row.type === 'item' ? (
                          <>
                            <td>
                              <button
                                className="study-setup-item-button"
                                aria-label={t('Inspect {0}', [row.item.label])}
                                onClick={() => {
                                  setSelectedItemId(row.item.id);
                                  setInspectorOpen(true);
                                }}
                              >
                                <b>{row.item.label}</b>
                              </button>
                            </td>
                            <td>
                              <StudySetupValueEditor
                                key={`${row.item.id}:${row.item.value}`}
                                item={row.item}
                                onCommit={(value) => {
                                  try {
                                    void persist(
                                      updateStudySetupItem(
                                        setup,
                                        row.item.id,
                                        value,
                                      ),
                                      `${row.item.label} default saved for future Runs.`,
                                    );
                                  } catch (error) {
                                    setNotice((error as Error).message);
                                  }
                                }}
                              />
                            </td>
                            <td
                              aria-label={t(
                                row.item.intentRole === 'VARIED'
                                  ? 'Intentionally Varied'
                                  : 'Fixed',
                              )}
                            >
                              <span
                                className={`study-intent ${row.item.intentRole === 'VARIED' ? 'varied' : ''}`}
                              >
                                <abbr
                                  title={t(
                                    row.item.intentRole === 'VARIED'
                                      ? 'Intentionally Varied'
                                      : 'Fixed',
                                  )}
                                >
                                  {row.item.intentRole === 'VARIED' ? 'V' : 'F'}
                                </abbr>
                              </span>
                            </td>
                            <td>{t('Subject')}</td>
                            <td>
                              <button
                                className="study-row-depth"
                                aria-label={t('Inspect {0}', [row.item.label])}
                                onClick={() => {
                                  setSelectedItemId(row.item.id);
                                  setInspectorOpen(true);
                                }}
                              >
                                {t('Details')}
                              </button>
                            </td>
                          </>
                        ) : row.measurement ? (
                          <>
                            <td
                              aria-label={t('Measurement {0}', [
                                row.measurement.parameters.join(' '),
                              ])}
                            >
                              <span className="study-measurement-item">
                                <span aria-hidden="true">└</span>
                                <b>{t('Measurement')}</b>
                                <small>
                                  {row.measurement.parameters.join(' · ')}
                                </small>
                              </span>
                            </td>
                            <td>{row.measurement.parameters.join(' · ')}</td>
                            <td>
                              <span className="study-intent">
                                {t('PLANNED')}
                              </span>
                            </td>
                            <td>
                              {t(
                                studyObservationGrainLabel(
                                  setup,
                                  configuration,
                                ),
                              )}
                            </td>
                            <td>
                              <span className="sr-only">
                                {t('No row actions')}
                              </span>
                              —
                            </td>
                          </>
                        ) : (
                          <td colSpan={5}>
                            <span className="study-operation-empty">
                              {t('No selected Items for this Operation.')}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="study-setup-actions">
        {setup.operations
          .filter((operation) => operation.role === 'PROCESS')
          .map((operation) => (
            <button
              key={operation.id}
              onClick={() => setPickerOperationId(operation.id)}
            >
              + {t('Add Item to')} {operation.label}
            </button>
          ))}
      </div>

      <InspectorDrawer
        open={Boolean(pickerOperationId)}
        title={t('Add Experiment Item')}
        onClose={() => setPickerOperationId(null)}
        className="study-item-picker"
      >
        <div className="study-inspector-head">
          <span className="eyebrow">{t('ADD EXPERIMENT ITEM')}</span>
          <h2>{pickerOperation?.label}</h2>
          <p>
            {t(
              'Only items available for this Operation and Study context are shown.',
            )}
          </p>
        </div>
        <label className="study-picker-search">
          <Search size={14} />
          <input
            aria-label={t('Search applicable items')}
            placeholder={t('Search applicable items')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="study-picker-context">
          <span>{setup.area}</span>
          <span>{studySubjectLabel(setup, configuration)}</span>
          <span>{t('Subject grain')}</span>
        </div>
        <div className="study-picker-list">
          {pickerItems.length ? (
            pickerItems.map((item) => {
              const added =
                pickerOperation?.items.some(
                  (candidate) => candidate.id === item.id,
                ) ?? false;
              return (
                <button
                  key={item.id}
                  disabled={added}
                  onClick={() => {
                    void persist(
                      addStudySetupItem(
                        setup,
                        pickerOperationId!,
                        item,
                        configuration,
                      ),
                      `${item.label} added from resolved applicability.`,
                    );
                    setSelectedItemId(item.id);
                    setPickerOperationId(null);
                    setInspectorOpen(true);
                  }}
                >
                  <div>
                    <b>{item.label}</b>
                    <small>
                      {t(item.kind)} · {t(item.editor)}
                      {item.unit ? ` · ${item.unit}` : ''}
                    </small>
                  </div>
                  <span>
                    {added
                      ? t('Added')
                      : t('{0} · Subject', [t(item.intentRole)])}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="study-picker-empty">
              <b>{t('No experiment items are available.')}</b>
              <p>
                {t(
                  'Review this Operation or ask a Reference Studio administrator to check its availability.',
                )}
              </p>
            </div>
          )}
        </div>
      </InspectorDrawer>

      <InspectorDrawer
        open={inspectorOpen && Boolean(selected)}
        title={t('Study Setup Inspector')}
        onClose={() => setInspectorOpen(false)}
        className="study-setup-inspector"
      >
        {selected && (
          <>
            <div className="study-inspector-head">
              <span className="eyebrow">{t('STUDY SETUP INSPECTOR')}</span>
              <h2>{selected.label}</h2>
              <p>
                {selectedOperation?.label} {t('· default experimental context')}
              </p>
            </div>
            <section>
              <h3>{t('Study Default')}</h3>
              <strong className="study-inspector-value">
                {selected.value}
                {selected.unit ? ` ${selected.unit}` : ''}
              </strong>
            </section>
            <section>
              <h3>{t('Definition')}</h3>
              <dl>
                <div>
                  <dt>{t('Data Type')}</dt>
                  <dd>{selected.editor}</dd>
                </div>
                <div>
                  <dt>{t('Unit')}</dt>
                  <dd>{selected.unit || '—'}</dd>
                </div>
                <div>
                  <dt>{t('Semantic Type')}</dt>
                  <dd>{selected.kind}</dd>
                </div>
                <div>
                  <dt>{t('Allowed Grain')}</dt>
                  <dd>{t('Subject')}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h3>{t('Experimental Intent')}</h3>
              <span
                className={`study-intent ${selected.intentRole === 'VARIED' ? 'varied' : ''}`}
              >
                {selected.intentRole === 'VARIED' && '◆ '}
                {t(selected.intentRole)}
              </span>
              <p>
                {t(
                  'Configured scientific intent; it is not inferred from differing values.',
                )}
              </p>
            </section>
            <section>
              <h3>{t('Reference → Applicability → Study Default')}</h3>
              <dl>
                <div>
                  <dt>{t('Defined in')}</dt>
                  <dd>{t('Reference Studio')}</dd>
                </div>
                <div>
                  <dt>{t('Applicable because')}</dt>
                  <dd>
                    {setup.area} · {selectedOperation?.label} ·{' '}
                    {studySubjectLabel(setup, configuration)} {t('· Subject')}
                  </dd>
                </div>
                <div>
                  <dt>{t('Definition Revision')}</dt>
                  <dd>{selected.definitionRevisionId}</dd>
                </div>
                <div>
                  <dt>{t('Package Version')}</dt>
                  <dd>{setup.configurationPackageVersionId}</dd>
                </div>
                <div>
                  <dt>{t('Exact pin available')}</dt>
                  <dd>
                    {definitionAvailableInPinnedPackage(selected, configuration)
                      ? t('Yes')
                      : t('Unavailable')}
                  </dd>
                </div>
              </dl>
            </section>
            <button
              className="study-remove-item"
              onClick={() => {
                void persist(
                  removeStudySetupItem(setup, selected.id),
                  `${selected.label} removed from future Run defaults.`,
                );
                setInspectorOpen(false);
                setSelectedItemId(null);
              }}
            >
              <Trash2 size={14} /> {t('Remove from Study Setup')}
            </button>
          </>
        )}
      </InspectorDrawer>
    </section>
  );
}

function StudySetupValueEditor({
  item,
  onCommit,
}: {
  item: StudySetupItem;
  onCommit: (value: string) => void;
}) {
  const { t } = useLocale();
  const [value, setValue] = useState(item.value);
  if (item.editor === 'BOOLEAN')
    return (
      <select
        aria-label={t('{0} default', [item.label])}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onCommit(event.target.value);
        }}
      >
        <option value="true">{t('True')}</option>
        <option value="false">{t('False')}</option>
      </select>
    );
  if (
    (item.editor === 'SELECT' || item.editor === 'REFERENCE') &&
    item.options.length
  )
    return (
      <select
        aria-label={t('{0} default', [item.label])}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onCommit(event.target.value);
        }}
      >
        {item.options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  return (
    <div className="study-value-editor">
      <input
        aria-label={t('{0} default', [item.label])}
        inputMode={item.editor === 'NUMBER' ? 'decimal' : 'text'}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value !== item.value) onCommit(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && value !== item.value) onCommit(value);
        }}
      />
      {item.unit && <span>{item.unit}</span>}
    </div>
  );
}
