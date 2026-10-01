import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import {
  dispatchRepository,
  handleRepositoryRequest,
} from '@/app/api/repository/route';
import { provisionConfigurationCatalog } from '@/src/infrastructure/postgres/postgres-configuration-authoring';
import { definitions } from '@/src/mock/reference';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type {
  StudyCreationOptions,
  StudyIdentity,
} from '@/src/application/study-creation';

export async function studyCreationContract(db: SqlDatabase) {
  const api = async (
    principal: string,
    input: Record<string, unknown>,
    database = db,
  ) =>
    handleRepositoryRequest(
      new Request('http://localhost/api/repository', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      (i, d) =>
        authorizedOperation(database, principal, i, d ?? dispatchRepository),
    );
  await provisionConfigurationCatalog(db, definitions);
  await db.query(
    "INSERT INTO auth_org_unit VALUES('create-dept','DEPARTMENT',NULL),('create-other','DEPARTMENT',NULL),('create-team','TEAM',NULL),('create-area','AREA',NULL)",
  );
  for (const id of [
    'creator',
    'creation-reader',
    'creation-expired',
    'creation-inactive',
    'creation-admin',
    'creation-team',
    'creation-blind',
    'creation-disabled',
  ])
    await db.query('INSERT INTO auth_principal VALUES($1,$1,$2,$3)', [
      id,
      id !== 'creation-disabled',
      id === 'creation-admin' ? 'ADMIN' : 'GENERAL_USER',
    ]);
  await db.query(
    "INSERT INTO configuration_access_scope VALUES('AREA','semiconductor-rd','create-area',NULL),('AREA','material-rd','create-area',NULL) ON CONFLICT DO NOTHING",
  );
  for (const id of [
    'creator',
    'creation-reader',
    'creation-expired',
    'creation-inactive',
    'creation-team',
  ])
    for (const scope of ['semiconductor-rd', 'material-rd'])
      await db.query(
        "INSERT INTO configuration_access_grant(id,scope_kind,scope_owner_id,principal_id,action,granted_by) VALUES($1,'AREA',$2,$3,'VIEW_CONFIGURATION','creator')",
        [randomUUID(), scope, id],
      );
  const grant = (
    id: string,
    department = 'create-dept',
    active = true,
    expires: string | null = null,
  ) =>
    db.query(
      'INSERT INTO study_creation_grant(id,principal_id,department_id,granted_by,active,expires_at) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), id, department, 'creator', active, expires],
    );
  await grant('creator');
  await grant('creation-expired', 'create-dept', true, '2000-01-01');
  await grant('creation-inactive', 'create-dept', false);
  await grant('creation-team', 'create-team');
  await grant('creation-blind');
  await grant('creation-disabled');
  await assert.rejects(grant('creator'), /unique|duplicate/i);
  const original = (
    await db.query('SELECT row_to_json(s) row FROM study s ORDER BY study_id')
  ).rows;
  const opts = (await (
    await api('creator', { operation: 'study.creation.options' })
  ).json()) as StudyCreationOptions;
  assert.deepEqual(opts.departments, ['create-dept']);
  assert.ok(opts.contexts.length >= 3, JSON.stringify(opts));
  const context = opts.contexts.find((c) => c.area === 'PHOTO')!;
  const input = {
    slug: 'new-research-study',
    name: 'New research study',
    intent: 'User supplied objective',
    departmentId: 'create-dept',
    packageVersionId: context.packageVersionId,
    experimentTypeProfileVersionId: context.experimentTypeProfileVersionId,
    subjectTypeRevisionId: context.subjectTypeRevisionId,
    areaDefinitionRevisionId: context.areaDefinitionRevisionId,
  };
  await db.query(`INSERT INTO configuration_package_version(package_version_id,package_id,version,scope_kind,scope_owner_id,status,payload)
    SELECT 'issue8-invalid-package',package_id,900,scope_kind,scope_owner_id,'ACTIVE',
      payload || jsonb_build_object('id','issue8-invalid-package','version',900,'status','ACTIVE','subjectTypeRevisionIds',jsonb_build_array('unresolved-subject'))
    FROM configuration_package_version WHERE package_version_id='config-package-photo-v1'`);
  const commandId = randomUUID();
  const request = { operation: 'study.create', input, commandId };
  assert.equal(
    (
      await api('creator', {
        ...request,
        input: { ...input, packageVersionId: 'issue8-invalid-package' },
      })
    ).status,
    403,
  );
  for (const principal of [
    'creation-reader',
    'creation-expired',
    'creation-inactive',
    'creation-admin',
    'creation-team',
    'creation-disabled',
    'unknown',
  ]) {
    assert.equal((await api(principal, request)).status, 403, principal);
  }
  assert.equal(
    (
      await api('creator', {
        ...request,
        input: { ...input, departmentId: 'create-other' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api('creation-team', {
        ...request,
        input: { ...input, departmentId: 'create-team' },
      })
    ).status,
    403,
  );
  assert.equal((await api('creation-blind', request)).status, 403);
  for (const field of [
    'packageVersionId',
    'experimentTypeProfileVersionId',
    'subjectTypeRevisionId',
    'areaDefinitionRevisionId',
  ])
    assert.equal(
      (
        await api('creator', {
          ...request,
          input: { ...input, [field]: 'not-an-exact-reference' },
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await api('creator', {
        ...request,
        input: { ...input, responsibleUserId: 'creation-admin' },
      })
    ).status,
    400,
  );
  // Inject a storage failure after Study + Setup insertion, before access creation.
  const faulty: SqlDatabase = {
    ...db,
    query: db.query.bind(db),
    close: async () => {},
    transaction: (work) =>
      db.transaction((sql) =>
        work({
          query: async (query, args) => {
            if (query.startsWith('INSERT INTO study_access('))
              throw new Error('injected storage failure');
            return sql.query(query, args);
          },
        }),
      ),
  };
  assert.equal((await api('creator', request, faulty)).status, 503);
  assert.equal(
    (await db.query('SELECT * FROM study WHERE series_slug=$1', [input.slug]))
      .rowCount,
    0,
  );
  assert.equal(
    (
      await db.query(
        'SELECT * FROM study_setup_version v LEFT JOIN study s USING(study_id) WHERE s.study_id IS NULL',
      )
    ).rowCount,
    0,
  );
  const response = await api('creator', request);
  assert.equal(
    response.status,
    200,
    JSON.stringify(await response.clone().json()),
  );
  const saved = (await response.json()) as StudyIdentity;
  for (const [key, value] of Object.entries(input))
    assert.equal(saved[key as keyof StudyIdentity], value);
  assert.equal(saved.responsibleUserId, 'creator');
  assert.equal(saved.visibility, 'RESPONSIBLE_DEPARTMENT');
  assert.equal(saved.setupRevision, 1);
  assert.deepEqual(await (await api('creator', request)).json(), saved);
  assert.equal(
    (await api('creator', { ...request, commandId: randomUUID() })).status,
    409,
  );
  assert.equal(
    (
      await api('creator', {
        ...request,
        input: { ...input, name: 'Changed retry' },
      })
    ).status,
    409,
  );
  assert.deepEqual(
    await (
      await api('creator', { operation: 'study.identity', slug: input.slug })
    ).json(),
    saved,
  );
  const list = (await (
    await api('creator', { operation: 'study.list' })
  ).json()) as { series_slug: string }[];
  assert.ok(
    list.some((s: { series_slug: string }) => s.series_slug === input.slug),
  );
  const setup = (await (
    await api('creator', { operation: 'study.load', slug: input.slug })
  ).json()) as import('@/src/features/experiment-series/study-setup-model').StudySetupSnapshot;
  assert.deepEqual(setup.operations, []);
  assert.equal(setup.configurationPackageVersionId, input.packageVersionId);
  assert.equal(
    (
      await db.query('SELECT * FROM study_subject_default WHERE study_id=$1', [
        saved.id,
      ])
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await db.query('SELECT * FROM experiment_run WHERE study_id=$1', [
        saved.id,
      ])
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await api('creation-reader', {
        operation: 'study.identity',
        slug: input.slug,
      })
    ).status,
    404,
  );
  const racedRequest = {
    ...request,
    commandId: randomUUID(),
    input: { ...input, slug: 'concurrent-empty-study' },
  };
  const raced = await Promise.all([
    api('creator', racedRequest),
    api('creator', racedRequest),
  ]);
  assert.ok(raced.every((response) => [200, 409].includes(response.status)));
  const raceSaved = (await (
    await api('creator', racedRequest)
  ).json()) as StudyIdentity;
  assert.equal(
    (
      await db.query('SELECT * FROM study WHERE series_slug=$1', [
        racedRequest.input.slug,
      ])
    ).rowCount,
    1,
  );
  // No unrelated Study or governance capability follows from the creation grant.
  assert.equal(
    (
      await api('creator', {
        operation: 'study.permissions',
        slug: 'dts-improvement',
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await api('creator', {
        operation: 'configuration.execute',
        request: {
          name: 'activatePackageVersion',
          input: context.packageVersionId,
        },
        commandId: randomUUID(),
      })
    ).status,
    403,
  );
  await db.query(
    "UPDATE study_creation_grant SET active=false WHERE principal_id='creator'",
  );
  assert.equal((await api('creator', request)).status, 403);
  assert.deepEqual(
    await (
      await api('creator', { operation: 'study.identity', slug: input.slug })
    ).json(),
    saved,
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT row_to_json(s) row FROM study s WHERE study_id<>$1 AND study_id<>$2 ORDER BY study_id',
        [saved.id, raceSaved.id],
      )
    ).rows,
    original,
  );
}
