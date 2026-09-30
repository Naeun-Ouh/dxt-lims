import {
  runPlanningScenarios,
  type MeasurementPlanItem,
  type PlanningIntent,
  type RunPlanningSnapshot,
  type SetupKind,
} from '@/src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import {
  resolvedVariableDefinitions,
} from '@/src/features/run-registration/variable-model';
import { validateVariableValue, type ApplicableVariableDefinition } from '@/src/features/run-registration/applicability';
import type { SeriesSlug } from './run-entry-model';
import { materialRunPlanningSnapshot } from '@/src/features/material-rd/material-rd-scenario';
import { resolveConfigurationApplicability, type ConfigurationRegistrySource } from '@/src/domain/reference';

export type StudySetupItem = {
  id: string;
  operationId: string;
  definitionRevisionId: string;
  label: string;
  kind: SetupKind;
  referenceId: string;
  value: string;
  intentRole: PlanningIntent;
  editor: ApplicableVariableDefinition['editor'];
  unit: string;
  grain: 'SUBJECT';
  options: ApplicableVariableDefinition['options'];
  applicabilityId: string;
};

export type StudySetupOperation = {
  context?: RunPlanningSnapshot['steps'][number]['context'];
  id: string;
  label: string;
  operationDefinitionRevisionId: string;
  role: 'PROCESS' | 'MEASUREMENT';
  measurementPoint: RunPlanningSnapshot['steps'][number]['measurementPoint'];
  items: StudySetupItem[];
  measurements: MeasurementPlanItem[];
};

export type StudySetupSnapshot = {
  seriesSlug: SeriesSlug;
  seriesId: string;
  configurationPackageVersionId: string;
  experimentTypeProfileVersionId: string;
  subjectTypeRevisionId: string;
  area: RunPlanningSnapshot['area'];
  revision: number;
  updatedAt: string;
  operations: StudySetupOperation[];
};

const sourceFor = (seriesSlug: SeriesSlug) =>
  ({
    'dts-improvement': runPlanningScenarios.PHOTO,
    'cmp-stability': runPlanningScenarios.CMP,
    'adhesion-material-optimization': materialRunPlanningSnapshot,
  })[seriesSlug];

function toStudyItem(
  operationId: string,
  definition: ApplicableVariableDefinition,
): StudySetupItem {
  return {
    id: `${operationId}:${definition.applicabilityId}`,
    operationId,
    definitionRevisionId: definition.id,
    label: definition.label,
    kind: definition.assignmentKind,
    referenceId: definition.assignmentReferenceId,
    value: definition.defaultValue,
    intentRole: definition.defaultRole,
    editor: definition.editor,
    unit: definition.unit ?? '',
    grain: 'SUBJECT',
    options: definition.options,
    applicabilityId: definition.applicabilityId,
  };
}

export function resolvedStudySetupItems(
  setup: Pick<StudySetupSnapshot, 'seriesSlug' | 'configurationPackageVersionId'> & Partial<StudySetupSnapshot>,
  operationId: string,
  repository: ConfigurationRegistrySource,
) {
  const operation=setup.operations?.find(item=>item.id===operationId);
  if(operation?.context && setup.subjectTypeRevisionId && setup.experimentTypeProfileVersionId) {
    if(operation.role==='MEASUREMENT')return [];
    return resolveConfigurationApplicability(repository,{configurationPackageVersionId:setup.configurationPackageVersionId,operationDefinitionRevisionId:operation.operationDefinitionRevisionId,areaDefinitionRevisionId:operation.context.areaDefinitionRevisionId,subjectTypeRevisionId:setup.subjectTypeRevisionId,requestedGrainRevisionId:'grain-subject-r1',equipmentReferenceId:operation.context.equipmentReferenceId,moduleReferenceId:operation.context.moduleReferenceId??undefined,experimentTypeProfileVersionId:setup.experimentTypeProfileVersionId}).map(resolved=>toStudyItem(operationId,{id:resolved.revisionId,label:resolved.label,editor:resolved.editorKey as ApplicableVariableDefinition['editor'],unit:resolved.unit,options:resolved.allowedOptions,allowedGrains:['SUBJECT'],applicabilityId:resolved.applicabilityRuleId,assignmentKind:resolved.assignmentKind,assignmentReferenceId:resolved.assignmentReferenceRevisionId,defaultValue:resolved.defaultValue,defaultGrain:'SUBJECT',defaultRole:resolved.defaultRole}));
  }
  const source = structuredClone(sourceFor(setup.seriesSlug));
  source.configurationPackageVersionId = setup.configurationPackageVersionId;
  const workspace = createExperimentWorkspace(source, repository);
  return resolvedVariableDefinitions(workspace, operationId).map((definition) =>
    toStudyItem(operationId, definition),
  );
}

export function createInitialStudySetup(
  seriesSlug: SeriesSlug,
  repository: ConfigurationRegistrySource,
): StudySetupSnapshot {
  const source = sourceFor(seriesSlug);
  const workspace = createExperimentWorkspace(source, repository);
  return {
    seriesSlug,
    seriesId: source.series.id,
    configurationPackageVersionId: source.configurationPackageVersionId,
    experimentTypeProfileVersionId: source.experimentTypeProfileVersionId,
    subjectTypeRevisionId: source.subjectTypeRevisionId,
    area: source.area,
    revision: 1,
    updatedAt: '2026-09-13',
    operations: workspace.operations
      .filter((operation) =>
        source.steps.some((step) => step.id === operation.id),
      )
      .map((operation) => {
      const step = source.steps.find((candidate) => candidate.id === operation.id)!;
      return {
        id: operation.id,
        label: operation.name,
        operationDefinitionRevisionId: operation.operationDefinitionRevisionId,
        role: operation.role,
        measurementPoint: step.measurementPoint,
        items:
          operation.role === 'PROCESS'
            ? resolvedVariableDefinitions(workspace, operation.id).map(
                (definition) => toStudyItem(operation.id, definition),
              )
            : [],
        measurements: source.measurements.filter(
          (measurement) => measurement.stepId === operation.id,
        ),
      };
      }),
  };
}

export function validateStudySetupItem(item: StudySetupItem, value: string) {
  return validateVariableValue(
    {
      id: item.definitionRevisionId,
      label: item.label,
      editor: item.editor,
      unit: item.unit,
      options: item.options,
      allowedGrains: ['SUBJECT'],
      applicabilityId: item.applicabilityId,
      assignmentKind: item.kind,
      assignmentReferenceId: item.referenceId,
      defaultValue: item.value,
      defaultGrain: 'SUBJECT',
      defaultRole: item.intentRole,
    },
    value,
  );
}

export function updateStudySetupItem(
  setup: StudySetupSnapshot,
  itemId: string,
  value: string,
) {
  const item = setup.operations.flatMap((operation) => operation.items).find(
    (candidate) => candidate.id === itemId,
  );
  if (!item) throw new Error(`Unknown Study Setup item: ${itemId}`);
  validateStudySetupItem(item, value);
  return {
    ...structuredClone(setup),
    revision: setup.revision + 1,
    updatedAt: '2026-09-13',
    operations: setup.operations.map((operation) => ({
      ...operation,
      items: operation.items.map((candidate) =>
        candidate.id === itemId ? { ...candidate, value } : candidate,
      ),
    })),
  };
}

export function addStudySetupItem(
  setup: StudySetupSnapshot,
  operationId: string,
  item: StudySetupItem,
  repository: ConfigurationRegistrySource,
) {
  const applicable = resolvedStudySetupItems(setup, operationId, repository);
  if (!applicable.some((candidate) => candidate.id === item.id))
    throw new Error(`${item.label} is not applicable to this Operation context.`);
  return {
    ...structuredClone(setup),
    revision: setup.revision + 1,
    updatedAt: '2026-09-13',
    operations: setup.operations.map((operation) =>
      operation.id !== operationId || operation.items.some((row) => row.id === item.id)
        ? operation
        : { ...operation, items: [...operation.items, item] },
    ),
  };
}

export function removeStudySetupItem(
  setup: StudySetupSnapshot,
  itemId: string,
) {
  return {
    ...structuredClone(setup),
    revision: setup.revision + 1,
    updatedAt: '2026-09-13',
    operations: setup.operations.map((operation) => ({
      ...operation,
      items: operation.items.filter((item) => item.id !== itemId),
    })),
  };
}

export function materializeStudySetupSnapshot(
  setup: StudySetupSnapshot,
  context?: RunPlanningSnapshot,
): RunPlanningSnapshot {
  const source = structuredClone(context ?? sourceFor(setup.seriesSlug));
  const operationIds = new Set(setup.operations.map((operation) => operation.id));
  return {
    ...source,
    configurationPackageVersionId: setup.configurationPackageVersionId,
    experimentTypeProfileVersionId: setup.experimentTypeProfileVersionId,
    subjectTypeRevisionId: setup.subjectTypeRevisionId,
    steps: context ? setup.operations.map((op) => ({ id: op.id, label: op.label,
      operationDefinitionId: op.operationDefinitionRevisionId, role: op.role, measurementPoint: op.measurementPoint, context: op.context }))
      : source.steps.filter((step) => operationIds.has(step.id)),
    assignments: setup.operations.flatMap((operation) =>
      operation.items.map((item, index) => ({
        id: `${setup.seriesId}-default-${operation.id}-${index + 1}`,
        kind: item.kind,
        label: item.label,
        value: item.value,
        referenceId: item.referenceId,
        processStepId: operation.id,
        subjectId: null,
        positionId: null,
        intentRole: item.intentRole,
        provenance: 'SERIES_DEFAULT' as const,
      })),
    ),
    measurements: setup.operations.flatMap((operation) => operation.measurements),
    provenance: {
      kind: 'SERIES_DEFAULT',
      label: `Study Default revision ${setup.revision}`,
      sourceId: `${setup.seriesId}-default-r${setup.revision}`,
    },
  };
}

export function definitionAvailableInPinnedPackage(item: StudySetupItem, repository: ConfigurationRegistrySource) {
  return repository
    .getConfigurationRegistry()
    .packages.some((pkg) => pkg.definitionRevisionIds.includes(item.definitionRevisionId));
}

export function studyObservationGrainLabel(setup: StudySetupSnapshot, repository: ConfigurationRegistrySource) {
  const registry = repository.getConfigurationRegistry();
  const subject = registry.subjectTypes.find((item) => item.id === setup.subjectTypeRevisionId);
  const grains = subject?.observationGrainRevisionIds
    .map((id) => registry.grains.find((grain) => grain.id === id)?.label)
    .filter((label): label is string => Boolean(label)) ?? [];
  return grains.join(' / ') || 'Subject';
}

export function studySubjectLabel(setup: StudySetupSnapshot, repository: ConfigurationRegistrySource) {
  return repository
    .getConfigurationRegistry()
    .subjectTypes.find((item) => item.id === setup.subjectTypeRevisionId)?.label ?? 'Subject';
}

/** Explicit package adoption preserves exact definitions and Study-owned values. */
export function selectStudyReferenceSet(setup: StudySetupSnapshot, packageVersionId: string, repository: ConfigurationRegistrySource): StudySetupSnapshot {
  const next = { ...setup, configurationPackageVersionId: packageVersionId, revision: setup.revision + 1, updatedAt: new Date().toISOString() };
  return { ...next, operations: next.operations.map(operation => {
    const applicable = resolvedStudySetupItems(next, operation.id, repository);
    return { ...operation, items: operation.items.map(item => {
      const match = applicable.find(candidate => candidate.definitionRevisionId === item.definitionRevisionId && candidate.referenceId === item.referenceId && candidate.kind === item.kind);
      if (!match) throw new Error(`${item.label} is not applicable in the selected exact Reference Set.`);
      validateStudySetupItem(match, item.value);
      return { ...item, id: match.id, applicabilityId: match.applicabilityId };
    }) };
  }) };
}
