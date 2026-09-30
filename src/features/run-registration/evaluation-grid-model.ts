import type { SubjectRef } from '@/src/domain/experiment/subject';
import type { ExperimentSeries } from '@/src/domain/experiment';
import type { SubjectMeasurementSummary } from '@/src/domain/measurement/subject-measurement';
import type { MeasurementEvidenceProjection } from './measurement-grid-model';

export type TargetAchievementStatus =
  | 'ACHIEVED'
  | 'NOT_ACHIEVED'
  | 'MISSING_RESULT'
  | 'NOT_EVALUABLE';

export type EvaluationTargetBinding = {
  target: ExperimentSeries['targets'][number];
  measurementPoint: MeasurementEvidenceProjection['measurementExecution']['measurementPoint'];
  resultGrain: 'SUBJECT_SUMMARY';
  aggregationMethod: SubjectMeasurementSummary['aggregationMethod'];
};

export type EngineerEvaluationRecord = {
  id: string;
  runId: string;
  subjectId: string;
  seriesTargetId: string;
  measurementSummaryId: string;
  disposition: 'ACCEPT' | 'NEEDS_REVIEW' | 'UNSUITABLE' | 'INFORMATIVE';
  comment: string;
  evaluator: string;
  evaluatedAt: string;
};

export type EvaluationProjection = {
  runId: string;
  subject: SubjectRef;
  binding: EvaluationTargetBinding;
  measurement: MeasurementEvidenceProjection | null;
  resultValue: number | null;
  resultUnit: string | null;
  achievement: {
    seriesTargetId: string;
    measurementSummaryId: string | null;
    measurementDatasetId: string | null;
    measurementExecutionId: string | null;
    status: TargetAchievementStatus;
  };
  engineerEvaluation: EngineerEvaluationRecord | null;
};

function targetIsConfigured(binding: EvaluationTargetBinding) {
  const target = binding.target;
  if (target.operator === 'BETWEEN')
    return target.lowerBound !== null && target.upperBound !== null;
  return target.threshold !== null;
}

export function calculateTargetAchievement(
  binding: EvaluationTargetBinding,
  measurement: MeasurementEvidenceProjection | null,
): EvaluationProjection['achievement'] {
  const base = {
    seriesTargetId: binding.target.id,
    measurementSummaryId: measurement?.representative?.id ?? null,
    measurementDatasetId: measurement?.dataset.id ?? null,
    measurementExecutionId: measurement?.measurementExecution.id ?? null,
  };
  if (!measurement) return { ...base, status: 'MISSING_RESULT' };
  const summary = measurement.representative;
  if (
    !summary ||
    binding.resultGrain !== 'SUBJECT_SUMMARY' ||
    summary.aggregationMethod !== binding.aggregationMethod ||
    summary.parameterDefinitionId !== binding.target.parameterDefinitionId ||
    summary.value.dataType !== 'NUMBER' ||
    (binding.target.unitDefinitionId !== null &&
      summary.unitDefinitionId !== binding.target.unitDefinitionId) ||
    !targetIsConfigured(binding)
  )
    return { ...base, status: 'NOT_EVALUABLE' };

  const value = summary.value.value;
  const target = binding.target;
  const achieved =
    target.operator === 'GTE'
      ? value >= target.threshold!
      : target.operator === 'LTE'
        ? value <= target.threshold!
        : target.operator === 'BETWEEN'
          ? value >= target.lowerBound! && value <= target.upperBound!
          : value === target.threshold;
  return { ...base, status: achieved ? 'ACHIEVED' : 'NOT_ACHIEVED' };
}

export function projectEvaluations(
  runId: string,
  subjects: readonly SubjectRef[],
  measurements: readonly MeasurementEvidenceProjection[],
  bindings: readonly EvaluationTargetBinding[],
  engineerEvaluations: readonly EngineerEvaluationRecord[],
): EvaluationProjection[] {
  return bindings.flatMap((binding) =>
    subjects.map((subject) => {
      const measurement =
        measurements.find(
          (candidate) =>
            candidate.subject.id === subject.id &&
            candidate.parameter.id === binding.target.parameterDefinitionId &&
            candidate.measurementExecution.measurementPoint ===
              binding.measurementPoint,
        ) ?? null;
      const achievement = calculateTargetAchievement(binding, measurement);
      const engineerEvaluation =
        engineerEvaluations.find(
          (candidate) =>
            candidate.runId === runId &&
            candidate.subjectId === subject.id &&
            candidate.seriesTargetId === binding.target.id &&
            candidate.measurementSummaryId === achievement.measurementSummaryId,
        ) ?? null;
      const summaryValue = measurement?.representative?.value;
      return {
        runId,
        subject,
        binding,
        measurement,
        resultValue:
          summaryValue?.dataType === 'NUMBER' ? summaryValue.value : null,
        resultUnit: measurement?.unit ?? null,
        achievement,
        engineerEvaluation,
      };
    }),
  );
}

export function formatTargetRule(binding: EvaluationTargetBinding) {
  const target = binding.target;
  if (target.operator === 'BETWEEN')
    return `${target.lowerBound} – ${target.upperBound}`;
  const symbol = { GTE: '≥', LTE: '≤', EQ: '=' }[target.operator];
  return `${symbol} ${target.threshold}`;
}
