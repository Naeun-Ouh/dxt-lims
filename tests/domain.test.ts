import {
  saveVariable,
  variableDefinitions,
} from '../src/features/run-registration/variable-model';
import {
  restorePlanningContext as restorePlanningContextWithRepository,
  planningStorageKey,
} from '../src/features/run-registration/planning-storage';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contexts,
  series,
  runStates,
  mockMaterialRepository,
  intents,
  run4Configuration,
  run5Configuration,
} from '../src/mock/experiments';
import { projects, projectRelations } from '../src/mock/projects';
import { definitions } from '../src/mock/reference';
import { materialCatalog } from '../src/mock/materials';
import { measurementResults } from '../src/mock/measurement-results';
import {
  aggregateMeasurements,
  currentValidity,
  effectiveMeasurementValues,
} from '../src/domain/measurement';
import { assembleContexts } from '../src/domain/experiment/context';
import { evaluateSeriesTarget, nextRunConcept } from '../src/domain/experiment';
import {
  ExperimentConfigurationResolver,
  configurationGuidance,
} from '../src/domain/experiment/configuration';
import {
  collectionParameterIds,
  validateRunRegistrationDraft,
} from '../src/domain/experiment/planning';
import { createExperimentDelta } from '../src/domain/experiment/delta';
import { measurementRows } from '../src/domain/measurement/presentation';
import { evaluationRows } from '../src/domain/decision/presentation';
import { validateTypedValue, resolveById } from '../src/domain/reference';
import {
  resolveConfigurationApplicability,
  resolvePinnedConfigurationPackage,
  validateConfigurationPackageVersion,
} from '../src/domain/reference/configuration';
import {
  ConfigurationManagementCommands,
  InMemoryConfigurationRepository,
  type PackageAssembly,
} from '../src/domain/reference/configuration-management';
import {
  applicabilityContextSummary as applicabilityContextSummaryWithRepository,
  applicabilityRows as studioApplicabilityRowsWithRepository,
  historicalRunSafety as historicalRunSafetyWithRepository,
  packagePrimarySummary,
  resolverPreview as studioResolverPreviewWithRepository,
} from '../src/features/reference-studio/authoring-model';
import {
  configurationRegistry,
  registeredConfigurationEditorKeys,
  validateConfigurationFixtures,
} from '../src/mock/configuration-packages';
const testConfigurationRepository = new InMemoryConfigurationRepository(configurationRegistry);
const createExperimentWorkspace = (snapshot: Parameters<typeof createExperimentWorkspaceWithRepository>[0]) =>
  createExperimentWorkspaceWithRepository(snapshot, testConfigurationRepository);
const studioApplicabilityRows = (id?: string) => studioApplicabilityRowsWithRepository(id, testConfigurationRepository);
const applicabilityContextSummary = (id: string) => applicabilityContextSummaryWithRepository(id, testConfigurationRepository);
const studioResolverPreview = (context: Parameters<typeof studioResolverPreviewWithRepository>[0]) =>
  studioResolverPreviewWithRepository(context, testConfigurationRepository);
const historicalRunSafety = (value: Parameters<typeof historicalRunSafetyWithRepository>[0]) =>
  historicalRunSafetyWithRepository(value, testConfigurationRepository);
const restorePlanningContext = (
  snapshot: Parameters<typeof restorePlanningContextWithRepository>[0],
  raw: string | null,
) => restorePlanningContextWithRepository(snapshot, raw, testConfigurationRepository);
import {
  createMaterialFingerprintService,
  createSampleRevisionComparisonService,
} from '../src/domain/material';
import { createSeriesNavigationScale } from '../src/mock/series-navigation';
import {
  createMeasurementGroup,
  executeArithmeticPreparation,
} from '../src/domain/measurement/preparation';
import {
  inspectionGroup,
  inspectionObservations,
  mockThkDelta,
  preparationDatasets,
  preparationValues,
  thkDeltaRecipe,
} from '../src/mock/data-preparation';
import {
  composeWaferAnalysisContexts,
  plottableContexts,
  savedAnalysisSchema,
} from '../src/domain/analysis';
import { savedAnalyses, waferAnalysisContexts } from '../src/mock/analysis';
import { seriesWorkspaceScenarios } from '../src/mock/series-workspaces';
import {
  assignmentSummary,
  effectiveAssignments,
  runPlanningScenarios,
  validatePlanningSnapshot,
} from '../src/features/run-registration/planning-model';
import {
  confirmExperimentScope,
  selectOperationRange,
  isFocusOperation,
  applicableReferences,
  applyVariableAssignments,
  collapseCommon,
  createExperimentWorkspace as createExperimentWorkspaceWithRepository,
  operationAssignments,
  groupAssignments,
  initialSelection,
  sequenceAssignments,
  visibleOperations,
} from '../src/features/run-registration/workspace-model';
const fixture = () =>
  structuredClone({
    series: [series],
    intents,
    projects,
    projectRelations,
    definitions,
    materials: materialCatalog,
    runs: runStates,
  });
test('Series Explorer scale projection supports 100+ latest-first Runs without domain records', () => {
  const seriesNavigationRuns = createSeriesNavigationScale([], 104);
  assert.equal(seriesNavigationRuns.length, 104);
  assert.equal(seriesNavigationRuns[0].number, 104);
  assert.equal(seriesNavigationRuns.at(-1)?.number, 1);
  assert.equal(seriesNavigationRuns.filter((run) => run.available).length, 0);
});
test('Series defaults materialize independent Run snapshots with exact reference revisions', () => {
  const snapshot = ExperimentConfigurationResolver.fromSeriesDefault(
    series.defaultConfiguration!,
    'new-run-snapshot',
  );
  snapshot.items[0].label = 'Changed locally';
  assert.notEqual(
    snapshot.items[0].label,
    series.defaultConfiguration!.items[0].label,
  );
  assert.equal(snapshot.items[1].referenceRevisionId, 'condition-pressure-v1');
  assert.ok(
    snapshot.items.every((item) => item.provenance === 'SERIES_DEFAULT'),
  );
});
test('Run override, ad-hoc configuration, and next Run provenance remain explicit', () => {
  const pressure = run4Configuration.items.find(
    (item) => item.id === 'default-pressure',
  )!;
  assert.equal(pressure.value?.value, 3.2);
  assert.equal(pressure.state, 'MODIFIED');
  assert.equal(
    run4Configuration.items.find((item) => item.label === 'LER')?.state,
    'ADDED',
  );
  assert.equal(configurationGuidance(run4Configuration)[0].level, 'INFO');
  assert.ok(
    run5Configuration.items
      .slice(0, -1)
      .every((item) => item.provenance === 'PREVIOUS_RUN'),
  );
  assert.equal(run5Configuration.items.at(-1)?.label, 'Clean');
});
test('validated seed has 14 typed scalar conditions and one native material condition per run', () => {
  assert.equal(contexts.length, 4);
  for (const c of contexts) {
    assert.equal(c.conditionSet.conditions.length, 14);
    assert.equal(c.conditionSet.materialConditions.length, 1);
    assert.equal(c.materials[0].usage.experimentRunId, c.run.id);
    assert.equal(
      c.materials[0].sampleRevision.sampleId,
      c.materials[0].sample.id,
    );
    assert.equal(c.materials[0].sample.materialId, c.materials[0].material.id);
    assert.ok(!('material' in c));
  }
});
test('Run 4 changes energy and the exact sample revision', () => {
  const d = createExperimentDelta(contexts[3], contexts[2]);
  assert.deepEqual(
    d.changed.map((x) => [x.type, x.label, x.previous, x.current]),
    [
      ['MATERIAL', 'Material', 'D035', 'D035'],
      ['CONDITION', 'Energy', 32, 35],
    ],
  );
  assert.equal(d.unchangedCount, 13);
  assert.equal(d.totalCurrentCount, 15);
});
test('Run 3 exposes the sample substitution as a material delta', () => {
  const d = createExperimentDelta(contexts[2], contexts[1]);
  assert.deepEqual(
    d.changed.map((x) => [x.type, x.previous, x.current]),
    [['MATERIAL', 'D031', 'D035']],
  );
  assert.match(d.changed[0].currentDetail!, /Revision 1/);
});
test('same sample code with a different pinned revision is still a material change', () => {
  const d = createExperimentDelta(contexts[3], contexts[2]);
  assert.equal(d.changed.length, 2);
  const material = d.changed.find((x) => x.type === 'MATERIAL')!;
  assert.equal(material.previous, 'D035');
  assert.equal(material.current, 'D035');
  assert.notEqual(material.previousDetail, material.currentDetail);
});
test('baseline has no predecessor values', () => {
  const d = createExperimentDelta(contexts[0]);
  assert.equal(d.isBaseline, true);
  assert.equal(d.changed.length, 15);
  assert.ok(
    d.changed.every((x) => x.previous === null && x.change === 'ADDED'),
  );
});
test('new condition outside type recommendations works without a Run schema change', () => {
  const f = fixture();
  const d = {
    ...f.definitions.conditions[1],
    id: 'condition-gas-flow-v1',
    code: 'GAS_FLOW',
    name: 'Gas flow',
    unitId: 'unit-ml-min',
    displayOrder: 30,
    scope: { kind: 'USER' as const, ownerId: 'engineer-1' },
  };
  f.definitions.conditions.push(d);
  f.runs[3].conditionSet.conditions.push({
    id: 'gas-flow-run-4',
    conditionDefinitionId: d.id,
    value: { dataType: 'NUMBER', value: 75 },
  });
  const c = assembleContexts(f);
  const added = createExperimentDelta(c[3], c[2]).changed.find(
    (x) => x.label === 'Gas flow',
  )!;
  assert.equal(added.change, 'ADDED');
  assert.equal(added.current, 75);
  assert.equal(added.unit, 'mL/min');
  assert.ok(
    !c[3].experimentType.recommendedConditionDefinitionIds.includes(d.id),
  );
});
test('removed conditions are explicit deltas', () => {
  const f = fixture();
  f.runs[3].conditionSet.conditions = f.runs[3].conditionSet.conditions.filter(
    (x) => x.conditionDefinitionId !== 'condition-pad-v1',
  );
  const c = assembleContexts(f);
  const removed = createExperimentDelta(c[3], c[2]).changed.find(
    (x) => x.label === 'Pad',
  )!;
  assert.equal(removed.change, 'REMOVED');
  assert.equal(removed.current, null);
  assert.equal(removed.previous, 'IC1000');
});
test('unit and definition revisions are not silently treated as unchanged', () => {
  const f = fixture();
  f.definitions.conditions.push({
    ...f.definitions.conditions[1],
    id: 'condition-energy-v2',
    version: 2,
    unitId: 'unit-percent',
  });
  f.runs[3].conditionSet.conditions[0] = {
    id: 'energy-r4-v2',
    conditionDefinitionId: 'condition-energy-v2',
    value: { dataType: 'NUMBER', value: 32 },
  };
  const c = assembleContexts(f);
  const entry = createExperimentDelta(c[3], c[2]).changed.find(
    (x) => x.label === 'Energy',
  )!;
  assert.equal(entry.previous, 32);
  assert.equal(entry.current, 32);
  assert.notEqual(entry.previousUnit, entry.unit);
});
test('same reference code in another governance scope is a separate condition concept', () => {
  const f = fixture();
  const d = {
    ...f.definitions.conditions[1],
    id: 'user-energy-v1',
    scope: { kind: 'USER' as const, ownerId: 'engineer-1' },
  };
  f.definitions.conditions.push(d);
  f.runs[3].conditionSet.conditions.push({
    id: 'user-energy-value',
    conditionDefinitionId: d.id,
    value: { dataType: 'NUMBER', value: 9 },
  });
  assert.equal(
    createExperimentDelta(assembleContexts(f)[3], contexts[2]).changed.length,
    3,
  );
});
test('inheritance copies values and native revision references without reusing instance IDs', () => {
  const draft = nextRunConcept(contexts[3]);
  assert.equal(draft.runNumber, 5);
  assert.equal(draft.previousRunId, 'run-4');
  assert.equal(draft.materialConditions[0].sampleRevisionId, 'sample-D035-r2');
  assert.ok(!('materialUsageId' in draft.materialConditions[0]));
  assert.ok(!('id' in draft.conditions[0]));
  draft.conditions[0].value.value = 38;
  draft.materialConditions[0].role = 'Control';
  assert.equal(contexts[3].conditionSet.conditions[0].value.value, 35);
  assert.equal(contexts[3].materials[0].usage.role, 'Candidate');
});
test('measurement and evaluation presentation come from configured definitions', () => {
  assert.deepEqual(
    measurementRows(contexts[3], contexts[2]).map((m) => m.trendLabel),
    ['↑ 4.7%', '≈ stable', '↓ 7.6%'],
  );
  assert.equal(evaluationRows(contexts[3])[0].value, 'Better');
  assert.ok(
    contexts[3].measurements.every(
      (m) => !('parameter' in m) && !('unit' in m),
    ),
  );
  assert.ok(
    measurementRows(contexts[0]).every((m) => m.trendLabel === 'Baseline'),
  );
});
test('new measurement renders from configuration and zero baselines are not divided by zero', () => {
  const f = fixture();
  const d = {
    ...f.definitions.measurements[0],
    id: 'metric-removal-v1',
    code: 'REMOVAL_RATE',
    name: 'Removal rate',
  };
  f.definitions.measurements.push(d);
  for (const i of [2, 3])
    f.runs[i].measurements.push({
      id: `removal-${i}`,
      experimentRunId: f.runs[i].run.id,
      measurementDefinitionId: d.id,
      value: { dataType: 'NUMBER', value: i === 2 ? 0 : 10 },
      layer: 'CURATED',
    });
  const c = assembleContexts(f),
    row = measurementRows(c[3], c[2]).find(
      (m) => m.parameter === 'Removal rate',
    )!;
  assert.equal(row.value, 10);
  assert.equal(row.trendVsPreviousRun, null);
  assert.equal(row.trendLabel, 'Not comparable');
});
test('type mismatches and invalid configured options are rejected', () => {
  const f = fixture();
  f.runs[3].conditionSet.conditions[0].value = {
    dataType: 'TEXT',
    value: '35',
  };
  assert.throws(() => assembleContexts(f), /type/);
  assert.throws(
    () =>
      validateTypedValue(
        { dataType: 'SELECT', value: 'UNKNOWN' },
        resolveById(definitions.evaluations, 'evaluation-relative-v1'),
      ),
    /configured option/,
  );
});
test('dangling references and cross-run attachment are rejected', () => {
  const f = fixture();
  f.runs[3].materialUsages[0].sampleRevisionId = 'missing';
  assert.throws(() => assembleContexts(f), /Unresolved reference/);
  const g = fixture();
  g.runs[3].measurements[0].experimentRunId = 'run-1';
  assert.throws(() => assembleContexts(g), /another run/);
});
test('duplicate concepts, usage bindings and cyclic lineage are rejected', () => {
  const f = fixture();
  f.runs[3].conditionSet.conditions.push({
    ...f.runs[3].conditionSet.conditions[0],
    id: 'duplicate',
  });
  assert.throws(() => assembleContexts(f), /Duplicate condition concept/);
  const g = fixture();
  g.runs[3].conditionSet.materialConditions.push({
    ...g.runs[3].conditionSet.materialConditions[0],
    id: 'duplicate',
    bindingKey: 'secondary',
  });
  assert.throws(() => assembleContexts(g), /Duplicate material usage/);
  const h = fixture();
  h.runs[0].run.previousRunId = 'run-4';
  assert.throws(() => assembleContexts(h), /earlier run/);
});
test('a native sample revision can be reused across different series and projects', () => {
  const f = fixture();
  const other = { ...series, id: 'other-series' };
  f.projects.push({
    ...f.projects[0],
    id: 'another-project',
    title: 'Another Project',
  });
  f.projectRelations.push({
    ...f.projectRelations[0],
    id: 'another-relation',
    projectId: 'another-project',
    experimentSeriesId: other.id,
  });
  f.series.push(other);
  f.intents.push({
    ...f.intents[0],
    id: 'other-intent',
    experimentSeriesId: other.id,
  });
  const state = structuredClone(f.runs[0]);
  state.run = {
    ...state.run,
    id: 'other-run',
    seriesId: other.id,
    previousRunId: null,
  };
  state.conditionSet = {
    ...state.conditionSet,
    id: 'other-set',
    experimentRunId: 'other-run',
    inheritedFromRunId: null,
    materialConditions: [
      {
        ...state.conditionSet.materialConditions[0],
        id: 'other-material',
        materialUsageId: 'other-usage',
      },
    ],
  };
  state.operationPlan = null;
  state.plannedExecutionItems = [];
  state.materialUsages = [
    {
      ...state.materialUsages[0],
      id: 'other-usage',
      experimentRunId: 'other-run',
      projectId: 'another-project',
    },
  ];
  state.measurements = [];
  state.execution = [];
  state.evidence = [];
  state.decision = null;
  f.runs.push(state);
  const c = assembleContexts(f);
  assert.equal(
    c[4].materials[0].sampleRevision.id,
    c[0].materials[0].sampleRevision.id,
  );
  assert.notEqual(
    c[4].materials[0].usage.projectId,
    c[0].materials[0].usage.projectId,
  );
  assert.ok(!('projectId' in c[4].materials[0].sample));
});
test('native sample search, revision history and usage history are independent of external systems', async () => {
  assert.equal((await mockMaterialRepository.findSamples('D035')).length, 1);
  assert.deepEqual(
    (await mockMaterialRepository.listSampleRevisions('sample-D035')).map(
      (r) => r.revision,
    ),
    [1, 2],
  );
  assert.deepEqual(
    (await mockMaterialRepository.listUsage('sample-D035')).map(
      (u) => u.experimentRunId,
    ),
    ['run-3', 'run-4'],
  );
});
test('native property image evidence need not belong to an experiment run', () => {
  const f = fixture();
  f.materials.evidence.push({
    id: 'sample-image',
    experimentRunId: null,
    sampleRevisionId: 'sample-D035-r2',
    type: 'Image',
    title: 'Property image',
    sourceSystem: 'DXT LIMS',
    snapshotPath: '/mock-image.svg',
    description: 'Native property image',
  });
  f.materials.propertyValues.find(
    (p) => p.materialNodeId === 'node-D035-r2',
  )!.evidenceId = 'sample-image';
  assert.equal(
    assembleContexts(f)[3].materials[0].evidence[0].id,
    'sample-image',
  );
});
test('sample master contains requested revision histories and exact D035 run usages', () => {
  assert.deepEqual(
    materialCatalog.sampleRevisions
      .filter((r) => r.sampleId === 'sample-D031')
      .map((r) => r.revision),
    [1, 2, 3],
  );
  assert.equal(contexts[2].materials[0].sampleRevision.id, 'sample-D035-r1');
  assert.equal(contexts[3].materials[0].sampleRevision.id, 'sample-D035-r2');
});
test('nested revision comparison finds D035 ratio and sample property changes', () => {
  const delta = createSampleRevisionComparisonService(
    materialCatalog,
    definitions,
  ).compareSampleRevisions('sample-D035-r1', 'sample-D035-r2');
  assert.deepEqual(
    delta.compositionChanges.map((x) => [x.label, x.previous, x.current]),
    [
      ['Raw Material A1 ratio', 60, 61],
      ['Raw Material A2 ratio', 40, 39],
    ],
  );
  assert.equal(delta.propertyChanges.length, 2);
  assert.equal(delta.structuralChanges.length, 0);
  assert.equal(delta.isIdentical, false);
});
test('material fingerprints are deterministic and ignore record IDs', () => {
  const service = createMaterialFingerprintService(
      materialCatalog,
      definitions,
    ),
    first = service.fingerprint('sample-D035-r2');
  assert.equal(service.fingerprint('sample-D035-r2'), first);
  const clone = structuredClone(materialCatalog);
  clone.compositionEdges.forEach((e, i) => (e.id = `replacement-${i}`));
  assert.equal(
    createMaterialFingerprintService(clone, definitions).fingerprint(
      'sample-D035-r2',
    ),
    first,
  );
});
test('ExperimentSeries has no project owner and can exist without a Project relation', () => {
  assert.ok(!('projectId' in series));
  const f = fixture();
  f.projectRelations = [];
  const independent = assembleContexts(f);
  assert.deepEqual(independent[0].projectContext, []);
});
test('Projects and experiment series form an explicit many-to-many relationship', () => {
  const f = fixture();
  f.projects.push({
    ...f.projects[0],
    id: 'reliability-project',
    title: 'Reliability Project',
  });
  f.projectRelations.push({
    ...f.projectRelations[0],
    id: 'reliability-dts',
    projectId: 'reliability-project',
    relationType: 'Related',
  });
  const c = assembleContexts(f);
  assert.deepEqual(
    c[0].projectContext.map((x) => x.project.id),
    ['cu-cmp-development', 'reliability-project'],
  );
});
test('intent fields are optional while targets may reference measurement definitions', () => {
  const f = fixture();
  f.intents[0].purpose = null;
  f.intents[0].hypothesis = null;
  assert.equal(assembleContexts(f)[0].intent.purpose, null);
  const invalid = fixture();
  invalid.intents[0].targets[0].measurementDefinitionId = 'missing';
  assert.throws(() => assembleContexts(invalid), /Unresolved reference/);
});
test('criteria remain distinct from targets and recorded decision assessments', () => {
  const context = contexts[3];
  assert.equal(context.intent.targets.length, 2);
  assert.equal(context.definitions.evaluationCriteria.length, 3);
  assert.equal(context.decision?.criterionAssessments.length, 3);
  assert.ok(
    context.decision?.criterionAssessments.every((x) => x.status === 'PASS'),
  );
  const invalid = fixture();
  invalid.runs[3].decision!.criterionAssessments[0].measurementSummaryId =
    'measurement-4-1';
  assert.throws(() => assembleContexts(invalid), /wrong measurement/);
});
test('configured criteria must be represented in a recorded Decision', () => {
  const f = fixture();
  f.runs[3].decision!.criterionAssessments.pop();
  assert.throws(() => assembleContexts(f), /missing a configured criterion/);
});
test('Reference Studio classifies Process areas without adding Run fields', () => {
  const process = resolveById(definitions.experimentTypes, 'type-process-v1');
  assert.deepEqual(process.areaDefinitionIds, ['area-photo-v1', 'area-cmp-v1']);
  assert.deepEqual(
    definitions.areas.map((area) => area.code),
    ['PHOTO', 'CMP', 'MATERIAL_RND'],
  );
  assert.ok(!('photo' in runStates[0].run) && !('cmp' in runStates[0].run));
});
test('condition definitions separate subject context and support explicit references and scopes', () => {
  assert.ok(
    !definitions.conditions.some((condition) =>
      ['LOT_ID', 'WAFER_ID', 'OPERATION_ID'].includes(condition.code),
    ),
  );
  assert.equal(
    resolveById(definitions.conditions, 'condition-recipe-v1').valueType,
    'RECIPE_REFERENCE',
  );
  assert.equal(
    resolveById(definitions.conditions, 'condition-material-v1').valueType,
    'SAMPLE_REVISION_REFERENCE',
  );
  assert.ok(
    resolveById(
      definitions.conditions,
      'condition-energy-v1',
    ).allowedScopes.includes('POSITION'),
  );
});
test('measurement selection resolves coordinate collection requirements', () => {
  const bcd = resolveById(definitions.parameters, 'parameter-bcd-v1');
  assert.equal(bcd.semanticRole, 'MEASUREMENT');
  assert.deepEqual(bcd.requiredSupportingParameterIds, [
    'parameter-chip-x-v1',
    'parameter-chip-y-v1',
  ]);
  assert.ok(
    bcd.requiredSupportingParameterIds.every(
      (id) =>
        resolveById(definitions.parameters, id).semanticRole === 'COORDINATE',
    ),
  );
});
test('Run operation plans preserve a one-to-many process-step boundary', () => {
  assert.equal(
    contexts[3].operationPlan?.steps[0].operationDefinitionId,
    'operation-m2-cu-cmp-v1',
  );
  const f = fixture();
  f.runs[3].operationPlan!.steps.push({
    id: 'process-step-4-2',
    operationDefinitionId: 'operation-photo-exposure-v1',
    order: 1,
    label: 'Follow-up exposure',
  });
  assert.equal(assembleContexts(f)[3].operationPlan?.steps.length, 2);
});
test('CMP registration drafts pin exact definitions and SampleRevision', () => {
  const draft = validateRunRegistrationDraft(
    {
      configurationPackageVersionId: 'config-package-cmp-v1',
      experimentTypeDefinitionId: 'type-process-v1',
      areaDefinitionId: 'area-cmp-v1',
      seriesId: series.id,
      previousRunId: 'run-4',
      inheritedFromRunId: 'run-4',
      subject: { lotId: 'RSA6420', waferIds: ['TT331520'] },
      operationPlan: {
        id: 'draft-plan',
        experimentRunId: 'draft-run',
        steps: [
          {
            id: 'draft-step',
            operationDefinitionId: 'operation-m2-cu-cmp-v1',
            order: 0,
            label: 'M2 CU CMP',
          },
        ],
      },
      conditions: [
        {
          id: 'draft-recipe',
          conditionDefinitionId: 'condition-recipe-v1',
          scope: 'RUN',
          target: null,
          value: {
            dataType: 'REFERENCE',
            referenceType: 'RECIPE',
            referenceId: 'RSAcucmp_001',
          },
        },
        {
          id: 'draft-material',
          conditionDefinitionId: 'condition-material-v1',
          scope: 'RUN',
          target: null,
          value: {
            dataType: 'REFERENCE',
            referenceType: 'SAMPLE_REVISION',
            referenceId: 'sample-D035-r2',
          },
        },
      ],
      measurements: [
        {
          id: 'draft-measurement',
          measurementOperationDefinitionId:
            'measurement-operation-cmp-metro-v1',
          parameterDefinitionIds: ['parameter-dts-v1'],
          measurementPoint: 'FINAL',
          afterProcessStepId: 'draft-step',
        },
      ],
    },
    definitions,
    materialCatalog.sampleRevisions.map((revision) => revision.id),
  );
  assert.equal(
    draft.conditions[1].value.dataType === 'REFERENCE' &&
      draft.conditions[1].value.referenceId,
    'sample-D035-r2',
  );
  assert.equal(
    draft.conditions[0].conditionDefinitionId,
    'condition-recipe-v1',
  );
});
test('supporting collection parameters resolve without becoming engineer selections', () => {
  assert.deepEqual(collectionParameterIds(['parameter-bcd-v1'], definitions), [
    'parameter-bcd-v1',
    'parameter-chip-x-v1',
    'parameter-chip-y-v1',
  ]);
});
test('next Run concepts carry the ordered operation snapshot without reusing step IDs', () => {
  const next = nextRunConcept(contexts[3]);
  assert.deepEqual(next.operationSteps, [
    {
      operationDefinitionId: 'operation-m2-cu-cmp-v1',
      order: 0,
      label: 'M2 CU CMP',
    },
  ]);
  assert.ok(!('id' in next.operationSteps[0]));
});

test('one physical wafer preserves continuity across changing observed lot and slot identities', () => {
  const run = contexts[3];
  const wafer = run.physicalWafers.find(
    (item) => item.canonicalLabel === 'PW-001',
  )!;
  const observations = run.waferIdentityObservations.filter(
    (item) =>
      item.physicalWaferId === wafer.id ||
      run.waferIdentityCandidates.some(
        (candidate) =>
          candidate.observationId === item.id &&
          candidate.candidatePhysicalWaferId === wafer.id,
      ),
  );
  assert.equal(wafer.id, 'pw-4-1');
  assert.equal(observations[0].observedLotId, 'RSA6420');
  assert.equal(observations[0].slotPosition, '11');
  assert.equal(observations[2].observedLotId, 'TT3312914');
  assert.equal(observations[2].slotPosition, '01');
  assert.equal(observations[2].identityStatus, 'CANDIDATE');
  assert.equal(observations[2].physicalWaferId, null);
  assert.equal(
    run.waferIdentityCandidates[0].candidatePhysicalWaferId,
    wafer.id,
  );
});

test('execution events preserve actual context separately from intended process steps', () => {
  const run = contexts[3];
  const event = run.execution[0];
  assert.equal(event.processStepId, run.operationPlan!.steps[0].id);
  assert.equal(event.observedOperation, 'M2 CU CMP');
  assert.equal(event.observedRecipe, 'RSAcucmp_001');
  assert.equal(event.equipment, 'CMP-03');
  assert.ok(!('observedRecipe' in run.operationPlan!.steps[0]));
});

test('manufacturing identity changes do not contribute to ExperimentDelta', () => {
  const before = createExperimentDelta(contexts[3], contexts[2]);
  const copied = structuredClone(contexts[3]);
  copied.waferIdentityObservations[0].observedLotId = 'ANOTHER_LOT';
  copied.waferIdentityObservations[0].slotPosition = '22';
  const after = createExperimentDelta(copied, contexts[2]);
  assert.deepEqual(after, before);
});

test('planned execution uses wafer by process-step grain and keeps process and measurement roles explicit', () => {
  const run = contexts[3];
  assert.equal(run.plannedExecutionItems.length, 10);
  assert.equal(
    new Set(run.plannedExecutionItems.map((item) => item.waferSubjectId)).size,
    5,
  );
  const firstWafer = run.plannedExecutionItems.filter(
    (item) => item.waferSubjectId === 'RSA6420.01',
  );
  assert.deepEqual(
    firstWafer.map((item) => [
      item.sequence,
      item.operationRole,
      item.measurementPoint,
    ]),
    [
      [0, 'PROCESS', null],
      [1, 'MEASUREMENT', 'POST'],
    ],
  );
  assert.equal(run.execution[0].plannedExecutionItemId, firstWafer[0].id);
});

test('Reference Studio operation role is explicit rather than inferred from names', () => {
  assert.ok(
    definitions.operations.every(
      (operation) => operation.operationRole === 'PROCESS',
    ),
  );
  assert.ok(
    definitions.measurementOperations.every(
      (operation) => operation.operationRole === 'MEASUREMENT',
    ),
  );
});

test('site measurement values retain wafer, parameter, coordinates, and source context', () => {
  const dataset = measurementResults.datasets.find(
    (item) =>
      item.measurementOperationDefinitionId ===
      'measurement-operation-cdsem-v1',
  )!;
  const values = measurementResults.values.filter(
    (item) =>
      item.datasetId === dataset.id &&
      item.waferSubjectId === 'RSA6420.01' &&
      item.acquisitionMethod === 'INTERFACE',
  );
  assert.equal(values.length, 115);
  assert.ok(values.every((item) => item.granularity === 'SITE'));
  assert.ok(values.every((item) => item.siteIdentity));
  assert.ok(values.every((item) => item.coordinateValues.length === 2));
  assert.ok(values.every((item) => item.sourceParameterReference));
});

test('wafer summaries preserve site-value lineage and source versus DXT origin', () => {
  const summaries = measurementResults.summaries.filter(
    (item) => item.waferSubjectId === 'RSA6420.01',
  );
  assert.equal(summaries.length, 5);
  for (const summary of summaries)
    assert.ok(
      summary.sourceMeasurementIds.every((id) =>
        measurementResults.values.some((value) => value.id === id),
      ),
    );
  assert.ok(summaries.some((item) => item.summaryOrigin === 'SOURCE'));
  assert.ok(summaries.some((item) => item.summaryOrigin === 'DXT_CALCULATED'));
});

test('measurement operations use reusable operation-specific coordinate sets', () => {
  const cd = definitions.coordinateSets.find(
    (item) => item.code === 'CDSEM_CHIP_INDEX',
  )!;
  const thickness = definitions.coordinateSets.find(
    (item) => item.code === 'THICKNESS_XY',
  )!;
  assert.notDeepEqual(
    cd.coordinateDefinitionIds,
    thickness.coordinateDefinitionIds,
  );
  assert.deepEqual(
    cd.coordinateDefinitionIds.map(
      (id) =>
        definitions.coordinateDefinitions.find((item) => item.id === id)!.code,
    ),
    ['CHIPINDEX_X', 'CHIPINDEX_Y'],
  );
  assert.deepEqual(
    thickness.coordinateDefinitionIds.map(
      (id) =>
        definitions.coordinateDefinitions.find((item) => item.id === id)!.code,
    ),
    ['X_POSITION', 'Y_POSITION'],
  );
});

test('measurement exclusions preserve 100 raw BCD sites and produce one 97-point effective state', () => {
  const raw = measurementResults.values.filter(
    (value) =>
      value.waferSubjectId === 'RSA6420.01' &&
      value.parameterDefinitionId === 'parameter-bcd-v1',
  );
  const before = structuredClone(raw);
  const effective = effectiveMeasurementValues(
    raw,
    measurementResults.validityDecisions,
  );
  assert.equal(raw.length, 100);
  assert.equal(effective.length, 97);
  assert.deepEqual(raw, before);
  assert.equal(currentValidity(measurementResults.validityDecisions).size, 3);
  assert.ok(
    measurementResults.validityDecisions.every(
      (decision) => decision.reason && decision.actor && decision.decidedAt,
    ),
  );
});

test('latest validity decision can include an excluded point again without altering raw data', () => {
  const raw = measurementResults.values.filter(
    (value) =>
      value.waferSubjectId === 'RSA6420.01' &&
      value.parameterDefinitionId === 'parameter-bcd-v1',
  );
  const history = [
    ...measurementResults.validityDecisions,
    {
      id: 'include-again',
      measurementValueId: 'value-cd-0-0-11',
      state: 'INCLUDED' as const,
      reason: 'Reviewed and accepted',
      actor: 'Lee Seunghyun',
      decidedAt: '2026-09-02T18:00:00+09:00',
    },
  ];
  assert.equal(effectiveMeasurementValues(raw, history).length, 98);
  assert.equal(
    raw.find((value) => value.id === 'value-cd-0-0-11')?.value.value,
    measurementResults.values.find((value) => value.id === 'value-cd-0-0-11')
      ?.value.value,
  );
});

test('standard representative statistics use effective values and retain source summary separately', () => {
  const raw = measurementResults.values.filter(
    (value) =>
      value.waferSubjectId === 'RSA6420.01' &&
      value.parameterDefinitionId === 'parameter-bcd-v1',
  );
  const effective = effectiveMeasurementValues(
    raw,
    measurementResults.validityDecisions,
  );
  for (const method of ['MEAN', 'MEDIAN', 'MIN', 'MAX'] as const)
    assert.equal(typeof aggregateMeasurements(effective, method), 'number');
  const source = measurementResults.summaries.find(
    (summary) => summary.summaryOrigin === 'SOURCE',
  );
  assert.ok(source);
  assert.equal(source?.aggregationMethod, 'THREE_SIGMA');
});

test('manual wafer and site measurements are normal MeasurementValues with preserved coordinates', () => {
  const manual = measurementResults.values.filter(
    (value) => value.acquisitionMethod === 'MANUAL',
  );
  assert.deepEqual(
    manual.map((value) => value.granularity),
    ['WAFER', 'SITE'],
  );
  assert.deepEqual(
    manual.map((value) => value.adHocParameter?.displayName),
    ['Adhesion Score', 'Visual Score'],
  );
  assert.equal(manual[0].coordinateValues.length, 0);
  assert.equal(manual[1].siteIdentity, 'S03');
  assert.equal(manual[1].coordinateValues.length, 2);
});

test('MeasurementGroup references observations without copying or calculating them', () => {
  const before = structuredClone(inspectionObservations);
  const group = createMeasurementGroup(
    { ...inspectionGroup, id: 'another-group' },
    inspectionObservations,
  );
  assert.equal(group.measurementValueIds.length, 3);
  assert.deepEqual(inspectionObservations, before);
  assert.ok(!('expression' in group));
});

test('arithmetic preparation matches identical Sites and keeps unequal input counts visible', () => {
  assert.equal(mockThkDelta.execution.matchingRule, 'SITE_IDENTITY');
  assert.equal(mockThkDelta.execution.matchedCount, 58);
  assert.deepEqual(mockThkDelta.execution.unmatchedA, ['Site59', 'Site60']);
  assert.deepEqual(mockThkDelta.execution.unmatchedB, []);
  assert.equal(mockThkDelta.resultDataset.datasetOrigin, 'DERIVED');
  assert.ok(
    mockThkDelta.resultValues.every(
      (value) =>
        value.acquisitionMethod === 'DERIVED' &&
        value.sourceMeasurementValueIds.length === 2,
    ),
  );
});

test('all four structured arithmetic operators execute without arbitrary formulas', () => {
  for (const operator of ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'] as const) {
    const result = executeArithmeticPreparation({
      id: `execution-${operator}`,
      runId: 'run-4',
      recipe: null,
      expression: { operator, leftAlias: 'A', rightAlias: 'B' },
      datasetA: preparationDatasets[0],
      datasetB: preparationDatasets[1],
      valuesA: preparationValues.filter(
        (value) => value.datasetId === preparationDatasets[0].id,
      ),
      valuesB: preparationValues.filter(
        (value) => value.datasetId === preparationDatasets[1].id,
      ),
      decisions: [],
      resultName: 'RESULT',
      resultUnit: 'nm',
      actor: 'Engineer',
      at: '2026-09-02T16:00:00+09:00',
    });
    assert.equal(result.resultValues.length, 58);
  }
});

test('saved recipe retains logic but does not bind execution datasets', () => {
  assert.equal(thkDeltaRecipe.expression.operator, 'SUBTRACT');
  assert.ok(!('inputDatasetAId' in thkDeltaRecipe));
  assert.ok(!('inputDatasetBId' in thkDeltaRecipe));
  assert.equal(mockThkDelta.execution.recipeId, thkDeltaRecipe.id);
  assert.equal(mockThkDelta.execution.inputMode, 'EFFECTIVE');
});

test('wafer analysis composes comparable wafers across Runs with typed provenance', () => {
  const selected = composeWaferAnalysisContexts(waferAnalysisContexts, [
    'series-dts-improvement/run-1/W01',
    'series-dts-improvement/run-4/W01',
  ]);
  assert.deepEqual(
    selected.map((x) => x.runNumber),
    [1, 4],
  );
  assert.equal(selected[0].conditions[0].value.dataType, 'NUMBER');
  assert.equal(selected[0].conditions[1].value.dataType, 'REFERENCE');
  assert.ok(
    selected.every((x) =>
      x.conditions.every((c) => c.assignmentId && c.scope && c.sourceLabel),
    ),
  );
});
test('analysis keeps missing derived results empty and reports only plottable wafers', () => {
  const plotted = plottableContexts(
    waferAnalysisContexts,
    'condition-energy-v1',
    'parameter-delta-thk-v1',
  );
  assert.deepEqual(
    plotted.map((x) => x.waferRef),
    ['series-dts-improvement/run-4/W01'],
  );
  assert.equal(
    waferAnalysisContexts[0].results.some(
      (x) => x.parameterId === 'parameter-delta-thk-v1',
    ),
    false,
  );
  assert.equal(
    plotted[0].results.find((x) => x.parameterId === 'parameter-delta-thk-v1')
      ?.acquisitionMethod,
    'DERIVED',
  );
  assert.equal(
    plotted[0].results.find((x) => x.parameterId === 'adhesion-score')
      ?.acquisitionMethod,
    'MANUAL',
  );
});

test('SavedAnalysis crosses Series without a Series owner', () => {
  const saved = savedAnalysisSchema.parse(savedAnalyses[0]);
  assert.equal(new Set(saved.waferRefs.map((ref) => ref.seriesId)).size, 2);
  assert.ok(!('seriesId' in saved));
  assert.equal(
    composeWaferAnalysisContexts(waferAnalysisContexts, saved.waferRefs).length,
    5,
  );
});
test('Series targets, engineer evaluation, and configured Next Action remain distinct', () => {
  assert.equal(series.targets.length, 3);
  assert.equal(series.summaryResults.length, 2);
  assert.equal(
    contexts[3].decision?.nextAction?.nextActionTypeDefinitionId,
    'next-action-design-next',
  );
  assert.ok(
    definitions.nextActionTypes.some(
      (item) => item.id === 'next-action-design-next',
    ),
  );
});
test('material and resource usage support wafer-aware operation context', () => {
  assert.equal(contexts[3].materials[0].usage.waferSubjectId, 'RSA6420.01');
  assert.ok(
    contexts[3].resourceUsages.some(
      (item) =>
        item.waferSubjectId === 'RSA6420.01' && item.intentRole === 'VARIED',
    ),
  );
});
test('repeated measurement executions retain PRE POST and remeasurement identity', () => {
  const executions = measurementResults.executions;
  assert.deepEqual(
    executions.map((item) => item.sequence),
    [1, 2, 3],
  );
  assert.deepEqual(
    executions.map((item) => item.measurementPoint),
    ['PRE', 'POST', 'POST'],
  );
  assert.equal(executions[0].acquisitionMethod, 'FILE_IMPORT');
  assert.equal(
    measurementResults.datasets.find(
      (item) => item.id === 'dataset-run-4-thickness-post',
    )?.measurementExecutionId,
    'measurement-execution-thk-post-1',
  );
});
test('saved analysis pins explicit wafer membership and lightweight view configuration', () => {
  const saved = savedAnalysisSchema.parse(savedAnalyses[0]);
  const later = [
    ...waferAnalysisContexts,
    {
      ...waferAnalysisContexts[0],
      waferRef: 'run-5/W07',
      runId: 'run-5',
      runNumber: 5,
    },
  ];
  assert.equal(
    composeWaferAnalysisContexts(later, saved.waferRefs).length,
    saved.waferRefs.length,
  );
  assert.equal(saved.visibility, 'PRIVATE');
  assert.ok(!('values' in saved));
});

test('experimental intent role is shared without collapsing explicit assignment identities', () => {
  const run = contexts[3],
    next = nextRunConcept(run);
  assert.equal(
    run.conditionSet.conditions.find(
      (item) => item.conditionDefinitionId === 'condition-energy-v1',
    )?.intentRole,
    'VARIED',
  );
  assert.equal(run.materials[0].usage.intentRole, 'VARIED');
  assert.equal(run.resourceUsages.at(-1)?.intentRole, 'VARIED');
  assert.equal(run.recipeAssignments[0].intentRole, 'VARIED');
  assert.equal(next.recipeAssignments[0].intentRole, 'VARIED');
  assert.ok(!('conditionDefinitionId' in run.recipeAssignments[0]));
});
test('target achievement is recomputed projection over target and observed result references', () => {
  const target = series.targets.find((item) => item.id === 'target-dts')!;
  assert.equal(
    evaluateSeriesTarget(target, 4.5, 'RSA6420.01', 'summary-dts').status,
    'ACHIEVED',
  );
  assert.equal(
    evaluateSeriesTarget(
      { ...target, threshold: 4.6 },
      4.5,
      'RSA6420.01',
      'summary-dts',
    ).status,
    'NOT_ACHIEVED',
  );
  assert.ok(!('targetAchievements' in series));
});
test('saved analysis pins datasets and representative results without copying values', () => {
  const saved = savedAnalysisSchema.parse(savedAnalyses[0]);
  assert.equal(saved.resultReferences.length, saved.waferRefs.length);
  assert.ok(
    saved.resultReferences.every(
      (item) => item.datasetId && item.representativeResultId,
    ),
  );
  assert.ok(!saved.resultReferences.some((item) => 'value' in item));
});
test('SITE analysis grain requires site references under explicitly selected wafers', () => {
  const base = structuredClone(savedAnalyses[0]);
  assert.throws(() =>
    savedAnalysisSchema.parse({ ...base, grain: 'SITE', siteRefs: [] }),
  );
  const parent = base.waferRefs[0];
  const site = savedAnalysisSchema.parse({
    ...base,
    grain: 'SITE',
    siteRefs: [
      {
        ...parent,
        datasetId: base.resultReferences[0].datasetId,
        siteIdentity: 'S03',
        coordinateDefinitionIds: [
          'coordinate-chip-x-v1',
          'coordinate-chip-y-v1',
        ],
      },
    ],
  });
  assert.equal(site.siteRefs[0].waferSubjectId, parent.waferSubjectId);
  assert.throws(() =>
    savedAnalysisSchema.parse({
      ...base,
      grain: 'SITE',
      siteRefs: [
        {
          ...parent,
          waferSubjectId: 'NOT_SELECTED',
          datasetId: 'dataset',
          siteIdentity: 'S01',
          coordinateDefinitionIds: [],
        },
      ],
    }),
  );
});
test('experiment Position and measurement Site remain separate with no implicit mapping', () => {
  assert.ok(
    definitions.conditions.every(
      (definition) => !definition.allowedScopes.includes('SITE'),
    ),
  );
  assert.ok(
    definitions.conditions.some((definition) =>
      definition.allowedScopes.includes('POSITION'),
    ),
  );
  assert.equal(
    measurementResults.values.find((value) => value.granularity === 'SITE')
      ?.siteIdentity,
    'S01',
  );
  assert.ok(!('positionId' in measurementResults.values[0]));
});

test('Series Workspace projection supports optional defaults, zero-or-many Runs, and multiple targets', () => {
  const empty = structuredClone(seriesWorkspaceScenarios['cmp-stability']);
  empty.runs = [];
  empty.targets = [];
  empty.defaults = [];
  assert.equal(empty.runs.length, 0);
  assert.equal(empty.targets.length, 0);
  assert.equal(empty.defaults.length, 0);
  assert.equal(seriesWorkspaceScenarios['dts-improvement'].targets.length, 3);
});
test('Series Workspace keeps multiple summary results without mandatory closure', () => {
  for (const scenario of Object.values(seriesWorkspaceScenarios)) {
    assert.ok(scenario.summaries.length > 1);
    assert.ok(!('finalResult' in scenario));
    assert.ok(!('closedAt' in scenario));
  }
});
test('Series Run projection is latest-first and presents semantic delta rather than a full snapshot', () => {
  for (const scenario of Object.values(seriesWorkspaceScenarios)) {
    assert.deepEqual(
      scenario.runs.map((run) => run.number),
      scenario.runs.map((run) => run.number).toSorted((a, b) => b - a),
    );
    assert.ok(
      scenario.runs.every(
        (run) => run.delta.length > 0 && typeof run.unchanged === 'number',
      ),
    );
    assert.ok(scenario.runs.every((run) => !('conditionSet' in run)));
  }
});
test('Series default measurement plan contains intent only and no acquisition technology', () => {
  for (const scenario of Object.values(seriesWorkspaceScenarios)) {
    const plan = scenario.defaults.find(
      (group) => group.group === 'Measurement Plan',
    )!;
    assert.ok(
      plan.items.every(
        (item) =>
          !/(TAS|Excel|REST API|Manual)/i.test(`${item.label} ${item.value}`),
      ),
    );
  }
});

test('Run Planning scenarios are independent full snapshots with valid Subject by Operation connectivity', () => {
  for (const plan of Object.values(runPlanningScenarios)) {
    assert.deepEqual(validatePlanningSnapshot(plan), []);
    assert.equal(
      Object.keys(plan.subjectOperationIds).length,
      plan.subjects.length,
    );
    assert.ok(
      plan.subjects.every(
        (subject) =>
          plan.subjectOperationIds[subject.id].length === plan.steps.length,
      ),
    );
    assert.ok(
      plan.provenance.kind === 'SERIES_DEFAULT' ||
        plan.provenance.kind === 'PREVIOUS_RUN',
    );
  }
});
test('common settings specialize through wafer overrides without mutating defaults', () => {
  const cmp = runPlanningScenarios.CMP;
  const commonPressure = cmp.assignments.find(
    (item) => item.label === 'Pressure' && !item.subjectId,
  )!;
  assert.equal(
    effectiveAssignments(cmp, 'RSA6420.01')['cmp-process:CONDITION:Pressure']
      .value,
    '3.0 psi',
  );
  assert.equal(
    effectiveAssignments(cmp, 'RSA6420.04')['cmp-process:CONDITION:Pressure']
      .value,
    '3.5 psi',
  );
  assert.equal(commonPressure.value, '3.0 psi');
});
test('Run Planning preserves explicit recipe material resource and variable roles', () => {
  for (const plan of Object.values(runPlanningScenarios)) {
    assert.ok(
      plan.assignments.some(
        (item) => item.kind === 'RECIPE' && item.referenceId,
      ),
    );
    assert.ok(
      plan.assignments.some(
        (item) =>
          item.kind === 'MATERIAL' && item.referenceId === 'sample-D035-r2',
      ),
    );
    assert.ok(plan.assignments.some((item) => item.kind === 'RESOURCE'));
    assert.ok(plan.assignments.some((item) => item.intentRole === 'FIXED'));
    assert.ok(plan.assignments.some((item) => item.intentRole === 'VARIED'));
  }
});
test('Material usage can remain wafer-wide or carry an optional process-step association', () => {
  const sample = structuredClone(
    runPlanningScenarios.PHOTO.assignments.find(
      (item) => item.kind === 'MATERIAL',
    )!,
  );
  sample.processStepId = null;
  assert.equal(sample.referenceId, 'sample-D035-r2');
  assert.equal(sample.processStepId, null);
  assert.ok(
    validatePlanningSnapshot({
      ...runPlanningScenarios.PHOTO,
      assignments: [sample],
    }).length === 0,
  );
});
test('Operation wafer and Position condition specialization remains separate from Measurement Site', () => {
  const photo = runPlanningScenarios.PHOTO;
  const energy = photo.assignments.filter((item) => item.label === 'Energy');
  assert.ok(energy.some((item) => !item.subjectId && !item.positionId));
  assert.ok(energy.some((item) => item.subjectId && !item.positionId));
  assert.ok(energy.some((item) => item.subjectId && item.positionId === 'P01'));
  assert.ok(!energy.some((item) => 'siteIdentity' in item));
});
test('Measurement plans preserve PRE POST intent and exclude acquisition provenance', () => {
  const cmp = runPlanningScenarios.CMP;
  assert.deepEqual(
    cmp.measurements.map((item) => item.point),
    ['PRE', 'POST'],
  );
  assert.ok(
    Object.values(runPlanningScenarios)
      .flatMap((plan) => plan.measurements)
      .every(
        (item) =>
          !('acquisitionMethod' in item) &&
          item.parameterDefinitionIds.length > 0,
      ),
  );
});
test('Run delta spans explicit setup categories without becoming the stored snapshot', () => {
  const kinds = new Set(
    Object.values(runPlanningScenarios).flatMap((plan) =>
      plan.delta.items.map((item) => item.kind),
    ),
  );
  assert.ok(kinds.has('CONDITION'));
  assert.ok(kinds.has('RESOURCE'));
  assert.ok(kinds.has('MEASUREMENT_PLAN'));
  const synthetic = structuredClone(runPlanningScenarios.PHOTO.delta);
  synthetic.items.push(
    {
      id: 'recipe-delta',
      kind: 'RECIPE',
      label: 'Recipe',
      change: 'CHANGED',
      before: 'R1',
      after: 'R2',
    },
    {
      id: 'material-delta',
      kind: 'MATERIAL',
      label: 'Sample',
      change: 'CHANGED',
      before: 'D035 Rev.2',
      after: 'D035 Rev.3',
    },
  );
  assert.deepEqual(
    new Set(synthetic.items.map((item) => item.kind)),
    new Set(['CONDITION', 'RECIPE', 'MATERIAL']),
  );
  assert.ok(!('assignments' in runPlanningScenarios.PHOTO.delta));
});
test('Run Planning additions preserve Series Workspace and cross-Series Analysis projections', () => {
  assert.equal(seriesWorkspaceScenarios['dts-improvement'].id, 'EXP-001');
  assert.equal(
    new Set(savedAnalyses[0].waferRefs.map((ref) => ref.seriesId)).size,
    2,
  );
});
test('varied setup presentation summarizes Subject assignments instead of a common value', () => {
  const photo = runPlanningScenarios.PHOTO;
  const energy = photo.assignments.find(
    (item) => item.label === 'Energy' && !item.subjectId,
  )!;
  assert.deepEqual(assignmentSummary(photo, energy, 'mJ/cm²'), {
    value: '34–37 mJ/cm²',
    detail: '4 subject assignments',
  });
  const cmp = runPlanningScenarios.CMP;
  const pad = cmp.assignments.find(
    (item) => item.label === 'Pad' && !item.subjectId,
  )!;
  assert.deepEqual(assignmentSummary(cmp, pad), {
    value: 'A / B / C / D',
    detail: '4 subject assignments',
  });
});
test('CMP pressure and slurry preserve explicit varied assignments', () => {
  const cmp = runPlanningScenarios.CMP;
  const pressure = cmp.assignments.find(
    (item) => item.label === 'Pressure' && !item.subjectId,
  )!;
  assert.deepEqual(assignmentSummary(cmp, pressure), {
    value: '3–3.5 psi',
    detail: '4 subject assignments',
  });
  assert.equal(pressure.intentRole, 'VARIED');
  assert.deepEqual(
    cmp.assignments
      .filter((item) => item.label === 'Slurry' && item.subjectId)
      .map((item) => item.value),
    ['A', 'A', 'B', 'B'],
  );
});
test('workspace selection preserves operation and subject across view changes', () => {
  const model = createExperimentWorkspace(runPlanningScenarios.PHOTO),
    initial = initialSelection(model);
  const selected = {
    ...initial,
    operationId: 'photo-exposure',
    subjectId: 'PHO7814.03',
    view: 'FLOW' as const,
  };
  const equipment = { ...selected, view: 'EQUIPMENT' as const };
  assert.equal(equipment.operationId, 'photo-exposure');
  assert.equal(equipment.subjectId, 'PHO7814.03');
});
test('Variable Composer creates sequence and group assignments without changing assignment kind', () => {
  const ids = runPlanningScenarios.PHOTO.subjects.map((subject) => subject.id);
  assert.deepEqual(Object.values(sequenceAssignments(ids, 34, 37, 1)), [
    '34',
    '35',
    '36',
    '37',
  ]);
  assert.deepEqual(
    groupAssignments([
      { subjectIds: ids.slice(0, 2), value: 'A' },
      { subjectIds: ids.slice(2), value: 'B' },
    ]),
    Object.fromEntries(ids.map((id, i) => [id, i < 2 ? 'A' : 'B'])),
  );
  const base = runPlanningScenarios.PHOTO.assignments.find(
    (a) => a.label === 'Energy' && !a.subjectId,
  )!;
  const updated = applyVariableAssignments(
    runPlanningScenarios.PHOTO,
    base,
    sequenceAssignments(ids, 34, 37, 1),
  );
  assert.ok(
    updated.assignments
      .filter((a) => a.label === 'Energy' && a.subjectId && !a.positionId)
      .every((a) => a.kind === 'CONDITION' && a.intentRole === 'VARIED'),
  );
});
test('workspace projections support common collapsing focus filtering and both areas', () => {
  assert.equal(
    collapseCommon(['D035 Rev.2', 'D035 Rev.2']),
    'Common: D035 Rev.2',
  );
  for (const plan of Object.values(runPlanningScenarios)) {
    const model = createExperimentWorkspace(plan);
    assert.ok(
      visibleOperations(model, 'EXPERIMENT_FOCUS').every((op) => op.focus),
    );
    assert.ok(model.operations.length >= 3);
    assert.ok(model.variationPoints.length > 0);
  }
});
test('workspace resolution and varied versus changed remain independent state', () => {
  const model = createExperimentWorkspace(runPlanningScenarios.PHOTO),
    selection = { ...initialSelection(model), resolution: 'SITE' as const };
  assert.equal(selection.resolution, 'SITE');
  assert.equal(
    model.snapshot.assignments.find((a) => a.label === 'Energy' && !a.subjectId)
      ?.intentRole,
    'VARIED',
  );
  assert.equal(
    model.snapshot.delta.items.find((d) => d.label === 'Energy range')?.change,
    'CHANGED',
  );
});
test('Reference options resolve from selected Operation applicability without cross-area mixing', () => {
  const photo = createExperimentWorkspace(runPlanningScenarios.PHOTO),
    cmp = createExperimentWorkspace(runPlanningScenarios.CMP);
  const exposure = applicableReferences(
      photo,
      photo.operations.find((op) => op.id === 'photo-exposure')!,
    ),
    polishing = applicableReferences(
      cmp,
      cmp.operations.find((op) => op.id === 'cmp-process')!,
    );
  assert.deepEqual(exposure.equipment, ['EXP-01', 'EXP-02', 'EXP-03']);
  assert.deepEqual(exposure.parameters, ['Energy', 'Focus']);
  assert.ok(!exposure.equipment.includes('CMP-01'));
  assert.deepEqual(polishing.equipment, ['CMP-01', 'CMP-02']);
  assert.deepEqual(polishing.recipes, ['CU-R07']);
  assert.ok(!polishing.equipment.includes('EXP-03'));
});
test('selected Operation provides Area context for future multi-area Runs', () => {
  const photo = createExperimentWorkspace(runPlanningScenarios.PHOTO);
  assert.equal(
    photo.operations.find((op) => op.id === 'photo-exposure')?.area,
    'PHOTO',
  );
  assert.equal(
    photo.operations.find((op) => op.id === 'photo-cdsem')?.area,
    'METROLOGY',
  );
});

void test('scope range overlay normalizes reverse drag and preserves manufacturing history', () => {
  const m = createExperimentWorkspace(runPlanningScenarios.PHOTO),
    before = structuredClone({ snapshot: m.snapshot, operations: m.operations, subjects: m.subjects, variationPoints: m.variationPoints });
  const ids = selectOperationRange(m.operations, 'photo-cdsem', 'photo-coat');
  assert.equal(ids.length, 6);
  assert.equal(ids[0], 'photo-coat');
  const range = confirmExperimentScope(
    m,
    'photo-cdsem',
    'photo-coat',
    m.subjects.map((w) => w.id),
    m.subjects.map((w) => w.id),
  );
  const scoped = { ...m, scopeRanges: [range] };
  assert.deepEqual(
    visibleOperations(scoped, 'EXPERIMENT_SCOPE').map((o) => o.id),
    ids,
  );
  assert.deepEqual(
    visibleOperations(scoped, 'EXPERIMENT_FOCUS').map((o) => o.id),
    ['photo-exposure', 'photo-cdsem'],
  );
  assert.equal(
    visibleOperations(scoped, 'FULL_HISTORY').length,
    m.operations.length,
  );
  assert.deepEqual({ snapshot: m.snapshot, operations: m.operations, subjects: m.subjects, variationPoints: m.variationPoints }, before);
  assert.equal(isFocusOperation(scoped, 'photo-coat'), false);
});
void test('scope confirmation requires actual selected wafers and supports range collections', () => {
  const m = createExperimentWorkspace(runPlanningScenarios.CMP),
    ids = m.subjects.map((w) => w.id);
  assert.throws(() =>
    confirmExperimentScope(m, 'cmp-thk-pre', 'cmp-thk-post', [], ids),
  );
  assert.throws(() =>
    confirmExperimentScope(m, 'cmp-thk-pre', 'cmp-thk-post', ['unknown'], ids),
  );
  const range = confirmExperimentScope(
    m,
    'cmp-thk-pre',
    'cmp-thk-post',
    ids.slice(0, 2),
    ids,
  );
  assert.equal(range.subjectIds.length, 2);
  assert.equal(range.operationIds.length, 3);
  assert.equal(
    visibleOperations({ ...m, scopeRanges: [range] }, 'EXPERIMENT_FOCUS')
      .length,
    3,
  );
  const small = confirmExperimentScope(
    m,
    'cmp-thk-pre',
    'cmp-thk-pre',
    [ids[0]],
    ids,
  );
  assert.deepEqual(
    visibleOperations({ ...m, scopeRanges: [small] }, 'EXPERIMENT_FOCUS').map(
      (o) => o.id,
    ),
    ['cmp-thk-pre'],
  );
});

void test('staged scope subjects can change after a provisional range without mutating source or confirmed references', () => {
  const model = createExperimentWorkspace(runPlanningScenarios.PHOTO);
  const before = structuredClone({ snapshot: model.snapshot, operations: model.operations, subjects: model.subjects, variationPoints: model.variationPoints });
  const draft = selectOperationRange(model.operations, 'peb', 'photo-coat');
  const candidates = Array.from(
    { length: 25 },
    (_, i) => `PHO7814.${String(i + 1).padStart(2, '0')}`,
  );
  assert.deepEqual({ snapshot: model.snapshot, operations: model.operations, subjects: model.subjects, variationPoints: model.variationPoints }, before);
  assert.throws(() =>
    confirmExperimentScope(model, draft[0], draft.at(-1)!, [], candidates),
  );
  const confirmed = confirmExperimentScope(
    model,
    draft[0],
    draft.at(-1)!,
    [candidates[4], candidates[24]],
    candidates,
  );
  assert.deepEqual(confirmed.subjectIds, ['PHO7814.05', 'PHO7814.25']);
  assert.deepEqual(confirmed.operationIds, draft);
  assert.deepEqual({ snapshot: model.snapshot, operations: model.operations, subjects: model.subjects, variationPoints: model.variationPoints }, before);
  draft.pop();
  assert.equal(confirmed.operationIds.length, 4);
});

void test('inline FIXED and VARIED edits project through the same assignments and retain typed references', () => {
  const original = runPlanningScenarios.PHOTO,
    before = structuredClone(original);
  const focus = original.assignments.find(
    (a) => a.label === 'Focus' && !a.subjectId,
  )!;
  const fixed = saveVariable(
    original,
    { ...focus, value: '0.10' },
    Object.fromEntries(original.subjects.map((subject) => [subject.id, '0.10'])),
  );
  for (const subject of original.subjects) {
    const effective = effectiveAssignments(fixed, subject.id)[
      'photo-exposure:CONDITION:Focus'
    ];
    assert.equal(effective.value, '0.10');
    assert.equal(effective.intentRole, 'FIXED');
    assert.equal(effective.referenceId, focus.referenceId);
  }
  const energy = original.assignments.find(
    (a) => a.label === 'Energy' && !a.subjectId,
  )!;
  const varied = saveVariable(fixed, energy, {
    'PHO7814.01': '40',
    'PHO7814.05': '44',
    'PHO7814.25': '45',
  });
  const updatedModel = createExperimentWorkspace(varied);
  assert.equal(
    operationAssignments(updatedModel, 'photo-exposure', 'PHO7814.01').find(
      (a) => a.label === 'Energy',
    )?.value,
    '40',
  );
  assert.equal(
    operationAssignments(updatedModel, 'photo-exposure', 'PHO7814.25').find(
      (a) => a.label === 'Energy',
    )?.value,
    '45',
  );
  assert.equal(
    effectiveAssignments(varied, 'PHO7814.02')[
      'photo-exposure:CONDITION:Energy'
    ].value,
    '35',
  );
  assert.deepEqual(
    varied.assignments.filter((a) => a.positionId),
    original.assignments.filter((a) => a.positionId),
  );
  assert.deepEqual(original, before);
  const held = saveVariable(fixed, focus, { 'PHO7814.01': '0.20' });
  assert.equal(
    effectiveAssignments(held, 'PHO7814.01')['photo-exposure:CONDITION:Focus']
      .intentRole,
    'FIXED',
  );
  const sameButVaried = saveVariable(
    fixed,
    energy,
    Object.fromEntries(original.subjects.map((subject) => [subject.id, '35'])),
  );
  assert.equal(
    effectiveAssignments(sameButVaried, 'PHO7814.01')[
      'photo-exposure:CONDITION:Energy'
    ].intentRole,
    'VARIED',
  );
});

void test('manual focus augments varied and measurement focus within the selected experiment', () => {
  const base = createExperimentWorkspace(runPlanningScenarios.PHOTO);
  const range = confirmExperimentScope(
    base,
    'photo-coat',
    'photo-cdsem',
    base.subjects.map((w) => w.id),
    base.subjects.map((w) => w.id),
  );
  const manual = {
    ...base,
    scopeRanges: [range],
    manualFocus: ['photo-coat', 'photo-etch'],
  };
  assert.deepEqual(
    visibleOperations(manual, 'EXPERIMENT_FOCUS').map((o) => o.id),
    ['photo-coat', 'photo-exposure', 'photo-cdsem'],
  );
  assert.equal(visibleOperations(manual, 'EXPERIMENT_SCOPE').length, 6);
  assert.equal(visibleOperations(manual, 'FULL_HISTORY').length, 9);
  assert.deepEqual(
    visibleOperations({ ...manual, manualFocus: [] }, 'EXPERIMENT_FOCUS').map(
      (o) => o.id,
    ),
    ['photo-exposure', 'photo-cdsem'],
  );
});

void test('Run planning persistence round-trips scope and variables and rejects wrong Run or invalid references', () => {
  for (const snapshot of Object.values(runPlanningScenarios)) {
    const m = createExperimentWorkspace(snapshot),
      ids = m.subjects.map((w) => w.id);
    const operations = m.operations.filter((op) => op.focus);
    const range = confirmExperimentScope(
      m,
      operations[0].id,
      operations.at(-1)!.id,
      ids,
      ids,
    );
    const data = {
      version: 1,
      runId: snapshot.id,
      ranges: [range],
      assignments: snapshot.assignments,
      manualFocus: [operations[0].id],
    };
    assert.deepEqual(
      restorePlanningContext(snapshot, JSON.stringify(data)),
      data,
    );
    assert.equal(restorePlanningContext(snapshot, '{bad'), null);
    assert.equal(
      restorePlanningContext(
        snapshot,
        JSON.stringify({ ...data, runId: 'other-run' }),
      ),
      null,
    );
    assert.equal(
      restorePlanningContext(
        snapshot,
        JSON.stringify({ ...data, ranges: [{ ...range, subjectIds: [] }] }),
      ),
      null,
    );
    assert.equal(
      restorePlanningContext(
        snapshot,
        JSON.stringify({
          ...data,
          assignments: [{ ...snapshot.assignments[0], referenceId: 'wrong' }],
        }),
      ),
      null,
    );
    const base = snapshot.assignments.find(
      (a) => a.kind === 'CONDITION' && !a.subjectId,
    )!;
    const changed = saveVariable(
      snapshot,
      { ...base, value: '42' },
      Object.fromEntries(ids.map((id) => [id, '42'])),
    );
    assert.deepEqual(
      restorePlanningContext(
        snapshot,
        JSON.stringify({ ...data, assignments: changed.assignments }),
      )?.assignments,
      changed.assignments,
    );
  }
  assert.notEqual(
    planningStorageKey(runPlanningScenarios.PHOTO.id),
    planningStorageKey(runPlanningScenarios.CMP.id),
  );
});

void test('Add Variable options are operation-specific and sequence supports arbitrary selected wafers', () => {
  const photo = createExperimentWorkspace(runPlanningScenarios.PHOTO),
    cmp = createExperimentWorkspace(runPlanningScenarios.CMP);
  assert.ok(
    variableDefinitions(photo, 'photo-exposure').every(
      (a) => a.processStepId === 'photo-exposure',
    ),
  );
  assert.equal(variableDefinitions(photo, 'photo-cdsem').length, 0);
  assert.equal(variableDefinitions(cmp, 'cmp-thk-pre').length, 0);
  const rpm = variableDefinitions(cmp, 'cmp-process').find(
    (a) => a.label === 'RPM',
  )!;
  assert.ok(definitions.conditions.some((d) => d.id === rpm.referenceId));
  const updated = saveVariable(cmp.snapshot, rpm, { 'RSA6420.05': '91' });
  assert.equal(
    effectiveAssignments(updated, 'RSA6420.05')['cmp-process:CONDITION:RPM']
      .value,
    '91',
  );
  assert.deepEqual(sequenceAssignments(['W05', 'W12', 'W25'], 0.1, 0.3, 0.1), {
    W05: '0.1',
    W12: '0.2',
    W25: '0.3',
  });
  assert.deepEqual(sequenceAssignments(['W05', 'W12'], 3, 2, -1), {
    W05: '3',
    W12: '2',
  });
  assert.throws(() => sequenceAssignments(['W01'], 1, 2, 0));
  assert.throws(() => sequenceAssignments(['W01'], NaN, 2, 1));
});

void test('Recipe Material and Resource intent stays editable without collapsing typed assignments', () => {
  const snapshot = {
    ...runPlanningScenarios.PHOTO,
    assignments: runPlanningScenarios.PHOTO.assignments.filter(
      (a) => a.intentRole !== 'VARIED',
    ),
  };
  assert.equal(
    isFocusOperation(createExperimentWorkspace(snapshot), 'photo-exposure'),
    false,
  );
  for (const kind of ['RECIPE', 'MATERIAL', 'RESOURCE'] as const) {
    const item = snapshot.assignments.find(
      (a) => a.kind === kind && !a.subjectId,
    )!;
    const changed = saveVariable(
      snapshot,
      { ...item, intentRole: 'VARIED' },
      Object.fromEntries(
        snapshot.subjects.map((subject) => [subject.id, item.value]),
      ),
    );
    const effective = effectiveAssignments(changed, snapshot.subjects[0].id)[
      `${item.processStepId}:${kind}:${item.label}`
    ];
    assert.equal(effective.kind, kind);
    assert.equal(effective.referenceId, item.referenceId);
    assert.equal(effective.intentRole, 'VARIED');
    assert.ok(
      isFocusOperation(createExperimentWorkspace(changed), item.processStepId!),
    );
  }
  assert.deepEqual(
    variableDefinitions(createExperimentWorkspace(snapshot), 'cmp-process'),
    [],
  );
});

const packageContext = (
  packageId:
    | 'config-package-photo-v1'
    | 'config-package-photo-v2'
    | 'config-package-cmp-v1',
) =>
  packageId.includes('cmp')
    ? {
        configurationPackageVersionId: packageId,
        operationDefinitionRevisionId: 'operation-m2-cu-cmp-v1',
        areaDefinitionRevisionId: 'area-cmp-v1',
        subjectTypeRevisionId: 'subject-wafer-r1',
        requestedGrainRevisionId: 'grain-subject-r1',
        equipmentReferenceId: 'equipment-cmp-01-r1',
        moduleReferenceId: 'module-platen-2-r1',
        experimentTypeProfileVersionId: 'experiment-profile-cmp-v1',
      }
    : {
        configurationPackageVersionId: packageId,
        operationDefinitionRevisionId: 'operation-photo-exposure-v1',
        areaDefinitionRevisionId: 'area-photo-v1',
        subjectTypeRevisionId: 'subject-wafer-r1',
        requestedGrainRevisionId: 'grain-subject-r1',
        equipmentReferenceId: 'equipment-exp-03-r1',
        moduleReferenceId: 'module-exposure-r1',
        experimentTypeProfileVersionId: 'experiment-profile-photo-v1',
      };

void test('configuration packages validate exact revisions before activation', () => {
  const validated = validateConfigurationFixtures();
  assert.equal(validated.length, 4);
  assert.ok(Object.isFrozen(validated[0]));
  assert.ok(Object.isFrozen(validated[0].definitionRevisionIds));
  const broken = structuredClone(configurationRegistry.packages[1]);
  broken.definitionRevisionIds.push('definition-missing-r1');
  assert.throws(
    () =>
      validateConfigurationPackageVersion(
        broken,
        configurationRegistry,
        definitions,
        registeredConfigurationEditorKeys,
      ),
    /Unresolved pinned definition revision/,
  );
});

void test('Run pinning preserves historical package semantics and never substitutes latest', () => {
  assert.equal(
    runPlanningScenarios.PHOTO.configurationPackageVersionId,
    'config-package-photo-v1',
  );
  const historical = resolveConfigurationApplicability(
    configurationRegistry,
    packageContext('config-package-photo-v1'),
  ).find((item) => item.revisionId === 'condition-energy-v1')!;
  const active = resolveConfigurationApplicability(
    configurationRegistry,
    packageContext('config-package-photo-v2'),
  ).find((item) => item.revisionId === 'condition-energy-v1')!;
  assert.deepEqual(
    [historical.defaultValue, historical.defaultRole],
    ['35', 'VARIED'],
  );
  assert.deepEqual([active.defaultValue, active.defaultRole], ['40', 'FIXED']);
  assert.throws(
    () =>
      resolvePinnedConfigurationPackage(
        configurationRegistry,
        'config-package-photo-latest',
      ),
    /Unresolved pinned ConfigurationPackageVersion/,
  );
});

void test('PHOTO and CMP use one resolver while their package definitions stay isolated', () => {
  const photo = resolveConfigurationApplicability(
    configurationRegistry,
    packageContext('config-package-photo-v1'),
  );
  const cmp = resolveConfigurationApplicability(
    configurationRegistry,
    packageContext('config-package-cmp-v1'),
  );
  assert.ok(photo.some((item) => item.revisionId === 'condition-energy-v1'));
  assert.ok(!photo.some((item) => item.revisionId === 'condition-pressure-v1'));
  assert.ok(cmp.some((item) => item.revisionId === 'condition-pressure-v1'));
  assert.ok(!cmp.some((item) => item.revisionId === 'condition-energy-v1'));
});

void test('workspace assignments pin exact references resolved by the Run package', () => {
  for (const scenario of [
    runPlanningScenarios.PHOTO,
    runPlanningScenarios.CMP,
  ]) {
    const resolved = resolveConfigurationApplicability(
      configurationRegistry,
      packageContext(
        scenario.configurationPackageVersionId as Parameters<
          typeof packageContext
        >[0],
      ),
    );
    const exactReferences = new Set(
      resolved.map((item) => item.assignmentReferenceRevisionId),
    );
    const commonAssignments = scenario.assignments.filter(
      (item) => !item.subjectId && !item.positionId,
    );
    assert.ok(
      commonAssignments.every((item) => exactReferences.has(item.referenceId)),
    );
  }
});

void test('equal-specificity applicability conflicts fail deterministically', () => {
  const registry = structuredClone(configurationRegistry);
  const ruleSet = registry.applicabilityRuleSets.find(
    (item) => item.id === 'rules-photo-v1',
  )!;
  const energy = ruleSet.rules.find(
    (item) => item.definitionRevisionId === 'condition-energy-v1',
  )!;
  ruleSet.rules.push({
    ...energy,
    id: 'photo-energy-conflict-r1',
    defaultRole: 'FIXED',
  });
  assert.throws(
    () =>
      resolveConfigurationApplicability(
        registry,
        packageContext('config-package-photo-v1'),
      ),
    /Equal-specificity applicability conflict: condition-energy-v1/,
  );
  assert.throws(
    () =>
      validateConfigurationPackageVersion(
        registry.packages.find((item) => item.id === 'config-package-photo-v1'),
        registry,
        definitions,
        registeredConfigurationEditorKeys,
      ),
    /Equal-specificity applicability conflict: condition-energy-v1/,
  );
});

void test('configured roles are defaults; explicit assignments and value differences do not infer intent', () => {
  const model = createExperimentWorkspace(runPlanningScenarios.PHOTO);
  const configured = variableDefinitions(model, 'photo-exposure').find(
    (item) => item.referenceId === 'condition-energy-v1',
  )!;
  assert.equal(configured.intentRole, 'VARIED');
  const explicit = { ...configured, intentRole: 'FIXED' as const };
  const changed = saveVariable(model.snapshot, explicit, {
    'PHO7814.01': '31',
    'PHO7814.02': '39',
  });
  assert.equal(
    changed.assignments.find((item) => item.id === explicit.id)?.intentRole,
    'FIXED',
  );
  assert.ok(
    changed.assignments
      .filter(
        (item) =>
          item.referenceId === 'condition-energy-v1' && !item.positionId,
      )
      .every((item) => item.intentRole === 'FIXED'),
  );
});

const configurationCommands = () => {
  const repository = new InMemoryConfigurationRepository(configurationRegistry);
  return {
    repository,
    commands: new ConfigurationManagementCommands(
      repository,
      definitions,
      registeredConfigurationEditorKeys,
    ),
  };
};
const packageAssembly = (
  source: (typeof configurationRegistry.packages)[number],
  applicabilityRuleSetVersionIds = source.applicabilityRuleSetVersionIds,
): PackageAssembly => ({
  subjectTypeRevisionIds: [...source.subjectTypeRevisionIds],
  departmentAreaProfileVersionIds: [...source.departmentAreaProfileVersionIds],
  experimentTypeProfileVersionIds: [...source.experimentTypeProfileVersionIds],
  definitionRevisionIds: [...source.definitionRevisionIds],
  equipmentCapabilityProfileVersionIds: [
    ...source.equipmentCapabilityProfileVersionIds,
  ],
  applicabilityRuleSetVersionIds: [...applicabilityRuleSetVersionIds],
  validationProfileVersionIds: [...source.validationProfileVersionIds],
  projectionProfileVersionIds: [...source.projectionProfileVersionIds],
  nextActionTypeRevisionIds: [...source.nextActionTypeRevisionIds],
});

void test('configuration repository exposes ACTIVE artifacts as immutable exact versions', () => {
  const { repository } = configurationCommands();
  const active = repository.getPackageVersion('config-package-photo-v2')!;
  assert.equal(active.status, 'ACTIVE');
  assert.ok(Object.isFrozen(active));
  assert.ok(Object.isFrozen(active.definitionRevisionIds));
  assert.throws(() => {
    (active as { status: string }).status = 'DRAFT';
  }, TypeError);
  const revision = repository.getRevision();
  assert.throws(() =>
    repository.transact((transaction) => {
      const registry = transaction.getConfigurationRegistry();
      registry.packages
        .find((item) => item.id === active.id)!
        .definitionRevisionIds.push('unauthorized-revision');
    }),
  );
  assert.equal(repository.getRevision(), revision);
  assert.equal(
    repository.getPackageVersion('config-package-photo-v2')?.status,
    'ACTIVE',
  );
});

void test('definition authoring always creates a new immutable revision', () => {
  const { repository, commands } = configurationCommands();
  const old = repository
    .getConfigurationRegistry()
    .definitionDescriptors.find(
      (item) => item.revisionId === 'condition-energy-v1',
    )!;
  const created = commands.createImmutableDefinitionRevision({
    definitionId: 'condition-energy',
    version: 2,
    scope: { kind: 'AREA', ownerId: 'semiconductor-rd' },
    descriptor: {
      ...old,
      revisionId: 'condition-energy-v2',
      label: 'Exposure dose revision 2',
    },
  });
  assert.ok(Object.isFrozen(created));
  assert.equal(created.descriptor.revisionId, 'condition-energy-v2');
  assert.equal(
    repository
      .getConfigurationRegistry()
      .definitionDescriptors.find(
        (item) => item.revisionId === 'condition-energy-v1',
      )?.label,
    old.label,
  );
  assert.throws(
    () =>
      commands.createImmutableDefinitionRevision({
        ...created,
        descriptor: {
          ...created.descriptor,
          revisionId: 'condition-energy-v2-copy',
        },
      }),
    /Definition version already exists/,
  );
});

void test('atomic package activation preserves historical Run pins', () => {
  const { repository, commands } = configurationCommands();
  const activeV2 = repository.getPackageVersion('config-package-photo-v2')!;
  const sourceRules =
    repository.getApplicabilityRuleSetVersion('rules-photo-v2')!;
  commands.createApplicabilityRuleSetVersion({
    ...sourceRules,
    id: 'rules-photo-v3',
    version: 3,
    status: 'DRAFT',
    rules: sourceRules.rules.map((rule) =>
      rule.definitionRevisionId === 'condition-energy-v1'
        ? { ...rule, id: 'photo-energy-r3', defaultValue: '50' }
        : { ...rule, id: `${rule.id}-v3` },
    ),
  });
  commands.createDraftPackage({
    id: 'draft-photo-v3',
    packageId: activeV2.packageId,
    targetVersion: 3,
    scope: activeV2.scope,
  });
  commands.assemblePackageVersion({
    draftId: 'draft-photo-v3',
    packageVersionId: 'config-package-photo-v3',
    assembly: packageAssembly(activeV2, ['rules-photo-v3']),
  });
  const historicalBefore = resolveConfigurationApplicability(
    repository,
    packageContext('config-package-photo-v1'),
  ).find((item) => item.revisionId === 'condition-energy-v1')!;
  commands.activatePackageVersion('config-package-photo-v3');
  const historicalAfter = resolveConfigurationApplicability(
    repository,
    packageContext('config-package-photo-v1'),
  ).find((item) => item.revisionId === 'condition-energy-v1')!;
  const current = resolveConfigurationApplicability(repository, {
    ...packageContext('config-package-photo-v2'),
    configurationPackageVersionId: 'config-package-photo-v3',
  }).find((item) => item.revisionId === 'condition-energy-v1')!;
  assert.deepEqual(historicalAfter, historicalBefore);
  assert.equal(current.defaultValue, '50');
  assert.equal(repository.getPackageVersion(activeV2.id)?.status, 'INACTIVE');
  assert.equal(
    repository.getPackageVersion('config-package-photo-v3')?.status,
    'ACTIVE',
  );
  assert.equal(
    repository.getApplicabilityRuleSetVersion('rules-photo-v3')?.status,
    'ACTIVE',
  );
});

void test('invalid package activation rolls back atomically', () => {
  const { repository, commands } = configurationCommands();
  const active = repository.getPackageVersion('config-package-cmp-v1')!;
  commands.createDraftPackage({
    id: 'draft-cmp-v2-invalid',
    packageId: active.packageId,
    targetVersion: 2,
    scope: active.scope,
  });
  commands.assemblePackageVersion({
    draftId: 'draft-cmp-v2-invalid',
    packageVersionId: 'config-package-cmp-v2-invalid',
    assembly: {
      ...packageAssembly(active),
      definitionRevisionIds: [
        ...active.definitionRevisionIds,
        'missing-definition-r1',
      ],
    },
  });
  const revisionBefore = repository.getRevision();
  assert.throws(
    () => commands.activatePackageVersion('config-package-cmp-v2-invalid'),
    /Unresolved pinned definition revision/,
  );
  assert.equal(repository.getRevision(), revisionBefore);
  assert.equal(
    repository.getPackageVersion('config-package-cmp-v1')?.status,
    'ACTIVE',
  );
  assert.equal(
    repository.getPackageVersion('config-package-cmp-v2-invalid')?.status,
    'DRAFT',
  );
});

void test('repository-backed resolver accepts exact pins only and shares the PHOTO CMP path', () => {
  const { repository, commands } = configurationCommands();
  assert.throws(
    () =>
      resolvePinnedConfigurationPackage(repository, 'config-package-latest'),
    /Unresolved pinned ConfigurationPackageVersion/,
  );
  const photo = resolveConfigurationApplicability(
    repository,
    packageContext('config-package-photo-v1'),
  );
  const cmp = resolveConfigurationApplicability(
    repository,
    packageContext('config-package-cmp-v1'),
  );
  assert.ok(photo.some((item) => item.revisionId === 'condition-energy-v1'));
  assert.ok(cmp.some((item) => item.revisionId === 'condition-pressure-v1'));
  commands.deactivatePackageVersion('config-package-cmp-v1');
  assert.equal(
    repository.getPackageVersion('config-package-cmp-v1')?.status,
    'INACTIVE',
  );
  assert.ok(
    resolveConfigurationApplicability(
      repository,
      packageContext('config-package-cmp-v1'),
    ).length > 0,
  );
});

void test('Reference Studio applicability projection exposes Energy and Pressure through one structured model', () => {
  const energy = studioApplicabilityRows('condition-energy-v1');
  const pressure = studioApplicabilityRows('condition-pressure-v1');
  assert.ok(energy.length > 0);
  assert.ok(pressure.length > 0);
  assert.deepEqual(
    Object.keys(energy[0]).sort(),
    Object.keys(pressure[0]).sort(),
  );
  assert.equal(energy[0].rule.definitionRevisionId, 'condition-energy-v1');
  assert.equal(pressure[0].rule.definitionRevisionId, 'condition-pressure-v1');
});

void test('Reference Studio context summary is generated from selected applicability data', () => {
  const energy = applicabilityContextSummary('condition-energy-v1');
  const pressure = applicabilityContextSummary('condition-pressure-v1');
  assert.equal(energy.definition.name, 'Energy');
  assert.equal(energy.context?.operation, 'Exposure');
  assert.equal(
    energy.behavior?.role,
    studioApplicabilityRows('condition-energy-v1').sort(
      (left, right) => right.ruleSet.version - left.ruleSet.version,
    )[0].rule.defaultRole,
  );
  assert.equal(pressure.definition.name, 'Pressure');
  assert.equal(pressure.context?.operation, 'M2 CU CMP');
  assert.equal(pressure.behavior?.unit, 'psi');
});

void test('Reference Studio resolver preview returns the workspace resolver output for an exact pin', () => {
  const context = packageContext('config-package-photo-v1');
  assert.deepEqual(
    studioResolverPreview(context),
    resolveConfigurationApplicability(configurationRegistry, context),
  );
});

void test('Reference Studio package summary preserves exact manifest access and historical safety', () => {
  const packageVersion = configurationRegistry.packages.find(
    (item) => item.id === 'config-package-photo-v2',
  )!;
  const summary = packagePrimarySummary(packageVersion);
  const safety = historicalRunSafety(packageVersion);
  assert.equal(summary.status, 'ACTIVE');
  assert.equal(
    summary.composition.definitions,
    packageVersion.definitionRevisionIds.length,
  );
  assert.ok(
    packageVersion.definitionRevisionIds.includes('condition-energy-v1'),
  );
  assert.equal(safety.historicalRuns, 1);
  assert.deepEqual(safety.pinnedVersions, [1]);
});

void test('Reference Studio refined projections contain no scenario-name branches', () => {
  const source = [
    applicabilityContextSummary,
    studioResolverPreview,
    packagePrimarySummary,
    historicalRunSafety,
  ]
    .map((projection) => projection.toString())
    .join('\n');
  assert.doesNotMatch(
    source,
    /(?:===|!==)\s*['"](?:PHOTO|CMP|Energy|Pressure|Exposure|M2 CU CMP|Wafer)['"]/,
  );
});
