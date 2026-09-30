import {ProductionHome} from '@/src/features/experiment-home/production-home';
import {dashboardAuthorizationContract} from './postgres-dashboard-authorization-contract';
import {SavedAnalysisSharingControl} from '@/src/features/analysis/sharing-control';
import {savedAnalysisAuthorizationContract} from './postgres-saved-analysis-authorization-contract';
import {AuthoringRuntimeConfiguration,productionConfigurationCommands} from '@/src/application/configuration-command-facade';
import {PackageView} from '@/src/features/reference-studio/package-view';
import {DefinitionsView} from '@/src/features/reference-studio/definitions-view';
import {ApplicabilityView} from '@/src/features/reference-studio/applicability-view';
import {canGovern} from '@/src/features/reference-studio/permissions';
import {configurationAuthorizationContract} from './postgres-configuration-authorization-contract';
import { scientificAuthorizationContract } from './postgres-scientific-authorization-contract';
import { authorizationContract } from './postgres-authorization-contract';
import {productionFreezeClosureContract} from './postgres-freeze-closure-contract';
import {productionPlanAuthoringContract} from './postgres-plan-authoring-contract';
import { productionConfigurationStudyContract } from './postgres-configuration-study-contract';
import { productionSavedAnalysisContract } from './postgres-saved-analysis-contract';
import {productionNextRunContract} from './postgres-next-run-contract';
import { productionReasoningContract } from './postgres-reasoning-contract';
import { provisionReasoningContexts } from '@/src/infrastructure/postgres/reasoning-context';
import { productionMeasurementContract } from './postgres-measurement-contract';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { productionExecutionContract } from './postgres-execution-contract';
import { runRepositoryContract } from './run-repository-contract';
import { createBrowserRepositories } from '@/src/infrastructure/browser/browser-repositories';
import { productionRunContract } from './postgres-run-contract';
import { activationContract } from './postgres-activation-contract';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/shared/i18n/locale';
import type { ReactNode } from 'react';
const renderToStaticMarkup = (node: ReactNode) => renderMarkup(<LocaleProvider initialLocale="en" persist={false}>{node}</LocaleProvider>);
import { DxtApplication } from '@/src/application/dxt-application';
import { DxtApplicationProvider } from '@/src/application/dxt-application-provider';
import { ConfigurationManagementCommands,referenceCatalogSchema } from '@/src/domain/reference';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import EngineeringGrid from '@/src/features/run-registration/engineering-grid';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { configurationRepository, registeredConfigurationEditorKeys } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { updateStudySetupItem } from '@/src/features/experiment-series/study-setup-model';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { PGliteTestDatabase } from '@/src/infrastructure/postgres/pglite-test-database';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { persistStudySetupVersion, seedProductionSlice } from '@/src/infrastructure/postgres/slice-seed';
import { createInMemoryRepositories } from '@/src/infrastructure/memory/in-memory-repositories';

const migrationPath = join(process.cwd(), 'src/infrastructure/postgres/migrations/001_production_adapter_slice_1.sql');

async function withDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'dxt-postgres-slice-'));
  const dataDir = join(directory, 'postgres');
  const database = await PGliteTestDatabase.open(dataDir);
  await database.exec(await readFile(migrationPath, 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/002_actual_execution.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/003_measurement.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/004_evaluation_decision.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/005_saved_analysis.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/006_configuration_study_authoring.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/007_run_plan_authoring.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/008_study_reasoning_adoption.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/009_authorization_study_run.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/010_authorization_scientific.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/011_authorization_configuration.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/012_authorization_saved_analysis.sql'), 'utf8'));
  await database.exec(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/013_authorization_discovery.sql'), 'utf8'));
  await seedProductionSlice(database, configurationRepository);
  await provisionMeasurementReferences(database, definitions);
  await provisionReasoningContexts(database,lifecycleAuthoringProfiles);
  return { directory, dataDir, database };
}

void test('PostgreSQL slice hydrates exact configuration and creates read-back Run snapshots for Wafer and Specimen', async () => {
  const state = await withDatabase();
  try {
    const configuration = await hydrateConfigurationPackages(state.database, [
      'config-package-photo-v1', 'config-package-material-rd-v1',
    ]);
    const repositories = createProductionSliceRepositories(state.database, configuration);
    const application = new DxtApplication(repositories);

    const photoSetup = await application.studies.load('dts-improvement');
    assert.equal(photoSetup?.configurationPackageVersionId, 'config-package-photo-v1');
    const photo = await application.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'create-photo-run');
    const photoReadBack = await application.runs.loadCreated('dts-improvement', photo.runNumber);
    assert.ok(photoReadBack);
    assert.equal(photoReadBack.configurationPackageVersionId, 'config-package-photo-v1');
    assert.ok(photoReadBack.subjects.every((subject) => subject.type === 'WAFER'));
    assert.ok(photoReadBack.assignments.some((item) => item.intentRole === 'VARIED'));

    const material = await application.createRunFromStudy('adhesion-material-optimization', 'STUDY_DEFAULT', 'create-material-run');
    const materialReadBack = await application.runs.loadCreated('adhesion-material-optimization', material.runNumber);
    assert.ok(materialReadBack);
    assert.ok(materialReadBack.subjects.every((subject) => subject.type === 'SPECIMEN'));
    assert.ok(materialReadBack.steps.some((step) => step.label.toUpperCase() === 'CURE'));
    assert.ok(materialReadBack.assignments.some((item) => item.label === 'Cure Temperature' && item.intentRole === 'VARIED'));
    assert.ok(materialReadBack.assignments.some((item) => item.referenceId.startsWith('formulation-')));
    assert.equal(materialReadBack.measurements.every((item) => !('site' in item)), true);

    const inMemory = createInMemoryRepositories(configuration).run;
    const memorySaved = await inMemory.saveSnapshot(photoReadBack, { commandId: 'memory-contract' });
    assert.deepEqual(await inMemory.getSnapshot(memorySaved.id), photoReadBack);
    assert.deepEqual(await repositories.run.getSnapshot(photoReadBack.id), photoReadBack);

    await runRepositoryContract(inMemory, photoReadBack, 'contract-memory');
    await runRepositoryContract(repositories.run, photoReadBack, 'contract-postgres');
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } } });
    try { await runRepositoryContract(createBrowserRepositories(configuration).run, photoReadBack, 'contract-browser'); }
    finally { if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window'); }
    const model = createExperimentWorkspace(photoReadBack, configuration);
    const html = renderToStaticMarkup(
      <DxtApplicationProvider value={{
        application,
        configurationCommands: new ConfigurationManagementCommands(configuration, definitions, registeredConfigurationEditorKeys),
      }}>
        <EngineeringGrid model={model} seriesSlug="dts-improvement" returnHref="/series/dts-improvement"
          authoringProfile={{ ...lifecycleAuthoringProfiles['dts-improvement'], catalog: definitions }} />
      </DxtApplicationProvider>,
    );
    assert.match(html, /Engineering Grid/);
    assert.match(html, /EXPOSURE|Exposure/);
  } finally {
    await state.database.close();
    await rm(state.directory, { recursive: true, force: true });
  }
});

void test('Create Run idempotency, safe allocation, optimistic conflict, and rollback are persisted', async () => {
  const state = await withDatabase();
  try {
    const configuration = await hydrateConfigurationPackages(state.database, ['config-package-photo-v1']);
    const application = new DxtApplication(createProductionSliceRepositories(state.database, configuration));
    const first = await application.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'same-create-command');
    const repeated = await application.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'same-create-command');
    assert.equal(repeated.id, first.id);
    assert.equal((await state.database.query('SELECT * FROM experiment_run')).rowCount, 1);
    assert.equal((await state.database.query('SELECT * FROM idempotency_record')).rowCount, 1);

    const second = await application.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'different-create-command');
    assert.equal(second.runNumber, first.runNumber + 1);
    await assert.rejects(
      state.database.query('UPDATE experiment_run SET run_number = $1 WHERE run_domain_id = $2', [first.runNumber, second.id]),
    );
    await assert.rejects(
      application.repositories.run.savePlanningWorkspace(
        { snapshot: first, ranges: [], manualFocus: [] },
        { commandId: 'stale-edit', expectedVersion: 0 },
      ),
      /changed/,
    );

    const setup = (await application.studies.load('dts-improvement'))!;
    const invalid = structuredClone(first);
    invalid.id = 'run-invalid-rollback';
    invalid.runNumber = 999;
    invalid.subjectOperationIds[invalid.subjects[0].id] = ['missing-operation'];
    const before = await state.database.query<{ count: string }>('SELECT count(*)::text AS count FROM experiment_run');
    const allocationBefore = await state.database.query<{ next_run_number: number }>('SELECT next_run_number FROM study WHERE series_slug = $1', ['dts-improvement']);
    await assert.rejects(application.repositories.run.saveSnapshot(invalid, { commandId: 'rollback-command' }), /Unknown Run Operation/);
    const after = await state.database.query<{ count: string }>('SELECT count(*)::text AS count FROM experiment_run');
    const allocationAfter = await state.database.query<{ next_run_number: number }>('SELECT next_run_number FROM study WHERE series_slug = $1', ['dts-improvement']);
    assert.equal(after.rows[0].count, before.rows[0].count);
    assert.equal(Number(allocationAfter.rows[0].next_run_number), Number(allocationBefore.rows[0].next_run_number));
    assert.equal((await state.database.query("SELECT * FROM idempotency_record WHERE idempotency_key = 'rollback-command'")).rowCount, 0);

    const energy = setup.operations.flatMap((operation) => operation.items).find((item) => item.label === 'Energy')!;
    await persistStudySetupVersion(state.database, updateStudySetupItem(setup, energy.id, '42'));
    await state.database.query("UPDATE configuration_package_version SET status = 'INACTIVE' WHERE package_version_id = 'config-package-photo-v1'");
    const historical = await application.repositories.run.getSnapshot(first.id);
    assert.equal(historical?.assignments.find((item) => item.label === 'Energy')?.value, first.assignments.find((item) => item.label === 'Energy')?.value);
    assert.equal(historical?.configurationPackageVersionId, 'config-package-photo-v1');
  } finally {
    await state.database.close();
    await rm(state.directory, { recursive: true, force: true });
  }
});

void test('PostgreSQL Run survives adapter disposal and database reconnection', async () => {
  const state = await withDatabase();
  try {
    const configuration = await hydrateConfigurationPackages(state.database, ['config-package-photo-v1']);
    const firstApplication = new DxtApplication(createProductionSliceRepositories(state.database, configuration));
    const created = await firstApplication.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'restart-proof');
    await state.database.close();

    const reconnected = await PGliteTestDatabase.open(state.dataDir);
    try {
      const rehydrated = await hydrateConfigurationPackages(reconnected, ['config-package-photo-v1']);
      const secondApplication = new DxtApplication(createProductionSliceRepositories(reconnected, rehydrated));
      const reopened = await secondApplication.repositories.run.getSnapshot(created.id);
      assert.deepEqual(reopened, created);
      await assert.rejects(
        reconnected.query(`INSERT INTO experiment_run
          (run_id, run_domain_id, study_id, run_number, configuration_package_version_id,
           experiment_type_profile_version_id, subject_type_revision_id, display_name, experiment_type,
           area, created_at, intent, provenance_kind, provenance_label, delta)
          SELECT gen_random_uuid(), 'invalid-fk-run', study_id, 9999, 'missing-package',
           experiment_type_profile_version_id, subject_type_revision_id, 'Invalid', experiment_type,
           area, now(), '', provenance_kind, provenance_label, '{}'::jsonb
          FROM experiment_run LIMIT 1`),
      );
    } finally {
      await reconnected.close();
    }
  } finally {
    await rm(state.directory, { recursive: true, force: true });
  }
});

void test('Phase 2.1 package lineage activation invariant A–D and PHOTO/CMP coexistence', async () => {
  const state = await withDatabase();
  try { await activationContract(state.database); }
  finally { await state.database.close(); await rm(state.directory, { recursive: true, force: true }); }
});

void test('Production Run contract: concurrent allocation, historical pins, retry and mid-write rollback', async () => {
  const state = await withDatabase();
  try { await productionRunContract(state.database); }
  finally { await state.database.close(); await rm(state.directory, { recursive: true, force: true }); }
});

void test('Execution: shared repository contracts, Plan immutability, persisted retries, stale conflict, atomic rollback', async () => {
  const state = await withDatabase();
  try { await productionExecutionContract(state.database); }
  finally { await state.database.close(); await rm(state.directory, { recursive: true, force: true }); }
});

void test('Measurement: raw grain, provenance, SQL queries, Analysis, validity, idempotency, rollback and bounded volume',async()=>{
 const state=await withDatabase();
 try{await productionMeasurementContract(state.database);}finally{await state.database.close();await rm(state.directory,{recursive:true,force:true});}
});

void test('Reasoning: Evaluation/Decision/NextAction exact sources, contracts, retries, concurrency and rollback',async()=>{const state=await withDatabase();try{const proof=await productionMeasurementContract(state.database);await productionReasoningContract(state.database,proof);}finally{await state.database.close();await rm(state.directory,{recursive:true,force:true});}});

void test('Next Run: full snapshot, source independence, persisted retries, concurrency, rollback and navigation',async()=>{const state=await withDatabase();try{const measurements=await productionMeasurementContract(state.database);const reasoning=await productionReasoningContract(state.database,measurements);await productionNextRunContract(state.database,reasoning);}finally{await state.database.close();await rm(state.directory,{recursive:true,force:true});}});

void test('PostgreSQL Saved Analysis persists exact configuration, concurrency, retries, missing refs and atomic rollback',async()=>{
 const state=await withDatabase();
 try {await productionSavedAnalysisContract(state.database,await productionMeasurementContract(state.database));}
 finally {await state.database.close();await rm(state.directory,{recursive:true,force:true});}
});

void test('Configuration + Study authoring: exact revisions, activation, persisted defaults, concurrency, rollback and historical Runs',async()=>{const state=await withDatabase();try{await productionConfigurationStudyContract(state.database);}finally{await state.database.close();await rm(state.directory,{recursive:true,force:true});}});

void test('Plan authoring: mutable full snapshot, evidence lock, concurrency, retry, rollback and independent sources',async()=>{const state=await withDatabase();try{await productionMeasurementContract(state.database);await productionPlanAuthoringContract(state.database);}finally{await state.database.close();await rm(state.directory,{recursive:true,force:true});}});

void test('Freeze blockers: explicit new-package readiness, four persisted creation sources, full Wafer/Specimen lifecycle',async()=>{const state=await withDatabase();try{await productionFreezeClosureContract(state.database,await productionConfigurationStudyContract(state.database));}finally{await state.database.close();await rm(state.directory,{recursive:true,force:true});}});

void test("Authorization: trusted identity, SQL scope, command denial and frozen locks",async()=>{const s=await withDatabase();try{await authorizationContract(s.database);}finally{await s.database.close();await rm(s.directory,{recursive:true,force:true});}});

void test("Scientific Authorization: persona writes, source intersection and trusted actors",async()=>{const s=await withDatabase();try{await scientificAuthorizationContract(s.database);}finally{await s.database.close();await rm(s.directory,{recursive:true,force:true});}});

void test("Configuration Authorization: scoped governance, direct API denial and historical pins",async()=>{const s=await withDatabase();try{await configurationAuthorizationContract(s.database);}finally{await s.database.close();await rm(s.directory,{recursive:true,force:true});}});

void test('Configuration permissions: scoped server projection disables authoring and safely renders empty discovery',()=>{
 const snapshot={registry:configurationRepository.getConfigurationRegistry(),catalog:definitions,drafts:[],authoredDefinitions:[],version:1,permissions:[]};
 const runtime=new AuthoringRuntimeConfiguration(snapshot);
 const application=new DxtApplication(createInMemoryRepositories(runtime),[],[],{},{load:async()=>snapshot,execute:async()=>{throw new Error('No UI mutation expected');}});
 const value={application,configurationCommands:productionConfigurationCommands(application)};
 assert.equal(canGovern(application,'canAuthorDefinition'),false);
 const rendered=renderToStaticMarkup(<DxtApplicationProvider value={value}><PackageView selectedId="config-package-photo-v1" onSelect={()=>{}} refresh={()=>{}} /></DxtApplicationProvider>);
 assert.match(rendered,/<button disabled="">Create Draft/);
 assert.match(rendered,/<button disabled="">Assemble Version/);
 const definition=renderToStaticMarkup(<DxtApplicationProvider value={value}><DefinitionsView selectedId="condition-energy-v1" onSelect={()=>{}} onGoApplicability={()=>{}} refresh={()=>{}} /></DxtApplicationProvider>);
 assert.match(definition,/<button class="rs-primary" disabled="">/);
 const scope={kind:'AREA' as const,ownerId:'only-this-area'};
 application.repositories.configuration=new AuthoringRuntimeConfiguration({...snapshot,permissions:[{scope,canViewConfiguration:true,canAuthorDefinition:true,canManageApplicability:false,canCreatePackageVersion:false,canActivatePackageVersion:false}]});
 assert.equal(canGovern(application,'canAuthorDefinition',scope),true);
 assert.equal(canGovern(application,'canAuthorDefinition',{kind:'AREA',ownerId:'another-area'}),false);
 assert.equal(canGovern(application,'canActivatePackageVersion',scope),false);
 application.repositories.configuration=new AuthoringRuntimeConfiguration({...snapshot,catalog:referenceCatalogSchema.parse(Object.fromEntries(Object.keys(referenceCatalogSchema.shape).map(k=>[k,[]]))),registry:{packages:[],subjectTypes:[],grains:[],departmentAreaProfiles:[],experimentTypeProfiles:[],equipmentCapabilityProfiles:[],applicabilityRuleSets:[],validationProfiles:[],projectionProfiles:[],definitionDescriptors:[],externalReferences:[]}});
 const empty=renderToStaticMarkup(<DxtApplicationProvider value={value}><PackageView selectedId="unavailable" onSelect={()=>{}} refresh={()=>{}} initialValidation /><DefinitionsView selectedId="unavailable" onSelect={()=>{}} onGoApplicability={()=>{}} refresh={()=>{}} /><ApplicabilityView selectedId="unavailable" onSelect={()=>{}} onGoPackages={()=>{}} refresh={()=>{}} /></DxtApplicationProvider>);
 assert.match(empty,/No Configuration packages/);assert.match(empty,/No Configuration definitions/);assert.match(empty,/No applicable Configuration/);
});

void test("Saved Analysis Authorization: ownership, sharing ceilings, all-source intersection and revocation",async()=>{const s=await withDatabase();try{await savedAnalysisAuthorizationContract(s.database,await productionMeasurementContract(s.database));}finally{await s.database.close();await rm(s.directory,{recursive:true,force:true});}});

void test('Saved Analysis sharing UI uses server permissions and explains source intersection',()=>{
 const repository=createInMemoryRepositories(configurationRepository).savedAnalysis;
 const access={version:1,ownerPrincipalId:'trusted-owner',sharing:{visibility:'PRIVATE' as const,targetId:null,audiences:[]},canEditSavedAnalysis:false,canShareSavedAnalysis:false,canDeleteSavedAnalysis:false,canManageSavedAnalysisAccess:false};
 const markup=renderToStaticMarkup(<SavedAnalysisSharingControl id="test" access={access} repository={repository} onChanged={()=>{}}/>);
 assert.match(markup,/disabled="">Manage sharing/);assert.match(markup,/access to every underlying scientific source/);
 const allowed=renderToStaticMarkup(<SavedAnalysisSharingControl id="test" access={{...access,canShareSavedAnalysis:true}} repository={repository} onChanged={()=>{}}/>);
 assert.ok(!allowed.includes('disabled="">Manage sharing'));
});

void test("Dashboard Authorization: scoped policy, search, aggregate leakage, calendar, organization and generic evidence",async()=>{const s=await withDatabase();try{await dashboardAuthorizationContract(s.database,await productionMeasurementContract(s.database));}finally{await s.database.close();await rm(s.directory,{recursive:true,force:true});}});

void test('Production Home uses scoped projections without fixture counts or names',()=>{
 const html=renderToStaticMarkup(<ProductionHome studies={[]} dashboard={{counts:{studies:0,runs:0,activeRuns:0,thisWeek:0,needReview:0,measurements:0,savedAnalyses:0},continueWorking:null,recent:[],calendar:[],calendarTotal:0,groups:[],diagnostics:{principalId:'viewer',projection:'dashboard.query',scope:{kind:'MY'},policyVersion:'organization-discovery-v5'}}}/>);
 assert.match(html,/No personal experiment work/);assert.match(html,/No accessible Studies/);
 assert.ok(!html.includes('DTS Improvement'));assert.ok(!html.includes('Run 18'));
});
