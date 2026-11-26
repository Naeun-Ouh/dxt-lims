import { randomUUID } from 'node:crypto';
import { ApplicationError } from '@/src/application/repository-ports';
import {
  recipeSourceCatalogCommandSchema,
  recipeSourceScopeKey,
  validateRecipeSourceBindings,
  type RecipeSourceBinding,
  type RecipeSourceDescriptor,
} from '@/src/application/recipe-source';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { SqlDatabase, SqlSession } from './sql-database';
import { resolvePrincipal, allowReasons } from './authorization';
import { planLockReason } from './plan-lock';
import { hydrateConfigurationPackages } from './configuration-hydrator';

type SourceSnapshot = RunPlanningSnapshot & {
  recipeSourceBindings?: RecipeSourceBinding[];
};
type SelectionRow = {
  binding_id: string;
  operation_domain_id: string;
  group_domain_id: string | null;
  subject_domain_id: string | null;
  recipe_revision_id: string;
  parameter_revision_id: string;
  selection_state: 'SELECTED' | 'CLEAR';
  sample_revision_id: string | null;
  version: number;
  package_version_id: string;
};
const unpack = (r: SelectionRow): RecipeSourceBinding => ({
  id: r.binding_id,
  operationId: r.operation_domain_id,
  groupId: r.group_domain_id,
  subjectId: r.subject_domain_id,
  recipeRevisionId: r.recipe_revision_id,
  parameterRevisionId: r.parameter_revision_id,
  state: r.selection_state,
  sampleRevisionId: r.sample_revision_id,
});
async function sourceTables(sql: SqlSession) {
  return (
    await sql.query<{ exists: boolean }>(
      "SELECT to_regclass('dxt_sample.recipe_source_selection') IS NOT NULL AS exists",
    )
  ).rows[0].exists;
}
async function sampleVisible(sql: SqlSession, pid: string, revisionId: string) {
  return (
    (
      await sql.query<{ ok: boolean }>(
        "SELECT dxt_sample.allowed($1,s.owning_org_id,s.id,'READ_SAMPLE') ok FROM dxt_sample.revision r JOIN dxt_sample.sample s ON s.id=r.sample_id WHERE r.id=$2",
        [pid, revisionId],
      )
    ).rows[0]?.ok === true
  );
}

export async function recipeSourceCatalog(
  database: SqlDatabase,
  pid: string,
  raw: unknown,
) {
  const input = recipeSourceCatalogCommandSchema.parse(raw);
  return database.transaction(async (sql) => {
    await sql.query(
      'LOCK TABLE auth_principal,auth_org_unit,auth_membership,configuration_access_scope,configuration_access_grant IN SHARE MODE',
    );
    await resolvePrincipal(sql, pid);
    const policy = (
      await sql.query<{ view: boolean; author: boolean }>(
        "SELECT dxt_configuration_allowed($1,scope_kind,COALESCE(scope_owner_id,''),'VIEW_CONFIGURATION') view,dxt_configuration_allowed($1,scope_kind,COALESCE(scope_owner_id,''),'AUTHOR_DEFINITION') author FROM configuration_package_version WHERE package_version_id=$2",
        [pid, input.packageVersionId],
      )
    ).rows[0];
    if (!policy?.view)
      throw new ApplicationError(
        'NOT_FOUND',
        'Experiment references are unavailable.',
      );
    if (input.operation === 'register') {
      if (!policy.author)
        throw new ApplicationError(
          'FORBIDDEN',
          'Reference authoring permission is required.',
        );
      const exact = (
        await sql.query<{ ok: boolean }>(
          `SELECT EXISTS(SELECT 1 FROM configuration_revision r JOIN configuration_package_member m ON m.member_kind=r.revision_kind AND m.member_revision_id=r.revision_id WHERE m.package_version_id=$1 AND r.revision_kind='definitionDescriptors' AND r.revision_id=$2 AND r.payload->>'editorKey'='REFERENCE') ok`,
          [input.packageVersionId, input.parameterRevisionId],
        )
      ).rows[0].ok;
      if (!exact)
        throw new ApplicationError(
          'VALIDATION',
          'Choose a pinned reference-type Source Parameter.',
        );
      const recipe = (
        await sql.query(
          "SELECT 1 FROM configuration_package_member WHERE package_version_id=$1 AND member_kind='externalReferences' AND member_revision_id=$2",
          [input.packageVersionId, input.recipeRevisionId],
        )
      ).rowCount;
      const registry = (
        await hydrateConfigurationPackages(sql, [input.packageVersionId])
      ).getConfigurationRegistry();
      const pack = registry.packages.find(
        (p) => p.id === input.packageVersionId,
      );
      const recipeRules = registry.applicabilityRuleSets
        .filter((set) => pack?.applicabilityRuleSetVersionIds.includes(set.id))
        .flatMap((set) => set.rules)
        .filter((rule) => rule.assignmentKind === 'RECIPE');
      const isRecipe = recipeRules.some(
        (rule) =>
          rule.assignmentReferenceRevisionId === input.recipeRevisionId ||
          rule.contextualOptions.some(
            (option) => option.referenceId === input.recipeRevisionId,
          ) ||
          registry.definitionDescriptors
            .find((d) => d.revisionId === rule.definitionRevisionId)
            ?.intrinsicOptions.some(
              (option) => option.referenceId === input.recipeRevisionId,
            ),
      );
      if (!recipe || !isRecipe)
        throw new ApplicationError(
          'VALIDATION',
          'Choose an exact Recipe revision from the experiment references.',
        );
      await sql.query(
        'INSERT INTO dxt_sample.recipe_source_descriptor(package_version_id,recipe_revision_id,parameter_revision_id,created_by) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [
          input.packageVersionId,
          input.recipeRevisionId,
          input.parameterRevisionId,
          pid,
        ],
      );
    }
    return (
      await sql.query<RecipeSourceDescriptor & Record<string, unknown>>(
        `SELECT d.package_version_id "packageVersionId",d.recipe_revision_id "recipeRevisionId",d.parameter_revision_id "parameterRevisionId",r.payload->>'label' label FROM dxt_sample.recipe_source_descriptor d JOIN configuration_revision r ON r.revision_kind='definitionDescriptors' AND r.revision_id=d.parameter_revision_id WHERE d.package_version_id=$1 AND ($2::text IS NULL OR d.recipe_revision_id=$2) ORDER BY r.payload->>'label',d.parameter_revision_id`,
        [input.packageVersionId, input.recipeRevisionId ?? null],
      )
    ).rows;
  });
}

export async function readRecipeSourceBindings(
  sql: SqlSession,
  runId: string,
): Promise<RecipeSourceBinding[]> {
  if (!(await sourceTables(sql))) return [];
  const pid = sql.trustedPrincipalId;
  if (!pid) return [];
  const rows = (
    await sql.query<SelectionRow>(
      'SELECT * FROM dxt_sample.recipe_source_selection WHERE run_id=$1 ORDER BY binding_id',
      [runId],
    )
  ).rows;
  if (!rows.length) return [];
  const access = (
    await sql.query<{ reason: string }>(
      "SELECT dxt_study_access_reason($1,study_id,'VIEW_RUN') reason FROM experiment_run WHERE run_id=$2",
      [pid, runId],
    )
  ).rows[0];
  if (!access || !allowReasons.includes(access.reason))
    throw new ApplicationError(
      'NOT_FOUND',
      'Run unavailable or access denied.',
    );
  const result: RecipeSourceBinding[] = [];
  for (const row of rows) {
    const binding = unpack(row);
    if (
      binding.sampleRevisionId &&
      !(await sampleVisible(sql, pid, binding.sampleRevisionId))
    ) {
      binding.sampleRevisionId = null;
      binding.sampleAccessDenied = true;
    }
    result.push(binding);
  }
  return result;
}

/** Explicit removals must precede Group/Operation deletion; the enclosing Plan transaction is atomic. */
export async function pruneRecipeSourceBindings(
  sql: SqlSession,
  runId: string,
  snapshot: SourceSnapshot,
  action: 'CREATE_RUN' | 'EDIT_RUN_PLAN',
) {
  if (!(await sourceTables(sql))) return;
  const current = (
    await sql.query<SelectionRow>(
      'SELECT * FROM dxt_sample.recipe_source_selection WHERE run_id=$1 FOR UPDATE',
      [runId],
    )
  ).rows;
  if (!current.length) return;
  if (snapshot.recipeSourceBindings === undefined)
    throw new ApplicationError(
      'CONFLICT',
      'Source selections changed. Reload the Plan before saving.',
    );
  validateRecipeSourceBindings(snapshot.recipeSourceBindings);
  const removed = current.filter(
    (old) =>
      !snapshot.recipeSourceBindings!.some(
        (next) => next.id === old.binding_id,
      ),
  );
  if (!removed.length) return;
  const pid = sql.trustedPrincipalId;
  await sql.query('SELECT dxt_sample.lock_policy()');
  const root = (
    await sql.query<{ study_id: string }>(
      'SELECT study_id FROM experiment_run WHERE run_id=$1 FOR UPDATE',
      [runId],
    )
  ).rows[0];
  if (
    !pid ||
    !root ||
    (
      await sql.query<{ reason: string }>(
        'SELECT dxt_explicit_scientific_access_reason($1,$2,$3) reason',
        [pid, root.study_id, action],
      )
    ).rows[0].reason !== 'EXPLICIT_GRANT'
  )
    throw new ApplicationError(
      'FORBIDDEN',
      'Explicit scientific permission is required.',
    );
  if (await planLockReason(sql, runId))
    throw new ApplicationError(
      'CONFLICT',
      'The Plan is locked because execution evidence has been recorded.',
    );
  for (const old of removed) {
    await sql.query(
      "INSERT INTO dxt_sample.recipe_source_history(id,run_id,binding_id,link_version,operation_domain_id,group_domain_id,subject_domain_id,package_version_id,recipe_revision_id,parameter_revision_id,selection_state,sample_revision_id,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'REMOVED',NULL,$11)",
      [
        randomUUID(),
        runId,
        old.binding_id,
        Number(old.version) + 1,
        old.operation_domain_id,
        old.group_domain_id,
        old.subject_domain_id,
        old.package_version_id,
        old.recipe_revision_id,
        old.parameter_revision_id,
        pid,
      ],
    );
    await sql.query(
      'DELETE FROM dxt_sample.recipe_source_selection WHERE run_id=$1 AND binding_id=$2',
      [runId, old.binding_id],
    );
  }
}

/** Called inside the authoritative Plan transaction after child upserts, before parent deletions. */
export async function syncRecipeSourceBindings(
  sql: SqlSession,
  runId: string,
  snapshot: SourceSnapshot,
  action: 'CREATE_RUN' | 'EDIT_RUN_PLAN',
) {
  if (!(await sourceTables(sql))) {
    if (snapshot.recipeSourceBindings?.length)
      throw new ApplicationError(
        'VALIDATION',
        'Source material selection is unavailable.',
      );
    return;
  }
  const current = (
    await sql.query<SelectionRow>(
      'SELECT * FROM dxt_sample.recipe_source_selection WHERE run_id=$1 FOR UPDATE',
      [runId],
    )
  ).rows;
  if (!snapshot.recipeSourceBindings?.length && !current.length) return;
  if (snapshot.recipeSourceBindings === undefined)
    throw new ApplicationError(
      'CONFLICT',
      'Source selections changed. Reload the Plan before saving.',
    );
  const next = snapshot.recipeSourceBindings;
  validateRecipeSourceBindings(next);
  const pid = sql.trustedPrincipalId;
  if (!pid)
    throw new ApplicationError(
      'FORBIDDEN',
      'Explicit scientific permission is required.',
    );
  await sql.query('SELECT dxt_sample.lock_policy()');
  const root = (
    await sql.query<{ study_id: string }>(
      'SELECT study_id FROM experiment_run WHERE run_id=$1 FOR UPDATE',
      [runId],
    )
  ).rows[0];
  if (
    !root ||
    (
      await sql.query<{ reason: string }>(
        'SELECT dxt_explicit_scientific_access_reason($1,$2,$3) reason',
        [pid, root.study_id, action],
      )
    ).rows[0].reason !== 'EXPLICIT_GRANT'
  )
    throw new ApplicationError(
      'FORBIDDEN',
      'Explicit scientific permission is required.',
    );
  if (await planLockReason(sql, runId))
    throw new ApplicationError(
      'CONFLICT',
      'The Plan is locked because execution evidence has been recorded.',
    );
  const history = async (
    b: RecipeSourceBinding,
    state: 'SELECTED' | 'CLEAR' | 'REMOVED',
  ) => {
    const version = Number(
      (
        await sql.query<{ v: number }>(
          'SELECT COALESCE(MAX(link_version),0)+1 v FROM dxt_sample.recipe_source_history WHERE run_id=$1 AND binding_id=$2',
          [runId, b.id],
        )
      ).rows[0].v,
    );
    await sql.query(
      'INSERT INTO dxt_sample.recipe_source_history(id,run_id,binding_id,link_version,operation_domain_id,group_domain_id,subject_domain_id,package_version_id,recipe_revision_id,parameter_revision_id,selection_state,sample_revision_id,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      [
        randomUUID(),
        runId,
        b.id,
        version,
        b.operationId,
        b.groupId,
        b.subjectId,
        snapshot.configurationPackageVersionId,
        b.recipeRevisionId,
        b.parameterRevisionId,
        state,
        state === 'SELECTED' ? b.sampleRevisionId : null,
        pid,
      ],
    );
    return version;
  };
  // Removals are explicit inheritance. History remains even when an Operation is removed.
  for (const old of current)
    if (!next.some((b) => b.id === old.binding_id)) {
      await history(unpack(old), 'REMOVED');
      await sql.query(
        'DELETE FROM dxt_sample.recipe_source_selection WHERE run_id=$1 AND binding_id=$2',
        [runId, old.binding_id],
      );
    }
  for (const b of next) {
    const old = current.find((row) => row.binding_id === b.id);
    if (old && recipeSourceScopeKey(unpack(old)) !== recipeSourceScopeKey(b))
      throw new ApplicationError(
        'VALIDATION',
        'A Source binding identity cannot change scope or exact parameter. Remove it and create a new selection.',
      );
    const step = snapshot.steps.find((s) => s.id === b.operationId);
    if (!step)
      throw new ApplicationError(
        'VALIDATION',
        'Source Operation is unavailable.',
      );
    const groupId = b.subjectId
      ? snapshot.operationDesign?.[b.operationId]?.allocations[b.subjectId]
          ?.groupId
      : b.groupId;
    if (
      b.groupId &&
      !snapshot.operationDesign?.[b.operationId]?.groups.some(
        (group) => group.id === b.groupId,
      )
    )
      throw new ApplicationError('VALIDATION', 'Source Group is unavailable.');
    if (
      b.subjectId &&
      !snapshot.subjects.some((subject) => subject.id === b.subjectId)
    )
      throw new ApplicationError(
        'VALIDATION',
        'Source Subject is unavailable.',
      );
    const recipes = snapshot.assignments.filter(
      (a) => a.kind === 'RECIPE' && a.processStepId === b.operationId,
    );
    const effective = new Map<string, (typeof recipes)[number]>();
    for (const level of [
      recipes.filter((a) => !a.subjectId && !a.groupId),
      recipes.filter((a) => !!groupId && a.groupId === groupId),
      recipes.filter((a) => !!b.subjectId && a.subjectId === b.subjectId),
    ])
      for (const recipe of level)
        if (recipe.value.trim()) effective.set(recipe.label, recipe);
    if (
      ![...effective.values()].some((a) => a.referenceId === b.recipeRevisionId)
    )
      throw new ApplicationError(
        'VALIDATION',
        'The Recipe changed. Remove incompatible Source selections and select materials for the current Recipe.',
      );
    if (
      !(
        await sql.query(
          'SELECT 1 FROM dxt_sample.recipe_source_descriptor WHERE package_version_id=$1 AND recipe_revision_id=$2 AND parameter_revision_id=$3',
          [
            snapshot.configurationPackageVersionId,
            b.recipeRevisionId,
            b.parameterRevisionId,
          ],
        )
      ).rowCount
    )
      throw new ApplicationError(
        'VALIDATION',
        'Source Parameter is not defined for this exact Recipe revision.',
      );
    // A redacted selection may be preserved verbatim, never interpreted as clear/inherit.
    if (b.sampleAccessDenied) {
      if (
        !old ||
        b.state !== 'SELECTED' ||
        b.sampleRevisionId !== null ||
        old.selection_state !== 'SELECTED'
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Selected material is unavailable. Request access or explicitly change the selection.',
        );
      continue;
    }
    if (
      b.sampleRevisionId &&
      !(await sampleVisible(sql, pid, b.sampleRevisionId))
    )
      throw new ApplicationError(
        'FORBIDDEN',
        'Selected material is unavailable. Request access or choose another revision.',
      );
    if (
      old &&
      old.selection_state === b.state &&
      old.sample_revision_id === b.sampleRevisionId
    )
      continue;
    const operation = (
      await sql.query<{ id: string }>(
        'SELECT run_operation_id id FROM run_operation WHERE run_id=$1 AND operation_domain_id=$2',
        [runId, b.operationId],
      )
    ).rows[0];
    const subject = b.subjectId
      ? (
          await sql.query<{ id: string }>(
            'SELECT rs.run_subject_id id FROM run_subject rs JOIN subject s USING(subject_id) WHERE rs.run_id=$1 AND s.subject_domain_id=$2',
            [runId, b.subjectId],
          )
        ).rows[0]
      : null;
    if (!operation || (b.subjectId && !subject))
      throw new ApplicationError('VALIDATION', 'Source scope is unavailable.');
    const version = await history(b, b.state);
    await sql.query(
      `INSERT INTO dxt_sample.recipe_source_selection(run_id,binding_id,run_operation_id,operation_domain_id,group_domain_id,run_subject_id,subject_domain_id,package_version_id,recipe_revision_id,parameter_revision_id,selection_state,sample_revision_id,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(run_id,binding_id) DO UPDATE SET selection_state=EXCLUDED.selection_state,sample_revision_id=EXCLUDED.sample_revision_id,version=EXCLUDED.version`,
      [
        runId,
        b.id,
        operation.id,
        b.operationId,
        b.groupId,
        subject?.id ?? null,
        b.subjectId,
        snapshot.configurationPackageVersionId,
        b.recipeRevisionId,
        b.parameterRevisionId,
        b.state,
        b.sampleRevisionId,
        version,
      ],
    );
  }
}

export async function readRecipeSourceUsage(
  sql: SqlSession,
  pid: string,
  sampleId: string,
) {
  if (!(await sourceTables(sql))) return [];
  return (
    await sql.query<{
      study: string;
      slug: string;
      run: number;
      revision: number;
      assignment: string;
      state: string;
    }>(
      `SELECT s.display_name study,s.series_slug slug,r.run_number run,sr.revision_number revision,cr.payload->>'label' assignment,CASE WHEN c.version=h.link_version AND c.sample_revision_id=h.sample_revision_id THEN 'CURRENT' ELSE 'HISTORICAL' END state FROM dxt_sample.recipe_source_history h JOIN configuration_revision cr ON cr.revision_kind='definitionDescriptors' AND cr.revision_id=h.parameter_revision_id JOIN dxt_sample.revision sr ON sr.id=h.sample_revision_id JOIN dxt_sample.sample sm ON sm.id=sr.sample_id JOIN experiment_run r ON r.run_id=h.run_id JOIN study s ON s.study_id=r.study_id LEFT JOIN dxt_sample.recipe_source_selection c ON c.run_id=h.run_id AND c.binding_id=h.binding_id WHERE sr.sample_id=$2 AND dxt_sample.allowed($1,sm.owning_org_id,sm.id,'READ_SAMPLE') AND dxt_study_access_reason($1,s.study_id,'VIEW_RUN')=ANY($3::text[]) ORDER BY r.created_at,h.recorded_at`,
      [pid, sampleId, allowReasons],
    )
  ).rows;
}
