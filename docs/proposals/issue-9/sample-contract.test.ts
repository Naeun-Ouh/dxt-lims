import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { randomUUID, createHash } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { configurationRepository } from '../../../src/mock/configuration-packages';
import { seedProductionSlice } from '../../../src/infrastructure/postgres/slice-seed';
import { provisionReasoningContexts } from '../../../src/infrastructure/postgres/reasoning-context';
import { lifecycleAuthoringProfiles } from '../../../src/mock/lifecycle-authoring';
import { provisionMeasurementReferences } from '../../../src/infrastructure/postgres/measurement-references';
import { definitions } from '../../../src/mock/reference';
import { DxtApplication } from '../../../src/application/dxt-application';
import { createProductionSliceRepositories } from '../../../src/infrastructure/postgres/postgres-repositories';
import { PgDatabase } from '../../../src/infrastructure/postgres/pg-database';
import {
  sampleSchema,
  sampleRevisionSchema,
} from '../../../src/domain/material/sample';
import {
  materialNodeSchema,
  materialCompositionEdgeSchema,
} from '../../../src/domain/material/structure';
import { materialPropertyValueSchema } from '../../../src/domain/material/property';

void test('Sample proposal: native PostgreSQL18, disposable cluster, explicit permissions and exact immutable provenance', async (t) => {
  const bin = process.env.DXT_POSTGRES_BIN;
  assert.ok(
    bin,
    'DXT_POSTGRES_BIN required; no external database connection is supported',
  );
  const run = promisify(execFile),
    dir = await mkdtemp(join(tmpdir(), 'sample-schema-contract-'));
  const data = join(dir, 'data'),
    socket = join(dir, 'socket');
  await mkdir(socket);
  const port = await new Promise<number>((resolve, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const a = s.address();
      s.close(() => resolve(typeof a === 'object' && a ? a.port : 0));
    });
  });
  await run(join(bin, 'initdb'), [
    '-D',
    data,
    '-U',
    'sample_test',
    '--auth=trust',
    '--no-locale',
    '--encoding=UTF8',
  ]);
  let started = false;
  let pool: Pool | undefined;
  try {
    await run(join(bin, 'pg_ctl'), [
      '-D',
      data,
      '-l',
      join(dir, 'server.log'),
      '-o',
      `-p ${port} -h 127.0.0.1 -k ${socket}`,
      'start',
      '-w',
    ]);
    started = true;
    const connectionString = `postgresql://sample_test@127.0.0.1:${port}/postgres`;
    pool = new Pool({ connectionString, max: 4 });
    const db = pool;
    t.diagnostic(
      (await db.query('SHOW server_version')).rows[0].server_version,
    );
    const migrations = 'src/infrastructure/postgres/migrations';
    for (const file of (await readdir(migrations))
      .filter((x) => /^\d{3}.*\.sql$/.test(x))
      .sort())
      await db.query(await readFile(join(migrations, file), 'utf8'));
    const seed = new PgDatabase({ connectionString });
    await seedProductionSlice(seed, configurationRepository);
    await provisionMeasurementReferences(seed, definitions);
    await provisionReasoningContexts(seed, lifecycleAuthoringProfiles);
    const app = new DxtApplication(
      createProductionSliceRepositories(seed, configurationRepository),
    );
    try {
      await app.createRunFromStudy(
        'dts-improvement',
        'STUDY_DEFAULT',
        'sample-fixture-run',
      );
    } finally {
      await seed.close();
    }
    const sql = await readFile(
      'docs/proposals/issue-9/017_sample_lifecycle.proposed.sql',
      'utf8',
    );
    t.diagnostic(
      `SQL sha256 ${createHash('sha256').update(sql).digest('hex')}`,
    );
    await db.query(sql);
    await db.query(
      await readFile(
        'docs/proposals/issue-9/activate-roles.proposed.sql',
        'utf8',
      ),
    );
    await db.query(`INSERT INTO auth_principal VALUES('sample-author','sample-author',true,'GENERAL_USER'),('sample-admin','sample-admin',true,'ADMIN'),('sample-outsider','sample-outsider',true,'GENERAL_USER'),('sample-member','sample-member',true,'GENERAL_USER');
  INSERT INTO auth_org_unit(id,kind) VALUES('sample-org','DEPARTMENT'),('other-org','DEPARTMENT');
  INSERT INTO auth_membership VALUES('sample-author','sample-org',false),('sample-member','sample-org',false),('sample-outsider','other-org',false);`);
    const grant = async (
      id: string,
      pid: string,
      action: string,
      org = 'sample-org',
      sid: string | null = null,
    ) =>
      db.query(
        `INSERT INTO dxt_sample.access_grant(id,owning_org_id,sample_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$5,'sample-admin')`,
        [id, org, sid, pid, action],
      );
    const allowed = async (
      pid: string | null,
      action: string,
      org = 'sample-org',
      sid: string | null = null,
    ) =>
      (
        await db.query('SELECT dxt_sample.allowed($1,$2,$3,$4) ok', [
          pid,
          org,
          sid,
          action,
        ])
      ).rows[0].ok;
    const document = (id = 'sample-a', revision = 1) => ({
      owningOrgId: 'sample-org',
      sample: {
        id,
        sampleCode: id,
        name: 'Contract-only Sample',
        materialId: null as string | null,
        supplierId: null as string | null,
        description: null,
        status: 'Draft',
        createdAt: '2026-01-01T00:00:00Z',
      },
      revision: {
        id: `${id}-r${revision}`,
        sampleId: id,
        revision,
        requestNumber: null,
        developmentItemNumber: null,
        registrationSource: 'DIRECT_REGISTRATION',
        effectiveAt: '2026-01-01T00:00:00Z',
        status: 'Draft',
        createdAt: '2026-01-01T00:00:00Z',
      },
      composition: {
        nodes: [
          {
            id: 'node',
            nodeType: 'SAMPLE_REVISION',
            referenceId: `${id}-r${revision}`,
            label: 'Contract Sample',
          },
        ],
        edges: [],
      },
      properties: [
        {
          id: 'p',
          materialNodeId: 'node',
          propertyDefinitionId: 'test-property',
          value: 0,
          unit: null,
          valueType: 'NUMBER',
          source: 'DIRECT_ENTRY',
          effectiveAt: null,
          evidenceId: null,
        },
      ],
    });
    const validate = (d: ReturnType<typeof document>) => {
      sampleSchema.parse(d.sample);
      sampleRevisionSchema.parse(d.revision);
      materialNodeSchema.array().parse(d.composition.nodes);
      materialCompositionEdgeSchema.array().parse(d.composition.edges);
      materialPropertyValueSchema.array().parse(d.properties);
    };
    const write = (
      d: ReturnType<typeof document>,
      cmd: string,
      expected = 0,
      pid = 'sample-author',
    ) =>
      db.query('SELECT (dxt_sample.write_revision($1,$2,$3,$4)).*', [
        pid,
        cmd,
        expected,
        d,
      ]);
    const rejects = async (p: Promise<unknown>, code: string) =>
      assert.rejects(
        p,
        (e: unknown) =>
          typeof e === 'object' && e !== null && 'code' in e && e.code === code,
      );
    await t.test(
      'default deny: owner membership/admin/creator inference; NULL and other org fail closed',
      async () => {
        for (const p of [
          'sample-author',
          'sample-admin',
          'sample-outsider',
          null,
        ])
          for (const a of ['READ_SAMPLE', 'REGISTER_SAMPLE', 'REVISE_SAMPLE'])
            assert.equal(await allowed(p, a), false);
        await rejects(write(document(), 'denied'), '42501');
        assert.equal(
          (await db.query('SELECT count(*) n FROM dxt_sample.sample')).rows[0]
            .n,
          '0',
        );
      },
    );
    await grant('read', 'sample-author', 'READ_SAMPLE');
    await grant('register', 'sample-author', 'REGISTER_SAMPLE');
    await grant('revise', 'sample-author', 'REVISE_SAMPLE');
    await t.test(
      'atomic identity+first revision, existing aggregate schemas, zero, idempotency, no implicit author rights',
      async () => {
        const d = document();
        validate(d);
        const first = (await write(d, 'register-a')).rows[0];
        assert.equal(first.revision_number, 1);
        assert.equal(first.properties[0].value, 0);
        assert.deepEqual((await write(d, 'register-a')).rows[0], first);
        await rejects(
          write(
            { ...d, sample: { ...d.sample, name: 'different' } },
            'register-a',
          ),
          '23505',
        );
        await rejects(
          write(
            {
              ...document('bad-ref'),
              sample: {
                ...document('bad-ref').sample,
                materialId: 'unverified',
              },
            },
            'bad-ref',
          ),
          '22023',
        );
        await rejects(
          write(
            {
              ...document('bad-revision'),
              revision: { ...document('bad-revision').revision, revision: 3 },
            },
            'bad-revision',
          ),
          '22023',
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*) n FROM dxt_sample.sample WHERE id LIKE 'bad-%'",
            )
          ).rows[0].n,
          '0',
        );
        const invalid = document();
        invalid.properties[0].value = 'not-number' as unknown as number;
        assert.throws(() => validate(invalid));
        await db.query(
          "UPDATE dxt_sample.access_grant SET active=false WHERE id='revise'",
        );
        await rejects(
          write(document('sample-a', 2), 'denied-author', 1),
          '42501',
        );
        await db.query(
          "UPDATE dxt_sample.access_grant SET active=true WHERE id='revise'",
        );
      },
    );
    await t.test(
      'org namespace uniqueness, immutable rows, CAS race and authoritative old revision readback',
      async () => {
        await rejects(
          write(
            {
              ...document('duplicate'),
              sample: {
                ...document('duplicate').sample,
                sampleCode: 'sample-a',
              },
            },
            'duplicate',
          ),
          '23505',
        );
        await grant(
          'register-other',
          'sample-author',
          'REGISTER_SAMPLE',
          'other-org',
        );
        await grant('read-other', 'sample-author', 'READ_SAMPLE', 'other-org');
        await write(
          {
            ...document('other-a'),
            owningOrgId: 'other-org',
            sample: { ...document('other-a').sample, sampleCode: 'sample-a' },
          },
          'other-a',
        );
        const settled = await Promise.allSettled([
          write(document('sample-a', 2), 'rev-a', 1),
          write(
            {
              ...document('sample-a', 2),
              revision: {
                ...document('sample-a', 2).revision,
                id: 'concurrent-r2',
              },
            },
            'rev-b',
            1,
          ),
        ]);
        assert.equal(settled.filter((x) => x.status === 'fulfilled').length, 1);
        assert.equal(settled.filter((x) => x.status === 'rejected').length, 1);
        for (const q of [
          "UPDATE dxt_sample.revision SET metadata='{}' WHERE revision_number=1",
          'DELETE FROM dxt_sample.revision WHERE revision_number=1',
          "UPDATE dxt_sample.sample SET name='rewrite'",
          'DELETE FROM dxt_sample.command_receipt',
        ])
          await rejects(db.query(q), '23514');
        const rows = (
          await db.query(
            "SELECT * FROM dxt_sample.read_revisions('sample-author','sample-a')",
          )
        ).rows;
        assert.equal(rows.length, 2);
        assert.equal(rows[0].metadata.id, 'sample-a-r1');
      },
    );
    await t.test(
      'explicit cross-org grants, revoked/expired/inactive principals, exact resource and unit scopes',
      async () => {
        assert.equal(
          await allowed(
            'sample-outsider',
            'READ_SAMPLE',
            'sample-org',
            'sample-a',
          ),
          false,
        );
        await grant(
          'external-read',
          'sample-outsider',
          'READ_SAMPLE',
          'sample-org',
          'sample-a',
        );
        assert.equal(
          await allowed(
            'sample-outsider',
            'READ_SAMPLE',
            'sample-org',
            'sample-a',
          ),
          true,
        );
        assert.equal(
          await allowed(
            'sample-outsider',
            'READ_SAMPLE',
            'other-org',
            'other-a',
          ),
          false,
        );
        await db.query(
          "UPDATE dxt_sample.access_grant SET expires_at=now()-interval '1 second' WHERE id='external-read'",
        );
        assert.equal(
          await allowed(
            'sample-outsider',
            'READ_SAMPLE',
            'sample-org',
            'sample-a',
          ),
          false,
        );
        await db.query(
          "UPDATE dxt_sample.access_grant SET expires_at=NULL,active=false WHERE id='external-read'",
        );
        assert.equal(
          (
            await db.query(
              "SELECT * FROM dxt_sample.read_revisions('sample-outsider','sample-a')",
            )
          ).rows.length,
          0,
        );
        await db.query(
          "INSERT INTO dxt_sample.access_grant(id,owning_org_id,unit_id,action,granted_by) VALUES('unit-read','sample-org','sample-org','READ_SAMPLE','sample-admin')",
        );
        assert.equal(
          await allowed(
            'sample-member',
            'READ_SAMPLE',
            'sample-org',
            'sample-a',
          ),
          true,
        );
        await db.query(
          "DELETE FROM auth_membership WHERE principal_id='sample-member'",
        );
        assert.equal(
          await allowed(
            'sample-member',
            'READ_SAMPLE',
            'sample-org',
            'sample-a',
          ),
          false,
        );
        await db.query(
          "UPDATE auth_principal SET active=false WHERE id='sample-author'",
        );
        await rejects(write(document(), 'register-a'), '42501');
        await db.query(
          "UPDATE auth_principal SET active=true WHERE id='sample-author'",
        );
      },
    );
    const base = (
      await db.query(
        "SELECT a.*,r.study_id FROM run_assignment a JOIN experiment_run r USING(run_id) WHERE a.assignment_kind='MATERIAL' LIMIT 1",
      )
    ).rows[0];
    assert.ok(base);
    await db.query(
      `INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id,visibility) VALUES($1,'sample-author','sample-org','PRIVATE') ON CONFLICT(study_id) DO UPDATE SET responsible_user_id='sample-author',responsible_department_id='sample-org',visibility='PRIVATE'`,
      [base.study_id],
    );
    await db.query(
      `INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) VALUES('sample-plan',$1,'sample-author','EDIT_RUN_PLAN','sample-admin'),('sample-create',$1,'sample-author','CREATE_RUN','sample-admin')`,
      [base.study_id],
    );
    const newAssignment = async (
      c: PoolClient,
      domain: string,
      runId = base.run_id,
    ) => {
      const id = randomUUID();
      const row = {
        ...base,
        run_assignment_id: id,
        run_id: runId,
        assignment_domain_id: domain,
        run_operation_id: null,
        run_subject_id: null,
      };
      delete row.study_id;
      const columns = Object.keys(row).filter(
        (k) => !['definition_kind', 'grain_kind'].includes(k),
      );
      await c.query(
        `INSERT INTO run_assignment(${columns.join(',')}) SELECT ${columns.join(',')} FROM jsonb_populate_record(NULL::run_assignment,$1)`,
        [row],
      );
      await c.query('INSERT INTO run_material_usage VALUES($1,$2)', [
        id,
        base.assignment_reference_revision_id,
      ]);
      return id;
    };
    const transaction = async (fn: (c: PoolClient) => Promise<void>) => {
      const c = await db.connect();
      try {
        await c.query('BEGIN');
        await fn(c);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    };
    await t.test(
      'exact material mapping, preserved old unresolved usage, copy pins old revision not latest',
      async () => {
        assert.equal(
          (
            await db.query(
              'SELECT count(*) n FROM dxt_sample.run_assignment_link',
            )
          ).rows[0].n,
          '0',
        );
        await transaction(async (c) => {
          const id = await newAssignment(c, 'sample-plan');
          await c.query(
            "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
            [id],
          );
        });
        await transaction(async (c) => {
          const id = await newAssignment(c, 'sample-copy');
          await c.query(
            "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
            [id],
          );
        });
        const links = (
          await db.query(
            'SELECT m.sample_revision_id FROM dxt_sample.run_assignment_link l JOIN dxt_sample.material_mapping m ON m.id=l.mapping_id',
          )
        ).rows;
        assert.equal(links.length, 2);
        assert.ok(links.every((x) => x.sample_revision_id === 'sample-a-r1'));
        await rejects(
          db.query(
            "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
            [base.run_assignment_id],
          ),
          '23514',
        );
      },
    );
    await t.test(
      'current Plan writer delete/reinsert preserves stable linkage; explicit changed revision appends history',
      async () => {
        await transaction(async (c) => {
          await c.query(
            "DELETE FROM run_assignment WHERE run_id=$1 AND assignment_domain_id='sample-plan'",
            [base.run_id],
          );
          const id = await newAssignment(c, 'sample-plan');
          await c.query(
            "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','EDIT_RUN_PLAN',1)",
            [id],
          );
        });
        assert.equal(
          (
            await db.query(
              "SELECT count(*) n FROM dxt_sample.run_assignment_link WHERE assignment_domain_id='sample-plan'",
            )
          ).rows[0].n,
          '1',
        );
        const r2 = (
          await db.query(
            "SELECT id FROM dxt_sample.revision WHERE sample_id='sample-a' AND revision_number=2",
          )
        ).rows[0].id;
        await transaction(async (c) => {
          await c.query(
            "DELETE FROM run_assignment WHERE run_id=$1 AND assignment_domain_id='sample-plan'",
            [base.run_id],
          );
          const id = await newAssignment(c, 'sample-plan');
          await c.query(
            "SELECT dxt_sample.link_new_assignment('sample-author',$1,$2,'EDIT_RUN_PLAN',1)",
            [id, r2],
          );
        });
        assert.equal(
          (
            await db.query(
              "SELECT count(*) n FROM dxt_sample.run_assignment_link WHERE assignment_domain_id='sample-plan'",
            )
          ).rows[0].n,
          '2',
        );
        await rejects(
          db.query('UPDATE dxt_sample.run_assignment_link SET link_version=9'),
          '23514',
        );
      },
    );
    await t.test(
      'creator/admin cannot link without explicit capability; invalid commands rollback assignment and mapping',
      async () => {
        await db.query(
          "UPDATE study_access_grant SET active=false WHERE id='sample-plan'",
        );
        await rejects(
          transaction(async (c) => {
            const id = await newAssignment(c, 'denied-link');
            await c.query(
              "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
              [id],
            );
          }),
          '42501',
        );
        await db.query(
          "UPDATE study_access_grant SET active=true WHERE id='sample-plan'",
        );
        await rejects(
          transaction(async (c) => {
            const id = await newAssignment(c, 'admin-link');
            await c.query(
              "SELECT dxt_sample.link_new_assignment('sample-admin',$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
              [id],
            );
          }),
          '42501',
        );
        await rejects(
          transaction(async (c) => {
            const id = await newAssignment(c, 'null-link');
            await c.query(
              "SELECT dxt_sample.link_new_assignment(NULL,$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
              [id],
            );
          }),
          '42501',
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*) n FROM run_assignment WHERE assignment_domain_id IN ('denied-link','admin-link','null-link')",
            )
          ).rows[0].n,
          '0',
        );
      },
    );
    await t.test(
      'new Run copy retains exact revision under CREATE_RUN, not current latest',
      async () => {
        await transaction(async (c) => {
          const old = (
            await c.query('SELECT * FROM experiment_run WHERE run_id=$1', [
              base.run_id,
            ])
          ).rows[0];
          const runId = randomUUID();
          const copy = {
            ...old,
            run_id: runId,
            run_domain_id: 'sample-copy-run',
            run_number: 987,
          };
          await c.query(
            'INSERT INTO experiment_run SELECT (jsonb_populate_record(NULL::experiment_run,$1)).*',
            [copy],
          );
          const id = await newAssignment(c, 'copied-material', runId);
          await c.query(
            "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','CREATE_RUN',0)",
            [id],
          );
          const rows = (
            await c.query(
              'SELECT m.sample_revision_id FROM dxt_sample.run_assignment_link l JOIN dxt_sample.material_mapping m ON m.id=l.mapping_id WHERE l.run_id=$1',
              [runId],
            )
          ).rows;
          assert.deepEqual(rows, [{ sample_revision_id: 'sample-a-r1' }]);
        });
      },
    );
    await t.test(
      'legacy replacement cannot fabricate linkage; malformed snapshots and truncate fail',
      async () => {
        await rejects(
          transaction(async (c) => {
            await c.query(
              'DELETE FROM run_assignment WHERE run_assignment_id=$1',
              [base.run_assignment_id],
            );
            const id = await newAssignment(c, base.assignment_domain_id);
            await c.query(
              "SELECT dxt_sample.link_new_assignment('sample-author',$1,'sample-a-r1','EDIT_RUN_PLAN',0)",
              [id],
            );
          }),
          '23514',
        );
        await rejects(
          write(
            {
              ...document('malformed'),
              composition: {} as ReturnType<typeof document>['composition'],
            },
            'malformed',
          ),
          '23514',
        );
        await rejects(
          db.query('TRUNCATE dxt_sample.run_assignment_link'),
          '23514',
        );
      },
    );
    await t.test(
      'PUBLIC/untrusted role cannot forge actor, directly mutate tables or run entry functions',
      async () => {
        await db.query('CREATE ROLE sample_untrusted NOLOGIN');
        const c = await db.connect();
        try {
          await c.query('SET SESSION AUTHORIZATION sample_untrusted');
          await c.query("SELECT set_config('dxt.actor','sample-author',false)");
          await rejects(c.query('SET ROLE dxt_sample_function_owner'), '42501');
          await rejects(c.query('SET ROLE dxt_sample_service'), '42501');
          await rejects(
            c.query(
              "SELECT dxt_sample.allowed('sample-author','sample-org',NULL,'REGISTER_SAMPLE')",
            ),
            '42501',
          );
          await rejects(
            c.query("INSERT INTO dxt_sample.sample(id) VALUES('forged')"),
            '42501',
          );
        } finally {
          await c.query('RESET SESSION AUTHORIZATION');
          c.release();
        }
        const fn = (
          await db.query(
            "SELECT proconfig,prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='dxt_sample' AND proname='write_revision'",
          )
        ).rows[0];
        assert.equal(fn.prosecdef, true);
        assert.ok(
          fn.proconfig[0].startsWith(
            'search_path=pg_catalog, dxt_sample, public, pg_temp',
          ),
        );
      },
    );
    await t.test(
      'trusted service execute-only boundary can call commands but cannot mutate or create tables',
      async () => {
        const c = await db.connect();
        try {
          await c.query('SET SESSION AUTHORIZATION dxt_sample_service');
          await rejects(c.query('DELETE FROM dxt_sample.revision'), '42501');
          await rejects(
            c.query('CREATE TABLE public.forged_auth(x int)'),
            '42501',
          );
          const d = document('service-sample');
          validate(d);
          assert.equal(
            (
              await c.query(
                'SELECT (dxt_sample.write_revision($1,$2,$3,$4)).*',
                ['sample-author', 'service-register', 0, d],
              )
            ).rows[0].sample_id,
            'service-sample',
          );
          assert.equal(
            (
              await c.query(
                "SELECT * FROM dxt_sample.read_revisions('sample-author','service-sample')",
              )
            ).rows.length,
            1,
          );
        } finally {
          await c.query('RESET SESSION AUTHORIZATION');
          c.release();
        }
      },
    );
    await t.test(
      'readback on new connection preserves exact historical revision and links',
      async () => {
        const p2 = new Pool({ connectionString });
        try {
          assert.equal(
            (
              await p2.query(
                "SELECT metadata->>'id' id FROM dxt_sample.revision WHERE sample_id='sample-a' AND revision_number=1",
              )
            ).rows[0].id,
            'sample-a-r1',
          );
          assert.equal(
            (
              await p2.query(
                'SELECT count(*) n FROM dxt_sample.run_assignment_link',
              )
            ).rows[0].n,
            '4',
          );
        } finally {
          await p2.end();
        }
      },
    );
  } finally {
    await pool?.end();
    if (started)
      await run(join(bin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w']);
    await rm(dir, { recursive: true, force: true });
  }
});
