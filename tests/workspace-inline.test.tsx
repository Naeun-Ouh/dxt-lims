import { LifecycleInspectorClose } from '../src/shared/ui/lifecycle-inspector-close';
import { AnalysisChart } from '../src/features/analysis/result-chart';
import { ActualExecutionGrid } from '../src/features/run-registration/actual-execution-grid';
import { MeasurementExecutionGrid } from '../src/features/run-registration/measurement-execution-grid';
import {applyGridPlanEdits} from '../src/features/run-registration/engineering-grid-plan-edit';
import AnalysisWorkspace from '../src/features/analysis/workspace';
import { DxtApplicationProvider } from '../src/application/dxt-application-provider';
import HistoricalWaferPage from '../app/series/dts-improvement/runs/19/engineering-grid/page';
import HistoricalCmpPage from '../app/series/cmp-stability/runs/13/engineering-grid/page';
import HistoricalSpecimenPage from '../app/series/adhesion-material-optimization/runs/4/engineering-grid/page';
import LegacyPhotoWorkspace from '../app/series/dts-improvement/runs/18/workspace/page';
import LegacyCmpWorkspace from '../app/series/cmp-stability/runs/12/workspace/page';
import PhotoGridPage from '../app/series/dts-improvement/runs/18/engineering-grid/page';
import CmpGridPage from '../app/series/cmp-stability/runs/12/engineering-grid/page';
import MaterialGridPage from '../app/series/adhesion-material-optimization/runs/3/engineering-grid/page';
import { ScopeSelectionPanel } from '../src/features/run-registration/scope-selection-panel';
import { OperationTable } from '../src/features/run-registration/operation-table';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/shared/i18n/locale';
import type { ReactNode } from 'react';
const renderToStaticMarkup = (node: ReactNode) => renderMarkup(<LocaleProvider initialLocale="en" persist={false}>{node}</LocaleProvider>);
import { readFileSync } from 'node:fs';

void test('exact Saved Analysis entry never renders default Study results before the requested identity resolves', () => {
  const html=renderToStaticMarkup(<DxtApplicationProvider><AnalysisWorkspace initialContext={{savedViewId:'missing-freeze-rerun'}} /></DxtApplicationProvider>);
  assert.match(html,/Loading exact Saved Analysis/);
  assert.doesNotMatch(html,/Save View|RESULT TABLE|resolved rows|visualization of selected Measurement/);
});
import {
  runPlanningScenarios,
  effectiveAssignments,
} from '../src/features/run-registration/planning-model';
import {
  createExperimentWorkspace as createExperimentWorkspaceWithRepository,
  operationAssignments,
  visibleOperations,
} from '../src/features/run-registration/workspace-model';
import {
  resolvedDefinitionForAssignment,
  saveVariable,
} from '../src/features/run-registration/variable-model';
import {
  effectiveVariableRole,
  validateVariableValue,
} from '../src/features/run-registration/applicability';
import { resolveConfigurationApplicability } from '../src/domain/reference/configuration';
import { configurationRegistry, configurationRepository } from '../src/mock/configuration-packages';
import { createInMemoryRepositories } from '../src/infrastructure/memory/in-memory-repositories';
import {
  BrowserDecisionRepository,
  BrowserEvaluationRepository,
  BrowserExecutionRepository,
  BrowserMeasurementRepository,
  BrowserRunRepository,
  BrowserSavedAnalysisRepository,
  BrowserStudyRepository,
  createBrowserRepositories,
} from '../src/infrastructure/browser/browser-repositories';
import { DxtApplication } from '../src/application/dxt-application';

void test('historical Run routes request their exact identity instead of the latest Run', () => {
  for (const [page, study, run] of [
    [HistoricalWaferPage, 'dts-improvement', 19],
    [HistoricalCmpPage, 'cmp-stability', 13],
    [HistoricalSpecimenPage, 'adhesion-material-optimization', 4],
  ] as const) {
    const { props } = page();
    assert.equal(props.seriesSlug, study);
    assert.equal(props.runNumber, run, 'omitting the number silently resolves the newest persisted Run');
  }
});

void test('Production legacy workspace redirects preserve exact Run identity',()=>{
  const previous=process.env.DXT_REPOSITORY;process.env.DXT_REPOSITORY='postgres';
  try{
    assert.throws(()=>LegacyPhotoWorkspace(),/\/series\/dts-improvement\/runs\/18\/engineering-grid/);
    assert.throws(()=>LegacyCmpWorkspace(),/\/series\/cmp-stability\/runs\/12\/engineering-grid/);
  }finally{if(previous===undefined)delete process.env.DXT_REPOSITORY;else process.env.DXT_REPOSITORY=previous;}
});
void test('Production canonical prototype URLs never mount fixture authoring components',()=>{
  const previous=process.env.DXT_REPOSITORY;process.env.DXT_REPOSITORY='postgres';
  try{
    for(const [page,slug,number] of [[PhotoGridPage,'dts-improvement',18],[CmpGridPage,'cmp-stability',12],[MaterialGridPage,'adhesion-material-optimization',3]] as const){const element=page();assert.equal(element.props.seriesSlug,slug);assert.equal(element.props.runNumber,number);assert.equal(element.type,HistoricalWaferPage().type);}
  }finally{if(previous===undefined)delete process.env.DXT_REPOSITORY;else process.env.DXT_REPOSITORY=previous;}
});

const createExperimentWorkspace = (snapshot: Parameters<typeof createExperimentWorkspaceWithRepository>[0]) =>
  createExperimentWorkspaceWithRepository(snapshot, configurationRepository);
const restorePlanningContext = (snapshot: Parameters<typeof restorePlanningContextWithRepository>[0], raw: string | null) =>
  restorePlanningContextWithRepository(snapshot, raw, configurationRepository);
const createInitialStudySetup = (slug: Parameters<typeof createInitialStudySetupWithRepository>[0]) =>
  createInitialStudySetupWithRepository(slug, configurationRepository);
const resolvedStudySetupItems = (setup: Parameters<typeof resolvedStudySetupItemsWithRepository>[0], operationId: string) =>
  resolvedStudySetupItemsWithRepository(setup, operationId, configurationRepository);
const addStudySetupItem = (setup: Parameters<typeof addStudySetupItemWithRepository>[0], operationId: string, item: Parameters<typeof addStudySetupItemWithRepository>[2]) =>
  addStudySetupItemWithRepository(setup, operationId, item, configurationRepository);
import {
  physicalWaferToSubjectRef,
} from '../src/features/run-registration/subject-projection';
import {
  planEngineeringGridSchema,
  projectEngineeringGridRows,
  scaleGridOperations,
} from '../src/features/run-registration/engineering-grid-model';
import {
  compareExecutionValue,
  plannedExecutionIdentity,
  projectActualExecution,
  projectOperationExecution,
} from '../src/features/run-registration/actual-execution-model';
import { actualExecutionScenarios as legacyActualExecutionScenarios } from '../src/mock/actual-execution';
import { normalizeLegacySemiconductorExecution } from '../src/features/run-registration/legacy-semiconductor-execution-adapter';
import {
  plannedMeasurementIdentity,
  projectMeasurementEvidence,
} from '../src/features/run-registration/measurement-grid-model';
import { engineeringGridMeasurementScenarios as legacyEngineeringGridMeasurementScenarios } from '../src/mock/engineering-grid-measurements';
import { normalizeLegacyWaferMeasurements } from '../src/domain/measurement/legacy-wafer-compatibility';
import { normalizeLegacySemiconductorPlanning } from '../src/features/run-registration/legacy-semiconductor-planning-adapter';
import {
  calculateTargetAchievement,
  projectEvaluations,
} from '../src/features/run-registration/evaluation-grid-model';
import { engineeringGridEvaluationScenarios } from '../src/mock/engineering-grid-evaluations';
import {
  createNextRunPreview,
  projectDecisionContinuation,
  resolveNextActionPresentation,
} from '../src/features/run-registration/decision-continuation-model';
import { engineeringGridDecisionScenarios } from '../src/mock/engineering-grid-decisions';
import {
  AdditionalMeasurementPreview,
  EvaluationExecutionGrid,
  EvaluationInspector,
  NextRunActionPreview,
} from '../src/features/run-registration/evaluation-execution-grid';
import { definitions } from '../src/mock/reference';
import { validatePlanningSnapshot } from '../src/features/run-registration/planning-model';
import { restorePlanningContext as restorePlanningContextWithRepository } from '../src/features/run-registration/planning-storage';
import {
  createRunEntryPreview,
  createRunFromEntry,
  createdRunPath,
  runCreationSources,
} from '../src/features/experiment-series/run-entry-model';
import { InspectorDrawer } from '../src/shared/ui/inspector-drawer';
import {
  createInitialStudySetup as createInitialStudySetupWithRepository,
  resolvedStudySetupItems as resolvedStudySetupItemsWithRepository,
  updateStudySetupItem,
  materializeStudySetupSnapshot,
  addStudySetupItem as addStudySetupItemWithRepository,
} from '../src/features/experiment-series/study-setup-model';
import {
  changeVariableRole,
  matrixVariables,
  operationExperimentSummary,
  subjectValues,
  toggleOperationExpansion,
} from '../src/features/run-registration/inline-model';
import {
  ExpansionButton,
  OperationMatrix,
  InlineMeasurement,
} from '../src/features/run-registration/operation-matrix';
import {
  formulationDefinition,
  formulationRawMaterials,
  formulationRevision1,
  formulationRevision2,
  formulationUsageRun3,
  formulationUsageRun4,
  materialActualExecution,
  materialDecisionContext,
  materialEngineerEvaluations,
  materialEvaluationTargetBindings,
  materialMeasurementResults,
  materialRun4PlanningSnapshot,
  materialRunPlanningSnapshot,
  specimenSubjects,
} from '../src/features/material-rd/material-rd-scenario';
import {
  projectAnalysisRows,
  saveAnalysisView,
  type AnalysisSelection,
} from '../src/domain/analysis/workspace';
import { analysisMeasurementSources } from '../src/mock/analysis-workspace';
import {
  InMemorySavedAnalysisViewRepository,
  resolveSavedAnalysisView,
} from '../src/features/analysis/saved-view-repository';
import {
  authoredAnalysisSource,
  createEmptyLifecycleState,
  recordActualExecution,
  recordDecisionAndNextAction,
  recordEngineerEvaluation,
  recordManualMeasurement,
} from '../src/features/run-registration/lifecycle-authoring';
import { lifecycleAuthoringProfiles } from '../src/mock/lifecycle-authoring';
const noop = () => {};
const engineeringGridMeasurementScenarios = {
  PHOTO: normalizeLegacyWaferMeasurements(
    legacyEngineeringGridMeasurementScenarios.PHOTO,
  ),
  CMP: normalizeLegacyWaferMeasurements(
    legacyEngineeringGridMeasurementScenarios.CMP,
  ),
};
const actualExecutionScenarios = {
  PHOTO: normalizeLegacySemiconductorExecution(
    legacyActualExecutionScenarios.PHOTO,
  ),
  CMP: normalizeLegacySemiconductorExecution(
    legacyActualExecutionScenarios.CMP,
  ),
};
const cmp = createExperimentWorkspace(runPlanningScenarios.CMP),
  photo = createExperimentWorkspace(runPlanningScenarios.PHOTO);

void test('expand/collapse is independent selection state and has explicit accessible affordance', () => {
  const initial: string[] = [];
  const open = toggleOperationExpansion(initial, 'cmp-process');
  assert.deepEqual(initial, []);
  assert.deepEqual(open, ['cmp-process']);
  assert.deepEqual(toggleOperationExpansion(open, 'cmp-process'), []);
  for (const expanded of [false, true]) {
    const html = renderToStaticMarkup(
      <ExpansionButton name="M2 CU CMP" expanded={expanded} onToggle={noop} />,
    );
    assert.match(html, new RegExp(`aria-expanded="${expanded}"`));
    assert.match(
      html,
      new RegExp(`${expanded ? 'Collapse' : 'Expand'} M2 CU CMP`),
    );
    assert.doesNotMatch(html, /<input/);
  }
});
void test('collapsed summaries advertise unique variables and exclude base Recipe', () => {
  assert.equal(
    operationExperimentSummary(cmp, 'cmp-process'),
    '◆ 3 Varied · 2 Fixed',
  );
  assert.equal(
    operationExperimentSummary(photo, 'photo-exposure'),
    '◆ 1 Varied · 3 Fixed',
  );
  assert.equal(operationExperimentSummary(cmp, 'cmp-thk-pre'), '◎ Measurement');
  assert.equal(operationExperimentSummary(cmp, 'cmp-clean-before'), '');
  assert.equal(matrixVariables(cmp, 'cmp-process').length, 5);
  assert.ok(
    !matrixVariables(cmp, 'cmp-process').some((a) => a.kind === 'RECIPE'),
  );
  const base = cmp.snapshot.assignments.find(
    (a) => a.kind === 'RECIPE' && !a.subjectId,
  )!;
  const changed = createExperimentWorkspace(
    saveVariable(
      cmp.snapshot,
      { ...base, intentRole: 'VARIED' },
      { 'RSA6420.01': base.value },
    ),
  );
  assert.ok(
    matrixVariables(changed, 'cmp-process').some((a) => a.kind === 'RECIPE'),
  );
});
void test('CMP matrix renders actual wafer columns, varied values and merged fixed editors', () => {
  const html = renderToStaticMarkup(
    <OperationMatrix
      model={cmp}
      operationId="cmp-process"
      onUpdate={noop}
      onAdvanced={noop}
    />,
  );
  for (const name of ['Pressure', 'Slurry', 'Pad', 'Disk', 'Sample'])
    assert.ok(html.includes(name));
  assert.match(html, /value="3.0 psi"/);
  assert.match(html, /value="3.5 psi"/);
  assert.match(html, /aria-label="Pad W04"/);
  assert.match(html, /colSpan="4" class="fixed-common"/);
  assert.match(html, /Disk common value/);
  assert.doesNotMatch(html, /Disk W01/);
  assert.doesNotMatch(html, /Start<input/);
  assert.doesNotMatch(html, /CU-R07/);
  const scoped = {
    ...cmp,
    subjects: [
      { id: 'RSA6420.05', type: 'WAFER', displayLabel: 'W05' },
      { id: 'RSA6420.25', type: 'WAFER', displayLabel: 'W25' },
    ],
  };
  const extra = renderToStaticMarkup(
    <OperationMatrix
      model={scoped}
      operationId="cmp-process"
      onUpdate={noop}
      onAdvanced={noop}
    />,
  );
  assert.match(extra, /Pressure W05/);
  assert.match(extra, /Pressure W25/);
  assert.doesNotMatch(extra, /Pressure W01/);
  assert.match(extra, /colSpan="2" class="fixed-common"/);
});

void test('SubjectRef renders without wafer fields and PhysicalWafer projects through the semiconductor adapter', () => {
  const subject = {
    id: 'subject-1',
    type: 'SPECIFIC_TEST_SUBJECT',
    displayLabel: 'S-01',
  };
  const html = renderToStaticMarkup(
    <OperationMatrix
      model={{ ...cmp, subjects: [subject] }}
      operationId="cmp-process"
      onUpdate={noop}
      onAdvanced={noop}
    />,
  );
  assert.match(html, /S-01/);
  assert.doesNotMatch(html, /slot|waferId/);
  assert.deepEqual(
    physicalWaferToSubjectRef({
      id: 'pw-1',
      canonicalLabel: 'W07',
      status: 'ACTIVE',
    }),
    { id: 'pw-1', type: 'WAFER', displayLabel: 'W07' },
  );
});

void test('generic applicability resolution is name-agnostic and respects subject type and grain', () => {
  const context = {
    configurationPackageVersionId: 'config-package-photo-v1',
    operationDefinitionRevisionId: 'operation-photo-exposure-v1',
    areaDefinitionRevisionId: 'area-photo-v1',
    subjectTypeRevisionId: 'subject-wafer-r1',
    requestedGrainRevisionId: 'grain-subject-r1',
    equipmentReferenceId: 'equipment-exp-03-r1',
    moduleReferenceId: 'module-exposure-r1',
    experimentTypeProfileVersionId: 'experiment-profile-photo-v1',
  };
  const resolved = resolveConfigurationApplicability(
    configurationRegistry,
    context,
  );
  assert.equal(
    resolved.find((item) => item.revisionId === 'condition-energy-v1')
      ?.defaultRole,
    'VARIED',
  );
  assert.equal(
    resolveConfigurationApplicability(configurationRegistry, {
      ...context,
      requestedGrainRevisionId: 'grain-site-r1',
    }).length,
    0,
  );
  assert.doesNotMatch(
    resolveConfigurationApplicability.toString(),
    /PHOTO|CMP|Energy|Pressure|Slurry|Pad|Disk/,
  );
});

void test('typed variable validation rejects invalid numbers and unknown references', () => {
  const numberDefinition = {
    id: 'number',
    label: 'Numeric',
    editor: 'NUMBER' as const,
    allowedGrains: ['SUBJECT' as const],
    applicabilityId: 'number-rule',
    assignmentKind: 'CONDITION' as const,
    assignmentReferenceId: 'number-ref',
    defaultValue: '1',
    defaultGrain: 'SUBJECT' as const,
    defaultRole: 'FIXED' as const,
    options: [],
  };
  assert.throws(() => validateVariableValue(numberDefinition, 'not-a-number'));
  assert.equal(validateVariableValue(numberDefinition, '3.0 psi'), '3.0 psi');
  const referenceDefinition = {
    ...numberDefinition,
    id: 'reference',
    label: 'Reference',
    editor: 'REFERENCE' as const,
    options: [{ value: 'registered', label: 'Registered' }],
  };
  assert.equal(
    validateVariableValue(referenceDefinition, 'registered'),
    'registered',
  );
  assert.throws(() => validateVariableValue(referenceDefinition, 'unknown'));
  assert.throws(() => validateVariableValue(numberDefinition, '1', 'SITE'));
  const pressure = matrixVariables(cmp, 'cmp-process').find(
    (item) => item.label === 'Pressure',
  )!;
  assert.throws(() =>
    saveVariable(
      cmp.snapshot,
      pressure,
      { 'RSA6420.01': 'invalid' },
      resolvedDefinitionForAssignment(cmp, pressure),
    ),
  );
  const matrix = renderToStaticMarkup(
    <OperationMatrix
      model={cmp}
      operationId="cmp-process"
      onUpdate={noop}
      onAdvanced={noop}
    />,
  );
  assert.match(matrix, /<select aria-label="Slurry W01"/);
  assert.match(matrix, /<input aria-label="Pressure W01" inputMode="decimal"/);
});

void test('configured role yields to explicit role and differing subject values do not infer intent', () => {
  const definition = {
    id: 'role',
    label: 'Role',
    editor: 'TEXT' as const,
    allowedGrains: ['SUBJECT' as const],
    applicabilityId: 'role-rule',
    assignmentKind: 'CONDITION' as const,
    assignmentReferenceId: 'role-ref',
    defaultValue: 'a',
    defaultGrain: 'SUBJECT' as const,
    defaultRole: 'VARIED' as const,
    options: [],
  };
  assert.equal(effectiveVariableRole(definition), 'VARIED');
  assert.equal(effectiveVariableRole(definition, 'FIXED'), 'FIXED');
  const pressure = matrixVariables(cmp, 'cmp-process').find(
    (item) => item.label === 'Pressure',
  )!;
  const fixed = { ...pressure, intentRole: 'FIXED' as const };
  const changed = createExperimentWorkspace(
    saveVariable(cmp.snapshot, fixed, { RSA6420_01: '3', RSA6420_02: '4' }),
  );
  assert.equal(
    matrixVariables(changed, 'cmp-process').find(
      (item) => item.label === 'Pressure',
    )?.intentRole,
    'FIXED',
  );
});

void test('Engineering Grid projection scales to 100 Operations and 25 SubjectRef columns', () => {
  const scaledModel = {
    ...cmp,
    subjects: Array.from({ length: 25 }, (_, index) => ({
      id: `subject-${index + 1}`,
      type: 'WAFER',
      displayLabel: `S${String(index + 1).padStart(2, '0')}`,
    })),
  };
  const operations = scaleGridOperations(scaledModel, 100);
  const rows = projectEngineeringGridRows(
    scaledModel,
    operations,
    new Set(operations.map((operation) => operation.id)),
  );
  assert.equal(operations.length, 100);
  assert.deepEqual(planEngineeringGridSchema.columns, [
    'SEQUENCE',
    'OPERATION',
    'EQUIPMENT',
    'ITEM',
    'UNIT',
    'SUBJECTS',
  ]);
  assert.deepEqual(planEngineeringGridSchema.pinnedColumns, [
    'SEQUENCE',
    'OPERATION',
    'ITEM',
  ]);
  assert.equal(rows.filter((row) => row.kind === 'OPERATION').length, 100);
  assert.ok(rows.filter((row) => row.kind === 'VARIABLE').length > 100);
  assert.ok(
    rows
      .filter((row) => row.kind === 'VARIABLE')
      .every(
        (row) =>
          row.definition && row.values && Object.keys(row.values).length === 25,
      ),
  );
});

void test('Engineering Grid reusable projection has no scenario or variable-name branches', () => {
  const reusableSource = `${scaleGridOperations.toString()} ${projectEngineeringGridRows.toString()}`;
  assert.doesNotMatch(
    reusableSource,
    /PHOTO|CMP|Energy|Pressure|Slurry|Pad|Disk|waferId|slotId/,
  );
});

void test('planned Operation resolves to immutable actual execution by explicit planned item identity', () => {
  const operation = photo.operations.find(
    (item) => item.id === 'photo-exposure',
  )!;
  const subject = photo.subjects[0];
  const projection = projectOperationExecution(
    photo,
    operation,
    subject,
    actualExecutionScenarios.PHOTO,
  );
  assert.equal(
    projection.plannedExecutionItemId,
    plannedExecutionIdentity(photo.snapshot.id, subject.id, operation.id),
  );
  assert.equal(
    projection.event?.plannedExecutionItemId,
    projection.plannedExecutionItemId,
  );
  assert.equal(projection.status, 'EXECUTED');
});

void test('actual execution projects by generic SubjectRef and preserves source provenance', () => {
  const projections = projectActualExecution(
    photo,
    photo.operations,
    actualExecutionScenarios.PHOTO,
  );
  const resolved = projections.find(
    (item) =>
      item.operation.id === 'photo-exposure' &&
      item.subject.id === 'PHO7814.01',
  )!;
  assert.deepEqual(resolved.subject, {
    id: 'PHO7814.01',
    type: 'WAFER',
    displayLabel: 'W01',
  });
  assert.equal(resolved.provenance?.sourceSystem, 'Mock MES Historian');
  assert.match(resolved.provenance?.sourceRecordReference ?? '', /^MES-PHOTO/);
  assert.ok(resolved.provenance?.retrievedAt);
});

void test('Recipe Equipment and comparable variable values expose MATCH and CHANGED independently', () => {
  const operation = photo.operations.find(
    (item) => item.id === 'photo-exposure',
  )!;
  const bySlot = (slot: number) =>
    projectOperationExecution(
      photo,
      operation,
      photo.subjects[slot - 1],
      actualExecutionScenarios.PHOTO,
    );
  const comparison = (slot: number, label: string) =>
    bySlot(slot).comparisons.find((item) => item.label === label)!;
  assert.equal(comparison(1, 'Recipe').delta, 'MATCH');
  assert.equal(comparison(4, 'Recipe').delta, 'CHANGED');
  assert.equal(comparison(1, 'Equipment').delta, 'MATCH');
  assert.equal(comparison(2, 'Equipment').delta, 'CHANGED');
  assert.equal(comparison(1, 'Energy').delta, 'MATCH');
  assert.equal(comparison(3, 'Energy').delta, 'CHANGED');
  assert.equal(comparison(3, 'Energy').planned, '36');
  assert.equal(comparison(3, 'Energy').actual, '35.8');
});

void test('missing actual remains null and does not alter VARIED experimental intent', () => {
  const missing = compareExecutionValue('34', null);
  assert.equal(missing, 'MISSING_ACTUAL');
  assert.notEqual(null, 0);
  const operation = photo.operations.find(
    (item) => item.id === 'photo-exposure',
  )!;
  const changed = projectOperationExecution(
    photo,
    operation,
    photo.subjects[2],
    actualExecutionScenarios.PHOTO,
  ).comparisons.find((item) => item.label === 'Energy')!;
  assert.equal(changed.delta, 'CHANGED');
  assert.equal(changed.intentRole, 'VARIED');
});

void test('resolved planning defaults remain comparable when no explicit snapshot assignment exists', () => {
  const operation = cmp.operations.find((item) => item.id === 'cmp-process')!;
  const projection = projectOperationExecution(
    cmp,
    operation,
    cmp.subjects[0],
    actualExecutionScenarios.CMP,
  );
  const rpm = projection.comparisons.find((item) => item.label === 'RPM')!;
  assert.equal(rpm.planned, '90');
  assert.equal(rpm.actual, '90');
  assert.equal(rpm.delta, 'MATCH');
});

void test('observed Lot change preserves resolved PhysicalWafer continuity', () => {
  const operation = photo.operations.find(
    (item) => item.id === 'photo-exposure',
  )!;
  const projection = projectOperationExecution(
    photo,
    operation,
    photo.subjects[3],
    actualExecutionScenarios.PHOTO,
  );
  assert.deepEqual(photo.snapshot.manufacturingContext, [
    { label: 'Lot', value: 'PHO7814' },
  ]);
  assert.deepEqual(projection.identityContext?.attributes, [
    { label: 'Observed Lot', value: 'PHO7814-R' },
    { label: 'Physical Wafer', value: 'PW-PHOTO-04' },
  ]);
});

void test('PHOTO Run 18 and CMP Run 12 actual scenarios resolve without reusable name branches', () => {
  for (const [model, evidence] of [
    [photo, actualExecutionScenarios.PHOTO],
    [cmp, actualExecutionScenarios.CMP],
  ] as const) {
    const projections = projectActualExecution(
      model,
      model.operations,
      evidence,
    );
    assert.equal(
      projections.length,
      model.operations.length * model.subjects.length,
    );
    assert.ok(projections.some((item) => item.status === 'EXECUTED'));
  }
  const reusable = `${projectActualExecution.toString()} ${projectOperationExecution.toString()} ${compareExecutionValue.toString()}`;
  assert.doesNotMatch(
    reusable,
    /PHOTO|CMP|Energy|Pressure|Slurry|Pad|Disk|W01/,
  );
});

void test('measurement values resolve by SubjectRef with Parameter and Unit definitions', () => {
  const projections = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  );
  assert.equal(projections.length, 4);
  assert.deepEqual(projections[0].subject, photo.subjects[0]);
  assert.equal(projections[0].parameter.id, 'parameter-bcd-v1');
  assert.equal(projections[0].unit, 'nm');
  assert.equal(projections[0].representativeValue, '17');
});

void test('Site measurement preserves Site identity and never becomes experiment Position', () => {
  const projection = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  )[0];
  assert.equal(projection.grain, 'SITE');
  assert.equal(projection.sites[0].siteIdentity, 'S01');
  assert.deepEqual(
    projection.sites[0].coordinates.map(
      (coordinate) => coordinate.definitionId,
    ),
    ['coordinate-chip-x-v1', 'coordinate-chip-y-v1'],
  );
  assert.equal('positionId' in projection.sites[0], false);
  assert.ok(
    photo.snapshot.assignments.some(
      (assignment) => assignment.positionId === 'P01',
    ),
  );
});

void test('missing measurement stays absent rather than becoming zero', () => {
  const expanded = {
    ...photo,
    subjects: photo.snapshot.candidateSubjects!,
  };
  const projections = projectMeasurementEvidence(
    expanded,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  );
  const missing = projections.find(
    (projection) => projection.subject.id === 'PHO7814.25',
  );
  assert.equal(missing, undefined);
  assert.notEqual(missing, 0);
});

void test('raw values remain immutable while exclusion remains attached as validity state', () => {
  const results = engineeringGridMeasurementScenarios.PHOTO;
  const before = structuredClone(results);
  const projections = projectMeasurementEvidence(
    photo,
    results,
    definitions,
    actualExecutionScenarios.PHOTO,
  );
  assert.deepEqual(results, before);
  assert.equal(results.values.length, 20);
  assert.equal(projections[0].sites.length, 5);
  const excluded = projections[0].sites.find(
    (site) => site.siteIdentity === 'S03',
  )!;
  assert.equal(excluded.validity, 'EXCLUDED');
  assert.equal(excluded.exclusionReason, 'Focus failure during capture');
  assert.equal(projections[0].representative?.rawInputCount, 5);
  assert.equal(projections[0].representative?.effectiveInputCount, 4);
});

void test('MeasurementExecution remains distinct from linked process Execution evidence', () => {
  const projection = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  )[0];
  assert.equal(
    projection.measurementExecution.id,
    'measurement-execution-photo-cdsem-1',
  );
  assert.equal(projection.linkedProcessExecutionEventId, 'execution-photo-1');
  assert.notEqual(
    projection.measurementExecution.id,
    projection.linkedProcessExecutionEventId,
  );
  assert.equal(
    projection.dataset.plannedExecutionItemId,
    plannedMeasurementIdentity('run-photo-18', 'PHO7814.01', 'photo-cdsem'),
  );
});

void test('measurement provenance preserves source acquisition dataset and raw/derived origin', () => {
  const projection = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  )[0];
  assert.equal(projection.provenance.sourceSystem, 'Mock CD-SEM');
  assert.equal(projection.provenance.acquisitionMethod, 'INTERFACE');
  assert.equal(projection.provenance.datasetOrigin, 'SOURCE');
  assert.match(
    projection.provenance.sourceRecordReference ?? '',
    /^CDSEM-PHOTO/,
  );
  assert.ok(projection.provenance.collectedAt);
});

void test('CMP measurement keeps PRE and POST as distinct MeasurementExecutions with lineage', () => {
  const projections = projectMeasurementEvidence(
    cmp,
    engineeringGridMeasurementScenarios.CMP,
    definitions,
    actualExecutionScenarios.CMP,
  );
  assert.equal(projections.length, 8);
  const wafer = projections.filter(
    (projection) => projection.subject.id === 'RSA6420.01',
  );
  const pre = wafer.find(
    (projection) => projection.measurementExecution.measurementPoint === 'PRE',
  )!;
  const post = wafer.find(
    (projection) => projection.measurementExecution.measurementPoint === 'POST',
  )!;
  assert.notEqual(pre.measurementExecution.id, post.measurementExecution.id);
  assert.notEqual(pre.dataset.id, post.dataset.id);
  assert.equal(pre.operation.id, 'cmp-thk-pre');
  assert.equal(post.operation.id, 'cmp-thk-post');
  assert.equal(pre.linkedProcessExecutionEventId, null);
  assert.equal(post.linkedProcessExecutionEventId, 'execution-cmp-1');
  assert.equal(pre.provenance.acquisitionMethod, 'FILE_IMPORT');
  assert.equal(post.provenance.acquisitionMethod, 'INTERFACE');
});

void test('reusable measurement projection contains no semiconductor scenario branches', () => {
  const source = projectMeasurementEvidence.toString();
  assert.doesNotMatch(source, /PHOTO|CMP|BCD|THK|CD-SEM|W01/);
});

void test('target achievement pins the configured Target and exact representative result', () => {
  const measurements = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  );
  const scenario = engineeringGridEvaluationScenarios.PHOTO;
  const projected = projectEvaluations(
    photo.snapshot.id,
    photo.subjects,
    measurements,
    scenario.bindings,
    scenario.engineerEvaluations,
  );
  assert.equal(projected[0].achievement.seriesTargetId, 'target-bcd');
  assert.equal(
    projected[0].achievement.measurementSummaryId,
    'summary-photo-bcd-1',
  );
  assert.equal(projected[0].achievement.status, 'ACHIEVED');
});

void test('target calculation distinguishes achieved, out of range, and invalid configuration', () => {
  const measurement = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  )[0];
  const binding = engineeringGridEvaluationScenarios.PHOTO.bindings[0];
  assert.equal(
    calculateTargetAchievement(binding, measurement).status,
    'ACHIEVED',
  );
  assert.equal(
    calculateTargetAchievement(
      {
        ...binding,
        target: { ...binding.target, lowerBound: 18, upperBound: 19 },
      },
      measurement,
    ).status,
    'NOT_ACHIEVED',
  );
  assert.equal(
    calculateTargetAchievement(
      { ...binding, target: { ...binding.target, upperBound: null } },
      measurement,
    ).status,
    'NOT_EVALUABLE',
  );
});

void test('missing result and non-comparable result remain explicit', () => {
  const measurement = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  )[0];
  const binding = engineeringGridEvaluationScenarios.PHOTO.bindings[0];
  assert.equal(
    calculateTargetAchievement(binding, null).status,
    'MISSING_RESULT',
  );
  assert.equal(
    calculateTargetAchievement(binding, {
      ...measurement,
      representative: {
        ...measurement.representative!,
        unitDefinitionId: null,
      },
    }).status,
    'NOT_EVALUABLE',
  );
});

void test('Site observations never substitute for a Subject summary target', () => {
  const measurement = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  )[0];
  assert.ok(measurement.sites.length > 0);
  assert.equal(
    calculateTargetAchievement(
      engineeringGridEvaluationScenarios.PHOTO.bindings[0],
      { ...measurement, representative: null, representativeValue: null },
    ).status,
    'NOT_EVALUABLE',
  );
});

void test('engineer interpretation remains separate and can disagree with achievement', () => {
  const measurements = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  );
  const scenario = engineeringGridEvaluationScenarios.PHOTO;
  const first = projectEvaluations(
    photo.snapshot.id,
    photo.subjects,
    measurements,
    scenario.bindings,
    scenario.engineerEvaluations,
  )[0];
  assert.equal(first.achievement.status, 'ACHIEVED');
  assert.equal(first.engineerEvaluation?.disposition, 'NEEDS_REVIEW');
  assert.equal(
    first.engineerEvaluation?.measurementSummaryId,
    first.achievement.measurementSummaryId,
  );
  assert.ok(!('disposition' in first.achievement));
});

void test('PHOTO and CMP evaluations preserve measurement-point lineage', () => {
  for (const [model, key] of [
    [photo, 'PHOTO'],
    [cmp, 'CMP'],
  ] as const) {
    const measurements = projectMeasurementEvidence(
      model,
      engineeringGridMeasurementScenarios[key],
      definitions,
      actualExecutionScenarios[key],
    );
    const scenario = engineeringGridEvaluationScenarios[key];
    const projected = projectEvaluations(
      model.snapshot.id,
      model.subjects,
      measurements,
      scenario.bindings,
      scenario.engineerEvaluations,
    );
    assert.equal(projected.length, 4);
    assert.ok(
      projected.every(
        (item) =>
          item.achievement.status === 'ACHIEVED' &&
          item.measurement?.measurementExecution.measurementPoint === 'POST',
      ),
    );
  }
  const cmpPreSummaryIds = new Set(
    projectMeasurementEvidence(
      cmp,
      engineeringGridMeasurementScenarios.CMP,
      definitions,
      actualExecutionScenarios.CMP,
    )
      .filter((item) => item.measurementExecution.measurementPoint === 'PRE')
      .map((item) => item.representative?.id),
  );
  assert.ok(
    engineeringGridEvaluationScenarios.CMP.engineerEvaluations.every(
      (evaluation) => !cmpPreSummaryIds.has(evaluation.measurementSummaryId),
    ),
  );
});

void test('reusable evaluation projection contains no scenario or parameter-name branches', () => {
  const source = `${projectEvaluations.toString()}${calculateTargetAchievement.toString()}`;
  assert.doesNotMatch(source, /PHOTO|CMP|BCD|THK|Energy|W01/);
});

void test('Next Action links Engineer Evaluation and Target Achievement without changing either', () => {
  const scenario = engineeringGridDecisionScenarios.PHOTO;
  const beforeContext = structuredClone(scenario.context);
  const beforeEvaluation = structuredClone(
    engineeringGridEvaluationScenarios.PHOTO.engineerEvaluations[0],
  );
  const projection = projectDecisionContinuation(
    scenario.context,
    definitions,
    scenario.nextRunPreview,
  );
  assert.equal(projection.context.engineerEvaluationIds.length, 1);
  assert.equal(
    projection.context.targetAchievementReferences[0].status,
    'ACHIEVED',
  );
  assert.equal(
    projection.context.targetAchievementReferences[0].measurementSummaryId,
    'summary-photo-bcd-1',
  );
  assert.deepEqual(scenario.context, beforeContext);
  assert.deepEqual(
    engineeringGridEvaluationScenarios.PHOTO.engineerEvaluations[0],
    beforeEvaluation,
  );
});

void test('configured Next Action preserves scientific rationale and has no PMS fields', () => {
  const scenario = engineeringGridDecisionScenarios.PHOTO;
  const projection = projectDecisionContinuation(
    scenario.context,
    definitions,
    scenario.nextRunPreview,
  );
  assert.equal(projection.actionType?.id, 'next-action-design-next');
  assert.match(projection.rationale!, /inherited setup/);
  for (const field of ['assignee', 'deadline', 'progress', 'taskStatus'])
    assert.ok(!(field in scenario.context));
});

void test('Create Next Run uses previous-run resolver semantics and creates a complete snapshot', () => {
  const previous = runPlanningScenarios.PHOTO;
  const preview = engineeringGridDecisionScenarios.PHOTO.nextRunPreview!;
  assert.equal(preview.previousRunId, previous.id);
  assert.equal(preview.snapshot.provenance.kind, 'PREVIOUS_RUN');
  assert.equal(preview.snapshot.provenance.sourceId, previous.id);
  assert.equal(
    preview.snapshot.assignments.length,
    previous.assignments.length,
  );
  assert.equal(preview.snapshot.steps.length, previous.steps.length);
  assert.equal(
    preview.snapshot.measurements.length,
    previous.measurements.length,
  );
  assert.equal(validatePlanningSnapshot(preview.snapshot).length, 0);
  const recipe = preview.snapshot.assignments.find(
    (assignment) => assignment.kind === 'RECIPE',
  )!;
  assert.equal(recipe.referenceId, 'recipe-exp-r01-r1');
  assert.equal(recipe.provenance, 'PREVIOUS_RUN');
  assert.ok(
    preview.snapshot.assignments
      .filter((assignment) =>
        preview.inherited.some((item) => item.assignmentId === assignment.id),
      )
      .every((assignment) => assignment.provenance === 'PREVIOUS_RUN'),
  );
});

void test('next Run UX projection separates inherited context from explicit delta', () => {
  const preview = engineeringGridDecisionScenarios.PHOTO.nextRunPreview!;
  assert.equal(preview.changed.length, 4);
  assert.equal(
    preview.inherited.length + preview.changed.length,
    preview.snapshot.assignments.length,
  );
  assert.deepEqual(
    preview.changed.map((item) => item.after),
    ['35', '36', '37', '38'],
  );
  assert.equal(preview.snapshot.delta.items.length, preview.changed.length);
  assert.equal(preview.snapshot.delta.sourceLabel, 'Run #18');
});

void test('PHOTO and CMP use different configured scientific continuation paths', () => {
  const photoContinuation = projectDecisionContinuation(
    engineeringGridDecisionScenarios.PHOTO.context,
    definitions,
    engineeringGridDecisionScenarios.PHOTO.nextRunPreview,
  );
  const cmpContinuation = projectDecisionContinuation(
    engineeringGridDecisionScenarios.CMP.context,
    definitions,
    engineeringGridDecisionScenarios.CMP.nextRunPreview,
  );
  assert.equal(photoContinuation.actionType?.code, 'DESIGN_NEXT_EXPERIMENT');
  assert.ok(photoContinuation.nextRunPreview);
  assert.equal(cmpContinuation.actionType?.code, 'ADDITIONAL_MEASUREMENT');
  assert.equal(cmpContinuation.nextRunPreview, null);
  assert.deepEqual(cmpContinuation.context.targetScope.subjectIds, [
    'RSA6420.04',
  ]);
});

void test('next Run preview rejects unknown changes and never mutates the source Plan', () => {
  const before = structuredClone(runPlanningScenarios.CMP);
  assert.throws(() =>
    createNextRunPreview(runPlanningScenarios.CMP, 'run-cmp-13', [
      { assignmentId: 'unknown-assignment', after: 'value' },
    ]),
  );
  assert.deepEqual(runPlanningScenarios.CMP, before);
});

void test('reusable Decision continuation has no scenario or scientific-name branches', () => {
  const source = `${createNextRunPreview.toString()}${projectDecisionContinuation.toString()}`;
  assert.doesNotMatch(source, /PHOTO|CMP|BCD|THK|Energy|Wafer/);
});

void test('Evaluation FINAL presents result, comment and conclusion without losing continuation actions', () => {
  const scenario = engineeringGridDecisionScenarios.CMP;
  const html = renderToStaticMarkup(
    <EvaluationExecutionGrid
      model={cmp}
      results={engineeringGridMeasurementScenarios.CMP}
      catalog={definitions}
      executionEvidence={actualExecutionScenarios.CMP}
      targetBindings={engineeringGridEvaluationScenarios.CMP.bindings}
      engineerEvaluations={
        engineeringGridEvaluationScenarios.CMP.engineerEvaluations
      }
      decisionContext={scenario.context}
      nextRunPreview={scenario.nextRunPreview}
    />,
  );
  for (const label of [
    'RESULT',
    'ACHIEVEMENT',
    'Engineer Comment',
    'Run Conclusion',
    'NEXT ACTION',
  ])
    assert.match(html, new RegExp(label, 'i'));
  assert.match(html, /Create Measurement Plan/);
  assert.match(html, /W04 · POST Thickness · Edge Sites/);
  assert.doesNotMatch(html, /Recorded by|Evaluation evidence|Target evidence/);
});

void test('Additional Measurement preview renders selected scientific context and local CTA', () => {
  const measurements = projectMeasurementEvidence(
    cmp,
    engineeringGridMeasurementScenarios.CMP,
    definitions,
    actualExecutionScenarios.CMP,
  );
  const evaluationScenario = engineeringGridEvaluationScenarios.CMP;
  const selected = projectEvaluations(
    cmp.snapshot.id,
    cmp.subjects,
    measurements,
    evaluationScenario.bindings,
    evaluationScenario.engineerEvaluations,
  ).find((projection) => projection.subject.displayLabel === 'W04')!;
  const decisionScenario = engineeringGridDecisionScenarios.CMP;
  const continuation = projectDecisionContinuation(
    decisionScenario.context,
    definitions,
    decisionScenario.nextRunPreview,
  );
  assert.deepEqual(resolveNextActionPresentation(continuation), {
    kind: 'MEASUREMENT_PLAN',
    ctaLabel: 'Create Measurement Plan',
  });
  const html = renderToStaticMarkup(
    <AdditionalMeasurementPreview
      continuation={continuation}
      selected={selected}
      staged={false}
      onCreate={noop}
      onCancel={noop}
    />,
  );
  for (const value of [
    'Run #12',
    'Referenced Evaluation',
    'evaluation-run-cmp-12-RSA6420.04',
    'Informative',
    'Thickness Metrology',
    'Thickness',
    'W04',
    'Edge Sites',
    'Create Measurement Plan',
    'Cancel',
  ])
    assert.match(html, new RegExp(value));
});

void test('PHOTO Next Run action opens the inherited and changed delta preview', () => {
  const scenario = engineeringGridDecisionScenarios.PHOTO;
  const continuation = projectDecisionContinuation(
    scenario.context,
    definitions,
    scenario.nextRunPreview,
  );
  assert.deepEqual(resolveNextActionPresentation(continuation), {
    kind: 'NEXT_RUN',
    ctaLabel: 'Preview Next Run',
  });
  const html = renderToStaticMarkup(
    <NextRunActionPreview
      preview={scenario.nextRunPreview!}
      staged={false}
      onCreate={noop}
      onCancel={noop}
    />,
  );
  assert.match(html, /INHERITED/i);
  assert.match(html, /CHANGED/i);
  assert.match(html, /Full snapshot · Delta view/);
  assert.match(html, /Create Next Run/);
  assert.match(html, /Cancel/);
  assert.match(html, /35.*36.*37.*38/);
});

void test('technical provenance remains in Details while the primary reasoning flow stays semantic', () => {
  const measurements = projectMeasurementEvidence(
    photo,
    engineeringGridMeasurementScenarios.PHOTO,
    definitions,
    actualExecutionScenarios.PHOTO,
  );
  const evaluationScenario = engineeringGridEvaluationScenarios.PHOTO;
  const selected = projectEvaluations(
    photo.snapshot.id,
    photo.subjects,
    measurements,
    evaluationScenario.bindings,
    evaluationScenario.engineerEvaluations,
  )[0];
  const decisionScenario = engineeringGridDecisionScenarios.PHOTO;
  const continuation = projectDecisionContinuation(
    decisionScenario.context,
    definitions,
    decisionScenario.nextRunPreview,
  );
  const details = renderToStaticMarkup(
    <EvaluationInspector projection={selected} continuation={continuation} />,
  );
  assert.match(details, /EVALUATION PROVENANCE/);
  assert.match(details, /Decision \/ Action provenance/);
  assert.match(details, /decision-photo-run-18/);
  assert.match(details, /summary-photo-bcd-1/);
  assert.equal(selected.achievement.status, 'ACHIEVED');
});
void test('role transitions use selected wafers, update shared projections, and preserve source operations', () => {
  // Remove independent legacy Position variation so wafer-role Focus can be tested alone.
  const initial = createExperimentWorkspace({
    ...photo.snapshot,
    assignments: photo.snapshot.assignments.filter((a) => !a.positionId),
  });
  const before = structuredClone(initial.operations);
  const energy = matrixVariables(initial, 'photo-exposure').find(
    (a) => a.label === 'Energy',
  )!;
  const edited = createExperimentWorkspace(
    saveVariable(initial.snapshot, energy, { 'PHO7814.01': '42' }),
  );
  assert.equal(subjectValues(edited, energy)['PHO7814.01'], '42');
  assert.equal(
    operationAssignments(edited, 'photo-exposure', 'PHO7814.01').find(
      (a) => a.label === 'Energy',
    )?.value,
    '42',
  );
  const fixed = changeVariableRole(edited, energy, 'FIXED');
  assert.ok(Object.values(fixed.values).every((v) => v === '42'));
  const held = createExperimentWorkspace(
    saveVariable(edited.snapshot, fixed.item, fixed.values),
  );
  assert.equal(operationExperimentSummary(held, 'photo-exposure'), '4 Fixed');
  assert.ok(
    !visibleOperations(held, 'EXPERIMENT_FOCUS').some(
      (op) => op.id === 'photo-exposure',
    ),
  );
  const variable = changeVariableRole(held, fixed.item, 'VARIED');
  const restored = createExperimentWorkspace(
    saveVariable(held.snapshot, variable.item, variable.values),
  );
  assert.ok(
    visibleOperations(restored, 'EXPERIMENT_FOCUS').some(
      (op) => op.id === 'photo-exposure',
    ),
  );
  assert.equal(
    effectiveAssignments(restored.snapshot, 'PHO7814.01')[
      'photo-exposure:CONDITION:Energy'
    ].referenceId,
    energy.referenceId,
  );
  assert.deepEqual(initial.operations, before);
  assert.deepEqual(restored.operations, before);
});
void test('measurement expands to planning context rather than a variable matrix', () => {
  const html = renderToStaticMarkup(
    <InlineMeasurement
      model={cmp}
      operationId="cmp-thk-pre"
      onAdvanced={noop}
    />,
  );
  assert.match(html, /PRE · THK/);
  assert.match(html, /Wafer/);
  assert.match(html, /Planning context · not acquired/);
  assert.doesNotMatch(html, /<input|VARIED|RESOURCE/);
  assert.deepEqual(matrixVariables(cmp, 'cmp-thk-pre'), []);
});
void test('shared editor isolates PHOTO/CMP and edited context restores without duplicating history', () => {
  assert.ok(
    matrixVariables(photo, 'photo-exposure').some((a) => a.label === 'Energy'),
  );
  assert.ok(
    !matrixVariables(cmp, 'cmp-process').some((a) => a.label === 'Energy'),
  );
  const pressure = matrixVariables(cmp, 'cmp-process').find(
    (a) => a.label === 'Pressure',
  )!;
  const changed = saveVariable(cmp.snapshot, pressure, {
    'RSA6420.01': '4.0 psi',
  });
  const range = {
    runId: cmp.snapshot.id,
    startOperationId: 'cmp-thk-pre',
    endOperationId: 'cmp-thk-post',
    operationIds: ['cmp-thk-pre', 'cmp-process', 'cmp-thk-post'],
    subjectIds: cmp.subjects.map((w) => w.id),
  };
  const json = JSON.stringify({
    version: 1,
    runId: cmp.snapshot.id,
    ranges: [range],
    assignments: changed.assignments,
    manualFocus: [],
  });
  assert.deepEqual(
    restorePlanningContext(cmp.snapshot, json)?.assignments,
    changed.assignments,
  );
  assert.equal(restorePlanningContext(photo.snapshot, json), null);
  assert.ok(!json.includes('Context equipment'));
});

void test('Operation backbone has six context columns and no duplicated subject values', () => {
  const props = {
    model: cmp,
    selection: {
      operationId: 'cmp-process',
      subjectId: cmp.subjects[0].id,
      view: 'TABLE' as const,
      scope: 'EXPERIMENT_FOCUS' as const,
      resolution: 'SUBJECT' as const,
      density: 'COMPACT' as const,
    },
    defining: false,
    draft: [],
    onRange: noop,
    onToggle: noop,
    onUpdate: noop,
    onAdvanced: noop,
    select: noop,
  };
  const collapsed = renderToStaticMarkup(
    <OperationTable {...props} expanded={[]} />,
  );
  const header = collapsed.match(/<thead>([\s\S]*?)<\/thead>/)![1];
  assert.deepEqual(
    [...header.matchAll(/<th>(.*?)<\/th>/g)].map((m) => m[1]),
    ['Seq', 'Operation', 'Area', 'Equipment', 'Recipe', 'Experiment'],
  );
  assert.equal((collapsed.match(/RSA6420/g) || []).length, 1);
  assert.doesNotMatch(
    collapsed,
    /W01|3\.0 psi|3\.5 psi|<input|Key Setting|Lot context/,
  );
  assert.match(collapsed, /◆ 3 Varied · 2 Fixed/);
  const expanded = renderToStaticMarkup(
    <OperationTable {...props} expanded={['cmp-process', 'cmp-thk-pre']} />,
  );
  assert.equal((expanded.match(/value="3.0 psi"/g) || []).length, 2);
  assert.equal((expanded.match(/value="3.5 psi"/g) || []).length, 2);
  assert.equal((expanded.match(/aria-label="Pressure W01"/g) || []).length, 1);
  assert.equal(
    (expanded.match(/class="operation-expansion"/g) || []).length,
    2,
  );
  assert.equal((expanded.match(/colSpan="6"/g) || []).length, 2);
  assert.match(expanded, /Measurement planning summary/);
  assert.match(expanded, /PRE · THK/);
});

void test('strict scope mode suppresses editing in both range and subject stages and restores planning unchanged', () => {
  const before = structuredClone(cmp.snapshot);
  const expanded = ['cmp-process', 'cmp-thk-pre'];
  const props = {
    model: cmp,
    selection: {
      operationId: 'cmp-process',
      subjectId: cmp.subjects[0].id,
      view: 'TABLE' as const,
      scope: 'FULL_HISTORY' as const,
      resolution: 'SUBJECT' as const,
      density: 'COMPACT' as const,
    },
    draft: ['cmp-process'],
    expanded,
    onRange: noop,
    onToggle: noop,
    onUpdate: noop,
    onAdvanced: noop,
    select: noop,
  };
  for (const defining of [true, false]) {
    const html = renderToStaticMarkup(
      <OperationTable {...props} defining={defining} scopeSelecting />,
    );
    assert.doesNotMatch(
      html,
      /Experimental variable matrix|Measurement planning summary|Add Variable|Advanced → Inspector|aria-expanded|<input/,
    );
    assert.match(html, /M2 CU CMP/);
  }
  const normal = renderToStaticMarkup(
    <OperationTable {...props} defining={false} scopeSelecting={false} />,
  );
  assert.match(normal, /Experimental variable matrix/);
  assert.match(normal, /Measurement planning summary/);
  assert.match(normal, /aria-expanded="true"/);
  assert.deepEqual(expanded, ['cmp-process', 'cmp-thk-pre']);
  assert.deepEqual(cmp.snapshot, before);
});
void test('scope side panel keeps actions separate from subject candidates and includes coded boundaries', () => {
  const operations = Array.from({ length: 1000 }, (_, i) => ({
    ...cmp.operations[0],
    id: `op-${i}`,
    sequence: i,
    name: `Operation ${i}`,
  }));
  const props = {
    operations,
    draft: operations.map((op) => op.id),
    subjectIds: cmp.subjects.map((w) => w.id),
    candidates: cmp.subjects,
    changeSubjects: true,
    onChangeSubjects: noop,
    onSubjects: noop,
    onContinue: noop,
    onConfirm: noop,
    onBack: noop,
    onCancel: noop,
  };
  const range = renderToStaticMarkup(
    <ScopeSelectionPanel {...props} stage="RANGE" />,
  );
  assert.match(range, /1000 Operations/);
  assert.match(range, /Continue/);
  assert.doesNotMatch(range, /type="checkbox"|Confirm Experiment Scope/);
  const subjects = renderToStaticMarkup(
    <ScopeSelectionPanel {...props} stage="SUBJECTS" />,
  );
  assert.match(subjects, /OP000 → OP999/);
  assert.match(
    subjects,
    /<\/fieldset><\/section><section class="scope-panel-actions">/,
  );
  assert.match(subjects, /Confirm Experiment Scope/);
  assert.match(subjects, />Back</);
  const empty = renderToStaticMarkup(
    <ScopeSelectionPanel {...props} subjectIds={[]} stage="SUBJECTS" />,
  );
  assert.match(empty, /disabled=""[^>]*>Confirm Experiment Scope/);
});

void test('Home links Study names and exact current Run projections independently', () => {
  const source = readFileSync('src/features/experiment-home/home.tsx', 'utf8');
  assert.match(source, /seriesHref: '\/series\/dts-improvement'/);
  assert.match(
    source,
    /href: '\/series\/dts-improvement\/runs\/18\/engineering-grid\?view=evaluation'/,
  );
  assert.match(
    source,
    /href: '\/series\/cmp-stability\/runs\/12\/engineering-grid\?view=measurement'/,
  );
});

void test('Study detail exposes a dedicated Runs view and shares one component for PHOTO and CMP', () => {
  const source = readFileSync(
    'src/features/experiment-series/productized-series.tsx',
    'utf8',
  );
  assert.match(source, /initialView === 'runs'/);
  assert.match(source, /<RepositorySeriesRuns/);
  assert.match(source, /seriesWorkspaceScenarios\[seriesSlug\]/);
  assert.doesNotMatch(source, /series\.slug ===|seriesSlug ===/);
});

void test('Run creation sources stay concise and contain no PMS semantics', () => {
  assert.deepEqual(
    runCreationSources.map((item) => item.id),
    ['STUDY_DEFAULT', 'PREVIOUS_RUN', 'EXISTING_RUN', 'BLANK'],
  );
  assert.doesNotMatch(
    JSON.stringify(runCreationSources),
    /WBS|milestone|resource allocation|approval|progress %/i,
  );
});

void test('inherited preview explains the source and compact inherited setup', () => {
  const preview = createRunEntryPreview('dts-improvement', 'PREVIOUS_RUN');
  assert.equal(preview.sourceRunNumber, 18);
  assert.match(preview.sourceLabel, /Run 18/);
  assert.deepEqual(
    preview.inherited.map((item) => item.label),
    [
      'Operations',
      'Recipe',
      'Material',
      'Experimental Variables',
      'Measurement Plan',
    ],
  );
});

void test('Study Default and Previous Run materialize explicit provenance', () => {
  const fromDefault = createRunFromEntry('dts-improvement', 'STUDY_DEFAULT');
  const fromPrevious = createRunFromEntry('dts-improvement', 'PREVIOUS_RUN');
  assert.equal(fromDefault.provenance.kind, 'SERIES_DEFAULT');
  assert.ok(
    fromDefault.assignments.every(
      (item) => item.provenance === 'SERIES_DEFAULT',
    ),
  );
  assert.equal(fromPrevious.provenance.kind, 'PREVIOUS_RUN');
  assert.ok(
    fromPrevious.assignments.every(
      (item) => item.provenance === 'PREVIOUS_RUN',
    ),
  );
});

void test('new Run is an independent full snapshot and leaves its source immutable', () => {
  const source = runPlanningScenarios.PHOTO;
  const before = structuredClone(source);
  const created = createRunFromEntry('dts-improvement', 'PREVIOUS_RUN');
  assert.deepEqual(source, before);
  assert.notEqual(created, source);
  assert.notEqual(created.assignments[0].id, source.assignments[0].id);
  assert.notEqual(created.steps[0].id, source.steps[0].id);
  assert.deepEqual(validatePlanningSnapshot(created), []);
  assert.equal(created.runNumber, 19);
  assert.equal(
    createdRunPath('dts-improvement'),
    '/series/dts-improvement/runs/19/engineering-grid?view=plan',
  );
});

void test('new Run preserves the exact Configuration Package pin', () => {
  for (const slug of ['dts-improvement', 'cmp-stability'] as const) {
    const created = createRunFromEntry(slug, 'PREVIOUS_RUN');
    const source =
      slug === 'cmp-stability'
        ? runPlanningScenarios.CMP
        : runPlanningScenarios.PHOTO;
    assert.equal(
      created.configurationPackageVersionId,
      source.configurationPackageVersionId,
    );
  }
});

void test('empty Study Run list provides a first-Run action instead of an empty table', () => {
  const source = readFileSync(
    'src/features/experiment-series/productized-series.tsx',
    'utf8',
  );
  assert.match(source, /if \(series\.runs\.length === 0\)/);
  assert.match(
    source,
    /Create the first Run from the Study Default or start Blank/,
  );
  assert.match(source, /No Runs yet/);
});

void test('Definition Grid stands alone and Inspector is closed by default', () => {
  const source = readFileSync(
    'src/features/reference-studio/definitions-view.tsx',
    'utf8',
  );
  assert.match(source, /initialInspectorOpen = false/);
  assert.match(source, /<th>\{t\('Name'\)\}<\/th>/);
  assert.match(source, /rows\.map|visible\.map/);
  assert.match(source, /open=\{inspectorOpen\}/);
});

void test('Definition Inspector is optional depth with usage and collapsed technical details', () => {
  const source = readFileSync(
    'src/features/reference-studio/definitions-view.tsx',
    'utf8',
  );
  assert.match(source, /setInspectorOpen\(true\)/);
  assert.match(source, /Where It Can Be Used/);
  assert.match(source, /Usage/);
  assert.match(source, /<details className="rs-technical-details">/);
  assert.doesNotMatch(source, /<details className="rs-technical-details" open/);
});

void test('shared Inspector drawer has a true closed state', () => {
  const closed = renderToStaticMarkup(
    <InspectorDrawer open={false} title="Test Inspector" onClose={noop}>
      Depth
    </InspectorDrawer>,
  );
  const open = renderToStaticMarkup(
    <InspectorDrawer open title="Test Inspector" onClose={noop}>
      Depth
    </InspectorDrawer>,
  );
  assert.equal(closed, '');
  assert.match(open, /Close Test Inspector/);
});

void test('Reference Studio reusable Definition surface has no scenario-name branches', () => {
  const source = `${readFileSync('src/features/reference-studio/definitions-view.tsx', 'utf8')}${InspectorDrawer.toString()}`;
  assert.doesNotMatch(source, /PHOTO|CMP|Energy|Pressure|Slurry|Pad|Disk/);
});

void test('Study page exposes Overview Experiment Setup and Runs as one context', () => {
  const source = readFileSync(
    'src/features/experiment-series/productized-series.tsx',
    'utf8',
  );
  assert.match(source, /t\(['"]Overview['"]\)/);
  assert.match(source, /t\(['"]Experiment Setup['"]\)/);
  assert.match(source, /t\(['"]Runs['"]\)/);
  assert.match(source, /StudySetupWorkspace/);
});

void test('Study Setup projects an Operation to Item hierarchy', () => {
  const setup = createInitialStudySetup('dts-improvement');
  const exposure = setup.operations.find((operation) => operation.items.length > 0)!;
  assert.ok(exposure.items.length > 0);
  assert.ok(exposure.items.every((item) => item.operationId === exposure.id));
  const surface = readFileSync(
    'src/features/experiment-series/study-setup-workspace.tsx',
    'utf8',
  );
  assert.match(surface, /<th>\{t\(['"]Operation['"]\)\}<\/th>\s*<th>\{t\(['"]Item['"]\)\}<\/th>\s*<th>\{t\(['"]Default['"]\)\}<\/th>/);
});

void test('Study Add Item uses the authoritative package and applicability resolver', () => {
  const setup = createInitialStudySetup('dts-improvement');
  const operation = setup.operations.find((item) => item.items.length > 0)!;
  const items = resolvedStudySetupItems(setup, operation.id);
  assert.ok(items.some((item) => item.definitionRevisionId === 'condition-energy-v1'));
  assert.match(resolvedStudySetupItemsWithRepository.toString(), /resolvedVariableDefinitions/);
});

void test('non-applicable Study items are excluded by exact context', () => {
  const cmpSetup = createInitialStudySetup('cmp-stability');
  const operation = cmpSetup.operations.find((item) => item.role === 'PROCESS')!;
  const items = resolvedStudySetupItems(cmpSetup, operation.id);
  assert.ok(items.some((item) => item.definitionRevisionId === 'condition-pressure-v1'));
  assert.ok(!items.some((item) => item.definitionRevisionId === 'condition-energy-v1'));
});

void test('Definition metadata controls Study value editors and validation', () => {
  const setup = createInitialStudySetup('dts-improvement');
  const energy = setup.operations.flatMap((operation) => operation.items).find(
    (item) => item.definitionRevisionId === 'condition-energy-v1',
  )!;
  assert.equal(energy.editor, 'NUMBER');
  assert.throws(() => updateStudySetupItem(setup, energy.id, 'not-a-number'));
  assert.equal(updateStudySetupItem(setup, energy.id, '36').operations.flatMap((operation) => operation.items).find((item) => item.id === energy.id)?.value, '36');
});

void test('Study Default materializes selected defaults into Run creation', () => {
  const setup = createInitialStudySetup('dts-improvement');
  const energy = setup.operations.flatMap((operation) => operation.items).find(
    (item) => item.definitionRevisionId === 'condition-energy-v1',
  )!;
  const edited = updateStudySetupItem(setup, energy.id, '38');
  const run = createRunFromEntry('dts-improvement', 'STUDY_DEFAULT', edited);
  assert.equal(run.assignments.find((item) => item.referenceId === 'condition-energy-v1')?.value, '38');
  assert.ok(run.assignments.every((item) => item.provenance === 'SERIES_DEFAULT'));
});

void test('Study-created Run is independent and preserves exact package provenance', () => {
  const setup = createInitialStudySetup('cmp-stability');
  const run = createRunFromEntry('cmp-stability', 'STUDY_DEFAULT', setup);
  assert.notEqual(run.assignments, materializeStudySetupSnapshot(setup).assignments);
  assert.equal(run.configurationPackageVersionId, setup.configurationPackageVersionId);
  assert.equal(run.provenance.sourceId, `${setup.seriesId}-default-r${setup.revision}`);
});

void test('later Study Setup edits do not mutate a historical Run and affect a future Run', () => {
  const setup = createInitialStudySetup('dts-improvement');
  const energy = setup.operations.flatMap((operation) => operation.items).find(
    (item) => item.definitionRevisionId === 'condition-energy-v1',
  )!;
  const run19 = createRunFromEntry('dts-improvement', 'STUDY_DEFAULT', setup, 19);
  const changed = updateStudySetupItem(setup, energy.id, '41');
  const run20 = createRunFromEntry('dts-improvement', 'STUDY_DEFAULT', changed, 20);
  assert.equal(run19.assignments.find((item) => item.referenceId === energy.referenceId)?.value, '35');
  assert.equal(run20.assignments.find((item) => item.referenceId === energy.referenceId)?.value, '41');
  assert.equal(run19.runNumber, 19);
  assert.equal(run20.runNumber, 20);
});

void test('Study Item Inspector is optional and closed by default', () => {
  const source = readFileSync(
    'src/features/experiment-series/study-setup-workspace.tsx',
    'utf8',
  );
  assert.match(source, /initialInspectorOpen = false/);
  assert.match(source, /title=\{t\(['"]Study Setup Inspector['"]\)\}/);
  assert.match(source, /open=\{inspectorOpen && Boolean\(selected\)\}/);
});

void test('PHOTO and CMP share one name-agnostic Study Setup component', () => {
  const source = readFileSync(
    'src/features/experiment-series/study-setup-workspace.tsx',
    'utf8',
  );
  assert.doesNotMatch(source, /PHOTO|CMP|Energy|Pressure|Slurry|Pad|Disk/);
  assert.ok(createInitialStudySetup('dts-improvement').operations.length > 0);
  assert.ok(createInitialStudySetup('cmp-stability').operations.length > 0);
});

void test('Reference Applicability and Package use optional shared Inspectors', () => {
  const source = `${readFileSync('src/features/reference-studio/applicability-view.tsx', 'utf8')}${readFileSync('src/features/reference-studio/package-view.tsx', 'utf8')}`;
  assert.match(source, /title=\{t\('Applicability Inspector'\)\}/);
  assert.match(source, /title=\{t\('Package Version Inspector'\)\}/);
  assert.match(source, /inspector-optional/g);
  assert.match(source, /rs-wide-authoring-surface/);
});

void test('Study Add Item rejects an item outside the selected Operation resolver result', () => {
  const photo = createInitialStudySetup('dts-improvement');
  const cmp = createInitialStudySetup('cmp-stability');
  const photoOperation = photo.operations.find((item) => item.role === 'PROCESS')!;
  const cmpPressure = cmp.operations.flatMap((operation) => operation.items).find(
    (item) => item.definitionRevisionId === 'condition-pressure-v1',
  )!;
  assert.throws(() => addStudySetupItem(photo, photoOperation.id, cmpPressure));
});

void test('SPECIMEN resolves through SubjectRef without becoming a renamed Wafer', () => {
  const model = createExperimentWorkspace(materialRunPlanningSnapshot);
  assert.deepEqual(model.subjects.map((subject) => subject.displayLabel), ['SP-01', 'SP-02', 'SP-03', 'SP-04']);
  assert.ok(model.subjects.every((subject) => subject.type === 'SPECIMEN'));
  assert.equal(materialRunPlanningSnapshot.subjects.length, 4);
});

void test('Material package and applicability use the existing repository resolver', () => {
  const setup = createInitialStudySetup('adhesion-material-optimization');
  assert.equal(setup.configurationPackageVersionId, 'config-package-material-rd-v1');
  const cure = setup.operations.find((operation) => operation.id === 'material-cure')!;
  const resolved = resolvedStudySetupItems(setup, cure.id);
  assert.deepEqual(resolved.map((item) => item.label), ['Cure Temperature', 'Cure Time']);
  assert.ok(!resolved.some((item) => item.label === 'Mixing Speed'));
});

void test('Material Study Setup and Run creation reuse shared full-snapshot materialization', () => {
  const setup = createInitialStudySetup('adhesion-material-optimization');
  const run3 = createRunFromEntry('adhesion-material-optimization', 'STUDY_DEFAULT', setup, 3);
  const cure = setup.operations.flatMap((operation) => operation.items).find((item) => item.label === 'Cure Temperature')!;
  const changed = updateStudySetupItem(setup, cure.id, '135');
  const run4 = createRunFromEntry('adhesion-material-optimization', 'STUDY_DEFAULT', changed, 4);
  assert.equal(run3.configurationPackageVersionId, 'config-package-material-rd-v1');
  assert.equal(run3.assignments.find((item) => item.label === 'Cure Temperature')?.value, '120');
  assert.equal(run4.assignments.find((item) => item.label === 'Cure Temperature')?.value, '135');
  assert.notEqual(run3.assignments, run4.assignments);
});

void test('structured formulation preserves raw ingredient identity and wt-percent composition', () => {
  assert.equal(formulationDefinition.code, 'F-BASE-01');
  assert.deepEqual(
    formulationRevision1.components.map((component) => component.amount),
    [60, 30, 10],
  );
  assert.ok(
    formulationRevision1.components.every(
      (component) => component.unit === 'wt%',
    ),
  );
  assert.ok(!materialRunPlanningSnapshot.assignments.some((item) => item.label === 'Composition' && item.kind === 'CONDITION'));
  assert.equal(materialRunPlanningSnapshot.assignments.find((item) => item.label === 'Formulation')?.kind, 'MATERIAL');
});

void test('Material Engineering Grid preserves explicit VARIED intent for Specimens', () => {
  const model = createExperimentWorkspace(materialRunPlanningSnapshot);
  const operations = model.operations.map((operation) => ({ ...operation, sourceOperationId: operation.id }));
  const rows = projectEngineeringGridRows(model, operations, new Set(operations.map((operation) => operation.id)));
  const cure = rows.find((row) => row.assignment?.label === 'Cure Temperature')!;
  assert.equal(cure.role, 'VARIED');
  assert.deepEqual(specimenSubjects.map((subject) => cure.values?.[subject.id]), ['110', '120', '130', '140']);
});

void test('manual execution is representable without MES or wafer identity evidence', () => {
  assert.ok(materialActualExecution.length > 0);
  assert.ok(materialActualExecution.every((item) => item.event.sourceSystem === 'MANUAL'));
  assert.ok(materialActualExecution.every((item) => item.identityContext === null));
});

void test('Material measurements use Subject grain without Site and retain raw provenance', () => {
  const model = createExperimentWorkspace(materialRunPlanningSnapshot);
  const projected = projectMeasurementEvidence(model, materialMeasurementResults, definitions, materialActualExecution);
  assert.ok(projected.some((item) => item.parameter.name === 'Peel Force'));
  assert.ok(projected.some((item) => item.parameter.name === 'Viscosity'));
  assert.ok(projected.every((item) => item.grain === 'SUBJECT' && item.sites.length === 0));
  assert.ok(materialMeasurementResults.values.every((item) => item.acquisitionMethod === 'MANUAL'));
  assert.ok(!materialMeasurementResults.values.some((item) => item.parameterDefinitionId === 'property-viscosity-v1'));
});

void test('Material evaluation and Next Action reuse frozen lifecycle projections', () => {
  const model = createExperimentWorkspace(materialRunPlanningSnapshot);
  const measurements = projectMeasurementEvidence(model, materialMeasurementResults, definitions, materialActualExecution);
  const evaluations = projectEvaluations(materialRunPlanningSnapshot.id, model.subjects, measurements, materialEvaluationTargetBindings, materialEngineerEvaluations);
  assert.ok(evaluations.some((item) => item.achievement.status === 'ACHIEVED'));
  assert.equal(materialDecisionContext.context.decision.nextAction?.nextActionTypeDefinitionId, 'next-action-design-next');
  assert.equal(materialDecisionContext.nextRunPreview.snapshot.id, 'run-material-4');
});

void test('Material reusable surfaces contain no scenario-name branches or semiconductor labels', () => {
  const shared = [
    'src/features/experiment-series/study-setup-workspace.tsx',
    'src/features/run-registration/engineering-grid.tsx',
    'src/features/run-registration/measurement-execution-grid.tsx',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(shared, /adhesion-material-optimization|material-rd|SP-01|Cure Temperature|Peel Force/);
  const model = createExperimentWorkspace(materialRunPlanningSnapshot);
  const materialPage = renderToStaticMarkup(<OperationTable
    model={model} expanded={[]} onToggle={noop} onUpdate={noop} onAdvanced={noop}
    defining={false} draft={[]} onRange={noop}
    selection={{ operationId: model.operations[0].id, subjectId: model.subjects[0].id, view: 'TABLE', scope: 'EXPERIMENT_SCOPE', resolution: 'SUBJECT', density: 'COMPACT' }}
    select={noop}
  />);
  assert.doesNotMatch(materialPage, /Wafer|Lot|Slot|Site|PHOTO|CMP|Reticle/);
});

void test('Formulation keeps stable identity across immutable structured revisions', () => {
  assert.equal(
    formulationRevision1.formulationDefinitionId,
    formulationDefinition.id,
  );
  assert.equal(
    formulationRevision2.formulationDefinitionId,
    formulationDefinition.id,
  );
  assert.equal(formulationRevision1.revision, 1);
  assert.equal(formulationRevision2.revision, 2);
  assert.ok(Object.isFrozen(formulationRevision1));
  assert.ok(Object.isFrozen(formulationRevision1.components));
  assert.throws(() => {
    (formulationRevision1.components[0] as { amount: number }).amount = 55;
  });
  assert.deepEqual(
    formulationRevision1.components.map((component) => component.amount),
    [60, 30, 10],
  );
  assert.deepEqual(
    formulationRevision2.components.map((component) => component.amount),
    [55, 35, 10],
  );
});

void test('historical and future Runs pin exact independent Formulation revisions', () => {
  const run3Revision = materialRunPlanningSnapshot.assignments.find(
    (assignment) => assignment.id === 'material-formulation',
  )?.referenceId;
  const run4Revision = materialRun4PlanningSnapshot.assignments.find(
    (assignment) => assignment.id === 'material-formulation',
  )?.referenceId;
  assert.equal(run3Revision, formulationRevision1.id);
  assert.equal(run4Revision, formulationRevision2.id);
  assert.equal(formulationUsageRun3.formulationRevisionId, formulationRevision1.id);
  assert.equal(formulationUsageRun4.formulationRevisionId, formulationRevision2.id);
  assert.equal(materialRunPlanningSnapshot.id, 'run-material-3');
  assert.notEqual(
    materialRunPlanningSnapshot.assignments,
    materialRun4PlanningSnapshot.assignments,
  );
});

void test('RawMaterial Formulation Specimen and Measurement remain distinct contracts', () => {
  assert.ok(formulationRawMaterials.every((material) => material.id.startsWith('raw-material-')));
  assert.ok(formulationRevision1.components.every((component) =>
    formulationRawMaterials.some((material) => material.id === component.rawMaterialRef),
  ));
  assert.notEqual(formulationDefinition.id, specimenSubjects[0].id);
  assert.notEqual(
    formulationDefinition.id,
    materialMeasurementResults.values[0].id,
  );
  assert.equal(typeof formulationRevision1.components[0], 'object');
  assert.equal('compositionText' in formulationRevision1, false);
});

void test('legacy semiconductor planning normalizes once into the Subject contract', () => {
  const source = runPlanningScenarios.PHOTO;
  const {
    subjects: _subjects,
    subjectOperationIds: _subjectOperationIds,
    manufacturingContext: _manufacturingContext,
    candidateSubjects: _candidateSubjects,
    ...shared
  } = source;
  const normalized = normalizeLegacySemiconductorPlanning({
    ...shared,
    lotId: 'PHO7814',
    wafers: source.subjects.map((subject, index) => ({
      id: subject.id,
      slot: index + 1,
    })),
    waferStepIds: structuredClone(source.subjectOperationIds),
  });
  assert.deepEqual(normalized.subjects, source.subjects);
  assert.deepEqual(
    normalized.subjectOperationIds,
    source.subjectOperationIds,
  );
  assert.equal('waferStepIds' in normalized, false);
  assert.equal('wafers' in normalized, false);
});

void test('new reusable planning and measurement contracts contain no legacy wafer keys', () => {
  const contractSources = [
    'src/features/run-registration/planning-model.ts',
    'src/features/run-registration/workspace-model.ts',
    'src/features/run-registration/actual-execution-model.ts',
    'src/features/run-registration/measurement-grid-model.ts',
    'src/features/run-registration/engineering-grid.tsx',
    'src/domain/measurement/subject-measurement.ts',
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(contractSources, /waferSubjectId|waferSubjectIds|waferStepIds/);
  assert.equal('waferStepIds' in materialRunPlanningSnapshot, false);
  assert.equal('wafers' in materialRunPlanningSnapshot, false);
  assert.ok(materialMeasurementResults.executions.every((item) => 'subjectIds' in item));
  assert.ok(materialMeasurementResults.values.every((item) => 'subjectId' in item));
});

const analysisSelection = (studyId: string, runIds?: string[]): AnalysisSelection => {
  const sources = analysisMeasurementSources.filter((source) =>
    source.studyId === studyId && (!runIds || runIds.includes(source.runId)),
  );
  return {
    studyId,
    runIds: sources.map((source) => source.runId),
    datasetIds: sources.flatMap((source) => source.measurements.datasets.map((dataset) => dataset.id)),
    parameterIds: [Object.keys(sources[0].parameterLabels)[0]],
    subjectIds: sources.flatMap((source) => source.subjects.map((subject) => subject.id)),
    aggregation: 'MEAN',
    datasetOrigin: 'ALL',
    includeExcluded: true,
  };
};

void test('Analysis v1 projects authoritative Measurement references without creating a value store', () => {
  const source = analysisMeasurementSources.find((item) => item.runId === 'run-photo-18')!;
  const rows = projectAnalysisRows(analysisMeasurementSources, analysisSelection('dts-improvement', ['run-photo-18']));
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => source.measurements.datasets.some((dataset) => dataset.id === row.datasetId)));
  assert.ok(rows.every((row) => row.sourceMeasurementIds.every((id) => source.measurements.values.some((value) => value.id === id))));
  assert.equal('measurements' in rows[0], false);
});

void test('one Analysis projection supports Wafer and Specimen SubjectRef data', () => {
  const photoRows = projectAnalysisRows(analysisMeasurementSources, analysisSelection('dts-improvement', ['run-photo-18']));
  const materialRows = projectAnalysisRows(analysisMeasurementSources, analysisSelection('adhesion-material-optimization'));
  assert.ok(photoRows.every((row) => row.subject.type === 'WAFER'));
  assert.deepEqual(materialRows.map((row) => row.subject.displayLabel), ['SP-01', 'SP-02', 'SP-03', 'SP-04']);
  assert.ok(materialRows.every((row) => row.subject.type === 'SPECIMEN'));
});

void test('PHOTO CMP and Material use the same name-agnostic Analysis component', () => {
  for (const studyId of ['dts-improvement', 'cmp-stability', 'adhesion-material-optimization']) {
    assert.ok(projectAnalysisRows(analysisMeasurementSources, analysisSelection(studyId)).length > 0);
  }
  const reusable = readFileSync('src/features/analysis/workspace.tsx', 'utf8');
  assert.doesNotMatch(reusable, /PHOTO|CMP|Material R&D|SP-01|parameter-bcd-v1|parameter-peel-force-v1/);
});

void test('Analysis keeps missing distinct from zero and excluded observations traceable', () => {
  const base = analysisSelection('dts-improvement', ['run-photo-18']);
  const missing = projectAnalysisRows(analysisMeasurementSources, { ...base, parameterIds: ['missing-parameter'] });
  assert.ok(missing.every((row) => row.value === null && row.validity === 'MISSING'));
  const raw = projectAnalysisRows(analysisMeasurementSources, { ...base, aggregation: 'RAW', includeExcluded: true });
  const excluded = raw.find((row) => row.validity === 'EXCLUDED');
  assert.ok(excluded?.measurementValueId);
  assert.equal(excluded?.exclusionReason, 'Focus failure during capture');
});

void test('representative Analysis rows retain exact existing summary provenance', () => {
  const rows = projectAnalysisRows(analysisMeasurementSources, analysisSelection('dts-improvement', ['run-photo-18']));
  assert.ok(rows.every((row) => row.representativeResultId?.startsWith('summary-photo-bcd')));
  assert.ok(rows.every((row) => row.sourceMeasurementIds.length === 5));
});

void test('Run-prefiltered and Study multi-Run Analysis contexts resolve correctly', () => {
  const runRows = projectAnalysisRows(
    analysisMeasurementSources,
    analysisSelection('dts-improvement', ['run-photo-18']),
  );
  assert.ok(runRows.every((row) => row.runNumber === 18));
  const entrySources = [
    'src/features/run-registration/engineering-grid.tsx',
    'src/features/experiment-series/productized-series.tsx',
    'app/analysis/page.tsx',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.match(entrySources, /study=.*runs=|runs=.*parameters=|runNumbers/);
  const studyRows = projectAnalysisRows(analysisMeasurementSources, analysisSelection('dts-improvement'));
  assert.deepEqual([...new Set(studyRows.map((row) => row.runNumber))], [17, 18, 19]);
});

void test('Saved Analysis View stores source refs and configuration without copied values', () => {
  const selection = analysisSelection('cmp-stability');
  const rows = projectAnalysisRows(analysisMeasurementSources, selection);
  const sourceBefore = structuredClone(analysisMeasurementSources.find((source) => source.studyId === 'cmp-stability')!.measurements);
  const saved = saveAnalysisView({
    id: 'saved-analysis-proof', name: 'Thickness Trend', owner: 'Lee Seunghyun', visibility: 'PRIVATE',
    studyId: selection.studyId,
    runIds: selection.runIds, subjectIds: selection.subjectIds, parameterIds: selection.parameterIds,
    datasetIds: selection.datasetIds, visualization: { type: 'LINE', xDimension: 'RUN', groupBy: 'SUBJECT' },
    preparation: { aggregation: 'MEAN', datasetOrigin: 'ALL', includeExcluded: true },
    filters: { text: '', sort: 'RUN' }, savedAt: '2026-09-13T18:00:00+09:00',
  }, rows);
  assert.ok(saved.sourceReferences.every((reference) => reference.datasetId && reference.measurementExecutionId));
  assert.ok(!saved.sourceReferences.some((reference) => 'value' in reference));
  assert.ok(!('values' in saved));
  assert.deepEqual(analysisMeasurementSources.find((source) => source.studyId === 'cmp-stability')!.measurements, sourceBefore);
});

void test('Analysis v1 introduces no automatic scientific judgment or lifecycle mutation', () => {
  const reusable = [
    'src/domain/analysis/workspace.ts',
    'src/features/analysis/workspace.tsx',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(reusable, /PASS|FAIL|Best condition|Root cause|Recommendation|Next Action/);
  assert.doesNotMatch(reusable, /EngineerEvaluationRecord|DecisionContinuationContext|EvaluationTargetBinding/);
});

void test('E2E lifecycle deep links restore the requested Run stage', () => {
  const source = readFileSync('src/features/run-registration/engineering-grid.tsx', 'utf8');
  assert.match(source, /syncLocation\(\)/);
  assert.match(source, /window\.location\.search/);
  assert.match(source, /requestedMode === 'evaluation'/);
  assert.doesNotMatch(source, /serverLocationSearch/);
});

void test('created next Run exposes a direct Plan continuation', () => {
  const html = renderToStaticMarkup(
    <NextRunActionPreview
      preview={engineeringGridDecisionScenarios.PHOTO.nextRunPreview!}
      staged
      onCreate={noop}
      onCancel={noop}
      openHref="/series/dts-improvement/runs/19/engineering-grid?view=plan"
    />,
  );
  assert.match(html, /Run #19 is ready/);
  assert.match(html, /Open Run #19 Plan/);
  assert.match(html, /view=plan/);
});

void test('E2E context links and Material workspace context remain explicit', () => {
  const analysis = readFileSync('src/features/analysis/workspace.tsx', 'utf8');
  const home = readFileSync('src/features/experiment-home/home.tsx', 'utf8');
  const study = readFileSync('src/features/experiment-series/productized-series.tsx', 'utf8');
  assert.match(analysis, /singleRun.runNumber/);
  assert.match(analysis, /engineering-grid\?view=\$\{phase.toLowerCase\(\)\}/);
  assert.equal(
    analysisMeasurementSources.find((source) => source.studyId === 'adhesion-material-optimization')?.workspaceContextLabel,
    'MATERIAL R&D',
  );
  assert.match(home, /Adhesion Material Optimization/);
  assert.match(home, /R&D EXPERIMENTS/);
  assert.match(study, /href=\{`\/series\/\$\{series.slug\}\?view=setup`\}/);
});

function freshLifecycle(seriesSlug: 'dts-improvement' | 'adhesion-material-optimization') {
  const snapshot = createRunFromEntry(
    seriesSlug,
    'STUDY_DEFAULT',
    createInitialStudySetup(seriesSlug),
  );
  const profile = lifecycleAuthoringProfiles[seriesSlug];
  return {
    snapshot,
    profile,
    model: createExperimentWorkspace(snapshot),
    state: createEmptyLifecycleState(snapshot, profile),
  };
}

function authorActualAndMeasurement(
  seriesSlug: 'dts-improvement' | 'adhesion-material-optimization',
  grain: 'SUBJECT' | 'SITE',
) {
  const fresh = freshLifecycle(seriesSlug);
  const process = fresh.model.operations.find((item) => item.role === 'PROCESS')!;
  const measurement = fresh.model.operations.find((item) => item.role === 'MEASUREMENT')!;
  const subject = fresh.model.subjects[0];
  const parameter = fresh.profile.catalog.parameters.find(
    (item) =>
      item.semanticRole === 'MEASUREMENT' &&
      item.measurementOperationDefinitionId ===
        measurement.operationDefinitionRevisionId,
  )!;
  const afterActual = recordActualExecution(fresh.state, fresh.model, {
    id: `fresh-${seriesSlug}-actual`,
    operationId: process.id,
    subjectId: subject.id,
    status: 'COMPLETED',
    startedAt: '2026-09-14T09:00:00+09:00',
    endedAt: '2026-09-14T09:30:00+09:00',
    actualOverrides: {},
  });
  const binding = fresh.profile.targetBindings[0];
  const afterMeasurement = recordManualMeasurement(
    afterActual,
    fresh.model,
    fresh.profile.catalog,
    {
      id: `fresh-${seriesSlug}-measurement`,
      operationId: measurement.id,
      subjectId: subject.id,
      parameterDefinitionId: parameter.id,
      measurementPoint: binding.measurementPoint,
      value: seriesSlug === 'adhesion-material-optimization' ? '1.31' : '17.1',
      grain,
      siteIdentity: grain === 'SITE' ? 'S01' : undefined,
      coordinateValues:
        grain === 'SITE'
          ? [
              { coordinateDefinitionId: 'coordinate-chip-x-v1', value: 0 },
              { coordinateDefinitionId: 'coordinate-chip-y-v1', value: 0 },
            ]
          : [],
      validity: 'INCLUDED',
      recordedAt: '2026-09-14T10:00:00+09:00',
    },
  );
  return { ...fresh, process, measurement, subject, parameter, afterActual, afterMeasurement };
}

void test('fresh Run starts with Plan and no downstream fixture records', () => {
  const { snapshot, state } = freshLifecycle('dts-improvement');
  assert.ok(snapshot.assignments.length > 0);
  assert.equal(state.actualEvidence.length, 0);
  assert.equal(state.measurementResults.datasets.length, 0);
  assert.equal(state.engineerEvaluations.length, 0);
  assert.equal(state.decisionContext, null);
});

void test('Actual execution can be authored against a fresh Run', () => {
  const { afterActual, snapshot } = authorActualAndMeasurement('dts-improvement', 'SITE');
  assert.equal(afterActual.actualEvidence.length, 1);
  assert.equal(afterActual.actualEvidence[0].event.experimentRunId, snapshot.id);
  assert.equal(afterActual.actualEvidence[0].event.sourceSystem, 'DXT Manual');
});

void test('Actual authoring preserves the immutable Plan snapshot', () => {
  const fresh = freshLifecycle('dts-improvement');
  const before = structuredClone(fresh.snapshot);
  const process = fresh.model.operations.find((item) => item.role === 'PROCESS')!;
  recordActualExecution(fresh.state, fresh.model, {
    id: 'actual-plan-proof', operationId: process.id, subjectId: fresh.model.subjects[0].id,
    status: 'COMPLETED', startedAt: '2026-09-14T09:00:00+09:00', endedAt: '2026-09-14T09:30:00+09:00',
    actualOverrides: { 'condition-energy-v1': '99' },
  });
  assert.deepEqual(fresh.snapshot, before);
});

void test('Actual override remains execution evidence and never becomes VARIED intent', () => {
  const fresh = freshLifecycle('dts-improvement');
  const process = fresh.model.operations.find(
    (item) =>
      item.role === 'PROCESS' &&
      projectOperationExecution(
        fresh.model,
        item,
        fresh.model.subjects[0],
        [],
      ).comparisons.some(
        (comparison) =>
          comparison.key !== 'equipment' && comparison.label !== 'Recipe',
      ),
  )!;
  const override = projectOperationExecution(
    fresh.model,
    process,
    fresh.model.subjects[0],
    [],
  ).comparisons.find((item) => item.key !== 'equipment' && item.label !== 'Recipe')!;
  const beforeRoles = fresh.snapshot.assignments.map((item) => [item.id, item.intentRole]);
  const actual = recordActualExecution(fresh.state, fresh.model, {
    id: 'actual-delta-proof', operationId: process.id, subjectId: fresh.model.subjects[0].id,
    status: 'COMPLETED', startedAt: '2026-09-14T09:00:00+09:00', endedAt: '2026-09-14T09:30:00+09:00',
    actualOverrides: { [override.key]: '99' },
  });
  assert.deepEqual(fresh.snapshot.assignments.map((item) => [item.id, item.intentRole]), beforeRoles);
  assert.ok(actual.actualEvidence[0].observedValues.some((item) => item.value === '99'));
});

void test('fresh Measurement creates MeasurementExecution Dataset and manual Value', () => {
  const { afterMeasurement } = authorActualAndMeasurement('dts-improvement', 'SITE');
  assert.equal(afterMeasurement.measurementResults.executions.length, 1);
  assert.equal(afterMeasurement.measurementResults.datasets.length, 1);
  assert.equal(afterMeasurement.measurementResults.values[0].acquisitionMethod, 'MANUAL');
});

void test('Subject-level Material measurement requires no Site', () => {
  const { afterMeasurement } = authorActualAndMeasurement('adhesion-material-optimization', 'SUBJECT');
  const value = afterMeasurement.measurementResults.values[0];
  assert.equal(value.granularity, 'SUBJECT');
  assert.equal(value.siteIdentity, null);
  assert.deepEqual(value.coordinateValues, []);
});

void test('Semiconductor manual measurement retains explicit Site and coordinates', () => {
  const { afterMeasurement } = authorActualAndMeasurement('dts-improvement', 'SITE');
  const value = afterMeasurement.measurementResults.values[0];
  assert.equal(value.siteIdentity, 'S01');
  assert.equal(value.coordinateValues.length, 2);
});

void test('newly authored Measurement is immediately consumable by Analysis', () => {
  const { afterMeasurement, profile } = authorActualAndMeasurement('dts-improvement', 'SITE');
  const source = authoredAnalysisSource(afterMeasurement, profile.catalog)!;
  const selection: AnalysisSelection = {
    studyId: source.studyId,
    runIds: [source.runId],
    datasetIds: source.measurements.datasets.map((item) => item.id),
    parameterIds: [source.measurements.values[0].parameterDefinitionId!],
    subjectIds: [source.measurements.values[0].subjectId],
    aggregation: 'MEAN', datasetOrigin: 'ALL', includeExcluded: true,
  };
  assert.equal(projectAnalysisRows([source], selection).length, 1);
});

void test('Engineer Judgment is manually authored against the exact summary', () => {
  const flow = authorActualAndMeasurement('dts-improvement', 'SITE');
  const summary = flow.afterMeasurement.measurementResults.summaries[0];
  const evaluated = recordEngineerEvaluation(flow.afterMeasurement, {
    id: 'fresh-evaluation', subjectId: flow.subject.id,
    seriesTargetId: flow.profile.targetBindings[0].target.id,
    measurementSummaryId: summary.id, disposition: 'ACCEPT',
    comment: 'Manually reviewed and acceptable.', evaluator: flow.profile.actor,
    evaluatedAt: '2026-09-14T11:00:00+09:00',
  });
  assert.equal(evaluated.engineerEvaluations[0].comment, 'Manually reviewed and acceptable.');
});

function completedAuthoredLifecycle(seriesSlug: 'dts-improvement' | 'adhesion-material-optimization') {
  const flow = authorActualAndMeasurement(seriesSlug, seriesSlug === 'dts-improvement' ? 'SITE' : 'SUBJECT');
  const summary = flow.afterMeasurement.measurementResults.summaries[0];
  const evaluated = recordEngineerEvaluation(flow.afterMeasurement, {
    id: `evaluation-${seriesSlug}`, subjectId: flow.subject.id,
    seriesTargetId: flow.profile.targetBindings[0].target.id,
    measurementSummaryId: summary.id, disposition: 'ACCEPT', comment: 'Human-authored judgment.',
    evaluator: flow.profile.actor, evaluatedAt: '2026-09-14T11:00:00+09:00',
  });
  const change = flow.snapshot.assignments.find((item) => item.subjectId) ?? flow.snapshot.assignments[0];
  const decided = recordDecisionAndNextAction(evaluated, flow.profile.catalog, {
    id: `decision-${seriesSlug}`, decisionStatement: 'Proceed to the next experiment',
    conclusion: 'Continue with one deliberate adjustment.', reason: 'The authored result supports another iteration.',
    nextActionTypeDefinitionId: flow.profile.catalog.nextActionTypes.find((item) => item.code === 'DESIGN_NEXT_EXPERIMENT')!.id,
    nextActionNote: 'Create the next Run and adjust one condition.', evaluationIds: [evaluated.engineerEvaluations[0].id],
    targetReferences: [{ seriesTargetId: flow.profile.targetBindings[0].target.id, measurementSummaryId: summary.id, status: 'ACHIEVED' }],
    targetSubjectIds: [flow.subject.id], targetOperationIds: [flow.measurement.id], recordedBy: flow.profile.actor,
    recordedAt: '2026-09-14T11:30:00+09:00', nextRunChange: { assignmentId: change.id, after: `${change.value}-next` },
  });
  return { ...flow, evaluated, decided };
}

void test('Decision and scientific NextAction can be authored manually', () => {
  const { decided } = completedAuthoredLifecycle('dts-improvement');
  assert.match(decided.decisionContext!.decision.conclusion, /deliberate adjustment/);
  assert.match(decided.decisionContext!.decision.nextAction!.note!, /next Run/);
});

void test('Next Run preview uses the authored source Run', () => {
  const { decided, snapshot } = completedAuthoredLifecycle('dts-improvement');
  assert.equal(decided.nextRunPreview!.previousRunId, snapshot.id);
  assert.equal(decided.nextRunPreview!.snapshot.provenance.sourceId, snapshot.id);
});

void test('created Next Run is an independent complete snapshot', () => {
  const { decided, snapshot } = completedAuthoredLifecycle('dts-improvement');
  const next = decided.nextRunPreview!.snapshot;
  assert.notEqual(next.id, snapshot.id);
  assert.equal(next.assignments.length, snapshot.assignments.length);
  next.assignments[0].value = 'mutated-next-only';
  assert.notEqual(snapshot.assignments[0].value, 'mutated-next-only');
});

void test('Material fresh lifecycle completes through Next Run without Site or MES', () => {
  const { decided, afterMeasurement } = completedAuthoredLifecycle('adhesion-material-optimization');
  assert.equal(afterMeasurement.actualEvidence[0].event.sourceSystem, 'DXT Manual');
  assert.equal(afterMeasurement.measurementResults.values[0].siteIdentity, null);
  assert.equal(decided.nextRunPreview!.snapshot.runNumber, 5);
});

void test('Semiconductor fresh lifecycle completes through Next Run with manual acquisition', () => {
  const { decided, afterMeasurement } = completedAuthoredLifecycle('dts-improvement');
  assert.equal(afterMeasurement.measurementResults.values[0].acquisitionMethod, 'MANUAL');
  assert.equal(decided.nextRunPreview!.snapshot.runNumber, 20);
});

void test('Run repository preserves committed authoring outside UI component state', async () => {
  const repository = createInMemoryRepositories(configurationRepository).run;
  const { state } = freshLifecycle('dts-improvement');
  await repository.saveSnapshot(state.snapshot, { commandId: 'save-run' });
  const restored = (await repository.getSnapshot(state.runId))!;
  restored.name = 'changed copy';
  assert.notEqual((await repository.getSnapshot(state.runId))!.name, 'changed copy');
});

void test('repository boundary architecture guards feature UI from browser persistence', () => {
  const featureFiles = [
    'src/features/experiment-series/study-setup-workspace.tsx',
    'src/features/experiment-series/create-run-entry.tsx',
    'src/features/experiment-series/created-run-grid.tsx',
    'src/features/run-registration/use-planning-state.ts',
    'src/features/run-registration/use-lifecycle-authoring.ts',
    'src/features/analysis/workspace.tsx',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(featureFiles, /localStorage|sessionStorage|Browser[A-Z].*Repository/);
  assert.doesNotMatch(featureFiles, /infrastructure\/browser/);
  const domainFiles = readFileSync('src/domain/reference/configuration.ts', 'utf8');
  assert.doesNotMatch(domainFiles, /infrastructure|React/);
  const ports = readFileSync('src/application/repository-ports.ts', 'utf8');
  assert.doesNotMatch(ports, /from ['"]react|localStorage|sessionStorage/);
  for (const name of ['StudyRepository', 'RunRepository', 'ExecutionRepository', 'MeasurementRepository', 'EvaluationRepository', 'DecisionRepository', 'SavedAnalysisRepository'])
    assert.match(ports, new RegExp(`interface ${name}`));
  assert.doesNotMatch(readFileSync('src/features/run-registration/lifecycle-authoring.ts', 'utf8'), /LifecycleAuthoringRepository|localStorage/);
});

void test('browser composition satisfies owner repository ports and shares one configuration source', () => {
  const repositories = createBrowserRepositories(configurationRepository);
  assert.equal(repositories.configuration, configurationRepository);
  assert.ok(repositories.study instanceof BrowserStudyRepository);
  assert.ok(repositories.run instanceof BrowserRunRepository);
  assert.ok(repositories.execution instanceof BrowserExecutionRepository);
  assert.ok(repositories.measurement instanceof BrowserMeasurementRepository);
  assert.ok(repositories.evaluation instanceof BrowserEvaluationRepository);
  assert.ok(repositories.decision instanceof BrowserDecisionRepository);
  assert.ok(repositories.savedAnalysis instanceof BrowserSavedAnalysisRepository);
});

void test('application services run against alternate in-memory adapters', async () => {
  const repositories = createInMemoryRepositories(configurationRepository);
  const application = new DxtApplication(repositories);
  const { state, profile, model } = freshLifecycle('dts-improvement');
  await repositories.run.saveSnapshot(state.snapshot, { commandId: 'seed' });
  const loaded = await application.loadLifecycle(state.snapshot, profile);
  assert.equal(loaded.runId, state.runId);
  assert.equal(loaded.actualEvidence.length, 0);
  assert.equal(repositories.configuration, configurationRepository);
  assert.equal(model.snapshot.id, loaded.snapshot.id);
});

void test('Measurement repository queries independently by Run Dataset Parameter Subject and Site', async () => {
  const repository = createInMemoryRepositories(configurationRepository).measurement;
  await repository.saveByRun(materialRunPlanningSnapshot.id, materialMeasurementResults, { commandId: 'measurement-contract' });
  const source = materialMeasurementResults.values[0];
  const resolved = await repository.query({
    runIds: [materialRunPlanningSnapshot.id],
    datasetIds: [source.datasetId],
    parameterDefinitionIds: [source.parameterDefinitionId!],
    subjectIds: [source.subjectId],
    validity: 'INCLUDED',
  });
  assert.ok(resolved.values.length > 0);
  assert.ok(resolved.values.every((item) => item.datasetId === source.datasetId));
  assert.ok(resolved.values.every((item) => item.subjectId === source.subjectId));
});

void test('generic authoring boundary contains no DTS PHOTO CMP or Material branching', () => {
  const reusable = [
    'src/features/run-registration/lifecycle-authoring.ts',
    'src/features/run-registration/use-lifecycle-authoring.ts',
    'src/features/run-registration/actual-execution-grid.tsx',
    'src/features/run-registration/measurement-execution-grid.tsx',
    'src/features/run-registration/evaluation-execution-grid.tsx',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(reusable, /DTS|PHOTO|CMP|Material R&D|adhesion-material/);
});

function freshSavedAnalysisView() {
  const flow = authorActualAndMeasurement('dts-improvement', 'SITE');
  const source = authoredAnalysisSource(flow.afterMeasurement, flow.profile.catalog)!;
  const selection: AnalysisSelection = {
    studyId: source.studyId,
    runIds: [source.runId],
    datasetIds: source.measurements.datasets.map((item) => item.id),
    parameterIds: [source.measurements.values[0].parameterDefinitionId!],
    subjectIds: [source.measurements.values[0].subjectId],
    aggregation: 'MEAN',
    datasetOrigin: 'SOURCE',
    includeExcluded: false,
  };
  const rows = projectAnalysisRows([source], selection);
  const view = saveAnalysisView({
    id: 'fresh-authored-analysis-view',
    name: 'Fresh Run result',
    owner: flow.profile.actor,
    visibility: 'PRIVATE',
    studyId: selection.studyId,
    runIds: selection.runIds,
    datasetIds: selection.datasetIds,
    parameterIds: selection.parameterIds,
    subjectIds: selection.subjectIds,
    visualization: { type: 'BAR', xDimension: 'RUN', groupBy: 'SUBJECT' },
    preparation: {
      aggregation: selection.aggregation,
      datasetOrigin: selection.datasetOrigin,
      includeExcluded: selection.includeExcluded,
    },
    filters: { text: 'W01', sort: 'SUBJECT' },
    savedAt: '2026-09-14T13:00:00+09:00',
  }, rows);
  return { source, selection, view };
}

void test('Saved Analysis repository persists exact refs and configuration without values', () => {
  const { view } = freshSavedAnalysisView();
  const repository = new InMemorySavedAnalysisViewRepository();
  repository.save(view);
  const reopened = repository.get(view.id)!;
  assert.deepEqual(reopened.sourceReferences, view.sourceReferences);
  assert.deepEqual(reopened.visualization, view.visualization);
  assert.deepEqual(reopened.filters, view.filters);
  assert.ok(!('values' in reopened));
  assert.ok(reopened.sourceReferences.every((reference) => !('value' in reference)));
});

void test('fresh authored Measurement Saved View reopens exact original Dataset refs', () => {
  const { source, selection, view } = freshSavedAnalysisView();
  const restored = resolveSavedAnalysisView(view, [source]);
  assert.deepEqual(restored.selection, selection);
  assert.deepEqual(restored.missingReferences, []);
  assert.deepEqual(restored.selection.datasetIds, view.datasetIds);
});

void test('unavailable Saved View refs remain unresolved and never select replacements', () => {
  const { source, view } = freshSavedAnalysisView();
  const unavailable = structuredClone(source);
  unavailable.measurements.datasets[0].id = 'replacement-dataset';
  const restored = resolveSavedAnalysisView(view, [unavailable]);
  assert.ok(restored.missingReferences.some((item) => item.includes(view.datasetIds[0])));
  assert.deepEqual(restored.selection.datasetIds, view.datasetIds);
  assert.ok(!restored.selection.datasetIds.includes('replacement-dataset'));
});

void test('Analysis URL carries lightweight navigation state and Saved View identity', () => {
  const source = readFileSync('src/features/analysis/workspace.tsx', 'utf8');
  const page = readFileSync('app/analysis/page.tsx', 'utf8');
  assert.match(source, /params\.set\(\s*'study'/);
  assert.match(source, /params\.set\(\s*'runs'/);
  assert.match(source, /params\.set\(\s*'parameters'/);
  assert.match(source, /params\.set\(\s*'subjects'/);
  assert.match(source, /params\.set\(\s*'view'/);
  assert.match(source, /params\.set\(\s*'savedView'/);
  assert.match(page, /savedViewId/);
});

void test('user-visible Series terminology is normalized to Study while internal compatibility remains', () => {
  const visibleSources = [
    'src/features/experiment-series/series-explorer.tsx',
    'src/features/experiment-series/productized-series.tsx',
    'src/features/experiment-series/series.tsx',
    'src/features/experiment-run/run.tsx',
    'src/features/experiment-run/measurement-results.tsx',
    'src/features/sample-detail/detail.tsx',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(visibleSources, /EXPERIMENT SERIES|Series overview|Series targets|Series normally|experiment Series/);
  assert.match(visibleSources, /STUDY|Study Overview|Study targets|Studies/);
  assert.match(visibleSources, /seriesSlug|page="Series"/);
});

void test('Grid Plan edits preserve exact refs, independent FIXED intent and full source snapshot',()=>{
 const model=createExperimentWorkspaceWithRepository(runPlanningScenarios.PHOTO,configurationRepository);
 const operations=scaleGridOperations(model,model.operations.length);
 const rows=projectEngineeringGridRows(model,operations,new Set(operations.map(o=>o.id)));
 const row=rows.find(r=>r.definition?.editor==='NUMBER'&&r.assignment?.intentRole==='FIXED')!;
 const before=structuredClone(model.snapshot);
 const subject=model.subjects[0];
 const changed=applyGridPlanEdits(model.snapshot,rows,{[`${row.id}:${subject.id}`]:'37'},{});
 assert.deepEqual(model.snapshot,before);
 const assignment=changed.assignments.find(a=>a.label===row.assignment!.label&&a.subjectId===subject.id)!;
 assert.equal(assignment.value,'37');assert.equal(assignment.intentRole,'FIXED');
 assert.equal(assignment.referenceId,row.assignment!.referenceId);
 assert.equal(changed.configurationPackageVersionId,before.configurationPackageVersionId);
 const repeated=applyGridPlanEdits(changed,rows,{[`${row.id}:${subject.id}`]:'38'},{[row.id]:'VARIED'});
 assert.equal(repeated.assignments.filter(a=>a.label===assignment.label&&a.subjectId===subject.id).length,1);
 assert.equal(repeated.assignments.find(a=>a.id===assignment.id)?.intentRole,'VARIED');
});

import { calendarInterval, ExperimentCalendar } from '../src/features/experiment-home/experiment-calendar';
void test('Home calendar clips recorded intervals to UTC month without inventing duration', () => {
  const month = new Date('2026-09-21T12:00:00Z');
  assert.deepEqual(calendarInterval('2026-08-20T00:00:00Z', '2026-10-04T00:00:00Z', month), { left: 0, width: 100 });
  assert.deepEqual(calendarInterval('2026-09-16T00:00:00Z', '2026-09-16T00:00:00Z', month), { left: 50, width: 0 });
  assert.equal(calendarInterval('2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z', month), null);
  assert.equal(calendarInterval('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z', month), null);
  assert.equal(calendarInterval('bad', '2026-09-21', month), null);
  assert.equal(calendarInterval('2026-09-22', '2026-09-21', month), null);
  assert.deepEqual(calendarInterval('2024-02-01T00:00:00Z', '2024-03-01T00:00:00Z', new Date('2024-02-15T00:00:00Z')), { left: 0, width: 100 });
});
void test('Home calendar empty authorized projection stays empty and labels recorded activity', () => {
  const html = renderToStaticMarkup(<ExperimentCalendar rows={[]} month={new Date('2026-09-21T00:00:00Z')} />);
  assert.match(html, /September 2026/);
  assert.match(html, /Recorded activity/);
  assert.match(html, /No experiment activity this month/);
  assert.doesNotMatch(html, /DTS Improvement|CMP Stability|home-gantt-bar/);
});

import {gridPlanningContext, participatesInOperation} from '../src/features/run-registration/grid-plan-context';
void test('Engineering Grid restores stored scope and manual focus without changing the route',()=>{
 const snapshot=structuredClone(runPlanningScenarios.PHOTO);
 const context={snapshot,ranges:[{runId:snapshot.id,startOperationId:'photo-exposure',endOperationId:'photo-exposure',operationIds:['photo-exposure'],subjectIds:[snapshot.subjects[0].id]}],manualFocus:['photo-exposure']};
 const restored=gridPlanningContext(context,configurationRepository);
 assert.deepEqual(restored.scopeRanges,context.ranges);
 assert.deepEqual(restored.manualFocus,context.manualFocus);
 assert.deepEqual(restored.subjects,[snapshot.subjects[0]]);
 assert.deepEqual(restored.snapshot.subjectOperationIds,snapshot.subjectOperationIds);
 assert.equal(gridPlanningContext({...context,ranges:[]},configurationRepository).subjects.length,snapshot.subjects.length);
});
void test('Engineering Grid branching participation rejects nonparticipant edits and preserves rejoin',()=>{
 const snapshot=structuredClone(runPlanningScenarios.PHOTO);
 const [a,b]=snapshot.subjects;
 snapshot.subjectOperationIds[a.id]=['photo-coat','photo-cdsem'];
 snapshot.subjectOperationIds[b.id]=['photo-exposure','photo-cdsem'];
 assert.equal(participatesInOperation(snapshot,a.id,'photo-exposure'),false);
 assert.equal(participatesInOperation(snapshot,b.id,'photo-exposure'),true);
 assert.ok([a,b].every(s=>participatesInOperation(snapshot,s.id,'photo-cdsem')));
 const model=createExperimentWorkspace(snapshot);
 const operations=model.operations.map(o=>({...o,sourceOperationId:o.id}));
 const rows=projectEngineeringGridRows(model,operations,new Set(operations.map(o=>o.id)));
 const energy=rows.find(r=>r.definition?.label==='Energy')!;
 const result=applyGridPlanEdits(snapshot,rows,{[`${energy.id}:${a.id}`]:'99',[`${energy.id}:${b.id}`]:'38'},{});
 assert.deepEqual(result.assignments.filter(x=>x.subjectId===a.id),snapshot.assignments.filter(x=>x.subjectId===a.id));
 assert.equal(result.assignments.find(x=>x.subjectId===b.id&&x.label==='Energy')?.value,'38');
 assert.deepEqual(result.subjectOperationIds,snapshot.subjectOperationIds);
});

import EngineeringGridView from '../src/features/run-registration/engineering-grid';
void test('Engineering Grid renders nonparticipation separately from an empty participating value',()=>{
 const snapshot=structuredClone(runPlanningScenarios.PHOTO);
 const first=snapshot.subjects[0],second=snapshot.subjects[1];
 snapshot.subjectOperationIds[first.id]=snapshot.subjectOperationIds[first.id].filter(id=>id!=='photo-exposure');
 const html=renderToStaticMarkup(<DxtApplicationProvider><EngineeringGridView model={createExperimentWorkspace(snapshot)} seriesSlug="dts-improvement" returnHref="/series/dts-improvement" /></DxtApplicationProvider>);
 assert.match(html,new RegExp(`aria-label="Energy ${first.displayLabel}: Not participating"`));
 assert.doesNotMatch(html,new RegExp(`aria-label="Energy ${first.displayLabel}"`));
 assert.match(html,new RegExp(`aria-label="Energy ${second.displayLabel}"`));
 assert.match(html,/Planned participant/);
});

void test('Final Plan presentation retains hierarchy and subject editors with a closed Inspector', () => {
 const snapshot=structuredClone(runPlanningScenarios.PHOTO);
 const before=JSON.stringify(snapshot);
 const html=renderToStaticMarkup(<DxtApplicationProvider><EngineeringGridView model={createExperimentWorkspace(snapshot)} seriesSlug="dts-improvement" returnHref="/series/dts-improvement" /></DxtApplicationProvider>);
 assert.match(html,/workspace-plan-final/);
 assert.match(html,/Item \/ Details/);
 assert.match(html,/title="Experimental intent"/);
 assert.match(html,/aria-label="EXPOSURE operation"/);
 assert.match(html,/aria-label="Energy variable"/);
 assert.match(html,/aria-label="Energy W01"/);
 assert.match(html,/Intentionally Varied/);
 assert.match(html,/aria-label="Define experiment scope"|aria-label="Select focus range"/);
 assert.match(html,/href="\/analysis\?study=dts-improvement&amp;runs=/);
 assert.doesNotMatch(html,/aria-label="Plan Inspector"/);
 assert.equal(JSON.stringify(snapshot),before,'presentation must not rewrite scientific data');
});

void test('Evaluation FINAL primary action cannot save a missing result', () => {
  const html=renderToStaticMarkup(<EvaluationExecutionGrid model={photo} results={{...engineeringGridMeasurementScenarios.PHOTO,datasets:[],values:[],summaries:[]}} catalog={definitions} executionEvidence={[]} targetBindings={engineeringGridEvaluationScenarios.PHOTO.bindings} engineerEvaluations={[]} decisionContext={null} nextRunPreview={null} onRecordEvaluation={()=>{throw new Error('render must never write');}} onRecordDecision={()=>{throw new Error('render must never write');}} actor="test" now={()=>'2026-09-27T00:00:00Z'}/>);
  assert.match(html,/form="engineer-evaluation-form" disabled=""/);
  assert.match(html,/Result Missing/);
  assert.match(html,/<textarea/);
  assert.doesNotMatch(html,/evaluation-grid-inspector/);
});
void test('Actual FINAL retains operation hierarchy and keeps authoring and Inspector closed initially', () => {
 const html=renderToStaticMarkup(<ActualExecutionGrid model={photo} evidence={actualExecutionScenarios.PHOTO} onRecord={()=>{throw new Error('render must never write');}}/>);
 assert.match(html,/actual-final-table/);
 assert.match(html,/Save Actual/);
 assert.match(html,/Actual Item/);
 assert.doesNotMatch(html,/actual-authoring-form|actual-grid-inspector/);
 assert.match(html,/Import from Tool/);
});
void test('Measurement FINAL retains evidence and exposes the record panel without writing at render', () => {
 const html=renderToStaticMarkup(<MeasurementExecutionGrid model={photo} results={engineeringGridMeasurementScenarios.PHOTO} catalog={definitions} executionEvidence={actualExecutionScenarios.PHOTO} onRecord={()=>{throw new Error('render must never write');}}/>);
 assert.match(html,/Save Measurement/);
 assert.match(html,/measurement-summary-row/);
 assert.doesNotMatch(html,/measurement-grid-inspector/);
});

void test('Analysis FINAL uses one distinct Table Line Bar Scatter selector and defaults to Table',()=>{
 const html=renderToStaticMarkup(<DxtApplicationProvider><AnalysisWorkspace initialContext={{studyId:'dts-improvement',runNumbers:[18]}}/></DxtApplicationProvider>);
 assert.match(html,/<button class="active">Table<\/button>/);
 assert.match(html,/<button class="">Line<\/button>/);
 assert.match(html,/<button class="">Bar<\/button>/);
 assert.match(html,/<button class="">Scatter<\/button>/);
 assert.match(html,/Save Analysis/);
 assert.doesNotMatch(html,/Save View|Scatter requires coordinate metadata/);
});
void test('Analysis FINAL chart retains observation values and separates parameter panels',()=>{
 const rows=projectAnalysisRows(analysisMeasurementSources,analysisSelection('dts-improvement',['run-photo-18']));
 const before=structuredClone(rows);
 const html=renderToStaticMarkup(<AnalysisChart rows={rows} type="SCATTER" xDimension="RUN" groupBy="SUBJECT" onSelect={()=>{throw new Error('render is read only');}}/>);
 for(const row of rows.filter(row=>row.value!==null)) assert.ok(html.includes(String(row.value)));
 assert.deepEqual(rows,before);
 assert.doesNotMatch(html,/NaN|Infinity/);
});

void test('All lifecycle Inspector close controls render an accessible action in both locales',()=>{
 for(const locale of ['en','ko'] as const) for(const evaluation of [false,true]) {
  const html=renderMarkup(<LocaleProvider initialLocale={locale} persist={false}><LifecycleInspectorClose evaluation={evaluation} onClose={()=>{}}/></LocaleProvider>);
  assert.match(html,/aria-label=/);
  assert.match(html,evaluation?/97b29\.svg/:/close\.svg/);
 }
});
