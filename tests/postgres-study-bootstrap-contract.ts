import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import { dispatchRepository } from '@/app/api/repository/route';
import { provisionConfigurationCatalog } from '@/src/infrastructure/postgres/postgres-configuration-authoring';
import { seedConfigurationRegistry } from '@/src/infrastructure/postgres/slice-seed';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type {
  StudyCreationOptions,
  StudyIdentity,
} from '@/src/application/study-creation';
import type {
  StudyBootstrapState,
  BootstrapSetupInput,
  InitialReasoningInput,
} from '@/src/application/study-bootstrap';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';

/** Isolated test fixtures only; no production catalog/defaults are modified. */
export async function studyBootstrapContract(db: SqlDatabase) {
  await provisionConfigurationCatalog(db, definitions);
  await db.query(
    "INSERT INTO auth_org_unit VALUES('bootstrap-dept','DEPARTMENT',NULL),('bootstrap-area','AREA',NULL)",
  );
  for (const id of [
    'bootstrap-owner',
    'bootstrap-reasoner',
    'bootstrap-reader',
    'bootstrap-admin',
  ]) {
    await db.query('INSERT INTO auth_principal VALUES($1,$1,true,$2)', [
      id,
      id === 'bootstrap-admin' ? 'ADMIN' : 'GENERAL_USER',
    ]);
    await db.query(
      "INSERT INTO auth_membership VALUES($1,'bootstrap-dept',false)",
      [id],
    );
    for (const scope of ['semiconductor-rd', 'material-rd']) {
      await db.query(
        "INSERT INTO configuration_access_scope VALUES('AREA',$1,'bootstrap-area',NULL) ON CONFLICT DO NOTHING",
        [scope],
      );
      await db.query(
        "INSERT INTO configuration_access_grant(id,scope_kind,scope_owner_id,principal_id,action,granted_by) VALUES($1,'AREA',$2,$3,'VIEW_CONFIGURATION','bootstrap-owner')",
        [randomUUID(), scope, id],
      );
    }
  }
  await db.query(
    "INSERT INTO study_creation_grant(id,principal_id,department_id,granted_by) VALUES($1,'bootstrap-owner','bootstrap-dept','bootstrap-owner')",
    [randomUUID()],
  );
  const call = (
    principal: string,
    body: Record<string, unknown>,
    database = db,
  ) => authorizedOperation(database, principal, body, dispatchRepository);
  const owner = (body: Record<string, unknown>) =>
    call('bootstrap-owner', body);
  const before = (
    await db.query(
      'SELECT run_id,run_domain_id FROM experiment_run ORDER BY run_id',
    )
  ).rows;
  const contextsBefore = (
    await db.query('SELECT * FROM reasoning_context ORDER BY id')
  ).rows;
  const registry = structuredClone(
    configurationRepository.getConfigurationRegistry(),
  );
  for (const [domain, sourceId] of [
    ['wafer', 'config-package-photo-v2'],
    ['specimen', 'config-package-material-rd-v1'],
  ] as const) {
    const source = registry.packages.find((p) => p.id === sourceId)!;
    const criteria = definitions.evaluationCriteria
      .filter((c) =>
        definitions.evaluations[0].criterionDefinitionIds.includes(c.id),
      )
      .map((c) => ({
        ...c,
        id: `bootstrap-${domain}-${c.id}`,
        scope: source.scope,
      }));
    const evaluation = {
      ...definitions.evaluations[0],
      id: `bootstrap-${domain}-evaluation`,
      scope: source.scope,
      criterionDefinitionIds: criteria.map((c) => c.id),
    };
    const actions = definitions.nextActionTypes
      .filter((t) => t.active)
      .map((t) => ({
        ...t,
        id: `bootstrap-${domain}-${t.id}`,
        scope: source.scope,
      }));
    await provisionConfigurationCatalog(db, {
      ...definitions,
      evaluations: [...definitions.evaluations, evaluation],
      evaluationCriteria: [...definitions.evaluationCriteria, ...criteria],
      nextActionTypes: [...definitions.nextActionTypes, ...actions],
    });
    const reasoningRefs = [evaluation, ...criteria, ...actions];
    const pkg = {
      ...source,
      id: `bootstrap-${domain}-package`,
      packageId: `bootstrap-${domain}`,
      version: 1,
      definitionRevisionIds: [
        ...source.definitionRevisionIds,
        ...reasoningRefs.map((r) => r.id),
      ],
      nextActionTypeRevisionIds: actions.map((t) => t.id),
    };
    await seedConfigurationRegistry(db, {
      ...registry,
      packages: [pkg],
      externalReferences: [
        ...registry.externalReferences,
        ...reasoningRefs.map((r) => ({ id: r.id, scope: r.scope })),
      ],
    });
    await provisionMeasurementReferences(db, definitions);
    const options = (await owner({
      operation: 'study.creation.options',
    })) as StudyCreationOptions;
    const selected = options.contexts.find(
      (c) => c.packageVersionId === pkg.id,
    )!;
    assert.ok(selected);
    const slug = `bootstrap-${domain}-study`;
    const identity = (await owner({
      operation: 'study.create',
      commandId: randomUUID(),
      input: {
        slug,
        name: `TEST ONLY ${domain} bootstrap`,
        intent: 'Isolated contract validation',
        departmentId: 'bootstrap-dept',
        packageVersionId: pkg.id,
        experimentTypeProfileVersionId: selected.experimentTypeProfileVersionId,
        subjectTypeRevisionId: selected.subjectTypeRevisionId,
        areaDefinitionRevisionId: selected.areaDefinitionRevisionId,
      },
    })) as StudyIdentity;
    const load = () =>
      owner({
        operation: 'study.bootstrap.load',
        slug,
      }) as Promise<StudyBootstrapState>;
    // Independent configuration visibility is required even for a Study owner.
    await db.query(
      "UPDATE configuration_access_grant SET active=false WHERE principal_id='bootstrap-owner'",
    );
    await assert.rejects(load(), /configuration is unavailable/);
    await db.query(
      "UPDATE configuration_access_grant SET active=true WHERE principal_id='bootstrap-owner'",
    );
    const empty = await load();
    assert.equal(empty.readiness.status, 'NOT_READY');
    assert.equal(empty.subjects.length, 0);
    assert.equal(empty.setup.operations.length, 0);
    assert.equal(
      empty.canInitializeReasoning,
      false,
      'owner is not a reasoning manager',
    );
    const measurement = empty.options.find(
      (o) => o.operation.role === 'MEASUREMENT',
    )!;
    const parameter = empty.catalog.parameters.find(
      (p) =>
        measurement.parameterIds.includes(p.id) &&
        p.dataType === 'NUMBER' &&
        p.semanticRole === 'MEASUREMENT',
    )!;
    const point = parameter.supportedMeasurementPoints[0];
    const process = empty.options.find(
      (o) => o.operation.role === 'PROCESS' && o.operation.items.length,
    )!;
    const assignment = process.operation.items.find(
      (i) => i.editor === 'NUMBER',
    )!;
    const input: BootstrapSetupInput = {
      expectedRevision: 1,
      subjects: [{ id: `TEST-${domain}-01`, displayLabel: 'Test subject' }],
      operations: [
        {
          optionId: process.id,
          point: null,
          parameterIds: [],
          items: assignment
            ? [
                {
                  applicabilityId: assignment.applicabilityId,
                  value: assignment.value,
                  intentRole: 'FIXED',
                },
              ]
            : [],
        },
        {
          optionId: measurement.id,
          point,
          parameterIds: [
            parameter.id,
            ...parameter.requiredSupportingParameterIds,
          ],
          items: [],
        },
      ],
    };
    const commandId = randomUUID(),
      save = { operation: 'study.bootstrap.save', slug, input, commandId };
    await assert.rejects(
      call('bootstrap-reader', save),
      /not permitted|capability|access|available/i,
    );
    await assert.rejects(
      owner({
        ...save,
        input: {
          ...input,
          operations: [{ ...input.operations[0], optionId: 'not-in-package' }],
        },
      }),
    );
    const saved = (await owner(save)) as StudyBootstrapState;
    assert.equal(saved.setup.revision, 2);
    assert.equal(
      ((await owner(save)) as StudyBootstrapState).setup.revision,
      2,
      'retry does not add a version',
    );
    await assert.rejects(
      owner({
        ...save,
        input: {
          ...input,
          subjects: [{ id: 'changed', displayLabel: 'Changed' }],
        },
      }),
      /changed/i,
    );
    assert.deepEqual(saved.structuralMissing, []);
    assert.equal(saved.readiness.status, 'NOT_READY');
    const reasoning: InitialReasoningInput = {
      packageVersionId: pkg.id,
      confirmed: true,
      evaluationIds: [evaluation.id],
      nextActionIds: [pkg.nextActionTypeRevisionIds[0]],
      targetBindings: [
        {
          target: {
            id: 'test-target',
            parameterDefinitionId: parameter.id,
            operator: 'GTE',
            threshold: 1,
            lowerBound: null,
            upperBound: null,
            unitDefinitionId: parameter.unitId,
          },
          measurementPoint: point,
          resultGrain: 'SUBJECT_SUMMARY',
          aggregationMethod: 'MEAN',
        },
      ],
    };
    const init = {
      operation: 'study.reasoning.initialize',
      slug,
      input: reasoning,
      commandId: randomUUID(),
    };
    for (const p of ['bootstrap-owner', 'bootstrap-reader', 'bootstrap-admin'])
      await assert.rejects(
        call(p, init),
        /not permitted|capability|access|available/i,
      );
    await assert.rejects(
      owner({
        operation: 'run.preview',
        input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
      }).then(async (p) =>
        owner({
          operation: 'run.create.preview',
          input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
          fingerprint: (p as AuthoritativeRunPreview).fingerprint,
          command: { commandId: randomUUID() },
        }),
      ),
      /not ready/i,
    );
    await db.query(
      "INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES($1,$2,'bootstrap-reasoner','MANAGE_REASONING_CONTEXT','bootstrap-owner')",
      [randomUUID(), identity.id],
    );
    await assert.rejects(
      call('bootstrap-reasoner', {
        ...init,
        input: { ...reasoning, targetBindings: [] },
      }),
    );
    await assert.rejects(
      call('bootstrap-reasoner', {
        ...init,
        input: { ...reasoning, packageVersionId: 'wrong-exact-pin' },
      }),
    );
    await assert.rejects(
      call('bootstrap-reasoner', {
        ...init,
        input: { ...reasoning, evaluationIds: ['missing'] },
      }),
    );
    await assert.rejects(
      call('bootstrap-reasoner', {
        ...init,
        input: {
          ...reasoning,
          targetBindings: [
            {
              ...reasoning.targetBindings[0],
              target: {
                ...reasoning.targetBindings[0].target,
                unitDefinitionId: 'wrong-unit',
              },
            },
          ],
        },
      }),
    );
    assert.equal((await load()).readiness.status, 'NOT_READY');
    // A receipt failure must roll back the scientific context in the same transaction.
    const faulty: SqlDatabase = {
      ...db,
      query: db.query.bind(db),
      close: async () => {},
      transaction: (work) =>
        db.transaction((sql) =>
          work({
            query: async (query, args) => {
              if (
                query.startsWith('INSERT INTO study_initial_reasoning_receipt')
              )
                throw new Error('Injected receipt failure');
              return sql.query(query, args);
            },
          }),
        ),
    };
    await assert.rejects(call('bootstrap-reasoner', init, faulty), /Injected/);
    assert.equal(
      (
        await db.query('SELECT * FROM reasoning_context WHERE study_id=$1', [
          identity.id,
        ])
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await db.query(
          'SELECT * FROM study_initial_reasoning_receipt WHERE study_id=$1',
          [identity.id],
        )
      ).rowCount,
      0,
    );
    const attempts = [init, { ...init, commandId: randomUUID() }];
    const raced = await Promise.allSettled(
      attempts.map((request) => call('bootstrap-reasoner', request)),
    );
    assert.equal(
      raced.filter((r) => r.status === 'fulfilled').length,
      1,
      'one initial context wins',
    );
    assert.equal(
      (
        await db.query('SELECT * FROM reasoning_context WHERE study_id=$1', [
          identity.id,
        ])
      ).rowCount,
      1,
    );
    const winnerIndex = raced.findIndex((r) => r.status === 'fulfilled');
    const winning = attempts[winnerIndex];
    {
      assert.deepEqual(
        await call('bootstrap-reasoner', winning),
        (raced[winnerIndex] as PromiseFulfilledResult<unknown>).value,
      );
      await assert.rejects(
        call('bootstrap-reasoner', {
          ...winning,
          input: {
            ...reasoning,
            targetBindings: [
              {
                ...reasoning.targetBindings[0],
                target: { ...reasoning.targetBindings[0].target, threshold: 2 },
              },
            ],
          },
        }),
        /changed/i,
      );
    }
    await assert.rejects(
      call('bootstrap-reasoner', { ...init, commandId: randomUUID() }),
      /already|Runs/,
    );
    await assert.rejects(
      db.query(
        'UPDATE study_initial_reasoning_receipt SET request_hash=$2 WHERE study_id=$1',
        [identity.id, 'changed'],
      ),
    );
    await assert.rejects(
      owner({
        ...save,
        commandId: randomUUID(),
        input: { ...input, expectedRevision: 2 },
      }),
      /locked/i,
    );
    assert.equal((await load()).readiness.status, 'READY');
    await assert.rejects(
      call('bootstrap-reader', {
        operation: 'run.preview',
        input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
      }),
    );
    const preview = (await owner({
      operation: 'run.preview',
      input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
    })) as AuthoritativeRunPreview;
    assert.equal(
      preview.snapshot.subjects[0].type,
      domain === 'wafer' ? 'WAFER' : 'SPECIMEN',
    );
    assert.equal(preview.snapshot.subjects[0].id, `TEST-${domain}-01`);
    const run = (await owner({
      operation: 'run.create.preview',
      input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
      fingerprint: preview.fingerprint,
      command: { commandId: randomUUID() },
    })) as RunPlanningSnapshot;
    assert.equal(run.runNumber, 1);
    assert.equal(run.configurationPackageVersionId, pkg.id);
    assert.equal(run.steps.length, 2);
    assert.deepEqual(
      await owner({ operation: 'run.created', slug, runNumber: 1 }),
      run,
    );
    await assert.rejects(
      call('bootstrap-reasoner', { ...init, commandId: randomUUID() }),
    );
  }
  assert.deepEqual(
    (
      await db.query(
        'SELECT * FROM reasoning_context WHERE id=ANY($1::uuid[]) ORDER BY id',
        [contextsBefore.map((r) => r.id)],
      )
    ).rows,
    contextsBefore,
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT run_id,run_domain_id FROM experiment_run WHERE run_id=ANY($1::uuid[]) ORDER BY run_id',
        [before.map((r) => r.run_id)],
      )
    ).rows,
    before,
  );
  await assert.rejects(
    owner({ operation: 'study.bootstrap.load', slug: 'dts-improvement' }),
    'legacy studies are not bootstrapped',
  );
}
