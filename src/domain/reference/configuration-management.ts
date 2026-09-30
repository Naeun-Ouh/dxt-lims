import {
  applicabilityRuleSetVersionSchema,
  configurationDefinitionDescriptorSchema,
  configurationPackageVersionSchema,
  immutableConfigurationPackageVersion,
  resolvePinnedConfigurationPackage,
  validateConfigurationPackageVersion,
  type ApplicabilityRuleSetVersion,
  type ConfigurationDefinitionDescriptor,
  type ConfigurationPackageVersion,
  type ConfigurationRegistry,
  type ConfigurationRegistrySource,
  type ConfigurationScope,
} from './configuration';
import type { ReferenceCatalog } from './index';

export type ConfigurationPackageDraft = {
  id: string;
  packageId: string;
  targetVersion: number;
  scope: ConfigurationScope;
};
export type AuthoredDefinitionRevision = {
  definitionId: string;
  version: number;
  scope: ConfigurationScope;
  descriptor: ConfigurationDefinitionDescriptor;
};
export type PackageAssembly = Omit<
  ConfigurationPackageVersion,
  'id' | 'packageId' | 'version' | 'scope' | 'status'
>;

type RepositoryState = {
  registry: ConfigurationRegistry;
  drafts: ConfigurationPackageDraft[];
  authoredDefinitions: AuthoredDefinitionRevision[];
  revision: number;
};

export interface ConfigurationReadRepository extends ConfigurationRegistrySource {
  getRevision(): number;
  getPackageVersion(id: string): ConfigurationPackageVersion | undefined;
  getPackageDraft(id: string): ConfigurationPackageDraft | undefined;
  getApplicabilityRuleSetVersion(
    id: string,
  ): ApplicabilityRuleSetVersion | undefined;
  getDefinitionRevision(
    revisionId: string,
  ): AuthoredDefinitionRevision | undefined;
}
export interface ConfigurationRepositoryTransaction {
  getConfigurationRegistry(): ConfigurationRegistry;
  addPackageDraft(draft: ConfigurationPackageDraft): void;
  addDefinitionRevision(revision: AuthoredDefinitionRevision): void;
  addApplicabilityRuleSetVersion(ruleSet: ApplicabilityRuleSetVersion): void;
  addPackageVersion(packageVersion: ConfigurationPackageVersion): void;
  transitionApplicabilityRuleSetStatus(
    ruleSetVersionId: string,
    status: 'ACTIVE' | 'INACTIVE',
  ): void;
  transitionPackageStatus(
    packageVersionId: string,
    status: 'ACTIVE' | 'INACTIVE',
  ): void;
}
export interface ConfigurationWriteRepository extends ConfigurationReadRepository {
  transact<T>(
    command: (transaction: ConfigurationRepositoryTransaction) => T,
  ): T;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function scopeKey(scope: ConfigurationScope) {
  return `${scope.kind}:${'ownerId' in scope ? scope.ownerId : ''}`;
}
function assertNewVersion<
  T extends {
    id: string;
    code: string;
    version: number;
    scope: ConfigurationScope;
  },
>(records: readonly T[], candidate: T, kind: string) {
  if (records.some((item) => item.id === candidate.id))
    throw new Error(`${kind} revision already exists: ${candidate.id}`);
  if (
    records.some(
      (item) =>
        item.code === candidate.code &&
        item.version === candidate.version &&
        scopeKey(item.scope) === scopeKey(candidate.scope),
    )
  )
    throw new Error(
      `${kind} version already exists: ${candidate.code} v${candidate.version}`,
    );
}

class Transaction implements ConfigurationRepositoryTransaction {
  constructor(private readonly state: RepositoryState) {}

  getConfigurationRegistry() {
    return freeze(clone(this.state.registry));
  }

  addPackageDraft(draft: ConfigurationPackageDraft) {
    if (this.state.drafts.some((item) => item.id === draft.id))
      throw new Error(
        `Configuration package draft already exists: ${draft.id}`,
      );
    if (
      this.state.registry.packages.some(
        (item) =>
          item.packageId === draft.packageId &&
          item.version === draft.targetVersion &&
          scopeKey(item.scope) === scopeKey(draft.scope),
      )
    )
      throw new Error(
        `Configuration package version already exists: ${draft.packageId} v${draft.targetVersion}`,
      );
    this.state.drafts.push(clone(draft));
  }

  addDefinitionRevision(revision: AuthoredDefinitionRevision) {
    const descriptor = configurationDefinitionDescriptorSchema.parse(
      revision.descriptor,
    );
    if (
      this.state.registry.definitionDescriptors.some(
        (item) => item.revisionId === descriptor.revisionId,
      )
    )
      throw new Error(
        `Definition revision already exists: ${descriptor.revisionId}`,
      );
    if (
      this.state.authoredDefinitions.some(
        (item) =>
          item.definitionId === revision.definitionId &&
          item.version === revision.version &&
          scopeKey(item.scope) === scopeKey(revision.scope),
      )
    )
      throw new Error(
        `Definition version already exists: ${revision.definitionId} v${revision.version}`,
      );
    this.state.authoredDefinitions.push(clone(revision));
    this.state.registry.definitionDescriptors.push(descriptor);
    if (
      !this.state.registry.externalReferences.some(
        (item) => item.id === descriptor.revisionId,
      )
    )
      this.state.registry.externalReferences.push({
        id: descriptor.revisionId,
        scope: clone(revision.scope),
      });
  }

  addApplicabilityRuleSetVersion(ruleSetInput: ApplicabilityRuleSetVersion) {
    const ruleSet = applicabilityRuleSetVersionSchema.parse(ruleSetInput);
    if (ruleSet.status !== 'DRAFT')
      throw new Error('New ApplicabilityRuleSetVersion must start as DRAFT');
    assertNewVersion(
      this.state.registry.applicabilityRuleSets,
      ruleSet,
      'ApplicabilityRuleSetVersion',
    );
    this.state.registry.applicabilityRuleSets.push(ruleSet);
  }

  addPackageVersion(packageInput: ConfigurationPackageVersion) {
    const packageVersion =
      configurationPackageVersionSchema.parse(packageInput);
    if (packageVersion.status !== 'DRAFT')
      throw new Error(
        'Assembled ConfigurationPackageVersion must start as DRAFT',
      );
    if (
      this.state.registry.packages.some((item) => item.id === packageVersion.id)
    )
      throw new Error(
        `ConfigurationPackageVersion revision already exists: ${packageVersion.id}`,
      );
    if (
      this.state.registry.packages.some(
        (item) =>
          item.packageId === packageVersion.packageId &&
          item.version === packageVersion.version &&
          scopeKey(item.scope) === scopeKey(packageVersion.scope),
      )
    )
      throw new Error(
        `ConfigurationPackageVersion version already exists: ${packageVersion.packageId} v${packageVersion.version}`,
      );
    this.state.registry.packages.push(packageVersion);
  }

  transitionApplicabilityRuleSetStatus(
    ruleSetVersionId: string,
    status: 'ACTIVE' | 'INACTIVE',
  ) {
    const index = this.state.registry.applicabilityRuleSets.findIndex(
      (item) => item.id === ruleSetVersionId,
    );
    if (index < 0)
      throw new Error(
        `Unresolved pinned ApplicabilityRuleSetVersion: ${ruleSetVersionId}`,
      );
    this.state.registry.applicabilityRuleSets[index] = {
      ...this.state.registry.applicabilityRuleSets[index],
      status,
    };
  }

  transitionPackageStatus(
    packageVersionId: string,
    status: 'ACTIVE' | 'INACTIVE',
  ) {
    const index = this.state.registry.packages.findIndex(
      (item) => item.id === packageVersionId,
    );
    if (index < 0)
      throw new Error(
        `Unresolved pinned ConfigurationPackageVersion: ${packageVersionId}`,
      );
    this.state.registry.packages[index] = {
      ...this.state.registry.packages[index],
      status,
    };
  }
}

export class InMemoryConfigurationRepository implements ConfigurationWriteRepository {
  private state: RepositoryState;

  constructor(seed: ConfigurationRegistry) {
    this.state = {
      registry: clone(seed),
      drafts: [],
      authoredDefinitions: [],
      revision: 0,
    };
  }

  getRevision() {
    return this.state.revision;
  }

  getConfigurationRegistry() {
    return freeze(clone(this.state.registry));
  }

  getPackageVersion(id: string) {
    const item = this.state.registry.packages.find(
      (candidate) => candidate.id === id,
    );
    return item ? freeze(clone(item)) : undefined;
  }

  getPackageDraft(id: string) {
    const item = this.state.drafts.find((candidate) => candidate.id === id);
    return item ? freeze(clone(item)) : undefined;
  }

  getApplicabilityRuleSetVersion(id: string) {
    const item = this.state.registry.applicabilityRuleSets.find(
      (candidate) => candidate.id === id,
    );
    return item ? freeze(clone(item)) : undefined;
  }

  getDefinitionRevision(revisionId: string) {
    const item = this.state.authoredDefinitions.find(
      (candidate) => candidate.descriptor.revisionId === revisionId,
    );
    return item ? freeze(clone(item)) : undefined;
  }

  transact<T>(command: (transaction: ConfigurationRepositoryTransaction) => T) {
    const candidate = clone(this.state);
    const result = command(new Transaction(candidate));
    candidate.revision = this.state.revision + 1;
    this.state = candidate;
    return result;
  }
}

export class ConfigurationManagementCommands {
  constructor(
    private readonly repository: ConfigurationWriteRepository,
    private readonly catalog: ReferenceCatalog,
    private readonly registeredEditorKeys: readonly string[],
  ) {}

  createDraftPackage(input: ConfigurationPackageDraft) {
    if (!input.id || !input.packageId || input.targetVersion < 1)
      throw new Error('Invalid ConfigurationPackageDraft identity');
    this.repository.transact((transaction) =>
      transaction.addPackageDraft(input),
    );
    return this.repository.getPackageDraft(input.id)!;
  }

  createImmutableDefinitionRevision(input: AuthoredDefinitionRevision) {
    if (!input.definitionId || input.version < 1)
      throw new Error('Invalid definition revision identity');
    if (!this.registeredEditorKeys.includes(input.descriptor.editorKey))
      throw new Error(`Unregistered editor key: ${input.descriptor.editorKey}`);
    this.repository.transact((transaction) =>
      transaction.addDefinitionRevision(input),
    );
    return this.repository.getDefinitionRevision(input.descriptor.revisionId)!;
  }

  createApplicabilityRuleSetVersion(input: ApplicabilityRuleSetVersion) {
    this.repository.transact((transaction) =>
      transaction.addApplicabilityRuleSetVersion(input),
    );
    return this.repository.getApplicabilityRuleSetVersion(input.id)!;
  }

  assemblePackageVersion(input: {
    draftId: string;
    packageVersionId: string;
    assembly: PackageAssembly;
  }) {
    const draft = this.repository.getPackageDraft(input.draftId);
    if (!draft)
      throw new Error(`Unresolved ConfigurationPackageDraft: ${input.draftId}`);
    const packageVersion = immutableConfigurationPackageVersion({
      id: input.packageVersionId,
      packageId: draft.packageId,
      version: draft.targetVersion,
      scope: draft.scope,
      status: 'DRAFT',
      ...input.assembly,
    });
    this.repository.transact((transaction) =>
      transaction.addPackageVersion(packageVersion),
    );
    return this.repository.getPackageVersion(packageVersion.id)!;
  }

  validatePackageVersion(packageVersionId: string) {
    const packageVersion = this.repository.getPackageVersion(packageVersionId);
    if (!packageVersion)
      throw new Error(
        `Unresolved pinned ConfigurationPackageVersion: ${packageVersionId}`,
      );
    return validateConfigurationPackageVersion(
      packageVersion,
      this.repository.getConfigurationRegistry(),
      this.catalog,
      this.registeredEditorKeys,
    );
  }

  activatePackageVersion(packageVersionId: string) {
    this.repository.transact((transaction) => {
      const registry = transaction.getConfigurationRegistry();
      const target = resolvePinnedConfigurationPackage(
        registry,
        packageVersionId,
      );
      validateConfigurationPackageVersion(
        target,
        registry,
        this.catalog,
        this.registeredEditorKeys,
      );
      for (const candidate of registry.packages) {
        if (
          candidate.id !== target.id &&
          candidate.status === 'ACTIVE' &&
          candidate.packageId === target.packageId &&
          scopeKey(candidate.scope) === scopeKey(target.scope)
        )
          transaction.transitionPackageStatus(candidate.id, 'INACTIVE');
      }
      target.applicabilityRuleSetVersionIds.forEach((id) =>
        transaction.transitionApplicabilityRuleSetStatus(id, 'ACTIVE'),
      );
      transaction.transitionPackageStatus(target.id, 'ACTIVE');
    });
    return this.repository.getPackageVersion(packageVersionId)!;
  }

  deactivatePackageVersion(packageVersionId: string) {
    this.repository.transact((transaction) => {
      resolvePinnedConfigurationPackage(
        transaction.getConfigurationRegistry(),
        packageVersionId,
      );
      transaction.transitionPackageStatus(packageVersionId, 'INACTIVE');
    });
    return this.repository.getPackageVersion(packageVersionId)!;
  }
}
