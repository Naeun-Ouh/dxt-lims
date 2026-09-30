import { decisionSchema } from '@/src/domain/decision';
import { createNextRunPreview } from '@/src/features/run-registration/decision-continuation-model';
import { runPlanningScenarios } from '@/src/features/run-registration/planning-model';

const photoDecision = decisionSchema.parse({
  id: 'decision-photo-run-18',
  experimentRunId: 'run-photo-18',
  evaluations: [
    {
      evaluationDefinitionId: 'evaluation-relative-v1',
      value: { dataType: 'SELECT', value: 'SIMILAR' },
    },
  ],
  criterionAssessments: [
    {
      evaluationCriterionDefinitionId: 'criterion-bcd-range-v1',
      measurementSummaryId: 'summary-photo-bcd-1',
      status: 'PASS',
      evidenceIds: ['dataset-photo-cdsem-1'],
    },
  ],
  conclusion:
    'The BCD target was achieved, but the excluded W01 Site warrants a shifted confirmation window.',
  reason:
    'The next experiment should preserve the controlled setup and move the Energy split upward by one step.',
  nextAction: {
    nextActionTypeDefinitionId: 'next-action-design-next',
    note: 'Create the next Run with the inherited setup and Energy 35 / 36 / 37 / 38.',
  },
  recordedBy: 'Lee Seunghyun',
  recordedAt: '2026-09-10T19:00:00+09:00',
});

const photoChanges = runPlanningScenarios.PHOTO.subjects.map((subject, index) => {
  const assignment = runPlanningScenarios.PHOTO.assignments.find(
    (candidate) =>
      candidate.label === 'Energy' &&
      candidate.subjectId === subject.id &&
      candidate.positionId === null,
  )!;
  return { assignmentId: assignment.id, after: String(35 + index) };
});

const photoNextRunPreview = createNextRunPreview(
  runPlanningScenarios.PHOTO,
  'run-photo-19',
  photoChanges,
);

const cmpDecision = decisionSchema.parse({
  id: 'decision-cmp-run-12',
  experimentRunId: 'run-cmp-12',
  evaluations: [
    {
      evaluationDefinitionId: 'evaluation-relative-v1',
      value: { dataType: 'SELECT', value: 'BETTER' },
    },
  ],
  criterionAssessments: [],
  conclusion:
    'POST thickness is inside the configured window, while the W04 edge trend remains scientifically useful.',
  reason:
    'Collect a targeted repeat measurement before changing the CMP setup.',
  nextAction: {
    nextActionTypeDefinitionId: 'next-action-measure',
    note: 'Add a targeted POST thickness measurement for the W04 edge Sites.',
  },
  recordedBy: 'Park Mina',
  recordedAt: '2026-09-10T19:10:00+09:00',
});

export const engineeringGridDecisionScenarios = {
  PHOTO: {
    context: {
      decision: photoDecision,
      decisionStatement: 'Proceed to the next experimental iteration',
      engineerEvaluationIds: ['evaluation-run-photo-18-PHO7814.01'],
      targetAchievementReferences: [
        {
          seriesTargetId: 'target-bcd',
          measurementSummaryId: 'summary-photo-bcd-1',
          status: 'ACHIEVED' as const,
        },
      ],
      targetScope: {
        subjectIds: runPlanningScenarios.PHOTO.subjects.map(
          (subject) => subject.id,
        ),
        operationIds: ['photo-exposure', 'photo-cdsem'],
      },
      siteScopeLabel: null,
      destinationRunId: 'run-photo-19',
    },
    nextRunPreview: photoNextRunPreview,
  },
  CMP: {
    context: {
      decision: cmpDecision,
      decisionStatement: 'Continue with targeted additional measurement',
      engineerEvaluationIds: ['evaluation-run-cmp-12-RSA6420.04'],
      targetAchievementReferences: [
        {
          seriesTargetId: 'target-thk',
          measurementSummaryId: 'summary-cmp-post-4',
          status: 'ACHIEVED' as const,
        },
      ],
      targetScope: {
        subjectIds: ['RSA6420.04'],
        operationIds: ['cmp-thk-post'],
      },
      siteScopeLabel: 'Edge Sites',
      destinationRunId: null,
    },
    nextRunPreview: null,
  },
};
