import type { SubjectRef } from '@/src/domain/experiment/subject';

export type PlanningIntent = 'FIXED' | 'VARIED';
export type PlanningProvenance =
  | 'SERIES_DEFAULT'
  | 'PREVIOUS_RUN'
  | 'EXISTING_CONFIGURATION'
  | 'AD_HOC';
export type SetupKind = 'RECIPE' | 'CONDITION' | 'MATERIAL' | 'RESOURCE';

export type SetupAssignment = {
  id: string;
  kind: SetupKind;
  label: string;
  value: string;
  referenceId: string;
  processStepId: string | null;
  subjectId: string | null;
  positionId: string | null;
  intentRole: PlanningIntent;
  provenance: PlanningProvenance;
};
export type PlanStep = {
  context?: {
    areaDefinitionRevisionId: string;
    equipmentReferenceId: string;
    moduleReferenceId: string | null;
    areaLabel: string;
    equipmentLabel: string;
    moduleLabel: string;
  };
  id: string;
  label: string;
  operationDefinitionId: string;
  role: 'PROCESS' | 'MEASUREMENT';
  measurementPoint: null | 'PRE' | 'INTERMEDIATE' | 'POST' | 'FINAL' | 'CUSTOM';
};
export type MeasurementPlanItem = {
  id: string;
  stepId: string;
  measurementOperationDefinitionId: string;
  operation: string;
  parameterDefinitionIds: string[];
  parameters: string[];
  point: 'PRE' | 'INTERMEDIATE' | 'POST' | 'FINAL' | 'CUSTOM';
};
export type PlanDelta = {
  id: string;
  kind: SetupKind | 'MEASUREMENT_PLAN';
  label: string;
  change: 'CHANGED' | 'ADDED' | 'REMOVED';
  before: string | null;
  after: string | null;
};
export type RunPlanningSnapshot = {
  id: string;
  configurationPackageVersionId: string;
  experimentTypeProfileVersionId: string;
  subjectTypeRevisionId: string;
  series: { id: string; name: string };
  runNumber: number;
  name: string;
  experimentType: string;
  area: string;
  workspaceContextLabel?: string;
  createdAt: string;
  intent: string;
  provenance: {
    kind: PlanningProvenance;
    label: string;
    sourceId: string | null;
  };
  subjects: SubjectRef[];
  candidateSubjects?: SubjectRef[];
  manufacturingContext?: Array<{ label: string; value: string }>;
  steps: PlanStep[];
  subjectOperationIds: Record<string, string[]>;
  assignments: SetupAssignment[];
  measurements: MeasurementPlanItem[];
  delta: { sourceLabel: string; items: PlanDelta[]; unchangedCount: number };
};

const wafer = (lot: string, slot: number): SubjectRef => ({
  id: `${lot}.${String(slot).padStart(2, '0')}`,
  type: 'WAFER',
  displayLabel: `W${String(slot).padStart(2, '0')}`,
});
const common = (
  area: 'PHOTO' | 'CMP',
  step: string,
  kind: SetupKind,
  label: string,
  value: string,
  referenceId: string,
  intentRole: PlanningIntent = 'FIXED',
): SetupAssignment => ({
  id: `${area}-${step}-${kind}-${label}`.toLowerCase().replaceAll(' ', '-'),
  kind,
  label,
  value,
  referenceId,
  processStepId: step,
  subjectId: null,
  positionId: null,
  intentRole,
  provenance: 'PREVIOUS_RUN',
});
const override = (
  base: SetupAssignment,
  subjectId: string,
  value: string,
  suffix: string,
  positionId: string | null = null,
): SetupAssignment => ({
  ...base,
  id: `${base.id}-${suffix}`,
  value,
  subjectId,
  positionId,
  provenance: 'AD_HOC',
});

const photoWafers = [1, 2, 3, 4].map((n) => wafer('PHO7814', n));
const photoSteps: PlanStep[] = [
  {
    id: 'photo-coat',
    label: 'Coating',
    operationDefinitionId: 'operation-coating-v1',
    role: 'PROCESS',
    measurementPoint: null,
  },
  {
    id: 'photo-exposure',
    label: 'Exposure',
    operationDefinitionId: 'operation-exposure-v1',
    role: 'PROCESS',
    measurementPoint: null,
  },
  {
    id: 'photo-cdsem',
    label: 'CD-SEM',
    operationDefinitionId: 'measurement-operation-cdsem-v1',
    role: 'MEASUREMENT',
    measurementPoint: 'POST',
  },
];
const photoRecipe = common(
  'PHOTO',
  'photo-exposure',
  'RECIPE',
  'Recipe',
  'EXP-R01',
  'recipe-exp-r01-r1',
);
const photoFocus = common(
  'PHOTO',
  'photo-exposure',
  'CONDITION',
  'Focus',
  '0',
  'condition-focus-v1',
);
const photoReticle = common(
  'PHOTO',
  'photo-exposure',
  'RESOURCE',
  'Reticle',
  'RET-01',
  'resource-reticle-01-v1',
);
const photoSample = common(
  'PHOTO',
  'photo-exposure',
  'MATERIAL',
  'Sample',
  'D035 Rev.2',
  'sample-D035-r2',
);
const photoEnergy = common(
  'PHOTO',
  'photo-exposure',
  'CONDITION',
  'Energy',
  '35',
  'condition-energy-v1',
  'VARIED',
);

const cmpWafers = [1, 2, 3, 4].map((n) => wafer('RSA6420', n));
const cmpSteps: PlanStep[] = [
  {
    id: 'cmp-thk-pre',
    label: 'THK',
    operationDefinitionId: 'measurement-operation-thickness-v1',
    role: 'MEASUREMENT',
    measurementPoint: 'PRE',
  },
  {
    id: 'cmp-process',
    label: 'M2 CU CMP',
    operationDefinitionId: 'operation-cmp-v1',
    role: 'PROCESS',
    measurementPoint: null,
  },
  {
    id: 'cmp-thk-post',
    label: 'THK',
    operationDefinitionId: 'measurement-operation-thickness-v1',
    role: 'MEASUREMENT',
    measurementPoint: 'POST',
  },
];
const cmpRecipe = common(
  'CMP',
  'cmp-process',
  'RECIPE',
  'Recipe',
  'CU-R07',
  'recipe-cu-r07-r1',
);
const cmpPressure = common(
  'CMP',
  'cmp-process',
  'CONDITION',
  'Pressure',
  '3.0 psi',
  'condition-pressure-v1',
  'VARIED',
);
const cmpSlurry = common(
  'CMP',
  'cmp-process',
  'RESOURCE',
  'Slurry',
  'A',
  'resource-slurry-a-v1',
  'VARIED',
);
const cmpDisk = common(
  'CMP',
  'cmp-process',
  'RESOURCE',
  'Disk',
  'D1',
  'resource-disk-d1-v1',
);
const cmpPad = common(
  'CMP',
  'cmp-process',
  'RESOURCE',
  'Pad',
  'A',
  'resource-pad-a-v1',
  'VARIED',
);
const cmpSample = common(
  'CMP',
  'cmp-process',
  'MATERIAL',
  'Sample',
  'D035 Rev.2',
  'sample-D035-r2',
);

export const runPlanningScenarios: Record<
  'PHOTO' | 'CMP',
  RunPlanningSnapshot
> = {
  PHOTO: {
    id: 'run-photo-18',
    configurationPackageVersionId: 'config-package-photo-v1',
    experimentTypeProfileVersionId: 'experiment-profile-photo-v1',
    subjectTypeRevisionId: 'subject-wafer-r1',
    series: { id: 'series-dts-improvement', name: 'DTS Improvement' },
    runNumber: 18,
    name: 'Energy window confirmation',
    experimentType: 'Process Experiment',
    area: 'PHOTO',
    createdAt: '2026-09-09',
    intent: 'Increase Energy while maintaining BCD stability.',
    provenance: {
      kind: 'PREVIOUS_RUN',
      label: 'Previous Run #17',
      sourceId: 'run-photo-17',
    },
    subjects: photoWafers,
    candidateSubjects: Array.from({ length: 25 }, (_, index) =>
      wafer('PHO7814', index + 1),
    ),
    manufacturingContext: [{ label: 'Lot', value: 'PHO7814' }],
    steps: photoSteps,
    subjectOperationIds: Object.fromEntries(
      photoWafers.map((w) => [w.id, photoSteps.map((s) => s.id)]),
    ),
    assignments: [
      photoRecipe,
      photoFocus,
      photoReticle,
      photoSample,
      photoEnergy,
      ...photoWafers.map((w, i) =>
        override(photoEnergy, w.id, String(34 + i), `w${i + 1}`),
      ),
      override(photoEnergy, photoWafers[0].id, '34', 'w1-p01', 'P01'),
      override(photoEnergy, photoWafers[0].id, '35', 'w1-p02', 'P02'),
      override(photoEnergy, photoWafers[0].id, '36', 'w1-p03', 'P03'),
    ],
    measurements: [
      {
        id: 'photo-cdsem-plan',
        stepId: 'photo-cdsem',
        measurementOperationDefinitionId: 'measurement-operation-cdsem-v1',
        operation: 'CD-SEM',
        parameterDefinitionIds: ['parameter-bcd-v1', 'parameter-3sig-v1'],
        parameters: ['BCD', '3SIG'],
        point: 'POST',
      },
    ],
    delta: {
      sourceLabel: 'Run #17',
      items: [
        {
          id: 'delta-photo-energy',
          kind: 'CONDITION',
          label: 'Energy range',
          change: 'CHANGED',
          before: '32–35 mJ/cm²',
          after: '34–37 mJ/cm²',
        },
      ],
      unchangedCount: 11,
    },
  },
  CMP: {
    id: 'run-cmp-12',
    configurationPackageVersionId: 'config-package-cmp-v1',
    experimentTypeProfileVersionId: 'experiment-profile-cmp-v1',
    subjectTypeRevisionId: 'subject-wafer-r1',
    series: { id: 'series-cmp-stability', name: 'CMP Stability' },
    runNumber: 12,
    name: 'Pad split stability check',
    experimentType: 'Process Experiment',
    area: 'CMP',
    createdAt: '2026-09-09',
    intent: 'Compare Pad A–D while holding the common CMP setup.',
    provenance: {
      kind: 'SERIES_DEFAULT',
      label: 'Study Default + wafer overrides',
      sourceId: 'series-cmp-stability-default',
    },
    subjects: cmpWafers,
    candidateSubjects: Array.from({ length: 25 }, (_, index) =>
      wafer('RSA6420', index + 1),
    ),
    manufacturingContext: [{ label: 'Lot', value: 'RSA6420' }],
    steps: cmpSteps,
    subjectOperationIds: Object.fromEntries(
      cmpWafers.map((w) => [w.id, cmpSteps.map((s) => s.id)]),
    ),
    assignments: [
      cmpRecipe,
      cmpPressure,
      cmpSlurry,
      cmpDisk,
      cmpPad,
      cmpSample,
      ...cmpWafers.map((w, i) =>
        override(cmpPad, w.id, String.fromCharCode(65 + i), `w${i + 1}`),
      ),
      ...cmpWafers.map((w, i) =>
        override(
          cmpPressure,
          w.id,
          i < 2 ? '3.0 psi' : '3.5 psi',
          `split-w${i + 1}`,
        ),
      ),
      ...cmpWafers.map((w, i) =>
        override(cmpSlurry, w.id, i < 2 ? 'A' : 'B', `split-w${i + 1}`),
      ),
    ],
    measurements: [
      {
        id: 'cmp-thk-pre-plan',
        stepId: 'cmp-thk-pre',
        measurementOperationDefinitionId: 'measurement-operation-thickness-v1',
        operation: 'THK Measurement',
        parameterDefinitionIds: ['parameter-thickness-v1'],
        parameters: ['THK'],
        point: 'PRE',
      },
      {
        id: 'cmp-thk-post-plan',
        stepId: 'cmp-thk-post',
        measurementOperationDefinitionId: 'measurement-operation-thickness-v1',
        operation: 'THK Measurement',
        parameterDefinitionIds: ['parameter-thickness-v1'],
        parameters: ['THK'],
        point: 'POST',
      },
    ],
    delta: {
      sourceLabel: 'Study Default',
      items: [
        {
          id: 'delta-cmp-pad',
          kind: 'RESOURCE',
          label: 'Pad split',
          change: 'ADDED',
          before: 'Pad A',
          after: 'Pad A / B / C / D',
        },
        {
          id: 'delta-cmp-pressure',
          kind: 'CONDITION',
          label: 'W04 Pressure',
          change: 'CHANGED',
          before: '3.0 psi',
          after: '3.5 psi',
        },
        {
          id: 'delta-cmp-post',
          kind: 'MEASUREMENT_PLAN',
          label: 'THK POST',
          change: 'ADDED',
          before: null,
          after: 'THK Measurement · POST',
        },
      ],
      unchangedCount: 9,
    },
  },
};

export function effectiveAssignments(
  snapshot: RunPlanningSnapshot,
  subjectId: string,
) {
  return snapshot.assignments
    .filter((a) => a.subjectId === null || a.subjectId === subjectId)
    .reduce<Record<string, SetupAssignment>>((result, item) => {
      const key = `${item.processStepId}:${item.kind}:${item.label}`;
      if (!item.positionId) result[key] = item;
      return result;
    }, {});
}
export function assignmentSummary(
  plan: RunPlanningSnapshot,
  item: SetupAssignment,
  configuredUnit = '',
) {
  const subjectNoun = 'subject';
  const assignments = plan.assignments.filter(
    (candidate) =>
      candidate.subjectId &&
      !candidate.positionId &&
      candidate.processStepId === item.processStepId &&
      candidate.kind === item.kind &&
      candidate.label === item.label,
  );
  if (item.intentRole !== 'VARIED' || assignments.length === 0)
    return {
      value: item.value,
      detail: assignments.length
        ? `${assignments.length} ${subjectNoun} override${assignments.length > 1 ? 's' : ''}`
        : `Common across all ${subjectNoun}s`,
    };
  const values = [
    ...new Set(assignments.map((assignment) => assignment.value)),
  ];
  const numeric = values.map((value) => Number.parseFloat(value));
  const valueSuffix = values[0]?.replace(/^[+-]?\d+(?:\.\d+)?/, '') ?? '';
  const suffix = valueSuffix || (configuredUnit ? ` ${configuredUnit}` : '');
  const value = numeric.every(Number.isFinite)
    ? `${Math.min(...numeric)}–${Math.max(...numeric)}${suffix}`
    : values.join(' / ');
  return { value, detail: `${assignments.length} ${subjectNoun} assignments` };
}
export function validatePlanningSnapshot(snapshot: RunPlanningSnapshot) {
  const errors: string[] = [];
  const subjectIds = new Set(snapshot.subjects.map((subject) => subject.id));
  const stepIds = new Set(snapshot.steps.map((s) => s.id));
  if (subjectIds.size !== snapshot.subjects.length)
    errors.push('Duplicate subject reference');
  for (const [subjectId, ids] of Object.entries(snapshot.subjectOperationIds)) {
    if (new Set(ids).size !== ids.length) errors.push(`Duplicate participation for ${subjectId}`);
    if (!subjectIds.has(subjectId)) errors.push(`Unknown subject ${subjectId}`);
    if (ids.some((id) => !stepIds.has(id)))
      errors.push(`Unknown process step for ${subjectId}`);
  }
  for (const item of snapshot.assignments) {
    if (item.subjectId && !subjectIds.has(item.subjectId))
      errors.push(`Unknown assignment subject ${item.subjectId}`);
    if (item.processStepId && !stepIds.has(item.processStepId))
      errors.push(`Unknown assignment step ${item.processStepId}`);
    if (!item.referenceId)
      errors.push(`Missing exact reference for ${item.label}`);
  }
  for (const item of snapshot.measurements) {
    if (
      !stepIds.has(item.stepId) ||
      !item.measurementOperationDefinitionId ||
      !item.parameterDefinitionIds.length
    )
      errors.push(`Invalid measurement plan ${item.id}`);
    if ('acquisitionMethod' in item)
      errors.push(`Acquisition source is not planning data`);
  }
  return errors;
}
