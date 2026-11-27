import assert from 'node:assert/strict';
import { DxtApplication } from '@/src/application/dxt-application';
import { ApplicationError, type DecisionRecord } from '@/src/application/repository-ports';
import { createProductionSliceRepositories } from './explicit-scientific-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { PostgresDecisionRepository } from '@/src/infrastructure/postgres/postgres-reasoning-repositories';
import { scientificTestDatabase, scientificTestPrincipal, adoptTestCriteria } from './postgres-reasoning-fixtures';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';

/** Isolated runtime contract. Call after migrations and explicit synthetic grants. */
export async function runJudgmentContract(db: SqlDatabase) {
  const config = await hydrateConfigurationPackages(db, ['config-package-photo-v1', 'config-package-material-rd-v1']);
  const app = new DxtApplication(createProductionSliceRepositories(db, config));
  const results: string[] = [];
  for (const slug of ['dts-improvement', 'adhesion-material-optimization'] as const) {
    const created = await app.createRunFromStudy(slug, 'STUDY_DEFAULT', `judgment-create-${slug}`);
    const snapshot = (await app.runs.loadCreated(slug, created.runNumber))!;
    const id = snapshot.id;
    const initial = await app.loadPersistedLifecycle(id, 'ALL');
    assert.equal(initial.interpretation, null);
    assert.equal(initial.engineerEvaluations.length, 0);
    assert.equal(initial.measurementResults.values.length, 0);
    assert.equal(initial.actor, scientificTestPrincipal);
    const record: DecisionRecord = { context: {
      decision: { id: `judgment-${slug}`, experimentRunId: id, evaluations: [], criterionAssessments: [],
        conclusion: 'Researcher exploratory judgment', reason: '', nextAction: null,
        recordedBy: scientificTestPrincipal, recordedAt: '2026-11-26T00:00:00Z' },
      decisionStatement: 'Researcher exploratory judgment', engineerEvaluationIds: [], targetAchievementReferences: [],
      targetScope: { subjectIds: [], operationIds: [] }, siteScopeLabel: null, destinationRunId: null,
    }, nextRunPreview: null };
    const repository = app.repositories.decision;
    const command = { commandId: `judgment-save-${slug}`, expectedVersion: 0 };
    await repository.saveByRun(id, record, command);
    await repository.saveByRun(id, record, command);
    const read = await repository.getStateByRun(id);
    assert.equal(read.version, 1);
    assert.deepEqual(read.record, record);
    assert.equal(read.provenance?.[0].contextId, null);
    assert.equal(read.provenance?.[0].context, null);
    assert.equal((await app.loadPersistedLifecycle(id, 'ALL')).decisionContext?.decision.id, record.context!.decision.id);
    const basis = await db.query<{ judgment_basis: string; context_id: string | null }>('SELECT judgment_basis,context_id FROM decision WHERE domain_id=$1', [record.context!.decision.id]);
    assert.deepEqual(basis.rows[0], { judgment_basis: 'RUN_ONLY', context_id: null });
    await assert.rejects(repository.saveByRun(id, record, { ...command, commandId: `${command.commandId}-stale` }), e => e instanceof ApplicationError && e.code === 'CONFLICT');
    const changed = structuredClone(record); changed.context!.decision.id += '-changed'; changed.context!.decision.conclusion = 'Updated researcher judgment';
    await repository.saveByRun(id, changed, { commandId: `judgment-change-${slug}`, expectedVersion: 1 });
    assert.equal((await repository.getStateByRun(id)).provenance?.length, 2);
    await assert.rejects(db.query('UPDATE decision SET payload=payload WHERE domain_id=$1', [record.context!.decision.id]), /immutable/);
    // A forged evidence reference cannot turn a Run-only judgment into criteria-backed evidence.
    const forged = structuredClone(changed); forged.context!.decision.id += '-forged'; forged.context!.engineerEvaluationIds = ['not-an-evaluation'];
    await assert.rejects(repository.saveByRun(id, forged, { commandId: `judgment-forge-${slug}`, expectedVersion: 2 }), e => e instanceof ApplicationError && e.code === 'VALIDATION');
    assert.equal((await repository.getStateByRun(id)).version, 2);
    // No trusted principal, revoked explicit grant, and stale interpretation all remain denied.
    await assert.rejects(new PostgresDecisionRepository(db).saveByRun(id, changed, { commandId: `judgment-no-principal-${slug}`, expectedVersion: 2 }), e => e instanceof ApplicationError && e.code === 'FORBIDDEN');
    const study = (await db.query<{ study_id: string }>('SELECT study_id FROM experiment_run WHERE run_domain_id=$1', [id])).rows[0].study_id;
    await db.query("UPDATE study_access_grant SET active=false WHERE study_id=$1 AND principal_id=$2 AND action='AUTHOR_DECISION'", [study, scientificTestPrincipal]);
    await assert.rejects(repository.saveByRun(id, record, command), e => e instanceof ApplicationError && e.code === 'FORBIDDEN');
    await db.query("UPDATE study_access_grant SET active=true WHERE study_id=$1 AND principal_id=$2 AND action='AUTHOR_DECISION'", [study, scientificTestPrincipal]);
    const choice = initial.measurementCatalog?.nextActionTypes.find(t => t.active && t.code === 'EXPERIMENT_COMPLETE');
    assert.ok(choice, 'Reuse the exact existing configured Next Action; never fabricate one');
    const runOnlyAction = structuredClone(changed); runOnlyAction.context!.decision.id += '-run-only-next';
    runOnlyAction.context!.decision.nextAction = { nextActionTypeDefinitionId: choice.id, note: 'Criteria-free explicit completion' };
    await repository.saveByRun(id, runOnlyAction, { commandId: `judgment-run-only-next-${slug}`, expectedVersion: 2 });
    assert.equal((await repository.getByRun(id))?.context?.decision.nextAction?.nextActionTypeDefinitionId, choice.id);
    await db.query("UPDATE study_access_grant SET active=false WHERE study_id=$1 AND principal_id=$2 AND action='AUTHOR_NEXT_ACTION'", [study, scientificTestPrincipal]);
    const removeAction = structuredClone(changed); removeAction.context!.decision.id += '-remove-action';
    await assert.rejects(repository.saveByRun(id, removeAction, { commandId: `judgment-protected-existing-next-${slug}`, expectedVersion: 3 }), e => e instanceof ApplicationError && e.code === 'FORBIDDEN');
    await db.query("UPDATE study_access_grant SET active=true WHERE study_id=$1 AND principal_id=$2 AND action='AUTHOR_NEXT_ACTION'", [study, scientificTestPrincipal]);
    const interpretation = await adoptTestCriteria(db, id);
    const backed = structuredClone(changed); backed.context!.decision.id += '-criteria';
    await assert.rejects(repository.saveByRun(id, backed, { commandId: `judgment-stale-context-${slug}`, expectedVersion: 3 }), e => e instanceof ApplicationError && e.code === 'CONFLICT');
    await repository.saveByRun(id, backed, { commandId: `judgment-criteria-${slug}`, expectedVersion: 3, expectedInterpretation: interpretation });
    assert.equal((await repository.getStateByRun(id)).provenance?.length, 4);
    const withAction = structuredClone(backed); withAction.context!.decision.id += '-next';
    withAction.context!.decision.nextAction = { nextActionTypeDefinitionId: choice.id, note: 'Explicit researcher completion' };
    await repository.saveByRun(id, withAction, { commandId: `judgment-next-${slug}`, expectedVersion: 4, expectedInterpretation: interpretation });
    assert.equal((await repository.getByRun(id))?.context?.decision.nextAction?.nextActionTypeDefinitionId, choice.id);
    await db.query("UPDATE study_access_grant SET active=false WHERE study_id=$1 AND principal_id=$2 AND action='AUTHOR_NEXT_ACTION'", [study, scientificTestPrincipal]);
    await assert.rejects(new PostgresDecisionRepository(scientificTestDatabase(db)).saveByRun(id, withAction, { commandId: `judgment-denied-next-${slug}`, expectedVersion: 5, expectedInterpretation: interpretation }), e => e instanceof ApplicationError && e.code === 'FORBIDDEN');
    await db.query("UPDATE study_access_grant SET active=true WHERE study_id=$1 AND principal_id=$2 AND action='AUTHOR_NEXT_ACTION'", [study, scientificTestPrincipal]);
    results.push(`${slug}: no Criteria/result/Evaluation/reason, exact readback, history, CAS, retry, revoked/no actor, criteria adoption, existing NextAction PASS`);
  }
  return results;
}
