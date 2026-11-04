import { createHash, randomUUID } from 'node:crypto';
import { ApplicationError } from '@/src/application/repository-ports';
import {
  bootstrapSetupSchema,
  initialReasoningSchema,
  type BootstrapOperationOption,
} from '@/src/application/study-bootstrap';
import { reasoningPrerequisites } from '@/src/application/study-readiness';
import {
  referenceCatalogSchema,
  type ReferenceCatalog,
} from '@/src/domain/reference';
import {
  resolvedStudySetupItems,
  validateStudySetupItem,
  type StudySetupSnapshot,
} from '@/src/features/experiment-series/study-setup-model';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import type { SqlSession } from './sql-database';
import { readSetup } from './postgres-repositories';
import { hydrateConfigurationPackages } from './configuration-hydrator';
import { readConfigurationAuthoring } from './postgres-configuration-authoring';
import { readMeasurementCatalog } from './measurement-references';
import { writeStudySetupVersion } from './study-setup-storage';
import { studyReadiness } from './reasoning-context';

function fail(message: string): never {
  throw new ApplicationError('VALIDATION', message);
}
const canonical = (x: unknown): unknown =>
  Array.isArray(x)
    ? x.map(canonical)
    : x && typeof x === 'object'
      ? Object.fromEntries(
          Object.entries(x)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : x;
const hash = (x: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(x)))
    .digest('hex');

/** Called only inside the authorized transaction; never provisions configuration or grants. */
export async function bootstrapContext(
  sql: SqlSession,
  slug: string,
  principalId: string,
) {
  const root = (
    await sql.query<{ study_id: string }>(
      `SELECT study_id FROM study s WHERE series_slug=$1
    AND EXISTS(SELECT 1 FROM study_setup_command_receipt r WHERE r.study_id=s.study_id AND r.command_id LIKE 'study-create:%')`,
      [slug],
    )
  ).rows[0];
  if (!root)
    throw new ApplicationError('NOT_FOUND', 'Study bootstrap is unavailable.');
  const setup = await readSetup(sql, slug as SeriesSlug);
  if (!setup) fail('Study Setup is unavailable.');
  const visible = await sql.query(
    `SELECT 1 FROM configuration_package_version WHERE package_version_id=$1
    AND dxt_configuration_allowed($2,scope_kind,COALESCE(scope_owner_id,''),'VIEW_CONFIGURATION')`,
    [setup.configurationPackageVersionId, principalId],
  );
  if (!visible.rowCount)
    throw new ApplicationError(
      'FORBIDDEN',
      'Exact configuration is unavailable.',
    );
  const configuration = await hydrateConfigurationPackages(sql, [
    setup.configurationPackageVersionId,
  ]);
  const registry = configuration.getConfigurationRegistry(),
    pkg = registry.packages[0];
  const source = await readConfigurationAuthoring(sql, {
    principalId,
    packageIds: [pkg.id],
  });
  const measurement = await readMeasurementCatalog(sql, pkg.id);
  const ids = new Set(pkg.definitionRevisionIds);
  const catalog = referenceCatalogSchema.parse(
    Object.fromEntries(
      Object.entries(source.catalog).map(([kind, items]) => [
        kind,
        items.filter((item) =>
          kind === 'nextActionTypes'
            ? pkg.nextActionTypeRevisionIds.includes(item.id)
            : ids.has(item.id),
        ),
      ]),
    ),
  );
  // Measurement references are already resolved and immutable for this exact package.
  for (const kind of [
    'parameters',
    'units',
    'measurementOperations',
    'coordinateDefinitions',
    'coordinateSets',
  ] as const)
    Object.assign(catalog, { [kind]: measurement[kind] });
  const profile = registry.experimentTypeProfiles.find(
    (p) => p.id === setup.experimentTypeProfileVersionId,
  );
  const subject = registry.subjectTypes.find(
    (p) => p.id === setup.subjectTypeRevisionId,
  );
  if (
    !profile ||
    !subject ||
    !profile.subjectTypeRevisionIds.includes(subject.id) ||
    !['WAFER', 'SPECIMEN'].includes(subject.code)
  )
    fail('Exact Study profile is incompatible.');
  const eligible = new Set(
    registry.departmentAreaProfiles
      .filter(
        (p) =>
          profile.departmentAreaProfileVersionIds.includes(p.id) &&
          p.subjectTypeRevisionIds.includes(subject.id),
      )
      .flatMap((p) => p.operationDefinitionRevisionIds),
  );
  const options: BootstrapOperationOption[] = [];
  for (const definition of [
    ...catalog.operations,
    ...catalog.measurementOperations,
  ].filter((d) => eligible.has(d.id) && ids.has(d.id))) {
    const capabilities = registry.equipmentCapabilityProfiles.filter(
      (c) =>
        pkg.equipmentCapabilityProfileVersionIds.includes(c.id) &&
        c.operationDefinitionRevisionIds.includes(definition.id),
    );
    // No equipment is claimed where the package defines none. No fabricated equipment identity.
    const contexts = capabilities.length
      ? capabilities.flatMap((c) =>
          (c.moduleReferenceIds.length ? c.moduleReferenceIds : [null]).map(
            (module) => ({ equipment: c.equipmentReferenceId, module }),
          ),
        )
      : [{ equipment: '', module: null }];
    for (const context of contexts) {
      const id = `option-${hash([definition.id, context]).slice(0, 20)}`;
      const operation: BootstrapOperationOption['operation'] = {
        id,
        label: definition.name,
        operationDefinitionRevisionId: definition.id,
        role: definition.operationRole,
        measurementPoint: null,
        items: [],
        measurements: [],
        context: {
          areaDefinitionRevisionId: definition.areaDefinitionId,
          areaLabel:
            source.catalog.areas.find(
              (a) => a.id === definition.areaDefinitionId,
            )?.name ?? definition.areaDefinitionId,
          equipmentReferenceId: context.equipment,
          equipmentLabel: context.equipment,
          moduleReferenceId: context.module,
          moduleLabel: context.module ?? '',
        },
      };
      operation.items = resolvedStudySetupItems(
        { ...setup, operations: [operation] },
        id,
        configuration,
      );
      options.push({
        id,
        operation,
        parameterIds:
          definition.operationRole === 'MEASUREMENT'
            ? catalog.parameters
                .filter(
                  (p) => p.measurementOperationDefinitionId === definition.id,
                )
                .map((p) => p.id)
            : [],
      });
    }
  }
  const counts = (
    await sql.query<{ closed: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM experiment_run WHERE study_id=$1) OR EXISTS(SELECT 1 FROM reasoning_context WHERE study_id=$1) AS closed`,
      [root.study_id],
    )
  ).rows[0];
  return {
    studyId: root.study_id,
    setup,
    configuration,
    catalog,
    options,
    subjectKind: subject.code as 'WAFER' | 'SPECIMEN',
    closed: counts.closed,
  };
}

export async function readBootstrap(
  sql: SqlSession,
  slug: string,
  principalId: string,
) {
  const c = await bootstrapContext(sql, slug, principalId);
  const subjects = (
    await sql.query<{ id: string; displayLabel: string }>(
      'SELECT subject_domain_id id,display_label "displayLabel" FROM study_subject_default WHERE study_id=$1 ORDER BY ordinal',
      [c.studyId],
    )
  ).rows;
  const structuralMissing = [
    ...(!subjects.length ? ['Subjects'] : []),
    ...(!c.setup.operations.length ? ['Operations'] : []),
    ...(!c.setup.operations.some((o) => o.measurements.length)
      ? ['Measurement plan']
      : []),
  ];
  const runNumbers = (
    await sql.query<{ run_number: number }>(
      'SELECT run_number FROM experiment_run WHERE study_id=$1 ORDER BY run_number',
      [c.studyId],
    )
  ).rows.map((r) => r.run_number);
  return {
    runNumbers,
    setup: c.setup,
    subjects,
    options: c.options,
    catalog: c.catalog,
    closed: c.closed,
    structuralMissing,
    readiness: await studyReadiness(
      sql,
      slug,
      c.setup.configurationPackageVersionId,
    ),
  };
}

export async function saveBootstrap(
  sql: SqlSession,
  slug: string,
  principalId: string,
  raw: unknown,
  commandId: string,
) {
  const parsed = bootstrapSetupSchema.safeParse(raw);
  if (!parsed.success) fail('Check required Setup and Target fields.');
  const input = parsed.data;
  if (!commandId) fail('Command identity is required.');
  await sql.query(
    'SELECT study_id FROM study WHERE series_slug=$1 FOR UPDATE',
    [slug],
  );
  const c = await bootstrapContext(sql, slug, principalId),
    requestHash = hash(input);
  const receipt = (
    await sql.query<{ request_hash: string }>(
      'SELECT request_hash FROM study_setup_command_receipt WHERE study_id=$1 AND command_id=$2',
      [c.studyId, commandId],
    )
  ).rows[0];
  if (receipt) {
    if (receipt.request_hash !== requestHash)
      throw new ApplicationError('CONFLICT', 'Setup request changed.');
    return readBootstrap(sql, slug, principalId);
  }
  if (c.closed)
    throw new ApplicationError(
      'CONFLICT',
      'Initial Setup is locked after reasoning confirmation or Run creation.',
    );
  if (input.expectedRevision !== c.setup.revision)
    throw new ApplicationError(
      'CONFLICT',
      'Study Setup changed. Reload before saving.',
    );
  if (new Set(input.subjects.map((s) => s.id)).size !== input.subjects.length)
    fail('Duplicate Subject identity.');
  const operations = input.operations.map((selected, index) => {
    const option = c.options.find((o) => o.id === selected.optionId);
    if (!option)
      return fail('Operation is not eligible for this exact configuration.');
    const operation = structuredClone(option.operation),
      id = `${c.setup.seriesId}-operation-${index + 1}`;
    operation.id = id;
    if (
      new Set(selected.items.map((i) => i.applicabilityId)).size !==
      selected.items.length
    )
      fail('Duplicate assignment.');
    operation.items = selected.items.map((item) => {
      const definition = option.operation.items.find(
        (i) => i.applicabilityId === item.applicabilityId,
      );
      if (!definition) return fail('Assignment is not applicable.');
      validateStudySetupItem(definition, item.value);
      return {
        ...definition,
        id: `${id}:${item.applicabilityId}`,
        operationId: id,
        value: item.value,
        intentRole: item.intentRole,
      };
    });
    if (operation.role === 'MEASUREMENT') {
      if (
        !selected.point ||
        !selected.parameterIds.length ||
        new Set(selected.parameterIds).size !== selected.parameterIds.length
      )
        fail('Measurement point and parameters are required.');
      for (const id of selected.parameterIds) {
        const p = c.catalog.parameters.find((p) => p.id === id);
        if (
          !p ||
          !option.parameterIds.includes(id) ||
          !p.supportedMeasurementPoints.includes(selected.point!) ||
          p.requiredSupportingParameterIds.some(
            (r) => !selected.parameterIds.includes(r),
          )
        )
          fail('Measurement parameter or point is incompatible.');
      }
      operation.measurementPoint = selected.point;
      operation.measurements = [
        {
          id: `${id}-measurement`,
          stepId: id,
          measurementOperationDefinitionId:
            operation.operationDefinitionRevisionId,
          operation: operation.label,
          parameterDefinitionIds: selected.parameterIds,
          parameters: selected.parameterIds.map(
            (id) => c.catalog.parameters.find((p) => p.id === id)!.name,
          ),
          point: selected.point!,
        },
      ];
    } else if (selected.point || selected.parameterIds.length)
      fail('Process Operation cannot claim a Measurement plan.');
    return operation;
  });
  const setup: StudySetupSnapshot = {
    ...c.setup,
    revision: c.setup.revision + 1,
    updatedAt: new Date().toISOString(),
    operations,
  };
  const setupId = await writeStudySetupVersion(sql, c.studyId, setup);
  await sql.query('DELETE FROM study_subject_default WHERE study_id=$1', [
    c.studyId,
  ]);
  for (const [index, s] of input.subjects.entries())
    await sql.query(
      'INSERT INTO study_subject_default(study_id,ordinal,subject_domain_id,subject_kind,display_label) VALUES($1,$2,$3,$4,$5)',
      [c.studyId, index + 1, s.id, c.subjectKind, s.displayLabel],
    );
  await sql.query(
    'INSERT INTO study_setup_command_receipt VALUES($1,$2,$3,$4)',
    [c.studyId, commandId, requestHash, setupId],
  );
  return readBootstrap(sql, slug, principalId);
}

export async function initializeReasoning(
  sql: SqlSession,
  slug: string,
  principalId: string,
  raw: unknown,
  commandId: string,
) {
  const parsed = initialReasoningSchema.safeParse(raw);
  if (!parsed.success) fail('Check required Setup and Target fields.');
  const input = parsed.data;
  if (!commandId) fail('Command identity is required.');
  await sql.query(
    'SELECT study_id FROM study WHERE series_slug=$1 FOR UPDATE',
    [slug],
  );
  const c = await bootstrapContext(sql, slug, principalId),
    requestHash = hash(input);
  const receipt = (
    await sql.query<{
      request_hash: string;
      context_id: string;
      principal_id: string;
    }>(
      'SELECT * FROM study_initial_reasoning_receipt WHERE study_id=$1 AND command_id=$2',
      [c.studyId, commandId],
    )
  ).rows[0];
  if (receipt) {
    if (
      receipt.request_hash !== requestHash ||
      receipt.principal_id !== principalId
    )
      throw new ApplicationError(
        'CONFLICT',
        'Initial context request changed.',
      );
    return (
      await sql.query('SELECT id,payload FROM reasoning_context WHERE id=$1', [
        receipt.context_id,
      ])
    ).rows[0];
  }
  if (c.closed)
    throw new ApplicationError(
      'CONFLICT',
      'Initial reasoning context already exists or the Study has Runs.',
    );
  if (input.packageVersionId !== c.setup.configurationPackageVersionId)
    fail('Exact Study package is required.');
  const state = await readBootstrap(sql, slug, principalId);
  if (state.structuralMissing.length)
    fail('Complete structural Setup before confirming Target context.');
  const catalog: ReferenceCatalog = {
    ...c.catalog,
    evaluations: c.catalog.evaluations.filter((e) =>
      input.evaluationIds.includes(e.id),
    ),
    nextActionTypes: c.catalog.nextActionTypes.filter(
      (e) => input.nextActionIds.includes(e.id) && e.active,
    ),
  };
  if (
    new Set(input.evaluationIds).size !== input.evaluationIds.length ||
    catalog.evaluations.length !== input.evaluationIds.length ||
    new Set(input.nextActionIds).size !== input.nextActionIds.length ||
    catalog.nextActionTypes.length !== input.nextActionIds.length
  )
    fail('Exact Evaluation and active Next Action references are required.');
  for (const e of catalog.evaluations)
    if (
      e.criterionDefinitionIds.some(
        (id) => !catalog.evaluationCriteria.some((c) => c.id === id),
      )
    )
      fail('Exact Evaluation criteria are unavailable.');
  for (const b of input.targetBindings)
    if (
      !c.setup.operations
        .flatMap((o) => o.measurements)
        .some(
          (m) =>
            m.point === b.measurementPoint &&
            m.parameterDefinitionIds.includes(b.target.parameterDefinitionId),
        )
    )
      fail('Target must reference the saved Measurement plan.');
  const payload = { targetBindings: input.targetBindings, catalog };
  const missing = reasoningPrerequisites(payload, c.catalog);
  if (missing.length) fail(missing.join('; '));
  const id = randomUUID();
  await sql.query(
    'INSERT INTO reasoning_context(id,study_id,package_version_id,payload) VALUES($1,$2,$3,$4::jsonb)',
    [id, c.studyId, input.packageVersionId, JSON.stringify(payload)],
  );
  await sql.query(
    'INSERT INTO study_initial_reasoning_receipt(study_id,command_id,context_id,request_hash,principal_id) VALUES($1,$2,$3,$4,$5)',
    [c.studyId, commandId, id, requestHash, principalId],
  );
  return (
    await sql.query('SELECT id,payload FROM reasoning_context WHERE id=$1', [
      id,
    ])
  ).rows[0];
}
