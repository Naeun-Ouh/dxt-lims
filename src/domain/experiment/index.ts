import { z } from 'zod';
import {
  idSchema,
  timestampSchema,
  typedValueSchema,
  type ReferenceCatalog,
  type ExperimentTypeDefinition,
} from '../reference';
import type {
  Material,
  MaterialRevision,
  Sample,
  SampleRevision,
  MaterialNode,
  MaterialCompositionEdge,
  MaterialPropertyValue,
  MaterialUsage,
} from '../material';
import type {
  ExecutionEvent,
  PhysicalWafer,
  WaferIdentityObservation,
  WaferIdentityCandidate,
} from '../execution';
import type { MeasurementSummary } from '../measurement';
import type { Evidence } from '../evidence';
import type { Decision } from '../decision';
import type { ProjectContext } from '../project';
import type { OperationPlan, PlannedExecutionItem } from './operation-plan';
import { experimentConfigurationSnapshotSchema } from './configuration';
import { experimentalVariableRoleSchema } from './experimental-intent';
import type { RecipeAssignment } from './experimental-intent';
export {
  operationPlanSchema,
  processStepSchema,
  plannedExecutionItemSchema,
  type OperationPlan,
  type ProcessStep,
  type PlannedExecutionItem,
} from './operation-plan';
export const experimentSeriesSchema = z.object({
  id: idSchema,
  title: idSchema,
  experimentTypeDefinitionId: idSchema,
  owner: idSchema,
  status: z.enum(['Active', 'Completed', 'Paused']),
  createdAt: timestampSchema,
  defaultConfiguration: experimentConfigurationSnapshotSchema.optional(),
  targets: z
    .array(
      z.object({
        id: idSchema,
        parameterDefinitionId: idSchema,
        operator: z.enum(['GTE', 'LTE', 'BETWEEN', 'EQ']),
        threshold: z.number().nullable(),
        lowerBound: z.number().nullable(),
        upperBound: z.number().nullable(),
        unitDefinitionId: idSchema.nullable(),
      }),
    )
    .default([]),
  summaryResults: z
    .array(
      z.object({
        id: idSchema,
        title: z.string(),
        statement: z.string(),
        relatedRunIds: z.array(idSchema),
        relatedWaferRefs: z.array(idSchema),
        recordedAt: timestampSchema,
      }),
    )
    .default([]),
});
export const experimentTargetSchema = z.object({
  id: idSchema,
  statement: z.string().min(1),
  measurementDefinitionId: idSchema.nullable(),
});
export const experimentIntentSchema = z.object({
  id: idSchema,
  experimentSeriesId: idSchema,
  purpose: z.string().nullable(),
  hypothesis: z.string().nullable(),
  targets: z.array(experimentTargetSchema),
  createdAt: timestampSchema,
});
export const experimentRunSchema = z.object({
  id: idSchema,
  seriesId: idSchema,
  configurationPackageVersionId: idSchema,
  runNumber: z.number().int().positive(),
  title: idSchema,
  status: z.enum(['Planned', 'In progress', 'Completed']),
  startedAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(),
  previousRunId: idSchema.nullable(),
});
export const conditionValueSchema = z.object({
  id: idSchema,
  conditionDefinitionId: idSchema,
  value: typedValueSchema,
  intentRole: experimentalVariableRoleSchema.optional(),
  operationStepId: idSchema.nullable().optional(),
  waferSubjectId: idSchema.nullable().optional(),
  positionId: idSchema.nullable().optional(),
});

export const resourceUsageSchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  processStepId: idSchema,
  resourceDefinitionId: idSchema,
  waferSubjectId: idSchema.nullable(),
  intentRole: experimentalVariableRoleSchema,
  provenance: z.enum(['SERIES_DEFAULT', 'RUN_SNAPSHOT', 'WAFER_OVERRIDE']),
});
// A stable bindingKey distinguishes multiple samples in the same configured material condition.
export const materialConditionSchema = z.object({
  id: idSchema,
  conditionDefinitionId: idSchema,
  bindingKey: idSchema,
  materialUsageId: idSchema,
});
export const conditionSetSchema = z.object({
  id: idSchema,
  experimentRunId: idSchema,
  inheritedFromRunId: idSchema.nullable(),
  conditions: z.array(conditionValueSchema),
  materialConditions: z.array(materialConditionSchema),
});
export type ExperimentSeries = z.infer<typeof experimentSeriesSchema>;
export type ExperimentIntent = z.infer<typeof experimentIntentSchema>;
export type ExperimentTarget = z.infer<typeof experimentTargetSchema>;
export type ExperimentRun = z.infer<typeof experimentRunSchema>;
export type ResourceUsage = z.infer<typeof resourceUsageSchema>;
export type ConditionSet = z.infer<typeof conditionSetSchema>;
export type MaterialCondition = z.infer<typeof materialConditionSchema>;
export type ResolvedMaterialCondition = {
  condition: MaterialCondition;
  usage: MaterialUsage;
  sampleRevision: SampleRevision;
  sample: Sample;
  material: Material;
  materialRevision: MaterialRevision | null;
  rootNode: MaterialNode;
  nodes: MaterialNode[];
  compositionEdges: MaterialCompositionEdge[];
  propertyValues: MaterialPropertyValue[];
  evidence: Evidence[];
};
export type ExperimentContext = {
  series: ExperimentSeries;
  intent: ExperimentIntent;
  projectContext: ProjectContext[];
  run: ExperimentRun;
  experimentType: ExperimentTypeDefinition;
  definitions: ReferenceCatalog;
  conditionSet: ConditionSet;
  operationPlan: OperationPlan | null;
  plannedExecutionItems: PlannedExecutionItem[];
  materials: ResolvedMaterialCondition[];
  resourceUsages: ResourceUsage[];
  recipeAssignments: RecipeAssignment[];
  execution: ExecutionEvent[];
  physicalWafers: PhysicalWafer[];
  waferIdentityObservations: WaferIdentityObservation[];
  waferIdentityCandidates: WaferIdentityCandidate[];
  measurements: MeasurementSummary[];
  evidence: Evidence[];
  decision: Decision | null;
};
export function nextRunConcept(context: ExperimentContext) {
  return {
    seriesId: context.series.id,
    configurationPackageVersionId: context.run.configurationPackageVersionId,
    runNumber: context.run.runNumber + 1,
    previousRunId: context.run.id,
    inheritedFromRunId: context.run.id,
    operationSteps:
      context.operationPlan?.steps.map(
        ({ operationDefinitionId, order, label }) => ({
          operationDefinitionId,
          order,
          label,
        }),
      ) ?? [],
    conditions: context.conditionSet.conditions.map(
      ({
        conditionDefinitionId,
        value,
        intentRole,
        operationStepId,
        waferSubjectId,
        positionId,
      }) => ({
        conditionDefinitionId,
        value: { ...value },
        intentRole: intentRole ?? 'FIXED',
        operationStepId: operationStepId ?? null,
        waferSubjectId: waferSubjectId ?? null,
        positionId: positionId ?? null,
      }),
    ),
    materialConditions: context.materials.map((m) => ({
      conditionDefinitionId: m.condition.conditionDefinitionId,
      bindingKey: m.condition.bindingKey,
      sampleRevisionId: m.sampleRevision.id,
      role: m.usage.role,
      projectId: m.usage.projectId,
      waferSubjectId: m.usage.waferSubjectId,
      processStepId: m.usage.processStepId,
      intentRole: m.usage.intentRole,
    })),
    resourceUsages: context.resourceUsages.map(
      ({
        resourceDefinitionId,
        processStepId,
        waferSubjectId,
        intentRole,
      }) => ({
        resourceDefinitionId,
        processStepId,
        waferSubjectId,
        intentRole,
      }),
    ),
    recipeAssignments: context.recipeAssignments.map(
      ({ recipeRevisionId, processStepId, waferSubjectId, intentRole }) => ({
        recipeRevisionId,
        processStepId,
        waferSubjectId,
        intentRole,
      }),
    ),
  };
}
// Composition boundary for native repositories, future external adapters and structured AI consumers.
export interface ExperimentRepository {
  getSeries(id: string): Promise<ExperimentSeries | null>;
  getContext(runId: string): Promise<ExperimentContext | null>;
  listRuns(seriesId: string): Promise<ExperimentRun[]>;
}
export * from './planning';
export * from './configuration';
export * from './target';
export * from './experimental-intent';
