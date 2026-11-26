import { conditionPrecedenceContract } from './postgres-condition-precedence-contract';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type {
  StudyIdentity,
  StudyCreateInput,
} from '@/src/application/study-creation';
import type {
  AuthoritativeRunPreview,
  RunCreationRequest,
} from '@/src/application/run-creation';
import { draftFromSnapshot } from '@/src/application/run-draft';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';

export async function runDraftContract(
  db: SqlDatabase,
  call: (principal: string, body: Record<string, unknown>) => Promise<unknown>,
  input: StudyCreateInput,
) {
  const owner = (body: Record<string, unknown>) =>
    call('bootstrap-owner', body);
  const study = (await owner({
    operation: 'study.create',
    input: {
      ...input,
      slug: `${input.slug}-draft`,
      name: 'TEST ONLY transient Run Draft',
    },
    commandId: randomUUID(),
  })) as StudyIdentity;
  const preview = (request: RunCreationRequest) =>
    owner({
      operation: 'run.preview',
      input: { ...request, includeDraftOptions: true },
    }) as Promise<AuthoritativeRunPreview>;
  const source = { seriesSlug: study.slug, source: 'BLANK' as const };
  const blank = await preview(source);
  assert.deepEqual(blank.snapshot.subjects, []);
  assert.deepEqual(blank.snapshot.steps, []);
  assert.equal(blank.readiness.status, 'NOT_READY');
  const defaults = await preview({ ...source, source: 'STUDY_DEFAULT' });
  assert.equal(defaults.snapshot.subjects.length, 0);
  const process = blank.options!.find(
    (o) => o.operation.role === 'PROCESS' && o.operation.items.length,
  )!;
  assert.ok(
    process.operation.items.every(
      (d) =>
        typeof process.conditionRequirements?.[d.applicabilityId] === 'boolean',
    ),
    'exact resolver provides requiredness display metadata',
  );
  const request: RunCreationRequest = {
    ...source,
    sourceFingerprint: blank.sourceFingerprint,
    draft: {
      subjects: [
        { id: 'DRAFT-01', displayLabel: 'D01' },
        { id: 'DRAFT-02', displayLabel: 'D02' },
      ],
      operations: [
        {
          optionId: process.id,
          subjectIds: ['DRAFT-01'],
          point: null,
          parameterIds: [],
          items: process.operation.items.map((d) => ({
            applicabilityId: d.applicabilityId,
            value: d.value,
            subjectId: 'DRAFT-01',
            intentRole: 'VARIED',
          })),
        },
      ],
    },
  };
  // Explicit test-only condition values from the seeded contract fixture; production supplies none.
  const ready = await preview(request);
  assert.equal(ready.readiness.status, 'READY');
  assert.deepEqual(
    ready.snapshot.subjectOperationIds['DRAFT-02'],
    [],
    'nonparticipant is not missing required conditions',
  );
  const absent = structuredClone(request);
  absent.draft!.operations[0].items = [];
  const incomplete = await preview(absent);
  assert.equal(incomplete.readiness.status, 'NOT_READY');
  await assert.rejects(
    owner({
      operation: 'run.create.preview',
      input: absent,
      fingerprint: incomplete.fingerprint,
      command: { commandId: randomUUID() },
    }),
    /required execution/,
  );
  const invalid = structuredClone(request);
  invalid.draft!.operations[0].subjectIds.push('UNKNOWN');
  await assert.rejects(preview(invalid), /participation/);
  const duplicate = structuredClone(request);
  duplicate.draft!.subjects.push(duplicate.draft!.subjects[0]);
  await assert.rejects(preview(duplicate), /Duplicate Subject/);
  await assert.rejects(
    preview({ ...request, sourceFingerprint: 'stale' }),
    /source changed/,
  );
  await assert.rejects(
    owner({
      operation: 'run.preview',
      input: { ...request, draft: { ...request.draft, target: 'unapproved' } },
    }),
  );
  await assert.rejects(
    call('bootstrap-reader', { operation: 'run.preview', input: request }),
  );
  const measurement = blank.options!.find(
    (o) => o.operation.role === 'MEASUREMENT',
  )!;
  const withMeasurement = structuredClone(request);
  withMeasurement.draft!.operations.push({
    optionId: measurement.id,
    subjectIds: ['DRAFT-01'],
    point: null,
    parameterIds: [],
    items: [],
  });
  assert.equal((await preview(withMeasurement)).readiness.status, 'NOT_READY');
  const p = blank.catalog!.parameters.find(
    (p) =>
      measurement.parameterIds.includes(p.id) &&
      p.semanticRole === 'MEASUREMENT',
  )!;
  const m = withMeasurement.draft!.operations[1];
  m.point = p.supportedMeasurementPoints[0];
  m.parameterIds = [p.id, ...p.requiredSupportingParameterIds];
  assert.equal((await preview(withMeasurement)).readiness.status, 'READY');
  assert.equal(
    (
      await db.query('SELECT 1 FROM experiment_run WHERE study_id=$1', [
        study.id,
      ])
    ).rowCount,
    0,
    'preview persists nothing',
  );
  const create = {
    operation: 'run.create.preview',
    input: request,
    fingerprint: ready.fingerprint,
    command: { commandId: randomUUID() },
  };
  await assert.rejects(call('bootstrap-reader', create));
  // Draft changes after Preview cannot use the earlier fingerprint.
  const edited = structuredClone(request);
  edited.draft!.operations[0].items[0].intentRole = 'FIXED';
  await assert.rejects(owner({ ...create, input: edited }), /source changed/);
  const saved = (await owner(create)) as RunPlanningSnapshot;
  assert.equal(saved.runNumber, 1);
  assert.deepEqual(await owner(create), saved);
  assert.deepEqual(
    await owner({ operation: 'run.created', slug: study.slug, runNumber: 1 }),
    saved,
  );
  assert.equal(saved.measurements.length, 0);
  assert.equal(saved.configurationPackageVersionId, input.packageVersionId);
  assert.deepEqual(saved.subjectOperationIds['DRAFT-02'], []);
  assert.equal(
    (
      await db.query('SELECT * FROM study_subject_default WHERE study_id=$1', [
        study.id,
      ])
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await db.query('SELECT * FROM study_setup_version WHERE study_id=$1', [
        study.id,
      ])
    ).rowCount,
    1,
  );
  assert.equal(
    (
      await db.query('SELECT * FROM reasoning_context WHERE study_id=$1', [
        study.id,
      ])
    ).rowCount,
    0,
  );
  const copy = await preview({
    seriesSlug: study.slug,
    source: 'PREVIOUS_RUN',
  });
  const draft = draftFromSnapshot(copy.snapshot, copy.options!);
  draft.operations[0].items[0].intentRole = 'FIXED';
  draft.operations.unshift(structuredClone(m));
  const second = {
    seriesSlug: study.slug,
    source: 'PREVIOUS_RUN' as const,
    sourceFingerprint: copy.sourceFingerprint,
    draft,
  };
  const secondPreview = await preview(second);
  assert.equal(secondPreview.readiness.status, 'READY');
  const run2 = (await owner({
    operation: 'run.create.preview',
    input: second,
    fingerprint: secondPreview.fingerprint,
    command: { commandId: randomUUID() },
  })) as RunPlanningSnapshot;
  assert.equal(run2.runNumber, 2);
  assert.equal(run2.steps[0].role, 'MEASUREMENT');
  assert.equal(run2.steps[1].role, 'PROCESS');
  assert.deepEqual(run2.measurements[0].parameterDefinitionIds, m.parameterIds);
  assert.equal(run2.measurements[0].point, m.point);
  assert.deepEqual(
    await owner({ operation: 'run.created', slug: study.slug, runNumber: 2 }),
    run2,
  );
  assert.equal(run2.provenance.sourceId, saved.id);
  assert.deepEqual(
    await owner({ operation: 'run.created', slug: study.slug, runNumber: 1 }),
    saved,
    'source Run is unchanged',
  );
  const finalBlank = await preview(source);
  assert.equal(
    finalBlank.snapshot.subjects.length,
    0,
    'Blank does not copy prior Run or Study Subjects',
  );
  await conditionPrecedenceContract(db, owner, study.slug, blank);
}
