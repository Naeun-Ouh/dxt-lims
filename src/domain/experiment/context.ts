import { z } from 'zod';
import {
  experimentSeriesSchema,
  experimentIntentSchema,
  experimentRunSchema,
  operationPlanSchema,
  plannedExecutionItemSchema,
  conditionSetSchema,
  resourceUsageSchema,
  type ExperimentContext,
} from './index';
import { recipeAssignmentSchema } from './experimental-intent';
import {
  materialCatalogSchema,
  materialUsageSchema,
  type MaterialCatalog,
} from '../material';
import {
  validateReferenceCatalog,
  resolveById,
  validateTypedValue,
  definitionIdentity,
  type ReferenceCatalog,
} from '../reference';
import {
  executionEventSchema,
  physicalWaferSchema,
  waferIdentityObservationSchema,
  waferIdentityCandidateSchema,
} from '../execution';
import { measurementSummarySchema } from '../measurement';
import { evidenceSchema } from '../evidence';
import { decisionSchema } from '../decision';
import { projectSchema, projectExperimentRelationSchema } from '../project';
export const runStateSchema = z.object({
  run: experimentRunSchema,
  conditionSet: conditionSetSchema,
  materialUsages: z.array(materialUsageSchema),
  resourceUsages: z.array(resourceUsageSchema).default([]),
  recipeAssignments: z.array(recipeAssignmentSchema).default([]),
  execution: z.array(executionEventSchema),
  physicalWafers: z.array(physicalWaferSchema).default([]),
  waferIdentityObservations: z
    .array(waferIdentityObservationSchema)
    .default([]),
  waferIdentityCandidates: z.array(waferIdentityCandidateSchema).default([]),
  measurements: z.array(measurementSummarySchema),
  evidence: z.array(evidenceSchema),
  decision: decisionSchema.nullable(),
  operationPlan: operationPlanSchema.nullable().default(null),
  plannedExecutionItems: z.array(plannedExecutionItemSchema).default([]),
});
export type RunState = z.infer<typeof runStateSchema>;
function unique(values: string[], name: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${name}`);
}
function validateMaterials(
  c: MaterialCatalog,
  d: ReferenceCatalog,
  evidenceIds: Set<string>,
) {
  for (const group of Object.values(c))
    unique(
      group.map((x) => x.id),
      'material catalog ID',
    );
  unique(
    c.materials.map((m) => m.materialCode),
    'material code',
  );
  unique(
    c.samples.map((s) => s.sampleCode),
    'sample code',
  );
  unique(
    c.sampleRevisions.map((r) => `${r.sampleId}:${r.revision}`),
    'sample revision',
  );
  unique(
    c.materialRevisions.map((r) => `${r.materialId}:${r.revision}`),
    'material revision',
  );
  for (const m of c.materials) {
    if (m.categoryId) resolveById(d.materialCategories, m.categoryId);
    if (m.supplierId) resolveById(c.suppliers, m.supplierId);
  }
  for (const s of c.samples) {
    if (s.materialId) resolveById(c.materials, s.materialId);
    if (s.supplierId) resolveById(c.suppliers, s.supplierId);
  }
  for (const r of c.materialRevisions) resolveById(c.materials, r.materialId);
  for (const r of c.sampleRevisions) resolveById(c.samples, r.sampleId);
  for (const node of c.nodes) {
    if (node.nodeType === 'SAMPLE_REVISION')
      resolveById(c.sampleRevisions, node.referenceId);
    if (node.nodeType === 'RAW_MATERIAL')
      resolveById(c.materials, node.referenceId);
  }
  for (const edge of c.compositionEdges) {
    resolveById(c.nodes, edge.parentNodeId);
    resolveById(c.nodes, edge.childNodeId);
    if (edge.parentNodeId === edge.childNodeId)
      throw new Error('Material structure contains a self reference');
  }
  for (const e of c.evidence) {
    if (e.experimentRunId !== null || !e.sampleRevisionId)
      throw new Error(
        'Native sample evidence must belong to a sample revision',
      );
    resolveById(c.sampleRevisions, e.sampleRevisionId);
  }
  for (const x of c.propertyValues) {
    const node = resolveById(c.nodes, x.materialNodeId),
      definition = resolveById(d.properties, x.propertyDefinitionId);
    if (!definition.applicableNodeTypes.includes(node.nodeType))
      throw new Error('Property is not applicable to material level');
    if (
      definition.dataType !== x.valueType &&
      !(definition.dataType === 'TEXT' && x.valueType === 'IMAGE')
    )
      throw new Error('Property type does not match its definition');
    if (x.evidenceId && !evidenceIds.has(x.evidenceId))
      throw new Error('Unresolved property evidence');
  }
}
// Validate complete instance state before it reaches a screen or an integration consumer.
export function assembleContexts(input: {
  series: unknown[];
  intents: unknown[];
  projects: unknown[];
  projectRelations: unknown[];
  definitions: unknown;
  materials: unknown;
  runs: unknown[];
}): ExperimentContext[] {
  const definitions = validateReferenceCatalog(input.definitions),
    materials = materialCatalogSchema.parse(input.materials),
    series = input.series.map((s) => experimentSeriesSchema.parse(s)),
    intents = input.intents.map((i) => experimentIntentSchema.parse(i)),
    projects = input.projects.map((p) => projectSchema.parse(p)),
    projectRelations = input.projectRelations.map((r) =>
      projectExperimentRelationSchema.parse(r),
    ),
    states = input.runs.map((s) => runStateSchema.parse(s));
  unique(
    series.map((s) => s.id),
    'series ID',
  );
  unique(
    intents.map((i) => i.id),
    'intent ID',
  );
  unique(
    intents.map((i) => i.experimentSeriesId),
    'intent per series',
  );
  unique(
    projects.map((p) => p.id),
    'project ID',
  );
  unique(
    projectRelations.map((r) => r.id),
    'project relation ID',
  );
  unique(
    projectRelations.map((r) => `${r.projectId}:${r.experimentSeriesId}`),
    'project and experiment relation',
  );
  for (const relation of projectRelations) {
    resolveById(projects, relation.projectId);
    resolveById(series, relation.experimentSeriesId);
  }
  for (const intent of intents) {
    resolveById(series, intent.experimentSeriesId);
    for (const target of intent.targets)
      if (target.measurementDefinitionId)
        resolveById(definitions.measurements, target.measurementDefinitionId);
  }
  for (const owner of series) {
    for (const target of owner.targets) resolveById(definitions.parameters,target.parameterDefinitionId);
    for (const summary of owner.summaryResults) summary.relatedRunIds.forEach((id)=>resolveById(states.map((state)=>state.run),id));
  }
  unique(
    states.map((s) => s.run.id),
    'run ID',
  );
  unique(
    states.map((s) => `${s.run.seriesId}:${s.run.runNumber}`),
    'run number',
  );
  unique(
    states.map((s) => s.conditionSet.id),
    'condition set ID',
  );
  for (const field of [
    'materialUsages',
    'execution',
    'measurements',
    'evidence',
  ] as const)
    unique(
      states.flatMap((s) => s[field].map((x) => x.id)),
      `${field} ID`,
    );
  unique(
    states.flatMap((s) => (s.decision ? [s.decision.id] : [])),
    'decision ID',
  );
  validateMaterials(
    materials,
    definitions,
    new Set([
      ...states.flatMap((s) => s.evidence.map((e) => e.id)),
      ...materials.evidence.map((e) => e.id),
    ]),
  );
  unique(
    [
      ...states.flatMap((s) => s.evidence.map((e) => e.id)),
      ...materials.evidence.map((e) => e.id),
    ],
    'evidence ID',
  );
  const runRecords = states.map((s) => s.run);
  for (const state of states) {
    const { run, conditionSet } = state;
    resolveById(series, run.seriesId);
    if (state.operationPlan) {
      if (state.operationPlan.experimentRunId !== run.id)
        throw new Error('Operation plan belongs to another run');
      unique(
        state.operationPlan.steps.map((step) => step.id),
        'process step ID',
      );
      unique(
        state.operationPlan.steps.map((step) => String(step.order)),
        'process step order',
      );
      state.operationPlan.steps.forEach((step) =>
        resolveById(definitions.operations, step.operationDefinitionId),
      );
    }
    unique(
      state.plannedExecutionItems.map((item) => item.id),
      'planned execution item ID',
    );
    for (const item of state.plannedExecutionItems) {
      if (item.experimentRunId !== run.id)
        throw new Error('Planned execution item belongs to another run');
      if (!state.operationPlan)
        throw new Error('Planned execution item requires an operation plan');
      resolveById(state.operationPlan.steps, item.processStepId);
      if (item.operationDefinitionId)
        resolveById(definitions.operations, item.operationDefinitionId);
      if (item.measurementOperationDefinitionId)
        resolveById(
          definitions.measurementOperations,
          item.measurementOperationDefinitionId,
        );
    }
    for (const usage of state.materialUsages)
      if (usage.projectId) resolveById(projects, usage.projectId);
    for (const usage of state.resourceUsages) {
      resolveById(definitions.resources,usage.resourceDefinitionId);
      if (state.operationPlan) resolveById(state.operationPlan.steps,usage.processStepId);
    }
    for(const assignment of state.recipeAssignments) if(state.operationPlan) resolveById(state.operationPlan.steps,assignment.processStepId);
    for (const parentId of [run.previousRunId, conditionSet.inheritedFromRunId])
      if (parentId) {
        const parent = resolveById(runRecords, parentId);
        if (
          parent.seriesId !== run.seriesId ||
          parent.runNumber >= run.runNumber
        )
          throw new Error(
            'Run lineage must reference an earlier run in the same series',
          );
      }
    if (
      run.startedAt &&
      run.completedAt &&
      Date.parse(run.completedAt) < Date.parse(run.startedAt)
    )
      throw new Error('Run completion precedes start');
    for (const record of [
      conditionSet,
      ...state.materialUsages,
      ...state.execution,
      ...state.measurements,
      ...state.evidence,
      ...(state.decision ? [state.decision] : []),
    ])
      if (record.experimentRunId !== run.id)
        throw new Error('Record belongs to another run');
    unique(
      state.physicalWafers.map((wafer) => wafer.id),
      'physical wafer ID',
    );
    unique(
      state.waferIdentityObservations.map((observation) => observation.id),
      'wafer identity observation ID',
    );
    for (const observation of state.waferIdentityObservations) {
      if (observation.physicalWaferId)
        resolveById(state.physicalWafers, observation.physicalWaferId);
      if (observation.operationDefinitionId)
        resolveById(definitions.operations, observation.operationDefinitionId);
    }
    for (const candidate of state.waferIdentityCandidates) {
      resolveById(state.waferIdentityObservations, candidate.observationId);
      resolveById(state.physicalWafers, candidate.candidatePhysicalWaferId);
    }
    for (const event of state.execution) {
      const observation = resolveById(
        state.waferIdentityObservations,
        event.waferIdentityObservationId,
      );
      if (event.physicalWaferId)
        resolveById(state.physicalWafers, event.physicalWaferId);
      if (state.operationPlan)
        resolveById(state.operationPlan.steps, event.processStepId);
      if (event.plannedExecutionItemId)
        resolveById(state.plannedExecutionItems, event.plannedExecutionItemId);
      if (
        event.physicalWaferId &&
        observation.physicalWaferId &&
        event.physicalWaferId !== observation.physicalWaferId
      )
        throw new Error(
          'Execution and observation resolve to different wafers',
        );
      if (Date.parse(event.endedAt) < Date.parse(event.startedAt))
        throw new Error('Execution ends before it starts');
    }
    unique(
      conditionSet.conditions.map((v) =>
        definitionIdentity(
          resolveById(definitions.conditions, v.conditionDefinitionId),
        ),
      ),
      'condition concept',
    );
    unique(
      [...conditionSet.conditions, ...conditionSet.materialConditions].map(
        (v) => v.id,
      ),
      'condition ID',
    );
    unique(
      conditionSet.materialConditions.map((v) =>
        JSON.stringify([
          definitionIdentity(
            resolveById(definitions.conditions, v.conditionDefinitionId),
          ),
          v.bindingKey,
        ]),
      ),
      'material binding',
    );
    unique(
      conditionSet.materialConditions.map((v) => v.materialUsageId),
      'material usage binding',
    );
    for (const evidence of state.evidence)
      if (evidence.sampleRevisionId)
        resolveById(materials.sampleRevisions, evidence.sampleRevisionId);
    for (const v of conditionSet.conditions) {
      const def = resolveById(definitions.conditions, v.conditionDefinitionId);
      if (def.category === 'MATERIAL')
        throw new Error('Material must be a structured condition');
      validateTypedValue(v.value, def);
    }
    if (conditionSet.materialConditions.length !== state.materialUsages.length)
      throw new Error('Material usage must have exactly one condition binding');
    for (const v of conditionSet.materialConditions) {
      if (
        resolveById(definitions.conditions, v.conditionDefinitionId)
          .dataType !== 'SAMPLE_REVISION'
      )
        throw new Error('Material binding requires a sample definition');
      const usage = resolveById(state.materialUsages, v.materialUsageId);
      resolveById(materials.sampleRevisions, usage.sampleRevisionId);
    }
    unique(
      state.measurements.map(
        (v) =>
          `${definitionIdentity(resolveById(definitions.measurements, v.measurementDefinitionId))}:${v.layer}`,
      ),
      'measurement summary per layer',
    );
    for (const v of state.measurements)
      validateTypedValue(
        v.value,
        resolveById(definitions.measurements, v.measurementDefinitionId),
      );
    if (state.decision) {
      if (state.decision.nextAction) resolveById(definitions.nextActionTypes,state.decision.nextAction.nextActionTypeDefinitionId);
      unique(
        state.decision.evaluations.map((v) =>
          definitionIdentity(
            resolveById(definitions.evaluations, v.evaluationDefinitionId),
          ),
        ),
        'evaluation concept',
      );
      for (const v of state.decision.evaluations)
        validateTypedValue(
          v.value,
          resolveById(definitions.evaluations, v.evaluationDefinitionId),
        );
      unique(
        state.decision.criterionAssessments.map(
          (a) => a.evaluationCriterionDefinitionId,
        ),
        'criterion assessment',
      );
      for (const assessment of state.decision.criterionAssessments) {
        const criterion = resolveById(
            definitions.evaluationCriteria,
            assessment.evaluationCriterionDefinitionId,
          ),
          measurement = resolveById(
            state.measurements,
            assessment.measurementSummaryId,
          );
        if (
          measurement.measurementDefinitionId !==
          criterion.measurementDefinitionId
        )
          throw new Error('Criterion assessment uses the wrong measurement');
        for (const evidenceId of assessment.evidenceIds)
          resolveById(state.evidence, evidenceId);
      }
      for (const evaluation of state.decision.evaluations) {
        const definition = resolveById(
          definitions.evaluations,
          evaluation.evaluationDefinitionId,
        );
        for (const criterionId of definition.criterionDefinitionIds)
          if (
            !state.decision.criterionAssessments.some(
              (a) => a.evaluationCriterionDefinitionId === criterionId,
            )
          )
            throw new Error(
              'Decision is missing a configured criterion assessment',
            );
      }
    }
  }
  return states.map((state) => {
    const owner = resolveById(series, state.run.seriesId);
    return {
      series: owner,
      intent: resolveById(
        intents,
        intents.find((i) => i.experimentSeriesId === owner.id)?.id ?? '',
      ),
      projectContext: projectRelations
        .filter((relation) => relation.experimentSeriesId === owner.id)
        .map((relation) => ({
          relation,
          project: resolveById(projects, relation.projectId),
        })),
      run: state.run,
      experimentType: resolveById(
        definitions.experimentTypes,
        owner.experimentTypeDefinitionId,
      ),
      definitions,
      conditionSet: state.conditionSet,
      operationPlan: state.operationPlan,
      plannedExecutionItems: state.plannedExecutionItems,
      materials: state.conditionSet.materialConditions.map((condition) => {
        const usage = resolveById(
            state.materialUsages,
            condition.materialUsageId,
          ),
          sampleRevision = resolveById(
            materials.sampleRevisions,
            usage.sampleRevisionId,
          ),
          sample = resolveById(materials.samples, sampleRevision.sampleId);
        return {
          condition,
          usage,
          sampleRevision,
          sample,
          material: resolveById(materials.materials, sample.materialId ?? ''),
          materialRevision: null,
          rootNode: resolveById(
            materials.nodes,
            materials.nodes.find(
              (x) =>
                x.nodeType === 'SAMPLE_REVISION' &&
                x.referenceId === sampleRevision.id,
            )?.id ?? '',
          ),
          nodes: materials.nodes,
          compositionEdges: materials.compositionEdges,
          propertyValues: materials.propertyValues,
          evidence: materials.evidence.filter(
            (x) => x.sampleRevisionId === sampleRevision.id,
          ),
        };
      }),
      resourceUsages: state.resourceUsages,
      recipeAssignments: state.recipeAssignments,
      execution: state.execution,
      physicalWafers: state.physicalWafers,
      waferIdentityObservations: state.waferIdentityObservations,
      waferIdentityCandidates: state.waferIdentityCandidates,
      measurements: state.measurements,
      evidence: state.evidence,
      decision: state.decision,
    };
  });
}
