import { decisionSchema } from '@/src/domain/decision';
import type { AnalysisMeasurementSource } from '@/src/domain/analysis';
import {
  subjectMeasurementResultSetSchema,
  type SubjectMeasurementResultSet,
} from '@/src/domain/measurement/subject-measurement';
import { resolveById, unitSymbol, type ReferenceCatalog } from '@/src/domain/reference';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import { projectOperationExecution, plannedExecutionIdentity, type ActualExecutionEvidence } from './actual-execution-model';
import { createNextRunPreview, type DecisionContinuationContext, type NextRunPreview } from './decision-continuation-model';
import type { EngineerEvaluationRecord, EvaluationTargetBinding } from './evaluation-grid-model';
import { plannedMeasurementIdentity } from './measurement-grid-model';
import type { RunPlanningSnapshot } from './planning-model';
import type { ExperimentWorkspaceModel } from './workspace-model';

export type LifecycleAuthoringProfile = {
  studyId: SeriesSlug;
  studyLabel: string;
  workspaceContextLabel: string;
  catalog: ReferenceCatalog;
  targetBindings: readonly EvaluationTargetBinding[];
  actor: string;
};

export type AuthoredLifecycleState = {
  version: 1;
  runId: string;
  studyId: SeriesSlug;
  studyLabel: string;
  workspaceContextLabel: string;
  snapshot: RunPlanningSnapshot;
  actualEvidence: ActualExecutionEvidence[];
  executionVersion?: number;
  measurementResults: SubjectMeasurementResultSet;
  measurementVersion?: number;
  measurementCatalog?: ReferenceCatalog;
  evaluationVersion?: number;
  decisionVersion?: number;
  targetBindings?: EvaluationTargetBinding[];
  engineerEvaluations: EngineerEvaluationRecord[];
  decisionContext: DecisionContinuationContext | null;
  nextRunPreview: NextRunPreview | null;
};

export type ActualExecutionCommand = {
  id: string;
  operationId: string;
  subjectId: string;
  status: 'OBSERVED' | 'COMPLETED' | 'INTERRUPTED';
  startedAt: string;
  endedAt: string | null;
  equipment?: string;
  recipe?: string;
  actualOverrides: Record<string, string>;
};

export type ManualMeasurementCommand = {
  id: string;
  operationId: string;
  subjectId: string;
  parameterDefinitionId: string;
  measurementPoint: 'PRE' | 'INTERMEDIATE' | 'POST' | 'FINAL' | 'CUSTOM';
  value: string;
  grain: 'SUBJECT' | 'SITE';
  siteIdentity?: string;
  coordinateValues?: Array<{ coordinateDefinitionId: string; value: number }>;
  validity?: 'INCLUDED' | 'EXCLUDED';
  validityReason?: string;
  recordedAt: string;
};

export type EvaluationCommand = {
  id: string;
  subjectId: string;
  seriesTargetId: string;
  measurementSummaryId: string;
  disposition: EngineerEvaluationRecord['disposition'];
  comment: string;
  evaluator: string;
  evaluatedAt: string;
};

export type DecisionCommand = {
  id: string;
  decisionStatement: string;
  conclusion: string;
  reason: string;
  nextActionTypeDefinitionId: string;
  nextActionNote: string;
  evaluationIds: string[];
  targetReferences: DecisionContinuationContext['targetAchievementReferences'];
  targetSubjectIds: string[];
  targetOperationIds: string[];
  recordedBy: string;
  recordedAt: string;
  nextRunChange: { assignmentId: string; after: string } | null;
};

export function createEmptyLifecycleState(
  snapshot: RunPlanningSnapshot,
  profile: LifecycleAuthoringProfile,
): AuthoredLifecycleState {
  return {
    version: 1,
    runId: snapshot.id,
    studyId: profile.studyId,
    studyLabel: profile.studyLabel,
    workspaceContextLabel: profile.workspaceContextLabel,
    snapshot: structuredClone(snapshot),
    actualEvidence: [],
    measurementResults: subjectMeasurementResultSetSchema.parse({
      executions: [],
      datasets: [],
      values: [],
      summaries: [],
      validityDecisions: [],
    }),
    engineerEvaluations: [],
    decisionContext: null,
    nextRunPreview: null,
  };
}

export function recordActualExecution(
  state: AuthoredLifecycleState,
  model: ExperimentWorkspaceModel,
  command: ActualExecutionCommand,
) {
  const operation = model.operations.find((item) => item.id === command.operationId);
  const subject = model.subjects.find((item) => item.id === command.subjectId);
  if (!operation || !subject) throw new Error('Select a valid Operation and Subject.');
  if (!command.startedAt) throw new Error('Execution start is required.');
  if (command.status === 'COMPLETED' && !command.endedAt)
    throw new Error('Completion time is required for a completed execution.');
  const plan = projectOperationExecution(model, operation, subject, []);
  const observedValues = plan.comparisons
    .filter((item) => item.key !== 'equipment' && item.label !== 'Recipe')
    .flatMap((item) => {
      const value = command.actualOverrides[item.key] ?? item.planned;
      return value === null ? [] : [{ definitionId: item.key, value }];
    });
  const evidence: ActualExecutionEvidence = {
    event: {
      id: `${command.id}:execution`,
      experimentRunId: state.runId,
      processStepId: operation.id,
      plannedExecutionItemId: plannedExecutionIdentity(state.runId, subject.id, operation.id),
      observedOperation: operation.name,
      observedRecipe: command.recipe ?? operation.recipe,
      equipment: command.equipment ?? operation.equipment,
      startedAt: command.startedAt,
      endedAt: command.endedAt,
      executionStatus: command.status,
      sourceSystem: 'DXT Manual',
      sourceRecordReference: `${command.id}:manual`,
    },
    resolvedSubjectId: subject.id,
    observedValues,
    retrievedAt: command.endedAt ?? command.startedAt,
  };
  return {
    ...state,
    actualEvidence: [
      ...state.actualEvidence.filter(
        (item) =>
          !(
            item.event.processStepId === operation.id &&
            item.resolvedSubjectId === subject.id
          ),
      ),
      evidence,
    ],
  };
}

export function recordManualMeasurement(
  state: AuthoredLifecycleState,
  model: ExperimentWorkspaceModel,
  catalog: ReferenceCatalog,
  command: ManualMeasurementCommand,
) {
  const operation = model.operations.find(
    (item) => item.id === command.operationId && item.role === 'MEASUREMENT',
  );
  const subject = model.subjects.find((item) => item.id === command.subjectId);
  if (!operation || !subject) throw new Error('Select a valid Measurement Operation and Subject.');
  const definition = resolveById(
    catalog.measurementOperations,
    operation.operationDefinitionRevisionId,
  );
  const parameter = resolveById(catalog.parameters, command.parameterDefinitionId);
  if (
    parameter.measurementOperationDefinitionId !== definition.id ||
    parameter.semanticRole !== 'MEASUREMENT'
  )
    throw new Error('Parameter is not applicable to the selected Measurement Operation.');
  if (!parameter.supportedMeasurementPoints.includes(command.measurementPoint))
    throw new Error('Measurement point is not supported by this Parameter.');
  const trimmed = command.value.trim();
  if (!trimmed) throw new Error('Measurement value is required.');
  const typedValue =
    parameter.dataType === 'NUMBER'
      ? { dataType: 'NUMBER' as const, value: Number(trimmed) }
      : parameter.dataType === 'BOOLEAN'
        ? { dataType: 'BOOLEAN' as const, value: trimmed === 'true' }
        : { dataType: 'TEXT' as const, value: trimmed };
  if (typedValue.dataType === 'NUMBER' && !Number.isFinite(typedValue.value))
    throw new Error('Measurement value must be a valid number.');
  if (command.grain === 'SITE' && !command.siteIdentity?.trim())
    throw new Error('Site is required for Site-grain Measurement.');
  const coordinateValues = command.grain === 'SITE' ? command.coordinateValues ?? [] : [];
  if (command.grain === 'SITE' && !coordinateValues.length)
    throw new Error('Site coordinates are required for Site-grain Measurement.');
  const executionId = `${command.id}:execution`;
  const datasetId = `${command.id}:dataset`;
  const valueId = `${command.id}:value`;
  const results = subjectMeasurementResultSetSchema.parse({
    executions: [
      ...state.measurementResults.executions,
      {
        id: executionId,
        experimentRunId: state.runId,
        subjectIds: [subject.id],
        measurementOperationDefinitionId: definition.id,
        measurementPoint: command.measurementPoint,
        sequence: state.measurementResults.executions.length + 1,
        startedAt: command.recordedAt,
        completedAt: command.recordedAt,
        acquisitionMethod: 'MANUAL',
        sourceSystem: 'DXT Manual',
        sourceRecordReference: `${command.id}:manual`,
      },
    ],
    datasets: [
      ...state.measurementResults.datasets,
      {
        id: datasetId,
        experimentRunId: state.runId,
        plannedExecutionItemId: plannedMeasurementIdentity(
          state.runId,
          subject.id,
          operation.id,
        ),
        executionEventId:
          state.actualEvidence.find(
            (item) => item.resolvedSubjectId === subject.id,
          )?.event.id ?? null,
        measurementExecutionId: executionId,
        measurementOperationDefinitionId: definition.id,
        equipmentReference: operation.equipmentReferenceId || null,
        measurementPoint: command.measurementPoint,
        sourceSystem: 'DXT Manual',
        collectedAt: command.recordedAt,
        status: 'COLLECTED',
        datasetOrigin: 'SOURCE',
        preprocessingExecutionId: null,
      },
    ],
    values: [
      ...state.measurementResults.values,
      {
        id: valueId,
        datasetId,
        subjectId: subject.id,
        physicalSubjectId: null,
        parameterDefinitionId: parameter.id,
        value: typedValue,
        unitDefinitionId: parameter.unitId,
        granularity: command.grain,
        siteIdentity: command.grain === 'SITE' ? command.siteIdentity!.trim() : null,
        coordinateValues,
        observedAt: command.recordedAt,
        sourceParameterReference: null,
        acquisitionMethod: 'MANUAL',
        adHocParameter: null,
        sourceMeasurementValueIds: [],
      },
    ],
    summaries: [
      ...state.measurementResults.summaries,
      ...(typedValue.dataType === 'NUMBER'
        ? [
            {
              id: `${command.id}:summary`,
              datasetId,
              subjectId: subject.id,
              parameterDefinitionId: parameter.id,
              aggregationMethod: 'MEAN' as const,
              value: typedValue,
              unitDefinitionId: parameter.unitId,
              sourceMeasurementIds: [valueId],
              summaryOrigin: 'DXT_CALCULATED' as const,
              rawInputCount: 1,
              effectiveInputCount: command.validity === 'EXCLUDED' ? 0 : 1,
            },
          ]
        : []),
    ],
    validityDecisions: [
      ...state.measurementResults.validityDecisions,
      ...(command.validity === 'EXCLUDED'
        ? [
            {
              id: `${command.id}:validity`,
              measurementValueId: valueId,
              state: 'EXCLUDED' as const,
              reason: command.validityReason?.trim() || null,
              actor: 'DXT Engineer',
              decidedAt: command.recordedAt,
            },
          ]
        : []),
    ],
  });
  return { ...state, measurementResults: results };
}

export function recordEngineerEvaluation(
  state: AuthoredLifecycleState,
  command: EvaluationCommand,
) {
  if (!command.comment.trim()) throw new Error('Engineer rationale is required.');
  const summary = state.measurementResults.summaries.find(
    (item) => item.id === command.measurementSummaryId,
  );
  if (!summary || summary.subjectId !== command.subjectId)
    throw new Error('Evaluation must reference an exact measured Subject result.');
  const record: EngineerEvaluationRecord = {
    id: command.id,
    runId: state.runId,
    subjectId: command.subjectId,
    seriesTargetId: command.seriesTargetId,
    measurementSummaryId: command.measurementSummaryId,
    disposition: command.disposition,
    comment: command.comment.trim(),
    evaluator: command.evaluator,
    evaluatedAt: command.evaluatedAt,
  };
  return {
    ...state,
    engineerEvaluations: [
      ...state.engineerEvaluations.filter(
        (item) =>
          !(
            item.subjectId === record.subjectId &&
            item.seriesTargetId === record.seriesTargetId
          ),
      ),
      record,
    ],
  };
}

export function recordDecisionAndNextAction(
  state: AuthoredLifecycleState,
  catalog: ReferenceCatalog,
  command: DecisionCommand,
) {
  if (!command.conclusion.trim() || !command.reason.trim())
    throw new Error('Decision and scientific rationale are required.');
  if (!command.nextActionNote.trim()) throw new Error('Next Action is required.');
  resolveById(catalog.nextActionTypes, command.nextActionTypeDefinitionId);
  const decision = decisionSchema.parse({
    id: command.id,
    experimentRunId: state.runId,
    evaluations: [],
    criterionAssessments: [],
    conclusion: command.conclusion.trim(),
    reason: command.reason.trim(),
    nextAction: {
      nextActionTypeDefinitionId: command.nextActionTypeDefinitionId,
      note: command.nextActionNote.trim(),
    },
    recordedBy: command.recordedBy,
    recordedAt: command.recordedAt,
  });
  const isNextRun =
    catalog.nextActionTypes.find(
      (item) => item.id === command.nextActionTypeDefinitionId,
    )?.code === 'DESIGN_NEXT_EXPERIMENT';
  const destinationRunId = isNextRun
    ? `run-${state.snapshot.area.toLowerCase()}-${state.snapshot.runNumber + 1}`
    : null;
  const preview = destinationRunId
    ? createNextRunPreview(
        state.snapshot,
        destinationRunId,
        command.nextRunChange ? [command.nextRunChange] : [],
      )
    : null;
  return {
    ...state,
    decisionContext: {
      decision,
      decisionStatement: command.decisionStatement.trim() || command.conclusion.trim(),
      engineerEvaluationIds: [...command.evaluationIds],
      targetAchievementReferences: structuredClone(command.targetReferences),
      targetScope: {
        subjectIds: [...command.targetSubjectIds],
        operationIds: [...command.targetOperationIds],
      },
      siteScopeLabel: null,
      destinationRunId,
    },
    nextRunPreview: preview,
  };
}

export function authoredAnalysisSource(
  state: AuthoredLifecycleState,
  catalog: ReferenceCatalog,
): AnalysisMeasurementSource | null {
  if (!state.measurementResults.datasets.length) return null;
  const parameterIds = [
    ...new Set(
      state.measurementResults.values
        .map((item) => item.parameterDefinitionId)
        .filter((id): id is string => !!id),
    ),
  ];
  return {
    studyId: state.studyId,
    studyLabel: state.studyLabel,
    workspaceContextLabel: state.workspaceContextLabel,
    runId: state.runId,
    runNumber: state.snapshot.runNumber,
    subjects: state.snapshot.subjects,
    measurements: state.measurementResults,
    parameterLabels: Object.fromEntries(
      parameterIds.map((id) => [id, resolveById(catalog.parameters, id).name]),
    ),
    unitSymbols: Object.fromEntries(
      parameterIds.map((id) => {
        const parameter = resolveById(catalog.parameters, id);
        return [id, unitSymbol(catalog, parameter.unitId)];
      }),
    ),
  };
}

export function nowLocalIso() {
  const date = new Date();
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${date.toISOString().slice(0, 19)}${sign}${hours}:${minutes}`;
}

export function authoringId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
