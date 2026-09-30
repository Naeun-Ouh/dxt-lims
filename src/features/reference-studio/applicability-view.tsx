import { useLocale } from '@/src/shared/i18n/locale';
import { canGovern } from './permissions';
import { useId, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Badge } from '@/src/shared/ui/workspace';
import type { ApplicabilityRule } from '@/src/domain/reference';
import { referenceCatalogFor } from './authoring-model';
import {
  applicabilityContextSummary,
  applicabilityRows,
  definitionRows,
  stableIdentity,
  validateRuleCandidate,
  type StudioDefinition,
} from './authoring-model';
import { NoticeBox, option, statusTone, type Notice } from './studio-ui';
import { ResolverPreview } from './resolver-preview';
import { InspectorDrawer } from '@/src/shared/ui/inspector-drawer';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export function ApplicabilityView({
  selectedId,
  onSelect,
  onGoPackages,
  refresh,
  initialPreview = false,
  initialPreviewPackageId,
  initialInspectorOpen = false,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onGoPackages: () => void;
  refresh: () => void;
  initialPreview?: boolean;
  initialPreviewPackageId?: string;
  initialInspectorOpen?: boolean;
}) {
  const { t } = useLocale();

  const { application, configurationCommands: studioCommands } =
    useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const definitionsList = definitionRows(studioRepository).filter(
    (item) => item.semanticType === 'EXPERIMENTAL VARIABLE',
  );
  const selected =
    definitionsList.find((item) => item.revisionId === selectedId) ??
    definitionsList[0];
  const rows = selected
    ? applicabilityRows(selected.revisionId, studioRepository)
    : [];
  const summary = selected
    ? applicabilityContextSummary(selected.revisionId, studioRepository)
    : null;
  const newest = [...rows].sort(
    (a, b) => b.ruleSet.version - a.ruleSet.version,
  )[0];
  const [mode, setMode] = useState<'detail' | 'add' | 'preview'>(
    initialPreview ? 'preview' : 'detail',
  );
  const [notice, setNotice] = useState<Notice>(null);
  const [inspectorOpen, setInspectorOpen] = useState(initialInspectorOpen);
  if (!selected || !summary)
    return (
      <p>
        {t(
          'No applicable Configuration definitions are visible in your scope.',
        )}
      </p>
    );
  const duplicate = async () => {
    try {
      if (!newest) throw new Error('No previous rule set is available.');
      const registry = studioRepository.getConfigurationRegistry();
      const versions = registry.applicabilityRuleSets
        .filter((item) => item.code === newest.ruleSet.code)
        .map((item) => item.version);
      const version = Math.max(...versions) + 1;
      await studioCommands.createApplicabilityRuleSetVersion({
        ...newest.ruleSet,
        id: `${stableIdentity(newest.ruleSet.id)}-v${version}`,
        version,
        status: 'DRAFT',
        rules: newest.ruleSet.rules.map((rule, index) => ({
          ...rule,
          id: `${rule.id}-copy-${version}-${index + 1}`,
        })),
      });
      refresh();
      setNotice({
        tone: 'success',
        text: `Rule Set v${version} created as an immutable DRAFT copy.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  return (
    <>
      <div className="rs-toolbar">
        <div>
          <span className="rs-kicker">{t('APPLICABILITY')}</span>
          <h2>{t('Where can this definition be used?')}</h2>
          <p>
            {t(
              'Structured constraints determine what the Engineering Workspace receives.',
            )}
          </p>
        </div>
        <div className="rs-toolbar-actions">
          <button className="rs-test-action" onClick={() => setMode('preview')}>
            {t('Test Configuration')}
          </button>
          <button
            disabled={
              !newest ||
              !canGovern(
                application,
                'canManageApplicability',
                newest.ruleSet.scope,
              )
            }
            onClick={duplicate}
          >
            {t('Duplicate Previous')}
          </button>
          <button
            className="rs-primary"
            disabled={!canGovern(application, 'canManageApplicability')}
            onClick={() => setMode('add')}
          >
            <Plus size={15} />
            {t('Add Rule')}
          </button>
        </div>
      </div>
      {mode === 'preview' ? (
        <div className="rs-test-surface">
          <ResolverPreview
            onClose={() => setMode('detail')}
            initialPackageId={initialPreviewPackageId}
            initialDefinitionId={selectedId}
          />
        </div>
      ) : mode === 'add' ? (
        <div className="rs-wide-authoring-surface">
          <ApplicabilityForm
            definition={selected}
            onCancel={() => setMode('detail')}
            onAdded={(message) => {
              refresh();
              setMode('detail');
              setNotice({ tone: 'success', text: message });
            }}
          />
        </div>
      ) : (
        <div className="rs-content-grid inspector-optional">
          <div className="rs-grid-pane">
            <div className="rs-contextbar">
              <label>
                {t('Selected definition')}
                <select
                  value={selected.revisionId}
                  onChange={(e) => {
                    onSelect(e.target.value);
                    setNotice(null);
                  }}
                >
                  {definitionsList.map((item) =>
                    option(
                      item.revisionId,
                      `${item.name} · Rev ${item.revision}`,
                    ),
                  )}
                </select>
              </label>
              <div>
                <span>{t('Stable concept')}</span>
                <strong className="mono">{selected.stableId}</strong>
              </div>
              <div>
                <span>{t('Rule coverage')}</span>
                <strong>
                  {rows.length} {t('rules')}
                </strong>
              </div>
            </div>
            {notice && <NoticeBox notice={notice} />}
            <div className="rs-grid-label">
              <span>{t('RULE GRID')}</span>
              <strong>{t('Engineering authoring surface')}</strong>
            </div>
            <div className="rs-table-scroll">
              <table className="rs-table applicability-table">
                <thead>
                  <tr>
                    <th>{t('Operation')}</th>
                    <th>{t('Item')}</th>
                    <th>{t('Area')}</th>
                    <th>{t('Subject')}</th>
                    <th>{t('Grain')}</th>
                    <th>{t('Equipment / Module')}</th>
                    <th>{t('Experiment Type')}</th>
                    <th>{t('Default Role')}</th>
                    <th>{t('Validation')}</th>
                    <th>{t('Rule Set')}</th>
                    <th>{t('Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.ruleSet.id}-${row.rule.id}`}
                      onClick={() => setInspectorOpen(true)}
                    >
                      <td>
                        <button
                          className="catalog-text-button"
                          onClick={() => setInspectorOpen(true)}
                        >
                          {row.operation}
                        </button>
                      </td>
                      <td>
                        <strong>└ {row.definition}</strong>
                      </td>
                      <td>{row.area}</td>
                      <td>{row.subject}</td>
                      <td>{row.grain}</td>
                      <td>{row.equipment}</td>
                      <td>{row.experimentType}</td>
                      <td>
                        <IntentRole role={row.rule.defaultRole} />
                      </td>
                      <td>{row.validation}</td>
                      <td>
                        {t('v')}
                        {row.ruleSet.version}
                      </td>
                      <td>
                        <Badge tone={statusTone(row.ruleSet.status)}>
                          {row.ruleSet.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <InspectorDrawer
            closeIconSrc="/figma/catalog/close.svg"
            open={inspectorOpen}
            title={t('Applicability Inspector')}
            onClose={() => setInspectorOpen(false)}
            className="rs-definition-drawer"
          >
            <div className="rs-inspector">
              <>
                <div className="rs-inspector-head">
                  <span className="rs-kicker">
                    {t('APPLICABILITY INSPECTOR')}
                  </span>
                  <h2>{selected.name}</h2>
                  <p>
                    {t(
                      'Definition and use context remain separate versioned artifacts.',
                    )}
                  </p>
                </div>
                {summary.context && summary.behavior && (
                  <section className="rs-applicability-summary">
                    <div className="rs-summary-title">
                      <span className="rs-kicker">{t('CONTEXT SUMMARY')}</span>
                      <h3>
                        {summary.definition.name} {t('can be used when...')}
                      </h3>
                      <p>
                        {t(
                          'Human-readable interpretation of the current rule version.',
                        )}
                      </p>
                    </div>
                    <dl className="rs-summary-context">
                      <div>
                        <dt>{t('Area')}</dt>
                        <dd>{summary.context.area}</dd>
                      </div>
                      <div>
                        <dt>{t('Operation')}</dt>
                        <dd>{summary.context.operation}</dd>
                      </div>
                      <div>
                        <dt>{t('Subject')}</dt>
                        <dd>{summary.context.subject}</dd>
                      </div>
                      <div>
                        <dt>{t('Grain')}</dt>
                        <dd>{summary.context.grain}</dd>
                      </div>
                      <div className="wide">
                        <dt>{t('Equipment')}</dt>
                        <dd>{summary.context.equipment}</dd>
                      </div>
                      <div className="wide">
                        <dt>{t('Experiment Type')}</dt>
                        <dd>{summary.context.experimentType}</dd>
                      </div>
                    </dl>
                    <div className="rs-summary-behavior">
                      <span className="rs-kicker">
                        {t('DEFAULT EXPERIMENTAL INTENT')}
                      </span>
                      <dl>
                        <div>
                          <dt>{t('Role')}</dt>
                          <dd>
                            <IntentRole role={summary.behavior.role} />
                          </dd>
                        </div>
                        <div>
                          <dt>{t('Data Type')}</dt>
                          <dd>{summary.behavior.dataType}</dd>
                        </div>
                        <div>
                          <dt>{t('Unit')}</dt>
                          <dd>{summary.behavior.unit}</dd>
                        </div>
                        <div>
                          <dt>{t('Validation')}</dt>
                          <dd>{summary.behavior.validation}</dd>
                        </div>
                      </dl>
                      <p>
                        {t(
                          'Experimental role — configured intent for this item.',
                        )}
                      </p>
                    </div>
                  </section>
                )}
                <dl className="rs-facts">
                  <div>
                    <dt>{t('Definition revision')}</dt>
                    <dd>{selected.revisionId}</dd>
                  </div>
                  <div>
                    <dt>{t('Applicable rules')}</dt>
                    <dd>{rows.length}</dd>
                  </div>
                  <div>
                    <dt>{t('Latest rule set')}</dt>
                    <dd>
                      {newest
                        ? `${newest.ruleSet.code} v${newest.ruleSet.version}`
                        : 'None'}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Status')}</dt>
                    <dd>
                      {newest && (
                        <Badge tone={statusTone(newest.ruleSet.status)}>
                          {newest.ruleSet.status}
                        </Badge>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="rs-inspector-section">
                  <h3>{t('Authoring boundary')}</h3>
                  <ul className="rs-checklist">
                    <li>
                      <Check size={14} />
                      {t('Structured selectors only')}
                    </li>
                    <li>
                      <Check size={14} />
                      {t('Default role is explicit')}
                    </li>
                    <li>
                      <Check size={14} />
                      {t('Changes create a new rule set version')}
                    </li>
                  </ul>
                </div>
                <div className="rs-actions">
                  <button
                    className="rs-primary"
                    disabled={!canGovern(application, 'canManageApplicability')}
                    onClick={() => setMode('add')}
                  >
                    {t('Create New Rule Set Version')}
                  </button>
                  <button onClick={onGoPackages}>{t('View Packages')}</button>
                </div>
              </>
            </div>
          </InspectorDrawer>
        </div>
      )}
    </>
  );
}

function IntentRole({ role }: { role: 'FIXED' | 'VARIED' }) {
  const { t } = useLocale();

  return (
    <span
      className={`rs-intent-role ${role === 'VARIED' ? 'varied' : ''}`}
      title={t('Experimental role — configured intent for this item.')}
    >
      {role === 'VARIED' && <span aria-hidden="true">◆</span>}
      {role}
    </span>
  );
}

function ApplicabilityForm({
  definition,
  onCancel,
  onAdded,
}: {
  definition: StudioDefinition;
  onCancel: () => void;
  onAdded: (message: string) => void;
}) {
  const { t } = useLocale();

  const { application, configurationCommands: studioCommands } =
    useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const definitions = referenceCatalogFor(studioRepository);
  const registry = studioRepository.getConfigurationRegistry();
  const baselinePackage =
    registry.packages.find((item) =>
      item.definitionRevisionIds.includes(definition.revisionId),
    ) ??
    registry.packages.find(
      (item) =>
        item.status === 'ACTIVE' &&
        (definition.scope.kind === 'GLOBAL' ||
          (item.scope.kind !== 'GLOBAL' &&
            item.scope.ownerId === definition.scope.ownerId)),
    );
  const baselineSet =
    baselinePackage &&
    registry.applicabilityRuleSets.find((item) =>
      baselinePackage.applicabilityRuleSetVersionIds.includes(item.id),
    );
  const baselineSource =
    baselineSet?.rules.find(
      (item) => item.definitionRevisionId === definition.revisionId,
    ) ?? baselineSet?.rules[0];
  const [form, setForm] = useState({
    area: baselineSource?.areaDefinitionRevisionIds[0] ?? '',
    operation: baselineSource?.operationDefinitionRevisionIds[0] ?? '',
    subject:
      baselineSource?.subjectTypeRevisionIds[0] ??
      registry.subjectTypes[0]?.id ??
      '',
    grain:
      baselineSource?.defaultGrainRevisionId ?? registry.grains[0]?.id ?? '',
    equipment: baselineSource?.equipmentReferenceIds[0] ?? '',
    module: baselineSource?.moduleReferenceIds[0] ?? '',
    experiment: baselineSource?.experimentTypeProfileVersionIds[0] ?? '',
    role: baselineSource?.defaultRole ?? 'FIXED',
    validation: baselineSource?.validationProfileVersionId ?? '',
    defaultValue: baselineSource?.defaultValue ?? '',
  });
  const pkg =
    registry.packages.find(
      (item) =>
        item.status === 'ACTIVE' &&
        item.experimentTypeProfileVersionIds.includes(form.experiment),
    ) ?? baselinePackage;
  const setVersion =
    pkg &&
    registry.applicabilityRuleSets.find((item) =>
      pkg.applicabilityRuleSetVersionIds.includes(item.id),
    );
  const source = setVersion?.rules.find(
    (item) => item.definitionRevisionId === definition.revisionId,
  );
  const [notice, setNotice] = useState<Notice>(null);
  const ruleSeed = useId().replaceAll(':', '');
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const candidate = (): ApplicabilityRule => ({
    id: `rule-${definition.stableId}-${ruleSeed}`,
    definitionRevisionId: definition.revisionId,
    operationDefinitionRevisionIds: [form.operation],
    areaDefinitionRevisionIds: [form.area],
    subjectTypeRevisionIds: [form.subject],
    grainDefinitionRevisionIds: [form.grain],
    equipmentReferenceIds: form.equipment ? [form.equipment] : [],
    moduleReferenceIds: form.module ? [form.module] : [],
    experimentTypeProfileVersionIds: [form.experiment],
    assignmentKind: source?.assignmentKind ?? 'CONDITION',
    assignmentReferenceRevisionId:
      source?.assignmentReferenceRevisionId ?? definition.revisionId,
    defaultValue: form.defaultValue,
    defaultGrainRevisionId: form.grain,
    defaultRole: form.role as 'FIXED' | 'VARIED',
    contextualOptions: source?.contextualOptions ?? [],
    validationProfileVersionId: form.validation || null,
  });
  const validate = () => {
    try {
      if (!pkg || !setVersion)
        throw new Error('No compatible package baseline is available.');
      validateRuleCandidate(pkg, setVersion, candidate(), studioRepository);
      setNotice({
        tone: 'success',
        text: 'Rule is valid. No graph or equal-specificity conflicts found.',
      });
      return true;
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
      return false;
    }
  };
  const add = async () => {
    if (!validate() || !setVersion) return;
    try {
      const versions = registry.applicabilityRuleSets
        .filter((item) => item.code === setVersion.code)
        .map((item) => item.version);
      const version = Math.max(...versions) + 1;
      await studioCommands.createApplicabilityRuleSetVersion({
        ...setVersion,
        id: `${stableIdentity(setVersion.id)}-v${version}`,
        version,
        status: 'DRAFT',
        rules: [...setVersion.rules, candidate()],
      });
      onAdded(
        `Rule added to immutable Rule Set v${version}. Assemble it into a package to release it.`,
      );
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message });
    }
  };
  const operations = [
    ...definitions.operations,
    ...definitions.measurementOperations,
  ];
  return (
    <div className="rs-form">
      <div className="rs-inspector-head">
        <span className="rs-kicker">{t('CREATE APPLICABILITY')}</span>
        <h2>{definition.name}</h2>
        <p>{t('Creates a new immutable Rule Set version.')}</p>
      </div>
      {notice && <NoticeBox notice={notice} />}
      <label>
        {t('Area')}
        <select
          value={form.area}
          onChange={(e) => update('area', e.target.value)}
        >
          {definitions.areas.map((item) => option(item.id, item.name))}
        </select>
      </label>
      <label>
        {t('Operation')}
        <select
          value={form.operation}
          onChange={(e) => update('operation', e.target.value)}
        >
          {operations
            .filter((item) => !form.area || item.areaDefinitionId === form.area)
            .map((item) => option(item.id, item.name))}
        </select>
      </label>
      <label>
        {t('Subject Type')}
        <select
          value={form.subject}
          onChange={(e) => update('subject', e.target.value)}
        >
          {registry.subjectTypes.map((item) => option(item.id, item.label))}
        </select>
      </label>
      <label>
        {t('Grain')}
        <select
          value={form.grain}
          onChange={(e) => update('grain', e.target.value)}
        >
          {registry.grains.map((item) => option(item.id, item.label))}
        </select>
      </label>
      <label>
        {t('Equipment')}
        <select
          value={form.equipment}
          onChange={(e) => update('equipment', e.target.value)}
        >
          <option value="">{t('Any')}</option>
          {registry.equipmentCapabilityProfiles
            .filter((item) =>
              item.operationDefinitionRevisionIds.includes(form.operation),
            )
            .map((item) => option(item.equipmentReferenceId))}
        </select>
      </label>
      <label>
        {t('Module')}
        <select
          value={form.module}
          onChange={(e) => update('module', e.target.value)}
        >
          <option value="">{t('Any')}</option>
          {registry.equipmentCapabilityProfiles
            .flatMap((item) => item.moduleReferenceIds)
            .map((id) => option(id))}
        </select>
      </label>
      <label>
        {t('Experiment Type')}
        <select
          value={form.experiment}
          onChange={(e) => update('experiment', e.target.value)}
        >
          {registry.experimentTypeProfiles.map((item) =>
            option(item.id, item.code),
          )}
        </select>
      </label>
      <div className="rs-form-split">
        <label>
          {t('Default Role')}
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
          >
            <option value="FIXED">{t('FIXED')}</option>
            <option value="VARIED">{t('VARIED')}</option>
          </select>
        </label>
        <label>
          {t('Validation Profile')}
          <select
            value={form.validation}
            onChange={(e) => update('validation', e.target.value)}
          >
            <option value="">{t('None')}</option>
            {registry.validationProfiles.map((item) =>
              option(item.id, item.code),
            )}
          </select>
        </label>
      </div>
      <label>
        {t('Default value')}
        <input
          value={form.defaultValue}
          onChange={(e) => update('defaultValue', e.target.value)}
        />
      </label>
      <div className="rs-actions">
        <button onClick={validate}>{t('Validate Rule')}</button>
        <button
          className="rs-primary"
          disabled={
            !setVersion ||
            !canGovern(application, 'canManageApplicability', setVersion.scope)
          }
          onClick={add}
        >
          {t('Add to Draft Rule Set')}
        </button>
        <button onClick={onCancel}>{t('Cancel')}</button>
      </div>
    </div>
  );
}
