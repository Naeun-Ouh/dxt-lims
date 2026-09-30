import type { ExperimentSeries } from '@/src/domain/experiment';
import type {
  EngineerEvaluationRecord,
  EvaluationTargetBinding,
} from '@/src/features/run-registration/evaluation-grid-model';
import { series } from './experiments';

const photoTarget = series.targets.find(
  (target) => target.id === 'target-bcd',
)!;
const cmpTarget = {
  id: 'target-thk',
  parameterDefinitionId: 'parameter-thickness-result-v1',
  operator: 'BETWEEN',
  threshold: null,
  lowerBound: 495,
  upperBound: 505,
  unitDefinitionId: 'unit-nm',
} satisfies ExperimentSeries['targets'][number];

const bindings: Record<'PHOTO' | 'CMP', EvaluationTargetBinding[]> = {
  PHOTO: [
    {
      target: photoTarget,
      measurementPoint: 'POST',
      resultGrain: 'SUBJECT_SUMMARY',
      aggregationMethod: 'MEAN',
    },
  ],
  CMP: [
    {
      target: cmpTarget,
      measurementPoint: 'POST',
      resultGrain: 'SUBJECT_SUMMARY',
      aggregationMethod: 'MEAN',
    },
  ],
};

function evaluation(
  runId: string,
  subjectId: string,
  targetId: string,
  summaryId: string,
  disposition: EngineerEvaluationRecord['disposition'],
  comment: string,
  evaluator: string,
  evaluatedAt: string,
): EngineerEvaluationRecord {
  return {
    id: `evaluation-${runId}-${subjectId}`,
    runId,
    subjectId,
    seriesTargetId: targetId,
    measurementSummaryId: summaryId,
    disposition,
    comment,
    evaluator,
    evaluatedAt,
  };
}

const evaluations: Record<'PHOTO' | 'CMP', EngineerEvaluationRecord[]> = {
  PHOTO: [
    evaluation(
      'run-photo-18',
      'PHO7814.01',
      'target-bcd',
      'summary-photo-bcd-1',
      'NEEDS_REVIEW',
      'Target achieved, but one excluded Site requires review before use.',
      'Lee Seunghyun',
      '2026-09-10T18:30:00+09:00',
    ),
    ...[2, 3, 4].map((slot) =>
      evaluation(
        'run-photo-18',
        `PHO7814.${String(slot).padStart(2, '0')}`,
        'target-bcd',
        `summary-photo-bcd-${slot}`,
        'ACCEPT',
        'BCD summary is suitable for the current target assessment.',
        'Lee Seunghyun',
        `2026-09-10T18:${30 + slot}:00+09:00`,
      ),
    ),
  ],
  CMP: [1, 2, 3, 4].map((slot) =>
    evaluation(
      'run-cmp-12',
      `RSA6420.${String(slot).padStart(2, '0')}`,
      'target-thk',
      `summary-cmp-post-${slot}`,
      slot === 4 ? 'INFORMATIVE' : 'ACCEPT',
      slot === 4
        ? 'Within target; retain as informative because the edge trend merits follow-up.'
        : 'POST thickness is suitable for the configured Study target.',
      'Park Mina',
      `2026-09-10T18:${40 + slot}:00+09:00`,
    ),
  ),
};

export const engineeringGridEvaluationScenarios = {
  PHOTO: { bindings: bindings.PHOTO, engineerEvaluations: evaluations.PHOTO },
  CMP: { bindings: bindings.CMP, engineerEvaluations: evaluations.CMP },
};
