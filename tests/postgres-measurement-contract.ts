import assert from 'node:assert/strict';
import { DxtApplication } from '@/src/application/dxt-application';
import {
  ApplicationError,
  type MeasurementRepository,
} from '@/src/application/repository-ports';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { createInMemoryRepositories } from '@/src/infrastructure/memory/in-memory-repositories';
import { createBrowserRepositories } from '@/src/infrastructure/browser/browser-repositories';
import { PostgresMeasurementRepository } from '@/src/infrastructure/postgres/postgres-measurement-repository';
import type {
  SqlDatabase,
  SqlSession,
  SqlRow,
} from '@/src/infrastructure/postgres/sql-database';
import type { SubjectMeasurementResultSet } from '@/src/domain/measurement/subject-measurement';
import { projectAnalysisRows } from '@/src/domain/analysis';

export async function measurementRepositoryContract(
  repo: MeasurementRepository,
  runId: string,
  input: SubjectMeasurementResultSet,
) {
  const initial = await repo.getStateByRun(runId);
  const command = {
    commandId: `${runId}:contract`,
    expectedVersion: initial.version,
  };
  const saved = await repo.saveByRun(runId, input, command);
  assert.deepEqual(await repo.saveByRun(runId, input, command), saved);
  assert.deepEqual(
    (await repo.query({ datasetIds: [input.datasets[0].id] })).values,
    input.values,
  );
  const excluded = structuredClone(saved.record);
  excluded.validityDecisions.push({
    id: `${runId}:excluded`,
    measurementValueId: input.values[0].id,
    state: 'EXCLUDED',
    actor: 'Engineer',
    reason: 'Specimen handling anomaly',
    decidedAt: '2026-09-16T03:00:00.000Z',
  });
  const next = await repo.saveByRun(runId, excluded, {
    commandId: `${runId}:exclude`,
    expectedVersion: saved.version,
  });
  assert.equal(
    (await repo.query({ runIds: [runId], validity: 'EXCLUDED' })).values.length,
    1,
  );
  assert.equal(
    (await repo.query({ runIds: [runId], validity: 'INCLUDED' })).values.length,
    0,
  );
  await assert.rejects(
    repo.saveByRun(runId, excluded, {
      commandId: `${runId}:stale`,
      expectedVersion: saved.version,
    }),
    (e) => e instanceof ApplicationError && e.code === 'CONFLICT',
  );
  assert.deepEqual(
    await repo.saveByRun(runId, input, command),
    saved,
    'receipt restores original result, not latest validity',
  );
  const restored = structuredClone(next.record);
  restored.validityDecisions.push({
    id: `${runId}:restored`,
    measurementValueId: input.values[0].id,
    state: 'INCLUDED',
    actor: 'Engineer',
    reason: 'Handling checked',
    decidedAt: '2026-09-16T04:00:00.000Z',
  });
  const latest = await repo.saveByRun(runId, restored, {
    commandId: `${runId}:restore`,
    expectedVersion: next.version,
  });
  assert.equal(
    (await repo.query({ runIds: [runId], validity: 'INCLUDED' })).values.length,
    1,
  );
  assert.equal(latest.record.validityDecisions.length, 2);
  const changed = structuredClone(latest.record);
  changed.values[0].value = { dataType: 'NUMBER', value: 999 };
  await assert.rejects(
    repo.saveByRun(runId, changed, {
      commandId: `${runId}:overwrite`,
      expectedVersion: latest.version,
    }),
    (e) => e instanceof ApplicationError && e.code === 'CONFLICT',
  );
  assert.deepEqual((await repo.getByRun(runId))?.values, input.values);
  return { saved, command, input };
}

export async function productionMeasurementContract(database: SqlDatabase) {
  const configuration = await hydrateConfigurationPackages(database, [
    'config-package-photo-v1',
    'config-package-material-rd-v1',
  ]);
  const app = new DxtApplication(
    createProductionSliceRepositories(database, configuration),
  );
  const proofs = [];
  for (const [slug, parameterId, grain, value] of [
    ['dts-improvement', 'parameter-bcd-v1', 'SITE', '17'],
    [
      'adhesion-material-optimization',
      'parameter-peel-force-v1',
      'SUBJECT',
      '5.8',
    ],
  ] as const) {
    const snapshot = await app.createRunFromStudy(
      slug,
      'STUDY_DEFAULT',
      `measurement-run-${slug}`,
    );
    const model = createExperimentWorkspace(snapshot, configuration),
      profile = lifecycleAuthoringProfiles[slug];
    const empty = await app.loadLifecycle(snapshot, profile, 'ACTUAL');
    const actual = await app.recordActual(empty, model, {
      id: `measurement-actual-${slug}`,
      operationId: model.operations.find((o) => o.role === 'PROCESS')!.id,
      subjectId: model.subjects[0].id,
      status: 'COMPLETED',
      startedAt: '2026-09-16T01:00:00.000Z',
      endedAt: '2026-09-16T01:30:00.000Z',
      actualOverrides: {},
    });
    const catalog = await app.repositories.measurement.getCatalog(
      snapshot.configurationPackageVersionId,
    );
    const operation = model.operations.find((o) => o.role === 'MEASUREMENT')!;
    const coordinates =
      grain === 'SITE'
        ? catalog.coordinateSets
            .find((s) =>
              s.measurementOperationDefinitionIds.includes(
                operation.operationDefinitionRevisionId,
              ),
            )!
            .coordinateDefinitionIds.map((id, i) => ({
              coordinateDefinitionId: id,
              value: i,
            }))
        : [];
    const command = {
      id: `manual-measurement-${slug}`,
      operationId: operation.id,
      subjectId: model.subjects[0].id,
      parameterDefinitionId: parameterId,
      measurementPoint: snapshot.measurements[0].point,
      value,
      grain,
      siteIdentity: grain === 'SITE' ? 'S01' : undefined,
      coordinateValues: coordinates,
      recordedAt: '2026-09-16T02:00:00.000Z',
    };
    const measured = await app.recordMeasurement(
      actual,
      model,
      catalog,
      command,
    );
    const result = measured.measurementResults;
    assert.equal(
      result.values[0].siteIdentity,
      grain === 'SITE' ? 'S01' : null,
    );
    assert.equal(result.values[0].value.value, Number(value));
    assert.equal(
      result.datasets[0].executionEventId,
      actual.actualEvidence[0].event.id,
    );
    assert.equal(
      result.values[0].unitDefinitionId,
      catalog.parameters.find((p) => p.id === parameterId)!.unitId,
    );
    assert.equal(result.values[0].acquisitionMethod, 'MANUAL');
    assert.equal(result.datasets[0].datasetOrigin, 'SOURCE');
    assert.deepEqual(
      await app.repositories.run.getSnapshot(snapshot.id),
      snapshot,
    );
    assert.deepEqual(
      (await app.recordMeasurement(actual, model, catalog, command))
        .measurementResults,
      result,
    );
    for (const query of [
      { runIds: [snapshot.id] },
      { datasetIds: [result.datasets[0].id] },
      { parameterDefinitionIds: [parameterId], runIds: [snapshot.id] },
      {
        subjectIds: [model.subjects[0].id],
        datasetIds: [result.datasets[0].id],
      },
      { validity: 'INCLUDED' as const, runIds: [snapshot.id] },
      ...(grain === 'SITE'
        ? [
            { siteIdentities: ['S01'], runIds: [snapshot.id] },
            {
              coordinateDefinitionIds: coordinates.map(
                (c) => c.coordinateDefinitionId,
              ),
              runIds: [snapshot.id],
            },
          ]
        : []),
    ]) {
      assert.deepEqual(
        (await app.measurements.query(query)).values,
        result.values,
      );
    }
    assert.equal(
      (await app.measurements.query({ datasetIds: ['absent'] })).values.length,
      0,
    );
    const retry = await measurementRepositoryContract(
      app.repositories.measurement,
      snapshot.id,
      result,
    );
    await measurementRepositoryContract(
      createInMemoryRepositories(configuration).measurement,
      snapshot.id,
      result,
    );
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window'),
      storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => storage.get(k) ?? null,
          setItem: (k: string, v: string) => storage.set(k, v),
        },
      },
    });
    try {
      await measurementRepositoryContract(
        createBrowserRepositories(configuration).measurement,
        snapshot.id,
        result,
      );
      assert.deepEqual(
        (
          await createBrowserRepositories(configuration).measurement.getByRun(
            snapshot.id,
          )
        )?.values,
        result.values,
      );
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous);
      else Reflect.deleteProperty(globalThis, 'window');
    }
    const sources = await app.analysisSourceCatalog();
    const selection = {
      studyId: slug,
      runIds: [snapshot.id],
      datasetIds: [result.datasets[0].id],
      parameterIds: [parameterId],
      subjectIds: [model.subjects[0].id],
      aggregation: 'RAW' as const,
      datasetOrigin: 'SOURCE' as const,
      includeExcluded: true,
    };
    const queried = await app.queryAnalysisSources(sources, selection);
    const rows = projectAnalysisRows(queried, selection);
    assert.equal(rows[0].value, Number(value));
    assert.equal(rows[0].datasetId, result.datasets[0].id);
    assert.equal(rows[0].measurementValueId, result.values[0].id);
    const latest = await app.measurements.load(snapshot.id);
    const badUnit = structuredClone(latest.record);
    badUnit.values[0].unitDefinitionId = 'unit-arbitrary';
    await assert.rejects(
      app.measurements.save(snapshot.id, badUnit, {
        commandId: 'bad-unit',
        expectedVersion: latest.version,
      }),
      /Unit/,
    );
    const invalidGrain = structuredClone(latest.record);
    invalidGrain.values[0].granularity = 'SUBJECT';
    invalidGrain.values[0].siteIdentity = 'DEFAULT_SITE';
    await assert.rejects(
      app.measurements.save(snapshot.id, invalidGrain, {
        commandId: 'fake-site',
        expectedVersion: latest.version,
      }),
      /fake Site/,
    );
    const derived = structuredClone(latest.record);
    const derivedDataset = {
      ...result.datasets[0],
      id: `derived-${slug}`,
      datasetOrigin: 'DERIVED' as const,
      preprocessingExecutionId: 'existing-preprocessing-reference',
    };
    derived.datasets.push(derivedDataset);
    derived.values.push({
      ...result.values[0],
      id: `derived-value-${slug}`,
      datasetId: derivedDataset.id,
      acquisitionMethod: 'DERIVED',
      value: { dataType: 'NUMBER', value: 0 },
      sourceMeasurementValueIds: [result.values[0].id],
    });
    const derivedStored = await app.measurements.save(snapshot.id, derived, {
      commandId: 'preserve-derived',
      expectedVersion: latest.version,
    });
    const readDerived = await app.measurements.query({
      datasetIds: [derivedDataset.id],
    });
    assert.equal(readDerived.datasets[0].datasetOrigin, 'DERIVED');
    assert.equal(
      readDerived.values[0].value.value,
      0,
      'zero is an observed value, not missing',
    );
    assert.deepEqual(readDerived.values[0].sourceMeasurementValueIds, [
      result.values[0].id,
    ]);
    assert.deepEqual(
      (await app.measurements.query({ datasetIds: [result.datasets[0].id] }))
        .values,
      result.values,
      'derived never overwrites raw',
    );
    proofs.push({ snapshot, state: derivedStored, selection, rows, retry });
  }
  const proof = proofs[0],
    repo = app.repositories.measurement;
  const failure = structuredClone(proof.state.record);
  const e = {
    ...failure.executions[0],
    id: 'rollback-measurement-execution',
    sequence: 2,
  };
  const d = {
    ...failure.datasets.find((d) => d.id === proof.selection.datasetIds[0])!,
    id: 'rollback-measurement-dataset',
    measurementExecutionId: e.id,
  };
  const v = {
    ...failure.values.find(
      (v) => v.datasetId === proof.selection.datasetIds[0],
    )!,
    id: 'rollback-measurement-value',
    datasetId: d.id,
    value: { dataType: 'NUMBER' as const, value: -999 },
  };
  failure.executions.push(e);
  failure.datasets.push(d);
  failure.values.push(v);
  const counts = async () =>
    (
      await database.query(
        `SELECT (SELECT count(*) FROM measurement_execution)::text AS executions,(SELECT count(*) FROM measurement_dataset)::text AS datasets,(SELECT count(*) FROM measurement_value)::text AS values,(SELECT count(*) FROM measurement_command_receipt)::text AS receipts`,
      )
    ).rows;
  const before = await counts();
  await database.query(
    `CREATE FUNCTION fail_measurement_value() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.number_value=-999 THEN RAISE EXCEPTION 'forced measurement failure'; END IF; RETURN NEW; END; $$`,
  );
  await database.query(
    'CREATE TRIGGER fail_measurement_value BEFORE INSERT ON measurement_value FOR EACH ROW EXECUTE FUNCTION fail_measurement_value()',
  );
  try {
    await assert.rejects(
      repo.saveByRun(proof.snapshot.id, failure, {
        commandId: 'failed-measurement',
        expectedVersion: proof.state.version,
      }),
      (e) => e instanceof ApplicationError && e.code === 'PERSISTENCE',
    );
    assert.deepEqual(await counts(), before);
    assert.deepEqual(await repo.getStateByRun(proof.snapshot.id), proof.state);
  } finally {
    await database.query(
      'DROP TRIGGER fail_measurement_value ON measurement_value',
    );
    await database.query('DROP FUNCTION fail_measurement_value()');
  }
  // One Dataset / 1200 Site observations. Count SQL round trips, not wall-clock SLA.
  const bulkRecord = structuredClone(proof.state.record);
  const be = { ...e, id: 'bulk-measurement-execution' },
    bd = {
      ...d,
      id: 'bulk-measurement-dataset',
      measurementExecutionId: be.id,
    };
  bulkRecord.executions.push(be);
  bulkRecord.datasets.push(bd);
  for (let i = 0; i < 1200; i++)
    bulkRecord.values.push({
      ...v,
      id: `bulk-value-${String(i).padStart(4, '0')}`,
      datasetId: bd.id,
      siteIdentity: `B${i}`,
      value: { dataType: 'NUMBER', value: i / 100 },
      coordinateValues: v.coordinateValues.map((c, j) => ({
        ...c,
        value: i + j,
      })),
    });
  let writes = 0,
    filteredRows = 0;
  const wrap = (session: SqlSession): SqlSession => ({
    async query<T extends SqlRow>(sql: string, parameters?: unknown[]) {
      if (sql.startsWith('INSERT')) writes++;
      const result = await session.query<T>(sql, parameters);
      if (sql.startsWith('SELECT v.*')) filteredRows += result.rows.length;
      return result;
    },
  });
  const counted: SqlDatabase = {
    ...wrap(database),
    transaction: (work) => database.transaction((s) => work(wrap(s))),
    close: async () => {},
  };
  const bounded = new PostgresMeasurementRepository(counted);
  await bounded.saveByRun(proof.snapshot.id, bulkRecord, {
    commandId: 'bulk-measurement',
    expectedVersion: proof.state.version,
  });
  assert.ok(
    writes < 40,
    `bounded batch inserts used ${writes} calls, not one per cell`,
  );
  filteredRows = 0;
  const result = await bounded.query({
    datasetIds: [bd.id],
    parameterDefinitionIds: [v.parameterDefinitionId!],
    siteIdentities: ['B999'],
    coordinateDefinitionIds: [v.coordinateValues[0].coordinateDefinitionId],
    limit: 10,
  });
  assert.equal(result.values.length, 1);
  assert.equal(result.values[0].value.value, 9.99);
  assert.equal(
    filteredRows,
    1,
    'PostgreSQL selects before application materialization',
  );
  await assert.rejects(
    bounded.query({ datasetIds: [bd.id], limit: 10 }),
    /exceeds/,
  );
  proof.state = await repo.getStateByRun(proof.snapshot.id);
  assert.deepEqual(
    await app.repositories.run.getSnapshot(proof.snapshot.id),
    proof.snapshot,
  );
  await assert.rejects(
    database.query('UPDATE measurement_value SET number_value=0'),
    /immutable/,
  );
  await assert.rejects(
    database.query("UPDATE measurement_reference SET payload='{}'::jsonb"),
    /immutable/,
  );
  return proofs;
}
