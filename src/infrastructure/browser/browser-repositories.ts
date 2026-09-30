import { updateReasoning, type ReasoningEnvelope } from '@/src/application/reasoning-record';
import { emptyMeasurements, updateMeasurementEnvelope, type MeasurementEnvelope } from '@/src/application/measurement-record';
import { definitions } from '@/src/mock/reference';
import { updateExecutionEnvelope, type ExecutionEnvelope } from '@/src/application/execution-record';
import { createInitialStudySetup } from '@/src/features/experiment-series/study-setup-model';
import { createRunFromEntry } from '@/src/features/experiment-series/run-entry-model';
import { savedAnalysisViewSchema, type SavedAnalysisView } from '@/src/domain/analysis';
import { subjectMeasurementResultSetSchema } from '@/src/domain/measurement/subject-measurement';
import type {
  ApplicationRepositories,
  DecisionRecord,
  EvaluationRepository,
  ExecutionRepository,
  MeasurementRepository,
  PlanningWorkspaceRecord,
  MeasurementQuery,
  RepositoryCommand,
  RunRepository,
  SavedAnalysisRepository,
  StudyRepository,
} from '@/src/application/repository-ports';
import { ApplicationError } from '@/src/application/repository-ports';
import { filterMeasurements } from '@/src/application/measurement-query';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import type {
  AuthoredLifecycleState,
} from '@/src/features/run-registration/lifecycle-authoring';
import type { ActualExecutionEvidence } from '@/src/features/run-registration/actual-execution-model';
import type { EngineerEvaluationRecord } from '@/src/features/run-registration/evaluation-grid-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { restorePlanningContext } from '@/src/features/run-registration/planning-storage';
import { validatePlanningSnapshot } from '@/src/features/run-registration/planning-model';

type Envelope<T> = { version: number; commandIds: string[]; value: T };

const key = {
  study: (slug: string) => `dxt:study-setup:${slug}:current`,
  run: (id: string) => `dxt:repository:run:v1:${id}`,
  createdRun: (slug: string, number?: number) =>
    number ? `dxt:created-run:v1:${slug}:${number}` : `dxt:created-run:v1:${slug}`,
  planning: (id: string) => `dxt-run-planning-v1:${id}`,
  execution: (id: string) => `dxt:repository:execution:v1:${id}`,
  measurement: (id: string) => `dxt:repository:measurement:v1:${id}`,
  measurementIndex: 'dxt:repository:measurement:v1:index',
  evaluation: (id: string) => `dxt:repository:evaluation:v1:${id}`,
  decision: (id: string) => `dxt:repository:decision:v1:${id}`,
  lifecycle: (id: string) => `dxt:lifecycle-authoring:v1:${id}`,
  lifecycleIndex: 'dxt:lifecycle-authoring:v1:index',
  runIndex: 'dxt:repository:run:v1:index',
  analysis: 'dxt:analysis:saved-views:v1',
};

function readJson<T>(storageKey: string): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (cause) {
    throw new ApplicationError('PERSISTENCE', 'Saved browser data could not be read.', { cause });
  }
}

function readEnvelope<T>(storageKey: string): Envelope<T> | null {
  return readJson<Envelope<T>>(storageKey);
}

function writeEnvelope<T>(storageKey: string, value: T, command: RepositoryCommand) {
  const current = readEnvelope<T>(storageKey);
  if (current?.commandIds.includes(command.commandId)) return;
  if (command.expectedVersion !== undefined && (current?.version ?? 0) !== command.expectedVersion)
    throw new ApplicationError('CONFLICT', 'The saved record changed before this command completed.');
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: (current?.version ?? 0) + 1,
      commandIds: [...(current?.commandIds ?? []).slice(-19), command.commandId],
      value,
    } satisfies Envelope<T>));
  } catch (cause) {
    throw new ApplicationError('PERSISTENCE', 'The change could not be saved in this browser.', { cause });
  }
}

function legacyLifecycle(runId: string): AuthoredLifecycleState | null {
  const candidate = readJson<AuthoredLifecycleState>(key.lifecycle(runId));
  if (!candidate || candidate.version !== 1 || candidate.runId !== runId) return null;
  try {
    return { ...candidate, measurementResults: subjectMeasurementResultSetSchema.parse(candidate.measurementResults) };
  } catch { return null; }
}

export class BrowserStudyRepository implements StudyRepository {
  async getSetup(seriesSlug: SeriesSlug) {
    const candidate = readJson<StudySetupSnapshot>(key.study(seriesSlug));
    return candidate?.seriesSlug === seriesSlug ? candidate : null;
  }
  async saveSetup(setup: StudySetupSnapshot, command: RepositoryCommand) {
    writeEnvelopeCompatible(key.study(setup.seriesSlug), setup, command);
  }
}

function writeEnvelopeCompatible<T>(storageKey: string, value: T, command: RepositoryCommand) {
  // Keep the frozen v1 payload readable by older routes while adapters own serialization.
  try { window.localStorage.setItem(storageKey, JSON.stringify(value)); }
  catch (cause) { throw new ApplicationError('PERSISTENCE', 'The change could not be saved in this browser.', { cause }); }
  void command;
}

export class BrowserRunRepository implements RunRepository {
  async createFromPreviousRun(sourceId:string,decisionId:string,command:RepositoryCommand){const d=await new BrowserDecisionRepository().getByRun(sourceId);if(d?.context?.decision.id!==decisionId||!d.nextRunPreview)throw new ApplicationError('NOT_FOUND','Saved Next Run preview is unavailable.');return this.saveSnapshot(d.nextRunPreview.snapshot,command);}

  constructor(private readonly configuration: ApplicationRepositories['configuration']) {}
  async createFromStudyDefault(slug: SeriesSlug, command: RepositoryCommand) {
    const setup = await new BrowserStudyRepository().getSetup(slug) ?? createInitialStudySetup(slug, this.configuration);
    return this.saveSnapshot(createRunFromEntry(slug, 'STUDY_DEFAULT', setup), command);
  }
  async getSnapshot(runId: string) {
    return readEnvelope<RunPlanningSnapshot>(key.run(runId))?.value ?? legacyLifecycle(runId)?.snapshot ?? null;
  }
  async getCreatedRun(seriesSlug: SeriesSlug, runNumber?: number) {
    const candidate = readJson<RunPlanningSnapshot>(key.createdRun(seriesSlug, runNumber));
    return candidate && validatePlanningSnapshot(candidate).length === 0 ? candidate : null;
  }
  async listSnapshots() {
    const currentIds = readJson<string[]>(key.runIndex) ?? [];
    const legacyIds = readJson<string[]>(key.lifecycleIndex) ?? [];
    const ids = [...new Set([...currentIds, ...legacyIds])];
    return (await Promise.all(ids.map((id) => this.getSnapshot(id)))).filter(
      (item): item is RunPlanningSnapshot => Boolean(item),
    );
  }
  async saveSnapshot(snapshot: RunPlanningSnapshot, command: RepositoryCommand) {
    writeEnvelope(key.run(snapshot.id), snapshot, command);
    const ids = new Set(readJson<string[]>(key.runIndex) ?? []);
    ids.add(snapshot.id);
    writeEnvelopeCompatible(key.runIndex, [...ids], command);
    writeEnvelopeCompatible(key.createdRun(snapshot.series.id.replace(/^series-/, '') as SeriesSlug, snapshot.runNumber), snapshot, command);
    writeEnvelopeCompatible(key.createdRun(snapshot.series.id.replace(/^series-/, '') as SeriesSlug), snapshot, command);
    return (await this.getSnapshot(snapshot.id))!;
  }
  async getPlanningWorkspace(runId: string) {
    const snapshot = await this.getSnapshot(runId);
    if (!snapshot) return null;
    const restored = restorePlanningContext(snapshot, window.localStorage.getItem(key.planning(runId)), this.configuration);
    return restored ? { snapshot: { ...snapshot, assignments: restored.assignments }, ranges: restored.ranges, manualFocus: restored.manualFocus } : null;
  }
  async savePlanningWorkspace(record: PlanningWorkspaceRecord, command: RepositoryCommand) {
    writeEnvelopeCompatible(key.planning(record.snapshot.id), {
      version: 1, runId: record.snapshot.id, ranges: record.ranges,
      assignments: record.snapshot.assignments, manualFocus: record.manualFocus,
    }, command);
    writeEnvelope(key.run(record.snapshot.id), record.snapshot, command);
  }
}

export class BrowserExecutionRepository implements ExecutionRepository {
  private load(runId: string): ExecutionEnvelope {
    const current = readJson<ExecutionEnvelope>(`${key.execution(runId)}:versioned`);
    if (current) return current;
    const legacy = readEnvelope<ActualExecutionEvidence[]>(key.execution(runId));
    return { version: legacy?.version ?? 0, records: legacy?.value ?? legacyLifecycle(runId)?.actualEvidence ?? [], receipts: {} };
  }
  async getStateByRun(runId: string) { const value = this.load(runId); return { version: value.version, records: value.records }; }
  async getByRun(runId: string) { return (await this.getStateByRun(runId)).records; }
  async saveByRun(runId: string, records: ActualExecutionEvidence[], command: RepositoryCommand) {
    const next = updateExecutionEnvelope(this.load(runId), records, command);
    try { window.localStorage.setItem(`${key.execution(runId)}:versioned`, JSON.stringify(next)); }
    catch (cause) { throw new ApplicationError('PERSISTENCE', 'Execution could not be saved in this browser.', { cause }); }
    return structuredClone(next.receipts[command.commandId].result);
  }
}
export class BrowserMeasurementRepository implements MeasurementRepository {
  private load(runId:string):MeasurementEnvelope {
    const current=readJson<MeasurementEnvelope>(`${key.measurement(runId)}:versioned`);
    if(current)return current;
    const legacy=readEnvelope<ReturnType<typeof subjectMeasurementResultSetSchema.parse>>(key.measurement(runId));
    return {version:legacy?.version??0,record:legacy?.value??legacyLifecycle(runId)?.measurementResults??emptyMeasurements(),receipts:{}};
  }
  async getCatalog(){return structuredClone(definitions);}
  async getStateByRun(runId:string){const value=this.load(runId);return {version:value.version,record:value.record};}
  async getByRun(runId:string){return (await this.getStateByRun(runId)).record;}
  async listDatasets(){const ids=[...new Set([...(readJson<string[]>(key.measurementIndex)??[]),...(readJson<string[]>(key.lifecycleIndex)??[])])];return (await Promise.all(ids.map(id=>this.getByRun(id)))).flatMap(record=>record.datasets.map(dataset=>({dataset,parameterIds:[...new Set(record.values.filter(v=>v.datasetId===dataset.id).flatMap(v=>v.parameterDefinitionId?[v.parameterDefinitionId]:[]))],subjectIds:[...new Set(record.values.filter(v=>v.datasetId===dataset.id).map(v=>v.subjectId))]})));}
  async query(query:MeasurementQuery){const ids=query.runIds??readJson<string[]>(key.measurementIndex)??[];return filterMeasurements(await Promise.all(ids.map(id=>this.getByRun(id))),query);}
  async saveByRun(runId:string,record:ReturnType<typeof subjectMeasurementResultSetSchema.parse>,command:RepositoryCommand){
    const next=updateMeasurementEnvelope(this.load(runId),record,command);
    try {
      window.localStorage.setItem(`${key.measurement(runId)}:versioned`,JSON.stringify(next));
      const ids=readJson<string[]>(key.measurementIndex)??[];
      window.localStorage.setItem(key.measurementIndex,JSON.stringify([...new Set([...ids,runId])]));
    } catch(cause){throw new ApplicationError('PERSISTENCE','Measurement could not be saved in this browser.',{cause});}
    return structuredClone(next.receipts[command.commandId].result);
  }
}
export class BrowserEvaluationRepository implements EvaluationRepository {
 private load(id:string):ReasoningEnvelope<EngineerEvaluationRecord[]> {return readJson(`${key.evaluation(id)}:versioned`)??{version:0,record:readEnvelope<EngineerEvaluationRecord[]>(key.evaluation(id))?.value??legacyLifecycle(id)?.engineerEvaluations??[],receipts:{}};}
 async getStateByRun(id:string){const v=this.load(id);return {version:v.version,record:v.record};}
 async getByRun(id:string){return (await this.getStateByRun(id)).record;}
 async saveByRun(id:string,record:EngineerEvaluationRecord[],command:RepositoryCommand){window.localStorage.setItem(`${key.evaluation(id)}:versioned`,JSON.stringify(updateReasoning(this.load(id),record,command)));}
}
export class BrowserDecisionRepository {
 private load(id:string):ReasoningEnvelope<DecisionRecord|null>{const old=legacyLifecycle(id);return readJson(`${key.decision(id)}:versioned`)??{version:0,record:readEnvelope<DecisionRecord>(key.decision(id))?.value??(old?{context:old.decisionContext,nextRunPreview:old.nextRunPreview}:null),receipts:{}};}
 async getStateByRun(id:string){const v=this.load(id);return {version:v.version,record:v.record};}
 async getByRun(id:string){return (await this.getStateByRun(id)).record;}
 async saveByRun(id:string,record:DecisionRecord,command:RepositoryCommand){window.localStorage.setItem(`${key.decision(id)}:versioned`,JSON.stringify(updateReasoning(this.load(id),record,command)));}
}
export class BrowserSavedAnalysisRepository implements SavedAnalysisRepository {
  async list() { const raw = readJson<unknown>(key.analysis); try { return raw ? savedAnalysisViewSchema.array().parse(raw) : []; } catch { return []; } }
  async get(id: string) { return (await this.list()).find((item) => item.id === id) ?? null; }
  async getState(id: string) { const v=readJson<ReasoningEnvelope<SavedAnalysisView|null>>(`${key.analysis}:state:${id}`);return {version:v?.version??0,record:await this.get(id)}; }
  async save(view: SavedAnalysisView, _command: RepositoryCommand) {
    const parsed = savedAnalysisViewSchema.parse(view);
    const current=readJson<ReasoningEnvelope<SavedAnalysisView|null>>(`${key.analysis}:state:${view.id}`)??{version:0,record:await this.get(view.id),receipts:{}};
    const next=updateReasoning(current,parsed,_command);
    writeEnvelopeCompatible(key.analysis, [next.record!, ...(await this.list()).filter((item) => item.id !== parsed.id)], _command);
    window.localStorage.setItem(`${key.analysis}:state:${view.id}`,JSON.stringify(next));
  }
}

export function createBrowserRepositories(configuration: ApplicationRepositories['configuration']): ApplicationRepositories {
  return {
    configuration,
    study: new BrowserStudyRepository(), run: new BrowserRunRepository(configuration),
    execution: new BrowserExecutionRepository(), measurement: new BrowserMeasurementRepository(),
    evaluation: new BrowserEvaluationRepository(), decision: new BrowserDecisionRepository(),
    savedAnalysis: new BrowserSavedAnalysisRepository(),
  };
}
