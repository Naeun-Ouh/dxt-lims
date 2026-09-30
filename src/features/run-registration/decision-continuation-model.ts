import type { Decision } from '@/src/domain/decision';
import { ExperimentConfigurationResolver } from '@/src/domain/experiment/configuration';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { TargetAchievementStatus } from './evaluation-grid-model';
import type { RunPlanningSnapshot, SetupAssignment } from './planning-model';

export type TargetAchievementReference = {
  seriesTargetId: string;
  measurementSummaryId: string;
  status: TargetAchievementStatus;
};

export type DecisionContinuationContext = {
  decision: Decision;
  decisionStatement: string;
  engineerEvaluationIds: string[];
  targetAchievementReferences: TargetAchievementReference[];
  targetScope: {
    subjectIds: string[];
    operationIds: string[];
  };
  siteScopeLabel: string | null;
  destinationRunId: string | null;
};

export type NextRunChange = {
  assignmentId: string;
  after: string;
};

export type NextRunPreview = {
  previousRunId: string;
  snapshot: RunPlanningSnapshot;
  inherited: Array<{
    assignmentId: string;
    label: string;
    value: string;
    subjectId: string | null;
  }>;
  changed: Array<{
    assignmentId: string;
    label: string;
    before: string;
    after: string;
    subjectId: string | null;
  }>;
};

export type DecisionContinuationProjection = {
  context: DecisionContinuationContext;
  actionType: ReferenceCatalog['nextActionTypes'][number] | null;
  rationale: string | null;
  nextRunPreview: NextRunPreview | null;
};

export type NextActionPresentation = {
  kind: 'MEASUREMENT_PLAN' | 'NEXT_RUN' | 'REFERENCE_ONLY';
  ctaLabel: string;
};

function assignmentConfiguration(snapshot: RunPlanningSnapshot) {
  return {
    id: `configuration-${snapshot.id}`,
    sourceId: snapshot.provenance.sourceId,
    sourceKind:
      snapshot.provenance.kind === 'SERIES_DEFAULT'
        ? ('SERIES_DEFAULT' as const)
        : snapshot.provenance.kind === 'PREVIOUS_RUN'
          ? ('PREVIOUS_RUN' as const)
          : ('EXISTING' as const),
    areaDefinitionRevisionId: null,
    items: snapshot.assignments.map((assignment) => ({
      id: assignment.id,
      kind: assignment.kind,
      label: assignment.label,
      referenceRevisionId: assignment.referenceId,
      value: { dataType: 'TEXT' as const, value: assignment.value },
      unit: null,
      provenance:
        assignment.provenance === 'SERIES_DEFAULT'
          ? ('SERIES_DEFAULT' as const)
          : assignment.provenance === 'PREVIOUS_RUN'
            ? ('PREVIOUS_RUN' as const)
            : assignment.provenance === 'EXISTING_CONFIGURATION'
              ? ('LOADED_FROM_EXISTING' as const)
              : ('AD_HOC' as const),
      state: 'INHERITED' as const,
      semanticCategory: assignment.kind,
      createdBy: null,
      createdAt: null,
    })),
  };
}

export function createNextRunPreview(
  previous: RunPlanningSnapshot,
  destinationRunId: string,
  changes: readonly NextRunChange[],
): NextRunPreview {
  const previousConfiguration = assignmentConfiguration(previous);
  let nextConfiguration = ExperimentConfigurationResolver.fromPreviousRun(
    previousConfiguration,
    `configuration-${destinationRunId}`,
  );
  for (const change of changes) {
    if (!previous.assignments.some((item) => item.id === change.assignmentId))
      throw new Error(`Unknown inherited assignment ${change.assignmentId}`);
    nextConfiguration = ExperimentConfigurationResolver.override(
      nextConfiguration,
      change.assignmentId,
      { dataType: 'TEXT', value: change.after },
    );
  }
  const changedIds = new Set(changes.map((change) => change.assignmentId));
  const nextAssignments: SetupAssignment[] = previous.assignments.map(
    (assignment) => {
      const item = nextConfiguration.items.find(
        (candidate) => candidate.id === assignment.id,
      )!;
      return {
        ...structuredClone(assignment),
        value:
          item.value?.dataType === 'TEXT' ? item.value.value : assignment.value,
        provenance:
          item.state === 'MODIFIED' ? 'AD_HOC' : ('PREVIOUS_RUN' as const),
      };
    },
  );
  const changed = changes.map((change) => {
    const before = previous.assignments.find(
      (assignment) => assignment.id === change.assignmentId,
    )!;
    return {
      assignmentId: before.id,
      label: before.label,
      before: before.value,
      after: change.after,
      subjectId: before.subjectId,
    };
  });
  const inherited = previous.assignments
    .filter((assignment) => !changedIds.has(assignment.id))
    .map((assignment) => ({
      assignmentId: assignment.id,
      label: assignment.label,
      value: assignment.value,
      subjectId: assignment.subjectId,
    }));
  return {
    previousRunId: previous.id,
    snapshot: {
      ...structuredClone(previous),
      id: destinationRunId,
      runNumber: previous.runNumber + 1,
      name: `Continuation of Run #${previous.runNumber}`,
      provenance: {
        kind: 'PREVIOUS_RUN',
        label: `Previous Run #${previous.runNumber}`,
        sourceId: previous.id,
      },
      assignments: nextAssignments,
      delta: {
        sourceLabel: `Run #${previous.runNumber}`,
        items: changed.map((change) => ({
          id: `delta-${destinationRunId}-${change.assignmentId}`,
          kind: previous.assignments.find(
            (assignment) => assignment.id === change.assignmentId,
          )!.kind,
          label: `${change.label}${change.subjectId ? ` · ${change.subjectId}` : ''}`,
          change: 'CHANGED' as const,
          before: change.before,
          after: change.after,
        })),
        unchangedCount: inherited.length,
      },
    },
    inherited,
    changed,
  };
}

export function projectDecisionContinuation(
  context: DecisionContinuationContext,
  catalog: ReferenceCatalog,
  nextRunPreview: NextRunPreview | null,
): DecisionContinuationProjection {
  const selected = context.decision.nextAction;
  const actionType = selected
    ? (catalog.nextActionTypes.find(
        (definition) =>
          definition.id === selected.nextActionTypeDefinitionId &&
          definition.active,
      ) ?? null)
    : null;
  return {
    context,
    actionType,
    rationale: selected?.note ?? null,
    nextRunPreview:
      context.destinationRunId &&
      nextRunPreview?.snapshot.id === context.destinationRunId
        ? nextRunPreview
        : null,
  };
}

export function resolveNextActionPresentation(
  projection: DecisionContinuationProjection,
): NextActionPresentation {
  const code = projection.actionType?.code;
  if (code === 'ADDITIONAL_MEASUREMENT')
    return { kind: 'MEASUREMENT_PLAN', ctaLabel: 'Create Measurement Plan' };
  if (code === 'DESIGN_NEXT_EXPERIMENT' && projection.nextRunPreview)
    return { kind: 'NEXT_RUN', ctaLabel: 'Preview Next Run' };
  return { kind: 'REFERENCE_ONLY', ctaLabel: 'Review Next Action' };
}
