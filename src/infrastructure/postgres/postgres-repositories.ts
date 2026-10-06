import { runCreationRequestSchema,type RunCreationRequest,type AuthoritativeRunPreview } from '@/src/application/run-creation';
import { studyReadiness,confirmStudyReasoning,requireStudyReadiness } from './reasoning-context';
import {resolveConfigurationApplicability} from '@/src/domain/reference';
import {validatePlanEdit} from '@/src/application/plan-authoring';
import {planLockReason} from './plan-lock';
import { writeStudySetupVersion } from './study-setup-storage';
import { resolvedStudySetupItems, validateStudySetupItem } from '@/src/features/experiment-series/study-setup-model';
import { PostgresSavedAnalysisRepository } from './postgres-saved-analysis-repository';
import {createNextRunPreview, type NextRunPreview} from '@/src/features/run-registration/decision-continuation-model';
import { PostgresEvaluationRepository, PostgresDecisionRepository } from './postgres-reasoning-repositories';
import { PostgresMeasurementRepository } from './postgres-measurement-repository';
import { PostgresExecutionRepository } from './postgres-execution-repository';
import { hydrateConfigurationPackages } from './configuration-hydrator';
import { createHash, randomUUID } from 'node:crypto';
import type {
  ApplicationRepositories,
  PlanningWorkspaceRecord,
  RepositoryCommand,
  RunRepository,
  StudyRepository,
} from '@/src/application/repository-ports';
import { ApplicationError } from '@/src/application/repository-ports';
import { createRunFromEntry } from '@/src/features/experiment-series/run-entry-model';
import { unsupportedRepositories } from './unsupported-repositories';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import type {
  MeasurementPlanItem,
  PlanStep,
  RunPlanningSnapshot,
  SetupAssignment,
} from '@/src/features/run-registration/planning-model';
import { validatePlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { SqlDatabase, SqlSession } from './sql-database';

type StudyRow = { study_id: string; series_slug: SeriesSlug };
type RunRootRow = {
  run_id: string; run_domain_id: string; series_slug: SeriesSlug; series_domain_id: string;
  study_name: string; run_number: number; configuration_package_version_id: string;
  experiment_type_profile_version_id: string; subject_type_revision_id: string;
  display_name: string; experiment_type: string; area: string; workspace_context_label: string | null;
  created_at: string | Date; intent: string; provenance_kind: RunPlanningSnapshot['provenance']['kind'];
  provenance_label: string; provenance_source_id: string | null; candidate_subjects: RunPlanningSnapshot['candidateSubjects'];
  manufacturing_context: RunPlanningSnapshot['manufacturingContext']; delta: RunPlanningSnapshot['delta']; aggregate_version: string | number;
};

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dateOnly = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

function renumberSnapshot(snapshot: RunPlanningSnapshot, runNumber: number): RunPlanningSnapshot {
  if (snapshot.runNumber === runNumber) return structuredClone(snapshot);
  const previousId = snapshot.id;
  const runId = previousId.replace(/-\d+$/, `-${runNumber}`);
  const stepIds = new Map(snapshot.steps.map((step, index) => [step.id, `${runId}-step-${index + 1}`]));
  return {
    ...structuredClone(snapshot), id: runId, runNumber, name: `Run ${runNumber}`,
    steps: snapshot.steps.map((step) => ({ ...step, id: stepIds.get(step.id)! })),
    assignments: snapshot.assignments.map((item, index) => ({
      ...item, id: `${runId}-assignment-${index + 1}`,
      processStepId: item.processStepId ? stepIds.get(item.processStepId)! : null,
    })),
    measurements: snapshot.measurements.map((item, index) => ({
      ...item, id: `${runId}-measurement-${index + 1}`, stepId: stepIds.get(item.stepId)!,
    })),
    subjectOperationIds: Object.fromEntries(Object.entries(snapshot.subjectOperationIds).map(([subjectId, ids]) => [
      subjectId,
      ids.map((id) => {
        const mapped = stepIds.get(id);
        if (!mapped) throw new ApplicationError('VALIDATION', `Unknown Run Operation membership: ${id}`);
        return mapped;
      }),
    ])),
  };
}

function persistenceError(message: string, cause: unknown) {
  if (cause instanceof ApplicationError) return cause;
  return new ApplicationError('PERSISTENCE', message, { cause });
}

export async function readSetup(session: SqlSession, seriesSlug: SeriesSlug): Promise<StudySetupSnapshot | null> {
  const root = await session.query<{
    setup_version_id: string; series_slug: SeriesSlug; series_domain_id: string;
    configuration_package_version_id: string; experiment_type_profile_version_id: string;
    subject_type_revision_id: string; area: string; revision: number; updated_at: string | Date;
  }>(`SELECT setup.setup_version_id, study.series_slug, study.series_domain_id,
      setup.configuration_package_version_id, setup.experiment_type_profile_version_id,
      setup.subject_type_revision_id, setup.area, setup.revision, setup.updated_at
    FROM study
    JOIN study_setup_version setup ON setup.setup_version_id = study.current_setup_version_id
    WHERE study.series_slug = $1`, [seriesSlug]);
  const row = root.rows[0];
  if (!row) return null;
  const operations = await session.query<{
    setup_operation_id: string; operation_domain_id: string; label: string;
    operation_definition_revision_id: string; role: 'PROCESS' | 'MEASUREMENT'; measurement_point: PlanStep['measurementPoint']; operation_context: PlanStep['context'];
  }>('SELECT * FROM study_setup_operation WHERE setup_version_id = $1 ORDER BY sequence', [row.setup_version_id]);
  const result: StudySetupSnapshot['operations'] = [];
  for (const operation of operations.rows) {
    const assignments = await session.query<{
      assignment_domain_id: string; definition_revision_id: string; label: string;
      assignment_kind: SetupAssignment['kind']; assignment_reference_revision_id: string;
      value_text: string; intent_role: SetupAssignment['intentRole']; editor_key: StudySetupSnapshot['operations'][number]['items'][number]['editor'];
      unit_symbol: string; options: StudySetupSnapshot['operations'][number]['items'][number]['options']; applicability_id: string;
    }>('SELECT * FROM study_setup_assignment WHERE setup_operation_id = $1 ORDER BY ordinal, assignment_domain_id', [operation.setup_operation_id]);
    const measurements = await session.query<{
      measurement_domain_id: string; measurement_operation_definition_id: string; operation_label: string;
      parameter_definition_ids: string[]; parameter_labels: string[]; measurement_point: MeasurementPlanItem['point'];
    }>('SELECT * FROM study_setup_measurement_plan WHERE setup_operation_id = $1 ORDER BY measurement_domain_id', [operation.setup_operation_id]);
    result.push({
      id: operation.operation_domain_id, label: operation.label,
      operationDefinitionRevisionId: operation.operation_definition_revision_id,
      role: operation.role, measurementPoint: operation.measurement_point, context: operation.operation_context,
      items: assignments.rows.map((item) => ({
        id: item.assignment_domain_id, operationId: operation.operation_domain_id,
        definitionRevisionId: item.definition_revision_id, label: item.label,
        kind: item.assignment_kind, referenceId: item.assignment_reference_revision_id,
        value: item.value_text, intentRole: item.intent_role, editor: item.editor_key,
        unit: item.unit_symbol, grain: 'SUBJECT', options: item.options,
        applicabilityId: item.applicability_id,
      })),
      measurements: measurements.rows.map((item) => ({
        id: item.measurement_domain_id, stepId: operation.operation_domain_id,
        measurementOperationDefinitionId: item.measurement_operation_definition_id,
        operation: item.operation_label, parameterDefinitionIds: item.parameter_definition_ids,
        parameters: item.parameter_labels, point: item.measurement_point,
      })),
    });
  }
  return {
    seriesSlug: row.series_slug, seriesId: row.series_domain_id,
    configurationPackageVersionId: row.configuration_package_version_id,
    experimentTypeProfileVersionId: row.experiment_type_profile_version_id,
    subjectTypeRevisionId: row.subject_type_revision_id, area: row.area,
    revision: row.revision, updatedAt: dateOnly(row.updated_at), operations: result,
  };
}

const comparableStudyData=(value:unknown):unknown=>Array.isArray(value)?value.map(comparableStudyData):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,comparableStudyData(v)])):value;
const sameStudyData=(a:unknown,b:unknown)=>JSON.stringify(comparableStudyData(a))===JSON.stringify(comparableStudyData(b));
export class PostgresStudyRepository implements StudyRepository {
  constructor(private readonly database: SqlDatabase) {}
  getLifecycleReadiness(slug:SeriesSlug,pin:string){return this.database.transaction(sql=>studyReadiness(sql,slug,pin));}
  confirmReasoningContext(slug:SeriesSlug,input:import('@/src/application/study-readiness').ConfirmStudyReasoning,command:RepositoryCommand){return this.database.transaction(sql=>confirmStudyReasoning(sql,slug,input,command.commandId));}
  getSetup(seriesSlug: SeriesSlug) { return readSetup(this.database, seriesSlug); }
  async saveSetup(setup: StudySetupSnapshot, command: RepositoryCommand) {
    const requestHash=hash({setup,expectedVersion:command.expectedVersion});
    await this.database.transaction(async session=>{
      const study=(await session.query<{study_id:string}>('SELECT study_id FROM study WHERE series_slug=$1 FOR UPDATE',[setup.seriesSlug])).rows[0];
      if(!study)throw new ApplicationError('NOT_FOUND','Study is not persisted.');
      const receipt=(await session.query<{request_hash:string}>('SELECT request_hash FROM study_setup_command_receipt WHERE study_id=$1 AND command_id=$2',[study.study_id,command.commandId])).rows[0];
      if(receipt){if(receipt.request_hash!==requestHash)throw new ApplicationError('CONFLICT','Study command identity was reused.');return;}
      const current=await readSetup(session,setup.seriesSlug);
      if(!current || command.expectedVersion!==current.revision || setup.revision!==current.revision+1)throw new ApplicationError('CONFLICT','Study Setup changed. Reload before saving.');
      if(setup.area!==current.area || setup.seriesId!==current.seriesId || setup.subjectTypeRevisionId!==current.subjectTypeRevisionId || setup.experimentTypeProfileVersionId!==current.experimentTypeProfileVersionId)throw new ApplicationError('VALIDATION','Study identity/context cannot be changed by a default edit.');
      const configuration=await hydrateConfigurationPackages(session,[setup.configurationPackageVersionId]);
      if(setup.operations.length!==current.operations.length)throw new ApplicationError('VALIDATION','Study operation backbone must be preserved.');
      if(new Set(setup.operations.map(o=>o.id)).size!==setup.operations.length)throw new ApplicationError('VALIDATION','Duplicate Study Operation identity.');
      for(const operation of setup.operations){
        const prior=current.operations.find(item=>item.id===operation.id);
        if(!prior || !operation.context || !sameStudyData(operation.context,prior.context) || operation.operationDefinitionRevisionId!==prior.operationDefinitionRevisionId)throw new ApplicationError('VALIDATION','Exact Operation context is required.');
        if(operation.role!==prior.role || operation.label!==prior.label || operation.measurementPoint!==prior.measurementPoint || !sameStudyData(operation.measurements,prior.measurements))throw new ApplicationError('VALIDATION','Operation and Measurement context must be preserved.');
        if(new Set(operation.items.map(i=>i.id)).size!==operation.items.length)throw new ApplicationError('VALIDATION','Duplicate Study item identity.');
        const applicable=resolvedStudySetupItems(setup,operation.id,configuration);
        for(const item of operation.items){const definition=applicable.find(d=>d.definitionRevisionId===item.definitionRevisionId && d.applicabilityId===item.applicabilityId);if(!definition || definition.kind!==item.kind || definition.referenceId!==item.referenceId || definition.label!==item.label || definition.editor!==item.editor || definition.unit!==item.unit || !sameStudyData(definition.options,item.options) || item.operationId!==operation.id || item.grain!=='SUBJECT' || !['FIXED','VARIED'].includes(item.intentRole))throw new ApplicationError('VALIDATION','Study item is not applicable to its pinned context.');validateStudySetupItem(definition,item.value);}
      }
      const id=await writeStudySetupVersion(session,study.study_id,setup);
      await session.query('INSERT INTO study_setup_command_receipt VALUES($1,$2,$3,$4)',[study.study_id,command.commandId,requestHash,id]);
    });
  }
}

async function readRun(session: SqlSession, where: string, parameters: unknown[]) {
  const root = await session.query<RunRootRow>(`SELECT run.*, study.series_slug, study.series_domain_id, run.study_name
    FROM experiment_run run JOIN study ON study.study_id = run.study_id ${where}`, parameters);
  const row = root.rows[0];
  if (!row) return null;
  const subjects = await session.query<{ run_subject_id: string; subject_domain_id: string; subject_kind: 'WAFER' | 'SPECIMEN'; display_label: string }>(
    `SELECT membership.run_subject_id, subject.subject_domain_id, subject.subject_kind, membership.display_label
     FROM run_subject membership JOIN subject ON subject.subject_id = membership.subject_id
     WHERE membership.run_id = $1 ORDER BY membership.ordinal`, [row.run_id]);
  const operations = await session.query<{ run_operation_id: string; operation_domain_id: string; label: string; operation_definition_revision_id: string; role: PlanStep['role']; measurement_point: PlanStep['measurementPoint']; operation_context: PlanStep['context'] }>(
    'SELECT * FROM run_operation WHERE run_id = $1 ORDER BY sequence', [row.run_id]);
  const subjectOps = await session.query<{ subject_domain_id: string; operation_domain_id: string }>(
    `SELECT subject.subject_domain_id, operation.operation_domain_id FROM run_subject_operation link
     JOIN run_subject membership ON membership.run_subject_id = link.run_subject_id
     JOIN subject ON subject.subject_id = membership.subject_id
     JOIN run_operation operation ON operation.run_operation_id = link.run_operation_id
     WHERE membership.run_id = $1 ORDER BY membership.ordinal, operation.sequence`, [row.run_id]);
  const assignments = await session.query<{
    assignment_domain_id: string; assignment_kind: SetupAssignment['kind']; label: string; value_text: string;
    assignment_reference_revision_id: string; operation_domain_id: string | null; subject_domain_id: string | null;
    position_domain_id: string | null; intent_role: SetupAssignment['intentRole']; provenance: SetupAssignment['provenance'];
  }>(`SELECT assignment.*, operation.operation_domain_id, subject.subject_domain_id
      FROM run_assignment assignment
      LEFT JOIN run_operation operation ON operation.run_operation_id = assignment.run_operation_id
      LEFT JOIN run_subject membership ON membership.run_subject_id = assignment.run_subject_id
      LEFT JOIN subject ON subject.subject_id = membership.subject_id
      WHERE assignment.run_id = $1 ORDER BY assignment.assignment_domain_id`, [row.run_id]);
  const measurements = await session.query<{
    measurement_plan_id: string; measurement_domain_id: string; operation_domain_id: string;
    measurement_operation_definition_id: string; operation_label: string; measurement_point: MeasurementPlanItem['point'];
  }>(`SELECT plan.*, operation.operation_domain_id FROM run_measurement_plan plan
      JOIN run_operation operation ON operation.run_operation_id = plan.run_operation_id
      WHERE plan.run_id = $1 ORDER BY plan.measurement_domain_id`, [row.run_id]);
  const plans: MeasurementPlanItem[] = [];
  for (const measurement of measurements.rows) {
    const parametersResult = await session.query<{ parameter_definition_id: string; parameter_label: string }>(
      'SELECT parameter_definition_id, parameter_label FROM run_measurement_plan_parameter WHERE measurement_plan_id = $1 ORDER BY ordinal',
      [measurement.measurement_plan_id]);
    plans.push({ id: measurement.measurement_domain_id, stepId: measurement.operation_domain_id,
      measurementOperationDefinitionId: measurement.measurement_operation_definition_id,
      operation: measurement.operation_label, point: measurement.measurement_point,
      parameterDefinitionIds: parametersResult.rows.map((item) => item.parameter_definition_id),
      parameters: parametersResult.rows.map((item) => item.parameter_label) });
  }
  const subjectOperationIds = Object.fromEntries(subjects.rows.map((subject) => [
    subject.subject_domain_id,
    subjectOps.rows.filter((item) => item.subject_domain_id === subject.subject_domain_id).map((item) => item.operation_domain_id),
  ]));
  const snapshot: RunPlanningSnapshot = {
    id: row.run_domain_id, configurationPackageVersionId: row.configuration_package_version_id,
    experimentTypeProfileVersionId: row.experiment_type_profile_version_id,
    subjectTypeRevisionId: row.subject_type_revision_id,
    series: { id: row.series_domain_id, name: row.study_name }, runNumber: Number(row.run_number),
    name: row.display_name, experimentType: row.experiment_type, area: row.area,
    workspaceContextLabel: row.workspace_context_label ?? undefined, createdAt: dateOnly(row.created_at),
    intent: row.intent, provenance: { kind: row.provenance_kind, label: row.provenance_label, sourceId: row.provenance_source_id },
    subjects: subjects.rows.map((item) => ({ id: item.subject_domain_id, type: item.subject_kind, displayLabel: item.display_label })),
    candidateSubjects: row.candidate_subjects ?? undefined, manufacturingContext: row.manufacturing_context ?? undefined,
    steps: operations.rows.map((item) => ({ id: item.operation_domain_id, label: item.label,
      operationDefinitionId: item.operation_definition_revision_id, role: item.role, measurementPoint: item.measurement_point, context: item.operation_context })),
    subjectOperationIds,
    assignments: assignments.rows.map((item) => ({ id: item.assignment_domain_id, kind: item.assignment_kind,
      label: item.label, value: item.value_text, referenceId: item.assignment_reference_revision_id,
      processStepId: item.operation_domain_id, subjectId: item.subject_domain_id, positionId: item.position_domain_id,
      intentRole: item.intent_role, provenance: item.provenance })),
    measurements: plans, delta: row.delta,
  };
  const errors = validatePlanningSnapshot(snapshot);
  if (errors.length) throw new ApplicationError('PERSISTENCE', `Persisted Run snapshot is invalid: ${errors.join('; ')}`);
  return snapshot;
}

async function insertSnapshot(session: SqlSession, study: StudyRow, snapshot: RunPlanningSnapshot) {
  const runId = randomUUID();
  const configuration = await hydrateConfigurationPackages(session, [snapshot.configurationPackageVersionId]);
  const registry = configuration.getConfigurationRegistry();
  await session.query(`INSERT INTO experiment_run (
    run_id, run_domain_id, study_id, run_number, configuration_package_version_id,
    experiment_type_profile_version_id, subject_type_revision_id, display_name,
    experiment_type, area, workspace_context_label, created_at, intent, provenance_kind,
    provenance_label, provenance_source_id, candidate_subjects, manufacturing_context, delta, study_name)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19::jsonb,$20)`,
    [runId, snapshot.id, study.study_id, snapshot.runNumber, snapshot.configurationPackageVersionId,
      snapshot.experimentTypeProfileVersionId, snapshot.subjectTypeRevisionId, snapshot.name,
      snapshot.experimentType, snapshot.area, snapshot.workspaceContextLabel ?? null, snapshot.createdAt.length === 10 ? `${snapshot.createdAt}T00:00:00.000Z` : snapshot.createdAt,
      snapshot.intent, snapshot.provenance.kind, snapshot.provenance.label, snapshot.provenance.sourceId,
      JSON.stringify(snapshot.candidateSubjects ?? null), JSON.stringify(snapshot.manufacturingContext ?? null), JSON.stringify(snapshot.delta), snapshot.series.name]);
  await insertPlanChildren(session,runId,snapshot,registry);
  return runId;
}
async function insertPlanChildren(session:SqlSession,runId:string,snapshot:RunPlanningSnapshot,registry:ReturnType<import('@/src/application/hydrated-configuration').HydratedConfiguration['getConfigurationRegistry']>){
  const rules=registry.applicabilityRuleSets.flatMap(set=>set.rules);
  const subjectIds = new Map<string, string>();
  for (const [index, subject] of snapshot.subjects.entries()) {
    const existing = await session.query<{ subject_id: string }>(
      'SELECT subject_id FROM subject WHERE subject_type_revision_id = $1 AND subject_domain_id = $2',
      [snapshot.subjectTypeRevisionId, subject.id]);
    const subjectId = existing.rows[0]?.subject_id ?? randomUUID();
    if (!existing.rows[0]) await session.query(
      `INSERT INTO subject (subject_id, subject_domain_id, subject_type_revision_id, subject_kind, business_identifier, display_label)
       VALUES ($1,$2,$3,$4,$5,$6)`, [subjectId, subject.id, snapshot.subjectTypeRevisionId, subject.type, subject.id, subject.displayLabel]);
    const runSubjectId = randomUUID();
    await session.query('INSERT INTO run_subject (run_subject_id, run_id, subject_id, ordinal, display_label) VALUES ($1,$2,$3,$4,$5)',
      [runSubjectId, runId, subjectId, index + 1, subject.displayLabel]);
    subjectIds.set(subject.id, runSubjectId);
  }
  const operationIds = new Map<string, string>();
  for (const [index, operation] of snapshot.steps.entries()) {
    const operationId = randomUUID(); operationIds.set(operation.id, operationId);
    await session.query(`INSERT INTO run_operation (run_operation_id, run_id, operation_domain_id, sequence, label,
      operation_definition_revision_id, role, measurement_point, operation_context) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [operationId, runId, operation.id, index + 1, operation.label, operation.operationDefinitionId, operation.role, operation.measurementPoint, JSON.stringify(operation.context)]);
  }
  for (const [subjectDomainId, operationDomainIds] of Object.entries(snapshot.subjectOperationIds)) {
    const runSubjectId = subjectIds.get(subjectDomainId);
    if (!runSubjectId) throw new ApplicationError('VALIDATION', `Unknown Run Subject membership: ${subjectDomainId}`);
    for (const operationDomainId of operationDomainIds) {
      const runOperationId = operationIds.get(operationDomainId);
      if (!runOperationId) throw new ApplicationError('VALIDATION', `Unknown Run Operation membership: ${operationDomainId}`);
      await session.query('INSERT INTO run_subject_operation (run_subject_id, run_operation_id, run_id) VALUES ($1,$2,$3)', [runSubjectId, runOperationId, runId]);
    }
  }
  for (const assignment of snapshot.assignments) {
    const assignmentId = randomUUID();
    const step = snapshot.steps.find((item) => item.id === assignment.processStepId);
    const context=step?.context;
    if(!step||!context)throw new ApplicationError('VALIDATION','Exact assignment Operation context is required.');
    const resolved=resolveConfigurationApplicability({getConfigurationRegistry:()=>registry},{configurationPackageVersionId:snapshot.configurationPackageVersionId,operationDefinitionRevisionId:step.operationDefinitionId,areaDefinitionRevisionId:context.areaDefinitionRevisionId,subjectTypeRevisionId:snapshot.subjectTypeRevisionId,requestedGrainRevisionId:'grain-subject-r1',equipmentReferenceId:context.equipmentReferenceId,moduleReferenceId:context.moduleReferenceId??undefined,experimentTypeProfileVersionId:snapshot.experimentTypeProfileVersionId}).find(item=>item.assignmentKind===assignment.kind&&(item.assignmentReferenceRevisionId===assignment.referenceId||item.allowedOptions.some(option=>option.referenceId===assignment.referenceId)));
    const rule=rules.find(item=>item.id===resolved?.applicabilityRuleId);
    const descriptor = registry.definitionDescriptors.find((item) => item.revisionId === rule?.definitionRevisionId);
    if (!rule || !descriptor) throw new ApplicationError('VALIDATION', 'Assignment has no exact definition in its pinned package.');
    const valueType = descriptor.editorKey === 'NUMBER' ? 'NUMBER' : descriptor.editorKey === 'BOOLEAN' ? 'BOOLEAN'
      : descriptor.editorKey === 'REFERENCE' ? 'REFERENCE' : 'TEXT';
    const numeric = valueType === 'NUMBER' ? Number(assignment.value.trim().split(/\s+/)[0]) : null;
    if (numeric !== null && !Number.isFinite(numeric)) throw new ApplicationError('VALIDATION', 'Invalid numeric assignment.');
    const operationId = assignment.processStepId ? operationIds.get(assignment.processStepId) : null;
    const subjectId = assignment.subjectId ? subjectIds.get(assignment.subjectId) : null;
    if (assignment.processStepId && !operationId) throw new ApplicationError('VALIDATION', `Unknown assignment Operation: ${assignment.processStepId}`);
    if (assignment.subjectId && !subjectId) throw new ApplicationError('VALIDATION', `Unknown assignment Subject: ${assignment.subjectId}`);
    await session.query(`INSERT INTO run_assignment (run_assignment_id, run_id, assignment_domain_id, run_operation_id,
      run_subject_id, position_domain_id, assignment_kind, label, value_text, assignment_reference_revision_id,
      intent_role, provenance, definition_revision_id, reference_kind, grain_revision_id,
      unit_definition_revision_id, applicability_rule_id, value_type, value_number, value_boolean)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [assignmentId, runId, assignment.id, operationId, subjectId, assignment.positionId, assignment.kind,
        assignment.label, assignment.value, assignment.referenceId, assignment.intentRole, assignment.provenance,
        descriptor.revisionId, assignment.kind === 'CONDITION' ? 'definitionDescriptors' : 'externalReferences',
        rule.defaultGrainRevisionId, descriptor.unitDefinitionRevisionId, rule.id, valueType, numeric,
        valueType === 'BOOLEAN' ? assignment.value === 'true' : null]);
    const subtype = { CONDITION: ['run_condition_assignment', 'condition_revision_id'], RECIPE: ['run_recipe_assignment', 'recipe_revision_id'],
      MATERIAL: ['run_material_usage', 'material_revision_id'], RESOURCE: ['run_resource_usage', 'resource_revision_id'] }[assignment.kind]!;
    await session.query(`INSERT INTO ${subtype[0]} (run_assignment_id, ${subtype[1]}) VALUES ($1,$2)`, [assignmentId, assignment.referenceId]);
  }
  for (const measurement of snapshot.measurements) {
    const operationId = operationIds.get(measurement.stepId);
    if (!operationId) throw new ApplicationError('VALIDATION', `Unknown Measurement Plan Operation: ${measurement.stepId}`);
    const measurementId = randomUUID();
    await session.query(`INSERT INTO run_measurement_plan (measurement_plan_id, run_id, measurement_domain_id,
      run_operation_id, measurement_operation_definition_id, operation_label, measurement_point)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [measurementId, runId, measurement.id, operationId,
      measurement.measurementOperationDefinitionId, measurement.operation, measurement.point]);
    for (let index = 0; index < measurement.parameterDefinitionIds.length; index += 1)
      await session.query(`INSERT INTO run_measurement_plan_parameter
        (measurement_plan_id, ordinal, parameter_definition_id, parameter_label) VALUES ($1,$2,$3,$4)`,
        [measurementId, index + 1, measurement.parameterDefinitionIds[index], measurement.parameters[index]]);
  }
  return runId;
}

async function materializePersistedStudy(session: SqlSession, slug: string, number: number) {
  const setup = await readSetup(session, slug as SeriesSlug);
  if (!setup) throw new ApplicationError('NOT_FOUND', 'Study Setup is not persisted.');
  await hydrateConfigurationPackages(session, [setup.configurationPackageVersionId]);
  const result = await session.query<{ study_id: string; display_name: string; experiment_type: string; intent: string;
    workspace_context_label: string | null; manufacturing_context: RunPlanningSnapshot['manufacturingContext'] }>(
    'SELECT * FROM study WHERE series_slug = $1', [slug]);
  const study = result.rows[0];
  const subjects = await session.query<{ subject_domain_id: string; subject_kind: 'WAFER' | 'SPECIMEN'; display_label: string }>(
    'SELECT * FROM study_subject_default WHERE study_id = $1 ORDER BY ordinal', [study.study_id]);
  if (!subjects.rowCount) throw new ApplicationError('VALIDATION', 'Study has no persisted default Subjects.');
  const context: RunPlanningSnapshot = {
    id: `run-${study.study_id}-${number}`, configurationPackageVersionId: setup.configurationPackageVersionId,
    experimentTypeProfileVersionId: setup.experimentTypeProfileVersionId, subjectTypeRevisionId: setup.subjectTypeRevisionId,
    series: { id: setup.seriesId, name: study.display_name }, runNumber: number, name: `Run ${number}`,
    experimentType: study.experiment_type, area: setup.area, workspaceContextLabel: study.workspace_context_label ?? undefined,
    manufacturingContext: study.manufacturing_context ?? undefined, createdAt: new Date().toISOString().slice(0, 10),
    intent: study.intent, provenance: { kind: 'SERIES_DEFAULT', label: `Study Default revision ${setup.revision}`, sourceId: null },
    subjects: subjects.rows.map((x) => ({ id: x.subject_domain_id, type: x.subject_kind, displayLabel: x.display_label })),
    steps: [], assignments: [], measurements: [], subjectOperationIds: {}, delta: { sourceLabel: 'Study Default', items: [], unchangedCount: 0 },
  };
  const snapshot = createRunFromEntry(slug as SeriesSlug, 'STUDY_DEFAULT', setup, number, context);
  // Display IDs stay compatible; relational PKs remain independent UUIDs.
  return { ...snapshot, createdAt: context.createdAt };
}

async function previewPersistedCreation(session:SqlSession,raw:RunCreationRequest):Promise<AuthoritativeRunPreview>{
  const request=runCreationRequestSchema.parse(raw);
  const study=(await session.query<StudyRow>('SELECT study_id,series_slug FROM study WHERE series_slug=$1',[request.seriesSlug])).rows[0];
  if(!study)throw new ApplicationError('NOT_FOUND','Study is not persisted.');
  let snapshot:RunPlanningSnapshot;
  if(request.source==='STUDY_DEFAULT'||request.source==='BLANK'){
    snapshot=await materializePersistedStudy(session,request.seriesSlug,0);
    if(request.source==='BLANK')snapshot={...snapshot,steps:[],assignments:[],measurements:[],subjectOperationIds:Object.fromEntries(snapshot.subjects.map(s=>[s.id,[]])),provenance:{kind:'AD_HOC',label:'Blank setup',sourceId:null},delta:{sourceLabel:'Blank setup',items:[],unchangedCount:0}};
  }else{
    const source=(await session.query<{run_domain_id:string}>(`SELECT run_domain_id FROM experiment_run WHERE study_id=$1 ${request.source==='EXISTING_RUN'?'AND run_domain_id=$2':''} ORDER BY run_number DESC LIMIT 1 FOR SHARE`,request.source==='EXISTING_RUN'?[study.study_id,request.sourceRunId??'']:[study.study_id])).rows[0];
    if(!source)throw new ApplicationError('NOT_FOUND','A persisted source Run in this Study is required.');
    const previous=(await readRun(session,'WHERE run.run_domain_id=$1',[source.run_domain_id]))!;
    let changes:NextRunPreview['changed']=[];
    if(request.source==='PREVIOUS_RUN'){
      const decision=(await session.query<{preview:NextRunPreview|null}>(`SELECT d.preview FROM decision_state s JOIN decision d ON d.id=s.decision_id JOIN experiment_run r ON r.run_id=s.run_id WHERE r.run_domain_id=$1`,[previous.id])).rows[0];
      changes=decision?.preview?.changed??[];
    }
    snapshot={...createNextRunPreview(previous,`run-${study.study_id}-0`,changes.map(c=>({assignmentId:c.assignmentId,after:c.after}))).snapshot,runNumber:0};
    if(request.source==='EXISTING_RUN')snapshot={...snapshot,provenance:{kind:'EXISTING_CONFIGURATION',label:`Existing Run #${previous.runNumber}`,sourceId:previous.id},assignments:snapshot.assignments.map(a=>({...a,provenance:'EXISTING_CONFIGURATION'}))};
  }
  await hydrateConfigurationPackages(session,[snapshot.configurationPackageVersionId]);
  const readiness=await studyReadiness(session,request.seriesSlug,snapshot.configurationPackageVersionId);
  return {snapshot,fingerprint:hash(comparableStudyData(snapshot)),readiness:{status:readiness.status,missing:readiness.missing}};
}

export class PostgresRunRepository implements RunRepository {
  constructor(private readonly database: SqlDatabase) {}
  getSnapshot(runId: string) { return readRun(this.database, 'WHERE run.run_domain_id = $1', [runId]); }
  async listSnapshots() {
    const rows = await this.database.query<{ run_domain_id: string }>('SELECT run_domain_id FROM experiment_run ORDER BY created_at, run_number');
    return (await Promise.all(rows.rows.map((row) => this.getSnapshot(row.run_domain_id)))).filter((item): item is RunPlanningSnapshot => Boolean(item));
  }
  getCreatedRun(seriesSlug: SeriesSlug, runNumber?: number) {
    return readRun(this.database,
      `WHERE study.series_slug = $1 ${runNumber === undefined ? '' : 'AND run.run_number = $2'} ORDER BY run.run_number DESC LIMIT 1`,
      runNumber === undefined ? [seriesSlug] : [seriesSlug, runNumber]);
  }
  previewCreation(request:RunCreationRequest){return this.database.transaction(session=>previewPersistedCreation(session,request));}
  createFromPreview(entry:RunCreationRequest,fingerprint:string,command:RepositoryCommand){return this.create({entry,fingerprint},command);}
  createFromStudyDefault(seriesSlug: SeriesSlug, command: RepositoryCommand) {
    return this.create({ seriesSlug }, command);
  }
  createFromPreviousRun(previousRunId:string,decisionId:string,command:RepositoryCommand){return this.create({previousRunId,decisionId},command);}
  saveSnapshot(input: RunPlanningSnapshot, command: RepositoryCommand) {
    return this.create(input, command);
  }
  private async create(request: RunPlanningSnapshot | { seriesSlug: SeriesSlug } | {previousRunId:string;decisionId:string} | {entry:RunCreationRequest;fingerprint:string}, command: RepositoryCommand) {
    const requestHash = hash(request);
    try {
      return await this.database.transaction(async (session) => {
        const inserted = await session.query(`INSERT INTO idempotency_record
          (idempotency_record_id, command_scope, idempotency_key, request_hash, status)
          VALUES ($1, 'CREATE_RUN', $2, $3, 'PENDING') ON CONFLICT (command_scope, idempotency_key) DO NOTHING`,
          [randomUUID(), command.commandId, requestHash]);
        if (inserted.rowCount === 0) {
          const receipt = await session.query<{ request_hash: string; status: string; result_run_id: string | null }>(
            `SELECT request_hash, status, result_run_id FROM idempotency_record
             WHERE command_scope = 'CREATE_RUN' AND idempotency_key = $1 FOR UPDATE`, [command.commandId]);
          const previous = receipt.rows[0];
          if (!previous || previous.request_hash !== requestHash)
            throw new ApplicationError('CONFLICT', 'The idempotency key was already used with different Run input.');
          if (previous.status !== 'SUCCEEDED' || !previous.result_run_id)
            throw new ApplicationError('CONFLICT', 'The previous Create Run command has not completed successfully.');
          const existing = await readRun(session, 'WHERE run.run_id = $1', [previous.result_run_id]);
          if (!existing) throw new ApplicationError('PERSISTENCE', 'The persisted idempotency result cannot be resolved.');
          return existing;
        }
        let previous: RunPlanningSnapshot | null = null;
        let preview: NextRunPreview | null = null;
        if('previousRunId' in request){
          previous=await readRun(session,'WHERE run.run_domain_id=$1',[request.previousRunId]);
          if(!previous)throw new ApplicationError('NOT_FOUND','Source Run is not persisted.');
          const proposal=await session.query<{preview:NextRunPreview|null}>(`SELECT d.preview FROM decision d JOIN experiment_run r ON r.run_id=d.run_id WHERE d.domain_id=$1 AND r.run_domain_id=$2`,[request.decisionId,request.previousRunId]);
          preview=proposal.rows[0]?.preview??null;
          if(!preview||preview.previousRunId!==previous.id)throw new ApplicationError('VALIDATION','Exact saved Next Run proposal is unavailable.');
        }
        const studyResult = await session.query<StudyRow & { next_run_number: number }>(
          `SELECT study_id, series_slug, next_run_number FROM study WHERE ${'seriesSlug' in request || 'entry' in request ? 'series_slug' : 'series_domain_id'} = $1 FOR UPDATE`, ['entry' in request ? request.entry.seriesSlug : 'seriesSlug' in request ? request.seriesSlug : 'previousRunId' in request ? previous!.series.id : request.series.id]);
        const study = studyResult.rows[0];
        if (!study) throw new ApplicationError('NOT_FOUND', 'Study is not persisted.');
        const allocated = Number(study.next_run_number);
        const entryPreview='entry' in request?await previewPersistedCreation(session,request.entry):null;
        if('entry' in request&&entryPreview!.fingerprint!==request.fingerprint)throw new ApplicationError('CONFLICT','Creation source changed. Review a fresh preview before creating.');
        const input = 'entry' in request ? entryPreview!.snapshot : 'seriesSlug' in request
          ? await materializePersistedStudy(session, request.seriesSlug, allocated)
          : 'previousRunId' in request
            ? createNextRunPreview(previous!, `run-${randomUUID()}-${allocated}`, preview!.changed.map(c=>({assignmentId:c.assignmentId,after:c.after}))).snapshot
            : request;
        const snapshot = renumberSnapshot(input, allocated);
        await requireStudyReadiness(session,study.series_slug,snapshot.configurationPackageVersionId);
        await session.query('UPDATE study SET next_run_number = $2, aggregate_version = aggregate_version + 1 WHERE study_id = $1', [study.study_id, allocated + 1]);
        const runId = await insertSnapshot(session, study, snapshot);
        await session.query(`UPDATE idempotency_record SET status = 'SUCCEEDED', result_run_id = $2, completed_at = now()
          WHERE command_scope = 'CREATE_RUN' AND idempotency_key = $1`, [command.commandId, runId]);
        const saved = await readRun(session, 'WHERE run.run_id = $1', [runId]);
        if (!saved) throw new ApplicationError('PERSISTENCE', 'Run read-back failed inside the Create Run transaction.');
        return saved;
      });
    } catch (cause) {
      throw persistenceError(`Create Run failed (command=${command.commandId}, study=${'entry' in request ? request.entry.seriesSlug : 'seriesSlug' in request ? request.seriesSlug : 'previousRunId' in request ? request.previousRunId : request.series.id}).`, cause);
    }
  }
  async getPlanningWorkspace(runId: string) {
    return this.database.transaction(async session=>{
      await session.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const snapshot=await readRun(session,'WHERE run.run_domain_id=$1',[runId]);
      if(!snapshot)return null;
      const root=(await session.query<{run_id:string;aggregate_version:number;planning_context:{ranges:PlanningWorkspaceRecord['ranges'];manualFocus:string[]}}>('SELECT run_id,aggregate_version,planning_context FROM experiment_run WHERE run_domain_id=$1',[runId])).rows[0];
      return {snapshot,...root.planning_context,version:Number(root.aggregate_version),lockReason:await planLockReason(session,root.run_id)};
    });
  }
  async savePlanningWorkspace(record: PlanningWorkspaceRecord, command: RepositoryCommand) {
    try {await this.database.transaction(async session=>{
      const root=(await session.query<{run_id:string;aggregate_version:number}>('SELECT run_id,aggregate_version FROM experiment_run WHERE run_domain_id=$1 FOR UPDATE',[record.snapshot.id])).rows[0];
      if(!root)throw new ApplicationError('NOT_FOUND','Run is not persisted.');
      const requestHash=hash(comparableStudyData({snapshot:record.snapshot,ranges:record.ranges,manualFocus:record.manualFocus,expectedVersion:command.expectedVersion}));
      const scope=`SAVE_PLAN:${root.run_id}`;
      const receipt=(await session.query<{request_hash:string}>("SELECT request_hash FROM idempotency_record WHERE command_scope=$1 AND idempotency_key=$2",[scope,command.commandId])).rows[0];
      if(receipt){if(receipt.request_hash!==requestHash)throw new ApplicationError('CONFLICT','Plan command identity was reused.');return;}
      const reason=await planLockReason(session,root.run_id);
      if(reason)throw new ApplicationError('CONFLICT',reason);
      if(command.expectedVersion!==Number(root.aggregate_version))throw new ApplicationError('CONFLICT','Plan changed. Reload before saving.');
      const current=(await readRun(session,'WHERE run.run_id=$1',[root.run_id]))!;
      const configuration=await hydrateConfigurationPackages(session,[current.configurationPackageVersionId]);
      const snapshot=validatePlanEdit(current,record.snapshot,configuration);
      for(const table of ['run_measurement_plan','run_assignment','run_subject_operation','run_operation','run_subject'])await session.query(`DELETE FROM ${table} WHERE run_id=$1`,[root.run_id]);
      await insertPlanChildren(session,root.run_id,snapshot,configuration.getConfigurationRegistry());
      await session.query(`UPDATE experiment_run SET display_name=$2,intent=$3,candidate_subjects=$4::jsonb,manufacturing_context=$5::jsonb,delta=$6::jsonb,planning_context=$7::jsonb,aggregate_version=aggregate_version+1 WHERE run_id=$1`,[root.run_id,snapshot.name,snapshot.intent,JSON.stringify(snapshot.candidateSubjects??null),JSON.stringify(snapshot.manufacturingContext??null),JSON.stringify(snapshot.delta),JSON.stringify({ranges:record.ranges,manualFocus:record.manualFocus})]);
      await session.query("INSERT INTO idempotency_record(idempotency_record_id,command_scope,idempotency_key,request_hash,status,result_run_id,completed_at) VALUES($1,$2,$3,$4,'SUCCEEDED',$5,now())",[randomUUID(),scope,command.commandId,requestHash,root.run_id]);
    });}catch(error){throw persistenceError('Save Plan failed.',error);}
  }
}

export function createProductionSliceRepositories(
  database: SqlDatabase,
  configuration: ApplicationRepositories['configuration'],
): ApplicationRepositories {
  const deferred = unsupportedRepositories();
  return {
    ...deferred, configuration,
    study: new PostgresStudyRepository(database),
    run: new PostgresRunRepository(database),
    execution: new PostgresExecutionRepository(database),
    measurement: new PostgresMeasurementRepository(database),
    evaluation: new PostgresEvaluationRepository(database),
    decision: new PostgresDecisionRepository(database),
    savedAnalysis: new PostgresSavedAnalysisRepository(database),
  };
}
