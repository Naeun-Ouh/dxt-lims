import { hydrateConfigurationPackages } from './configuration-hydrator';
import { randomUUID } from 'node:crypto';
import type { SqlDatabase } from './sql-database';

/** Activation state never participates in historical exact-version lookup. */
export async function activateConfigurationPackage(
  database: SqlDatabase,
  request: { scopeType: string; scopeId: string; packageId: string; packageVersionId: string },
) {
  return database.transaction(async (session) => {
    // Lock the stable lineage, including the first activation (no current row).
    // Different scopes of this lineage serialize conservatively; other packages do not.
    const lineage = await session.query('SELECT package_id FROM configuration_package WHERE package_id = $1 FOR UPDATE', [request.packageId]);
    if (!lineage.rowCount) throw new Error('Unknown configuration package lineage.');
    const target = await session.query(`SELECT package_version_id FROM configuration_package_version
      WHERE package_id = $1 AND package_version_id = $2 AND status <> 'DRAFT'`, [request.packageId, request.packageVersionId]);
    if (!target.rowCount) throw new Error('Activation requires an exact released version of the requested package.');
    await hydrateConfigurationPackages(session, [request.packageVersionId]);
    const parameters = [request.scopeType, request.scopeId, request.packageId];
    const current = await session.query<{ activation_id: string; package_version_id: string }>(`SELECT activation_id, package_version_id
      FROM configuration_activation WHERE scope_type = $1 AND scope_id = $2 AND package_id = $3 AND active_to IS NULL`, parameters);
    if (current.rows[0]?.package_version_id === request.packageVersionId) return current.rows[0].activation_id;
    await session.query(`UPDATE configuration_activation SET active_to = clock_timestamp(), aggregate_version = aggregate_version + 1
      WHERE scope_type = $1 AND scope_id = $2 AND package_id = $3 AND active_to IS NULL`, parameters);
    const id = randomUUID();
    await session.query(`INSERT INTO configuration_activation
      (activation_id, scope_type, scope_id, package_id, package_version_id)
      VALUES ($1,$2,$3,$4,$5)`, [id, ...parameters, request.packageVersionId]);
    return id;
  });
}
