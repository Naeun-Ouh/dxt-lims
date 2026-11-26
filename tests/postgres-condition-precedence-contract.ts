import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type {
  AuthoritativeRunPreview,
  RunCreationRequest,
} from '@/src/application/run-creation';
import type { PlanningWorkspaceRecord } from '@/src/application/repository-ports';
import { draftFromSnapshot } from '@/src/application/run-draft';
import {
  effectiveAssignments,
  type RunPlanningSnapshot,
} from '@/src/features/run-registration/planning-model';

/** Runs in the existing disposable Wafer/Specimen bootstrap contract, never UAT. */
export async function conditionPrecedenceContract(
  db: SqlDatabase,
  owner: (body: Record<string, unknown>) => Promise<unknown>,
  studySlug: string,
  blank: AuthoritativeRunPreview,
) {
  const option = blank.options!.find(
    (o) =>
      o.operation.role === 'PROCESS' &&
      o.operation.items.some((d) => d.editor === 'NUMBER'),
  )!;
  assert.ok(option, 'contract fixture supplies an exact numeric condition');
  const numeric = option.operation.items.find((d) => d.editor === 'NUMBER')!;
  const subjects = Array.from({ length: 13 }, (_, i) => ({
    id: `PRECEDENCE-${String(i + 1).padStart(2, '0')}`,
    displayLabel: `P${i + 1}`,
  }));
  const participating = subjects.slice(0, 12).map((s) => s.id);
  const preview = (input: RunCreationRequest) =>
    owner({
      operation: 'run.preview',
      input: { ...input, includeDraftOptions: true },
    }) as Promise<AuthoritativeRunPreview>;
  const read = (runNumber: number) =>
    owner({
      operation: 'run.created',
      slug: studySlug,
      runNumber,
    }) as Promise<RunPlanningSnapshot>;
  const count = async () =>
    (
      await db.query<{ count: string }>(
        'SELECT count(*)::text count FROM experiment_run JOIN study USING(study_id) WHERE study.series_slug=$1',
        [studySlug],
      )
    ).rows[0].count;
  const create = async (
    input: RunCreationRequest,
    checked: AuthoritativeRunPreview,
  ) =>
    owner({
      operation: 'run.create.preview',
      input,
      fingerprint: checked.fingerprint,
      command: { commandId: randomUUID() },
    }) as Promise<RunPlanningSnapshot>;
  const resolution = (plan: RunPlanningSnapshot) =>
    (plan as RunPlanningSnapshot & { conditionResolution?: string })
      .conditionResolution;
  const effective = (plan: RunPlanningSnapshot, subjectId: string) =>
    Object.values(effectiveAssignments(plan, subjectId)).find(
      (a) => a.kind === numeric.kind && a.label === numeric.label,
    )!;
  const common = option.operation.items.map((d) => ({
    applicabilityId: d.applicabilityId,
    value: d === numeric ? '37' : d.value,
    subjectId: null,
    intentRole: 'FIXED' as const,
  }));
  const specific = participating.slice(0, 11).map((subjectId, index) => ({
    applicabilityId: numeric.applicabilityId,
    value: String(index), // Explicit contract values; zero is not an empty cell.
    subjectId,
    intentRole: 'VARIED' as const,
  }));
  let saved!: RunPlanningSnapshot;
  for (const commonFirst of [true, false]) {
    const input: RunCreationRequest = {
      seriesSlug: studySlug,
      source: 'BLANK',
      sourceFingerprint: blank.sourceFingerprint,
      draft: {
        subjects,
        operations: [
          {
            optionId: option.id,
            subjectIds: participating,
            point: null,
            parameterIds: [],
            items: commonFirst
              ? [...common, ...specific]
              : [...specific, ...common],
          },
        ],
      },
    };
    const checked = await preview(input);
    assert.equal(checked.readiness.status, 'READY');
    const before = await count();
    assert.ok(checked.snapshot.assignments.length > 10);
    assert.equal(await count(), before, 'Preview is non-persistent');
    saved = await create(input, checked);
    const reload = await read(saved.runNumber);
    for (const plan of [checked.snapshot, saved, reload]) {
      assert.equal(resolution(plan), 'SUBJECT_FIRST_V1');
      for (const [index, subjectId] of participating.entries()) {
        assert.equal(
          effective(plan, subjectId).value,
          index < 11 ? String(index) : '37',
        );
        assert.equal(
          effective(plan, subjectId).intentRole,
          index < 11 ? 'VARIED' : 'FIXED',
        );
      }
      assert.deepEqual(
        plan.subjectOperationIds[subjects[12].id],
        [],
        'not applied is not Missing',
      );
    }
    const persisted = (
      await db.query<{ planning_context: { conditionResolution?: string } }>(
        'SELECT planning_context FROM experiment_run WHERE run_domain_id=$1',
        [saved.id],
      )
    ).rows[0];
    assert.equal(
      persisted.planning_context.conditionResolution,
      'SUBJECT_FIRST_V1',
    );
    const lexical = [...reload.assignments].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    assert.equal(
      effective({ ...reload, assignments: lexical }, participating[0]).value,
      '0',
      'lexical assignment-10/assignment-2 order cannot override Subject precedence',
    );
    assert.equal(
      effective(
        { ...reload, assignments: [...lexical].reverse() },
        participating[0],
      ).value,
      '0',
    );

    const invalid = structuredClone(input);
    invalid.draft!.operations[0].items.find(
      (a) => a.subjectId === participating[0],
    )!.value = 'invalid-number';
    const invalidPreview = await preview(invalid);
    assert.equal(
      invalidPreview.readiness.status,
      'NOT_READY',
      'invalid nonblank override must not silently fall back',
    );
    const noWrite = await count();
    await assert.rejects(create(invalid, invalidPreview));
    assert.equal(await count(), noWrite, 'invalid Create persists no Run');
    const duplicate = structuredClone(input);
    duplicate.draft!.operations[0].items.push({ ...specific[0] });
    await assert.rejects(preview(duplicate), /Duplicate assignment/);
    duplicate.draft!.operations[0].items.at(-1)!.value = ' ';
    await assert.rejects(
      preview(duplicate),
      /Duplicate assignment/,
      'blank filtering must not hide duplicate scope',
    );
    assert.equal(await count(), noWrite);
  }

  // Clearing a scoped value means inheriting the common plan condition, including its role.
  const sourceBefore = await read(saved.runNumber);
  const previous = await preview({
    seriesSlug: studySlug,
    source: 'PREVIOUS_RUN',
  });
  const draft = draftFromSnapshot(previous.snapshot, previous.options!);
  draft.operations[0].items.find(
    (a) => a.subjectId === participating[0],
  )!.value = '   ';
  const cleared: RunCreationRequest = {
    seriesSlug: studySlug,
    source: 'PREVIOUS_RUN',
    sourceFingerprint: previous.sourceFingerprint,
    draft,
  };
  const clearedPreview = await preview(cleared);
  assert.equal(clearedPreview.readiness.status, 'READY');
  const clearedRun = await create(cleared, clearedPreview);
  const clearedReload = await read(clearedRun.runNumber);
  for (const plan of [clearedPreview.snapshot, clearedReload]) {
    assert.equal(effective(plan, participating[0]).value, '37');
    assert.equal(effective(plan, participating[0]).intentRole, 'FIXED');
    assert.equal(
      plan.assignments.some(
        (a) => a.subjectId === participating[0] && a.label === numeric.label,
      ),
      false,
    );
  }
  assert.deepEqual(
    await read(saved.runNumber),
    sourceBefore,
    'copy/clear never changes the source Run',
  );

  const record = (await owner({
    operation: 'run.planning',
    runId: clearedRun.id,
  })) as PlanningWorkspaceRecord;
  const downgraded = structuredClone(record);
  delete (
    downgraded.snapshot as RunPlanningSnapshot & {
      conditionResolution?: string;
    }
  ).conditionResolution;
  await assert.rejects(
    owner({
      operation: 'run.plan.save',
      record: downgraded,
      command: { commandId: randomUUID(), expectedVersion: record.version },
    }),
    /condition resolution/i,
  );
  assert.deepEqual(
    await read(clearedRun.runNumber),
    clearedReload,
    'Plan cannot change interpretation version',
  );

  // A Subject assignment cannot evade common/Subject precedence by relabeling the same exact definition.
  const alteredLabel = structuredClone(record);
  const scoped = alteredLabel.snapshot.assignments.find(
    (a) => a.subjectId === participating[1] && a.label === numeric.label,
  )!;
  const exactReference = scoped.referenceId;
  scoped.label = `${numeric.label} altered label`;
  assert.equal(scoped.referenceId, exactReference);
  await assert.rejects(
    owner({
      operation: 'run.plan.save',
      record: alteredLabel,
      command: { commandId: randomUUID(), expectedVersion: record.version },
    }),
    /Condition name must match its exact definition/,
  );
  assert.deepEqual(
    await read(clearedRun.runNumber),
    clearedReload,
    'relabeling rejection leaves common and Subject assignments unchanged',
  );

  const invalidPlan = structuredClone(record);
  invalidPlan.snapshot.assignments.find(
    (a) => a.subjectId === participating[1] && a.label === numeric.label,
  )!.value = 'invalid-number';
  await assert.rejects(
    owner({
      operation: 'run.plan.save',
      record: invalidPlan,
      command: { commandId: randomUUID(), expectedVersion: record.version },
    }),
  );
  assert.deepEqual(
    await read(clearedRun.runNumber),
    clearedReload,
    'invalid nonblank Plan override cannot fall back or persist',
  );

  const blankPlan = structuredClone(record);
  const commonPlan = blankPlan.snapshot.assignments.find(
    (a) => a.subjectId === null && a.label === numeric.label,
  )!;
  commonPlan.value = '0';
  commonPlan.intentRole = 'FIXED';
  const blankScoped = blankPlan.snapshot.assignments.find(
    (a) => a.subjectId === participating[1] && a.label === numeric.label,
  )!;
  blankScoped.value = '  ';
  blankScoped.intentRole = 'VARIED';
  await owner({
    operation: 'run.plan.save',
    record: blankPlan,
    command: { commandId: randomUUID(), expectedVersion: record.version },
  });
  const blankPlanReload = await read(clearedRun.runNumber);
  assert.equal(
    effective(blankPlanReload, participating[1]).value,
    '0',
    'blank Subject Plan input inherits common zero, not Missing',
  );
  assert.equal(
    effective(blankPlanReload, participating[1]).intentRole,
    'FIXED',
  );
  assert.equal(
    blankPlanReload.assignments.some(
      (a) => a.subjectId === participating[1] && a.label === numeric.label,
    ),
    false,
  );
  assert.equal(
    effective(blankPlanReload, participating[2]).value,
    '2',
    'clearing one override leaves another Subject override intact',
  );
  assert.equal(resolution(blankPlanReload), 'SUBJECT_FIRST_V1');

  // Test-only representation of a pre-upgrade persisted Run: leave assignment/evidence rows untouched.
  await db.query(
    "UPDATE experiment_run SET planning_context=planning_context-'conditionResolution' WHERE run_domain_id=$1",
    [saved.id],
  );
  const legacy = await read(saved.runNumber);
  assert.equal(resolution(legacy), undefined);
  const legacyBefore = structuredClone(legacy);
  const legacyAssignments = (
    await db.query(
      'SELECT a.* FROM run_assignment a JOIN experiment_run r USING(run_id) WHERE r.run_domain_id=$1 ORDER BY run_assignment_id',
      [saved.id],
    )
  ).rows;
  const legacyCopy = await preview({
    seriesSlug: studySlug,
    source: 'EXISTING_RUN',
    sourceRunId: saved.id,
  });
  assert.equal(resolution(legacyCopy.snapshot), 'SUBJECT_FIRST_V1');
  assert.equal(legacyCopy.legacySourceAmbiguous, true);
  assert.ok(
    legacyCopy.sourceChanges?.some(
      (change) => change.before === '37' && change.after === '0',
    ),
    'copy review must disclose the effective value change from legacy ordering',
  );
  assert.deepEqual(
    await read(saved.runNumber),
    legacyBefore,
    'legacy read/preview does not reinterpret or mutate source',
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT a.* FROM run_assignment a JOIN experiment_run r USING(run_id) WHERE r.run_domain_id=$1 ORDER BY run_assignment_id',
        [saved.id],
      )
    ).rows,
    legacyAssignments,
  );
  const legacyRecord = (await owner({
    operation: 'run.planning',
    runId: saved.id,
  })) as PlanningWorkspaceRecord;
  (
    legacyRecord.snapshot as RunPlanningSnapshot & {
      conditionResolution?: string;
    }
  ).conditionResolution = 'SUBJECT_FIRST_V1';
  await assert.rejects(
    owner({
      operation: 'run.plan.save',
      record: legacyRecord,
      command: {
        commandId: randomUUID(),
        expectedVersion: legacyRecord.version,
      },
    }),
    /condition resolution/i,
  );
  assert.deepEqual(
    await read(saved.runNumber),
    legacyBefore,
    'Plan cannot opt historical Run into new semantics',
  );
}
