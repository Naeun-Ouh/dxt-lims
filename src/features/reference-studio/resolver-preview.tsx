import { useState } from 'react';
import { ArrowDown, Check, FlaskConical } from 'lucide-react';
import type {
  ApplicabilityResolutionContext,
  ApplicabilityRule,
} from '@/src/domain/reference';
import { resolverPreview } from './authoring-model';
import { NoticeBox, option } from './studio-ui';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export function ResolverPreview({
  onClose,
  initialPackageId,
  initialDefinitionId,
}: {
  onClose: () => void;
  initialPackageId?: string;
  initialDefinitionId?: string;
}) {
  const { application } = useDxtApplication();
  const studioRepository = application.repositories.configuration;
  const registry = studioRepository.getConfigurationRegistry();
  const active =
    registry.packages.find((item) => item.id === initialPackageId) ??
    registry.packages.find((item) => item.status === 'ACTIVE') ??
    registry.packages[0];
  const contextFor = (packageId: string) => {
    const pkg = registry.packages.find((item) => item.id === packageId)!;
    const rules = pkg.applicabilityRuleSetVersionIds.flatMap(
      (id) =>
        registry.applicabilityRuleSets.find((set) => set.id === id)?.rules ??
        [],
    );
    const rule =
      rules.find((item) => item.definitionRevisionId === initialDefinitionId) ??
      rules[0];
    return {
      configurationPackageVersionId: packageId,
      operationDefinitionRevisionId: rule.operationDefinitionRevisionIds[0],
      areaDefinitionRevisionId: rule.areaDefinitionRevisionIds[0],
      subjectTypeRevisionId: rule.subjectTypeRevisionIds[0],
      requestedGrainRevisionId: rule.grainDefinitionRevisionIds[0],
      equipmentReferenceId: rule.equipmentReferenceIds[0],
      moduleReferenceId: rule.moduleReferenceIds[0],
      experimentTypeProfileVersionId: rule.experimentTypeProfileVersionIds[0],
    } satisfies ApplicabilityResolutionContext;
  };
  const [context, setContext] = useState(() => contextFor(active.id));
  const pkg = registry.packages.find(
    (item) => item.id === context.configurationPackageVersionId,
  )!;
  const rules = pkg.applicabilityRuleSetVersionIds.flatMap(
    (id) =>
      registry.applicabilityRuleSets.find((set) => set.id === id)?.rules ?? [],
  );
  const values = (key: keyof ApplicabilityRule) =>
    Array.from(new Set(rules.flatMap((rule) => rule[key] as string[])));
  let results: ReturnType<typeof resolverPreview> = [],
    error = '';
  try {
    results = resolverPreview(context, studioRepository);
  } catch (e) {
    error = (e as Error).message;
  }
  const field = (
    label: string,
    key: keyof ApplicabilityResolutionContext,
    ids: string[],
  ) => (
    <label>
      {label}
      <select
        value={(context[key] as string) ?? ''}
        onChange={(e) =>
          setContext((current) => ({
            ...current,
            [key]: e.target.value || undefined,
          }))
        }
      >
        <option value="">Any</option>
        {ids.map((id) => option(id))}
      </select>
    </label>
  );
  return (
    <div className="rs-preview">
      <div className="rs-test-head">
        <div>
          <span className="rs-kicker">TEST CONFIGURATION</span>
          <h2>What will the Experiment Workspace receive?</h2>
          <p>
            Choose a configuration context and resolve the exact experimental
            items.
          </p>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="rs-test-pipeline">
        <section className="rs-test-context">
          <div className="rs-test-section-title">
            <span className="rs-kicker">TEST CONTEXT</span>
            <strong>Configuration Context</strong>
          </div>
          <div className="rs-test-fields">
            <label className="wide">
              Package Version
              <select
                value={context.configurationPackageVersionId}
                onChange={(e) => setContext(contextFor(e.target.value))}
              >
                {registry.packages.map((item) =>
                  option(
                    item.id,
                    `${item.packageId} · v${item.version} · ${item.status}`,
                  ),
                )}
              </select>
            </label>
            {field(
              'Area',
              'areaDefinitionRevisionId',
              values('areaDefinitionRevisionIds'),
            )}
            {field(
              'Operation',
              'operationDefinitionRevisionId',
              values('operationDefinitionRevisionIds'),
            )}
            {field(
              'Subject Type',
              'subjectTypeRevisionId',
              values('subjectTypeRevisionIds'),
            )}
            {field(
              'Grain',
              'requestedGrainRevisionId',
              values('grainDefinitionRevisionIds'),
            )}
            {field(
              'Equipment',
              'equipmentReferenceId',
              values('equipmentReferenceIds'),
            )}
            {field('Module', 'moduleReferenceId', values('moduleReferenceIds'))}
            {field(
              'Experiment Type',
              'experimentTypeProfileVersionId',
              values('experimentTypeProfileVersionIds'),
            )}
          </div>
        </section>
        <div className="rs-resolve-bridge">
          <span>Configuration Context</span>
          <ArrowDown size={18} />
          <strong>DXT Resolver</strong>
          <ArrowDown size={18} />
          <span>Engineering Workspace</span>
        </div>
        <section className="rs-workspace-receives">
          <div className="rs-test-section-title">
            <span className="rs-kicker">WORKSPACE RECEIVES</span>
            <strong>Applicable experimental items</strong>
            <small>{results.length} resolved</small>
          </div>
          {error && <NoticeBox notice={{ tone: 'error', text: error }} />}
          <div className="rs-resolver-output">
            <div className="rs-resolved rs-resolved-head">
              <span>Item</span>
              <span>Semantic type</span>
              <span>Intent</span>
              <span>Unit</span>
              <span>Validation</span>
            </div>
            {results.map((item) => (
              <div className="rs-resolved" key={item.revisionId}>
                <div>
                  <FlaskConical size={13} />
                  <strong>{item.label}</strong>
                </div>
                <span>{item.assignmentKind}</span>
                <span
                  className={`rs-intent-role ${item.defaultRole === 'VARIED' ? 'varied' : ''}`}
                >
                  {item.defaultRole === 'VARIED' && (
                    <span aria-hidden="true">◆</span>
                  )}
                  {item.defaultRole}
                </span>
                <span>{item.unit || '—'}</span>
                <span className="rs-validation-indicator">
                  {item.validationProfile ? (
                    <>
                      <Check size={12} />
                      {item.validationProfile.code}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
