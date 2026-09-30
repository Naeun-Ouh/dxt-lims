import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import {
  handleRepositoryRequest,
  dispatchRepository,
} from '@/app/api/repository/route';
import {
  PostgresAuthorization,
  resolvePrincipal,
} from '@/src/infrastructure/postgres/authorization';
import { authorizedResourceScopeSql } from '@/src/infrastructure/postgres/scoped-discovery';
import type {
  DashboardProjection,
  DiscoveryPage,
  SearchResult,
  RunSummary,
} from '@/src/application/discovery';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import { DxtApplication } from '@/src/application/dxt-application';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { projectAnalysisRows, saveAnalysisView } from '@/src/domain/analysis';
import type { productionMeasurementContract } from './postgres-measurement-contract';

export async function dashboardAuthorizationContract(
  db: SqlDatabase,
  proofs: Awaited<ReturnType<typeof productionMeasurementContract>>,
) {
  const api = (p: string, input: Record<string, unknown>) =>
    handleRepositoryRequest(
      new Request('http://localhost/api/repository', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-principal-id': 'scope-admin',
          'x-role': 'ADMIN',
        },
        body: JSON.stringify(input),
      }),
      (i, d) =>
        authorizedOperation(db, `scope-${p}`, i, d ?? dispatchRepository),
    );
  const ok = async <T>(
    p: string,
    input: Record<string, unknown>,
  ): Promise<T> => {
    const r = await api(p, input);
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(r.headers.get('cache-control'), 'no-store');
    return r.json() as Promise<T>;
  };
  const dashboard = (p: string, scope: object = { kind: 'ACCESSIBLE' }) =>
    ok<DashboardProjection>(p, {
      operation: 'dashboard.query',
      query: { scope, limit: 100 },
    });
  const search = (p: string, text = '', extra: object = {}) =>
    ok<DiscoveryPage<SearchResult>>(p, {
      operation: 'search.query',
      query: { text, limit: 100, ...extra },
    });
  const list = (p: string) =>
    ok<{ study_id: string; series_slug: string; display_name: string }[]>(p, {
      operation: 'study.list',
    });
  for (const p of [
    'owner',
    'viewer',
    'leader',
    'team',
    'module',
    'area',
    'collaborator',
    'outsider',
    'admin',
    'scientist',
  ])
    await db.query('INSERT INTO auth_principal VALUES($1,$1,true,$2)', [
      `scope-${p}`,
      p === 'admin' ? 'ADMIN' : 'GENERAL_USER',
    ]);
  await db.query(
    "INSERT INTO auth_org_unit VALUES('scope-part','PART',NULL),('scope-team','TEAM','scope-part'),('scope-dept','DEPARTMENT','scope-team'),('scope-other','DEPARTMENT',NULL),('scope-area','AREA',NULL),('scope-other-area','AREA',NULL),('scope-module','MODULE',NULL),('scope-other-module','MODULE',NULL)",
  );
  await db.query(
    "INSERT INTO auth_membership VALUES('scope-viewer','scope-dept',false),('scope-leader','scope-part',true),('scope-team','scope-team',true),('scope-module','scope-module',true),('scope-area','scope-area',false),('scope-scientist','scope-dept',false)",
  );
  const sid: string[] = [],
    runIds: string[] = [];
  // Ten independent Study roots / one Run each, using both existing generic subject types.
  // Unrelated seeded scientific data has no scope-* membership and must not contribute.
  for (let i = 0; i < 10; i++) {
    const id = randomUUID(),
      runId = randomUUID(),
      template = proofs[i % 2].snapshot.id;
    sid.push(id);
    runIds.push(`scope-run-${i}`);
    await db.query(
      `INSERT INTO study(study_id,series_slug,series_domain_id,display_name,experiment_type,intent,next_run_number) SELECT $1,$2,$2,$3,experiment_type,'scope proof',2 FROM study LIMIT 1`,
      [id, `scope-study-${i}`, `${i < 4 ? 'Visible' : 'Secret'} Study ${i}`],
    );
    await db.query(
      `INSERT INTO experiment_run(run_id,run_domain_id,study_id,run_number,configuration_package_version_id,experiment_type_profile_version_id,subject_type_revision_id,display_name,study_name,experiment_type,area,created_at,intent,provenance_kind,provenance_label,delta)
  SELECT $1,$2,$3,1,configuration_package_version_id,experiment_type_profile_version_id,subject_type_revision_id,$4,$4,experiment_type,area,now(),'scope proof',provenance_kind,provenance_label,delta FROM experiment_run WHERE run_domain_id=$5`,
      [
        runId,
        runIds[i],
        id,
        `${i < 4 ? 'Visible' : 'Secret'} Run ${i}`,
        template,
      ],
    );
    await db.query(
      `INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id,area_id,visibility) VALUES($1,'scope-owner',$2,$3,$4)`,
      [
        id,
        i < 5 ? 'scope-dept' : 'scope-other',
        i === 0 ? null : i < 5 ? 'scope-area' : 'scope-other-area',
        i === 4 || i === 7
          ? 'PRIVATE'
          : i === 1 || i === 5
            ? 'AREA'
            : 'RESPONSIBLE_DEPARTMENT',
      ],
    );
    await db.query('INSERT INTO study_module_access VALUES($1,$2)', [
      id,
      i === 2 || i === 4 || i === 6 ? 'scope-module' : 'scope-other-module',
    ]);
  }
  const policy = new PostgresAuthorization(db);
  // 1. Policy/list parity for every persona: no second discoverability interpretation.
  const expected: Record<string, number[]> = {
    owner: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    viewer: [0, 1, 2, 3],
    leader: [0, 1, 2, 3],
    team: [0, 1, 2, 3],
    module: [2, 6],
    area: [1],
    collaborator: [],
    outsider: [],
    scientist: [0, 1, 2, 3],
  };
  for (const [p, indexes] of Object.entries(expected)) {
    assert.deepEqual(
      (await list(p)).map((s) => s.study_id).sort(),
      indexes.map((i) => sid[i]).sort(),
      p,
    );
    const principal = await resolvePrincipal(db, `scope-${p}`);
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await policy.authorize(principal, 'VIEW_STUDY', sid[i])).effect,
        indexes.includes(i) ? 'ALLOW' : 'DENY',
      );
  }
  const grant = async (
    p: string,
    i: number,
    action = 'VIEW_STUDY',
    expired = false,
  ) =>
    db.query(
      'INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by,expires_at) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        sid[i],
        `scope-${p}`,
        action,
        'scope-admin',
        expired ? '2000-01-01' : null,
      ],
    );
  await grant('collaborator', 7);
  await grant('collaborator', 8, 'VIEW_STUDY', true);
  await grant('scientist', 0, 'AUTHOR_EVALUATION');
  assert.deepEqual(
    (await list('collaborator')).map((s) => s.study_id),
    [sid[7]],
  );
  assert.equal((await dashboard('viewer', { kind: 'MY' })).counts.studies, 0);
  assert.equal(
    (await dashboard('scientist', { kind: 'MY' })).counts.studies,
    1,
  );
  assert.equal(
    (await dashboard('collaborator', { kind: 'MY' })).counts.studies,
    1,
  );
  assert.equal((await dashboard('owner', { kind: 'MY' })).counts.studies, 10);
  assert.equal((await dashboard('leader', { kind: 'MY' })).counts.studies, 0);
  assert.equal((await dashboard('admin', { kind: 'MY' })).counts.studies, 0);
  // 2. Literal search, autocomplete-sized pages, Run numbers and totals are scoped in SQL.
  const matches = await search('viewer');
  assert.equal(matches.total, 8);
  assert.ok(matches.items.every((x) => !x.name.includes('Secret')));
  assert.equal((await search('viewer', 'Secret')).total, 0);
  assert.equal((await search('viewer', '%')).total, 0);
  assert.equal((await search('viewer', '', { limit: 1, offset: 1 })).total, 8);
  assert.equal((await search('viewer', '', { offset: 999 })).items.length, 0);
  const summary = await ok<DiscoveryPage<RunSummary>>('viewer', {
    operation: 'run.summaries',
    query: { limit: 2 },
  });
  assert.equal(summary.total, 4);
  assert.equal(summary.items.length, 2);
  assert.equal(
    (await api('viewer', { operation: 'run.get', runId: runIds[7] })).status,
    404,
  );
  assert.equal(
    (await api('viewer', { operation: 'search.query', query: { limit: 101 } }))
      .status,
    400,
  );
  assert.equal(
    (await api('missing', { operation: 'dashboard.query' })).status,
    403,
  );
  // 3. Ten total, four authorized: no hidden contribution in any aggregate/group.
  const visible = await dashboard('viewer');
  assert.equal(visible.counts.studies, 4);
  assert.equal(visible.counts.runs, 4);
  assert.equal(visible.counts.activeRuns, 4);
  assert.equal(visible.counts.thisWeek, 4);
  assert.equal(visible.counts.needReview, 0);
  assert.equal(
    visible.groups.find((g) => g.dimension === 'DEPARTMENT')?.studies,
    4,
  );
  assert.equal(visible.groups.find((g) => g.dimension === 'AREA')?.studies, 3);
  assert.equal(
    visible.groups.find(
      (g) => g.dimension === 'MODULE' && g.id === 'scope-module',
    )?.studies,
    1,
  );
  assert.ok(!JSON.stringify(visible).includes('Secret'));
  // 4. Calendar and recent are the same authorized rows, including latest timestamp.
  assert.deepEqual(
    visible.calendar.map((r) => r.id).sort(),
    runIds.slice(0, 4).sort(),
  );
  assert.equal(visible.calendarTotal, 4);
  assert.equal(visible.recent.length, 4);
  const before = structuredClone(visible);
  await db.query(
    "UPDATE study SET display_name='Changed secret name',aggregate_version=aggregate_version+1 WHERE study_id=$1",
    [sid[7]],
  );
  await db.query(
    "UPDATE experiment_run SET display_name='latest hidden work',created_at=now()+interval '2 day' WHERE study_id=$1",
    [sid[7]],
  );
  assert.deepEqual(
    await dashboard('viewer'),
    before,
    'hidden activity cannot affect any visible response',
  );
  assert.deepEqual(
    await search('viewer'),
    matches,
    'hidden renames cannot affect search totals or ordering',
  );
  // 5. Named dimensions always intersect current discoverability; no hierarchy implies Module.
  assert.equal(
    (await dashboard('viewer', { kind: 'DEPARTMENT', id: 'scope-other' }))
      .counts.studies,
    0,
  );
  assert.equal(
    (await dashboard('leader', { kind: 'PART', id: 'scope-part' })).counts
      .studies,
    4,
  );
  assert.equal(
    (await dashboard('team', { kind: 'TEAM', id: 'scope-team' })).counts
      .studies,
    4,
  );
  assert.equal(
    (await dashboard('area', { kind: 'AREA', id: 'scope-area' })).counts
      .studies,
    1,
  );
  assert.equal(
    (await dashboard('viewer', { kind: 'AREA', id: 'scope-area' })).counts
      .studies,
    3,
  );
  assert.equal(
    (await dashboard('module', { kind: 'MODULE', id: 'scope-module' })).counts
      .studies,
    2,
  );
  assert.equal(
    (await dashboard('leader', { kind: 'MODULE', id: 'scope-module' })).counts
      .studies,
    1,
  );
  assert.equal(
    (await dashboard('viewer', { kind: 'AREA', id: 'scope-dept' })).counts
      .studies,
    0,
  );
  for (const p of ['leader', 'team', 'module', 'admin'])
    assert.equal(
      (
        await policy.authorize(
          await resolvePrincipal(db, `scope-${p}`),
          'AUTHOR_EVALUATION',
          sid[2],
        )
      ).effect,
      'DENY',
    );
  const history = await db.query(
    'SELECT run_domain_id,delta FROM experiment_run ORDER BY run_domain_id',
  );
  await db.query(
    "UPDATE auth_membership SET unit_id='scope-other' WHERE principal_id='scope-viewer'",
  );
  assert.deepEqual(
    (await list('viewer')).map((s) => s.study_id).sort(),
    [5, 6, 8, 9].map((i) => sid[i]).sort(),
  );
  await db.query(
    "DELETE FROM auth_membership WHERE principal_id IN ('scope-leader','scope-module')",
  );
  assert.equal((await dashboard('leader')).counts.studies, 0);
  assert.equal((await search('module')).total, 0);
  await db.query(
    "INSERT INTO auth_membership VALUES('scope-module','scope-other-module',true)",
  );
  assert.deepEqual(
    (await list('module')).map((s) => s.study_id).sort(),
    [0, 1, 3, 5, 8, 9].map((i) => sid[i]).sort(),
  );
  await db.query(
    "UPDATE study_access_grant SET active=false WHERE principal_id='scope-collaborator'",
  );
  assert.equal((await dashboard('collaborator')).counts.studies, 0);
  assert.deepEqual(
    await db.query(
      'SELECT run_domain_id,delta FROM experiment_run ORDER BY run_domain_id',
    ),
    history,
  );
  // 6. Real Wafer + Specimen evidence, Saved Analysis audience AND all-source intersection.
  await db.query(
    "INSERT INTO auth_membership VALUES('scope-collaborator','scope-dept',false)",
  );
  const app = new DxtApplication(
    createProductionSliceRepositories(
      db,
      await hydrateConfigurationPackages(db, [
        'config-package-photo-v1',
        'config-package-material-rd-v1',
      ]),
    ),
  );
  const savedIds: string[] = [];
  for (const proof of proofs) {
    const root = (
      await db.query<{ study_id: string }>(
        'SELECT study_id FROM experiment_run WHERE run_domain_id=$1',
        [proof.snapshot.id],
      )
    ).rows[0].study_id;
    await db.query(
      "INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id,visibility) VALUES($1,'scope-owner','scope-dept','RESPONSIBLE_DEPARTMENT') ON CONFLICT(study_id) DO UPDATE SET responsible_user_id='scope-owner',responsible_department_id='scope-dept',visibility='RESPONSIBLE_DEPARTMENT'",
      [root],
    );
    const selection = { ...proof.selection, aggregation: 'MEAN' as const },
      rows = projectAnalysisRows(
        await app.queryAnalysisSources(
          await app.analysisSourceCatalog(),
          selection,
        ),
        selection,
      );
    const view = saveAnalysisView(
      {
        id: `scope-analysis-${proof.snapshot.id}`,
        name: `Scope ${proof.snapshot.subjects[0].type} View`,
        owner: 'ignored',
        visibility: 'PRIVATE',
        studyId: selection.studyId,
        runIds: selection.runIds,
        subjectIds: selection.subjectIds,
        parameterIds: selection.parameterIds,
        datasetIds: selection.datasetIds,
        visualization: {
          type: 'TABLE',
          xDimension: 'SUBJECT',
          groupBy: 'SUBJECT',
        },
        preparation: {
          aggregation: 'MEAN',
          datasetOrigin: 'ALL',
          includeExcluded: true,
        },
        filters: { text: '', sort: 'SUBJECT' },
        savedAt: new Date().toISOString(),
      },
      rows,
    );
    await ok('owner', {
      operation: 'analysis.save',
      view,
      command: { commandId: randomUUID(), expectedVersion: 0 },
    });
    savedIds.push(view.id);
    await db.query(
      "UPDATE saved_analysis_access SET visibility='DEPARTMENT',audience_unit_id='scope-dept' WHERE saved_analysis_id=(SELECT id FROM saved_analysis WHERE domain_id=$1)",
      [view.id],
    );
  }
  const scientific = await dashboard('collaborator');
  assert.ok(scientific.counts.measurements >= 2);
  assert.equal(scientific.counts.savedAnalyses, 2);
  assert.ok(scientific.recent.some((r) => r.id === proofs[0].snapshot.id));
  assert.ok(scientific.recent.some((r) => r.id === proofs[1].snapshot.id));
  assert.equal(
    (
      await ok<DiscoveryPage<SearchResult>>('collaborator', {
        operation: 'search.query',
        kind: 'SAVED_ANALYSIS',
      })
    ).total,
    2,
  );
  assert.equal(
    (await ok<unknown[]>('collaborator', { operation: 'analysis.list' }))
      .length,
    2,
  );
  // A valid cross-Study saved context disappears entirely when either source is revoked.
  const first = (
    await db.query<{ id: string; configuration: Record<string, unknown> }>(
      'SELECT id,configuration FROM saved_analysis WHERE domain_id=$1',
      [savedIds[0]],
    )
  ).rows[0];
  const second = (
    await db.query<{
      id: string;
      configuration: Record<string, unknown>;
      study_id: string;
    }>(
      'SELECT id,configuration,study_id FROM saved_analysis WHERE domain_id=$1',
      [savedIds[1]],
    )
  ).rows[0];
  const combined = { ...first.configuration };
  for (const key of ['runIds', 'subjectIds', 'parameterIds', 'datasetIds'])
    combined[key] = [
      ...new Set([
        ...(first.configuration[key] as string[]),
        ...(second.configuration[key] as string[]),
      ]),
    ];
  await db.query('UPDATE saved_analysis SET configuration=$2 WHERE id=$1', [
    first.id,
    JSON.stringify(combined),
  ]);
  await db.query(
    'INSERT INTO saved_analysis_source_ref SELECT $1,ordinal+500,study_domain_id,run_domain_id,subject_domain_id,execution_domain_id,dataset_domain_id,parameter_domain_id,representative_domain_id FROM saved_analysis_source_ref WHERE saved_analysis_id=$2',
    [first.id, second.id],
  );
  assert.equal((await dashboard('collaborator')).counts.savedAnalyses, 2);
  await db.query(
    "UPDATE study_access SET visibility='PRIVATE' WHERE study_id=$1",
    [second.study_id],
  );
  assert.equal(
    (await dashboard('collaborator')).counts.savedAnalyses,
    0,
    'one inaccessible valid source removes whole cross-Study context',
  );
  assert.equal(
    (
      await ok<DiscoveryPage<SearchResult>>('collaborator', {
        operation: 'search.query',
        kind: 'SAVED_ANALYSIS',
      })
    ).total,
    0,
  );
  await db.query(
    "UPDATE study_access SET visibility='RESPONSIBLE_DEPARTMENT' WHERE study_id=$1",
    [second.study_id],
  );
  assert.equal((await dashboard('collaborator')).counts.savedAnalyses, 2);
  // Extra inaccessible source makes the entire saved view undiscoverable, never partial.
  await db.query(
    "INSERT INTO saved_analysis_source_ref(saved_analysis_id,ordinal,study_domain_id,run_domain_id,subject_domain_id,dataset_domain_id,parameter_domain_id) SELECT id,999,'scope-study-7',$2,'hidden-subject','missing-dataset','missing-parameter' FROM saved_analysis WHERE domain_id=$1",
    [savedIds[0], runIds[7]],
  );
  assert.equal((await dashboard('collaborator')).counts.savedAnalyses, 1);
  assert.equal(
    (
      await ok<DiscoveryPage<SearchResult>>('collaborator', {
        operation: 'search.query',
        kind: 'SAVED_ANALYSIS',
      })
    ).total,
    1,
  );
  await db.query(
    "UPDATE saved_analysis_access SET visibility='PRIVATE',audience_unit_id=NULL WHERE saved_analysis_id=(SELECT id FROM saved_analysis WHERE domain_id=$1)",
    [savedIds[1]],
  );
  assert.equal((await dashboard('collaborator')).counts.savedAnalyses, 0);
  await db.query(
    "UPDATE auth_principal SET active=false WHERE id='scope-collaborator'",
  );
  assert.equal(
    (await api('collaborator', { operation: 'search.query' })).status,
    403,
  );
  // Planner evidence: one set-based materialized scope, no Node row-by-row policy calls.
  const plan = await db.query(
    `${'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)'} ${authorizedResourceScopeSql} SELECT s.responsible_department_id,count(*) FROM scoped_studies s LEFT JOIN scoped_runs r USING(study_id) GROUP BY s.responsible_department_id`,
    ['scope-owner', 'ACCESSIBLE', null, null],
  );
  assert.ok(JSON.stringify(plan.rows).includes('scoped_studies'));
  return { plan: plan.rows };
}
