import {
  sampleCommandSchema,
  type SampleAggregate,
  type SampleCommand,
  type SampleDetail,
  type SampleSummary,
} from '@/src/application/sample-lifecycle';
import { ApplicationError } from '@/src/application/repository-ports';
import type { SqlDatabase, SqlSession } from './sql-database';
import { resolvePrincipal } from './authorization';
const unavailable = () =>
  new ApplicationError('NOT_FOUND', 'Sample unavailable or access denied.');
export async function sampleAllowed(
  sql: SqlSession,
  pid: string,
  org: string,
  sid: string | null,
  action: string,
) {
  return (
    (
      await sql.query<{ ok: boolean }>(
        'SELECT dxt_sample.allowed($1,$2,$3,$4) ok',
        [pid, org, sid, action],
      )
    ).rows[0]?.ok === true
  );
}
export async function sampleOperation(
  database: SqlDatabase,
  pid: string,
  raw: unknown,
) {
  const input = sampleCommandSchema.parse(raw);
  return database.transaction(async (sql) => {
    await sql.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await sql.query(
      'LOCK TABLE auth_principal,auth_org_unit,auth_membership,dxt_sample.access_grant,study_access,study_access_grant,study_module_access IN SHARE MODE',
    );
    await resolvePrincipal(sql, pid);
    return dispatchSample(sql, pid, input);
  });
}
export async function dispatchSample(
  sql: SqlSession,
  pid: string,
  input: SampleCommand,
): Promise<unknown> {
  if (input.operation === 'selection') {
    const r = (
      await sql.query(
        `SELECT r.id,s.id "sampleId",s.sample_code "sampleCode",s.name,r.revision_number revision FROM dxt_sample.revision r JOIN dxt_sample.sample s ON s.id=r.sample_id WHERE r.id=$2 AND dxt_sample.allowed($1,s.owning_org_id,s.id,'READ_SAMPLE')`,
        [pid, input.revisionId],
      )
    ).rows[0];
    if (!r) throw unavailable();
    return r;
  }
  if (input.operation === 'options')
    return (
      await sql.query<{ id: string }>(
        `SELECT o.id FROM auth_org_unit o WHERE dxt_sample.allowed($1,o.id,NULL,'REGISTER_SAMPLE') AND dxt_sample.allowed($1,o.id,NULL,'READ_SAMPLE') ORDER BY o.id`,
        [pid],
      )
    ).rows;
  if (input.operation === 'revisions')
    return (
      await sql.query(
        `SELECT r.id,s.id "sampleId",s.sample_code "sampleCode",s.name,r.revision_number revision FROM dxt_sample.sample s JOIN dxt_sample.revision r ON r.sample_id=s.id WHERE dxt_sample.allowed($1,s.owning_org_id,s.id,'READ_SAMPLE') AND (s.name ILIKE $2 OR s.sample_code ILIKE $2) ORDER BY s.sample_code,r.revision_number DESC LIMIT 100`,
        [pid, `%${input.search}%`],
      )
    ).rows;
  if (input.operation === 'list') {
    const rows = (
      await sql.query<SampleSummary & { total: string }>(
        `WITH permitted AS MATERIALIZED (SELECT s.* FROM dxt_sample.sample s WHERE dxt_sample.allowed($1,s.owning_org_id,s.id,'READ_SAMPLE')), filtered AS (SELECT * FROM permitted WHERE name ILIKE $2 OR sample_code ILIKE $2)
 SELECT s.id,s.owning_org_id "owningOrgId",s.sample_code "sampleCode",s.name,(SELECT max(revision_number) FROM dxt_sample.revision r WHERE r.sample_id=s.id) "latestRevision",dxt_sample.allowed($1,s.owning_org_id,s.id,'REVISE_SAMPLE') "canRevise",count(*) OVER() total FROM filtered s ORDER BY s.sample_code,s.id LIMIT $3 OFFSET $4`,
        [pid, `%${input.search}%`, input.limit, input.offset],
      )
    ).rows;
    return {
      rows: rows.map(({ total: _, ...row }) => row),
      total: Number(rows[0]?.total ?? 0),
    };
  }
  if (input.operation === 'write') {
    const d = input.aggregate;
    // Root self-reference is a declared aggregate identity. Other references require authoritative resolution.
    for (const node of d.composition.nodes) {
      if (
        node.nodeType === 'SAMPLE_REVISION' &&
        node.referenceId === d.revision.id
      )
        continue;
      if (node.nodeType === 'SAMPLE_REVISION') {
        const r = (
          await sql.query<{ owning_org_id: string; sample_id: string }>(
            'SELECT s.owning_org_id,r.sample_id FROM dxt_sample.revision r JOIN dxt_sample.sample s ON s.id=r.sample_id WHERE r.id=$1',
            [node.referenceId],
          )
        ).rows[0];
        if (
          !r ||
          !(await sampleAllowed(
            sql,
            pid,
            r.owning_org_id,
            r.sample_id,
            'READ_SAMPLE',
          ))
        )
          throw unavailable();
      } else {
        const r = await sql.query(
          `SELECT 1 FROM configuration_revision r WHERE r.revision_kind='externalReferences' AND r.revision_id=$1 AND EXISTS(SELECT 1 FROM configuration_package_member m JOIN configuration_package_version v USING(package_version_id) WHERE m.member_kind=r.revision_kind AND m.member_revision_id=r.revision_id AND dxt_configuration_allowed($2,v.scope_kind,COALESCE(v.scope_owner_id,''),'VIEW_CONFIGURATION'))`,
          [node.referenceId, pid],
        );
        if (!r.rowCount)
          throw new ApplicationError(
            'VALIDATION',
            'Composition reference is unavailable. Choose a verified reference.',
          );
      }
    }
    try {
      await sql.query('SELECT dxt_sample.write_revision($1,$2,$3,$4)', [
        pid,
        input.commandId,
        input.expectedLatest,
        d,
      ]);
    } catch (e) {
      const code = typeof e === 'object' && e && 'code' in e ? e.code : '';
      if (code === '42501')
        throw new ApplicationError(
          'FORBIDDEN',
          'Explicit Sample permission is required.',
        );
      if (['23505', '40001'].includes(String(code)))
        throw new ApplicationError(
          'CONFLICT',
          'Sample changed or the code is already used. Reload and check your input.',
        );
      if (['23514', '22023', '23502', '23503'].includes(String(code)))
        throw new ApplicationError(
          'VALIDATION',
          'Sample could not be saved. Check the identity, revision and composition values.',
        );
      throw e;
    }
    return sampleDetail(sql, pid, d.sample.id, d.revision.revision);
  }
  return sampleDetail(sql, pid, input.id, input.revision);
}
async function sampleDetail(
  sql: SqlSession,
  pid: string,
  id: string,
  revision?: number,
): Promise<SampleDetail> {
  const s = (
    await sql.query<{
      id: string;
      owning_org_id: string;
      sample_code: string;
      name: string;
      description: string | null;
      status: SampleAggregate['sample']['status'];
      created_at: Date | string;
    }>(
      `SELECT * FROM dxt_sample.sample WHERE id=$2 AND dxt_sample.allowed($1,owning_org_id,id,'READ_SAMPLE')`,
      [pid, id],
    )
  ).rows[0];
  if (!s) throw unavailable();
  const history = (
    await sql.query<{ id: string; revision: number }>(
      'SELECT id,revision_number revision FROM dxt_sample.revision WHERE sample_id=$1 ORDER BY revision_number DESC',
      [id],
    )
  ).rows;
  const row = (
    await sql.query<{
      metadata: SampleAggregate['revision'];
      composition: SampleAggregate['composition'];
      properties: SampleAggregate['properties'];
    }>(
      'SELECT * FROM dxt_sample.revision WHERE sample_id=$1 AND revision_number=$2',
      [id, revision ?? history[0]?.revision],
    )
  ).rows[0];
  if (!row) throw unavailable();
  const usage = (
    await sql.query<{
      study: string;
      slug: string;
      run: number;
      revision: number;
      assignment: string;
      state: string;
    }>(
      `SELECT s.display_name study,s.series_slug slug,r.run_number run,sr.revision_number revision,l.assignment_domain_id assignment,CASE WHEN c.version=l.link_version AND c.mapping_id=l.mapping_id THEN 'CURRENT' ELSE 'HISTORICAL' END state FROM dxt_sample.run_assignment_link l LEFT JOIN dxt_sample.assignment_selection c ON c.run_id=l.run_id AND c.assignment_domain_id=l.assignment_domain_id JOIN dxt_sample.material_mapping m ON m.id=l.mapping_id JOIN dxt_sample.revision sr ON sr.id=m.sample_revision_id JOIN experiment_run r ON r.run_id=l.run_id JOIN study s ON s.study_id=r.study_id WHERE sr.sample_id=$2 AND dxt_study_access_reason($1,s.study_id,'VIEW_RUN') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN') ORDER BY r.created_at,l.link_version`,
      [pid, id],
    )
  ).rows;
  return {
    sample: {
      id: s.id,
      sampleCode: s.sample_code,
      name: s.name,
      materialId: null,
      supplierId: null,
      description: s.description,
      status: s.status,
      createdAt: new Date(s.created_at).toISOString(),
    },
    owningOrgId: s.owning_org_id,
    ...row,
    revision: row.metadata,
    latestRevision: history[0].revision,
    canRevise: await sampleAllowed(
      sql,
      pid,
      s.owning_org_id,
      s.id,
      'REVISE_SAMPLE',
    ),
    history,
    usage,
  };
}
