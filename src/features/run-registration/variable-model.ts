import type { RunPlanningSnapshot, SetupAssignment } from './planning-model';
import {
  applyVariableAssignments,
  type ExperimentWorkspaceModel,
} from './workspace-model';
import {
  definitionAssignment,
  validateVariableValues,
  type ApplicableVariableDefinition,
} from './applicability';
import { resolveConfigurationApplicability } from '@/src/domain/reference';

export function resolvedVariableDefinitions(
  model: ExperimentWorkspaceModel,
  operationId: string,
): ApplicableVariableDefinition[] {
  const operation = model.operations.find((op) => op.id === operationId);
  if (!operation || operation.role === 'MEASUREMENT') return [];
  return resolveConfigurationApplicability(
    model.configurationRepository,
    {
    configurationPackageVersionId: model.snapshot.configurationPackageVersionId,
    operationDefinitionRevisionId: operation.operationDefinitionRevisionId,
    areaDefinitionRevisionId: operation.areaDefinitionRevisionId,
    subjectTypeRevisionId: model.snapshot.subjectTypeRevisionId,
    requestedGrainRevisionId: 'grain-subject-r1',
    equipmentReferenceId: operation.equipmentReferenceId,
    moduleReferenceId: operation.moduleReferenceId ?? undefined,
    experimentTypeProfileVersionId:
      model.snapshot.experimentTypeProfileVersionId,
    },
  ).map((resolved) => ({
    id: resolved.revisionId,
    label: resolved.label,
    editor: resolved.editorKey as ApplicableVariableDefinition['editor'],
    unit: resolved.unit,
    options: resolved.allowedOptions,
    allowedGrains: ['SUBJECT'],
    applicabilityId: resolved.applicabilityRuleId,
    assignmentKind: resolved.assignmentKind,
    assignmentReferenceId: resolved.assignmentReferenceRevisionId,
    defaultValue: resolved.defaultValue,
    defaultGrain: 'SUBJECT',
    defaultRole: resolved.defaultRole,
  }));
}

export function resolvedDefinitionForAssignment(
  model: ExperimentWorkspaceModel,
  item: SetupAssignment,
) {
  return resolvedVariableDefinitions(model, item.processStepId ?? '').find(
    (definition) =>
      definition.assignmentKind === item.kind &&
      (definition.assignmentReferenceId === item.referenceId ||
        definition.label === item.label),
  );
}
// Editing adapter over the existing typed assignments; never a persistence entity.
export function variableDefinitions(
  model: ExperimentWorkspaceModel,
  operationId: string,
): SetupAssignment[] {
  return resolvedVariableDefinitions(model, operationId).map((definition) =>
    definitionAssignment(definition, operationId),
  );
}
export function saveVariable(
  snapshot: RunPlanningSnapshot,
  item: SetupAssignment,
  values: Record<string, string>,
  definition?: ApplicableVariableDefinition,
): RunPlanningSnapshot {
  const checkedValues = definition
    ? validateVariableValues(definition, values)
    : values;
  const matches = (a: SetupAssignment) =>
    a.processStepId === item.processStepId &&
    a.kind === item.kind &&
    a.label === item.label;
  // Preserve unselected Subject values and all Position overrides. Intent is explicit.
  const common = {
    ...item,
    subjectId: null,
    positionId: null,
    provenance: 'AD_HOC' as const,
  };
  const previous = snapshot.assignments.filter(
    (a) => matches(a) && a.subjectId && !a.positionId,
  );
  const allValues = {
    ...Object.fromEntries(previous.map((a) => [a.subjectId!, a.value])),
    ...checkedValues,
  };
  const hasCommon = snapshot.assignments.some(
    (a) => matches(a) && !a.subjectId && !a.positionId,
  );
  const updated = {
    ...snapshot,
    assignments: hasCommon
      ? snapshot.assignments.map((a) =>
          matches(a) && !a.subjectId && !a.positionId ? common : a,
        )
      : [...snapshot.assignments, common],
  };
  return applyVariableAssignments(updated, common, allValues);
}
