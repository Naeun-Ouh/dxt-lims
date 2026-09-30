import { z } from 'zod';
import type { ReferenceCatalog } from './index';

const idSchema = z.string().min(1);
const scopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('GLOBAL') }),
  z.object({ kind: z.literal('AREA'), ownerId: idSchema }),
  z.object({ kind: z.literal('TEAM'), ownerId: idSchema }),
  z.object({ kind: z.literal('USER'), ownerId: idSchema }),
]);

const statusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);
const versionedFields = {
  id: idSchema,
  code: idSchema,
  version: z.number().int().positive(),
  scope: scopeSchema,
  status: statusSchema,
};
const stringOptionsSchema = z.array(
  z.object({
    value: idSchema,
    label: idSchema,
    referenceId: idSchema.optional(),
  }),
);

export const grainDefinitionRevisionSchema = z.object({
  ...versionedFields,
  label: idSchema,
  kind: z.enum(['ASSIGNMENT', 'OBSERVATION', 'BOTH']),
});
export const subjectTypeDefinitionRevisionSchema = z.object({
  ...versionedFields,
  label: idSchema,
  assignmentGrainRevisionIds: z.array(idSchema).min(1),
  observationGrainRevisionIds: z.array(idSchema),
});
export const departmentAreaProfileVersionSchema = z.object({
  ...versionedFields,
  areaDefinitionRevisionIds: z.array(idSchema).min(1),
  subjectTypeRevisionIds: z.array(idSchema).min(1),
  operationDefinitionRevisionIds: z.array(idSchema).min(1),
});
export const experimentTypeProfileVersionSchema = z.object({
  ...versionedFields,
  experimentTypeDefinitionRevisionId: idSchema,
  departmentAreaProfileVersionIds: z.array(idSchema).min(1),
  subjectTypeRevisionIds: z.array(idSchema).min(1),
});
export const equipmentCapabilityProfileVersionSchema = z.object({
  ...versionedFields,
  equipmentReferenceId: idSchema,
  moduleReferenceIds: z.array(idSchema),
  operationDefinitionRevisionIds: z.array(idSchema).min(1),
  recipeReferenceRevisionIds: z.array(idSchema),
  definitionRevisionIds: z.array(idSchema),
});
export const validationProfileVersionSchema = z.object({
  ...versionedFields,
  editorKey: idSchema,
  unitDefinitionRevisionId: idSchema.nullable(),
  required: z.boolean(),
});
export const projectionProfileVersionSchema = z.object({
  ...versionedFields,
  workspaceProjectionKey: idSchema,
  editorKeys: z.array(idSchema),
});
export const configurationDefinitionDescriptorSchema = z.object({
  revisionId: idSchema,
  label: idSchema,
  editorKey: idSchema,
  unitDefinitionRevisionId: idSchema.nullable(),
  unit: z.string(),
  intrinsicAllowedGrainRevisionIds: z.array(idSchema).min(1),
  intrinsicOptions: stringOptionsSchema,
});
export const applicabilityRuleSchema = z.object({
  id: idSchema,
  definitionRevisionId: idSchema,
  operationDefinitionRevisionIds: z.array(idSchema).min(1),
  areaDefinitionRevisionIds: z.array(idSchema),
  subjectTypeRevisionIds: z.array(idSchema),
  grainDefinitionRevisionIds: z.array(idSchema),
  equipmentReferenceIds: z.array(idSchema),
  moduleReferenceIds: z.array(idSchema),
  experimentTypeProfileVersionIds: z.array(idSchema),
  assignmentKind: z.enum(['RECIPE', 'CONDITION', 'MATERIAL', 'RESOURCE']),
  assignmentReferenceRevisionId: idSchema,
  defaultValue: z.string(),
  defaultGrainRevisionId: idSchema,
  defaultRole: z.enum(['FIXED', 'VARIED']),
  contextualOptions: stringOptionsSchema,
  validationProfileVersionId: idSchema.nullable(),
});
export const applicabilityRuleSetVersionSchema = z.object({
  ...versionedFields,
  rules: z.array(applicabilityRuleSchema),
});
export const configurationPackageVersionSchema = z.object({
  id: idSchema,
  packageId: idSchema,
  version: z.number().int().positive(),
  scope: scopeSchema,
  status: statusSchema,
  subjectTypeRevisionIds: z.array(idSchema),
  departmentAreaProfileVersionIds: z.array(idSchema),
  experimentTypeProfileVersionIds: z.array(idSchema),
  definitionRevisionIds: z.array(idSchema),
  equipmentCapabilityProfileVersionIds: z.array(idSchema),
  applicabilityRuleSetVersionIds: z.array(idSchema),
  validationProfileVersionIds: z.array(idSchema),
  projectionProfileVersionIds: z.array(idSchema),
  nextActionTypeRevisionIds: z.array(idSchema),
});
export const scopedRevisionReferenceSchema = z.object({
  id: idSchema,
  scope: scopeSchema,
});

export type GrainDefinitionRevision = z.infer<
  typeof grainDefinitionRevisionSchema
>;
export type SubjectTypeDefinitionRevision = z.infer<
  typeof subjectTypeDefinitionRevisionSchema
>;
export type DepartmentAreaProfileVersion = z.infer<
  typeof departmentAreaProfileVersionSchema
>;
export type ExperimentTypeProfileVersion = z.infer<
  typeof experimentTypeProfileVersionSchema
>;
export type EquipmentCapabilityProfileVersion = z.infer<
  typeof equipmentCapabilityProfileVersionSchema
>;
export type ValidationProfileVersion = z.infer<
  typeof validationProfileVersionSchema
>;
export type ProjectionProfileVersion = z.infer<
  typeof projectionProfileVersionSchema
>;
export type ConfigurationDefinitionDescriptor = z.infer<
  typeof configurationDefinitionDescriptorSchema
>;
export type ApplicabilityRule = z.infer<typeof applicabilityRuleSchema>;
export type ApplicabilityRuleSetVersion = z.infer<
  typeof applicabilityRuleSetVersionSchema
>;
export type ConfigurationPackageVersion = z.infer<
  typeof configurationPackageVersionSchema
>;
export type ConfigurationScope = z.infer<typeof scopeSchema>;

export type ConfigurationRegistry = {
  packages: ConfigurationPackageVersion[];
  subjectTypes: SubjectTypeDefinitionRevision[];
  grains: GrainDefinitionRevision[];
  departmentAreaProfiles: DepartmentAreaProfileVersion[];
  experimentTypeProfiles: ExperimentTypeProfileVersion[];
  equipmentCapabilityProfiles: EquipmentCapabilityProfileVersion[];
  applicabilityRuleSets: ApplicabilityRuleSetVersion[];
  validationProfiles: ValidationProfileVersion[];
  projectionProfiles: ProjectionProfileVersion[];
  definitionDescriptors: ConfigurationDefinitionDescriptor[];
  externalReferences: Array<z.infer<typeof scopedRevisionReferenceSchema>>;
};

export type ApplicabilityResolutionContext = {
  configurationPackageVersionId: string;
  operationDefinitionRevisionId: string;
  areaDefinitionRevisionId: string;
  subjectTypeRevisionId: string;
  requestedGrainRevisionId: string;
  equipmentReferenceId?: string;
  moduleReferenceId?: string;
  experimentTypeProfileVersionId: string;
};
export type ResolvedApplicableDefinition = ConfigurationDefinitionDescriptor & {
  applicabilityRuleId: string;
  assignmentKind: ApplicabilityRule['assignmentKind'];
  assignmentReferenceRevisionId: string;
  defaultValue: string;
  defaultGrainRevisionId: string;
  defaultRole: ApplicabilityRule['defaultRole'];
  allowedOptions: z.infer<typeof stringOptionsSchema>;
  validationProfile: ValidationProfileVersion | null;
};

function exact<T extends { id: string }>(
  items: readonly T[],
  id: string,
  kind: string,
): T {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`Unresolved pinned ${kind}: ${id}`);
  return found;
}
function exactDescriptor(
  items: readonly ConfigurationDefinitionDescriptor[],
  revisionId: string,
) {
  const found = items.find((item) => item.revisionId === revisionId);
  if (!found)
    throw new Error(`Unresolved pinned definition descriptor: ${revisionId}`);
  return found;
}
function scopeKey(scope: ConfigurationScope) {
  return `${scope.kind}:${'ownerId' in scope ? scope.ownerId : ''}`;
}
function compatibleScope(
  packageScope: ConfigurationScope,
  artifactScope: ConfigurationScope,
) {
  return (
    artifactScope.kind === 'GLOBAL' ||
    scopeKey(packageScope) === scopeKey(artifactScope)
  );
}
function allCatalogRevisions(catalog: ReferenceCatalog) {
  return Object.values(catalog).flatMap((items) =>
    items.map((item) => ({ id: item.id, scope: item.scope })),
  );
}
function intersectOptions(
  intrinsic: ResolvedApplicableDefinition['allowedOptions'],
  contextual: ResolvedApplicableDefinition['allowedOptions'],
) {
  if (!intrinsic.length) return contextual;
  if (!contextual.length) return intrinsic;
  const allowed = new Set(
    contextual.map((item) => item.referenceId ?? item.value),
  );
  return intrinsic.filter((item) =>
    allowed.has(item.referenceId ?? item.value),
  );
}
const dimensions = [
  'operationDefinitionRevisionIds',
  'areaDefinitionRevisionIds',
  'subjectTypeRevisionIds',
  'grainDefinitionRevisionIds',
  'equipmentReferenceIds',
  'moduleReferenceIds',
  'experimentTypeProfileVersionIds',
] as const;
function specificity(rule: ApplicabilityRule) {
  return dimensions.filter((dimension) => rule[dimension].length > 0).length;
}
function sameResolution(a: ApplicabilityRule, b: ApplicabilityRule) {
  return (
    JSON.stringify([
      a.assignmentKind,
      a.assignmentReferenceRevisionId,
      a.defaultValue,
      a.defaultGrainRevisionId,
      a.defaultRole,
      a.contextualOptions,
      a.validationProfileVersionId,
    ]) ===
    JSON.stringify([
      b.assignmentKind,
      b.assignmentReferenceRevisionId,
      b.defaultValue,
      b.defaultGrainRevisionId,
      b.defaultRole,
      b.contextualOptions,
      b.validationProfileVersionId,
    ])
  );
}
function constraintsOverlap(a: ApplicabilityRule, b: ApplicabilityRule) {
  return dimensions.every((dimension) => {
    if (!a[dimension].length || !b[dimension].length) return true;
    const right = new Set(b[dimension]);
    return a[dimension].some((value) => right.has(value));
  });
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function immutableConfigurationPackageVersion(input: unknown) {
  return deepFreeze(configurationPackageVersionSchema.parse(input));
}

export interface ConfigurationRegistrySource {
  getConfigurationRegistry(): ConfigurationRegistry;
}
function registryFrom(
  source: ConfigurationRegistry | ConfigurationRegistrySource,
) {
  return 'getConfigurationRegistry' in source
    ? source.getConfigurationRegistry()
    : source;
}

export function resolvePinnedConfigurationPackage(
  source: ConfigurationRegistry | ConfigurationRegistrySource,
  configurationPackageVersionId: string,
) {
  const registry = registryFrom(source);
  return exact(
    registry.packages,
    configurationPackageVersionId,
    'ConfigurationPackageVersion',
  );
}

export function resolveConfigurationApplicability(
  source: ConfigurationRegistry | ConfigurationRegistrySource,
  context: ApplicabilityResolutionContext,
): ResolvedApplicableDefinition[] {
  const registry = registryFrom(source);
  const packageVersion = resolvePinnedConfigurationPackage(
    registry,
    context.configurationPackageVersionId,
  );
  const ruleSets = packageVersion.applicabilityRuleSetVersionIds.map((id) =>
    exact(registry.applicabilityRuleSets, id, 'ApplicabilityRuleSetVersion'),
  );
  const matches = ruleSets
    .flatMap((set) => set.rules)
    .filter((rule) => {
      const expected = [
        context.operationDefinitionRevisionId,
        context.areaDefinitionRevisionId,
        context.subjectTypeRevisionId,
        context.requestedGrainRevisionId,
        context.equipmentReferenceId,
        context.moduleReferenceId,
        context.experimentTypeProfileVersionId,
      ];
      return dimensions.every(
        (dimension, index) =>
          rule[dimension].length === 0 ||
          (!!expected[index] && rule[dimension].includes(expected[index]!)),
      );
    });
  const grouped = new Map<string, ApplicabilityRule[]>();
  for (const rule of matches)
    grouped.set(rule.definitionRevisionId, [
      ...(grouped.get(rule.definitionRevisionId) ?? []),
      rule,
    ]);

  return [...grouped.entries()].map(([definitionRevisionId, rules]) => {
    if (!packageVersion.definitionRevisionIds.includes(definitionRevisionId))
      throw new Error(
        `Applicability definition is outside pinned package: ${definitionRevisionId}`,
      );
    const descriptor = exactDescriptor(
      registry.definitionDescriptors,
      definitionRevisionId,
    );
    if (
      !descriptor.intrinsicAllowedGrainRevisionIds.includes(
        context.requestedGrainRevisionId,
      )
    )
      throw new Error(
        `Intrinsic grain constraint rejects ${definitionRevisionId}`,
      );
    const max = Math.max(...rules.map(specificity));
    const winners = rules.filter((rule) => specificity(rule) === max);
    if (winners.some((rule) => !sameResolution(winners[0], rule)))
      throw new Error(
        `Equal-specificity applicability conflict: ${definitionRevisionId}`,
      );
    const rule = winners[0];
    if (
      !descriptor.intrinsicAllowedGrainRevisionIds.includes(
        rule.defaultGrainRevisionId,
      )
    )
      throw new Error(
        `Configured default grain violates intrinsic definition: ${rule.id}`,
      );
    return {
      ...descriptor,
      applicabilityRuleId: rule.id,
      assignmentKind: rule.assignmentKind,
      assignmentReferenceRevisionId: rule.assignmentReferenceRevisionId,
      defaultValue: rule.defaultValue,
      defaultGrainRevisionId: rule.defaultGrainRevisionId,
      defaultRole: rule.defaultRole,
      allowedOptions: intersectOptions(
        descriptor.intrinsicOptions,
        rule.contextualOptions,
      ),
      validationProfile: rule.validationProfileVersionId
        ? exact(
            registry.validationProfiles,
            rule.validationProfileVersionId,
            'ValidationProfileVersion',
          )
        : null,
    };
  });
}

export function validateConfigurationPackageVersion(
  packageInput: unknown,
  registry: ConfigurationRegistry,
  catalog: ReferenceCatalog,
  registeredEditorKeys: readonly string[],
) {
  const packageVersion = configurationPackageVersionSchema.parse(packageInput);
  const catalogRefs = allCatalogRevisions(catalog);
  const knownRefs = [...catalogRefs, ...registry.externalReferences];
  const check = <T extends { id: string; scope: ConfigurationScope }>(
    items: readonly T[],
    ids: readonly string[],
    kind: string,
  ) =>
    ids.map((id) => {
      const artifact = exact(items, id, kind);
      if (!compatibleScope(packageVersion.scope, artifact.scope))
        throw new Error(`Scope mismatch for ${kind}: ${id}`);
      return artifact;
    });
  const subjects = check(
    registry.subjectTypes,
    packageVersion.subjectTypeRevisionIds,
    'SubjectTypeDefinitionRevision',
  );
  const areaProfiles = check(
    registry.departmentAreaProfiles,
    packageVersion.departmentAreaProfileVersionIds,
    'DepartmentAreaProfileVersion',
  );
  const experimentProfiles = check(
    registry.experimentTypeProfiles,
    packageVersion.experimentTypeProfileVersionIds,
    'ExperimentTypeProfileVersion',
  );
  const capabilities = check(
    registry.equipmentCapabilityProfiles,
    packageVersion.equipmentCapabilityProfileVersionIds,
    'EquipmentCapabilityProfileVersion',
  );
  const ruleSets = check(
    registry.applicabilityRuleSets,
    packageVersion.applicabilityRuleSetVersionIds,
    'ApplicabilityRuleSetVersion',
  );
  const validations = check(
    registry.validationProfiles,
    packageVersion.validationProfileVersionIds,
    'ValidationProfileVersion',
  );
  const projections = check(
    registry.projectionProfiles,
    packageVersion.projectionProfileVersionIds,
    'ProjectionProfileVersion',
  );
  check(knownRefs, packageVersion.definitionRevisionIds, 'definition revision');
  check(
    knownRefs,
    packageVersion.nextActionTypeRevisionIds,
    'NextActionType revision',
  );
  const grainIds = new Set(registry.grains.map((grain) => grain.id));
  subjects
    .flatMap((subject) => [
      ...subject.assignmentGrainRevisionIds,
      ...subject.observationGrainRevisionIds,
    ])
    .forEach((id) => {
      if (!grainIds.has(id))
        throw new Error(`Unresolved GrainDefinitionRevision: ${id}`);
    });
  areaProfiles.forEach((profile) => {
    profile.subjectTypeRevisionIds.forEach((id) =>
      exact(subjects, id, 'package SubjectTypeDefinitionRevision'),
    );
    profile.areaDefinitionRevisionIds.forEach((id) =>
      exact(knownRefs, id, 'area definition revision'),
    );
    profile.operationDefinitionRevisionIds.forEach((id) =>
      exact(knownRefs, id, 'operation definition revision'),
    );
  });
  experimentProfiles.forEach((profile) => {
    exact(
      knownRefs,
      profile.experimentTypeDefinitionRevisionId,
      'experiment type definition revision',
    );
    profile.departmentAreaProfileVersionIds.forEach((id) =>
      exact(areaProfiles, id, 'package DepartmentAreaProfileVersion'),
    );
    profile.subjectTypeRevisionIds.forEach((id) =>
      exact(subjects, id, 'package SubjectTypeDefinitionRevision'),
    );
  });
  capabilities.forEach((capability) => {
    exact(knownRefs, capability.equipmentReferenceId, 'equipment reference');
    [
      ...capability.moduleReferenceIds,
      ...capability.recipeReferenceRevisionIds,
      ...capability.definitionRevisionIds,
    ].forEach((id) => exact(knownRefs, id, 'capability reference'));
  });
  validations.forEach((profile) => {
    if (!registeredEditorKeys.includes(profile.editorKey))
      throw new Error(`Unregistered editor key: ${profile.editorKey}`);
    if (profile.unitDefinitionRevisionId)
      exact(
        catalog.units,
        profile.unitDefinitionRevisionId,
        'unit definition revision',
      );
  });
  projections
    .flatMap((profile) => profile.editorKeys)
    .forEach((key) => {
      if (!registeredEditorKeys.includes(key))
        throw new Error(`Unregistered editor key: ${key}`);
    });
  for (const rule of ruleSets.flatMap((set) => set.rules)) {
    exact(
      packageVersion.definitionRevisionIds.map((id) => ({ id })),
      rule.definitionRevisionId,
      'package definition revision',
    );
    const descriptor = exactDescriptor(
      registry.definitionDescriptors,
      rule.definitionRevisionId,
    );
    if (!registeredEditorKeys.includes(descriptor.editorKey))
      throw new Error(`Unregistered editor key: ${descriptor.editorKey}`);
    [
      ...rule.operationDefinitionRevisionIds,
      ...rule.areaDefinitionRevisionIds,
      rule.assignmentReferenceRevisionId,
    ].forEach((id) => exact(knownRefs, id, 'applicability reference'));
    [...rule.equipmentReferenceIds, ...rule.moduleReferenceIds].forEach((id) =>
      exact(knownRefs, id, 'applicability context reference'),
    );
    rule.contextualOptions.forEach((option) => {
      if (option.referenceId)
        exact(knownRefs, option.referenceId, 'applicability option reference');
    });
    rule.subjectTypeRevisionIds.forEach((id) =>
      exact(subjects, id, 'package SubjectTypeDefinitionRevision'),
    );
    [...rule.grainDefinitionRevisionIds, rule.defaultGrainRevisionId].forEach(
      (id) => exact(registry.grains, id, 'GrainDefinitionRevision'),
    );
    rule.experimentTypeProfileVersionIds.forEach((id) =>
      exact(experimentProfiles, id, 'package ExperimentTypeProfileVersion'),
    );
    if (rule.validationProfileVersionId)
      exact(
        validations,
        rule.validationProfileVersionId,
        'package ValidationProfileVersion',
      );
    if (
      descriptor.unitDefinitionRevisionId &&
      rule.validationProfileVersionId
    ) {
      const validation = exact(
        validations,
        rule.validationProfileVersionId,
        'ValidationProfileVersion',
      );
      if (
        validation.unitDefinitionRevisionId &&
        validation.unitDefinitionRevisionId !==
          descriptor.unitDefinitionRevisionId
      )
        throw new Error(`Unit mismatch for applicability rule: ${rule.id}`);
    }
  }
  const allRules = ruleSets.flatMap((set) => set.rules);
  for (let index = 0; index < allRules.length; index += 1) {
    for (let other = index + 1; other < allRules.length; other += 1) {
      const left = allRules[index],
        right = allRules[other];
      if (
        left.definitionRevisionId === right.definitionRevisionId &&
        specificity(left) === specificity(right) &&
        constraintsOverlap(left, right) &&
        !sameResolution(left, right)
      )
        throw new Error(
          `Equal-specificity applicability conflict: ${left.definitionRevisionId}`,
        );
    }
  }
  return deepFreeze(packageVersion);
}
