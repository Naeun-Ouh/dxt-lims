import { workspaceOperationsForPackage } from '@/src/mock/workspace-configuration';
import { randomUUID } from 'node:crypto';
import type { ConfigurationRegistry } from '@/src/domain/reference';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';
import { scenarioForSeries, type SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import { createInitialStudySetup, type StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import type { SqlDatabase, SqlSession } from './sql-database';

const revisionCollections = [
  'subjectTypes', 'grains', 'departmentAreaProfiles', 'experimentTypeProfiles',
  'equipmentCapabilityProfiles', 'applicabilityRuleSets', 'validationProfiles',
  'projectionProfiles', 'definitionDescriptors', 'externalReferences',
] as const satisfies readonly (keyof Omit<ConfigurationRegistry, 'packages'>)[];

const revisionId = (value: unknown) => {
  const item = value as { id?: string; revisionId?: string };
  return item.id ?? item.revisionId ?? (() => { throw new Error('Configuration revision is missing identity.'); })();
};

export async function seedConfigurationRegistry(session: SqlSession, registry: ConfigurationRegistry) {
  for (const pkg of registry.packages) {
    const exists = await session.query('SELECT package_version_id FROM configuration_package_version WHERE package_version_id=$1', [pkg.id]);
    if (exists.rowCount) continue;
    await session.query('INSERT INTO configuration_package (package_id) VALUES ($1) ON CONFLICT DO NOTHING', [pkg.packageId]);
    await session.query(`INSERT INTO configuration_package_version
      (package_version_id, package_id, version, scope_kind, scope_owner_id, status, payload)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (package_version_id) DO NOTHING`,
      [pkg.id, pkg.packageId, pkg.version, pkg.scope.kind, 'ownerId' in pkg.scope ? pkg.scope.ownerId : null, 'DRAFT', JSON.stringify(pkg)]);
    // Exact transitive revision closure: package references, profiles, rules and options.
    const referenced = new Set<string>();
    const collect = (value: unknown): void => {
      if (typeof value === 'string') referenced.add(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(pkg);
    let size = -1;
    while (size !== referenced.size) {
      size = referenced.size;
      for (const kind of revisionCollections) for (const revision of registry[kind])
        if (referenced.has(revisionId(revision))) collect(revision);
    }
    for (const kind of revisionCollections) {
      for (const revision of registry[kind]) {
        if (!referenced.has(revisionId(revision))) continue;
        const id = revisionId(revision);
        await session.query(`INSERT INTO configuration_revision (revision_id, revision_kind, payload)
          VALUES ($1,$2,$3::jsonb) ON CONFLICT (revision_kind, revision_id) DO NOTHING`, [id, kind, JSON.stringify(revision)]);
        await session.query(`INSERT INTO configuration_package_member (package_version_id, member_kind, member_revision_id)
          VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [pkg.id, kind, id]);
      }
    }
    await session.query('UPDATE configuration_package_version SET status=$2 WHERE package_version_id=$1', [pkg.id, pkg.status]);
    if (pkg.status === 'ACTIVE') await session.query(`INSERT INTO configuration_activation
      (activation_id, scope_type, scope_id, package_id, package_version_id)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [randomUUID(), pkg.scope.kind, 'ownerId' in pkg.scope ? pkg.scope.ownerId : '', pkg.packageId, pkg.id]);

  }
}

export async function persistStudySetupVersion(
  database: SqlDatabase,
  setup: StudySetupSnapshot,
  displayName = scenarioForSeries(setup.seriesSlug).series.name,
) {
  return database.transaction(async (session) => {
    let study = await session.query<{ study_id: string }>('SELECT study_id FROM study WHERE series_slug = $1 FOR UPDATE', [setup.seriesSlug]);
    const studyId = study.rows[0]?.study_id ?? randomUUID();
    if (!study.rows[0]) {
      const context = scenarioForSeries(setup.seriesSlug);
      const nextRunNumber = context.runNumber + 1;
      await session.query(`INSERT INTO study
        (study_id, series_slug, series_domain_id, display_name, next_run_number, experiment_type, intent, workspace_context_label, manufacturing_context)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [studyId, setup.seriesSlug, setup.seriesId, displayName, nextRunNumber,
          context.experimentType, context.intent, context.workspaceContextLabel ?? null, JSON.stringify(context.manufacturingContext ?? null)]);
      for (const [index, subject] of context.subjects.entries()) await session.query(`INSERT INTO study_subject_default
        (study_id, ordinal, subject_domain_id, subject_kind, display_label) VALUES ($1,$2,$3,$4,$5)`,
        [studyId, index + 1, subject.id, subject.type, subject.displayLabel]);
      study = { rows: [{ study_id: studyId }], rowCount: 1 };
    }
    const existing = await session.query<{ setup_version_id: string }>(
      'SELECT setup_version_id FROM study_setup_version WHERE study_id = $1 AND revision = $2', [studyId, setup.revision]);
    if (existing.rows[0]) return existing.rows[0].setup_version_id;
    const setupId = randomUUID();
    await session.query(`INSERT INTO study_setup_version
      (setup_version_id, setup_domain_id, study_id, revision, configuration_package_version_id,
       experiment_type_profile_version_id, subject_type_revision_id, area, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [setupId, `${setup.seriesId}-default-r${setup.revision}`, studyId,
      setup.revision, setup.configurationPackageVersionId, setup.experimentTypeProfileVersionId,
      setup.subjectTypeRevisionId, setup.area, setup.updatedAt.length === 10 ? `${setup.updatedAt}T00:00:00.000Z` : setup.updatedAt]);
    for (const [operationIndex, operation] of setup.operations.entries()) {
      const operationId = randomUUID();
      const fixture = workspaceOperationsForPackage(setup.configurationPackageVersionId).find((x) => x.operationDefinitionRevisionId === operation.operationDefinitionRevisionId);
      const context = operation.context ?? (fixture ? {
        areaDefinitionRevisionId: fixture.areaDefinitionRevisionId, equipmentReferenceId: fixture.equipmentReferenceId,
        moduleReferenceId: fixture.moduleReferenceId, areaLabel: fixture.area,
        equipmentLabel: fixture.equipment, moduleLabel: fixture.module,
      } : null);
      if (!context) throw new Error('Seed operation requires explicit context.');
      await session.query(`INSERT INTO study_setup_operation
        (setup_operation_id, operation_domain_id, setup_version_id, sequence, label,
         operation_definition_revision_id, role, measurement_point, operation_context)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [operationId, operation.id, setupId, operationIndex + 1,
        operation.label, operation.operationDefinitionRevisionId, operation.role, operation.measurementPoint, JSON.stringify(context)]);
      for (const item of operation.items) await session.query(`INSERT INTO study_setup_assignment
        (setup_assignment_id, assignment_domain_id, setup_operation_id, definition_revision_id, label,
         assignment_kind, assignment_reference_revision_id, value_text, intent_role, editor_key,
         unit_symbol, grain, options, applicability_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)`, [randomUUID(), item.id,
        operationId, item.definitionRevisionId, item.label, item.kind, item.referenceId, item.value,
        item.intentRole, item.editor, item.unit, item.grain, JSON.stringify(item.options), item.applicabilityId]);
      for (const measurement of operation.measurements) await session.query(`INSERT INTO study_setup_measurement_plan
        (setup_measurement_id, measurement_domain_id, setup_operation_id, measurement_operation_definition_id,
         operation_label, parameter_definition_ids, parameter_labels, measurement_point)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`, [randomUUID(), measurement.id, operationId,
        measurement.measurementOperationDefinitionId, measurement.operation,
        JSON.stringify(measurement.parameterDefinitionIds), JSON.stringify(measurement.parameters), measurement.point]);
    }
    await session.query(`UPDATE study SET current_setup_version_id = $2, aggregate_version = aggregate_version + 1
      WHERE study_id = $1`, [studyId, setupId]);
    return setupId;
  });
}

export async function seedProductionSlice(
  database: SqlDatabase,
  configuration: ConfigurationRegistrySource,
  series: SeriesSlug[] = ['dts-improvement', 'adhesion-material-optimization'],
) {
  await database.transaction((session) => seedConfigurationRegistry(session, configuration.getConfigurationRegistry()));
  for (const slug of series) await persistStudySetupVersion(database, createInitialStudySetup(slug, configuration));
}
