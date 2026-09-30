import { ApplicationError } from '@/src/application/repository-ports';
import {
  referenceCatalogSchema,
  type ReferenceCatalog,
} from '@/src/domain/reference';
import type { SqlSession } from './sql-database';

export async function readMeasurementCatalog(
  session: SqlSession,
  packageId: string,
): Promise<ReferenceCatalog> {
  const rows = await session.query<{ kind: string; payload: unknown }>(
    'SELECT kind,payload FROM measurement_reference WHERE package_version_id=$1 ORDER BY kind,revision_id',
    [packageId],
  );
  if (!rows.rowCount)
    throw new ApplicationError(
      'NOT_FOUND',
      'Exact Measurement definitions are not provisioned for this package.',
    );
  const result: Record<string, unknown[]> = Object.fromEntries(
    Object.keys(referenceCatalogSchema.shape).map((k) => [k, []]),
  );
  for (const row of rows.rows) {
    if (!(row.kind in result))
      throw new ApplicationError(
        'PERSISTENCE',
        'Invalid Measurement catalog collection.',
      );
    result[row.kind].push(row.payload);
  }
  const catalog = referenceCatalogSchema.parse(result);
  for (const definitions of Object.values(catalog)) {
    definitions.sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
  }
  return catalog;
}
// Explicit bootstrap only. Never called by the production composition or a read path.
export async function provisionMeasurementReferences(
  session: SqlSession,
  catalog: ReferenceCatalog,
) {
  const packages = await session.query<{
    package_version_id: string;
    payload: { definitionRevisionIds: string[] };
  }>('SELECT package_version_id,payload FROM configuration_package_version');
  for (const pkg of packages.rows) {
    const ids = new Set(pkg.payload.definitionRevisionIds);
    const operations = catalog.measurementOperations.filter((o) =>
      ids.has(o.id),
    );
    const parameters = catalog.parameters.filter(
      (p) =>
        ids.has(p.id) ||
        operations.some((o) => o.parameterDefinitionIds.includes(p.id)),
    );
    const coordinateSets = catalog.coordinateSets.filter((s) =>
      s.measurementOperationDefinitionIds.some((id) =>
        operations.some((o) => o.id === id),
      ),
    );
    const selected = {
      measurementOperations: operations,
      parameters,
      coordinateSets,
      coordinateDefinitions: catalog.coordinateDefinitions.filter((d) =>
        coordinateSets.some((s) => s.coordinateDefinitionIds.includes(d.id)),
      ),
      units: catalog.units.filter(
        (u) =>
          parameters.some((p) => p.unitId === u.id) ||
          catalog.coordinateDefinitions.some(
            (d) =>
              coordinateSets.some((s) =>
                s.coordinateDefinitionIds.includes(d.id),
              ) &&
              catalog.parameters.find((p) => p.id === d.parameterDefinitionId)
                ?.unitId === u.id,
          ),
      ),
    };
    for (const [kind, revisions] of Object.entries(selected))
      for (const revision of revisions) {
        const existing = await session.query<{ payload: unknown }>(
          'SELECT payload FROM measurement_reference WHERE package_version_id=$1 AND kind=$2 AND revision_id=$3',
          [pkg.package_version_id, kind, revision.id],
        );
        if (existing.rows[0]) {
          // JSONB key order is not significant.
          const equal = await session.query<{ same: boolean }>(
            'SELECT payload=$4::jsonb AS same FROM measurement_reference WHERE package_version_id=$1 AND kind=$2 AND revision_id=$3',
            [
              pkg.package_version_id,
              kind,
              revision.id,
              JSON.stringify(revision),
            ],
          );
          if (!equal.rows[0].same)
            throw new ApplicationError(
              'CONFLICT',
              'An exact Measurement revision already has different content.',
            );
        } else
          await session.query(
            'INSERT INTO measurement_reference VALUES($1,$2,$3,$4::jsonb)',
            [
              pkg.package_version_id,
              kind,
              revision.id,
              JSON.stringify(revision),
            ],
          );
      }
  }
}
