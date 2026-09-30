import { HydratedConfiguration } from '@/src/application/hydrated-configuration';
import {
  configurationPackageVersionSchema, subjectTypeDefinitionRevisionSchema, grainDefinitionRevisionSchema,
  departmentAreaProfileVersionSchema, experimentTypeProfileVersionSchema, equipmentCapabilityProfileVersionSchema,
  applicabilityRuleSetVersionSchema, validationProfileVersionSchema, projectionProfileVersionSchema,
  configurationDefinitionDescriptorSchema, scopedRevisionReferenceSchema,
  type ConfigurationRegistry,
} from '@/src/domain/reference';
import type { SqlSession } from './sql-database';

type PackageRow = { payload: unknown };
type RevisionRow = { revision_kind: keyof Omit<ConfigurationRegistry, 'packages'>; payload: unknown };

const collectionNames = [
  'subjectTypes',
  'grains',
  'departmentAreaProfiles',
  'experimentTypeProfiles',
  'equipmentCapabilityProfiles',
  'applicabilityRuleSets',
  'validationProfiles',
  'projectionProfiles',
  'definitionDescriptors',
  'externalReferences',
] as const;

function emptyRegistry(): ConfigurationRegistry {
  return {
    packages: [], subjectTypes: [], grains: [], departmentAreaProfiles: [],
    experimentTypeProfiles: [], equipmentCapabilityProfiles: [],
    applicabilityRuleSets: [], validationProfiles: [], projectionProfiles: [],
    definitionDescriptors: [], externalReferences: [],
  };
}

export async function hydrateConfigurationPackages(
  database: SqlSession,
  packageVersionIds: string[],
) {
  const registry = emptyRegistry();
  const seen = new Map<string, Set<string>>();
  for (const packageVersionId of packageVersionIds) {
    const packageResult = await database.query<PackageRow>(
      'SELECT payload FROM configuration_package_version WHERE package_version_id = $1',
      [packageVersionId],
    );
    if (!packageResult.rows[0]) throw new Error(`Unresolved pinned ConfigurationPackageVersion: ${packageVersionId}`);
    const parsed = configurationPackageVersionSchema.parse(packageResult.rows[0].payload);
    if (parsed.id !== packageVersionId) throw new Error('Package payload identity does not match its persisted key.');
    registry.packages.push(parsed);
    const members = await database.query<RevisionRow>(
      `SELECT revision_kind, payload
       FROM configuration_revision revision
       JOIN configuration_package_member member
         ON member.member_kind = revision.revision_kind
        AND member.member_revision_id = revision.revision_id
       WHERE member.package_version_id = $1
       ORDER BY revision_kind, member_revision_id`,
      [packageVersionId],
    );
    for (const member of members.rows) {
      if (!collectionNames.includes(member.revision_kind))
        throw new Error(`Unsupported hydrated configuration member kind: ${member.revision_kind}`);
      const id = String((member.payload as { id?: string; revisionId?: string }).id ?? (member.payload as { revisionId?: string }).revisionId);
      const ids = seen.get(member.revision_kind) ?? new Set<string>();
      if (ids.has(id)) continue;
      ids.add(id);
      seen.set(member.revision_kind, ids);
      const schemas = { subjectTypes: subjectTypeDefinitionRevisionSchema, grains: grainDefinitionRevisionSchema,
        departmentAreaProfiles: departmentAreaProfileVersionSchema, experimentTypeProfiles: experimentTypeProfileVersionSchema,
        equipmentCapabilityProfiles: equipmentCapabilityProfileVersionSchema, applicabilityRuleSets: applicabilityRuleSetVersionSchema,
        validationProfiles: validationProfileVersionSchema, projectionProfiles: projectionProfileVersionSchema,
        definitionDescriptors: configurationDefinitionDescriptorSchema, externalReferences: scopedRevisionReferenceSchema };
      (registry[member.revision_kind] as unknown[]).push(schemas[member.revision_kind].parse(member.payload));
    }
  }
  for (const pkg of registry.packages) {
    const required = [
      [pkg.subjectTypeRevisionIds, registry.subjectTypes], [pkg.departmentAreaProfileVersionIds, registry.departmentAreaProfiles],
      [pkg.experimentTypeProfileVersionIds, registry.experimentTypeProfiles], [pkg.equipmentCapabilityProfileVersionIds, registry.equipmentCapabilityProfiles],
      [pkg.applicabilityRuleSetVersionIds, registry.applicabilityRuleSets], [pkg.validationProfileVersionIds, registry.validationProfiles],
      [pkg.projectionProfileVersionIds, registry.projectionProfiles],
    ] as const;
    for (const [ids, collection] of required) for (const id of ids)
      if (!collection.some((item) => item.id === id)) throw new Error(`Incomplete pinned package: ${id}`);
    for (const ruleSet of registry.applicabilityRuleSets.filter((item) => pkg.applicabilityRuleSetVersionIds.includes(item.id)))
      for (const rule of ruleSet.rules) {
        if (!pkg.definitionRevisionIds.includes(rule.definitionRevisionId) || !registry.definitionDescriptors.some((item) => item.revisionId === rule.definitionRevisionId))
          throw new Error(`Unresolved pinned applicability definition: ${rule.definitionRevisionId}`);
        if (!registry.grains.some((item) => item.id === rule.defaultGrainRevisionId)) throw new Error('Unresolved assignment grain.');
      }
  }
  return new HydratedConfiguration(registry);
}
