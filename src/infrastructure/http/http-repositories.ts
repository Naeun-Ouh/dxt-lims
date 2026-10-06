import type { ConfigurationAuthoringBoundary } from '@/src/application/configuration-authoring';
import { z } from 'zod';
import type { ApplicationRepositories } from '@/src/application/repository-ports';
import { ApplicationError } from '@/src/application/repository-ports';
import { unsupportedRepositories } from '@/src/infrastructure/postgres/unsupported-repositories';

async function request<T>(body: unknown): Promise<T> {
  const response = await fetch('/api/repository', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) {
    const error = z.object({ code: z.enum(['NOT_FOUND', 'CONFLICT', 'VALIDATION', 'PERSISTENCE', 'FORBIDDEN']).optional(), error: z.string() }).safeParse(value);
    throw new ApplicationError(error.success ? error.data.code ?? 'PERSISTENCE' : 'PERSISTENCE', error.success ? error.data.error : 'Repository request failed.');
  }
  return value as T;
}
export function createHttpRepositories(configuration: ApplicationRepositories['configuration']): ApplicationRepositories {
  const unsupported = async (): Promise<never> => { throw new ApplicationError('VALIDATION', 'This command is outside Production Adapter Slices 1–3.'); };
  return {
    ...unsupportedRepositories(), configuration,
    study: { getLifecycleReadiness:(slug,pin)=>request({operation:'study.readiness',slug,pin}), confirmReasoningContext:(slug,input,command)=>request({operation:'study.reasoning.confirm',slug,input,command}), getSetup: (slug) => request({ operation: 'study.load', slug }), saveSetup:(setup,command)=>request({operation:'study.save',setup,command}) },
    measurement: {
      getCatalog:(packageId)=>request({operation:'measurement.catalog',packageId}),
      listDatasets:()=>request({operation:'measurement.datasets'}),
      getStateByRun:(runId)=>request({operation:'measurement.load',runId}),
      async getByRun(runId){return (await this.getStateByRun(runId)).record;},
      query:(query)=>request({operation:'measurement.query',query}),
      saveByRun:(runId,record,command)=>request({operation:'measurement.save',runId,record,command}),
    },
    savedAnalysis: {
      getAccess:id=>request({operation:'analysis.access',id}),
      share:(id,sharing,command)=>request({operation:'analysis.share',id,sharing,command}),
      list:()=>request({operation:'analysis.list'}),
      getState:(id)=>request({operation:'analysis.load',id}),
      async get(id){return (await this.getState(id)).record;},
      save:(view,command)=>request({operation:'analysis.save',view,command}),
    },
    evaluation: {
      getContext:(runId)=>request({operation:'evaluation.context',runId}),
      getStateByRun:(runId)=>request({operation:'evaluation.load',runId}),
      async getByRun(runId){return (await this.getStateByRun(runId)).record;},
      saveByRun:(runId,records,command)=>request({operation:'evaluation.save',runId,records,command}),
    },
    decision: {
      getStateByRun:(runId)=>request({operation:'decision.load',runId}),
      async getByRun(runId){return (await this.getStateByRun(runId)).record;},
      saveByRun:(runId,record,command)=>request({operation:'decision.save',runId,record,command}),
    },
    execution: {
      getStateByRun: (runId) => request({ operation: 'execution.load', runId }),
      async getByRun(runId) { return (await this.getStateByRun(runId)).records; },
      saveByRun: (runId, records, command) => request({ operation: 'execution.save', runId, records, command }),
    },
    run: {
      previewCreation:(input)=>request({operation:'run.preview',input}),
      createFromPreview:(input,fingerprint,command)=>request({operation:'run.create.preview',input,fingerprint,command}),
      createFromPreviousRun:(sourceRunId,decisionId,command)=>request({operation:'run.next',sourceRunId,decisionId,commandId:command.commandId}),
      createFromStudyDefault: (slug, command) => request({ operation: 'run.create', slug, commandId: command.commandId }),
      getSnapshot: (runId) => request({ operation: 'run.get', runId }),
      getCreatedRun: (slug, runNumber) => request({ operation: 'run.created', slug, runNumber }),
      listSnapshots: () => request({ operation: 'run.list' }),
      getPlanningWorkspace: (runId) => request({ operation: 'run.planning', runId }),
      saveSnapshot: unsupported, savePlanningWorkspace: (record,command)=>request({operation:'run.plan.save',record,command}),
    },
  };
}

export const httpConfigurationAuthoring:ConfigurationAuthoringBoundary={load:()=>request({operation:'configuration.load'}),execute:(requestData,commandId)=>request({operation:'configuration.execute',request:requestData,commandId})};

export const loadStudyPermissions=(slug:string)=>request<import('@/src/application/authorization').StudyPermissions>({operation:'study.permissions',slug});

export const loadRunSummaries=(query:Partial<import('@/src/application/discovery').DiscoveryQuery>)=>request<import('@/src/application/discovery').DiscoveryPage<import('@/src/application/discovery').RunSummary>>({operation:'run.summaries',query});

export const httpStudyCreation: import('@/src/application/study-creation').StudyCreationRepository = {
  options: () => request({ operation: 'study.creation.options' }),
  create: (input, commandId) => request({ operation: 'study.create', input, commandId }),
  get: slug => request({ operation: 'study.identity', slug }),
};

export const httpStudyBootstrap = {
  load: (slug: string) =>
    request<import('@/src/application/study-bootstrap').StudyBootstrapState>({
      operation: 'study.bootstrap.load',
      slug,
    }),
  save: (
    slug: string,
    input: import('@/src/application/study-bootstrap').BootstrapSetupInput,
    commandId: string,
  ) =>
    request<import('@/src/application/study-bootstrap').StudyBootstrapState>({
      operation: 'study.bootstrap.save',
      slug,
      input,
      commandId,
    }),
  initialize: (
    slug: string,
    input: import('@/src/application/study-bootstrap').InitialReasoningInput,
    commandId: string,
  ) =>
    request({
      operation: 'study.reasoning.initialize',
      slug,
      input,
      commandId,
    }),
  preview: (slug: string) =>
    request<import('@/src/application/run-creation').AuthoritativeRunPreview>({
      operation: 'run.preview',
      input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
    }),
  create: (slug: string, fingerprint: string, commandId: string) =>
    request<
      import('@/src/features/run-registration/planning-model').RunPlanningSnapshot
    >({
      operation: 'run.create.preview',
      input: { seriesSlug: slug, source: 'STUDY_DEFAULT' },
      fingerprint,
      command: { commandId },
    }),
};
