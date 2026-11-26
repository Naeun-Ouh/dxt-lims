/** Explicit isolated regression-fixture repair; never imported by production. */
import assert from 'node:assert/strict';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { readMeasurementCatalog } from '@/src/infrastructure/postgres/measurement-references';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { createProductionSliceRepositories } from './explicit-scientific-repositories';

export async function completeLegacyFixtureMeasurementPlans(db: SqlDatabase) {
  const configuration = await hydrateConfigurationPackages(db, [
    'config-package-photo-v1',
  ]);
  const repositories = createProductionSliceRepositories(db, configuration);
  const request = {
    seriesSlug: 'dts-improvement',
    source: 'STUDY_DEFAULT' as const,
  };
  const before = await repositories.run.previewCreation!(request);
  assert.equal(
    before.readiness.status,
    'NOT_READY',
    'legacy fixture must not bypass required supporting parameters',
  );
  assert.ok(
    before.readiness.missing.some((message) => message.includes('CD-SEM')),
  );
  const plans = await db.query<{
    setup_measurement_id: string;
    parameter_definition_ids: string[];
    parameter_labels: string[];
    configuration_package_version_id: string;
  }>(
    `SELECT m.*,v.configuration_package_version_id FROM study_setup_measurement_plan m
     JOIN study_setup_operation o USING(setup_operation_id) JOIN study_setup_version v USING(setup_version_id)`,
  );
  for (const plan of plans.rows) {
    const catalog = await readMeasurementCatalog(
      db,
      plan.configuration_package_version_id,
    );
    const ids = [...plan.parameter_definition_ids],
      labels = [...plan.parameter_labels];
    for (let i = 0; i < ids.length; i++) {
      const parameter = catalog.parameters.find((p) => p.id === ids[i]);
      assert.ok(
        parameter,
        'fixture measurement parameter must be an exact configured reference',
      );
      for (const id of parameter.requiredSupportingParameterIds) {
        if (ids.includes(id)) continue;
        const supporting = catalog.parameters.find((p) => p.id === id);
        assert.ok(
          supporting,
          'supporting fixture parameter must already exist in the exact catalog',
        );
        ids.push(id);
        labels.push(supporting.name);
      }
    }
    if (ids.length !== plan.parameter_definition_ids.length)
      await db.query(
        'UPDATE study_setup_measurement_plan SET parameter_definition_ids=$2::jsonb,parameter_labels=$3::jsonb WHERE setup_measurement_id=$1',
        [
          plan.setup_measurement_id,
          JSON.stringify(ids),
          JSON.stringify(labels),
        ],
      );
  }
  const after = await repositories.run.previewCreation!(request);
  assert.equal(
    after.readiness.status,
    'READY',
    'explicit supporting references complete the isolated fixture without bypass',
  );
}
