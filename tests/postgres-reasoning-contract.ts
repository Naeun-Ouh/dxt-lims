import assert from 'node:assert/strict';
import { DxtApplication } from '@/src/application/dxt-application';
import {
  ApplicationError,
  type ApplicationRepositories,
  type DecisionRecord,
} from '@/src/application/repository-ports';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { projectMeasurementEvidence } from '@/src/features/run-registration/measurement-grid-model';
import { calculateTargetAchievement } from '@/src/features/run-registration/evaluation-grid-model';
import type { productionMeasurementContract } from './postgres-measurement-contract';
import { createInMemoryRepositories } from '@/src/infrastructure/memory/in-memory-repositories';
import { createBrowserRepositories } from '@/src/infrastructure/browser/browser-repositories';
import { configurationRepository } from '@/src/mock/configuration-packages';
const conflict = (e: unknown) =>
  e instanceof ApplicationError && e.code === 'CONFLICT';
export async function reasoningContract(
  repos: ApplicationRepositories,
  runId: string,
  evals: Awaited<ReturnType<ApplicationRepositories['evaluation']['getByRun']>>,
  decision: DecisionRecord,
  prefix: string,
) {
  const ev = await repos.evaluation.getStateByRun(runId);
  const cmd = { commandId: prefix + '-eval', expectedVersion: ev.version };
  await repos.evaluation.saveByRun(runId, evals, cmd);
  await repos.evaluation.saveByRun(runId, evals, cmd);
  assert.equal(
    (await repos.evaluation.getStateByRun(runId)).version,
    ev.version + 1,
  );
  await assert.rejects(
    repos.evaluation.saveByRun(runId, evals, {
      ...cmd,
      commandId: prefix + '-stale',
    }),
    conflict,
  );
  const d = await repos.decision.getStateByRun(runId);
  const dc = { commandId: prefix + '-decision', expectedVersion: d.version };
  await repos.decision.saveByRun(runId, decision, dc);
  await repos.decision.saveByRun(runId, decision, dc);
  assert.deepEqual(await repos.decision.getByRun(runId), decision);
  await assert.rejects(
    repos.decision.saveByRun(runId, decision, {
      ...dc,
      commandId: prefix + '-dstale',
    }),
    conflict,
  );
  return { cmd, dc };
}
export async function productionReasoningContract(
  db: SqlDatabase,
  measurements: Awaited<ReturnType<typeof productionMeasurementContract>>,
) {
  const config = await hydrateConfigurationPackages(db, [
    'config-package-photo-v1',
    'config-package-material-rd-v1',
  ]);
  const app = new DxtApplication(createProductionSliceRepositories(db, config));
  const proofs = [];
  for (const proof of measurements) {
    const snapshot = proof.snapshot;
    const slug = snapshot.series.id.replace(
      /^series-/,
      '',
    ) as keyof typeof lifecycleAuthoringProfiles;
    const profile = lifecycleAuthoringProfiles[slug];
    let state: import('@/src/features/run-registration/lifecycle-authoring').AuthoredLifecycleState =
      await app.loadLifecycle(snapshot, profile);
    const context = await app.repositories.evaluation.getContext!(snapshot.id);
    const binding = context.targetBindings[0];
    const summary = state.measurementResults.summaries.find(
      (s) => s.parameterDefinitionId === binding.target.parameterDefinitionId,
    )!;
    assert.ok(summary);
    const model = createExperimentWorkspace(snapshot, config);
    const projected = projectMeasurementEvidence(
      model,
      state.measurementResults,
      context.catalog,
      state.actualEvidence,
    ).find((m) => m.representative?.id === summary.id)!;
    const achievement = calculateTargetAchievement(binding, projected);
    assert.ok(
      ['ACHIEVED', 'NOT_ACHIEVED', 'NOT_EVALUABLE'].includes(
        achievement.status,
      ),
    );
    const unavailable = calculateTargetAchievement(
      {
        ...binding,
        target: {
          ...binding.target,
          threshold: null,
          lowerBound: null,
          upperBound: null,
        },
      },
      projected,
    );
    assert.equal(unavailable.status, 'NOT_EVALUABLE');
    state = await app.recordEvaluation(state, {
      id: `ev-${snapshot.id}`,
      subjectId: summary.subjectId,
      seriesTargetId: binding.target.id,
      measurementSummaryId: summary.id,
      disposition: 'ACCEPT',
      comment: 'Development engineer: useful result; controlled continuation.',
      evaluator: 'Development test engineer',
      evaluatedAt: '2026-09-16T14:00:00Z',
    });
    assert.equal(state.engineerEvaluations[0].measurementSummaryId, summary.id);
    state = await app.recordDecision(state, context.catalog, {
      id: `decision-${snapshot.id}`,
      decisionStatement: 'Continue controlled validation',
      conclusion: 'Continue controlled validation',
      reason: 'Interpretation remains independent of computed achievement',
      nextActionTypeDefinitionId: context.catalog.nextActionTypes.find(
        (t) => t.code === 'DESIGN_NEXT_EXPERIMENT',
      )!.id,
      nextActionNote: 'Repeat with controlled conditions',
      evaluationIds: [state.engineerEvaluations[0].id],
      targetReferences: [
        {
          seriesTargetId: binding.target.id,
          measurementSummaryId: summary.id,
          status: achievement.status,
        },
      ],
      targetSubjectIds: [summary.subjectId],
      targetOperationIds: [],
      recordedBy: 'Development test engineer',
      recordedAt: '2026-09-16T14:01:00Z',
      nextRunChange: null,
    });
    const decision = {
      context: state.decisionContext,
      nextRunPreview: state.nextRunPreview,
    };
    assert.ok(decision.nextRunPreview);
    assert.equal(
      await app.repositories.run.getSnapshot(
        decision.nextRunPreview.snapshot.id,
      ),
      null,
      'Next Action does not create next Run',
    );
    const retry = await reasoningContract(
      app.repositories,
      snapshot.id,
      state.engineerEvaluations,
      decision,
      'pg-' + snapshot.id,
    );
    // Current judgment can change without moving the exact Evaluation identity referenced by Decision.
    const before = await app.repositories.evaluation.getStateByRun(snapshot.id);
    await assert.rejects(app.repositories.evaluation.saveByRun(snapshot.id,[{...before.record[0],id:'unresolved-'+snapshot.id,measurementSummaryId:'unavailable-summary'}],{commandId:'unresolved-'+snapshot.id,expectedVersion:before.version}),e=>e instanceof ApplicationError&&e.code==='VALIDATION');
    assert.deepEqual(await app.repositories.evaluation.getStateByRun(snapshot.id),before);

    const updated = [
      {
        ...before.record[0],
        id: 'edited-' + snapshot.id,
        comment: 'Revised human interpretation',
      },
    ];
    const concurrent = await Promise.allSettled(
      ['a', 'b'].map((s) =>
        app.repositories.evaluation.saveByRun(snapshot.id, updated, {
          commandId: `race-${s}-${snapshot.id}`,
          expectedVersion: before.version,
        }),
      ),
    );
    assert.equal(concurrent.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      concurrent.filter((r) => r.status === 'rejected' && conflict(r.reason))
        .length,
      1,
    );
    await app.repositories.evaluation.saveByRun(
      snapshot.id,
      state.engineerEvaluations,
      retry.cmd,
    ); // persisted old retry must not revert current judgment
    assert.deepEqual(
      (await app.repositories.evaluation.getStateByRun(snapshot.id)).record,
      updated,
    );
    assert.equal(
      (await app.repositories.decision.getByRun(snapshot.id))?.context
        ?.engineerEvaluationIds[0],
      state.engineerEvaluations[0].id,
    );
    const currentDecision = await app.repositories.decision.getStateByRun(
      snapshot.id,
    );
    await db.query(
      "CREATE OR REPLACE FUNCTION fail_reasoning_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected next-action failure'; END $$",
    );
    await db.query(
      'CREATE TRIGGER fail_reasoning_test BEFORE INSERT ON next_action FOR EACH ROW EXECUTE FUNCTION fail_reasoning_test()',
    );
    const bad = {
      ...decision,
      context: {
        ...decision.context!,
        decision: {
          ...decision.context!.decision,
          id: 'rollback-' + snapshot.id,
        },
      },
    };
    try {
      await assert.rejects(
        app.repositories.decision.saveByRun(snapshot.id, bad, {
          commandId: 'rollback-' + snapshot.id,
          expectedVersion: currentDecision.version,
        }),
      );
    } finally {
      await db.query('DROP TRIGGER fail_reasoning_test ON next_action');
    }
    assert.deepEqual(
      await app.repositories.decision.getStateByRun(snapshot.id),
      currentDecision,
    );
    assert.equal(
      (
        await db.query('SELECT 1 FROM decision WHERE domain_id=$1', [
          'rollback-' + snapshot.id,
        ])
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await db.query(
          'SELECT 1 FROM reasoning_command_receipt WHERE command_id=$1',
          ['rollback-' + snapshot.id],
        )
      ).rowCount,
      0,
    );
    assert.deepEqual(
      await app.repositories.run.getSnapshot(snapshot.id),
      snapshot,
    );
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => storage.get(k) ?? null,
          setItem: (k: string, v: string) => storage.set(k, v),
          removeItem: (k: string) => storage.delete(k),
        },
      },
    });
    try {
      for (const repos of [
        createInMemoryRepositories(configurationRepository),
        createBrowserRepositories(configurationRepository),
      ])
        await reasoningContract(
          repos,
          snapshot.id,
          state.engineerEvaluations,
          decision,
          'shared-' + snapshot.id,
        );
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous);
      else Reflect.deleteProperty(globalThis, 'window');
    }
    proofs.push({
      snapshot,
      profile,
      evaluation: await app.repositories.evaluation.getStateByRun(snapshot.id),
      decision: await app.repositories.decision.getStateByRun(snapshot.id),
      retry: { ...retry, evaluations: state.engineerEvaluations, decision },
    });
  }
  return proofs;
}
