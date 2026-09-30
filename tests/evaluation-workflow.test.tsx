import { normalizeLegacyWaferMeasurements } from '../src/domain/measurement/legacy-wafer-compatibility';
import { normalizeLegacySemiconductorExecution } from '../src/features/run-registration/legacy-semiconductor-execution-adapter';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EvaluationExecutionGrid,
  NextRunActionPreview,
} from '../src/features/run-registration/evaluation-execution-grid';
import {
  conclusionPrerequisite,
  confirmedCreatedRunNumber,
  saveEvaluationRecord,
  saveConclusionRecord,
} from '../src/features/run-registration/evaluation-workflow';
import { projectEvaluations } from '../src/features/run-registration/evaluation-grid-model';
import { projectMeasurementEvidence } from '../src/features/run-registration/measurement-grid-model';
import { createExperimentWorkspace } from '../src/features/run-registration/workspace-model';
import { runPlanningScenarios } from '../src/features/run-registration/planning-model';
import {
  createEmptyLifecycleState,
  type DecisionCommand,
  type EvaluationCommand,
} from '../src/features/run-registration/lifecycle-authoring';
import { DxtApplication } from '../src/application/dxt-application';
import { createInMemoryRepositories } from '../src/infrastructure/memory/in-memory-repositories';
import { configurationRepository } from '../src/mock/configuration-packages';
import { engineeringGridMeasurementScenarios } from '../src/mock/engineering-grid-measurements';
import { engineeringGridEvaluationScenarios } from '../src/mock/engineering-grid-evaluations';
import { actualExecutionScenarios } from '../src/mock/actual-execution';
import { lifecycleAuthoringProfiles } from '../src/mock/lifecycle-authoring';
import { definitions } from '../src/mock/reference';
import { LocaleProvider } from '../src/shared/i18n/locale';

const model = createExperimentWorkspace(
  runPlanningScenarios.PHOTO,
  configurationRepository,
);
const results = normalizeLegacyWaferMeasurements(
  engineeringGridMeasurementScenarios.PHOTO,
);
const actual = normalizeLegacySemiconductorExecution(
  actualExecutionScenarios.PHOTO,
);
const bindings = engineeringGridEvaluationScenarios.PHOTO.bindings;
const measurements = projectMeasurementEvidence(
  model,
  results,
  definitions,
  actual,
);
const projections = (
  records = engineeringGridEvaluationScenarios.PHOTO.engineerEvaluations,
) =>
  projectEvaluations(
    model.snapshot.id,
    model.subjects,
    measurements,
    bindings,
    records,
  );
const selected = projections([]).find(
  (item) => item.achievement.status === 'ACHIEVED',
)!;
const evaluation: Omit<EvaluationCommand, 'id'> = {
  subjectId: selected.subject.id,
  seriesTargetId: selected.binding.target.id,
  measurementSummaryId: selected.achievement.measurementSummaryId!,
  disposition: 'INFORMATIVE',
  comment: 'Existing fixture reviewed for orchestration test.',
  evaluator: 'test',
  evaluatedAt: '2026-09-30T12:00:00Z',
};
const seed = () => ({
  ...createEmptyLifecycleState(
    model.snapshot,
    lifecycleAuthoringProfiles['dts-improvement'],
  ),
  measurementResults: structuredClone(results),
});
const render = (
  props: Partial<Parameters<typeof EvaluationExecutionGrid>[0]> = {},
  locale: 'en' | 'ko' = 'en',
) =>
  renderToStaticMarkup(
    <LocaleProvider initialLocale={locale} persist={false}>
      <EvaluationExecutionGrid
        model={model}
        results={results}
        catalog={definitions}
        executionEvidence={actual}
        targetBindings={bindings}
        engineerEvaluations={[]}
        decisionContext={null}
        nextRunPreview={null}
        actor="test"
        now={() => evaluation.evaluatedAt}
        {...props}
      />
    </LocaleProvider>,
  );

void test('achieved result still requires an independently saved Engineer Evaluation', () => {
  assert.equal(selected.achievement.status, 'ACHIEVED');
  assert.match(
    conclusionPrerequisite(selected, evaluation.comment, 'INFORMATIVE')!,
    /Save Evaluation/,
  );
});
void test('missing result cannot inherit an old Evaluation or unlock Run Conclusion', () => {
  const absent = projectEvaluations(
    model.snapshot.id,
    model.subjects,
    [],
    bindings,
    engineeringGridEvaluationScenarios.PHOTO.engineerEvaluations,
  )[0];
  assert.equal(absent.achievement.status, 'MISSING_RESULT');
  assert.equal(absent.engineerEvaluation, null);
  assert.match(
    conclusionPrerequisite(absent, '', 'INFORMATIVE')!,
    /Result Missing/,
  );
  const html = render({
    results: { ...results, datasets: [], values: [], summaries: [] },
    onRecordEvaluation: () => {},
    onRecordDecision: () => {},
  });
  assert.match(html, /evaluation-conclusion-fields" disabled/);
  assert.match(html, /Record a measured result/);
});
void test('evaluation-only permission remains independent from decision permission', () => {
  const html = render({ onRecordEvaluation: () => {} });
  assert.match(html, /<form id="engineer-evaluation-form"/);
  assert.match(html, /You do not have permission to record Run Conclusion/);
  assert.match(html, /evaluation-conclusion-fields" disabled/);
  assert.match(html, /value="INFORMATIVE" selected/);
  assert.match(html, /<details class="evaluation-classification">/);
});
void test('read-only workspace has no editable forms and a disabled primary save action', () => {
  const html = render();
  assert.match(html, /Read-only/);
  assert.doesNotMatch(html, /<textarea|<form/);
  assert.match(html, /form="engineer-evaluation-form" disabled/);
});
void test('Korean and English keep explicit draft and save boundaries', () => {
  const props = { onRecordEvaluation: () => {}, onRecordDecision: () => {} };
  assert.match(render(props), /Selection is a draft/);
  assert.match(render(props), /Save Run Conclusion/);
  assert.match(render(props, 'ko'), /선택은 아직 초안/);
  assert.match(render(props, 'ko'), /실험 차수 결론 저장/);
});
void test('authoritative save refreshes the exact projection; edited comment or disposition blocks conclusion again', async () => {
  const app = new DxtApplication(
    createInMemoryRepositories(configurationRepository),
  );
  const saved = await saveEvaluationRecord(
    model.snapshot.id,
    evaluation,
    (command) =>
      app.recordEvaluation(seed(), { ...command, id: 'g03-evaluation' }),
  );
  const current = projections(saved.engineerEvaluations).find(
    (p) => p.subject.id === selected.subject.id,
  )!;
  assert.equal(
    conclusionPrerequisite(current, evaluation.comment, 'INFORMATIVE'),
    null,
  );
  assert.equal(current.engineerEvaluation?.id, 'g03-evaluation');
  assert.match(
    conclusionPrerequisite(current, 'Unsaved change', 'INFORMATIVE')!,
    /changes/,
  );
  assert.match(
    conclusionPrerequisite(current, evaluation.comment, 'ACCEPT')!,
    /changes/,
  );
  assert.match(
    conclusionPrerequisite(
      {
        ...current,
        achievement: {
          ...current.achievement,
          measurementSummaryId: 'different-result',
        },
      },
      evaluation.comment,
      'INFORMATIVE',
    )!,
    /Save Evaluation/,
  );
});
void test('failed, unauthorized, empty or stale save acknowledgements cannot produce success', async () => {
  await assert.rejects(
    saveEvaluationRecord(model.snapshot.id, evaluation, () => {
      throw new Error('FORBIDDEN');
    }),
    /FORBIDDEN/,
  );
  await assert.rejects(
    saveEvaluationRecord(model.snapshot.id, evaluation, () => undefined),
    /not confirmed/,
  );
  await assert.rejects(
    saveEvaluationRecord(model.snapshot.id, evaluation, () => seed()),
    /not confirmed/,
  );
});
function conclusion(
  actionId: string,
  evaluationId: string,
): Omit<DecisionCommand, 'id'> {
  return {
    decisionStatement: 'Conclude the fixture test.',
    conclusion: 'Conclude the fixture test.',
    reason: 'Verify the existing persistence boundary.',
    nextActionTypeDefinitionId: actionId,
    nextActionNote:
      actionId === 'next-action-complete'
        ? 'Complete Run'
        : 'Review next fixture iteration.',
    evaluationIds: [evaluationId],
    targetReferences: [
      {
        seriesTargetId: evaluation.seriesTargetId,
        measurementSummaryId: evaluation.measurementSummaryId,
        status: selected.achievement.status,
      },
    ],
    targetSubjectIds: [selected.subject.id],
    targetOperationIds: [selected.measurement!.operation.id],
    recordedBy: 'test',
    recordedAt: evaluation.evaluatedAt,
    nextRunChange: null,
  };
}
void test('Complete Run saves existing Decision/Next Action evidence, preserves raw result and Plan, and creates no Run', async () => {
  const app = new DxtApplication(
    createInMemoryRepositories(configurationRepository),
  );
  const source = seed();
  const saved = await app.recordEvaluation(source, {
    ...evaluation,
    id: 'g03-complete-evaluation',
  });
  const before = await app.repositories.run.listSnapshots();
  const command = conclusion(
    'next-action-complete',
    saved.engineerEvaluations[0].id,
  );
  const completed = await saveConclusionRecord(
    model.snapshot.id,
    command,
    (value) =>
      app.recordDecision(saved, definitions, { ...value, id: 'g03-complete' }),
  );
  assert.equal(
    (await app.repositories.decision.getByRun(model.snapshot.id))?.context
      ?.decision.id,
    'g03-complete',
  );
  const reordered = structuredClone(completed);
  reordered.decisionContext!.targetAchievementReferences =
    command.targetReferences.map((ref) => ({
      status: ref.status,
      measurementSummaryId: ref.measurementSummaryId,
      seriesTargetId: ref.seriesTargetId,
    }));
  assert.ok(
    await saveConclusionRecord(model.snapshot.id, command, () => reordered),
    'JSONB key order is not scientific identity',
  );
  assert.equal(completed.nextRunPreview, null);
  assert.equal(
    completed.decisionContext?.decision.nextAction?.nextActionTypeDefinitionId,
    'next-action-complete',
  );
  assert.deepEqual(await app.repositories.run.listSnapshots(), before);
  assert.deepEqual(completed.snapshot, source.snapshot);
  assert.deepEqual(completed.measurementResults, source.measurementResults);
  await assert.rejects(
    saveConclusionRecord(model.snapshot.id, command, () => {
      throw new Error('CONFLICT');
    }),
    /CONFLICT/,
  );
  await assert.rejects(
    saveConclusionRecord(model.snapshot.id, command, () => undefined),
    /not confirmed/,
  );
});
void test('Next Run conclusion produces a preview; only explicit create invokes Run creation and returns its number', async () => {
  const repos = createInMemoryRepositories(configurationRepository);
  let creates = 0;
  repos.run.createFromPreviousRun = async () => {
    creates++;
    return { ...model.snapshot, runNumber: 91 };
  };
  const app = new DxtApplication(repos);
  const saved = await app.recordEvaluation(seed(), {
    ...evaluation,
    id: 'g03-next-evaluation',
  });
  const command = conclusion(
    'next-action-design-next',
    saved.engineerEvaluations[0].id,
  );
  const decided = await saveConclusionRecord(
    model.snapshot.id,
    command,
    (value) =>
      app.recordDecision(saved, definitions, { ...value, id: 'g03-next' }),
  );
  assert.ok(decided.nextRunPreview);
  assert.equal(creates, 0);
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <NextRunActionPreview
        preview={decided.nextRunPreview!}
        staged={false}
        onCreate={() => {}}
        onCancel={() => {}}
        canCreate={false}
      />
    </LocaleProvider>,
  );
  assert.match(html, /NEXT RUN PREVIEW/);
  assert.match(html, /disabled="">Create Next Run/);
  assert.doesNotMatch(html, /is ready/);
  assert.equal(
    confirmedCreatedRunNumber(
      await app.createNextRun('dts-improvement', decided, 'g03-create'),
    ),
    91,
  );
  assert.equal(creates, 1);
  assert.throws(() => confirmedCreatedRunNumber(undefined), /not confirmed/);
});

void test('decision-only permission can use an existing exact Evaluation without enabling evaluation editing', () => {
  const html = render({
    engineerEvaluations:
      engineeringGridEvaluationScenarios.PHOTO.engineerEvaluations,
    onRecordDecision: () => {},
  });
  assert.match(html, /evaluation-comment-fields" disabled/);
  assert.doesNotMatch(html, /evaluation-conclusion-fields" disabled/);
  assert.match(html, /form="engineer-evaluation-form" disabled/);
});
