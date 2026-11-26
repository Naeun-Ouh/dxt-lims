import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { scientificStudyActions } from '@/src/application/authorization';
import {
  PostgresAuthorization,
  resolvePrincipal,
} from '@/src/infrastructure/postgres/authorization';
import { inventoryImplicitScientificAccess } from '@/src/infrastructure/postgres/scientific-access-inventory';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import {
  dispatchRepository,
  handleRepositoryRequest,
} from '@/app/api/repository/route';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';

/** Same matrix runs on disposable PGlite and native PostgreSQL; no live grants involved. */
export async function explicitScientificContract(db: SqlDatabase) {
  const sid = randomUUID(),
    slug = 'explicit-science-matrix';
  await db.query(
    "INSERT INTO study(study_id,series_slug,series_domain_id,display_name,experiment_type,intent,next_run_number) VALUES($1,$2,$2,'Authorization test','TEST','Agent-only policy test',1)",
    [sid, slug],
  );
  await db.query(
    "INSERT INTO auth_org_unit VALUES('explicit-dept','DEPARTMENT',NULL),('explicit-other','DEPARTMENT',NULL)",
  );
  for (const id of ['owner', 'member', 'leader', 'admin', 'outsider']) {
    await db.query('INSERT INTO auth_principal VALUES($1,$1,true,$2)', [
      `explicit-${id}`,
      id === 'admin' ? 'ADMIN' : 'GENERAL_USER',
    ]);
  }
  await db.query(
    "INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) VALUES($1,'explicit-owner','explicit-dept')",
    [sid],
  );
  await db.query(
    "INSERT INTO auth_membership VALUES('explicit-member','explicit-dept',false),('explicit-leader','explicit-dept',true),('explicit-outsider','explicit-other',false)",
  );
  const policy = new PostgresAuthorization(db);
  const decision = async (
    actor: string,
    action: (typeof scientificStudyActions)[number],
  ) =>
    policy.authorize(
      await resolvePrincipal(db, `explicit-${actor}`),
      action,
      sid,
    );
  const grant = async (actor: string, action: string, unit = false) => {
    const id = randomUUID();
    await db.query(
      'INSERT INTO study_access_grant(id,study_id,principal_id,unit_id,action,granted_by) VALUES($1,$2,$3,$4,$5,$6)',
      [
        id,
        sid,
        unit ? null : `explicit-${actor}`,
        unit ? 'explicit-dept' : null,
        action,
        'explicit-admin',
      ],
    );
    return id;
  };
  const grantsBefore = await db.query(
    'SELECT * FROM study_access_grant ORDER BY id',
  );
  const runsBefore = await db.query(
    'SELECT * FROM experiment_run ORDER BY run_id',
  );
  const inventory = (
    await db.transaction(async (sql) => {
      await sql.query(
        'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
      );
      return inventoryImplicitScientificAccess(sql);
    })
  ).filter((row) => row.study_id === sid);
  assert.equal(
    inventory.length,
    8,
    'reasoning management was already explicit-only',
  );
  assert.ok(inventory.every((row) => row.transition === 'REVIEW_REQUIRED'));
  assert.deepEqual(
    await db.query('SELECT * FROM study_access_grant ORDER BY id'),
    grantsBefore,
    'inventory is read-only',
  );

  for (const action of scientificStudyActions) {
    for (const actor of ['owner', 'member', 'leader', 'admin', 'outsider']) {
      const denied = await decision(actor, action);
      assert.equal(denied.effect, 'DENY', `${actor}: ${action}`);
      assert.equal(
        denied.reason,
        actor === 'outsider' ? 'OUT_OF_SCOPE' : 'MISSING_CAPABILITY',
      );
      const id = await grant(actor, action);
      const explicit = await decision(actor, action);
      assert.equal(explicit.effect, actor === 'outsider' ? 'DENY' : 'ALLOW');
      assert.equal(
        explicit.reason,
        actor === 'outsider' ? 'OUT_OF_SCOPE' : 'EXPLICIT_GRANT',
        'role must never mask an applicable explicit grant',
      );
      // No other scientific capability follows from this grant.
      for (const other of scientificStudyActions.filter((a) => a !== action))
        assert.equal((await decision(actor, other)).effect, 'DENY');
      await db.query('UPDATE study_access_grant SET active=false WHERE id=$1', [
        id,
      ]);
      assert.equal(
        (await decision(actor, action)).effect,
        'DENY',
        'revocation applies on the next command, including owner/admin',
      );
      await db.query(
        "UPDATE study_access_grant SET active=true,expires_at='2000-01-01' WHERE id=$1",
        [id],
      );
      assert.equal(
        (await decision(actor, action)).effect,
        'DENY',
        'expired grants cannot revive implicit access',
      );
      await db.query('DELETE FROM study_access_grant WHERE id=$1', [id]);
    }
    const unitId = await grant('member', action, true);
    assert.equal((await decision('member', action)).reason, 'EXPLICIT_GRANT');
    assert.equal(
      (await decision('leader', action)).effect,
      'DENY',
      'managed-only membership is not an explicit unit capability',
    );
    await db.query(
      "DELETE FROM auth_membership WHERE principal_id='explicit-member'",
    );
    assert.equal((await decision('member', action)).effect, 'DENY');
    await db.query(
      "INSERT INTO auth_membership VALUES('explicit-member','explicit-dept',false)",
    );
    await db.query('DELETE FROM study_access_grant WHERE id=$1', [unitId]);
  }
  // Explicit resource relationship plus capability supports approved cross-org collaboration.
  const view = await grant('outsider', 'VIEW_RUN'),
    create = await grant('outsider', 'CREATE_RUN');
  assert.equal(
    (await decision('outsider', 'CREATE_RUN')).reason,
    'EXPLICIT_GRANT',
  );
  await db.query('UPDATE study_access_grant SET active=false WHERE id=$1', [
    view,
  ]);
  assert.equal(
    (await decision('outsider', 'CREATE_RUN')).reason,
    'OUT_OF_SCOPE',
  );
  await db.query('DELETE FROM study_access_grant WHERE id IN ($1,$2)', [
    view,
    create,
  ]);
  // Legacy responsible reason is still inventoried; explicit authority survives transition.
  const ownerGrant = await grant('owner', 'CREATE_RUN');
  const preserved = (await inventoryImplicitScientificAccess(db)).find(
    (row) => row.study_id === sid && row.action === 'CREATE_RUN',
  );
  assert.equal(preserved?.transition, 'EXPLICIT_GRANT_PRESERVED');
  assert.equal(preserved?.proposedReason, 'EXPLICIT_GRANT');
  await db.query(
    "UPDATE auth_principal SET active=false WHERE id='explicit-owner'",
  );
  assert.equal(
    (
      await policy.authorize(
        {
          principalId: 'explicit-owner',
          userId: 'explicit-owner',
          role: 'ADMIN',
        },
        'CREATE_RUN',
        sid,
      )
    ).effect,
    'DENY',
    'trusted principal must still be active; supplied role is not authority',
  );
  await db.query(
    "UPDATE auth_principal SET active=true WHERE id='explicit-owner'",
  );
  await db.query('DELETE FROM study_access_grant WHERE id=$1', [ownerGrant]);
  // Well-formed HTTP commands cannot bypass policy; forged client fingerprints do not grant authority.
  for (const operation of ['run.preview', 'run.create', 'run.create.preview']) {
    const response = await handleRepositoryRequest(
      new Request('http://localhost/api/repository', {
        method: 'POST',
        body: JSON.stringify({
          operation,
          slug,
          commandId: randomUUID(),
          input: { seriesSlug: slug, source: 'BLANK' },
          fingerprint: 'forged',
          command: { commandId: randomUUID() },
        }),
      }),
      (input, dispatch) =>
        authorizedOperation(
          db,
          'explicit-owner',
          input,
          dispatch ?? dispatchRepository,
        ),
    );
    assert.equal(response.status, 403, operation);
  }
  for (const operation of [
    'study.reasoning.initialize',
    'study.reasoning.confirm',
  ]) {
    await assert.rejects(
      authorizedOperation(
        db,
        'explicit-owner',
        { operation, slug },
        dispatchRepository,
      ),
      /access denied/,
    );
  }
  const owner = await resolvePrincipal(db, 'explicit-owner');
  assert.equal(
    (await policy.authorize(owner, 'EDIT_STUDY', sid)).effect,
    'ALLOW',
  );
  assert.equal(
    (await policy.authorize(owner, 'EDIT_STUDY_SETUP', sid)).effect,
    'ALLOW',
  );
  assert.equal(
    (
      await policy.authorize(
        await resolvePrincipal(db, 'explicit-admin'),
        'MANAGE_ACCESS',
        sid,
      )
    ).effect,
    'ALLOW',
  );
  const permissions = await policy.permissions(owner, sid);
  assert.equal(permissions.canCreateRun, false);
  assert.equal(permissions.canEditPlan, false);
  assert.ok(
    Object.values(await policy.scientificPermissions(owner, sid)).every(
      (value) => !value,
    ),
  );
  assert.deepEqual(
    await db.query('SELECT * FROM experiment_run ORDER BY run_id'),
    runsBefore,
    'policy checks never rewrite historical Runs',
  );
  assert.deepEqual(
    await db.query('SELECT * FROM study_access_grant ORDER BY id'),
    grantsBefore,
    'no migration/backfill silently grants rights',
  );
  // Native contracts share one disposable database; remove only this contract's own rows.
  await db.query('DELETE FROM study_access WHERE study_id=$1', [sid]);
  await db.query('DELETE FROM study WHERE study_id=$1', [sid]);
  await db.query(
    "DELETE FROM auth_membership WHERE unit_id IN ('explicit-dept','explicit-other')",
  );
  await db.query(
    "DELETE FROM auth_principal WHERE id IN ('explicit-owner','explicit-member','explicit-leader','explicit-admin','explicit-outsider')",
  );
  await db.query(
    "DELETE FROM auth_org_unit WHERE id IN ('explicit-dept','explicit-other')",
  );
}
