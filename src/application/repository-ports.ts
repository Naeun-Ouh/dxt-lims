import type { SavedAnalysisView } from '@/src/domain/analysis';
import type { ReferenceCatalog, ConfigurationWriteRepository } from '@/src/domain/reference';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import type { ActualExecutionEvidence } from '@/src/features/run-registration/actual-execution-model';
import type { DecisionContinuationContext, NextRunPreview } from '@/src/features/run-registration/decision-continuation-model';
import type { EngineerEvaluationRecord } from '@/src/features/run-registration/evaluation-grid-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { ExperimentScopeRange } from '@/src/features/run-registration/workspace-model';
import type { SubjectMeasurementResultSet } from '@/src/domain/measurement/subject-measurement';

export type RepositoryCommand = {
  commandId: string;
  expectedVersion?: number;
};

export type PlanningWorkspaceRecord = {
  canEditPlan?: boolean;
  canCreateRun?: boolean;
  scientificPermissions?: import('./authorization').ScientificPermissions;
  version?: number;
  lockReason?: string | null;
  snapshot: RunPlanningSnapshot;
  ranges: ExperimentScopeRange[];
  manualFocus: string[];
};

export type DecisionRecord = {
  context: DecisionContinuationContext | null;
  nextRunPreview: NextRunPreview | null;
};

export interface StudyRepository {
  getLifecycleReadiness?(seriesSlug:SeriesSlug,packageVersionId:string):Promise<import('./study-readiness').StudyReadiness>;
  confirmReasoningContext?(seriesSlug:SeriesSlug,input:import('./study-readiness').ConfirmStudyReasoning,command:RepositoryCommand):Promise<void>;
  getSetup(seriesSlug: SeriesSlug): Promise<StudySetupSnapshot | null>;
  saveSetup(setup: StudySetupSnapshot, command: RepositoryCommand): Promise<void>;
}

export interface RunRepository {
  previewCreation?(request:import('./run-creation').RunCreationRequest):Promise<import('./run-creation').AuthoritativeRunPreview>;
  createFromPreview?(request:import('./run-creation').RunCreationRequest,fingerprint:string,command:RepositoryCommand):Promise<RunPlanningSnapshot>;
  createFromPreviousRun(sourceRunId: string, decisionId: string, command: RepositoryCommand): Promise<RunPlanningSnapshot>;
  createFromStudyDefault(seriesSlug: SeriesSlug, command: RepositoryCommand): Promise<RunPlanningSnapshot>;
  getSnapshot(runId: string): Promise<RunPlanningSnapshot | null>;
  listSnapshots(): Promise<RunPlanningSnapshot[]>;
  getCreatedRun(seriesSlug: SeriesSlug, runNumber?: number): Promise<RunPlanningSnapshot | null>;
  saveSnapshot(snapshot: RunPlanningSnapshot, command: RepositoryCommand): Promise<RunPlanningSnapshot>;
  getPlanningWorkspace(runId: string): Promise<PlanningWorkspaceRecord | null>;
  savePlanningWorkspace(record: PlanningWorkspaceRecord, command: RepositoryCommand): Promise<void>;
}

export type ExecutionRecord = { version: number; records: ActualExecutionEvidence[] };

export interface ExecutionRepository {
  getStateByRun(runId: string): Promise<ExecutionRecord>;
  getByRun(runId: string): Promise<ActualExecutionEvidence[]>;
  saveByRun(runId: string, records: ActualExecutionEvidence[], command: RepositoryCommand): Promise<ExecutionRecord>;
}

export type MeasurementRecord = { version: number; record: SubjectMeasurementResultSet };
export type MeasurementDatasetEntry = { dataset: SubjectMeasurementResultSet['datasets'][number]; parameterIds: string[]; subjectIds: string[] };
export interface MeasurementRepository {
  getCatalog(packageVersionId: string): Promise<ReferenceCatalog>;
  listDatasets(): Promise<MeasurementDatasetEntry[]>;
  getStateByRun(runId: string): Promise<MeasurementRecord>;

  getByRun(runId: string): Promise<SubjectMeasurementResultSet | null>;
  query(query: MeasurementQuery): Promise<SubjectMeasurementResultSet>;
  saveByRun(runId: string, record: SubjectMeasurementResultSet, command: RepositoryCommand): Promise<MeasurementRecord>;
}

export type MeasurementQuery = {
  savedAnalysisId?:string;
  runIds?: string[];
  datasetIds?: string[];
  parameterDefinitionIds?: string[];
  subjectIds?: string[];
  siteIdentities?: string[];
  coordinateDefinitionIds?: string[];
  validity?: 'INCLUDED' | 'EXCLUDED';
  limit?: number;
};

export type ReasoningState<T> = { version: number; record: T };
export interface EvaluationRepository {
  getStateByRun(runId: string): Promise<ReasoningState<EngineerEvaluationRecord[]>>;
  getContext?(runId: string): Promise<{ targetBindings: import('@/src/features/run-registration/evaluation-grid-model').EvaluationTargetBinding[]; catalog: ReferenceCatalog }>;
  getByRun(runId: string): Promise<EngineerEvaluationRecord[]>;
  saveByRun(runId: string, records: EngineerEvaluationRecord[], command: RepositoryCommand): Promise<void>;
}

export interface DecisionRepository {
  getStateByRun(runId: string): Promise<ReasoningState<DecisionRecord | null>>;
  getByRun(runId: string): Promise<DecisionRecord | null>;
  saveByRun(runId: string, record: DecisionRecord, command: RepositoryCommand): Promise<void>;
}

export interface SavedAnalysisRepository {
  getAccess?(id:string):Promise<import('./saved-analysis-access').SavedAnalysisAccess>;
  share?(id:string,sharing:import('./saved-analysis-access').SavedAnalysisSharing,command:import('./saved-analysis-access').SavedAnalysisAccessCommand):Promise<import('./saved-analysis-access').SavedAnalysisAuditMetadata>;
  getState(id: string): Promise<ReasoningState<SavedAnalysisView | null>>;
  list(): Promise<SavedAnalysisView[]>;
  get(id: string): Promise<SavedAnalysisView | null>;
  save(view: SavedAnalysisView, command: RepositoryCommand): Promise<void>;
}

export interface ApplicationRepositories {
  configuration: ConfigurationWriteRepository;
  study: StudyRepository;
  run: RunRepository;
  execution: ExecutionRepository;
  measurement: MeasurementRepository;
  evaluation: EvaluationRepository;
  decision: DecisionRepository;
  savedAnalysis: SavedAnalysisRepository;
}

export class ApplicationError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'PERSISTENCE' | 'FORBIDDEN',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApplicationError';
  }
}
