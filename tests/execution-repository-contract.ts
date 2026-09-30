import assert from 'node:assert/strict';
import { ApplicationError, type ExecutionRepository } from '@/src/application/repository-ports';
import type { ActualExecutionEvidence } from '@/src/features/run-registration/actual-execution-model';

export async function executionRepositoryContract(repository: ExecutionRepository, runId: string, first: ActualExecutionEvidence, second: ActualExecutionEvidence) {
  const initial = await repository.getStateByRun(runId);
  const one = { commandId: `${runId}:one`, expectedVersion: initial.version };
  const two = { commandId: `${runId}:two`, expectedVersion: initial.version + 1 };
  const firstResult = await repository.saveByRun(runId, [first], one);
  assert.equal(firstResult.version, initial.version + 1);
  assert.deepEqual(firstResult.records, [first]);
  assert.deepEqual(await repository.saveByRun(runId, [first], one), firstResult);
  const secondResult = await repository.saveByRun(runId, [second], two);
  assert.equal(secondResult.version, initial.version + 2);
  assert.deepEqual(await repository.getByRun(runId), [second]);
  assert.deepEqual(await repository.saveByRun(runId, [first], one), firstResult, 'retry returns the original persisted receipt, even after a later edit');
  assert.deepEqual(await repository.getStateByRun(runId), secondResult, 'retry must not restore old state');
  await assert.rejects(repository.saveByRun(runId, [first], { commandId: `${runId}:stale`, expectedVersion: initial.version }),
    (error: unknown) => error instanceof ApplicationError && error.code === 'CONFLICT');
  await assert.rejects(repository.saveByRun(runId, [second], one),
    (error: unknown) => error instanceof ApplicationError && error.code === 'CONFLICT');
  const mutation = structuredClone(second);
  mutation.event.equipment = 'attempted evidence mutation';
  await assert.rejects(repository.saveByRun(runId, [mutation], { commandId: `${runId}:mutate-identity`, expectedVersion: initial.version + 2 }),
    (error: unknown) => error instanceof ApplicationError && error.code === 'CONFLICT');
  secondResult.records[0].event.equipment = 'mutated client copy';
  assert.deepEqual(await repository.getByRun(runId), [second]);
}
