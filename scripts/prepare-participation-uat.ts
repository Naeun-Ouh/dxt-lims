/** Trusted local UAT provisioning only; no product endpoint or table-state fabrication. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { participation25 } from '../tests/fixtures/participation-25';
import { PgDatabase } from '../src/infrastructure/postgres/pg-database';
import { authorizedOperation } from '../src/infrastructure/postgres/authorized-application';
import { validatePlanEdit } from '../src/application/plan-authoring';
import type { RunPlanningSnapshot } from '../src/features/run-registration/planning-model';
import type { PlanningWorkspaceRecord } from '../src/application/repository-ports';

const base = 'http://localhost:3200';
const slug = 'dts-improvement';
const batch = process.env.DXT_UAT_BATCH ?? '20260929-v1';
assert.match(batch, /^[a-z0-9-]{1,40}$/);
const prefix = `uat25-${batch}`;
const folder = `docs/evidence/participation-${batch}`;
const action = process.argv[2] ?? 'verify';
assert.ok(['provision', 'verify', 'reset-editable', 'lock'].includes(action));
await mkdir(folder, { recursive: true });

async function api<T>(body: object): Promise<T> {
  const response = await fetch(`${base}/api/repository`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(`${response.status}: ${JSON.stringify(value)}`);
  return value as T;
}
async function protectedState() {
  const result: Record<string, string> = {};
  for (const runNumber of [19, 20]) {
    const snapshot = await api<RunPlanningSnapshot>({
      operation: 'run.created',
      slug,
      runNumber,
    });
    const records = [snapshot];
    for (const operation of [
      'run.planning',
      'execution.load',
      'measurement.load',
      'evaluation.load',
      'decision.load',
    ]) {
      records.push(await api({ operation, runId: snapshot.id }));
    }
    result[String(runNumber)] = createHash('sha256')
      .update(JSON.stringify(records))
      .digest('hex');
  }
  return result;
}

function seed(kind: 'locked' | 'editable'): RunPlanningSnapshot {
  const fixture = participation25();
  const id = `${prefix}-${kind}-0`;
  const subjects = fixture.subjects.map((s, i) => ({
    ...s,
    id: `${prefix}-${kind}.W${String(i + 1).padStart(2, '0')}`,
  }));
  const steps = fixture.steps.map((s) => ({
    ...s,
    id: `${prefix}-${kind}-${s.label}`,
  }));
  const ids = Object.fromEntries(steps.map((s) => [s.label, s.id]));
  return {
    ...fixture,
    id,
    runNumber: 0,
    name: `UAT25 ${batch} — ${kind}`,
    createdAt: '2026-09-29',
    intent: `DISPOSABLE UAT ONLY · ${prefix} · ${kind}. Software participation validation; no physical experiment or scientific results.`,
    provenance: {
      kind: 'AD_HOC',
      label: `Isolated UAT ${prefix}`,
      sourceId: null,
    },
    subjects,
    candidateSubjects: subjects,
    steps,
    assignments: [],
    manufacturingContext: [
      { label: 'UAT batch (not a physical Lot)', value: `${prefix}-${kind}` },
    ],
    measurements: fixture.measurements.map((m) => ({
      ...m,
      id: `${prefix}-${kind}-measurement-D`,
      stepId: ids.D,
    })),
    subjectOperationIds: Object.fromEntries(
      subjects.map((s, i) => [
        s.id,
        i >= 15
          ? []
          : kind === 'editable'
            ? steps.map((o) => o.id)
            : [ids.P, i >= 10 ? ids.C : i % 2 === 0 ? ids.A : ids.B, ids.D],
      ]),
    ),
    delta: {
      sourceLabel: 'Isolated participation UAT',
      items: [],
      unchangedCount: 0,
    },
  };
}

type Manifest = {
  batch: string;
  editable: RunPlanningSnapshot;
  locked: RunPlanningSnapshot;
};
const before = await protectedState();
await writeFile(
  `${folder}/${action}-protected-before.json`,
  JSON.stringify(before, null, 2),
);
let manifest: Manifest;
if (action === 'provision') {
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(url.hostname) &&
      url.port === '55439' &&
      url.pathname === '/postgres',
    'Only the documented disposable local UAT database is allowed.',
  );
  assert.equal(process.env.DXT_DEV_PRINCIPAL, 'uat-owner');
  const database = PgDatabase.fromEnvironment();
  const runs = {} as Pick<Manifest, 'editable' | 'locked'>;
  try {
    for (const kind of ['locked', 'editable'] as const) {
      // Existing authorized transaction checks CREATE_RUN and current policy; the existing
      // full-snapshot repository command validates pinned references/readiness and allocates IDs.
      // This fixed fixture CLI is not an HTTP API for arbitrary client snapshots.
      runs[kind] = (await authorizedOperation(
        database,
        'uat-owner',
        {
          operation: 'run.create',
          slug,
          commandId: `${prefix}-${kind}-create`,
        },
        async (app, input) => {
          const snapshot = seed(kind);
          validatePlanEdit(snapshot, snapshot, app.repositories.configuration);
          return app.repositories.run.saveSnapshot(snapshot, {
            commandId: String(input.commandId),
          });
        },
      )) as RunPlanningSnapshot;
      const plan = await api<PlanningWorkspaceRecord>({
        operation: 'run.planning',
        runId: runs[kind].id,
      });
      const name = `UAT25 ${batch} — ${kind === 'editable' ? 'PARTICIPATION EDITABLE' : 'LOCK CHECK'}`;
      if (plan.snapshot.name !== name && !plan.lockReason) {
        await api({
          operation: 'run.plan.save',
          record: { ...plan, snapshot: { ...plan.snapshot, name } },
          command: {
            commandId: `${prefix}-${kind}-name`,
            expectedVersion: plan.version,
          },
        });
      }
      runs[kind] = await api({ operation: 'run.get', runId: runs[kind].id });
    }
    manifest = { batch, ...runs };
    await writeFile(
      `${folder}/manifest.json`,
      JSON.stringify(manifest, null, 2),
    );
  } finally {
    await database.close();
  }
} else {
  manifest = JSON.parse(
    await readFile(`${folder}/manifest.json`, 'utf8'),
  ) as Manifest;
}

if (action === 'reset-editable') {
  const record = await api<PlanningWorkspaceRecord>({
    operation: 'run.planning',
    runId: manifest.editable.id,
  });
  assert.ok(
    !record.lockReason,
    'Locked Run is never reset. Provision a fresh batch instead.',
  );
  assert.ok(
    record.snapshot.id.startsWith(prefix) &&
      record.snapshot.subjects.every((s) => s.id.startsWith(prefix)),
  );
  const snapshot = {
    ...record.snapshot,
    subjectOperationIds: Object.fromEntries(
      record.snapshot.subjects.map((s, i) => [
        s.id,
        i < 15 ? record.snapshot.steps.map((o) => o.id) : [],
      ]),
    ),
  };
  await api({
    operation: 'run.plan.save',
    record: { ...record, snapshot },
    command: { commandId: randomUUID(), expectedVersion: record.version },
  });
}
if (action === 'lock') {
  const snapshot = manifest.locked;
  assert.ok(snapshot.id.startsWith(prefix));
  const state = await api<{ version: number; records: unknown[] }>({
    operation: 'execution.load',
    runId: snapshot.id,
  });
  if (!state.records.length) {
    const now = new Date().toISOString();
    await api({
      operation: 'execution.save',
      runId: snapshot.id,
      records: [
        {
          event: {
            id: `${prefix}-lock-software-check`,
            experimentRunId: snapshot.id,
            processStepId: snapshot.steps[0].id,
            plannedExecutionItemId: null,
            observedOperation: 'P — UAT SOFTWARE CHECK ONLY',
            observedRecipe: '',
            equipment: '',
            startedAt: now,
            endedAt: null,
            executionStatus: 'OBSERVED',
            sourceSystem: 'DXT_UAT_SOFTWARE_CHECK',
            sourceRecordReference: `${prefix}: lock boundary check; no physical processing or measured values`,
          },
          resolvedSubjectId: snapshot.subjects[0].id,
          observedValues: [],
          retrievedAt: now,
        },
      ],
      command: {
        commandId: `${prefix}-lock-event`,
        expectedVersion: state.version,
      },
    });
  }
  const plan = await api<PlanningWorkspaceRecord>({
    operation: 'run.planning',
    runId: snapshot.id,
  });
  assert.ok(plan.lockReason);
  const altered = {
    ...plan,
    snapshot: {
      ...plan.snapshot,
      subjectOperationIds: {
        ...plan.snapshot.subjectOperationIds,
        [snapshot.subjects[0].id]: [],
      },
    },
  };
  const rejection = await fetch(`${base}/api/repository`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'run.plan.save',
      record: altered,
      command: { commandId: randomUUID(), expectedVersion: plan.version },
    }),
  });
  const reason = await rejection.json();
  assert.equal(rejection.status, 409);
  assert.match(JSON.stringify(reason), /locked/i);
  await writeFile(
    `${folder}/lock-rejection.json`,
    JSON.stringify(
      { status: rejection.status, reason, runId: snapshot.id },
      null,
      2,
    ),
  );
}

const report: Record<string, unknown> = {
  batch,
  action,
  checkedAt: new Date().toISOString(),
};
for (const kind of ['editable', 'locked'] as const) {
  const record = await api<PlanningWorkspaceRecord>({
    operation: 'run.planning',
    runId: manifest[kind].id,
  });
  const snapshot = record.snapshot;
  assert.equal(snapshot.subjects.length, 25);
  assert.deepEqual(
    snapshot.steps.map((s) => s.label),
    ['P', 'A', 'B', 'C', 'D'],
  );
  const membership = Object.fromEntries(
    snapshot.steps.map((o) => [
      o.label,
      snapshot.subjects
        .filter((s) => snapshot.subjectOperationIds[s.id].includes(o.id))
        .map((s) => s.displayLabel),
    ]),
  );
  const actual = await api<{ records: unknown[] }>({
    operation: 'execution.load',
    runId: snapshot.id,
  });
  const measurement = await api<{
    record: { datasets: unknown[]; values: unknown[] };
  }>({ operation: 'measurement.load', runId: snapshot.id });
  assert.equal(measurement.record.datasets.length, 0);
  assert.equal(measurement.record.values.length, 0);
  report[kind] = {
    id: snapshot.id,
    runNumber: snapshot.runNumber,
    name: snapshot.name,
    version: record.version,
    lockReason: record.lockReason,
    membership,
    actualRecords: actual.records.length,
    measurementDatasets: 0,
    routes: Object.fromEntries(
      ['plan', 'actual', 'measurement'].map((v) => [
        v,
        `${base}/series/${slug}/runs/${snapshot.runNumber}/engineering-grid?view=${v}`,
      ]),
    ),
  };
}
const after = await protectedState();
assert.deepEqual(
  after,
  before,
  'Protected Run 19/20 changed during this command.',
);
report.protectedRunsUnchanged = true;
await writeFile(
  `${folder}/${action}-verification.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
