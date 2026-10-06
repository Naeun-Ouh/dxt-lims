import { studyBootstrapContract } from './postgres-study-bootstrap-contract';
import { studyCreationContract } from './postgres-study-creation-contract';
import {dashboardAuthorizationContract} from './postgres-dashboard-authorization-contract';
import {savedAnalysisAuthorizationContract} from './postgres-saved-analysis-authorization-contract';
import {configurationAuthorizationContract} from './postgres-configuration-authorization-contract';
import { scientificAuthorizationContract } from './postgres-scientific-authorization-contract';
import { authorizationContract } from './postgres-authorization-contract';
import {productionFreezeClosureContract} from './postgres-freeze-closure-contract';
import {productionPlanAuthoringContract,nativePlanEvidenceRace} from './postgres-plan-authoring-contract';
import { productionConfigurationStudyContract } from './postgres-configuration-study-contract';
import { PostgresConfigurationAuthoring } from '@/src/infrastructure/postgres/postgres-configuration-authoring';
import { productionSavedAnalysisContract } from './postgres-saved-analysis-contract';
import {productionNextRunContract} from './postgres-next-run-contract';
import { productionReasoningContract } from './postgres-reasoning-contract';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { provisionReasoningContexts } from '@/src/infrastructure/postgres/reasoning-context';
import { productionMeasurementContract } from './postgres-measurement-contract';
import { projectAnalysisRows } from '@/src/domain/analysis';
import { definitions } from '@/src/mock/reference';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { productionExecutionContract } from './postgres-execution-contract';
import { runRepositoryContract } from './run-repository-contract';
import { productionRunContract } from './postgres-run-contract';
import { activationContract } from './postgres-activation-contract';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { createServer } from 'node:net';
import { promisify } from 'node:util';
import test from 'node:test';
import { DxtApplication } from '@/src/application/dxt-application';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { seedProductionSlice } from '@/src/infrastructure/postgres/slice-seed';

void test('native PostgreSQL 18 executes the Production Adapter slice through node-postgres', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dxt-native-postgres-'));
  const postgresBin = process.env.DXT_POSTGRES_BIN;
  if (!postgresBin) throw new Error('DXT_POSTGRES_BIN must point to a native PostgreSQL bin directory.');
  const run = promisify(execFile);
  const dataDir = join(directory, 'data');
  const socketDir = join(directory, 'socket');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(socketDir));
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const selected = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(selected));
    });
  });
  const initdb = join(postgresBin, 'initdb');
  const pgCtl = join(postgresBin, 'pg_ctl');
  await run(initdb, ['-D', dataDir, '-U', 'dxt_test', '--auth=trust', '--no-locale', '--encoding=UTF8']);
  const start = () => run(pgCtl, ['-D', dataDir, '-l', join(directory, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1 -k ${socketDir}`, 'start', '-w']);
  const stop = () => run(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast', '-w']);
  let running = false;
  let database: PgDatabase | undefined;
  try {
    await start(); running = true;
    const connectionString = `postgresql://dxt_test@127.0.0.1:${port}/postgres`;
    database = new PgDatabase({ connectionString, max: 2 });
    await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/001_production_adapter_slice_1.sql'), 'utf8'));
    await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/002_actual_execution.sql'), 'utf8'));
    await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/003_measurement.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/004_evaluation_decision.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/005_saved_analysis.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/006_configuration_study_authoring.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/007_run_plan_authoring.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/008_study_reasoning_adoption.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/009_authorization_study_run.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/010_authorization_scientific.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/011_authorization_configuration.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/012_authorization_saved_analysis.sql'), 'utf8'));
  await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/013_authorization_discovery.sql'), 'utf8'));
    await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/014_study_creation_grant.sql'), 'utf8'));
    await database.query(await readFile(join(process.cwd(), 'src/infrastructure/postgres/migrations/015_study_initial_reasoning.sql'), 'utf8'));
    await seedProductionSlice(database, configurationRepository);
    await provisionMeasurementReferences(database, definitions);
  await provisionReasoningContexts(database,lifecycleAuthoringProfiles);
    await activationContract(database);
    await productionRunContract(database);
    const configuration = await hydrateConfigurationPackages(database, ['config-package-photo-v1']);
    const application = new DxtApplication(createProductionSliceRepositories(database, configuration));
    const created = await application.createRunFromStudy('dts-improvement', 'STUDY_DEFAULT', 'native-postgres-create');
    const version = await database.query<{ server_version: string }>('SHOW server_version');
    assert.match(version.rows[0].server_version, /^18\./);
    assert.deepEqual(await application.repositories.run.getSnapshot(created.id), created);
    await runRepositoryContract(application.repositories.run, created, 'native-shared-contract');
    await authorizationContract(database);
    await scientificAuthorizationContract(database);
    const measurementProof=await productionMeasurementContract(database);
    const savedProof=await productionSavedAnalysisContract(database,measurementProof);
    const executionProof = await productionExecutionContract(database);
    const reasoningProof=await productionReasoningContract(database,measurementProof);
    const nextRunProof=await productionNextRunContract(database,reasoningProof);
    for(const p of reasoningProof)p.decision=await application.repositories.decision.getStateByRun(p.snapshot.id);
    await nativePlanEvidenceRace(database);
    const planProof=await productionPlanAuthoringContract(database);
    const authoringProof=await productionConfigurationStudyContract(database);
    const closureProof=await productionFreezeClosureContract(database,authoringProof);
    authoringProof.configuration=await new PostgresConfigurationAuthoring(database).load();
    await database.close();

    await stop(); running = false;
    await start(); running = true;
    database = new PgDatabase({ connectionString, max: 2 });
    const rehydrated = await hydrateConfigurationPackages(database, ['config-package-photo-v1']);
    const reconnected = new DxtApplication(createProductionSliceRepositories(database, rehydrated));
    assert.deepEqual(await reconnected.repositories.run.getSnapshot(created.id), created);
    for(const proof of closureProof){
      for(const run of [...proof.modes,proof.source,proof.next!])assert.deepEqual(await reconnected.repositories.run.getSnapshot(run.id),run);
      assert.deepEqual(await reconnected.savedAnalyses.get(proof.view.id),proof.view);
      assert.deepEqual(projectAnalysisRows(await reconnected.queryAnalysisSources(await reconnected.analysisSourceCatalog(),proof.selection),proof.selection),proof.rows);
      assert.deepEqual(await reconnected.reasoning.loadDecision(proof.source.id),proof.decision);
    }

    for(const p of planProof){assert.deepEqual(await reconnected.runs.loadPlanning(p.locked.snapshot.id),p.locked);assert.deepEqual(await reconnected.runs.loadPlanning(p.editable.snapshot.id),p.editable);}
    assert.deepEqual(await new PostgresConfigurationAuthoring(database).load(),authoringProof.configuration);
    for(const p of authoringProof.proofs){assert.deepEqual(await reconnected.studies.load(p.slug),p.setup);assert.deepEqual(await reconnected.repositories.run.getSnapshot(p.newRun.id),p.newRun);assert.deepEqual(await reconnected.repositories.run.getSnapshot(p.oldRun.id),p.oldRun);}
    for(const proof of savedProof){await reconnected.savedAnalyses.save(proof.view,`${proof.view.id}:update`,1);assert.deepEqual(await reconnected.savedAnalyses.get(proof.view.id),proof.view);assert.deepEqual(projectAnalysisRows(await reconnected.queryAnalysisSources(await reconnected.analysisSourceCatalog(),proof.selection),proof.selection),proof.rows);}
    for(const proof of nextRunProof){assert.deepEqual(await reconnected.repositories.run.getSnapshot(proof.created.id),proof.created);assert.deepEqual(await reconnected.repositories.run.createFromPreviousRun(proof.sourceId,proof.decisionId,{commandId:proof.commandId}),proof.created);}
    for(const proof of reasoningProof){
      assert.deepEqual(await reconnected.repositories.evaluation.getStateByRun(proof.snapshot.id),proof.evaluation);
      assert.deepEqual(await reconnected.repositories.decision.getStateByRun(proof.snapshot.id),proof.decision);
      await reconnected.repositories.evaluation.saveByRun(proof.snapshot.id,proof.retry.evaluations,proof.retry.cmd);
      await reconnected.repositories.decision.saveByRun(proof.snapshot.id,proof.retry.decision,proof.retry.dc);
      const restored=await reconnected.loadLifecycle(proof.snapshot,proof.profile);
      assert.deepEqual(restored.engineerEvaluations,proof.evaluation.record);
      assert.deepEqual(restored.decisionContext,proof.decision.record?.context);
    }
    for(const proof of measurementProof){
      assert.deepEqual(await reconnected.measurements.load(proof.snapshot.id),proof.state);
      assert.deepEqual(await reconnected.repositories.measurement.saveByRun(proof.snapshot.id,proof.retry.input,proof.retry.command),proof.retry.saved);
      assert.deepEqual(projectAnalysisRows(await reconnected.queryAnalysisSources(await reconnected.analysisSourceCatalog(),proof.selection),proof.selection),proof.rows);
    }
    for (const proof of executionProof) {
      assert.deepEqual(await reconnected.repositories.run.getSnapshot(proof.snapshot.id), proof.snapshot);
      assert.deepEqual(await reconnected.executions.load(proof.snapshot.id), proof.execution);
      assert.deepEqual(await reconnected.repositories.execution.saveByRun(proof.snapshot.id, [proof.retry.record], proof.retry.command),
        { version: proof.retry.version, records: [proof.retry.record] }, 'command receipt survives database/application restart');
      assert.deepEqual(await reconnected.executions.load(proof.snapshot.id), proof.execution);
    }
    await configurationAuthorizationContract(database);
    await savedAnalysisAuthorizationContract(database,measurementProof);
    await dashboardAuthorizationContract(database,measurementProof);
    await studyCreationContract(database);
    await studyBootstrapContract(database);
    await database.close();
  } finally {
    await database?.close().catch(() => undefined);
    if (running) await stop().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
