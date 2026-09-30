import { effectiveAssignments, type SetupAssignment } from './planning-model';
import {
  operationAssignments,
  type ExperimentWorkspaceModel,
} from './workspace-model';

export function toggleOperationExpansion(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}
export function matrixVariables(
  model: ExperimentWorkspaceModel,
  operationId: string,
) {
  const operation = model.operations.find((op) => op.id === operationId);
  if (!operation || operation.role === 'MEASUREMENT') return [];
  return operationAssignments(model, operationId, null).filter(
    (a) =>
      !a.positionId &&
      (a.kind !== 'RECIPE' ||
        a.intentRole === 'VARIED' ||
        a.value !== operation.recipe ||
        Object.values(subjectValues(model, a)).some(
          (value) => value !== operation.recipe,
        )),
  );
}
export function subjectValues(
  model: ExperimentWorkspaceModel,
  item: SetupAssignment,
): Record<string, string> {
  return Object.fromEntries(
    model.subjects.map((w) => [
      w.id,
      effectiveAssignments(model.snapshot, w.id)[
        `${item.processStepId}:${item.kind}:${item.label}`
      ]?.value ?? item.value,
    ]),
  );
}
export function commonSubjectValues(
  model: ExperimentWorkspaceModel,
  value: string,
) {
  return Object.fromEntries(model.subjects.map((w) => [w.id, value]));
}
export function changeVariableRole(
  model: ExperimentWorkspaceModel,
  item: SetupAssignment,
  role: SetupAssignment['intentRole'],
) {
  const values = subjectValues(model, item);
  const value = values[model.subjects[0]?.id] ?? item.value;
  return {
    item: {
      ...item,
      intentRole: role,
      value: role === 'FIXED' ? value : item.value,
    },
    values: role === 'FIXED' ? commonSubjectValues(model, value) : values,
  };
}
export function operationExperimentSummary(
  model: ExperimentWorkspaceModel,
  id: string,
) {
  if (model.operations.find((op) => op.id === id)?.role === 'MEASUREMENT')
    return '◎ Measurement';
  const variables = matrixVariables(model, id);
  if (!variables.length) return '';
  const varied = variables.filter((a) => a.intentRole === 'VARIED').length;
  return `${varied ? `◆ ${varied} Varied · ` : ''}${variables.length - varied} Fixed`;
}
export function measurementInlineSummary(
  model: ExperimentWorkspaceModel,
  id: string,
) {
  const plan = model.snapshot.measurements.find((m) => m.stepId === id);
  return {
    measurement: plan
      ? `${plan.point} · ${plan.parameters.join(' / ')}`
      : 'No measurement plan registered',
    subject: model.subjects[0]?.type
      ? `${model.subjects[0].type[0]}${model.subjects[0].type.slice(1).toLowerCase()}`
      : 'Subject',
    resolution: '—',
    acquisition: 'Planning context · not acquired',
  };
}
