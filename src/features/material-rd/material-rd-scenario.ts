import { decisionSchema } from '@/src/domain/decision';
import type { SubjectRef } from '@/src/domain/experiment/subject';
import {
  createNextFormulationRevision,
  formulationDefinitionSchema,
  formulationUsageSchema,
  rawMaterialSchema,
  releaseFormulationRevision,
} from '@/src/domain/material';
import { subjectMeasurementResultSetSchema } from '@/src/domain/measurement/subject-measurement';
import type { ExperimentSeries } from '@/src/domain/experiment';
import type { ActualExecutionEvidence } from '@/src/features/run-registration/actual-execution-model';
import { plannedExecutionIdentity } from '@/src/features/run-registration/actual-execution-model';
import type { EngineerEvaluationRecord, EvaluationTargetBinding } from '@/src/features/run-registration/evaluation-grid-model';
import { effectiveAssignments, type RunPlanningSnapshot, type SetupAssignment } from '@/src/features/run-registration/planning-model';
import { createNextRunPreview } from '@/src/features/run-registration/decision-continuation-model';

export const specimenSubjects: SubjectRef[] = [1, 2, 3, 4].map((index) => ({
  id: `SP-${String(index).padStart(2, '0')}`,
  type: 'SPECIMEN',
  displayLabel: `SP-${String(index).padStart(2, '0')}`,
}));

export const formulationRawMaterials = [
  ['raw-material-a', 'MAT-A', 'Material A'],
  ['raw-material-b', 'MAT-B', 'Material B'],
  ['raw-material-additive-c', 'ADD-C', 'Additive C'],
  ['raw-material-d', 'MAT-D', 'Material D'],
].map(([id, code, name]) =>
  rawMaterialSchema.parse({ id, code, name, status: 'ACTIVE' }),
);
export const formulationDefinition = formulationDefinitionSchema.parse({
  id: 'formulation-f-base-01',
  code: 'F-BASE-01',
  name: 'Base Adhesion Formulation',
  status: 'ACTIVE',
});
export const formulationRevision1 = releaseFormulationRevision({
  id: 'formulation-f-base-01-r1',
  formulationDefinitionId: formulationDefinition.id,
  revision: 1,
  status: 'RELEASED',
  createdAt: '2026-09-01T09:00:00+09:00',
  components: [
    { rawMaterialRef: 'raw-material-a', amount: 60, unit: 'wt%', sequence: 0, role: 'BASE' },
    { rawMaterialRef: 'raw-material-b', amount: 30, unit: 'wt%', sequence: 1, role: 'BINDER' },
    { rawMaterialRef: 'raw-material-additive-c', amount: 10, unit: 'wt%', sequence: 2, role: 'ADDITIVE' },
  ],
});
export const formulationRevision2 = createNextFormulationRevision(
  formulationRevision1,
  {
    id: 'formulation-f-base-01-r2',
    createdAt: '2026-09-14T09:00:00+09:00',
    components: [
      { rawMaterialRef: 'raw-material-a', amount: 55, unit: 'wt%', sequence: 0, role: 'BASE' },
      { rawMaterialRef: 'raw-material-b', amount: 35, unit: 'wt%', sequence: 1, role: 'BINDER' },
      { rawMaterialRef: 'raw-material-additive-c', amount: 10, unit: 'wt%', sequence: 2, role: 'ADDITIVE' },
    ],
  },
);

const common = (
  id: string, kind: SetupAssignment['kind'], label: string, value: string,
  referenceId: string, processStepId: string, intentRole: SetupAssignment['intentRole'] = 'FIXED',
): SetupAssignment => ({
  id, kind, label, value, referenceId, processStepId, subjectId: null,
  positionId: null, intentRole, provenance: 'SERIES_DEFAULT',
});

const materialSteps = [
  { id: 'material-mix', label: 'Mix', operationDefinitionId: 'operation-material-mix-v1', role: 'PROCESS' as const, measurementPoint: null },
  { id: 'material-coat', label: 'Coat', operationDefinitionId: 'operation-material-coat-v1', role: 'PROCESS' as const, measurementPoint: null },
  { id: 'material-cure', label: 'Cure', operationDefinitionId: 'operation-material-cure-v1', role: 'PROCESS' as const, measurementPoint: null },
  { id: 'material-test', label: 'Test', operationDefinitionId: 'measurement-operation-material-test-v1', role: 'MEASUREMENT' as const, measurementPoint: 'FINAL' as const },
];
const cureTemperature = common('material-cure-temperature', 'CONDITION', 'Cure Temperature', '120', 'condition-cure-temperature-v1', 'material-cure', 'VARIED');

export const materialRunPlanningSnapshot: RunPlanningSnapshot = {
  id: 'run-material-3',
  configurationPackageVersionId: 'config-package-material-rd-v1',
  experimentTypeProfileVersionId: 'experiment-profile-material-rd-v1',
  subjectTypeRevisionId: 'subject-specimen-r1',
  series: { id: 'series-adhesion-material-optimization', name: 'Adhesion Material Optimization' },
  runNumber: 3,
  name: 'Cure temperature response',
  experimentType: 'Material Experiment',
  area: 'MATERIAL_RND',
  workspaceContextLabel: 'MATERIAL R&D',
  createdAt: '2026-09-13',
  intent: 'Optimize formulation and process conditions to improve adhesion performance.',
  provenance: { kind: 'SERIES_DEFAULT', label: 'Study Default revision 1', sourceId: 'series-adhesion-material-optimization-default-r1' },
  subjects: specimenSubjects,
  steps: materialSteps,
  subjectOperationIds: Object.fromEntries(specimenSubjects.map((subject) => [subject.id, materialSteps.map((step) => step.id)])),
  assignments: [
    common('material-formulation', 'MATERIAL', 'Formulation', 'F-BASE-01', formulationRevision1.id, 'material-mix'),
    common('material-mixing-speed', 'CONDITION', 'Mixing Speed', '500', 'condition-mixing-speed-v1', 'material-mix'),
    common('material-coating-thickness', 'CONDITION', 'Coating Thickness', '20', 'condition-coating-thickness-v1', 'material-coat'),
    cureTemperature,
    common('material-cure-time', 'CONDITION', 'Cure Time', '30', 'condition-cure-time-v1', 'material-cure'),
    ...specimenSubjects.map((subject, index) => ({
      ...cureTemperature,
      id: `material-cure-temperature-${subject.id}`,
      value: String(110 + index * 10),
      subjectId: subject.id,
      provenance: 'AD_HOC' as const,
    })),
  ],
  measurements: [{
    id: 'material-test-plan', stepId: 'material-test',
    measurementOperationDefinitionId: 'measurement-operation-material-test-v1',
    operation: 'Test',
    parameterDefinitionIds: ['parameter-peel-force-v1', 'parameter-specimen-viscosity-v1'],
    parameters: ['Peel Force', 'Viscosity'], point: 'FINAL',
  }],
  delta: { sourceLabel: 'Study Default', items: [{
    id: 'delta-material-cure-temperature', kind: 'CONDITION', label: 'Cure Temperature',
    change: 'CHANGED', before: '120 °C', after: '110 / 120 / 130 / 140 °C',
  }], unchangedCount: 4 },
};

export const formulationUsageRun3 = formulationUsageSchema.parse({
  id: 'formulation-usage-run-material-3',
  formulationRevisionId: formulationRevision1.id,
  experimentRunId: materialRunPlanningSnapshot.id,
  subjectId: null,
  operationId: 'material-mix',
  intentRole: 'FIXED',
  role: 'Candidate',
});

export const materialRun4PlanningSnapshot: RunPlanningSnapshot = {
  ...structuredClone(materialRunPlanningSnapshot),
  id: 'run-material-4',
  runNumber: 4,
  provenance: {
    kind: 'SERIES_DEFAULT',
    label: 'Study Default revision 2',
    sourceId: 'series-adhesion-material-optimization-default-r2',
  },
  assignments: materialRunPlanningSnapshot.assignments.map((assignment) =>
    assignment.id === 'material-formulation'
      ? { ...assignment, referenceId: formulationRevision2.id }
      : structuredClone(assignment),
  ),
};
export const formulationUsageRun4 = formulationUsageSchema.parse({
  ...formulationUsageRun3,
  id: 'formulation-usage-run-material-4',
  formulationRevisionId: formulationRevision2.id,
  experimentRunId: materialRun4PlanningSnapshot.id,
});

const materialEquipmentByStep = {
  'material-mix': 'Manual Bench', 'material-coat': 'Coating Bench',
  'material-cure': 'Cure Oven', 'material-test': 'Test Stand',
} as const;
export const materialActualExecution: ActualExecutionEvidence[] = specimenSubjects.flatMap((subject, subjectIndex) =>
  materialSteps.map((step, stepIndex) => ({
    event: {
      id: `execution-material-${subject.id}-${step.id}`,
      experimentRunId: materialRunPlanningSnapshot.id,
      processStepId: step.id,
      plannedExecutionItemId: plannedExecutionIdentity(materialRunPlanningSnapshot.id, subject.id, step.id),
      observedOperation: step.label,
      observedRecipe: 'Not applicable',
      equipment: materialEquipmentByStep[step.id as keyof typeof materialEquipmentByStep],
      startedAt: `2026-09-13T${String(8 + stepIndex).padStart(2, '0')}:0${subjectIndex}:00+09:00`,
      endedAt: `2026-09-13T${String(8 + stepIndex).padStart(2, '0')}:2${subjectIndex}:00+09:00`,
      executionStatus: 'COMPLETED' as const,
      sourceSystem: 'MANUAL',
      sourceRecordReference: `LAB-NOTE-R03-${subject.id}-${step.label.toUpperCase()}`,
    },
    identityContext: null,
    resolvedSubjectId: subject.id,
    observedValues: Object.values(effectiveAssignments(materialRunPlanningSnapshot, subject.id))
      .filter((assignment) => assignment.processStepId === step.id)
      .map((assignment) => ({
        definitionId: assignment.label === 'Formulation' ? 'material-formulation-usage-v1' : assignment.referenceId,
        value: assignment.value,
      })),
    retrievedAt: '2026-09-13T15:00:00+09:00',
  })),
);

const peel = [18.2, 20.6, 23.8, 24.1];
const viscosity = [920, 915, 908, 905];
const executions = specimenSubjects.map((subject, index) => ({
  id: `measurement-execution-material-${index + 1}`,
  experimentRunId: materialRunPlanningSnapshot.id,
  subjectIds: [subject.id],
  measurementOperationDefinitionId: 'measurement-operation-material-test-v1',
  measurementPoint: 'FINAL' as const, sequence: index + 1,
  startedAt: `2026-09-13T13:${index}0:00+09:00`, completedAt: `2026-09-13T13:${index}8:00+09:00`,
  acquisitionMethod: 'MANUAL' as const, sourceSystem: 'Manual Lab Entry',
  sourceRecordReference: `LAB-MEAS-R03-${subject.id}`,
}));
const datasets = specimenSubjects.map((subject, index) => ({
  id: `dataset-material-${index + 1}`, experimentRunId: materialRunPlanningSnapshot.id,
  plannedExecutionItemId: `planned-measurement:${materialRunPlanningSnapshot.id}:${subject.id}:material-test`,
  executionEventId: `execution-material-${subject.id}-material-test`,
  measurementExecutionId: executions[index].id,
  measurementOperationDefinitionId: 'measurement-operation-material-test-v1',
  equipmentReference: 'Manual Test Stand', measurementPoint: 'FINAL' as const,
  sourceSystem: 'Manual Lab Entry', collectedAt: executions[index].completedAt,
  status: 'COLLECTED' as const,
}));
const values = specimenSubjects.flatMap((subject, index) => [
  { parameterDefinitionId: 'parameter-peel-force-v1', unitDefinitionId: 'unit-n', number: peel[index], suffix: 'peel' },
  { parameterDefinitionId: 'parameter-specimen-viscosity-v1', unitDefinitionId: 'unit-cp', number: viscosity[index], suffix: 'viscosity' },
].map((seed) => ({
  id: `measurement-material-${seed.suffix}-${index + 1}`, datasetId: datasets[index].id,
  subjectId: subject.id, physicalSubjectId: null,
  parameterDefinitionId: seed.parameterDefinitionId,
  value: { dataType: 'NUMBER' as const, value: seed.number }, unitDefinitionId: seed.unitDefinitionId,
  granularity: 'SUBJECT' as const, siteIdentity: null, coordinateValues: [],
  observedAt: datasets[index].collectedAt, sourceParameterReference: seed.parameterDefinitionId,
  acquisitionMethod: 'MANUAL' as const,
})));
const summaries = values.map((value) => ({
  id: value.id.replace('measurement-', 'summary-'), datasetId: value.datasetId,
  subjectId: value.subjectId, parameterDefinitionId: value.parameterDefinitionId!,
  aggregationMethod: 'MEAN' as const, value: value.value, unitDefinitionId: value.unitDefinitionId,
  sourceMeasurementIds: [value.id], summaryOrigin: 'DXT_CALCULATED' as const,
  rawInputCount: 1, effectiveInputCount: 1,
}));

export const materialMeasurementResults = subjectMeasurementResultSetSchema.parse({
  executions, datasets, values, summaries, validityDecisions: [],
});

const peelTarget = {
  id: 'target-material-peel-force', parameterDefinitionId: 'parameter-peel-force-v1',
  operator: 'GTE', threshold: 22, lowerBound: null, upperBound: null, unitDefinitionId: 'unit-n',
} satisfies ExperimentSeries['targets'][number];
export const materialEvaluationTargetBindings: EvaluationTargetBinding[] = [{
  target: peelTarget, measurementPoint: 'FINAL', resultGrain: 'SUBJECT_SUMMARY', aggregationMethod: 'MEAN',
}];
export const materialEngineerEvaluations: EngineerEvaluationRecord[] = specimenSubjects.map((subject, index) => ({
  id: `evaluation-material-${subject.id}`, runId: materialRunPlanningSnapshot.id,
  subjectId: subject.id, seriesTargetId: peelTarget.id,
  measurementSummaryId: `summary-material-peel-${index + 1}`,
  disposition: peel[index] >= 22 ? 'ACCEPT' : 'INFORMATIVE',
  comment: peel[index] >= 22 ? 'Peel force achieved the configured target.' : 'Retain for comparison with the higher cure-temperature specimens.',
  evaluator: 'Kim Jiwon', evaluatedAt: `2026-09-13T15:${index}0:00+09:00`,
}));

const decision = decisionSchema.parse({
  id: 'decision-material-run-3', experimentRunId: materialRunPlanningSnapshot.id,
  evaluations: [{ evaluationDefinitionId: 'evaluation-relative-v1', value: { dataType: 'SELECT', value: 'BETTER' } }],
  criterionAssessments: [],
  conclusion: 'Higher cure temperature improved adhesion but requires follow-up.',
  reason: 'Confirm the response near 130–140 °C while preserving formulation and cure time.',
  nextAction: { nextActionTypeDefinitionId: 'next-action-design-next', note: 'Create the next Run with a narrower cure-temperature range.' },
  recordedBy: 'Kim Jiwon', recordedAt: '2026-09-13T16:00:00+09:00',
});
const nextRunChanges = specimenSubjects.map((subject, index) => ({
  assignmentId: `material-cure-temperature-${subject.id}`, after: String(125 + index * 5),
}));
export const materialDecisionContext = {
  context: {
    decision, decisionStatement: 'Continue with a focused cure-temperature confirmation',
    engineerEvaluationIds: materialEngineerEvaluations.map((item) => item.id),
    targetAchievementReferences: [{ seriesTargetId: peelTarget.id, measurementSummaryId: 'summary-material-peel-4', status: 'ACHIEVED' as const }],
    targetScope: { subjectIds: specimenSubjects.map((subject) => subject.id), operationIds: ['material-cure', 'material-test'] },
    siteScopeLabel: null, destinationRunId: 'run-material-4',
  },
  nextRunPreview: createNextRunPreview(materialRunPlanningSnapshot, 'run-material-4', nextRunChanges),
};
