import { bootstrapSetupSchema, initialReasoningSchema } from '@/src/application/study-bootstrap';
import { studyCreateSchema, studySlugSchema } from '@/src/application/study-creation';
import {discoveryQuerySchema} from '@/src/application/discovery';
import {savedAnalysisSharingSchema} from '@/src/application/saved-analysis-access';
import { runCreationRequestSchema } from '@/src/application/run-creation';
import { confirmStudyReasoningSchema } from '@/src/application/study-readiness';
import type {PlanningWorkspaceRecord} from '@/src/application/repository-ports';
import { configurationMutationSchema } from '@/src/application/configuration-authoring';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import { savedAnalysisViewSchema } from '@/src/domain/analysis';
import {evaluationSchema,decisionContextSchema} from '@/src/application/reasoning-record';
import type {DecisionRecord} from '@/src/application/repository-ports';
import { subjectMeasurementResultSetSchema } from '@/src/domain/measurement/subject-measurement';
import { executionEvidenceSchema, executionCommandSchema } from '@/src/application/execution-record';
import { z } from 'zod';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import { ApplicationError } from '@/src/application/repository-ports';

// Persisted slugs are generic; legacy facade signatures retain their display-scenario type.
const slug = studySlugSchema.transform(value => value as import('@/src/features/experiment-series/run-entry-model').SeriesSlug);
const strings=z.array(z.string().min(1)).max(10000).optional();
const measurementQuery=z.object({savedAnalysisId:z.string().min(1).optional(),runIds:strings,datasetIds:strings,parameterDefinitionIds:strings,subjectIds:strings,siteIdentities:strings,coordinateDefinitionIds:strings,validity:z.enum(['INCLUDED','EXCLUDED']).optional(),limit:z.number().int().min(1).max(10000).optional()});
export const requestSchema = z.discriminatedUnion('operation', [
 z.object({operation:z.literal('study.creation.options')}),
 z.object({operation:z.literal('study.create'),input:studyCreateSchema,commandId:z.string().min(1).max(200)}),
 z.object({operation:z.literal('study.identity'),slug:studySlugSchema}),
 z.object({operation:z.literal('study.bootstrap.load'),slug:studySlugSchema}),
 z.object({operation:z.literal('study.bootstrap.save'),slug:studySlugSchema,input:bootstrapSetupSchema,commandId:z.string().min(1).max(200)}),
 z.object({operation:z.literal('study.reasoning.initialize'),slug:studySlugSchema,input:initialReasoningSchema,commandId:z.string().min(1).max(200)}),
 z.object({operation:z.literal('study.list'),query:discoveryQuerySchema.optional()}),
 z.object({operation:z.literal('dashboard.query'),query:discoveryQuerySchema.optional()}),
 z.object({operation:z.literal('run.summaries'),query:discoveryQuerySchema.optional()}),
 z.object({operation:z.literal('search.query'),query:discoveryQuerySchema.optional(),kind:z.enum(['ALL','STUDY','RUN','SAVED_ANALYSIS']).default('ALL')}),
 z.object({operation:z.literal('study.edit'),slug:studySlugSchema,displayName:z.string().trim().min(1).max(200),intent:z.string().max(4000),expectedVersion:z.number().int().positive()}),
 z.object({operation:z.literal('study.permissions'),slug:studySlugSchema}),
 z.object({operation:z.literal('run.preview'),input:runCreationRequestSchema}),
 z.object({operation:z.literal('run.create.preview'),input:runCreationRequestSchema,fingerprint:z.string().min(1),command:z.object({commandId:z.string().min(1)})}),
 z.object({operation:z.literal('study.readiness'),slug,pin:z.string().min(1)}),
 z.object({operation:z.literal('study.reasoning.confirm'),slug,input:confirmStudyReasoningSchema,command:z.object({commandId:z.string().min(1)})}),
 z.object({operation:z.literal('run.plan.save'),record:z.custom<PlanningWorkspaceRecord>(v=>!!v&&typeof v==='object'&&'snapshot' in v&&'ranges' in v&&'manualFocus' in v),command:executionCommandSchema}),
 z.object({operation:z.literal('configuration.load')}),
 z.object({operation:z.literal('configuration.execute'),request:configurationMutationSchema,commandId:z.string().min(1)}),
 z.object({operation:z.literal('study.save'),setup:z.custom<StudySetupSnapshot>(v=>!!v&&typeof v==='object'&&'operations' in v),command:executionCommandSchema}),
 z.object({operation:z.literal('analysis.list')}),
 z.object({operation:z.literal('analysis.load'),id:z.string().min(1)}),
 z.object({operation:z.literal('analysis.access'),id:z.string().min(1)}),
 z.object({operation:z.literal('analysis.share'),id:z.string().min(1),sharing:savedAnalysisSharingSchema,command:executionCommandSchema}),
 z.object({operation:z.literal('analysis.delete'),id:z.string().min(1)}),
 z.object({operation:z.literal('analysis.transfer'),id:z.string().min(1)}),
 z.object({operation:z.literal('analysis.save'),view:savedAnalysisViewSchema,command:executionCommandSchema}),
 z.object({operation:z.literal('run.next'),sourceRunId:z.string().min(1),decisionId:z.string().min(1),commandId:z.string().min(1)}),
 z.object({operation:z.literal('evaluation.context'),runId:z.string().min(1)}),
 z.object({operation:z.literal('evaluation.load'),runId:z.string().min(1)}),
 z.object({operation:z.literal('decision.load'),runId:z.string().min(1)}),
 z.object({operation:z.literal('evaluation.save'),runId:z.string().min(1),records:evaluationSchema.array(),command:executionCommandSchema}),
 z.object({operation:z.literal('decision.save'),runId:z.string().min(1),record:z.object({context:decisionContextSchema,nextRunPreview:z.unknown().nullable()}),command:executionCommandSchema}),
 z.object({operation:z.literal('measurement.load'),runId:z.string().min(1)}),
 z.object({operation:z.literal('measurement.query'),query:measurementQuery}),
 z.object({operation:z.literal('measurement.catalog'),packageId:z.string().min(1)}),
 z.object({operation:z.literal('measurement.datasets')}),
 z.object({operation:z.literal('measurement.save'),runId:z.string().min(1),record:subjectMeasurementResultSetSchema,command:executionCommandSchema}),
  z.object({ operation: z.literal('execution.load'), runId: z.string().min(1) }),
  z.object({ operation: z.literal('execution.save'), runId: z.string().min(1), records: z.array(executionEvidenceSchema), command: executionCommandSchema }),
  z.object({ operation: z.literal('study.load'), slug:studySlugSchema }),
  z.object({ operation: z.literal('run.create'), slug, commandId: z.uuid() }),
  z.object({ operation: z.literal('run.created'), slug, runNumber: z.number().int().positive().optional() }),
  z.object({ operation: z.literal('run.get'), runId: z.string().min(1) }),
  z.object({ operation: z.literal('run.list') }),
  z.object({ operation: z.literal('run.planning'), runId: z.string().min(1) }),
]);
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  try {
    return response(await productionRequest({operation:'bootstrap'}));
  } catch { return response({ error: 'Production configuration could not be loaded.' }, 503); }
}
export async function POST(request: Request) { return handleRepositoryRequest(request,productionRequest); }
/** Server-only injection seam used by API contract tests; never selected by request data. */
export async function handleRepositoryRequest(request:Request,execute:typeof productionRequest) {
  try {
    const input = requestSchema.parse(await request.json());
    return response(await execute(input, dispatchRepository));
  } catch (error) {
    if (error instanceof z.ZodError) return response({error:'Invalid repository request.'},400);
    if (error instanceof ApplicationError) return response({error:error.message,code:error.code},error.code==='FORBIDDEN'?403:error.code==='NOT_FOUND'?404:409);
    return response({error:'Production repository request failed.'},503);
  }
}
export async function dispatchRepository(app: import('@/src/application/dxt-application').DxtApplication, raw:Record<string,unknown>):Promise<unknown>{
 const input=requestSchema.parse(raw);
 switch (input.operation) {
      case 'run.preview': return (await app.runs.previewCreation(input.input));
      case 'run.create.preview': return (await app.runs.createFromPreview(input.input,input.fingerprint,input.command.commandId));
      case 'study.readiness': return (await app.repositories.study.getLifecycleReadiness!(input.slug,input.pin));
      case 'study.reasoning.confirm': await app.repositories.study.confirmReasoningContext!(input.slug,input.input,input.command);return (null);
      case 'configuration.load': return (await app.configurationAuthoringBoundary!.load());
      case 'configuration.execute': return (await app.configurationAuthoringBoundary!.execute(input.request,input.commandId));
      case 'run.plan.save': await app.repositories.run.savePlanningWorkspace(input.record,input.command);return (null);
      case 'study.save': await app.repositories.study.saveSetup(input.setup,input.command);return (null);
      case 'analysis.list': return (await app.savedAnalyses.list());
      case 'analysis.load': return (await app.savedAnalyses.getState(input.id));
      case 'study.creation.options':
      case 'study.create':
      case 'study.identity':
      case 'dashboard.query':
      case 'run.summaries':
      case 'search.query':
      case 'study.list':
      case 'analysis.access':
      case 'analysis.share':
      case 'analysis.delete':
      case 'analysis.transfer': throw new ApplicationError('FORBIDDEN','Saved Analysis access commands require the authorized production boundary.');
      case 'analysis.save': await app.savedAnalyses.save(input.view,input.command.commandId,input.command.expectedVersion);return (null);
      case 'run.next': return (await app.runs.createNextFromPrevious(input.sourceRunId,input.decisionId,input.commandId));
      case 'evaluation.context': return (await app.reasoning.context(input.runId));
      case 'evaluation.load': return (await app.reasoning.loadEvaluation(input.runId));
      case 'decision.load': return (await app.reasoning.loadDecision(input.runId));
      case 'evaluation.save': await app.reasoning.saveEvaluation(input.runId,input.records,input.command);return (null);
      case 'decision.save': await app.reasoning.saveDecision(input.runId,input.record as DecisionRecord,input.command);return (null);
      case 'measurement.load': return (await app.measurements.load(input.runId));
      case 'measurement.query': return (await app.measurements.query(input.query));
      case 'measurement.catalog': return (await app.repositories.measurement.getCatalog(input.packageId));
      case 'measurement.datasets': return (await app.repositories.measurement.listDatasets());
      case 'measurement.save': return (await app.measurements.save(input.runId,input.record,input.command));
      case 'execution.load': return (await app.executions.load(input.runId));
      case 'execution.save': return (await app.executions.save(input.runId, input.records, input.command));
      case 'study.load': {
        const setup = await app.studies.load(input.slug as import('@/src/features/experiment-series/run-entry-model').SeriesSlug);
        if (!setup) throw new ApplicationError('NOT_FOUND', 'Study Setup is not persisted.');
        return (setup);
      }
      case 'run.create': return (await app.createRunFromStudy(input.slug, 'STUDY_DEFAULT', input.commandId));
      case 'run.created': {
        const run = await app.runs.loadCreated(input.slug, input.runNumber);
        if (!run) throw new ApplicationError('NOT_FOUND', 'Run is not persisted.');
        return (run);
      }
      case 'run.get': return (await app.repositories.run.getSnapshot(input.runId));
      case 'run.list': return (await app.repositories.run.listSnapshots());
      case 'run.planning': return (await app.runs.loadPlanning(input.runId));
    }
}
