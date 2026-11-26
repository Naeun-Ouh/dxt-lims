import type {
  EvaluationProjection,
  EngineerEvaluationRecord,
} from './evaluation-grid-model';
import type {
  AuthoredLifecycleState,
  DecisionCommand,
  EvaluationCommand,
} from './lifecycle-authoring';

type Write<T> = (command: Omit<T, 'id'>) => unknown;

// The application callbacks return repository read-back. A resolved void callback
// or a stale record is not evidence that the user's draft was persisted.
export async function saveEvaluationRecord(
  runId: string,
  command: Omit<EvaluationCommand, 'id'>,
  write: Write<EvaluationCommand>,
) {
  const saved = (await write(command)) as AuthoredLifecycleState | undefined;
  if (
    saved?.runId !== runId ||
    !saved.engineerEvaluations?.some(
      (record) =>
        record.runId === runId &&
        record.subjectId === command.subjectId &&
        record.seriesTargetId === command.seriesTargetId &&
        record.measurementSummaryId === command.measurementSummaryId &&
        record.comment === command.comment.trim() &&
        record.disposition === command.disposition,
    )
  )
    throw new Error(
      'Evaluation save was not confirmed. Reload before retrying.',
    );
  return saved;
}

export async function saveConclusionRecord(
  runId: string,
  command: Omit<DecisionCommand, 'id'>,
  write: Write<DecisionCommand>,
) {
  const saved = (await write(command)) as AuthoredLifecycleState | undefined;
  const context = saved?.decisionContext;
  const decision = context?.decision;
  if (
    saved?.runId !== runId ||
    !decision ||
    decision.experimentRunId !== runId ||
    decision.conclusion !== command.conclusion.trim() ||
    decision.reason !== command.reason.trim() ||
    (decision.nextAction?.nextActionTypeDefinitionId ?? '') !==
      command.nextActionTypeDefinitionId ||
    (decision.nextAction?.note ?? '') !== command.nextActionNote.trim() ||
    JSON.stringify(context?.engineerEvaluationIds) !==
      JSON.stringify(command.evaluationIds) ||
    context?.targetAchievementReferences.length !==
      command.targetReferences.length ||
    !command.targetReferences.every((expected) =>
      context?.targetAchievementReferences.some(
        (actual) =>
          actual.seriesTargetId === expected.seriesTargetId &&
          actual.measurementSummaryId === expected.measurementSummaryId &&
          actual.status === expected.status,
      ),
    )
  )
    throw new Error(
      'Run Conclusion save was not confirmed. Reload before retrying.',
    );
  return saved;
}

// Run judgment is independent of per-result Evaluation. Keep this pure helper
// for callers that formerly used an Evaluation prerequisite; permissions remain
// authoritative at the command boundary.
export function conclusionPrerequisite(
  _selected: EvaluationProjection | null,
  _comment: string,
  _disposition: EngineerEvaluationRecord['disposition'],
): string | null {
  return null;
}

export function confirmedCreatedRunNumber(result: unknown): number {
  if (
    result &&
    typeof result === 'object' &&
    'runNumber' in result &&
    typeof result.runNumber === 'number' &&
    Number.isInteger(result.runNumber) &&
    result.runNumber > 0
  )
    return result.runNumber;
  throw new Error(
    'Next Run creation was not confirmed. Reload before retrying.',
  );
}
