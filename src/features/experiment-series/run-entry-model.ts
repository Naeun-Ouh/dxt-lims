import {
  runPlanningScenarios,
  type RunPlanningSnapshot,
  type SetupAssignment,
} from '@/src/features/run-registration/planning-model';
import {
  materializeStudySetupSnapshot,
  type StudySetupSnapshot,
} from './study-setup-model';
import { materialRunPlanningSnapshot } from '@/src/features/material-rd/material-rd-scenario';

export type SeriesSlug = 'dts-improvement' | 'cmp-stability' | 'adhesion-material-optimization';
export type RunCreationSource =
  | 'STUDY_DEFAULT'
  | 'PREVIOUS_RUN'
  | 'EXISTING_RUN'
  | 'BLANK';

export type RunCreationPreview = {
  source: RunCreationSource;
  sourceLabel: string;
  sourceRunNumber: number | null;
  inherited: Array<{ label: string; count: number; summary: string }>;
  configurationPackageVersionId: string;
};

export const runCreationSources: Array<{
  id: RunCreationSource;
  label: string;
  description: string;
}> = [
  {
    id: 'STUDY_DEFAULT',
    label: 'From Study Default',
    description: 'Start from the experiment setup defined for this Study.',
  },
  {
    id: 'PREVIOUS_RUN',
    label: 'From Previous Run',
    description:
      'Continue from the most recent Run and change only what is needed.',
  },
  {
    id: 'EXISTING_RUN',
    label: 'Load from Existing Run',
    description: 'Use another eligible Run as the starting context.',
  },
  {
    id: 'BLANK',
    label: 'Blank',
    description: 'Start without inherited experimental setup.',
  },
];

export function scenarioForSeries(seriesSlug: SeriesSlug) {
  return {
    'dts-improvement': runPlanningScenarios.PHOTO,
    'cmp-stability': runPlanningScenarios.CMP,
    'adhesion-material-optimization': materialRunPlanningSnapshot,
  }[seriesSlug];
}

export function nextRunNumber(seriesSlug: SeriesSlug) {
  return seriesSlug === 'cmp-stability' ? 13 : seriesSlug === 'adhesion-material-optimization' ? 4 : 19;
}

function previewGroups(snapshot: RunPlanningSnapshot) {
  const commonAssignments = snapshot.assignments.filter(
    (assignment) => !assignment.subjectId && !assignment.positionId,
  );
  const assignmentGroup = (kind: SetupAssignment['kind'], label: string) => {
    const items = commonAssignments.filter((item) => item.kind === kind);
    return {
      label,
      count: items.length,
      summary: items.map((item) => item.label).join(' · ') || 'None',
    };
  };
  return [
    {
      label: 'Operations',
      count: snapshot.steps.length,
      summary: snapshot.steps.map((step) => step.label).join(' → '),
    },
    assignmentGroup('RECIPE', 'Recipe'),
    assignmentGroup('MATERIAL', 'Material'),
    {
      label: 'Experimental Variables',
      count: commonAssignments.filter((item) => item.intentRole === 'VARIED')
        .length,
      summary:
        commonAssignments
          .filter((item) => item.intentRole === 'VARIED')
          .map((item) => item.label)
          .join(' · ') || 'None',
    },
    {
      label: 'Measurement Plan',
      count: snapshot.measurements.length,
      summary:
        snapshot.measurements
          .map((item) => `${item.operation} ${item.point}`)
          .join(' · ') || 'None',
    },
  ];
}

export function createRunEntryPreview(
  seriesSlug: SeriesSlug,
  source: RunCreationSource,
  studySetup?: StudySetupSnapshot,
): RunCreationPreview {
  const snapshot =
    source === 'STUDY_DEFAULT' && studySetup
      ? materializeStudySetupSnapshot(studySetup)
      : scenarioForSeries(seriesSlug);
  const sourceRunNumber =
    source === 'PREVIOUS_RUN' || source === 'EXISTING_RUN'
      ? snapshot.runNumber
      : null;
  return {
    source,
    sourceLabel:
      source === 'STUDY_DEFAULT'
        ? `${snapshot.series.name} Default`
        : source === 'BLANK'
          ? 'Blank setup'
          : `${snapshot.series.name} · Run ${snapshot.runNumber}`,
    sourceRunNumber,
    inherited: source === 'BLANK' ? [] : previewGroups(snapshot),
    configurationPackageVersionId: snapshot.configurationPackageVersionId,
  };
}

export function createRunFromEntry(
  seriesSlug: SeriesSlug,
  source: RunCreationSource,
  studySetup?: StudySetupSnapshot,
  runNumberOverride?: number,
  persistedContext?: RunPlanningSnapshot,
): RunPlanningSnapshot {
  const sourceSnapshot =
    source === 'STUDY_DEFAULT' && studySetup
      ? materializeStudySetupSnapshot(studySetup, persistedContext)
      : scenarioForSeries(seriesSlug);
  const runNumber = runNumberOverride ?? nextRunNumber(seriesSlug);
  const runId = persistedContext?.id ?? `run-${sourceSnapshot.area.toLowerCase()}-${runNumber}`;
  const blank = source === 'BLANK';
  const stepMap = new Map(
    sourceSnapshot.steps.map((step, index) => [
      step.id,
      `${runId}-step-${index + 1}`,
    ]),
  );
  const steps = blank
    ? []
    : sourceSnapshot.steps.map((step) => ({
        ...step,
        id: stepMap.get(step.id)!,
      }));
  const assignments = blank
    ? []
    : sourceSnapshot.assignments.map((assignment, index) => ({
        ...assignment,
        id: `${runId}-assignment-${index + 1}`,
        processStepId: assignment.processStepId
          ? stepMap.get(assignment.processStepId)!
          : null,
        provenance:
          source === 'STUDY_DEFAULT'
            ? ('SERIES_DEFAULT' as const)
            : source === 'EXISTING_RUN'
              ? ('EXISTING_CONFIGURATION' as const)
              : ('PREVIOUS_RUN' as const),
      }));
  const measurements = blank
    ? []
    : sourceSnapshot.measurements.map((measurement, index) => ({
        ...measurement,
        id: `${runId}-measurement-${index + 1}`,
        stepId: stepMap.get(measurement.stepId)!,
      }));
  const sourceId =
    source === 'PREVIOUS_RUN' || source === 'EXISTING_RUN'
      ? sourceSnapshot.id
      : source === 'STUDY_DEFAULT'
        ? (sourceSnapshot.provenance.sourceId ??
          `${sourceSnapshot.series.id}-default`)
        : null;
  const provenanceKind =
    source === 'STUDY_DEFAULT'
      ? ('SERIES_DEFAULT' as const)
      : source === 'BLANK'
        ? ('AD_HOC' as const)
        : source === 'EXISTING_RUN'
          ? ('EXISTING_CONFIGURATION' as const)
          : ('PREVIOUS_RUN' as const);
  return {
    ...structuredClone(sourceSnapshot),
    id: runId,
    runNumber,
    name: `Run ${runNumber}`,
    createdAt: '2026-09-13',
    provenance: {
      kind: provenanceKind,
      label:
        source === 'STUDY_DEFAULT'
          ? sourceSnapshot.provenance.label
          : source === 'BLANK'
            ? 'Blank setup'
            : `${source === 'EXISTING_RUN' ? 'Existing' : 'Previous'} Run #${sourceSnapshot.runNumber}`,
      sourceId,
    },
    steps,
    assignments,
    measurements,
    subjectOperationIds: Object.fromEntries(
      sourceSnapshot.subjects.map((subject) => [
        subject.id,
        blank ? [] : source === 'STUDY_DEFAULT' ? steps.map(step => step.id) : (sourceSnapshot.subjectOperationIds[subject.id] ?? []).flatMap(id => stepMap.has(id) ? [stepMap.get(id)!] : []),
      ]),
    ),
    delta: {
      sourceLabel:
        source === 'PREVIOUS_RUN' || source === 'EXISTING_RUN'
          ? `Run #${sourceSnapshot.runNumber}`
          : source === 'STUDY_DEFAULT'
            ? 'Study Default'
            : 'Blank',
      items: [],
      unchangedCount: assignments.length + measurements.length,
    },
  };
}

export function createdRunPath(seriesSlug: SeriesSlug, runNumber = nextRunNumber(seriesSlug)) {
  return `/series/${seriesSlug}/runs/${runNumber}/engineering-grid?view=plan`;
}

export function createdRunStorageKey(
  seriesSlug: SeriesSlug,
  runNumber = nextRunNumber(seriesSlug),
) {
  return `dxt:run-entry:${seriesSlug}:${runNumber}`;
}
