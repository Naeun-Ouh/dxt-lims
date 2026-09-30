import type { ConfigurationAuthoringBoundary } from './configuration-authoring';
import { currentSubjectMeasurementValidity } from '@/src/domain/measurement/subject-measurement';
import { emptyMeasurements } from './measurement-record';
import { filterMeasurements } from './measurement-query';
import type { AnalysisMeasurementSource, AnalysisSelection } from '@/src/domain/analysis';
import type { MeasurementQuery, MeasurementRecord } from './repository-ports';
import { executionEvidenceSchema } from './execution-record';
import { plannedExecutionIdentity } from '@/src/features/run-registration/actual-execution-model';
import type { RepositoryCommand, ExecutionRecord } from './repository-ports';
import type { SavedAnalysisView } from '@/src/domain/analysis';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import {
  authoredAnalysisSource,
  createEmptyLifecycleState,
  recordActualExecution,
  recordDecisionAndNextAction,
  recordEngineerEvaluation,
  recordManualMeasurement,
  type ActualExecutionCommand,
  type AuthoredLifecycleState,
  type DecisionCommand,
  type EvaluationCommand,
  type LifecycleAuthoringProfile,
  type ManualMeasurementCommand,
} from '@/src/features/run-registration/lifecycle-authoring';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { ExperimentWorkspaceModel } from '@/src/features/run-registration/workspace-model';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import { type RunCreationSource } from '@/src/features/experiment-series/run-entry-model';
import { ApplicationError, type ApplicationRepositories, type PlanningWorkspaceRecord } from './repository-ports';

const command = (commandId: string) => ({ commandId });

export class DxtApplication {
  constructor(public readonly repositories: ApplicationRepositories, public readonly analysisSeeds: AnalysisMeasurementSource[] = [], public readonly savedViewSeeds: SavedAnalysisView[] = [], public readonly studyRunSeeds: Record<string, import('@/src/mock/series-workspaces').SeriesWorkspaceProjection['runs']> = {}, public readonly configurationAuthoringBoundary?: ConfigurationAuthoringBoundary) {}

  readonly studies = {
    load: (seriesSlug: SeriesSlug) => this.repositories.study.getSetup(seriesSlug),
    save: (setup: StudySetupSnapshot, commandId: string) =>
      this.repositories.study.saveSetup(setup, {commandId,expectedVersion:setup.revision-1}),
  };

  readonly runs = {
    previewCreation: (request:import('./run-creation').RunCreationRequest)=>{
      if(!this.repositories.run.previewCreation)throw new ApplicationError('VALIDATION','Authoritative creation preview is unavailable.');
      return this.repositories.run.previewCreation(request);
    },
    createFromPreview: (request:import('./run-creation').RunCreationRequest,fingerprint:string,commandId:string)=>{
      if(!this.repositories.run.createFromPreview)throw new ApplicationError('VALIDATION','Authoritative creation is unavailable.');
      return this.repositories.run.createFromPreview(request,fingerprint,{commandId});
    },
    createNextFromPrevious: (sourceRunId:string,decisionId:string,commandId:string)=>this.repositories.run.createFromPreviousRun(sourceRunId,decisionId,command(commandId)),
    loadCreated: (seriesSlug: SeriesSlug, runNumber?: number) =>
      this.repositories.run.getCreatedRun(seriesSlug, runNumber),
    saveSnapshot: (snapshot: RunPlanningSnapshot, commandId: string) =>
      this.repositories.run.saveSnapshot(snapshot, command(commandId)),
    loadPlanning: (runId: string) => this.repositories.run.getPlanningWorkspace(runId),
    savePlanning: (record: PlanningWorkspaceRecord, commandId: string) =>
      this.repositories.run.savePlanningWorkspace(record, {commandId,expectedVersion:record.version}),
  };

  async createRunFromStudy(
    seriesSlug: SeriesSlug,
    source: Extract<RunCreationSource, 'STUDY_DEFAULT'>,
    commandId: string,
  ) {
    void source;
    return this.repositories.run.createFromStudyDefault(seriesSlug, command(commandId));
  }

  readonly savedAnalyses = {
    getState: (id: string) => this.repositories.savedAnalysis.getState(id),
    list: () => this.repositories.savedAnalysis.list(),
    get: (id: string) => this.repositories.savedAnalysis.get(id),
    save: (view: SavedAnalysisView, commandId: string, expectedVersion = 0) =>
      this.repositories.savedAnalysis.save(view, { commandId, expectedVersion }),
  };

  readonly executions = {
    load: (runId: string) => this.repositories.execution.getStateByRun(runId),
    save: async (runId: string, records: ExecutionRecord['records'], command: RepositoryCommand) => {
      const parsed = executionEvidenceSchema.array().safeParse(records);
      if (!parsed.success) throw new ApplicationError('VALIDATION', 'Invalid execution evidence.');
      const snapshot = await this.repositories.run.getSnapshot(runId);
      if (!snapshot) throw new ApplicationError('NOT_FOUND', 'Run is not persisted.');
      const keys = new Set<string>();
      for (const item of records) {
        const event = item.event;
        const key = plannedExecutionIdentity(runId, item.resolvedSubjectId, event.processStepId);
        if (keys.has(key) || event.experimentRunId !== runId ||
          !snapshot.subjects.some((subject) => subject.id === item.resolvedSubjectId) ||
          !snapshot.subjectOperationIds[item.resolvedSubjectId]?.includes(event.processStepId) ||
          (event.plannedExecutionItemId !== null && event.plannedExecutionItemId !== key))
          throw new ApplicationError('VALIDATION', 'Execution must reference an exact Run Subject / Operation membership.');
        if (!Number.isFinite(Date.parse(event.startedAt)) ||
          (event.endedAt !== null && !Number.isFinite(Date.parse(event.endedAt))) ||
          (event.executionStatus === 'COMPLETED' && !event.endedAt))
          throw new ApplicationError('VALIDATION', 'Valid execution timestamps are required.');
        keys.add(key);
      }
      return this.repositories.execution.saveByRun(runId, parsed.data, command);
    },
  };

  async loadLifecycle(snapshot: RunPlanningSnapshot, profile: LifecycleAuthoringProfile, stage: 'ACTUAL' | 'MEASUREMENT' | 'ALL' = 'ALL') {
    if (stage === 'ACTUAL' || stage === 'MEASUREMENT') {
      const saved = await this.repositories.run.getSnapshot(snapshot.id);
      if (!saved) await this.repositories.run.saveSnapshot(snapshot, command(`initialize-run-${snapshot.id}`));
      const execution = await this.executions.load(snapshot.id);
      const empty = { ...createEmptyLifecycleState(saved ?? snapshot, profile), actualEvidence: execution.records, executionVersion: execution.version };
      if(stage==='ACTUAL')return empty;
      const measurement=await this.repositories.measurement.getStateByRun(snapshot.id);
      const measurementCatalog=await this.repositories.measurement.getCatalog(snapshot.configurationPackageVersionId);
      return {...empty,measurementResults:measurement.record,measurementVersion:measurement.version,measurementCatalog};
    }
    const [savedSnapshot, execution, measurement, engineerEvaluations, decision] = await Promise.all([
      this.repositories.run.getSnapshot(snapshot.id),
      this.executions.load(snapshot.id),
      this.repositories.measurement.getStateByRun(snapshot.id),
      this.repositories.evaluation.getStateByRun(snapshot.id),
      this.repositories.decision.getStateByRun(snapshot.id),
    ]);
    if (!savedSnapshot)
      await this.repositories.run.saveSnapshot(snapshot, command(`initialize-run-${snapshot.id}`));
    const empty = createEmptyLifecycleState(savedSnapshot ?? snapshot, profile);
    return {
      ...empty,
      actualEvidence: execution.records,
      executionVersion: execution.version,
      measurementResults: measurement.record,
      measurementVersion: measurement.version,
      engineerEvaluations: engineerEvaluations.record,
      evaluationVersion: engineerEvaluations.version,
      decisionVersion: decision.version,
      decisionContext: decision.record?.context ?? null,
      nextRunPreview: decision.record?.nextRunPreview ?? null,
      ...(await this.repositories.evaluation.getContext?.(snapshot.id).then(context=>({targetBindings:[...context.targetBindings],measurementCatalog:context.catalog}))),
    } satisfies AuthoredLifecycleState;
  }

  async recordActual(state: AuthoredLifecycleState, model: ExperimentWorkspaceModel, value: ActualExecutionCommand) {
    const next = recordActualExecution(state, model, value);
    await this.executions.save(state.runId, next.actualEvidence, { commandId: value.id, expectedVersion: state.executionVersion ?? 0 });
    // Query after commit; do not render optimistic command evidence as persistence proof.
    const stored = await this.executions.load(state.runId);
    return { ...next, actualEvidence: stored.records, executionVersion: stored.version };
  }
  async recordMeasurement(state: AuthoredLifecycleState, model: ExperimentWorkspaceModel, _catalog: ReferenceCatalog, value: ManualMeasurementCommand) {
    const catalog=await this.repositories.measurement.getCatalog(state.snapshot.configurationPackageVersionId);
    const next = recordManualMeasurement(state, model, catalog, value);
    await this.repositories.measurement.saveByRun(state.runId, next.measurementResults, {commandId:value.id,expectedVersion:state.measurementVersion??0});
    const stored=await this.repositories.measurement.getStateByRun(state.runId);
    return {...next,measurementResults:stored.record,measurementVersion:stored.version,measurementCatalog:catalog};
  }
  async recordEvaluation(state: AuthoredLifecycleState, value: EvaluationCommand) {
    const next = recordEngineerEvaluation(state, value);
    await this.repositories.evaluation.saveByRun(state.runId, next.engineerEvaluations, {commandId:value.id,expectedVersion:state.evaluationVersion??0});
    const stored=await this.repositories.evaluation.getStateByRun(state.runId);
    return {...next,engineerEvaluations:stored.record,evaluationVersion:stored.version};
  }
  async recordDecision(state: AuthoredLifecycleState, catalog: ReferenceCatalog, value: DecisionCommand) {
    const next = recordDecisionAndNextAction(state, state.measurementCatalog??catalog, value);
    await this.repositories.decision.saveByRun(state.runId, { context: next.decisionContext, nextRunPreview: next.nextRunPreview }, {commandId:value.id,expectedVersion:state.decisionVersion??0});
    const stored=await this.repositories.decision.getStateByRun(state.runId);
    return {...next,decisionContext:stored.record?.context??null,nextRunPreview:stored.record?.nextRunPreview??null,decisionVersion:stored.version};
  }
  async createNextRun(seriesSlug: SeriesSlug, state: AuthoredLifecycleState, commandId: string) {
    if (!state.nextRunPreview) throw new ApplicationError('VALIDATION', 'Create a Next Run preview first.');
    if(!state.decisionContext)throw new ApplicationError('VALIDATION','Saved Decision is required.');
    return this.runs.createNextFromPrevious(state.runId,state.decisionContext.decision.id,commandId);
  }
  readonly reasoning = {
    loadEvaluation: (runId:string)=>this.repositories.evaluation.getStateByRun(runId),
    loadDecision: (runId:string)=>this.repositories.decision.getStateByRun(runId),
    context: (runId:string)=>{if(!this.repositories.evaluation.getContext)throw new ApplicationError('NOT_FOUND','Repository reasoning context is unavailable.');return this.repositories.evaluation.getContext(runId);},
    saveEvaluation: (runId:string,records:import('@/src/features/run-registration/evaluation-grid-model').EngineerEvaluationRecord[],command:RepositoryCommand)=>this.repositories.evaluation.saveByRun(runId,records,command),
    saveDecision: (runId:string,record:import('./repository-ports').DecisionRecord,command:RepositoryCommand)=>this.repositories.decision.saveByRun(runId,record,command),
  };
  readonly measurements = {
    load: (runId:string)=>this.repositories.measurement.getStateByRun(runId),
    query: (query:MeasurementQuery)=>this.repositories.measurement.query(query),
    save: (runId:string,record:MeasurementRecord['record'],command:RepositoryCommand)=>this.repositories.measurement.saveByRun(runId,record,command),
  };
  async analysisSourceCatalog() {
    const datasets=await this.repositories.measurement.listDatasets();
    const runs=[...new Set(datasets.map(d=>d.dataset.experimentRunId))];
    const sources:AnalysisMeasurementSource[]=[];
    for(const runId of runs){
      const snapshot=await this.repositories.run.getSnapshot(runId);
      if(!snapshot)throw new ApplicationError('NOT_FOUND','Analysis Run context is missing.');
      const catalog=await this.repositories.measurement.getCatalog(snapshot.configurationPackageVersionId);
      const entries=datasets.filter(d=>d.dataset.experimentRunId===runId);
      const ids=[...new Set(entries.flatMap(e=>e.parameterIds))];
      sources.push({studyId:snapshot.series.id.replace(/^series-/,''),studyLabel:snapshot.series.name,workspaceContextLabel:snapshot.workspaceContextLabel??snapshot.area,
        runId,runNumber:snapshot.runNumber,subjects:snapshot.subjects,
        measurements:{...emptyMeasurements(),datasets:entries.map(e=>e.dataset)},
        parameterLabels:Object.fromEntries(ids.map(id=>{const p=catalog.parameters.find(p=>p.id===id);if(!p)throw new ApplicationError('NOT_FOUND','Exact Analysis Parameter revision is missing.');return [id,p.name];})),
        unitSymbols:Object.fromEntries(ids.map(id=>{const p=catalog.parameters.find(p=>p.id===id)!;return [id,catalog.units.find(u=>u.id===p.unitId)?.symbol??''];}))});
    }
    return [...this.analysisSeeds.filter(s=>!sources.some(p=>p.runId===s.runId)),...sources];
  }
  async queryAnalysisSources(sources:AnalysisMeasurementSource[],selection:AnalysisSelection,savedAnalysisId?:string) {
    const query:MeasurementQuery={...(savedAnalysisId?{savedAnalysisId}:{}),runIds:selection.runIds,datasetIds:selection.datasetIds,parameterDefinitionIds:selection.parameterIds,subjectIds:selection.subjectIds};
    const result=await this.measurements.query(query);
    return sources.map(source=>{
      const seed=this.analysisSeeds.find(s=>s.runId===source.runId && s.measurements===source.measurements);
      const measurements=seed?filterMeasurements([seed.measurements],query):filterMeasurements([result],{runIds:[source.runId]});
      // An immutable summary remains historical, but excluded inputs cannot be
      // treated as the current representative result in the Analysis projection.
      const validity=currentSubjectMeasurementValidity(measurements.validityDecisions);
      return {...source,measurements:{...measurements,summaries:measurements.summaries.filter(summary=>summary.sourceMeasurementIds.every(id=>validity.get(id)?.state!=='EXCLUDED'))}};
    });
  }
  async authoredAnalysisSources(catalog:ReferenceCatalog) {
    const snapshots=await this.repositories.run.listSnapshots();
    return (await Promise.all(snapshots.map(async snapshot=>{
      const profile:LifecycleAuthoringProfile={studyId:snapshot.series.id.replace(/^series-/,'') as SeriesSlug,studyLabel:snapshot.series.name,workspaceContextLabel:snapshot.area,catalog,targetBindings:[],actor:'Analysis projection'};
      const measurements=await this.measurements.query({runIds:[snapshot.id]});
      return authoredAnalysisSource({...createEmptyLifecycleState(snapshot,profile),measurementResults:measurements},catalog);
    }))).filter((s):s is AnalysisMeasurementSource=>Boolean(s));
  }
}
