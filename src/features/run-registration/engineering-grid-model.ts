import type { SubjectRef } from '@/src/domain/experiment/subject';
import type { PlanningIntent, SetupAssignment } from './planning-model';
import type { ApplicableVariableDefinition } from './applicability';
import { measurementInlineSummary, subjectValues } from './inline-model';
import { resolvedVariableDefinitions } from './variable-model';
import type {
  ExperimentWorkspaceModel,
  WorkspaceOperation,
} from './workspace-model';

export type GridOperation = WorkspaceOperation & { sourceOperationId: string };
export type EngineeringGridRow = {
  id: string;
  kind: 'OPERATION' | 'VARIABLE' | 'MEASUREMENT';
  operation: GridOperation;
  definition?: ApplicableVariableDefinition;
  assignment?: SetupAssignment;
  role?: PlanningIntent;
  values?: Record<string, string>;
  summary?: string;
};

export const planEngineeringGridSchema = {
  projection: 'PLAN',
  columns: ['SEQUENCE', 'OPERATION', 'EQUIPMENT', 'ITEM', 'UNIT', 'SUBJECTS'],
  pinnedColumns: ['SEQUENCE', 'OPERATION', 'ITEM'],
  editableColumns: ['ITEM_ROLE', 'SUBJECT_VALUE'],
  defaultGrouping: 'OPERATION',
  defaultSubjectGrain: 'SUBJECT',
} as const;

export function scaleGridOperations(
  model: ExperimentWorkspaceModel,
  count: number,
): GridOperation[] {
  if (count <= model.operations.length)
    return model.operations.slice(0, count).map((operation) => ({
      ...operation,
      sourceOperationId: operation.id,
    }));
  const templates = model.operations.filter(
    (operation) =>
      operation.role === 'MEASUREMENT' ||
      resolvedVariableDefinitions(model, operation.id).length,
  );
  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    const cycle = Math.floor(index / templates.length) + 1;
    return {
      ...template,
      id: `grid-${index}-${template.id}`,
      sourceOperationId: template.id,
      sequence: (index + 1) * 10,
      name: cycle === 1 ? template.name : `${template.name} · ${cycle}`,
    };
  });
}

function assignmentFor(
  model: ExperimentWorkspaceModel,
  operation: GridOperation,
  definition: ApplicableVariableDefinition,
): SetupAssignment {
  return (
    model.snapshot.assignments.find(
      (assignment) =>
        assignment.processStepId === operation.sourceOperationId &&
        !assignment.subjectId &&
        assignment.kind === definition.assignmentKind &&
        (assignment.referenceId === definition.assignmentReferenceId ||
          assignment.label === definition.label),
    ) ?? {
      id: `${operation.id}-${definition.applicabilityId}`,
      kind: definition.assignmentKind,
      label: definition.label,
      value: definition.defaultValue,
      referenceId: definition.assignmentReferenceId,
      processStepId: operation.sourceOperationId,
      subjectId: null,
      positionId: null,
      intentRole: definition.defaultRole,
      provenance: 'AD_HOC',
    }
  );
}

export function projectEngineeringGridRows(
  model: ExperimentWorkspaceModel,
  operations: GridOperation[],
  expanded: ReadonlySet<string>,
): EngineeringGridRow[] {
  return operations.flatMap((operation) => {
    const parent: EngineeringGridRow = {
      id: `${operation.id}:operation`,
      kind: 'OPERATION',
      operation,
    };
    if (!expanded.has(operation.id)) return [parent];
    if (operation.role === 'MEASUREMENT') {
      const measurement = measurementInlineSummary(
        model,
        operation.sourceOperationId,
      );
      return [
        parent,
        {
          id: `${operation.id}:measurement`,
          kind: 'MEASUREMENT',
          operation,
          summary: `${measurement.measurement} · ${measurement.acquisition}`,
        },
      ];
    }
    const variables = resolvedVariableDefinitions(
      model,
      operation.sourceOperationId,
    ).map((definition) => {
      const assignment = assignmentFor(model, operation, definition);
      const values =
        operation.id === operation.sourceOperationId
          ? subjectValues(model, assignment)
          : Object.fromEntries(
              model.subjects.map((subject) => [subject.id, assignment.value]),
            );
      return {
        id: `${operation.id}:${definition.applicabilityId}`,
        kind: 'VARIABLE' as const,
        operation,
        definition,
        assignment,
        role: assignment.intentRole,
        values,
      };
    });
    return [parent, ...variables];
  });
}

export function gridCellKey(rowId: string, subject: SubjectRef) {
  return `${rowId}:${subject.id}`;
}
