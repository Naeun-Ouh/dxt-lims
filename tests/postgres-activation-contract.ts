import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { activateConfigurationPackage } from '@/src/infrastructure/postgres/configuration-activation';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';

export async function activationContract(database: SqlDatabase) {
  const versions = await database.query<{ package_id: string; package_version_id: string }>(
    `SELECT package_id, package_version_id FROM configuration_package_version WHERE package_version_id IN ('config-package-photo-v1','config-package-photo-v2','config-package-cmp-v1')`);
  const photo = versions.rows.find((x) => x.package_version_id === 'config-package-photo-v1')!;
  const next = versions.rows.find((x) => x.package_version_id === 'config-package-photo-v2')!;
  const cmp = versions.rows.find((x) => x.package_version_id === 'config-package-cmp-v1')!;
  assert.equal(photo.package_id, next.package_id);
  assert.notEqual(photo.package_id, cmp.package_id);
  const activate = (scopeId: string, item: typeof photo) => activateConfigurationPackage(database, {
    scopeType: 'AREA', scopeId, packageId: item.package_id, packageVersionId: item.package_version_id,
  });
  const first = await activate('contract-A', photo);
  await activate('contract-A', cmp); // A: different packages coexist
  await activate('contract-B', next); // C: independent scope
  await assert.rejects(database.query(`INSERT INTO configuration_activation
    (activation_id,scope_type,scope_id,package_id,package_version_id) VALUES ($1,'AREA','contract-A',$2,$3)`,
    [randomUUID(), photo.package_id, next.package_version_id])); // B
  await assert.rejects(database.query(`INSERT INTO configuration_activation
    (activation_id,scope_type,scope_id,package_id,package_version_id) VALUES ($1,'AREA','wrong-lineage',$2,$3)`,
    [randomUUID(), cmp.package_id, photo.package_version_id]));
  await activate('contract-A', next); // D
  const history = await database.query<{ activation_id: string; active_to: Date | null }>(
    `SELECT activation_id, active_to FROM configuration_activation WHERE scope_id='contract-A' AND package_id=$1`, [photo.package_id]);
  assert.equal(history.rows.length, 2);
  assert.ok(history.rows.find((x) => x.activation_id === first)?.active_to);
  await Promise.all([activate('contract-race', photo), activate('contract-race', next)]);
  const count = await database.query<{ count: string }>(`SELECT count(*) FROM configuration_activation WHERE scope_id='contract-race' AND active_to IS NULL`);
  assert.equal(Number(count.rows[0].count), 1);
  const hydrated = await hydrateConfigurationPackages(database, [photo.package_version_id, next.package_version_id, cmp.package_version_id]);
  assert.equal(hydrated.getPackageVersion(photo.package_version_id)?.packageId, photo.package_id);
  assert.equal(hydrated.getPackageVersion(cmp.package_version_id)?.packageId, cmp.package_id);
  const coexist = await database.query<{ count: string }>(`SELECT count(*) FROM configuration_activation
    WHERE scope_type='AREA' AND scope_id='semiconductor-rd' AND active_to IS NULL`);
  assert.equal(Number(coexist.rows[0].count), 2);
}
