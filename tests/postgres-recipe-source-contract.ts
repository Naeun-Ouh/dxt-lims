import { operationGroupLabel } from '@/src/features/run-registration/operation-group-display';
import { removeOperationGroup } from '@/src/features/run-registration/operation-design';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { DxtApplication } from '@/src/application/dxt-application';
import {
  recipeSourceCatalog,
  readRecipeSourceBindings,
  readRecipeSourceUsage,
} from '@/src/infrastructure/postgres/postgres-recipe-sources';
import { sampleOperation } from '@/src/infrastructure/postgres/sample-lifecycle';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { createProductionSliceRepositories } from './explicit-scientific-repositories';
import { scientificTestPrincipal as pid } from './postgres-reasoning-fixtures';
import type {
  SqlDatabase,
  SqlSession,
} from '@/src/infrastructure/postgres/sql-database';
import type { RecipeSourceBinding } from '@/src/application/recipe-source';
import {
  resolveRecipeSource,
  remapRecipeSourceBindings,
} from '@/src/application/recipe-source';
import {
  applyOperationDesign,
  commonOperationDesign,
  addOperationGroup,
} from '@/src/features/run-registration/operation-design';

export async function recipeSourceContract(db: SqlDatabase) {
  const configuration = await hydrateConfigurationPackages(db, [
    'config-package-photo-v1',
  ]);
  const app = new DxtApplication(
    createProductionSliceRepositories(db, configuration),
  );
  await db.query(
    "INSERT INTO auth_membership(principal_id,unit_id,managed) VALUES($1,'contract-scientific-department',false) ON CONFLICT DO NOTHING",
    [pid],
  );
  for (const action of ['READ_SAMPLE', 'REGISTER_SAMPLE', 'REVISE_SAMPLE'])
    await db.query(
      "INSERT INTO dxt_sample.access_grant(id,owning_org_id,principal_id,action,granted_by) VALUES($1,'contract-scientific-department',$2,$3,$2)",
      [`source-${action}`, pid, action],
    );
  const sample = (revision: number) => ({
    owningOrgId: 'contract-scientific-department',
    sample: {
      id: 'source-contract-sample',
      sampleCode: 'AGENT SOURCE CONTRACT',
      name: 'Disposable source contract',
      materialId: null,
      supplierId: null,
      description: null,
      status: 'Draft',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    revision: {
      id: `source-contract-r${revision}`,
      sampleId: 'source-contract-sample',
      revision,
      requestNumber: null,
      developmentItemNumber: null,
      registrationSource: 'DIRECT_REGISTRATION',
      effectiveAt: '2026-01-01T00:00:00.000Z',
      status: 'Draft',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    composition: {
      nodes: [
        {
          id: 'root',
          nodeType: 'SAMPLE_REVISION',
          referenceId: `source-contract-r${revision}`,
          label: 'Source test root',
        },
      ],
      edges: [],
    },
    properties: [],
  });
  for (const revision of [1, 2])
    await sampleOperation(db, pid, {
      operation: 'write',
      commandId: `source-register-${revision}`,
      expectedLatest: revision - 1,
      aggregate: sample(revision),
    });
  const base = await app.createRunFromStudy(
    'dts-improvement',
    'STUDY_DEFAULT',
    'source-base-create',
  );
  const input = {
    ...base,
    id: 'source-group-run-1',
    conditionResolution: 'GROUPS_V2' as const,
    operationDesign: Object.fromEntries(
      base.steps.map((step) => [
        step.id,
        commonOperationDesign(base.subjects.map((s) => s.id)),
      ]),
    ),
  };
  const created = await app.repositories.run.saveSnapshot(input, {
    commandId: 'source-group-create',
  });
  const recipe = created.assignments.find((a) => a.kind === 'RECIPE')!;
  assert.ok(recipe);
  const packageId = created.configurationPackageVersionId;
  await db.query(
    "INSERT INTO auth_org_unit(id,kind) SELECT scope_owner_id,'AREA' FROM configuration_package_version WHERE package_version_id=$1 ON CONFLICT DO NOTHING",
    [packageId],
  );
  await db.query(
    "INSERT INTO configuration_access_scope(scope_kind,scope_owner_id,unit_id) SELECT scope_kind,COALESCE(scope_owner_id,''),scope_owner_id FROM configuration_package_version WHERE package_version_id=$1 ON CONFLICT DO NOTHING",
    [packageId],
  );
  await db.query(
    "INSERT INTO configuration_access_grant(id,scope_kind,scope_owner_id,principal_id,action,granted_by) SELECT $1,scope_kind,COALESCE(scope_owner_id,''),$2,'VIEW_CONFIGURATION',$2 FROM configuration_package_version WHERE package_version_id=$3",
    [randomUUID(), pid, packageId],
  );
  const parameters = (
    await db.query<{ id: string }>(
      "SELECT r.revision_id id FROM configuration_revision r JOIN configuration_package_member m ON m.member_kind=r.revision_kind AND m.member_revision_id=r.revision_id WHERE m.package_version_id=$1 AND r.revision_kind='definitionDescriptors' AND r.payload->>'editorKey'='REFERENCE' ORDER BY r.revision_id LIMIT 2",
      [packageId],
    )
  ).rows;
  assert.equal(parameters.length, 2);
  const register = (parameterRevisionId: string) =>
    recipeSourceCatalog(db, pid, {
      operation: 'register',
      packageVersionId: packageId,
      recipeRevisionId: recipe.referenceId,
      parameterRevisionId,
    });
  await assert.rejects(register(parameters[0].id), /permission/);
  await db.query(
    "INSERT INTO configuration_access_grant(id,scope_kind,scope_owner_id,principal_id,action,granted_by) SELECT $1,scope_kind,COALESCE(scope_owner_id,''),$2,'AUTHOR_DEFINITION',$2 FROM configuration_package_version WHERE package_version_id=$3",
    [randomUUID(), pid, packageId],
  );
  for (const parameter of parameters) await register(parameter.id);
  await assert.rejects(register('unconfigured-source-r1'), /pinned/);
  const nonRecipe = created.assignments.find(
    (a) => a.kind !== 'RECIPE' && a.referenceId,
  )!;
  assert.ok(nonRecipe);
  await assert.rejects(
    recipeSourceCatalog(db, pid, {
      operation: 'register',
      packageVersionId: packageId,
      recipeRevisionId: nonRecipe.referenceId,
      parameterRevisionId: parameters[0].id,
    }),
    /exact Recipe/,
  );
  const descriptors = await recipeSourceCatalog(db, pid, {
    operation: 'list',
    packageVersionId: packageId,
    recipeRevisionId: recipe.referenceId,
  });
  assert.equal(descriptors.length, 2);
  const common: RecipeSourceBinding = {
    id: 'source-common',
    operationId: recipe.processStepId!,
    groupId: null,
    subjectId: null,
    recipeRevisionId: recipe.referenceId,
    parameterRevisionId: parameters[0].id,
    state: 'SELECTED',
    sampleRevisionId: 'source-contract-r1',
  };
  const second = {
    ...common,
    id: 'source-second',
    parameterRevisionId: parameters[1].id,
    sampleRevisionId: 'source-contract-r2',
  };
  let record = (await app.runs.loadPlanning(created.id))!;
  await app.runs.savePlanning(
    {
      ...record,
      snapshot: { ...record.snapshot, recipeSourceBindings: [common, second] },
    },
    'source-common-save',
  );
  record = (await app.runs.loadPlanning(created.id))!;
  assert.deepEqual(record.snapshot.recipeSourceBindings, [common, second]);
  assert.equal(
    (await readRecipeSourceUsage(db, pid, 'source-contract-sample')).filter(
      (r) => r.state === 'CURRENT',
    ).length,
    2,
  );
  const physical = (
    await db.query<{ run_id: string }>(
      'SELECT run_id FROM experiment_run WHERE run_domain_id=$1',
      [created.id],
    )
  ).rows[0].run_id;
  const beforeHistory = Number(
    (
      await db.query<{ n: string }>(
        'SELECT count(*) n FROM dxt_sample.recipe_source_history WHERE run_id=$1',
        [physical],
      )
    ).rows[0].n,
  );
  await app.runs.savePlanning(
    {
      ...record,
      snapshot: { ...record.snapshot, recipeSourceBindings: [common, second] },
    },
    'source-common-unchanged',
  );
  assert.equal(
    Number(
      (
        await db.query<{ n: string }>(
          'SELECT count(*) n FROM dxt_sample.recipe_source_history WHERE run_id=$1',
          [physical],
        )
      ).rows[0].n,
    ),
    beforeHistory,
  );
  record = (await app.runs.loadPlanning(created.id))!;
  let design = addOperationGroup(
    record.snapshot.operationDesign![common.operationId],
    { id: 'source-split', kind: 'SPLIT', name: 'Source Group' },
  );
  design = {
    ...design,
    allocations: Object.fromEntries(
      record.snapshot.subjects.map((s) => [
        s.id,
        { state: 'ASSIGNED' as const, groupId: 'source-split' },
      ]),
    ),
  };
  const grouped = applyOperationDesign(
    record.snapshot,
    common.operationId,
    design,
  );
  const group = {
    ...common,
    id: 'source-group',
    groupId: 'source-split',
    sampleRevisionId: 'source-contract-r2',
  };
  const subject = {
    ...common,
    id: 'source-subject',
    subjectId: created.subjects[0].id,
    state: 'CLEAR' as const,
    sampleRevisionId: null,
  };
  await app.runs.savePlanning(
    {
      ...record,
      snapshot: {
        ...grouped,
        recipeSourceBindings: [common, second, group, subject],
      },
    },
    'source-group-save',
  );
  record = (await app.runs.loadPlanning(created.id))!;
  assert.equal(
    resolveRecipeSource(record.snapshot.recipeSourceBindings!, {
      ...common,
      subjectId: created.subjects[0].id,
      groupId: 'source-split',
    })?.binding.state,
    'CLEAR',
  );
  assert.equal(
    resolveRecipeSource(record.snapshot.recipeSourceBindings!, {
      ...common,
      subjectId: created.subjects[1].id,
      groupId: 'source-split',
    })?.binding.sampleRevisionId,
    'source-contract-r2',
  );
  // QA-01: display-only sequencing must preserve the remaining Group's exact links.
  const beforeSequence = structuredClone(record.snapshot);
  const originalGroup = beforeSequence.operationDesign![common.operationId].groups[0];
  const numbered = {
    ...beforeSequence.operationDesign![common.operationId],
    groups: [
      {id:'sequence-base',kind:'BASE' as const,name:'Base'},
      {id:'sequence-s1',kind:'SPLIT' as const,name:'Split 1'},
      {id:'sequence-s2',kind:'SPLIT' as const,name:'Split 2'},
      originalGroup,
    ],
  };
  await app.runs.savePlanning({...record,snapshot:applyOperationDesign(record.snapshot,common.operationId,numbered)},'sequence-initial');
  record=(await app.runs.loadPlanning(created.id))!;
  assert.equal(operationGroupLabel(record.snapshot.operationDesign![common.operationId],originalGroup.id),'Split 3 · Source Group');
  const withoutMiddle=removeOperationGroup(record.snapshot.operationDesign![common.operationId],'sequence-s2');
  await app.runs.savePlanning({...record,snapshot:applyOperationDesign(record.snapshot,common.operationId,withoutMiddle)},'sequence-delete');
  record=(await app.runs.loadPlanning(created.id))!;
  assert.equal(operationGroupLabel(record.snapshot.operationDesign![common.operationId],originalGroup.id),'Split 2 · Source Group');
  const withNew=addOperationGroup(record.snapshot.operationDesign![common.operationId],{id:'sequence-new',kind:'SPLIT',name:'Split'});
  await app.runs.savePlanning({...record,snapshot:applyOperationDesign(record.snapshot,common.operationId,withNew)},'sequence-add');
  record=(await app.runs.loadPlanning(created.id))!;
  const afterSequence=record.snapshot.operationDesign![common.operationId];
  assert.deepEqual(afterSequence.groups.map(g=>operationGroupLabel(afterSequence,g.id)),['Base','Split 1','Split 2 · Source Group','Split 3']);
  assert.deepEqual(afterSequence.groups.find(g=>g.id===originalGroup.id),originalGroup);
  assert.deepEqual(afterSequence.allocations,beforeSequence.operationDesign![common.operationId].allocations);
  assert.deepEqual(record.snapshot.recipeSourceBindings,beforeSequence.recipeSourceBindings,'Recipe/Parameter/Sample Revision identities unchanged');
  assert.deepEqual(record.snapshot.assignments,beforeSequence.assignments,'all condition and Recipe values and roles unchanged');

  // Invalid exact selection atomically rolls back every Plan edit.
  await assert.rejects(
    app.runs.savePlanning(
      {
        ...record,
        snapshot: {
          ...record.snapshot,
          recipeSourceBindings: [
            { ...common, recipeRevisionId: 'recipe-exp-r02-r1' },
          ],
        },
      },
      'source-wrong-recipe',
    ),
    /identity|Recipe|Source/,
  );
  assert.deepEqual(
    (await app.runs.loadPlanning(created.id))!.snapshot,
    record.snapshot,
  );
  await assert.rejects(
    app.runs.savePlanning(
      {
        ...record,
        snapshot: {
          ...record.snapshot,
          assignments: record.snapshot.assignments.map((a) =>
            a.id === recipe.id
              ? { ...a, referenceId: 'recipe-exp-r02-r1', value: 'EXP-R02' }
              : a,
          ),
        },
      },
      'source-recipe-changed',
    ),
    /Recipe changed/,
  );
  assert.deepEqual(
    (await app.runs.loadPlanning(created.id))!.snapshot,
    record.snapshot,
  );
  // Denied read is explicit and may preserve a selection; it never clears it.
  await db.query(
    "UPDATE dxt_sample.access_grant SET active=false WHERE id='source-READ_SAMPLE'",
  );
  const redacted = (await app.runs.loadPlanning(created.id))!;
  assert.equal(
    redacted.snapshot.recipeSourceBindings!.find((b) => b.id === common.id)
      ?.sampleAccessDenied,
    true,
  );
  assert.equal(
    redacted.snapshot.recipeSourceBindings!.find((b) => b.id === common.id)
      ?.sampleRevisionId,
    null,
  );
  await app.runs.savePlanning(
    {
      ...redacted,
      snapshot: {
        ...redacted.snapshot,
        intent: 'Unrelated Plan edit preserves denied Sources',
      },
    },
    'source-denied-preserve',
  );
  const deniedCurrent = (await app.runs.loadPlanning(created.id))!;
  await assert.rejects(
    app.runs.savePlanning(
      {
        ...deniedCurrent,
        snapshot: { ...deniedCurrent.snapshot, recipeSourceBindings: [common] },
      },
      'source-denied-write',
    ),
    /unavailable/,
  );
  const raw = (
    await db.query<{ sample_revision_id: string }>(
      'SELECT sample_revision_id FROM dxt_sample.recipe_source_selection WHERE run_id=$1 AND binding_id=$2',
      [physical, common.id],
    )
  ).rows[0];
  assert.equal(raw.sample_revision_id, 'source-contract-r1');
  await db.query(
    "UPDATE dxt_sample.access_grant SET active=true WHERE id='source-READ_SAMPLE'",
  );
  record = (await app.runs.loadPlanning(created.id))!;
  const copy = {
    ...record.snapshot,
    id: 'source-copy-run-1',
    recipeSourceBindings: remapRecipeSourceBindings(
      record.snapshot.recipeSourceBindings,
      new Map(record.snapshot.steps.map((s) => [s.id, s.id])),
      (_, i) => `copied-source-${i}`,
    ),
  };
  const copied = await app.repositories.run.saveSnapshot(copy, {
    commandId: 'source-copy-create',
  });
  assert.equal(
    copied.recipeSourceBindings?.find(
      (b) =>
        b.parameterRevisionId === common.parameterRevisionId &&
        !b.subjectId &&
        !b.groupId,
    )?.sampleRevisionId,
    'source-contract-r1',
  );
  const noGroup = {
    ...record.snapshot.operationDesign![common.operationId],
    groups: [],
    allocations: Object.fromEntries(
      record.snapshot.subjects.map((s) => [
        s.id,
        { state: 'UNASSIGNED' as const },
      ]),
    ),
  };
  const removed = applyOperationDesign(
    record.snapshot,
    common.operationId,
    noGroup,
  );
  await app.runs.savePlanning(
    {
      ...record,
      snapshot: { ...removed, recipeSourceBindings: [common, second, subject] },
    },
    'source-group-delete',
  );
  assert.ok(
    (await readRecipeSourceUsage(db, pid, 'source-contract-sample')).some(
      (r) => r.state === 'HISTORICAL',
    ),
  );
  assert.equal(
    (await app.repositories.run.getSnapshot(copied.id))!.recipeSourceBindings
      ?.length,
    4,
  );
  await assert.rejects(
    db.query(
      'UPDATE dxt_sample.recipe_source_history SET recorded_at=now() WHERE run_id=$1',
      [physical],
    ),
    /immutable/,
  );
  await assert.rejects(
    db.query(
      'DELETE FROM dxt_sample.recipe_source_descriptor WHERE package_version_id=$1',
      [packageId],
    ),
    /immutable/,
  );
  // Scientific grants stay independent from responsibility and Sample visibility.
  const finalRecord = (await app.runs.loadPlanning(created.id))!;
  await db.query(
    "UPDATE study_access_grant SET active=false WHERE principal_id=$1 AND action='EDIT_RUN_PLAN'",
    [pid],
  );
  await assert.rejects(
    app.runs.savePlanning(
      {
        ...finalRecord,
        snapshot: { ...finalRecord.snapshot, intent: 'Denied source write' },
      },
      'source-write-denied',
    ),
    /scientific permission/,
  );
  await db.query(
    "UPDATE study_access_grant SET active=true WHERE principal_id=$1 AND action='EDIT_RUN_PLAN'",
    [pid],
  );
  await db.query(
    "INSERT INTO auth_principal VALUES('source-denied-viewer','source-denied-viewer',true,'GENERAL_USER')",
  );
  await assert.rejects(
    readRecipeSourceBindings(
      { query: db.query.bind(db), trustedPrincipalId: 'source-denied-viewer' },
      physical,
    ),
    /unavailable/,
  );
  const copiedModel = createExperimentWorkspace(copied, configuration);
  const actualState = await app.loadLifecycle(
    copied,
    lifecycleAuthoringProfiles['dts-improvement'],
    'ACTUAL',
  );
  await app.recordActual(actualState, copiedModel, {
    id: 'source-actual-evidence',
    operationId: copied.recipeSourceBindings![0].operationId,
    subjectId: copied.subjects[0].id,
    status: 'COMPLETED',
    startedAt: '2026-11-27T01:00:00.000Z',
    endedAt: '2026-11-27T01:10:00.000Z',
    actualOverrides: {},
  });
  const locked = (await app.runs.loadPlanning(copied.id))!;
  await assert.rejects(
    app.runs.savePlanning(
      { ...locked, snapshot: { ...locked.snapshot, recipeSourceBindings: [] } },
      'source-after-actual',
    ),
    /locked/,
  );
  assert.equal(
    (await app.repositories.run.getSnapshot(copied.id))!.recipeSourceBindings
      ?.length,
    4,
  );
  const selectionSql: SqlSession = {
    query: db.query.bind(db),
    trustedPrincipalId: pid,
  };
  assert.equal(
    (await readRecipeSourceBindings(selectionSql, physical)).length,
    3,
  );
  return {
    runId: created.id,
    copiedId: copied.id,
    sampleId: 'source-contract-sample',
    physical,
  };
}
