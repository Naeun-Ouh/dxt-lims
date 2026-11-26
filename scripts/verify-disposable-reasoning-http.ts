/** Real HTTP AGENT checks against an explicitly new disposable harness only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DxtApplication } from '../src/application/dxt-application';
import { HydratedConfiguration } from '../src/application/hydrated-configuration';
import { createHttpRepositories } from '../src/infrastructure/http/http-repositories';
import { createExperimentWorkspace } from '../src/features/run-registration/workspace-model';
import type { ConfigurationAuthoringSnapshot } from '../src/application/configuration-authoring';
import type {
  CriteriaSaveInput,
  RunCriteriaState,
} from '../src/application/run-criteria';

const directory = resolve(process.argv[2] ?? '');
assert.ok(directory.startsWith(join(process.cwd(), 'tmp/agent-integration-')));
const environment = JSON.parse(
  await readFile(join(directory, 'environment.json'), 'utf8'),
);
assert.equal(environment.label, 'AGENT TEST ONLY');
const servers: { principal: string; baseUrl: string }[] = JSON.parse(
  await readFile(join(directory, 'servers.json'), 'utf8'),
);
const server = servers.find((s) => s.principal === 'agent-integration-writer')!;
assert.equal(new URL(server.baseUrl).hostname, '127.0.0.1');
const originalFetch = globalThis.fetch;
const evidence: { operation: string; status: number }[] = [];
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === 'string' && input.startsWith('/')
      ? server.baseUrl + input
      : input;
  const response = await originalFetch(url, init);
  if (init?.body && typeof init.body === 'string')
    evidence.push({
      operation: JSON.parse(init.body).operation,
      status: response.status,
    });
  return response;
};
async function call<T>(body: object): Promise<T> {
  const response = await fetch('/api/repository', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result as T;
}
const configuration = new HydratedConfiguration(
  (
    await call<ConfigurationAuthoringSnapshot>({
      operation: 'configuration.load',
    })
  ).registry,
);
const app = new DxtApplication(createHttpRepositories(configuration));
const manifest = JSON.parse(
  await readFile(join(directory, 'routes.json'), 'utf8'),
);
const results = [];
for (const route of manifest.routes.filter(
  (r: { scenario: string }) => r.scenario === 'configured-measurement',
)) {
  const run = await app.repositories.run.getCreatedRun(route.study, route.run);
  assert.ok(run);
  const model = createExperimentWorkspace(run, configuration);
  const initial = await call<RunCriteriaState>({
    operation: 'run.criteria.load',
    runId: run.id,
  });
  assert.equal(initial.origin, 'ABSENT');
  if (initial.activeContextId) {
    // Resume only this harness's completed two-revision synthetic scenario.
    assert.equal(initial.sequence, 2);
    const ev = await app.repositories.evaluation.getStateByRun(run.id);
    const dc = await app.repositories.decision.getStateByRun(run.id);
    assert.equal(ev.record.length, 1);
    const prior = ev.provenance!.find((p) => p.recordId === ev.record[0].id)!;
    assert.ok(prior.contextId !== initial.activeContextId);
    assert.ok(dc.provenance!.some((p) => p.contextId === prior.contextId));
    assert.match(ev.record[0].comment, /AGENT synthetic network check/);
    results.push({
      domain: route.domain,
      runId: run.id,
      status: 'PASS (completed synthetic scenario readback)',
    });
    continue;
  }
  const plan = initial.plans[0];
  const parameter = initial.catalog.parameters.find(
    (p) =>
      plan.parameterIds.includes(p.id) &&
      p.semanticRole === 'MEASUREMENT' &&
      p.dataType === 'NUMBER',
  )!;
  assert.ok(parameter);
  const hold = initial.catalog.nextActionTypes.find((a) => a.code === 'HOLD')!;
  assert.ok(hold);
  const revisionId = randomUUID();
  const targetId = randomUUID();
  const input: CriteriaSaveInput = {
    revisionId,
    definitionId: randomUUID(),
    expectedRevision: 0,
    expectedSequence: 0,
    rationale: 'AGENT disposable HTTP criteria, not scientific acceptance',
    criteria: {
      packageVersionId: run.configurationPackageVersionId,
      confirmed: true,
      evaluationIds: [initial.catalog.evaluations[0].id],
      nextActionIds: [hold.id],
      targetBindings: [
        {
          target: {
            id: targetId,
            parameterDefinitionId: parameter.id,
            unitDefinitionId: parameter.unitId,
            operator: 'GTE',
            threshold: 0,
            lowerBound: null,
            upperBound: null,
          },
          measurementPoint: plan.point as 'FINAL',
          resultGrain: 'SUBJECT_SUMMARY',
          aggregationMethod: 'MEAN',
        },
      ],
    },
  };
  const commandId = randomUUID();
  await call({
    operation: 'run.criteria.save',
    runId: run.id,
    input,
    commandId,
  });
  const retry = await call<RunCriteriaState>({
    operation: 'run.criteria.save',
    runId: run.id,
    input,
    commandId,
  });
  assert.equal(retry.sequence, 1);
  let state: import('../src/features/run-registration/lifecycle-authoring').AuthoredLifecycleState =
    await app.loadPersistedLifecycle(run.id, 'ALL');
  const stamp = randomUUID(),
    subject = model.subjects[0],
    now = new Date().toISOString();
  state = await app.recordActual(state, model, {
    id: 'http-actual-' + stamp,
    operationId: model.operations.find((o) => o.role === 'PROCESS')!.id,
    subjectId: subject.id,
    status: 'COMPLETED',
    startedAt: now,
    endedAt: now,
    actualOverrides: {},
  });
  state = await app.recordMeasurement(state, model, state.measurementCatalog!, {
    id: 'http-measurement-' + stamp,
    operationId: model.operations.find((o) => o.role === 'MEASUREMENT')!.id,
    subjectId: subject.id,
    parameterDefinitionId: parameter.id,
    measurementPoint: plan.point as 'FINAL',
    value: '0',
    grain: 'SUBJECT',
    coordinateValues: [],
    recordedAt: now,
  });
  state = await app.loadPersistedLifecycle(run.id, 'ALL');
  const summary = state.measurementResults.summaries.find(
    (s) => s.parameterDefinitionId === parameter.id,
  )!;
  assert.ok(summary);
  const evaluationId = 'http-evaluation-' + stamp,
    decisionId = 'http-decision-' + stamp;
  state = await app.recordEvaluation(state, {
    id: evaluationId,
    subjectId: subject.id,
    seriesTargetId: targetId,
    measurementSummaryId: summary.id,
    disposition: 'INFORMATIVE',
    comment: 'AGENT synthetic network check',
    evaluator: state.actor!,
    evaluatedAt: now,
  });
  state = await app.recordDecision(state, state.measurementCatalog!, {
    id: decisionId,
    decisionStatement: 'AGENT network conclusion',
    conclusion: 'AGENT network conclusion',
    reason: 'Synthetic workflow verification',
    nextActionTypeDefinitionId: hold.id,
    nextActionNote: 'AGENT explicit optional Hold',
    evaluationIds: [evaluationId],
    targetReferences: [
      {
        seriesTargetId: targetId,
        measurementSummaryId: summary.id,
        status: 'ACHIEVED',
      },
    ],
    targetSubjectIds: [subject.id],
    targetOperationIds: [],
    recordedBy: state.actor!,
    recordedAt: now,
    nextRunChange: null,
  });
  assert.equal(
    state.decisionContext?.decision.nextAction?.nextActionTypeDefinitionId,
    hold.id,
  );
  const newer = {
    ...input,
    revisionId: randomUUID(),
    expectedRevision: 1,
    expectedSequence: 1,
    rationale: 'AGENT later revision preserves prior evidence',
  };
  await call({
    operation: 'run.criteria.save',
    runId: run.id,
    input: newer,
    commandId: randomUUID(),
  });
  const reload = await app.loadPersistedLifecycle(run.id, 'ALL');
  assert.equal(
    reload.engineerEvaluations.length,
    0,
    'new context does not relabel old evaluation',
  );
  const evHistory = await app.repositories.evaluation.getStateByRun(run.id);
  const dcHistory = await app.repositories.decision.getStateByRun(run.id);
  assert.ok(
    evHistory.provenance?.some(
      (h) => h.contextId === revisionId && h.recordId === evaluationId,
    ),
  );
  assert.ok(
    dcHistory.provenance?.some(
      (h) => h.contextId === revisionId && h.recordId === decisionId,
    ),
  );
  assert.deepEqual(
    await app.repositories.run.getSnapshot(run.id),
    run,
    'Run Plan preserved',
  );
  results.push({
    domain: route.domain,
    runId: run.id,
    oldCriteria: revisionId,
    newCriteria: newer.revisionId,
    evaluationId,
    decisionId,
    status: 'PASS',
  });
}
await writeFile(
  join(directory, 'reasoning-http-evidence.json'),
  JSON.stringify(
    {
      label: 'AGENT HTTP CHECKS — HUMAN ACCEPTANCE NOT RUN',
      results,
      evidence,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ results, requests: evidence.length }, null, 2));
