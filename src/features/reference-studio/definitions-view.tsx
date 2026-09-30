/* oxlint-disable next/no-img-element -- Use the Figma search asset at intrinsic size. */
import { useLocale } from '@/src/shared/i18n/locale';
import { canGovern, governedScopes } from './permissions';
import { configurationScopeKey } from '@/src/application/configuration-permissions';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/src/shared/ui/workspace';
import { InspectorDrawer } from '@/src/shared/ui/inspector-drawer';
import { referenceCatalogFor } from './authoring-model';
import { definitionRows, applicabilityContextSummary } from './authoring-model';
import { NoticeBox, option, statusTone, type Notice } from './studio-ui';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export function DefinitionsView({
  selectedId,
  onSelect,
  onGoApplicability,
  refresh,
  initialInspectorOpen = false,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onGoApplicability: () => void;
  refresh: () => void;
  initialInspectorOpen?: boolean;
}) {
  const { t } = useLocale();

  const { application, configurationCommands: studioCommands } =
    useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const rows = definitionRows(studioRepository);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [dataFilter, setDataFilter] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(initialInspectorOpen);
  const [notice, setNotice] = useState<Notice>(null);
  const selected = rows.find((row) => row.revisionId === selectedId) ?? rows[0];
  const visible = rows.filter(
    (row) =>
      (filter === 'ALL' || row.semanticType === filter) &&
      (statusFilter === 'ALL' || row.status === statusFilter) &&
      (scopeFilter === 'ALL' || row.scope.kind === scopeFilter) &&
      (dataFilter === 'ALL' || row.dataType === dataFilter) &&
      `${row.name} ${row.revisionId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (!selected)
    return (
      <p>{t('No Configuration definitions are visible in your scope.')}</p>
    );
  const history = rows
    .filter((row) => row.stableId === selected.stableId)
    .sort((a, b) => b.revision - a.revision);
  const availability = applicabilityContextSummary(
    selected.revisionId,
    studioRepository,
  );
  const createRevision = async () => {
    try {
      const descriptor = studioRepository
        .getConfigurationRegistry()
        .definitionDescriptors.find(
          (item) => item.revisionId === selected.revisionId,
        );
      if (!descriptor)
        throw new Error(
          'This definition type is reference-only in the current authoring command boundary.',
        );
      const version = Math.max(...history.map((item) => item.revision)) + 1;
      const created = await studioCommands.createImmutableDefinitionRevision({
        definitionId: selected.stableId,
        version,
        scope: selected.scope,
        descriptor: {
          ...descriptor,
          revisionId: `${selected.stableId}-v${version}`,
          label: selected.name,
        },
      });
      refresh();
      onSelect(created.descriptor.revisionId);
      setInspectorOpen(true);
      setNotice({
        tone: 'success',
        text: `Revision ${version} created. The prior revision remains unchanged.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  return (
    <>
      <div className="rs-toolbar">
        <div>
          <span className="rs-kicker">{t('DEFINITIONS')}</span>
          <h2>{t('Experimental concepts')}</h2>
          <p>
            {t(
              'Stable concepts with immutable, package-addressable revisions.',
            )}
          </p>
        </div>
        <button
          className="rs-primary"
          disabled={!canGovern(application, 'canAuthorDefinition')}
          onClick={() => {
            setCreating(true);
            setInspectorOpen(true);
          }}
        >
          <Plus size={15} />
          {t('Create Definition')}
        </button>
      </div>
      <div className="rs-content-grid inspector-optional">
        <div className="rs-grid-pane">
          <div className="rs-filterbar">
            <label>
              <img src="/figma/catalog/search.svg" alt="" />
              <input
                aria-label={t('Search definitions')}
                placeholder={t('Search identity or name')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label={t('Definition type')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">{t('ALL')}</option>
              {[
                'SUBJECT TYPE',
                'OPERATION',
                'EXPERIMENTAL VARIABLE',
                'MEASUREMENT',
                'GRAIN',
              ].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
            <select
              aria-label={t('Status filter')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t('All statuses')}</option>
              {[...new Set(rows.map((r) => r.status))].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              aria-label={t('Scope')}
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="ALL">{t('All scopes')}</option>
              {[...new Set(rows.map((r) => r.scope.kind))].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              aria-label={t('Data type')}
              value={dataFilter}
              onChange={(e) => setDataFilter(e.target.value)}
            >
              <option value="ALL">{t('All data types')}</option>
              {[...new Set(rows.map((r) => r.dataType))].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <span>
              {visible.length} {t('revisions')}
            </span>
          </div>
          <div className="rs-table-scroll">
            <table className="rs-table definitions-table">
              <thead>
                <tr>
                  <th>{t('Name')}</th>
                  <th>{t('Semantic type')}</th>
                  <th>{t('Data type')}</th>
                  <th>{t('Unit')}</th>
                  <th>{t('Grain')}</th>
                  <th>{t('Scope')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Used by')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.revisionId}
                    className={
                      selected.revisionId === row.revisionId ? 'selected' : ''
                    }
                    onClick={() => {
                      onSelect(row.revisionId);
                      setCreating(false);
                      setNotice(null);
                      setInspectorOpen(true);
                    }}
                  >
                    <td>
                      <button
                        className="rs-definition-open"
                        aria-label={`Inspect ${row.name} revision ${row.revision}`}
                      >
                        <strong>{row.name}</strong>
                        <small>
                          {t('Revision')}
                          {row.revision}
                        </small>
                      </button>
                    </td>
                    <td>{row.semanticType}</td>
                    <td>{row.dataType}</td>
                    <td>{row.unit}</td>
                    <td>{row.grains.join(' · ')}</td>
                    <td>{row.scope.kind}</td>
                    <td>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </td>
                    <td>
                      {row.usedBy} {t('pkg')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <InspectorDrawer
        closeIconSrc="/figma/catalog/close.svg"
        open={inspectorOpen}
        title={t('Definition Inspector')}
        onClose={() => {
          setInspectorOpen(false);
          setCreating(false);
        }}
        className="rs-inspector rs-definition-drawer"
      >
        {creating ? (
          <CreateDefinitionForm
            onCancel={() => {
              setCreating(false);
              setInspectorOpen(false);
            }}
            onCreated={(id) => {
              refresh();
              onSelect(id);
              setCreating(false);
              setInspectorOpen(true);
              setNotice({
                tone: 'success',
                text: 'Definition revision created. Define its applicability next.',
              });
            }}
          />
        ) : (
          <>
            <div className="rs-inspector-head">
              <span className="rs-kicker">{t('DEFINITION INSPECTOR')}</span>
              <h2>{selected.name}</h2>
              <p>
                {selected.semanticType.toLowerCase()}{' '}
                {t('available through versioned configuration.')}
              </p>
            </div>
            {notice && <NoticeBox notice={notice} />}
            <div className="rs-inspector-section rs-core-definition">
              <div className="rs-section-head">
                <h3>{t('Core Definition')}</h3>
              </div>
              <dl className="rs-facts">
                <div>
                  <dt>{t('Semantic Type')}</dt>
                  <dd>{selected.semanticType}</dd>
                </div>
                <div>
                  <dt>{t('Data Type')}</dt>
                  <dd>{selected.dataType}</dd>
                </div>
                <div>
                  <dt>{t('Unit')}</dt>
                  <dd>{selected.unit}</dd>
                </div>
                <div>
                  <dt>{t('Allowed Grain')}</dt>
                  <dd>{selected.grains.join(' · ')}</dd>
                </div>
                <div>
                  <dt>{t('Scope')}</dt>
                  <dd>{selected.scope.kind}</dd>
                </div>
                <div>
                  <dt>{t('Status')}</dt>
                  <dd>
                    <Badge tone={statusTone(selected.status)}>
                      {selected.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rs-inspector-section rs-availability">
              <div className="rs-section-head">
                <h3>{t('Where It Can Be Used')}</h3>
              </div>
              {availability.context ? (
                <dl className="rs-facts">
                  <div>
                    <dt>{t('Area')}</dt>
                    <dd>{availability.context.area}</dd>
                  </div>
                  <div>
                    <dt>{t('Operation')}</dt>
                    <dd>{availability.context.operation}</dd>
                  </div>
                  <div>
                    <dt>{t('Subject / Grain')}</dt>
                    <dd>
                      {availability.context.subject} ·{' '}
                      {availability.context.grain}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Experiment Type')}</dt>
                    <dd>{availability.context.experimentType}</dd>
                  </div>
                </dl>
              ) : (
                <p className="rs-empty-availability">
                  {t('No applicability rule registered yet.')}
                </p>
              )}
            </div>
            <div className="rs-inspector-section rs-usage-summary">
              <div className="rs-section-head">
                <h3>{t('Usage')}</h3>
              </div>
              <p>
                <b>
                  {selected.usedBy} {t('Package Versions')}
                </b>
                <span>
                  {t(
                    'Available to downstream workspaces when their exact package and context resolve this Definition.',
                  )}
                </span>
              </p>
            </div>
            <div className="rs-separation">
              <strong>
                {t('Stable Concept')}
                <span>≠</span> {t('Immutable Revision')}
              </strong>
              <p>
                {t(
                  'The identity persists. Each change creates a separately addressable revision.',
                )}
              </p>
            </div>
            <details className="rs-technical-details">
              <summary>{t('Technical Details')}</summary>
              <dl>
                <div>
                  <dt>{t('Stable Concept ID')}</dt>
                  <dd>{selected.stableId}</dd>
                </div>
                <div>
                  <dt>{t('Revision ID')}</dt>
                  <dd>{selected.revisionId}</dd>
                </div>
              </dl>
            </details>
            <div className="rs-inspector-section">
              <div className="rs-section-head">
                <h3>{t('Revision history')}</h3>
                <span>{history.length}</span>
              </div>
              {history.map((item) => (
                <div className="rs-history" key={item.revisionId}>
                  <span>
                    {t('Rev')}
                    {item.revision}
                  </span>
                  <code>{item.revisionId}</code>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
              ))}
            </div>
            <div className="rs-actions">
              <button
                className="rs-primary"
                disabled={
                  !canGovern(application, 'canAuthorDefinition', selected.scope)
                }
                onClick={createRevision}
              >
                {t('Create New Revision')}
              </button>
              <button onClick={onGoApplicability}>
                {t('Define Applicability')}
              </button>
            </div>
          </>
        )}
      </InspectorDrawer>
    </>
  );
}

function CreateDefinitionForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useLocale();

  const { application, configurationCommands: studioCommands } =
    useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const definitions = referenceCatalogFor(studioRepository);
  const registry = studioRepository.getConfigurationRegistry();
  const authorScopes = governedScopes(application)
    .filter((p) => p.canAuthorDefinition)
    .map((p) => p.scope);
  const [form, setForm] = useState({
    name: '',
    dataType: 'NUMBER',
    unit: '',
    grain: registry.grains[0].id,
    editor: 'NUMBER',
    scope: application.configurationAuthoringBoundary
      ? authorScopes[0]
        ? configurationScopeKey(authorScopes[0])
        : ''
      : 'AREA',
  });
  const [notice, setNotice] = useState<Notice>(null);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectedScope = application.configurationAuthoringBoundary
    ? authorScopes.find((s) => configurationScopeKey(s) === form.scope)
    : form.scope === 'GLOBAL'
      ? { kind: 'GLOBAL' as const }
      : { kind: 'AREA' as const, ownerId: 'semiconductor-rd' };
  const submit = async () => {
    try {
      if (!selectedScope)
        throw new Error('No authorized definition scope selected.');
      if (!form.name.trim()) throw new Error('Name is required.');
      const stable = `definition-${form.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')}`;
      const revisionId = `${stable}-v1`;
      await studioCommands.createImmutableDefinitionRevision({
        definitionId: stable,
        version: 1,
        scope: selectedScope,
        descriptor: {
          revisionId,
          label: form.name.trim(),
          editorKey: form.editor,
          unitDefinitionRevisionId: form.unit || null,
          unit:
            definitions.units.find((item) => item.id === form.unit)?.symbol ??
            '',
          intrinsicAllowedGrainRevisionIds: [form.grain],
          intrinsicOptions: [],
        },
      });
      onCreated(revisionId);
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  return (
    <div className="rs-form">
      <div className="rs-inspector-head">
        <span className="rs-kicker">{t('CREATE DEFINITION')}</span>
        <h2>{t('New variable concept')}</h2>
        <p>{t('Applicability is authored separately.')}</p>
      </div>
      {notice && <NoticeBox notice={notice} />}
      <label>
        {t('Name')}
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={t('e.g. Exposure time')}
        />
      </label>
      <label>
        {t('Semantic kind')}
        <select disabled>
          <option value="Experimental Variable">
            {t('Experimental Variable')}
          </option>
        </select>
      </label>
      <label>
        {t('Data type')}
        <select
          value={form.dataType}
          onChange={(e) => {
            set('dataType', e.target.value);
            set('editor', e.target.value);
          }}
        >
          <option value="NUMBER">{t('NUMBER')}</option>
          <option value="TEXT">{t('TEXT')}</option>
          <option value="BOOLEAN">{t('BOOLEAN')}</option>
          <option value="SELECT">{t('SELECT')}</option>
        </select>
      </label>
      <label>
        {t('Unit')}
        <select value={form.unit} onChange={(e) => set('unit', e.target.value)}>
          <option value="">{t('No unit')}</option>
          {definitions.units.map((item) =>
            option(item.id, `${item.name} · ${item.dimension}`),
          )}
        </select>
      </label>
      <label>
        {t('Supported grain')}
        <select
          value={form.grain}
          onChange={(e) => set('grain', e.target.value)}
        >
          {registry.grains.map((item) => option(item.id, item.label))}
        </select>
      </label>
      <label>
        {t('Default editor')}
        <select
          value={form.editor}
          onChange={(e) => set('editor', e.target.value)}
        >
          {['NUMBER', 'TEXT', 'BOOLEAN', 'SELECT', 'REFERENCE'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        {t('Scope')}
        <select
          value={form.scope}
          onChange={(e) => set('scope', e.target.value)}
        >
          {application.configurationAuthoringBoundary ? (
            authorScopes.map((scope) => (
              <option
                key={configurationScopeKey(scope)}
                value={configurationScopeKey(scope)}
              >
                {configurationScopeKey(scope)}
              </option>
            ))
          ) : (
            <>
              <option value="AREA">{t('AREA')}</option>
              <option value="GLOBAL">{t('GLOBAL')}</option>
            </>
          )}
        </select>
      </label>
      <div className="rs-actions">
        <button
          className="rs-primary"
          disabled={
            !selectedScope ||
            !canGovern(application, 'canAuthorDefinition', selectedScope)
          }
          onClick={submit}
        >
          {t('Create Revision 1')}
        </button>
        <button onClick={onCancel}>{t('Cancel')}</button>
      </div>
      <p className="rs-guidance">
        <strong>{t('Next:')}</strong>{' '}
        {t('Define where this item is applicable.')}
      </p>
    </div>
  );
}
