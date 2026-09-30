import { randomUUID } from 'node:crypto';
import type { SqlSession } from './sql-database';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
export async function writeStudySetupVersion(session:SqlSession,studyId:string,setup:StudySetupSnapshot) {
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
      const context = operation.context;
      if (!context) throw new Error('Seed operation requires explicit context.');
      await session.query(`INSERT INTO study_setup_operation
        (setup_operation_id, operation_domain_id, setup_version_id, sequence, label,
         operation_definition_revision_id, role, measurement_point, operation_context)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [operationId, operation.id, setupId, operationIndex + 1,
        operation.label, operation.operationDefinitionRevisionId, operation.role, operation.measurementPoint, JSON.stringify(context)]);
      for (const [ordinal,item] of operation.items.entries()) await session.query(`INSERT INTO study_setup_assignment
        (setup_assignment_id, assignment_domain_id, setup_operation_id, definition_revision_id, label,
         assignment_kind, assignment_reference_revision_id, value_text, intent_role, editor_key,
         unit_symbol, grain, options, applicability_id, ordinal)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15)`, [randomUUID(), item.id,
        operationId, item.definitionRevisionId, item.label, item.kind, item.referenceId, item.value,
        item.intentRole, item.editor, item.unit, item.grain, JSON.stringify(item.options), item.applicabilityId, ordinal]);
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
}
