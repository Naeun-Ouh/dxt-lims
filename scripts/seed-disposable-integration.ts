/** AGENT TEST ONLY: never a production seed or scientific default. */
import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { PgDatabase } from '../src/infrastructure/postgres/pg-database';
import { seedConfigurationRegistry } from '../src/infrastructure/postgres/slice-seed';
import { provisionConfigurationCatalog } from '../src/infrastructure/postgres/postgres-configuration-authoring';
import { provisionMeasurementReferences } from '../src/infrastructure/postgres/measurement-references';
import { configurationRepository } from '../src/mock/configuration-packages';
import { definitions } from '../src/mock/reference';
import { authorizedOperation } from '../src/infrastructure/postgres/authorized-application';
import { dispatchRepository } from '../app/api/repository/route';
import type {
  StudyCreationOptions,
  StudyIdentity,
} from '../src/application/study-creation';
import type {
  AuthoritativeRunPreview,
  RunCreationRequest,
} from '../src/application/run-creation';
import type { RunPlanningSnapshot } from '../src/features/run-registration/planning-model';

if (
  process.env.DXT_DISPOSABLE_INTEGRATION !== 'NEW_EMPTY_DATABASE_ONLY' ||
  process.env.DXT_SCHEMA_STAGE !== 'disposable-development'
)
  throw new Error('Disposable harness marker required');
const db = PgDatabase.fromEnvironment();
const writer = 'agent-integration-writer',
  viewer = 'agent-integration-viewer',
  denied = 'agent-integration-denied';
try {
  if (
    (
      await db.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1",
      )
    ).rowCount
  )
    throw new Error(
      'Refusing nonempty database; existing environments must be preserved',
    );
  const migrations = (await readdir('src/infrastructure/postgres/migrations'))
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();
  await db.query('CREATE TABLE dxt_schema_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const file of migrations) {
    const bytes = await readFile('src/infrastructure/postgres/migrations/' + file);
    const checksum = createHash('sha256').update(bytes).digest('hex');
    await db.transaction(async sql => {
      await sql.query(bytes.toString('utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
      await sql.query('INSERT INTO dxt_schema_migration(name,checksum) VALUES($1,$2)', [file.replace(/\.sql$/, ''),checksum]);
    });
  }
  await seedConfigurationRegistry(
    db,
    configurationRepository.getConfigurationRegistry(),
  );
  await provisionConfigurationCatalog(db, definitions);
  await provisionMeasurementReferences(db, definitions);
  await db.query(
    "INSERT INTO auth_org_unit VALUES('agent-integration-dept','DEPARTMENT',NULL),('agent-integration-area','AREA',NULL)",
  );
  for (const principal of [writer, viewer]) {
    await db.query(
      "INSERT INTO auth_principal VALUES($1,$2,true,'GENERAL_USER')",
      [principal, 'AGENT TEST ONLY ' + principal],
    );
    await db.query(
      "INSERT INTO auth_membership VALUES($1,'agent-integration-dept',false)",
      [principal],
    );
    for (const scope of ['semiconductor-rd', 'material-rd']) {
      await db.query(
        "INSERT INTO configuration_access_scope VALUES('AREA',$1,'agent-integration-area',NULL) ON CONFLICT DO NOTHING",
        [scope],
      );
      await db.query(
        "INSERT INTO configuration_access_grant(id,scope_kind,scope_owner_id,principal_id,action,granted_by) VALUES($1,'AREA',$2,$3,'VIEW_CONFIGURATION',$4)",
        [randomUUID(), scope, principal, writer],
      );
    }
  }
  await db.query("INSERT INTO auth_principal VALUES($1,$2,true,'GENERAL_USER')", [denied,'AGENT TEST ONLY denied principal']);
  // The denied principal intentionally has no membership or visibility/authoring grants.
  // Sample authoring capabilities are independent of Study/Run capabilities.
  for (const principal of [writer, viewer]) {
    const actions = principal === writer ? ['READ_SAMPLE', 'REGISTER_SAMPLE', 'REVISE_SAMPLE'] : ['READ_SAMPLE'];
    for (const action of actions) await db.query(
      'INSERT INTO dxt_sample.access_grant(id,owning_org_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), 'agent-integration-dept', principal, action, writer],
    );
  }
  await db.query(
    "INSERT INTO study_creation_grant(id,principal_id,department_id,granted_by) VALUES($1,$2,'agent-integration-dept',$2)",
    [randomUUID(), writer],
  );
  const call = (body: Record<string, unknown>) =>
    authorizedOperation(db, writer, body, dispatchRepository);
  const options = (await call({
    operation: 'study.creation.options',
  })) as StudyCreationOptions;
  const routes = [];
  for (const [domain, pkg] of [
    ['specimen', 'config-package-material-rd-v1'],
    ['wafer', 'config-package-photo-v2'],
  ] as const) {
    const context = options.contexts.find((c) => c.packageVersionId === pkg);
    if (!context)
      throw new Error('Exact eligible test context unavailable: ' + pkg);
    const slug = 'agent-integration-' + domain;
    const study = (await call({
      operation: 'study.create',
      commandId: randomUUID(),
      input: {
        slug,
        name: 'AGENT TEST ONLY ' + domain + ' integration',
        intent: 'Disposable automated regression; not Human acceptance',
        departmentId: 'agent-integration-dept',
        packageVersionId: pkg,
        experimentTypeProfileVersionId: context.experimentTypeProfileVersionId,
        subjectTypeRevisionId: context.subjectTypeRevisionId,
        areaDefinitionRevisionId: context.areaDefinitionRevisionId,
      },
    })) as StudyIdentity;
    const read = [
      'VIEW_STUDY',
      'VIEW_RUN',
      'VIEW_EXECUTION',
      'VIEW_MEASUREMENT',
      'VIEW_EVALUATION',
      'VIEW_DECISION',
    ];
    for (const principal of [writer, viewer])
      for (const action of [
        ...read,
        ...(principal === writer
          ? [
              'CREATE_RUN',
              'EDIT_RUN_PLAN',
              'RECORD_ACTUAL',
              'RECORD_MEASUREMENT',
              'AUTHOR_EVALUATION',
              'AUTHOR_DECISION',
              'MANAGE_REASONING_CONTEXT',
            ]
          : []),
      ])
        await db.query(
          'INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$5)',
          [randomUUID(), study.id, principal, action, writer],
        );
    for (const withMeasurement of [false, true]) {
      const source = { seriesSlug: slug, source: 'BLANK' as const };
      const blank = (await call({
        operation: 'run.preview',
        input: { ...source, includeDraftOptions: true },
      })) as AuthoritativeRunPreview;
      const process = blank.options!.find(
        (o) => o.operation.role === 'PROCESS' && o.operation.items.length,
      );
      if (!process) throw new Error('No configured process fixture');
      const ids =
        domain === 'wafer'
          ? ['AGENT-W01', 'AGENT-W02']
          : ['AGENT-SP01', 'AGENT-SP02'];
      const request: RunCreationRequest = {
        ...source,
        sourceFingerprint: blank.sourceFingerprint,
        draft: {
          subjects: ids.map((id) => ({ id, displayLabel: id })),
          operations: [
            {
              optionId: process.id,
              subjectIds: [ids[0]],
              point: null,
              parameterIds: [],
              items: process.operation.items.map((d) => ({
                applicabilityId: d.applicabilityId,
                value: d.value,
                subjectId: null,
                intentRole: 'FIXED',
              })),
            },
          ],
        },
      };
      if (withMeasurement) {
        const measurement = blank.options!.find(
          (o) => o.operation.role === 'MEASUREMENT',
        );
        if (!measurement) throw new Error('No exact Measurement fixture');
        const parameter = blank.catalog!.parameters.find(
          (p) =>
            measurement.parameterIds.includes(p.id) &&
            p.semanticRole === 'MEASUREMENT' &&
            p.dataType === 'NUMBER',
        );
        if (!parameter)
          throw new Error('No numeric configured Measurement fixture');
        request.draft!.operations.push({
          optionId: measurement.id,
          subjectIds: [ids[0]],
          point: parameter.supportedMeasurementPoints[0],
          parameterIds: [
            parameter.id,
            ...parameter.requiredSupportingParameterIds,
          ],
          items: [],
        });
      }
      const preview = (await call({
        operation: 'run.preview',
        input: request,
      })) as AuthoritativeRunPreview;
      if (preview.readiness.status !== 'READY')
        throw new Error(
          'Fixture draft not READY: ' + JSON.stringify(preview.readiness),
        );
      const run = (await call({
        operation: 'run.create.preview',
        input: request,
        fingerprint: preview.fingerprint,
        command: { commandId: randomUUID() },
      })) as RunPlanningSnapshot;
      routes.push({
        domain,
        scenario: withMeasurement ? 'configured-measurement' : 'process-only',
        study: slug,
        run: run.runNumber,
        path: `/series/${slug}/runs/${run.runNumber}/engineering-grid?view=plan`,
      });
    }
  }
  const manifest = {
    label: 'AGENT TEST ONLY — HUMAN ACCEPTANCE NOT RUN',
    migrations,
    writer,
    viewer,
    denied,
    routes,
  };
  await writeFile(
    process.env.DXT_DISPOSABLE_MANIFEST!,
    JSON.stringify(manifest, null, 2),
  );
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await db.close();
}
