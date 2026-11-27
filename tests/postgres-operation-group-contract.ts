import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DxtApplication } from '@/src/application/dxt-application';
import { createProductionSliceRepositories } from './explicit-scientific-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import {
  addOperationGroup,
  applyOperationDesign,
  commonOperationDesign,
  removeOperationGroup,
} from '@/src/features/run-registration/operation-design';
import { effectiveAssignments } from '@/src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';

export async function operationGroupContract(db: SqlDatabase) {
  const configuration = await hydrateConfigurationPackages(db, [
    'config-package-photo-v1',
    'config-package-material-rd-v1',
  ]);
  const app = new DxtApplication(
    createProductionSliceRepositories(db, configuration),
  );
  for (const slug of [
    'dts-improvement',
    'adhesion-material-optimization',
  ] as const) {
    const legacy = await app.createRunFromStudy(
      slug,
      'STUDY_DEFAULT',
      `groups-source-${slug}`,
    );
    let draft = structuredClone(legacy);
    draft.id = `groups-${randomUUID()}-0`;
    draft.runNumber = 0;
    draft.conditionResolution = 'GROUPS_V2';
    const numeric = draft.assignments.find(
        (a) => a.kind === 'CONDITION' && Number.isFinite(Number(a.value)),
      )!,
      op = numeric.processStepId!;
    const [s1, s2, s3, s4] = draft.subjects;
    assert.ok(s4);
    let design = addOperationGroup(
      commonOperationDesign(draft.subjects.map((s) => s.id)),
      { id: 'base', kind: 'BASE', name: 'Base' },
    );
    design = addOperationGroup(design, {
      id: 'split',
      kind: 'SPLIT',
      name: 'Split',
    });
    design.allocations[s1.id] = { state: 'ASSIGNED', groupId: 'base' };
    design.allocations[s2.id] = { state: 'ASSIGNED', groupId: 'split' };
    design.allocations[s3.id] = { state: 'SKIP' };
    design.allocations[s4.id] = { state: 'UNASSIGNED' };
    draft = applyOperationDesign(draft, op, design);
    draft.assignments = draft.assignments.filter(
      (a) => a.processStepId !== op || (!a.subjectId && a.id === numeric.id),
    );
    draft.assignments.push(
      {
        ...numeric,
        id: 'group-condition',
        subjectId: null,
        groupId: 'split',
        value: '7',
        intentRole: 'VARIED',
      },
      {
        ...numeric,
        id: 'subject-condition',
        subjectId: s2.id,
        value: '0',
        intentRole: 'FIXED',
      },
    );
    const saved = await app.repositories.run.saveSnapshot(draft, {
      commandId: `groups-create-${slug}`,
    });
    assert.equal(saved.conditionResolution, 'GROUPS_V2');
    assert.deepEqual(saved.operationDesign, draft.operationDesign);
    assert.equal(
      saved.assignments.filter((a) => a.groupId).length,
      1,
      'not expanded into Subject assignments',
    );
    const physical = (
      await db.query<{ run_id: string }>(
        'SELECT run_id FROM experiment_run WHERE run_domain_id=$1',
        [saved.id],
      )
    ).rows[0].run_id;
    assert.equal(
      (
        await db.query('SELECT 1 FROM execution_event WHERE run_id=$1', [
          physical,
        ])
      ).rowCount,
      0,
    );
    const effective = (p: typeof saved, s: string) =>
      Object.values(effectiveAssignments(p, s)).find(
        (a) => a.processStepId === op && a.label === numeric.label,
      );
    assert.equal(effective(saved, s2.id)?.value, '0');
    assert.equal(effective(saved, s2.id)?.intentRole, 'FIXED');
    assert.equal(effective(saved, s3.id), undefined);
    const sourceBeforeCopy = structuredClone(saved);
    const copied = await app.repositories.run.saveSnapshot(
      { ...saved, id: `groups-copy-${randomUUID()}-0`, runNumber: 0 },
      { commandId: `groups-copy-${slug}` },
    );
    assert.notEqual(copied.id, saved.id);
    assert.deepEqual(copied.operationDesign, saved.operationDesign);
    assert.equal(effective(copied, s2.id)?.value, '0');
    assert.equal(effective(copied, s3.id), undefined);
    const copyPhysical = (
      await db.query<{ run_id: string }>(
        'SELECT run_id FROM experiment_run WHERE run_domain_id=$1',
        [copied.id],
      )
    ).rows[0].run_id;
    const sourceOps = (
      await db.query<{ run_operation_id: string }>(
        'SELECT run_operation_id FROM run_operation WHERE run_id=$1',
        [physical],
      )
    ).rows.map((r) => r.run_operation_id);
    const copyOps = (
      await db.query<{ run_operation_id: string }>(
        'SELECT run_operation_id FROM run_operation WHERE run_id=$1',
        [copyPhysical],
      )
    ).rows.map((r) => r.run_operation_id);
    assert.ok(
      copyOps.length > 0 && copyOps.every((id) => !sourceOps.includes(id)),
      'copied physical Operation identities are independent',
    );
    const copyRecord = (await app.runs.loadPlanning(copied.id))!;
    const copyDesign = structuredClone(
      copyRecord.snapshot.operationDesign![op],
    );
    copyDesign.groups[1].name = 'Copy-only Split';
    copyDesign.allocations[s2.id] = { state: 'SKIP' };
    await app.runs.savePlanning(
      {
        ...copyRecord,
        snapshot: applyOperationDesign(copyRecord.snapshot, op, copyDesign),
      },
      `groups-copy-edit-${slug}`,
    );
    assert.deepEqual(
      await app.repositories.run.getSnapshot(saved.id),
      sourceBeforeCopy,
      'copy edits never mutate source design, scopes or values',
    );
    let record = (await app.runs.loadPlanning(saved.id))!;
    const oldWriter = {
      ...record,
      snapshot: {
        ...record.snapshot,
        operationDesign: undefined,
        assignments: record.snapshot.assignments.filter((a) => !a.groupId),
      },
    };
    await assert.rejects(
      app.runs.savePlanning(oldWriter, `groups-old-writer-${slug}`),
      /cannot be discarded/,
    );
    assert.deepEqual(
      await app.runs.loadPlanning(saved.id),
      record,
      'old writer is atomic and cannot erase explicit design',
    );
    const moved = applyOperationDesign(record.snapshot, op, {
      ...design,
      allocations: {
        ...design.allocations,
        [s2.id]: { state: 'ASSIGNED', groupId: 'base' },
      },
    });
    await app.runs.savePlanning(
      { ...record, snapshot: moved },
      `groups-move-${slug}`,
    );
    record = (await app.runs.loadPlanning(saved.id))!;
    assert.equal(effective(record.snapshot, s2.id)?.value, '0');
    const cleared = {
      ...record.snapshot,
      assignments: record.snapshot.assignments.filter(
        (a) => a.subjectId !== s2.id,
      ),
    };
    await app.runs.savePlanning(
      { ...record, snapshot: cleared },
      `groups-clear-${slug}`,
    );
    record = (await app.runs.loadPlanning(saved.id))!;
    assert.equal(effective(record.snapshot, s2.id)?.value, numeric.value);
    const noGroup = applyOperationDesign(
      record.snapshot,
      op,
      removeOperationGroup(record.snapshot.operationDesign![op], 'base'),
    );
    await app.runs.savePlanning(
      { ...record, snapshot: noGroup },
      `groups-delete-${slug}`,
    );
    record = (await app.runs.loadPlanning(saved.id))!;
    assert.equal(
      record.snapshot.operationDesign![op].allocations[s2.id].state,
      'UNASSIGNED',
    );
    const invalid = structuredClone(record);
    invalid.snapshot.operationDesign![op].allocations[s1.id] = {
      state: 'ASSIGNED',
      groupId: 'unknown',
    };
    await assert.rejects(
      app.runs.savePlanning(invalid, `groups-invalid-${slug}`),
    );
    assert.deepEqual(await app.runs.loadPlanning(saved.id), record);
    const missing = { ...record.snapshot, assignments: [] };
    await app.runs.savePlanning(
      { ...record, snapshot: missing },
      `groups-missing-${slug}`,
    );
    record = (await app.runs.loadPlanning(saved.id))!;
    assert.deepEqual(record.snapshot.assignments, []);
    const model = createExperimentWorkspace(record.snapshot, configuration),
      state = await app.loadLifecycle(
        record.snapshot,
        lifecycleAuthoringProfiles[slug],
        'ACTUAL',
      );
    const applied = record.snapshot.steps.find(
      (s) => s.id !== op && s.role === 'PROCESS',
    )!;
    await app.recordActual(state, model, {
      id: `groups-actual-${slug}`,
      operationId: applied.id,
      subjectId: s1.id,
      status: 'COMPLETED',
      startedAt: '2026-11-27T00:00:00Z',
      endedAt: '2026-11-27T00:10:00Z',
      actualOverrides: {},
    });
    await assert.rejects(
      app.runs.savePlanning(record, `groups-lock-${slug}`),
      /locked/,
    );
    assert.deepEqual(
      await app.repositories.run.getSnapshot(legacy.id),
      legacy,
      'legacy interpretation unchanged',
    );
  }
}
