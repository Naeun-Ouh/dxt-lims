import assert from 'node:assert/strict';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { DxtApplication } from '@/src/application/dxt-application';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { activateConfigurationPackage } from '@/src/infrastructure/postgres/configuration-activation';
import { persistStudySetupVersion } from '@/src/infrastructure/postgres/slice-seed';
import { updateStudySetupItem } from '@/src/features/experiment-series/study-setup-model';

export async function productionRunContract(database: SqlDatabase) {
  const config = await hydrateConfigurationPackages(database, ['config-package-photo-v1','config-package-material-rd-v1']);
  const app = new DxtApplication(createProductionSliceRepositories(database, config));
  await activateConfigurationPackage(database, { scopeType: 'AREA', scopeId: 'semiconductor-rd',
    packageId: config.getPackageVersion('config-package-photo-v1')!.packageId, packageVersionId: 'config-package-photo-v1' });
  const first = await app.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'contract-first');
  const material = await app.createRunFromStudy('adhesion-material-optimization', 'STUDY_DEFAULT', 'contract-material');
  assert.ok(first.subjects.every((x) => x.type === 'WAFER'));
  assert.ok(material.subjects.every((x) => x.type === 'SPECIMEN'));
  assert.ok(material.assignments.some((x) => x.label === 'Cure Temperature' && x.intentRole === 'VARIED'));
  const setup = (await app.studies.load('dts-improvement'))!;
  const energy = setup.operations.flatMap((x) => x.items).find((x) => x.label === 'Energy')!;
  await persistStudySetupVersion(database, updateStudySetupItem(setup, energy.id, '42'));
  await database.query("UPDATE study SET display_name = 'Changed current name' WHERE series_slug='dts-improvement'");
  await database.query("UPDATE subject SET display_label = 'Changed subject label'");
  const pkg = config.getPackageVersion(first.configurationPackageVersionId)!;
  await activateConfigurationPackage(database, { scopeType: 'AREA', scopeId: 'semiconductor-rd', packageId: pkg.packageId, packageVersionId: 'config-package-photo-v2' });
  const refreshed = new DxtApplication(createProductionSliceRepositories(database, await hydrateConfigurationPackages(database, [first.configurationPackageVersionId])));
  assert.deepEqual(await refreshed.repositories.run.getSnapshot(first.id), first); // E: historical exact pin, snapshot, labels
  assert.deepEqual(await refreshed.createRunFromStudy('dts-improvement','STUDY_DEFAULT','contract-first'), first); // changed-default replay
  const raced = await Promise.all(Array.from({ length: 4 }, (_, i) => app.createRunFromStudy('dts-improvement','STUDY_DEFAULT',`contract-concurrent-${i}`)));
  assert.equal(new Set(raced.map((x) => x.runNumber)).size, 4);
  const duplicate = await Promise.all(Array.from({ length: 3 }, () => app.createRunFromStudy('dts-improvement','STUDY_DEFAULT','contract-same-request')));
  assert.equal(new Set(duplicate.map((x) => x.id)).size, 1);
  await assert.rejects(app.repositories.run.savePlanningWorkspace({ snapshot: first, ranges: [], manualFocus: [] }, { commandId:'stale', expectedVersion:0 }), /changed/);
  const state = () => database.query(`SELECT (SELECT count(*) FROM experiment_run) AS runs,
    (SELECT count(*) FROM run_subject) AS subjects, (SELECT count(*) FROM run_operation) AS operations,
    (SELECT count(*) FROM run_assignment) AS assignments, (SELECT count(*) FROM idempotency_record) AS receipts,
    (SELECT next_run_number FROM study WHERE series_slug='dts-improvement') AS next_number`);
  const before = await state();
  // Real DB failure AFTER root, subjects and operations have been inserted.
  await database.query(`CREATE FUNCTION fail_test_assignment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected required assignment failure'; END $$`);
  await database.query(`CREATE TRIGGER fail_test_assignment BEFORE INSERT ON run_assignment FOR EACH ROW EXECUTE FUNCTION fail_test_assignment()`);
  try { await assert.rejects(app.createRunFromStudy('dts-improvement','STUDY_DEFAULT','contract-rollback'), /Create Run failed/); }
  finally { await database.query('DROP TRIGGER fail_test_assignment ON run_assignment'); await database.query('DROP FUNCTION fail_test_assignment()'); }
  assert.deepEqual((await state()).rows, before.rows);
  await assert.rejects(database.query("UPDATE configuration_package_version SET payload='{}'::jsonb WHERE package_version_id=$1",[first.configurationPackageVersionId]));
  await assert.rejects(database.query(`INSERT INTO configuration_package_member
    (package_version_id,member_kind,member_revision_id) VALUES ($1,'grains','grain-subject-r1')`, [first.configurationPackageVersionId]));
  await assert.rejects(database.query('UPDATE experiment_run SET configuration_package_version_id = $1 WHERE run_domain_id = $2',['nonexistent',first.id]));
  await assert.rejects(database.query('UPDATE experiment_run SET configuration_package_version_id = NULL WHERE run_domain_id = $1',[first.id]));
  await assert.rejects(database.query('UPDATE experiment_run SET run_number = $1 WHERE run_domain_id = $2',[first.runNumber,raced[0].id]));
  assert.deepEqual(await app.repositories.savedAnalysis.list(), []);
  await assert.rejects(hydrateConfigurationPackages(database, [pkg.packageId]), /Unresolved pinned/);
  return { first, material };
}
