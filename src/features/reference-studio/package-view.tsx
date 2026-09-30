import { useLocale } from '@/src/shared/i18n/locale';
import { canGovern } from './permissions';
import { useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { Badge } from '@/src/shared/ui/workspace';
import type { ConfigurationPackageVersion } from '@/src/domain/reference';
import {
  definitionRows,
  historicalRunSafety,
  packageAssembly,
  packagePrimarySummary,
  packageRunUsage,
  scopeLabel,
  titleFromId,
  validationChecks,
} from './authoring-model';
import { NoticeBox, statusTone, type Notice } from './studio-ui';
import { InspectorDrawer } from '@/src/shared/ui/inspector-drawer';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export function PackageView({
  selectedId,
  onSelect,
  refresh,
  initialValidation = false,
  initialReview = false,
  initialInspectorOpen = false,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  refresh: () => void;
  initialValidation?: boolean;
  initialReview?: boolean;
  initialInspectorOpen?: boolean;
}) {
  const { t } = useLocale();

  const { application, configurationCommands: studioCommands } =
    useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const registry = studioRepository.getConfigurationRegistry();
  const packages = registry.packages;
  const selected =
    packages.find((item) => item.id === selectedId) ?? packages[0];
  const [review, setReview] = useState(initialReview);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [draft, setDraft] = useState<{
    id: string;
    source: ConfigurationPackageVersion;
    version: number;
  } | null>(null);
  const [validated, setValidated] = useState<string | null>(() => {
    if (!initialValidation || !packages.some((p) => p.id === selectedId))
      return null;
    void studioCommands.validatePackageVersion(selectedId);
    return selectedId;
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [inspectorOpen, setInspectorOpen] = useState(
    initialInspectorOpen || initialValidation,
  );
  if (!selected)
    return <p>{t('No Configuration packages are visible in your scope.')}</p>;
  const primary = packagePrimarySummary(selected, studioRepository);
  const safety = historicalRunSafety(selected, studioRepository);
  const createDraft = async () => {
    try {
      const version =
        Math.max(
          ...packages
            .filter((item) => item.packageId === selected.packageId)
            .map((item) => item.version),
        ) + 1;
      const id = `draft-${selected.packageId}-v${version}`;
      await studioCommands.createDraftPackage({
        id,
        packageId: selected.packageId,
        targetVersion: version,
        scope: selected.scope,
      });
      setDraft({ id, source: selected, version });
      refresh();
      setNotice({
        tone: 'success',
        text: `Draft shell v${version} created. Assemble an exact manifest next.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  const assemble = async () => {
    try {
      if (!draft) throw new Error('Create a draft package first.');
      const id = `${draft.source.packageId}-v${draft.version}`;
      const assembly = packageAssembly(draft.source);
      assembly.definitionRevisionIds = Array.from(
        new Set([
          ...assembly.definitionRevisionIds,
          ...registry.definitionDescriptors
            .filter((descriptor) =>
              studioRepository.getDefinitionRevision(descriptor.revisionId),
            )
            .map((descriptor) => descriptor.revisionId),
        ]),
      );
      assembly.applicabilityRuleSetVersionIds =
        assembly.applicabilityRuleSetVersionIds.map((sourceId) => {
          const sourceSet = registry.applicabilityRuleSets.find(
            (item) => item.id === sourceId,
          );
          return (
            registry.applicabilityRuleSets
              .filter(
                (item) =>
                  item.status === 'DRAFT' && item.code === sourceSet?.code,
              )
              .sort((a, b) => b.version - a.version)[0]?.id ?? sourceId
          );
        });
      await studioCommands.assemblePackageVersion({
        draftId: draft.id,
        packageVersionId: id,
        assembly,
      });
      refresh();
      onSelect(id);
      setDraft(null);
      setValidated(null);
      setNotice({
        tone: 'success',
        text: `Package v${draft.version} assembled as immutable DRAFT.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  const validate = async () => {
    try {
      await studioCommands.validatePackageVersion(selected.id);
      setValidated(selected.id);
      setNotice({
        tone: 'success',
        text: `Package v${selected.version} passed every activation check.`,
      });
    } catch (error) {
      setValidated(null);
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  const activate = async () => {
    try {
      if (validated !== selected.id)
        throw new Error(
          'Validate this exact package version before activation.',
        );
      await studioCommands.activatePackageVersion(selected.id);
      refresh();
      setNotice({
        tone: 'success',
        text: `Package v${selected.version} activated atomically. Historical Run pins are unchanged.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  const deactivate = async () => {
    try {
      await studioCommands.deactivatePackageVersion(selected.id);
      refresh();
      setNotice({
        tone: 'success',
        text: `Package v${selected.version} is now INACTIVE.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  const manifest = [
    ['Subject Types', selected.subjectTypeRevisionIds],
    ['Areas', selected.departmentAreaProfileVersionIds],
    ['Experiment Type', selected.experimentTypeProfileVersionIds],
    ['Definitions', selected.definitionRevisionIds],
    ['Applicability Rule Sets', selected.applicabilityRuleSetVersionIds],
    ['Validation Profiles', selected.validationProfileVersionIds],
    ['Projection Profiles', selected.projectionProfileVersionIds],
    ['Next Action Types', selected.nextActionTypeRevisionIds],
  ] as const;
  if (review)
    return (
      <div className="rs-package-review">
        <div className="catalog-breadcrumb">
          <button onClick={() => setReview(false)}>
            {t('Reference Studio')}
          </button>{' '}
          / {selected.packageId} {t('/ Review')}
        </div>
        <header className="catalog-heading">
          <div>
            <h1>{t('Package Review')}</h1>
            <p>
              {titleFromId(selected.packageId)} {t('· v')}
              {selected.version}
            </p>
          </div>
          <div className="rs-toolbar-actions">
            <button onClick={() => setReview(false)}>{t('Cancel')}</button>
            <button onClick={validate}>{t('Validate exact version')}</button>
            <button
              className="rs-primary"
              disabled={
                selected.status === 'ACTIVE' ||
                validated !== selected.id ||
                !canGovern(
                  application,
                  'canActivatePackageVersion',
                  selected.scope,
                )
              }
              onClick={activate}
            >
              {t('Activate Package Version')}
            </button>
          </div>
        </header>
        {notice && <NoticeBox notice={notice} />}
        <section className="catalog-card">
          <h2>{t('Included Definitions')}</h2>
          <div className="rs-table-scroll">
            <table className="rs-table">
              <thead>
                <tr>
                  {[
                    'Definition',
                    'Semantic type',
                    'Data type',
                    'Unit',
                    'Revision',
                    'Status',
                  ].map((x) => (
                    <th key={x}>{t(x)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {definitionRows(studioRepository)
                  .filter((d) =>
                    selected.definitionRevisionIds.includes(d.revisionId),
                  )
                  .map((d) => (
                    <tr key={d.revisionId}>
                      <td>{d.name}</td>
                      <td>{d.semanticType}</td>
                      <td>{d.dataType}</td>
                      <td>{d.unit}</td>
                      <td>
                        {t('Rev.')}
                        {d.revision}
                      </td>
                      <td>{d.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="catalog-card">
          <h2>{t('Applicability Coverage')}</h2>
          <div className="rs-table-scroll">
            <table className="rs-table">
              <thead>
                <tr>
                  <th>{t('Rule Set')}</th>
                  <th>{t('Version')}</th>
                  <th>{t('Rules')}</th>
                  <th>{t('Definition revisions')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {registry.applicabilityRuleSets
                  .filter((r) =>
                    selected.applicabilityRuleSetVersionIds.includes(r.id),
                  )
                  .map((r) => (
                    <tr key={r.id}>
                      <td>{r.code}</td>
                      <td>
                        {t('v')}
                        {r.version}
                      </td>
                      <td>{r.rules.length}</td>
                      <td>
                        {
                          new Set(r.rules.map((x) => x.definitionRevisionId))
                            .size
                        }
                      </td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="catalog-review-bottom">
          <section className="catalog-card">
            <h2>{t('Readiness Checks')}</h2>
            <ul className="rs-checklist">
              {validationChecks.map((c) => (
                <li
                  key={t(c)}
                  className={validated === selected.id ? 'passed' : ''}
                >
                  {validated === selected.id ? (
                    <Check size={14} />
                  ) : (
                    <CircleAlert size={14} />
                  )}{' '}
                  {t(c)}
                </li>
              ))}
            </ul>
          </section>
          <section className="catalog-card">
            <h2>{t('Activation Safety')}</h2>
            <p>
              {t('Existing Runs pinned to earlier versions will not change.')}
            </p>
            <dl className="rs-facts">
              <div>
                <dt>{t('Status')}</dt>
                <dd>{selected.status}</dd>
              </div>
              <div>
                <dt>{t('Historical Runs')}</dt>
                <dd>{safety.historicalRuns}</dd>
              </div>
              <div>
                <dt>{t('Exact package version')}</dt>
                <dd>{selected.id}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    );
  return (
    <>
      <div className="rs-toolbar">
        <div>
          <span className="rs-kicker">{t('PACKAGE VERSIONS')}</span>
          <h2>{t('Release exact configuration graphs')}</h2>
          <p>
            {t(
              'Assemble, validate, and atomically activate immutable package versions.',
            )}
          </p>
        </div>
        <div className="rs-toolbar-actions">
          <button
            disabled={
              !canGovern(application, 'canCreatePackageVersion', selected.scope)
            }
            onClick={createDraft}
          >
            {t('Create Draft')}
          </button>
          <button
            disabled={
              !canGovern(
                application,
                'canCreatePackageVersion',
                draft?.source.scope ?? selected.scope,
              )
            }
            onClick={assemble}
          >
            {t('Assemble Version')}
          </button>
          <button className="rs-primary" onClick={validate}>
            {t('Validate')}
          </button>
        </div>
      </div>
      <div className="rs-content-grid inspector-optional">
        <div className="rs-grid-pane">
          {notice && <NoticeBox notice={notice} />}
          <div className="rs-filterbar">
            <label>
              <input
                aria-label={t('Search packages')}
                placeholder={t('Search packages')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label={t('Package status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t('All statuses')}</option>
              {['ACTIVE', 'DRAFT', 'INACTIVE'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="rs-table-scroll">
            <table className="rs-table package-table">
              <thead>
                <tr>
                  <th>{t('Package')}</th>
                  <th>{t('Version')}</th>
                  <th>{t('Scope')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Created')}</th>
                  <th>{t('Used by Runs')}</th>
                </tr>
              </thead>
              <tbody>
                {packages
                  .filter(
                    (p) =>
                      (statusFilter === 'ALL' || p.status === statusFilter) &&
                      `${p.packageId} ${p.id}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((pkg) => (
                    <tr
                      key={pkg.id}
                      className={selected.id === pkg.id ? 'selected' : ''}
                      onClick={() => {
                        onSelect(pkg.id);
                        setValidated(null);
                        setNotice(null);
                        setInspectorOpen(true);
                      }}
                    >
                      <td>
                        <button
                          className="catalog-text-button"
                          onClick={() => {
                            onSelect(pkg.id);
                            setInspectorOpen(true);
                          }}
                        >
                          {pkg.packageId}
                        </button>
                      </td>
                      <td>
                        {t('v')}
                        {pkg.version}
                      </td>
                      <td>{scopeLabel(pkg.scope)}</td>
                      <td>
                        <Badge tone={statusTone(pkg.status)}>
                          {pkg.status}
                        </Badge>
                      </td>
                      <td>{t('Registered')}</td>
                      <td>
                        <strong>
                          {packageRunUsage(pkg.id, studioRepository)}
                        </strong>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="rs-activation">
            <div>
              <span className="rs-kicker">{t('ACTIVATION SAFETY')}</span>
              <h3>
                {t('Existing Runs pinned to earlier versions will not change.')}
              </h3>
            </div>
            <dl>
              <div>
                <dt>{t('CURRENT ACTIVE')}</dt>
                <dd>
                  {safety.currentActive
                    ? `${titleFromId(safety.currentActive.packageId)} v${safety.currentActive.version}`
                    : 'None'}
                </dd>
              </div>
              <div>
                <dt>{t('PROPOSED / SELECTED')}</dt>
                <dd>
                  {titleFromId(selected.packageId)} {t('v')}
                  {selected.version}
                </dd>
              </div>
              <div>
                <dt>{t('HISTORICAL RUNS')}</dt>
                <dd>
                  {t('{0} Runs remain pinned', [safety.historicalRuns])}
                  {safety.pinnedVersions.length > 0
                    ? ` to v${safety.pinnedVersions.join(' / v')}`
                    : ''}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <InspectorDrawer
          closeIconSrc="/figma/catalog/close.svg"
          open={inspectorOpen}
          title={t('Package Version Inspector')}
          onClose={() => setInspectorOpen(false)}
          className="rs-definition-drawer"
        >
          <div className="rs-inspector">
            <div className="rs-inspector-head">
              <span className="rs-kicker">{t('PACKAGE VERSION')}</span>
              <h2>
                {titleFromId(selected.packageId)} {t('· v')}
                {selected.version}
              </h2>
              <p>{t('Configuration release status and business usage.')}</p>
            </div>
            <dl className="rs-package-primary">
              <div className="status">
                <dt>{t('Status')}</dt>
                <dd>
                  <Badge tone={statusTone(primary.status)}>
                    {primary.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>{t('Version')}</dt>
                <dd>
                  {t('v')}
                  {primary.version}
                </dd>
              </div>
              <div>
                <dt>{t('Scope')}</dt>
                <dd>{primary.scope}</dd>
              </div>
              <div>
                <dt>{t('Created')}</dt>
                <dd>{primary.created}</dd>
              </div>
              <div>
                <dt>{t('Used by Runs')}</dt>
                <dd>{primary.usedByRuns}</dd>
              </div>
            </dl>
            <div className="rs-composition-summary">
              <span>
                <strong>{primary.composition.definitions}</strong>{' '}
                {t('Definitions')}
              </span>
              <span>
                <strong>{primary.composition.ruleSets}</strong> {t('Rule Set')}
              </span>
              <span>
                <strong>{primary.composition.subjectTypes}</strong>{' '}
                {t('Subject Type')}
              </span>
              <span>
                <strong>{primary.composition.experimentTypes}</strong>{' '}
                {t('Experiment Type')}
              </span>
              <span>
                <strong>{primary.composition.validationProfiles}</strong>{' '}
                {t('Validation Profiles')}
              </span>
              <span>
                <strong>{primary.composition.projectionProfiles}</strong>{' '}
                {t('Projection Profile')}
              </span>
            </div>
            <div className="rs-inspector-section">
              <div className="rs-section-head">
                <h3>
                  {t(
                    notice?.tone === 'error'
                      ? 'Not Ready to Activate'
                      : validated === selected.id
                        ? 'Ready to Activate'
                        : 'Activation Readiness',
                  )}
                </h3>
                <span>{validated === selected.id ? 'READY' : 'VALIDATE'}</span>
              </div>
              <ul className="rs-checklist">
                {validationChecks.map((item) => (
                  <li
                    key={t(item)}
                    className={validated === selected.id ? 'passed' : ''}
                  >
                    {validated === selected.id ? (
                      <Check size={14} />
                    ) : (
                      <CircleAlert size={14} />
                    )}{' '}
                    {t(item)}
                  </li>
                ))}
              </ul>
              {notice?.tone === 'error' && (
                <div className="rs-validation-error">
                  <strong>{t('Activation blocked')}</strong>
                  <code>{notice.text}</code>
                </div>
              )}
            </div>
            <div className="rs-inspector-section rs-technical-manifest">
              <details>
                <summary>
                  <span>
                    <strong>{t('Technical Details')}</strong>
                    <small>{t('Exact manifest pins and dependency IDs')}</small>
                  </span>
                  <span>{t('View exact pins')}</span>
                </summary>
                <p className="mono rs-package-id">{selected.id}</p>
                {manifest.map(([label, ids]) => (
                  <details className="rs-manifest" key={label}>
                    <summary>
                      <span>{label}</span>
                      <strong>{ids.length}</strong>
                    </summary>
                    {ids.map((id) => (
                      <code key={id}>{id}</code>
                    ))}
                  </details>
                ))}
              </details>
            </div>
            <div className="rs-actions">
              <button onClick={() => setReview(true)}>
                {t('Review Package')}
              </button>
              {selected.status === 'ACTIVE' ? (
                <button
                  disabled={
                    !canGovern(
                      application,
                      'canActivatePackageVersion',
                      selected.scope,
                    )
                  }
                  onClick={deactivate}
                >
                  {t('Deactivate')}
                </button>
              ) : (
                <button
                  className="rs-primary"
                  disabled={
                    validated !== selected.id ||
                    !canGovern(
                      application,
                      'canActivatePackageVersion',
                      selected.scope,
                    )
                  }
                  onClick={activate}
                >
                  {t('Activate v')}
                  {selected.version}
                </button>
              )}
              <button onClick={validate}>{t('Validate exact version')}</button>
            </div>
          </div>
        </InspectorDrawer>
      </div>
    </>
  );
}
