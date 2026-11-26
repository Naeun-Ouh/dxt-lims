import {
  effectiveAssignments,
  type RunPlanningSnapshot,
  type SetupAssignment,
} from './planning-model';
import type { SubjectRef } from '@/src/domain/experiment/subject';
import {
  referenceProjectionForOperation,
  workspaceOperationsForPackage,
} from '@/src/mock/workspace-configuration';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';

export type WorkspaceView = 'TABLE' | 'FLOW' | 'VARIATION' | 'EQUIPMENT';
export type WorkspaceScope =
  | 'EXPERIMENT_FOCUS'
  | 'EXPERIMENT_SCOPE'
  | 'FULL_HISTORY';
export type DataResolution = 'LOT' | 'SUBJECT' | 'SITE';
export type FlowDensity = 'COMPACT' | 'NORMAL' | 'DETAIL';
export type WorkspaceSelection = {
  operationId: string;
  subjectId: string | null;
  view: WorkspaceView;
  scope: WorkspaceScope;
  resolution: DataResolution;
  density: FlowDensity;
};
export type WorkspaceOperation = {
  id: string;
  operationDefinitionRevisionId: string;
  areaDefinitionRevisionId: string;
  equipmentReferenceId: string;
  moduleReferenceId: string | null;
  sequence: number;
  name: string;
  shortName: string;
  role: 'PROCESS' | 'MEASUREMENT';
  area: string;
  focus: boolean;
  equipment: string;
  module: string;
  recipe: string;
  inheritedCount: number;
  applicationPoints: string[];
};
export type ApplicableReferences = {
  equipment: string[];
  recipes: string[];
  parameters: string[];
  materials: string[];
  resources: string[];
};
export type ExperimentScopeRange = {
  runId: string;
  startOperationId: string;
  endOperationId: string;
  operationIds: string[];
  subjectIds: string[];
};
export function selectOperationRange(
  operations: WorkspaceOperation[],
  start: string,
  end: string,
) {
  const a = operations.findIndex((op) => op.id === start),
    b = operations.findIndex((op) => op.id === end);
  if (a < 0 || b < 0) throw new Error('Unknown Operation reference');
  return operations
    .slice(Math.min(a, b), Math.max(a, b) + 1)
    .map((op) => op.id);
}
export function confirmExperimentScope(
  model: ExperimentWorkspaceModel,
  start: string,
  end: string,
  subjectIds: string[],
  availableIds: string[],
): ExperimentScopeRange {
  if (
    !subjectIds.length ||
    new Set(subjectIds).size !== subjectIds.length ||
    subjectIds.some((id) => !availableIds.includes(id))
  )
    throw new Error('Select valid experimental subjects');
  const operationIds = selectOperationRange(model.operations, start, end);
  return {
    runId: model.snapshot.id,
    startOperationId: operationIds[0],
    endOperationId: operationIds.at(-1)!,
    operationIds,
    subjectIds: [...subjectIds],
  };
}
export function scopeContains(model: ExperimentWorkspaceModel, id: string) {
  return (
    model.scopeRanges?.some((range) => range.operationIds.includes(id)) ?? true
  );
}
export function isFocusOperation(model: ExperimentWorkspaceModel, id: string) {
  const op = model.operations.find((op) => op.id === id);
  return (
    scopeContains(model, id) &&
    !!op &&
    (model.manualFocus?.includes(id) ||
      op.role === 'MEASUREMENT' ||
      model.snapshot.assignments.some(
        (a) => a.processStepId === id && a.intentRole === 'VARIED',
      ))
  );
}
export type ExperimentWorkspaceModel = {
  /** Projection-only: new persisted Studies display only explicitly authored assignments. */
  explicitAssignments?: boolean;
  scopeRanges?: ExperimentScopeRange[];
  manualFocus?: string[];
  snapshot: RunPlanningSnapshot;
  operations: WorkspaceOperation[];
  subjects: SubjectRef[];
  variationPoints: Array<{ operationId: string; labels: string[] }>;
  configurationRepository: ConfigurationRegistrySource;
};

export function applicableReferences(
  model: ExperimentWorkspaceModel,
  operation: WorkspaceOperation,
): ApplicableReferences {
  return referenceProjectionForOperation(
    operation,
    model.snapshot.configurationPackageVersionId,
    model.configurationRepository,
  );
}
export function createExperimentWorkspace(
  snapshot: RunPlanningSnapshot,
  configurationRepository: ConfigurationRegistrySource,
): ExperimentWorkspaceModel {
  const operations: WorkspaceOperation[] = snapshot.steps.every((step) => step.context)
    ? snapshot.steps.map((step, index) => {
      const context = step.context!;
      return { id: step.id, sequence: (index + 1) * 10, name: step.label, shortName: step.label,
        role: step.role, operationDefinitionRevisionId: step.operationDefinitionId,
        areaDefinitionRevisionId: context.areaDefinitionRevisionId, equipmentReferenceId: context.equipmentReferenceId,
        moduleReferenceId: context.moduleReferenceId, area: context.areaLabel, equipment: context.equipmentLabel,
        module: context.moduleLabel, recipe: snapshot.assignments.find((x) => x.processStepId === step.id && x.kind === 'RECIPE')?.value ?? '—',
        inheritedCount: snapshot.assignments.filter((x) => x.processStepId === step.id).length,
        focus: false, applicationPoints: [] };
    }) : workspaceOperationsForPackage(snapshot.configurationPackageVersionId);
  const variationPoints = operations
    .map((operation) => ({
      operationId: operation.id,
      labels: snapshot.assignments
        .filter(
          (a) => a.processStepId === operation.id && a.intentRole === 'VARIED',
        )
        .map((a) => a.label),
    }))
    .filter(
      (point) =>
        point.labels.length ||
        operations.find((op) => op.id === point.operationId)?.role ===
          'MEASUREMENT',
    );
  const subjects = structuredClone(snapshot.subjects);
  return { snapshot, operations, subjects, variationPoints, configurationRepository };
}
export function initialSelection(
  model: ExperimentWorkspaceModel,
): WorkspaceSelection {
  return {
    operationId:
      model.operations.find((op) => isFocusOperation(model, op.id))?.id ??
      model.operations[0].id,
    subjectId: model.subjects[0]?.id ?? null,
    view: 'TABLE',
    scope: 'EXPERIMENT_FOCUS',
    resolution: 'SUBJECT',
    density: 'COMPACT',
  };
}
export function visibleOperations(
  model: ExperimentWorkspaceModel,
  scope: WorkspaceScope,
) {
  return scope === 'FULL_HISTORY'
    ? model.operations
    : model.operations.filter((op) =>
        scope === 'EXPERIMENT_FOCUS'
          ? isFocusOperation(model, op.id)
          : scopeContains(model, op.id),
      );
}
export function operationAssignments(
  model: ExperimentWorkspaceModel,
  operationId: string,
  subjectId: string | null,
) {
  const all = model.snapshot.assignments.filter(
    (a) => a.processStepId === operationId,
  );
  return subjectId
    ? Object.values(effectiveAssignments(model.snapshot, subjectId)).filter(
        (a) => a.processStepId === operationId,
      )
    : all.filter((a) => !a.subjectId);
}
export function collapseCommon(values: string[]) {
  const unique = [...new Set(values)];
  return unique.length === 1 ? `Common: ${unique[0]}` : unique.join(' / ');
}
export function sequenceAssignments(
  subjectIds: string[],
  start: number,
  end: number,
  step: number,
) {
  if (![start, end, step].every(Number.isFinite) || step === 0)
    throw new Error('Sequence requires finite values and a non-zero step');
  return Object.fromEntries(
    subjectIds.map((id, index) => [
      id,
      String(
        Number(
          (step > 0
            ? Math.min(start + index * step, end)
            : Math.max(start + index * step, end)
          ).toFixed(8),
        ),
      ),
    ]),
  );
}
export function groupAssignments(
  groups: Array<{ subjectIds: string[]; value: string }>,
) {
  return Object.fromEntries(
    groups.flatMap((group) => group.subjectIds.map((id) => [id, group.value])),
  );
}
export function applyVariableAssignments(
  snapshot: RunPlanningSnapshot,
  base: SetupAssignment,
  values: Record<string, string>,
) {
  return {
    ...snapshot,
    assignments: [
      ...snapshot.assignments.filter(
        (a) =>
          !(
            a.subjectId &&
            a.processStepId === base.processStepId &&
            a.kind === base.kind &&
            a.label === base.label &&
            !a.positionId
          ),
      ),
      ...Object.entries(values).map(([subjectId, value], index) => ({
        ...base,
        id: `${base.id}-composed-${index}`,
        subjectId,
        value,
        provenance: 'AD_HOC' as const,
      })),
    ],
  };
}
