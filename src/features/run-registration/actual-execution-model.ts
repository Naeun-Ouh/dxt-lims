import { participatesInOperation } from './grid-plan-context';
import type { SubjectRef } from '@/src/domain/experiment/subject';
import { effectiveAssignments, type PlanningIntent } from './planning-model';
import { resolvedVariableDefinitions } from './variable-model';
import type {
  ExperimentWorkspaceModel,
  WorkspaceOperation,
} from './workspace-model';

export type ExecutionDelta =
  | 'NOT_PARTICIPATING'
  | 'MATCH'
  | 'CHANGED'
  | 'MISSING_ACTUAL'
  | 'UNPLANNED_ACTUAL'
  | 'NOT_COMPARABLE';

export type ActualExecutionStatus =
  | 'NOT_PARTICIPATING'
  | 'PLANNED'
  | 'EXECUTED'
  | 'PARTIAL'
  | 'NOT_EXECUTED'
  | 'UNKNOWN';

export type ObservedExecutionValue = {
  definitionId: string;
  value: string;
};

export type SubjectExecutionEvent = {
  id: string;
  experimentRunId: string;
  processStepId: string;
  plannedExecutionItemId: string | null;
  observedOperation: string;
  observedRecipe: string;
  equipment: string;
  startedAt: string;
  endedAt: string | null;
  executionStatus: 'OBSERVED' | 'COMPLETED' | 'INTERRUPTED';
  sourceSystem: string;
  sourceRecordReference: string;
};

export type ExecutionIdentityContext = {
  attributes: Array<{ label: string; value: string }>;
};

// Adapter contract over immutable source-system evidence. It is not persistence.
export type ActualExecutionEvidence = {
  event: SubjectExecutionEvent;
  identityContext?: ExecutionIdentityContext | null;
  resolvedSubjectId: string;
  observedValues: ObservedExecutionValue[];
  retrievedAt: string;
};

export type ExecutionComparison = {
  key: string;
  label: string;
  unit: string;
  planned: string | null;
  actual: string | null;
  delta: ExecutionDelta;
  intentRole: PlanningIntent | null;
};

export type OperationExecutionProjection = {
  runId: string;
  plannedParticipant: boolean;
  unexpected: boolean;
  subject: SubjectRef;
  operation: WorkspaceOperation;
  plannedExecutionItemId: string;
  status: ActualExecutionStatus;
  comparisons: ExecutionComparison[];
  event: SubjectExecutionEvent | null;
  identityContext: ExecutionIdentityContext | null;
  provenance: {
    sourceSystem: string;
    sourceRecordReference: string;
    retrievedAt: string;
  } | null;
};

export function plannedExecutionIdentity(
  runId: string,
  subjectId: string,
  operationId: string,
) {
  return `planned:${runId}:${subjectId}:${operationId}`;
}

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ');

export function compareExecutionValue(
  planned: string | null,
  actual: string | null,
): ExecutionDelta {
  if (planned === null && actual === null) return 'NOT_COMPARABLE';
  if (planned === null) return 'UNPLANNED_ACTUAL';
  if (actual === null) return 'MISSING_ACTUAL';
  return normalized(planned) === normalized(actual) ? 'MATCH' : 'CHANGED';
}

function executionStatus(
  event: SubjectExecutionEvent | null,
): ActualExecutionStatus {
  if (!event) return 'NOT_EXECUTED';
  if (event.executionStatus === 'COMPLETED') return 'EXECUTED';
  if (event.executionStatus === 'INTERRUPTED') return 'PARTIAL';
  return 'UNKNOWN';
}

function plannedDefinitionValue(
  model: ExperimentWorkspaceModel,
  operationId: string,
  subjectId: string,
  definitionId: string,
  label: string,
  defaultValue: string,
) {
  const assignment = Object.values(
    effectiveAssignments(model.snapshot, subjectId),
  ).find(
    (candidate) =>
      candidate.processStepId === operationId &&
      (candidate.referenceId === definitionId || candidate.label === label),
  );
  return assignment?.value ?? defaultValue ?? null;
}

function findEvidence(
  model: ExperimentWorkspaceModel,
  operation: WorkspaceOperation,
  subject: SubjectRef,
  evidence: readonly ActualExecutionEvidence[],
) {
  const identity = plannedExecutionIdentity(
    model.snapshot.id,
    subject.id,
    operation.id,
  );
  return evidence.find(
    (record) =>
      record.event.experimentRunId === model.snapshot.id &&
      record.event.processStepId === operation.id &&
      record.resolvedSubjectId === subject.id &&
      (record.event.plannedExecutionItemId === identity ||
        record.event.plannedExecutionItemId === null),
  );
}

export function projectOperationExecution(
  model: ExperimentWorkspaceModel,
  operation: WorkspaceOperation,
  subject: SubjectRef,
  evidence: readonly ActualExecutionEvidence[],
): OperationExecutionProjection {
  const record = findEvidence(model, operation, subject, evidence) ?? null;
  const plannedParticipant = participatesInOperation(
    model.snapshot,
    subject.id,
    operation.id,
  );
  const definitions = resolvedVariableDefinitions(model, operation.id);
  const comparisons: ExecutionComparison[] = [
    {
      key: 'equipment',
      label: 'Equipment',
      unit: '',
      planned: operation.equipment || null,
      actual: record?.event.equipment ?? null,
      delta: compareExecutionValue(
        operation.equipment || null,
        record?.event.equipment ?? null,
      ),
      intentRole: null,
    },
    ...definitions.map((definition) => {
      const planned = plannedDefinitionValue(
        model,
        operation.id,
        subject.id,
        definition.assignmentReferenceId,
        definition.label,
        definition.defaultValue,
      );
      const actual =
        definition.assignmentKind === 'RECIPE'
          ? (record?.event.observedRecipe ?? null)
          : (record?.observedValues.find(
              (value) => value.definitionId === definition.id,
            )?.value ?? null);
      const role = model.snapshot.assignments.find(
        (assignment) =>
          assignment.processStepId === operation.id &&
          !assignment.subjectId &&
          assignment.label === definition.label,
      )?.intentRole;
      return {
        key: definition.id,
        label: definition.label,
        unit: definition.unit ?? '',
        planned,
        actual,
        delta: compareExecutionValue(planned, actual),
        intentRole: role ?? definition.defaultRole,
      };
    }),
  ];
  if (!plannedParticipant) {
    for (const comparison of comparisons) {
      comparison.planned = null;
      comparison.delta =
        comparison.actual === null ? 'NOT_PARTICIPATING' : 'UNPLANNED_ACTUAL';
    }
  }
  return {
    plannedParticipant,
    unexpected: !plannedParticipant && !!record,
    runId: model.snapshot.id,
    subject,
    operation,
    plannedExecutionItemId: plannedExecutionIdentity(
      model.snapshot.id,
      subject.id,
      operation.id,
    ),
    status:
      !plannedParticipant && !record
        ? 'NOT_PARTICIPATING'
        : executionStatus(record?.event ?? null),
    comparisons,
    event: record?.event ?? null,
    identityContext: record?.identityContext ?? null,
    provenance: record
      ? {
          sourceSystem: record.event.sourceSystem,
          sourceRecordReference: record.event.sourceRecordReference,
          retrievedAt: record.retrievedAt,
        }
      : null,
  };
}

export function projectActualExecution(
  model: ExperimentWorkspaceModel,
  operations: readonly WorkspaceOperation[],
  evidence: readonly ActualExecutionEvidence[],
) {
  return operations.flatMap((operation) =>
    model.subjects.map((subject) =>
      projectOperationExecution(model, operation, subject, evidence),
    ),
  );
}
