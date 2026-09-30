import type {
  PlanningIntent,
  SetupAssignment,
  SetupKind,
} from './planning-model';

export type AssignmentGrain =
  | 'OPERATION'
  | 'RUN'
  | 'LOT'
  | 'SUBJECT'
  | 'SITE'
  | 'POSITION';
export type VariableEditor =
  | 'NUMBER'
  | 'TEXT'
  | 'BOOLEAN'
  | 'SELECT'
  | 'REFERENCE';
export type VariableOption = {
  value: string;
  label: string;
  referenceId?: string;
};

export type ExperimentDefinition = {
  id: string;
  label: string;
  editor: VariableEditor;
  unit?: string;
  options?: VariableOption[];
  allowedGrains: AssignmentGrain[];
};

export type ApplicableVariableDefinition = ExperimentDefinition & {
  applicabilityId: string;
  assignmentKind: SetupKind;
  assignmentReferenceId: string;
  defaultValue: string;
  defaultGrain: AssignmentGrain;
  defaultRole: PlanningIntent;
  options: VariableOption[];
};

export function definitionAssignment(
  definition: ApplicableVariableDefinition,
  processStepId: string,
): SetupAssignment {
  return {
    id: `${processStepId}-${definition.applicabilityId}`,
    kind: definition.assignmentKind,
    label: definition.label,
    value: definition.defaultValue,
    referenceId: definition.assignmentReferenceId,
    processStepId,
    subjectId: null,
    positionId: null,
    intentRole: definition.defaultRole,
    provenance: 'AD_HOC',
  };
}

export function effectiveVariableRole(
  definition: ApplicableVariableDefinition,
  explicit?: PlanningIntent,
): PlanningIntent {
  return explicit ?? definition.defaultRole ?? 'FIXED';
}

// VALIDATION: values remain strings in the compatibility snapshot, but are checked by metadata.
export function validateVariableValue(
  definition: ApplicableVariableDefinition,
  value: string,
  grain = definition.defaultGrain,
): string {
  if (!definition.allowedGrains.includes(grain))
    throw new Error(`${definition.label} cannot be assigned at ${grain} grain`);
  if (definition.editor === 'NUMBER') {
    const numeric = Number(value.trim().split(/\s+/)[0]);
    if (!value.trim() || !Number.isFinite(numeric))
      throw new Error(`${definition.label} requires a numeric value`);
  }
  if (definition.editor === 'BOOLEAN' && !['true', 'false'].includes(value))
    throw new Error(`${definition.label} requires a boolean value`);
  if (
    ['SELECT', 'REFERENCE'].includes(definition.editor) &&
    definition.options.length &&
    !definition.options.some((option) => option.value === value)
  )
    throw new Error(
      `${definition.label} requires a configured reference value`,
    );
  return value;
}

export function validateVariableValues(
  definition: ApplicableVariableDefinition,
  values: Record<string, string>,
  grain = definition.defaultGrain,
) {
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => [
      id,
      validateVariableValue(definition, value, grain),
    ]),
  );
}
