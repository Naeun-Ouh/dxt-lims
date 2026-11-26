import { randomUUID } from 'node:crypto';
import type { SqlSession } from './sql-database';
import type {
  RunPlanningSnapshot,
  SetupAssignment,
} from '@/src/features/run-registration/planning-model';
import { ApplicationError } from '@/src/application/repository-ports';
import { sampleAllowed } from './sample-lifecycle';

export async function readSampleSelections(
  sql: SqlSession,
  runId: string,
  assignments: SetupAssignment[],
) {
  const rows = (
    await sql.query<{
      assignment_domain_id: string;
      sample_revision_id: string | null;
      owning_org_id: string | null;
      sample_id: string | null;
      reference_id: string | null;
      selection_state: string;
    }>(
      `SELECT c.assignment_domain_id,c.selection_state,m.sample_revision_id,m.material_reference_id reference_id,s.owning_org_id,s.id sample_id FROM dxt_sample.assignment_selection c LEFT JOIN dxt_sample.material_mapping m ON m.id=c.mapping_id LEFT JOIN dxt_sample.revision sr ON sr.id=m.sample_revision_id LEFT JOIN dxt_sample.sample s ON s.id=sr.sample_id WHERE c.run_id=$1`,
      [runId],
    )
  ).rows;
  for (const a of assignments) {
    if (a.kind !== 'MATERIAL') continue;
    const r = rows.find((r) => r.assignment_domain_id === a.id);
    if (!r) continue;
    // Never resurrect historical linkage by joining the latest history event.
    a.sampleRevisionId = null;
    if (
      r.selection_state !== 'SELECTED' ||
      r.reference_id !== a.referenceId ||
      !r.sample_revision_id
    )
      continue;
    if (
      !sql.trustedPrincipalId ||
      !(await sampleAllowed(
        sql,
        sql.trustedPrincipalId,
        r.owning_org_id!,
        r.sample_id!,
        'READ_SAMPLE',
      ))
    )
      a.sampleAccessDenied = true;
    else a.sampleRevisionId = r.sample_revision_id;
  }
}
export async function syncSampleSelections(
  sql: SqlSession,
  runId: string,
  snapshot: RunPlanningSnapshot,
  action: 'CREATE_RUN' | 'EDIT_RUN_PLAN',
) {
  const current = (
    await sql.query<{
      assignment_domain_id: string;
      mapping_id: string | null;
      version: number;
      selection_state: string;
    }>(
      'SELECT * FROM dxt_sample.assignment_selection WHERE run_id=$1 FOR UPDATE',
      [runId],
    )
  ).rows;
  const materials = snapshot.assignments.filter((a) => a.kind === 'MATERIAL');
  const pid = sql.trustedPrincipalId;
  if (!pid) {
    if (
      materials.some((a) => a.sampleRevisionId || a.sampleAccessDenied) ||
      current.some((c) => c.mapping_id)
    )
      throw new ApplicationError(
        'FORBIDDEN',
        'Explicit Sample permission is required.',
      );
    return;
  }
  await sql.query('LOCK TABLE dxt_sample.access_grant IN SHARE MODE');
  const root = (
    await sql.query<{ study_id: string }>(
      'SELECT study_id FROM experiment_run WHERE run_id=$1 FOR UPDATE',
      [runId],
    )
  ).rows[0];
  const scientific = (
    await sql.query<{ ok: boolean }>(
      `SELECT (dxt_explicit_scientific_access_reason($1,$2,$3)='EXPLICIT_GRANT') ok`,
      [pid, root.study_id, action],
    )
  ).rows[0].ok;
  if (!scientific)
    throw new ApplicationError(
      'FORBIDDEN',
      'Explicit scientific permission is required.',
    );
  const record = async (
    key: string,
    mapping: string | null,
    state: 'SELECTED' | 'CLEARED' | 'REMOVED',
    physicalId: string | null,
  ) => {
    const old = current.find((c) => c.assignment_domain_id === key);
    if (old?.mapping_id === mapping && old.selection_state === state) return;
    const version = (old?.version ?? 0) + 1;
    await sql.query(
      'INSERT INTO dxt_sample.run_assignment_link(id,run_id,assignment_domain_id,link_version,source_assignment_row_id,mapping_id,recorded_by,selection_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [randomUUID(), runId, key, version, physicalId, mapping, pid, state],
    );
    await sql.query(
      'INSERT INTO dxt_sample.assignment_selection VALUES($1,$2,$3,$4,$5) ON CONFLICT(run_id,assignment_domain_id) DO UPDATE SET mapping_id=EXCLUDED.mapping_id,version=EXCLUDED.version,selection_state=EXCLUDED.selection_state',
      [runId, key, mapping, version, state],
    );
  };
  for (const old of current.filter(
    (c) => !materials.some((a) => a.id === c.assignment_domain_id),
  ))
    await record(old.assignment_domain_id, null, 'REMOVED', null);
  for (const a of materials) {
    if (a.sampleAccessDenied)
      throw new ApplicationError(
        'FORBIDDEN',
        'Selected Sample revision is unavailable. Clear the selection or request access.',
      );
    const physical = (
      await sql.query<{ run_assignment_id: string }>(
        'SELECT run_assignment_id FROM run_assignment WHERE run_id=$1 AND assignment_domain_id=$2',
        [runId, a.id],
      )
    ).rows[0];
    if (!physical)
      throw new ApplicationError(
        'VALIDATION',
        'Material assignment is unavailable.',
      );
    if (!a.sampleRevisionId) {
      await record(a.id, null, 'CLEARED', physical.run_assignment_id);
      continue;
    }
    if (
      (
        await sql.query(
          'SELECT 1 FROM dxt_sample.legacy_unlinked_assignment WHERE run_id=$1 AND assignment_domain_id=$2',
          [runId, a.id],
        )
      ).rowCount
    )
      throw new ApplicationError(
        'VALIDATION',
        'Historical unresolved material use cannot be linked retrospectively.',
      );
    const revision = (
      await sql.query<{ sample_id: string; owning_org_id: string }>(
        'SELECT r.sample_id,s.owning_org_id FROM dxt_sample.revision r JOIN dxt_sample.sample s ON s.id=r.sample_id WHERE r.id=$1',
        [a.sampleRevisionId],
      )
    ).rows[0];
    if (
      !revision ||
      !(await sampleAllowed(
        sql,
        pid,
        revision.owning_org_id,
        revision.sample_id,
        'READ_SAMPLE',
      ))
    )
      throw new ApplicationError(
        'FORBIDDEN',
        'Selected Sample revision is unavailable. Clear the selection or request access.',
      );
    const referenceKind = 'externalReferences';
    if (
      !(
        await sql.query(
          'SELECT 1 FROM configuration_package_member WHERE package_version_id=$1 AND member_kind=$2 AND member_revision_id=$3',
          [
            snapshot.configurationPackageVersionId,
            referenceKind,
            a.referenceId,
          ],
        )
      ).rowCount
    )
      throw new ApplicationError(
        'VALIDATION',
        'Material reference is not allowed in this experiment configuration.',
      );
    await sql.query(
      `INSERT INTO dxt_sample.material_mapping(id,package_version_id,reference_kind,material_reference_id,sample_revision_id,selected_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(package_version_id,reference_kind,material_reference_id,sample_revision_id) DO NOTHING`,
      [
        randomUUID(),
        snapshot.configurationPackageVersionId,
        referenceKind,
        a.referenceId,
        a.sampleRevisionId,
        pid,
      ],
    );
    const mapping = (
      await sql.query<{ id: string }>(
        'SELECT id FROM dxt_sample.material_mapping WHERE package_version_id=$1 AND reference_kind=$2 AND material_reference_id=$3 AND sample_revision_id=$4',
        [
          snapshot.configurationPackageVersionId,
          referenceKind,
          a.referenceId,
          a.sampleRevisionId,
        ],
      )
    ).rows[0];
    await record(a.id, mapping.id, 'SELECTED', physical.run_assignment_id);
  }
}
