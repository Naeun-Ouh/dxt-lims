import {
  resolveConfigurationApplicability,
  validateConfigurationPackageVersion,
  type ApplicabilityResolutionContext,
  type ApplicabilityRule,
  type ApplicabilityRuleSetVersion,
  type ConfigurationPackageVersion,
  type ConfigurationScope,
  type ConfigurationWriteRepository,
} from '@/src/domain/reference';
import { registeredConfigurationEditorKeys } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { runPlanningScenarios } from '@/src/features/run-registration/planning-model';
import { runStates } from '@/src/mock/experiments';

export function referenceCatalogFor(repository:ConfigurationWriteRepository){return (repository as ConfigurationWriteRepository & {referenceCatalog?:typeof definitions}).referenceCatalog??definitions;}

export type StudioSection = 'definitions' | 'applicability' | 'packages';
export type StudioDefinition = {
  stableId: string;
  revisionId: string;
  revision: number;
  name: string;
  semanticType:
    | 'SUBJECT TYPE'
    | 'OPERATION'
    | 'EXPERIMENTAL VARIABLE'
    | 'MEASUREMENT'
    | 'GRAIN';
  dataType: string;
  unit: string;
  grains: string[];
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  scope: ConfigurationScope;
  usedBy: number;
};

export const revisionNumber = (id: string) =>
  Number(id.match(/(?:-v|-r)(\d+)$/)?.[1] ?? 1);
export const stableIdentity = (id: string) => id.replace(/(?:-v|-r)\d+$/, '');
export const scopeLabel = (scope: ConfigurationScope) =>
  scope.kind === 'GLOBAL' ? 'GLOBAL' : `${scope.kind} / ${scope.ownerId}`;
export const titleFromId = (id: string) =>
  id
    .replace(
      /^(condition|parameter|operation|measurement-operation|subject|grain)-/,
      '',
    )
    .replace(/(?:-v|-r)\d+$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

function packageUsage(repository: ConfigurationWriteRepository, revisionId: string) {
  return repository
    .getConfigurationRegistry()
    .packages.filter((item) =>
      [...item.definitionRevisionIds, ...item.subjectTypeRevisionIds].includes(
        revisionId,
      ),
    ).length;
}
function activeStatus(repository: ConfigurationWriteRepository, revisionId: string) {
  const registry = repository.getConfigurationRegistry();
  return registry.packages.some(
    (item) =>
      item.status === 'ACTIVE' &&
      [...item.definitionRevisionIds, ...item.subjectTypeRevisionIds].includes(
        revisionId,
      ),
  )
    ? ('ACTIVE' as const)
    : ('INACTIVE' as const);
}

export function definitionRows(repository: ConfigurationWriteRepository): StudioDefinition[] {
  const definitions=referenceCatalogFor(repository);
  const registry = repository.getConfigurationRegistry();
  const descriptorRows: StudioDefinition[] = registry.definitionDescriptors.map(
    (descriptor) => {
      const condition = definitions.conditions.find(
        (item) => item.id === descriptor.revisionId,
      );
      return {
        stableId: stableIdentity(descriptor.revisionId),
        revisionId: descriptor.revisionId,
        revision: revisionNumber(descriptor.revisionId),
        name: descriptor.label,
        semanticType: 'EXPERIMENTAL VARIABLE',
        dataType: condition?.dataType ?? descriptor.editorKey,
        unit: descriptor.unit || '—',
        grains: descriptor.intrinsicAllowedGrainRevisionIds.map(
          (id) => registry.grains.find((grain) => grain.id === id)?.label ?? id,
        ),
        status: activeStatus(repository, descriptor.revisionId),
        scope: repository.getDefinitionRevision(descriptor.revisionId)
          ?.scope ??
          condition?.scope ?? { kind: 'GLOBAL' },
        usedBy: packageUsage(repository, descriptor.revisionId),
      };
    },
  );
  const subjects: StudioDefinition[] = registry.subjectTypes.map((item) => ({
    stableId: stableIdentity(item.id),
    revisionId: item.id,
    revision: item.version,
    name: item.label,
    semanticType: 'SUBJECT TYPE',
    dataType: 'REFERENCE',
    unit: '—',
    grains: item.assignmentGrainRevisionIds.map(
      (id) => registry.grains.find((grain) => grain.id === id)?.label ?? id,
    ),
    status: item.status,
    scope: item.scope,
    usedBy: packageUsage(repository, item.id),
  }));
  const grains: StudioDefinition[] = registry.grains.map((item) => ({
    stableId: stableIdentity(item.id),
    revisionId: item.id,
    revision: item.version,
    name: item.label,
    semanticType: 'GRAIN',
    dataType: item.kind,
    unit: '—',
    grains: [item.label],
    status: item.status,
    scope: item.scope,
    usedBy: registry.packages.filter((pkg) =>
      pkg.applicabilityRuleSetVersionIds.some((setId) =>
        registry.applicabilityRuleSets
          .find((set) => set.id === setId)
          ?.rules.some((rule) =>
            [
              ...rule.grainDefinitionRevisionIds,
              rule.defaultGrainRevisionId,
            ].includes(item.id),
          ),
      ),
    ).length,
  }));
  const operations: StudioDefinition[] = [
    ...definitions.operations,
    ...definitions.measurementOperations,
  ].map((item) => ({
    stableId: stableIdentity(item.id),
    revisionId: item.id,
    revision: item.version,
    name: item.name,
    semanticType: 'OPERATION',
    dataType: item.operationRole,
    unit: '—',
    grains: ['Subject'],
    status: item.active ? 'ACTIVE' : 'INACTIVE',
    scope: item.scope,
    usedBy: registry.departmentAreaProfiles.filter((profile) =>
      profile.operationDefinitionRevisionIds.includes(item.id),
    ).length,
  }));
  const measurements: StudioDefinition[] = definitions.parameters
    .filter((item) => item.semanticRole === 'MEASUREMENT')
    .map((item) => ({
      stableId: stableIdentity(item.id),
      revisionId: item.id,
      revision: item.version,
      name: item.name,
      semanticType: 'MEASUREMENT',
      dataType: item.dataType,
      unit: item.unitId
        ? (definitions.units.find((unit) => unit.id === item.unitId)?.symbol ??
          '—')
        : '—',
      grains: ['Subject', 'Site'],
      status: item.active ? 'ACTIVE' : 'INACTIVE',
      scope: item.scope,
      usedBy: registry.packages.filter((pkg) =>
        pkg.definitionRevisionIds.includes(item.id),
      ).length,
    }));
  return [
    ...subjects,
    ...operations,
    ...descriptorRows,
    ...measurements,
    ...grains,
  ].sort(
    (a, b) =>
      a.semanticType.localeCompare(b.semanticType) ||
      a.name.localeCompare(b.name),
  );
}

export type ApplicabilityRow = {
  rule: ApplicabilityRule;
  definition: string;
  area: string;
  operation: string;
  subject: string;
  grain: string;
  equipment: string;
  experimentType: string;
  validation: string;
  ruleSet: ApplicabilityRuleSetVersion;
};
const labels = <
  T extends { id: string; label?: string; name?: string; code?: string },
>(
  ids: readonly string[],
  records: readonly T[],
) =>
  ids
    .map((id) => {
      const item = records.find((record) => record.id === id);
      return item?.label ?? item?.name ?? item?.code ?? titleFromId(id);
    })
    .join(' · ') || 'Any';

export function applicabilityRows(
  definitionRevisionId: string | undefined,
  repository: ConfigurationWriteRepository,
): ApplicabilityRow[] {
  const definitions=referenceCatalogFor(repository);
  const registry = repository.getConfigurationRegistry();
  const operations = [
    ...definitions.operations,
    ...definitions.measurementOperations,
  ];
  return registry.applicabilityRuleSets.flatMap((ruleSet) =>
    ruleSet.rules
      .filter(
        (rule) =>
          !definitionRevisionId ||
          rule.definitionRevisionId === definitionRevisionId,
      )
      .map((rule) => ({
        rule,
        definition:
          registry.definitionDescriptors.find(
            (item) => item.revisionId === rule.definitionRevisionId,
          )?.label ?? titleFromId(rule.definitionRevisionId),
        area: labels(rule.areaDefinitionRevisionIds, definitions.areas),
        operation: labels(rule.operationDefinitionRevisionIds, operations),
        subject: labels(rule.subjectTypeRevisionIds, registry.subjectTypes),
        grain: labels(rule.grainDefinitionRevisionIds, registry.grains),
        equipment: labels(rule.equipmentReferenceIds, []),
        experimentType: labels(
          rule.experimentTypeProfileVersionIds,
          registry.experimentTypeProfiles,
        ),
        validation: rule.validationProfileVersionId
          ? (registry.validationProfiles.find(
              (item) => item.id === rule.validationProfileVersionId,
            )?.code ?? rule.validationProfileVersionId)
          : 'None',
        ruleSet,
      })),
  );
}

export function applicabilityContextSummary(definitionRevisionId: string, repository: ConfigurationWriteRepository) {
  const definition = definitionRows(repository).find(
    (item) => item.revisionId === definitionRevisionId,
  );
  if (!definition)
    throw new Error(`Unresolved Studio definition: ${definitionRevisionId}`);
  const rows = applicabilityRows(definitionRevisionId, repository);
  const current = [...rows].sort(
    (left, right) => right.ruleSet.version - left.ruleSet.version,
  )[0];
  if (!current) return { definition, context: null, behavior: null };
  return {
    definition,
    context: {
      area: current.area,
      operation: current.operation,
      subject: current.subject,
      grain: current.grain,
      equipment: current.equipment,
      experimentType: current.experimentType,
    },
    behavior: {
      role: current.rule.defaultRole,
      dataType: definition.dataType,
      unit: definition.unit,
      validation: current.validation,
    },
  };
}

export function resolverPreview(context: ApplicabilityResolutionContext, repository: ConfigurationWriteRepository) {
  return resolveConfigurationApplicability(repository, context);
}

export function packageRunUsage(packageVersionId: string, repository?:ConfigurationWriteRepository) {
  const usage=(repository as (ConfigurationWriteRepository & {runUsage?:Record<string,number>})|undefined)?.runUsage;
  if(usage)return usage[packageVersionId]??0;
  const ids = new Set<string>();
  Object.values(runPlanningScenarios).forEach((snapshot) => {
    if (snapshot.configurationPackageVersionId === packageVersionId)
      ids.add(snapshot.id);
  });
  runStates.forEach((state) => {
    if (state.run.configurationPackageVersionId === packageVersionId)
      ids.add(state.run.id);
  });
  return ids.size;
}

export function packagePrimarySummary(
  packageVersion: ConfigurationPackageVersion,
  repository?:ConfigurationWriteRepository,
) {
  return {
    packageName: packageVersion.packageId,
    version: packageVersion.version,
    status: packageVersion.status,
    scope: scopeLabel(packageVersion.scope),
    created: 'Registered',
    usedByRuns: packageRunUsage(packageVersion.id,repository),
    composition: {
      definitions: packageVersion.definitionRevisionIds.length,
      ruleSets: packageVersion.applicabilityRuleSetVersionIds.length,
      subjectTypes: packageVersion.subjectTypeRevisionIds.length,
      experimentTypes: packageVersion.experimentTypeProfileVersionIds.length,
      validationProfiles: packageVersion.validationProfileVersionIds.length,
      projectionProfiles: packageVersion.projectionProfileVersionIds.length,
    },
  };
}

export function historicalRunSafety(
  packageVersion: ConfigurationPackageVersion,
  repository: ConfigurationWriteRepository,
) {
  const related = repository
    .getConfigurationRegistry()
    .packages.filter(
      (item) =>
        item.packageId === packageVersion.packageId &&
        item.version < packageVersion.version,
    );
  return {
    currentActive:
      repository
        .getConfigurationRegistry()
        .packages.find(
          (item) =>
            item.packageId === packageVersion.packageId &&
            item.status === 'ACTIVE',
        ) ?? null,
    proposed: packageVersion,
    historicalRuns: related.reduce(
      (total, item) => total + packageRunUsage(item.id,repository),
      0,
    ),
    pinnedVersions: related
      .filter((item) => packageRunUsage(item.id,repository) > 0)
      .map((item) => item.version),
  };
}

export function packageAssembly(source: ConfigurationPackageVersion) {
  return {
    subjectTypeRevisionIds: [...source.subjectTypeRevisionIds],
    departmentAreaProfileVersionIds: [
      ...source.departmentAreaProfileVersionIds,
    ],
    experimentTypeProfileVersionIds: [
      ...source.experimentTypeProfileVersionIds,
    ],
    definitionRevisionIds: [...source.definitionRevisionIds],
    equipmentCapabilityProfileVersionIds: [
      ...source.equipmentCapabilityProfileVersionIds,
    ],
    applicabilityRuleSetVersionIds: [...source.applicabilityRuleSetVersionIds],
    validationProfileVersionIds: [...source.validationProfileVersionIds],
    projectionProfileVersionIds: [...source.projectionProfileVersionIds],
    nextActionTypeRevisionIds: [...source.nextActionTypeRevisionIds],
  };
}

export const validationChecks = [
  'Reference resolution',
  'Applicability conflict checks',
  'Grain resolution',
  'Editor key registration',
  'Package graph completeness',
] as const;

export function validateRuleCandidate(
  sourcePackage: ConfigurationPackageVersion,
  sourceRuleSet: ApplicabilityRuleSetVersion,
  candidateRule: ApplicabilityRule,
  repository: ConfigurationWriteRepository,
) {
  const definitions=referenceCatalogFor(repository);
  const registry = repository.getConfigurationRegistry();
  const candidateSet: ApplicabilityRuleSetVersion = {
    ...sourceRuleSet,
    id: `${sourceRuleSet.code}-preview-v${sourceRuleSet.version + 1}`,
    version: sourceRuleSet.version + 1,
    status: 'DRAFT',
    rules: [...sourceRuleSet.rules, candidateRule],
  };
  const candidatePackage: ConfigurationPackageVersion = {
    ...sourcePackage,
    id: `${sourcePackage.packageId}-preview`,
    status: 'DRAFT',
    definitionRevisionIds: Array.from(
      new Set([
        ...sourcePackage.definitionRevisionIds,
        candidateRule.definitionRevisionId,
      ]),
    ),
    applicabilityRuleSetVersionIds: [candidateSet.id],
  };
  validateConfigurationPackageVersion(
    candidatePackage,
    {
      ...registry,
      applicabilityRuleSets: [...registry.applicabilityRuleSets, candidateSet],
      packages: [...registry.packages, candidatePackage],
    },
    definitions,
    registeredConfigurationEditorKeys,
  );
  return candidateSet;
}
