import assert from 'node:assert/strict';
import { DxtApplication } from '@/src/application/dxt-application';
import { ApplicationError } from '@/src/application/repository-ports';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { recordActualExecution } from '@/src/features/run-registration/lifecycle-authoring';
import { projectOperationExecution } from '@/src/features/run-registration/actual-execution-model';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { PostgresExecutionRepository } from '@/src/infrastructure/postgres/postgres-execution-repository';
import { createInMemoryRepositories } from '@/src/infrastructure/memory/in-memory-repositories';
import { createBrowserRepositories } from '@/src/infrastructure/browser/browser-repositories';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { executionRepositoryContract } from './execution-repository-contract';

export async function productionExecutionContract(database: SqlDatabase) {
  const configuration = await hydrateConfigurationPackages(database, ['config-package-photo-v1', 'config-package-material-rd-v1']);
  const app = new DxtApplication(createProductionSliceRepositories(database, configuration));
  const restartProof = [];
  for (const slug of ['dts-improvement', 'adhesion-material-optimization'] as const) {
    const snapshot = await app.createRunFromStudy(slug, 'STUDY_DEFAULT', `execution-run-${slug}`);
    const model = createExperimentWorkspace(snapshot, configuration);
    const subject = model.subjects[0];
    const assignment = snapshot.assignments.find((a) => a.kind === 'CONDITION' && a.intentRole === 'VARIED')!;
    const operation = model.operations.find((o) => o.id === assignment.processStepId)!;
    assert.ok(operation);
    const before = structuredClone(snapshot);
    const initial = await app.loadLifecycle(snapshot, lifecycleAuthoringProfiles[slug], 'ACTUAL');
    const projection = projectOperationExecution(model, operation, subject, []);
    const variable = projection.comparisons.find((v) => v.label === assignment.label)!;
    assert.ok(variable);
    const base = { operationId: operation.id, subjectId: subject.id, status: 'COMPLETED' as const,
      startedAt: '2026-09-16T01:00:00.000Z', endedAt: '2026-09-16T01:30:00.000Z', actualOverrides: {} };
    const first = await app.recordActual(initial, model, { ...base, id: `actual-${slug}-first` });
    assert.equal(first.executionVersion, 1);
    const fixed = projection.comparisons.find((v) => v.intentRole === 'FIXED' && v.label !== 'Recipe' && Number.isFinite(Number(v.planned)))!;
    assert.ok(fixed);
    const changedCommand = { ...base, id: `actual-${slug}-override`, actualOverrides: { [variable.key]: String(Number(variable.planned) + 2), [fixed.key]: String(Number(fixed.planned) + 1) } };
    const second = await app.recordActual(first, model, changedCommand);
    assert.equal(second.executionVersion, 2);
    assert.deepEqual(await app.repositories.run.getSnapshot(snapshot.id), before);
    assert.equal(second.actualEvidence[0].event.sourceSystem, 'DXT Manual');
    const actual = projectOperationExecution(model, operation, subject, second.actualEvidence);
    const comparison = actual.comparisons.find((v) => v.key === variable.key)!;
    assert.equal(comparison.delta, 'CHANGED');
    assert.equal(comparison.intentRole, 'VARIED');
    const fixedActual = actual.comparisons.find((v) => v.key === fixed.key)!;
    assert.equal(fixedActual.delta, 'CHANGED');
    assert.equal(fixedActual.intentRole, 'FIXED', 'actual deviation does not infer scientific VARIED intent');
    assert.equal(comparison.planned, variable.planned);
    assert.equal(comparison.actual, changedCommand.actualOverrides[variable.key]);
    await assert.rejects(app.recordActual(first, model, { ...base, id: `stale-${slug}` }), (error: unknown) => error instanceof ApplicationError && error.code === 'CONFLICT');
    assert.deepEqual(await app.recordActual(first, model, changedCommand), second, 'persisted application retry returns genuine read-back');
    assert.ok(Array.isArray(await app.repositories.savedAnalysis.list()), 'Saved Analysis is production-backed after Slice 6');
    const third = recordActualExecution(second, model, { ...base, id: `contract-first-${slug}`, status: 'OBSERVED', endedAt: null, equipment: '', recipe: '' }).actualEvidence[0];
    const fourth = recordActualExecution(second, model, { ...base, id: `contract-second-${slug}`, status: 'INTERRUPTED', endedAt: null, actualOverrides: { [variable.key]: '123' } }).actualEvidence[0];
    fourth.identityContext = { attributes: [{ label: 'Adapter context', value: 'reference-only' }] };
    fourth.event.sourceSystem = 'External source';
    fourth.event.sourceRecordReference = 'external-record-123';
    await executionRepositoryContract(app.repositories.execution, snapshot.id, third, fourth);
    await executionRepositoryContract(createInMemoryRepositories(configuration).execution, snapshot.id, third, fourth);
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } } });
    try {
      await executionRepositoryContract(createBrowserRepositories(configuration).execution, snapshot.id, third, fourth);
      assert.deepEqual(await createBrowserRepositories(configuration).execution.getByRun(snapshot.id), [fourth], 'browser adapter recreated from storage');
    } finally { if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window'); }
    const current = await app.executions.load(snapshot.id);
    const invalid = structuredClone(fourth);
    invalid.event.id = `invalid-${slug}`;
    invalid.event.plannedExecutionItemId = 'wrong-planned-item';
    await assert.rejects(app.repositories.execution.saveByRun(snapshot.id, [invalid], { commandId: 'invalid-item', expectedVersion: current.version }), /exact planned item/);
    invalid.event.plannedExecutionItemId = null;
    invalid.resolvedSubjectId = 'subject-outside-run';
    await assert.rejects(app.repositories.execution.saveByRun(snapshot.id, [invalid], { commandId: 'invalid-subject', expectedVersion: current.version }), /outside/);
    invalid.resolvedSubjectId = subject.id;
    invalid.event.processStepId = 'operation-outside-run';
    await assert.rejects(app.repositories.execution.saveByRun(snapshot.id, [invalid], { commandId: 'invalid-operation', expectedVersion: current.version }), /outside/);
    assert.deepEqual(await app.executions.load(snapshot.id), current);
    restartProof.push({ snapshot, execution: current, retry: { record: third, command: { commandId: `${snapshot.id}:one`, expectedVersion: 2 }, version: 3 } });
  }

  await assert.rejects(database.query(`INSERT INTO execution_current(run_id,run_subject_id,run_operation_id,execution_event_id,ordinal)
    SELECT other.run_id,c.run_subject_id,c.run_operation_id,c.execution_event_id,999
    FROM execution_current c JOIN experiment_run r ON r.run_id=c.run_id
    CROSS JOIN experiment_run other WHERE r.run_domain_id=$1 AND other.run_domain_id=$2`,
    [restartProof[0].snapshot.id, restartProof[1].snapshot.id]), /foreign key/, 'DB composite FK rejects a cross-Run evidence pointer');
  const proof = restartProof[0];
  const current = await app.executions.load(proof.snapshot.id);
  const failure = structuredClone(current.records);
  failure[0].event.id = 'rollback-evidence';
  failure[0].observedValues[0].value = 'FORCE_ROLLBACK';
  const counts = async () => (await database.query(`SELECT
    (SELECT count(*) FROM execution_event)::text AS events,
    (SELECT count(*) FROM execution_observed_value)::text AS values,
    (SELECT count(*) FROM execution_command_receipt)::text AS receipts,
    (SELECT count(*) FROM execution_command_result)::text AS results`)).rows;
  const beforeCounts = await counts();
  await database.query(`CREATE FUNCTION force_execution_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.value_text='FORCE_ROLLBACK' THEN RAISE EXCEPTION 'forced execution failure'; END IF; RETURN NEW; END; $$;`);
  await database.query(`CREATE TRIGGER force_execution_failure BEFORE INSERT ON execution_observed_value FOR EACH ROW EXECUTE FUNCTION force_execution_failure();`);
  try {
    await assert.rejects(app.repositories.execution.saveByRun(proof.snapshot.id, failure, { commandId: 'rollback-execution', expectedVersion: current.version }),
      (error: unknown) => error instanceof ApplicationError && error.code === 'PERSISTENCE');
    assert.deepEqual(await counts(), beforeCounts);
    assert.deepEqual(await app.executions.load(proof.snapshot.id), current);
  } finally { await database.query('DROP TRIGGER force_execution_failure ON execution_observed_value'); await database.query('DROP FUNCTION force_execution_failure()'); }
  const edits = [0, 1].map((i) => {
    const evidence = structuredClone(current.records);
    evidence[0].event.id = `concurrent-execution-${i}`;
    return new PostgresExecutionRepository(database).saveByRun(proof.snapshot.id, evidence, { commandId: `concurrent-${i}`, expectedVersion: current.version });
  });
  const concurrent = await Promise.allSettled(edits);
  assert.equal(concurrent.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = concurrent.find((r) => r.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof ApplicationError && rejected.reason.code === 'CONFLICT');
  proof.execution = await app.executions.load(proof.snapshot.id);
  assert.equal(proof.execution.version, current.version + 1);
  assert.deepEqual(await app.repositories.run.getSnapshot(proof.snapshot.id), proof.snapshot);
  await assert.rejects(database.query("UPDATE execution_event SET equipment='mutation'"), /immutable/);
  return restartProof;
}
