import { updateReasoning, type ReasoningEnvelope } from '@/src/application/reasoning-record';
import { emptyMeasurements, updateMeasurementEnvelope, type MeasurementEnvelope } from '@/src/application/measurement-record';
import { definitions } from '@/src/mock/reference';
import { updateExecutionEnvelope, type ExecutionEnvelope } from '@/src/application/execution-record';
import { createRunFromEntry } from '@/src/features/experiment-series/run-entry-model';
import { ApplicationError } from '@/src/application/repository-ports';
import type { SavedAnalysisView } from '@/src/domain/analysis';
import type {
  ApplicationRepositories,
  DecisionRecord,
  PlanningWorkspaceRecord,
  RepositoryCommand,
} from '@/src/application/repository-ports';
import { filterMeasurements } from '@/src/application/measurement-query';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import type { EngineerEvaluationRecord } from '@/src/features/run-registration/evaluation-grid-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';

const clone = <T>(value: T): T => structuredClone(value);

export function createInMemoryRepositories(
  configuration: ApplicationRepositories['configuration'],
): ApplicationRepositories {
  const studies = new Map<SeriesSlug, StudySetupSnapshot>();
  const runs = new Map<string, RunPlanningSnapshot>();
  const planning = new Map<string, PlanningWorkspaceRecord>();
  const execution = new Map<string, ExecutionEnvelope>();
  const measurement = new Map<string, MeasurementEnvelope>();
  const evaluation = new Map<string, ReasoningEnvelope<EngineerEvaluationRecord[]>>();
  const decisions = new Map<string, ReasoningEnvelope<DecisionRecord | null>>();
  const analyses = new Map<string, ReasoningEnvelope<SavedAnalysisView | null>>();
  const save = <T>(store: Map<string, T>, id: string, value: T, _command: RepositoryCommand) => {
    store.set(id, clone(value));
  };
  return {
    configuration,
    study: {
      async getSetup(slug) { const value = studies.get(slug); return value ? clone(value) : null; },
      async saveSetup(value) { studies.set(value.seriesSlug, clone(value)); },
    },
    run: {
      async createFromPreviousRun(sourceId,decisionId,command){const d=decisions.get(sourceId)?.record;if(d?.context?.decision.id!==decisionId||!d.nextRunPreview)throw new ApplicationError('NOT_FOUND','Saved Next Run preview is unavailable.');return this.saveSnapshot(d.nextRunPreview.snapshot,command);},
      async createFromStudyDefault(slug, command) {
        const setup = studies.get(slug);
        if (!setup) throw new ApplicationError('NOT_FOUND', 'Study Setup is not available.');
        return this.saveSnapshot(createRunFromEntry(slug, 'STUDY_DEFAULT', setup), command);
      },
      async getSnapshot(id) { const value = runs.get(id); return value ? clone(value) : null; },
      async listSnapshots() { return [...runs.values()].map(clone); },
      async getCreatedRun(slug, runNumber) {
        const value = [...runs.values()].find((item) => item.series.id.replace(/^series-/, '') === slug && (runNumber === undefined || item.runNumber === runNumber));
        return value ? clone(value) : null;
      },
      async saveSnapshot(value, command) { save(runs, value.id, value, command); return clone(value); },
      async getPlanningWorkspace(id) { const value = planning.get(id); return value ? clone(value) : null; },
      async savePlanningWorkspace(value, command) { save(planning, value.snapshot.id, value, command); save(runs, value.snapshot.id, value.snapshot, command); },
    },
    execution: {
      async getStateByRun(id) { const value = execution.get(id); return clone({ version: value?.version ?? 0, records: value?.records ?? [] }); },
      async getByRun(id) { return (await this.getStateByRun(id)).records; },
      async saveByRun(id, value, command) {
        const next = updateExecutionEnvelope(execution.get(id) ?? { version: 0, records: [], receipts: {} }, value, command);
        execution.set(id, next);
        return clone(next.receipts[command.commandId].result);
      },
    },
    measurement: {
      async getCatalog() { return clone(definitions); },
      async listDatasets() { return [...measurement.values()].flatMap(({record})=>record.datasets.map(dataset=>({dataset:clone(dataset),parameterIds:[...new Set(record.values.filter(v=>v.datasetId===dataset.id).flatMap(v=>v.parameterDefinitionId?[v.parameterDefinitionId]:[]))],subjectIds:[...new Set(record.values.filter(v=>v.datasetId===dataset.id).map(v=>v.subjectId))]}))); },
      async getStateByRun(id) { const value=measurement.get(id);return clone({version:value?.version??0,record:value?.record??emptyMeasurements()}); },
      async getByRun(id) { return (await this.getStateByRun(id)).record; },
      async query(query) { return filterMeasurements([...measurement.values()].map(v=>clone(v.record)), query); },
      async saveByRun(id, value, command) { const next=updateMeasurementEnvelope(measurement.get(id)??{version:0,record:emptyMeasurements(),receipts:{}},value,command);measurement.set(id,next);return clone(next.receipts[command.commandId].result); },
    },
    evaluation: {
      async getStateByRun(id) { const v=evaluation.get(id);return clone({version:v?.version??0,record:v?.record??[]}); },
      async getByRun(id) { return (await this.getStateByRun(id)).record; },
      async saveByRun(id,value,command) { evaluation.set(id,updateReasoning(evaluation.get(id)??{version:0,record:[],receipts:{}},value,command)); },
    },
    decision: {
      async getStateByRun(id) { const v=decisions.get(id);return clone({version:v?.version??0,record:v?.record??null}); },
      async getByRun(id) { return (await this.getStateByRun(id)).record; },
      async saveByRun(id,value,command) { decisions.set(id,updateReasoning(decisions.get(id)??{version:0,record:null,receipts:{}},value,command)); },
    },
    savedAnalysis: {
      async list() { return [...analyses.values()].flatMap(v => v.record ? [clone(v.record)] : []); },
      async getState(id) { const v=analyses.get(id);return clone({version:v?.version??0,record:v?.record??null}); },
      async get(id) { return (await this.getState(id)).record; },
      async save(value, command) { analyses.set(value.id,updateReasoning(analyses.get(value.id)??{version:0,record:null,receipts:{}},value,command)); },
    },
  };
}
