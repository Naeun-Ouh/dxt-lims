import assert from 'node:assert/strict';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import {
  dispatchRepository,
  handleRepositoryRequest,
} from '@/app/api/repository/route';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type { DiscoveryPage } from '@/src/application/discovery';
import type { MaterialAssignmentUsage } from '@/src/application/material-usage';
import type { productionMeasurementContract } from './postgres-measurement-contract';

export async function materialUsageContract(
  db: SqlDatabase,
  proofs: Awaited<ReturnType<typeof productionMeasurementContract>>,
) {
  await db.query(
    "INSERT INTO auth_principal VALUES('material-owner','material-owner',true,'GENERAL_USER'),('material-outsider','material-outsider',true,'GENERAL_USER')",
  );
  await db.query(
    "INSERT INTO auth_org_unit VALUES('material-dept','DEPARTMENT',NULL)",
  );
  const snapshot = proofs[0].snapshot;
  await db.query(
    `INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id,visibility)
    SELECT study_id,'material-owner','material-dept','PRIVATE' FROM experiment_run WHERE run_domain_id=$1 ON CONFLICT(study_id) DO NOTHING`,
    [snapshot.id],
  );
  await db.query(
    `INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) SELECT 'material-usage-reader',study_id,'material-owner','VIEW_RUN','material-owner' FROM experiment_run WHERE run_domain_id=$1`,
    [snapshot.id],
  );
  const api = (p: string, query: object = {}) =>
    handleRepositoryRequest(
      new Request('http://localhost/api/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'material.usage', query }),
      }),
      (input, dispatch) =>
        authorizedOperation(db, p, input, dispatch ?? dispatchRepository),
    );
  const read = async (
    p: string,
    query: object = {},
  ): Promise<DiscoveryPage<MaterialAssignmentUsage>> => {
    const response = await api(p, query);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.json();
  };
  const before = await db.query(
    'SELECT run_assignment_id,assignment_reference_revision_id,value_text FROM run_assignment ORDER BY run_assignment_id',
  );
  const all = await read('material-owner', { limit: 100 });
  assert.ok(
    all.total > 0,
    'existing persisted material assignments are visible',
  );
  const source = (
    await db.query<{ id: string; ref: string; value: string }>(
      `SELECT a.run_assignment_id::text id,a.assignment_reference_revision_id ref,a.value_text value FROM run_assignment a JOIN experiment_run r USING(run_id) WHERE a.assignment_kind='MATERIAL' AND r.study_id=(SELECT study_id FROM experiment_run WHERE run_domain_id=$1)`,
      [snapshot.id],
    )
  ).rows;
  assert.equal(all.total, source.length);
  for (const item of all.items) {
    const exact = source.find((r) => r.id === item.assignmentId)!;
    assert.equal(item.referenceId, exact.ref);
    assert.equal(item.value, exact.value);
    assert.equal(
      'sampleRevisionId' in item,
      false,
      'do not fabricate Sample Revision linkage',
    );
  }
  const one = await read('material-owner', { limit: 1 });
  const two = await read('material-owner', { limit: 1, offset: 1 });
  assert.equal(one.total, all.total);
  assert.deepEqual([...one.items, ...two.items], all.items.slice(0, 2));
  assert.deepEqual(await read('material-outsider'), { items: [], total: 0 });
  assert.deepEqual(
    await read('material-outsider', { text: all.items[0].value }),
    { items: [], total: 0 },
  );
  assert.deepEqual(
    await read('material-owner', { studySlug: 'does-not-exist' }),
    { items: [], total: 0 },
  );
  assert.equal((await api('material-owner', { limit: 101 })).status, 400);
  await db.query(
    "UPDATE auth_principal SET active=false WHERE id='material-owner'",
  );
  assert.equal((await api('material-owner')).status, 403);
  assert.deepEqual(
    (
      await db.query(
        'SELECT run_assignment_id,assignment_reference_revision_id,value_text FROM run_assignment ORDER BY run_assignment_id',
      )
    ).rows,
    before.rows,
  );
}
