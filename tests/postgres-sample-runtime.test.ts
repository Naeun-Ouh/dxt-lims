import { cloneSampleRevision } from '@/src/application/sample-revision-clone';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { seedProductionSlice } from '@/src/infrastructure/postgres/slice-seed';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { provisionConfigurationCatalog } from '@/src/infrastructure/postgres/postgres-configuration-authoring';
import { provisionReasoningContexts } from '@/src/infrastructure/postgres/reasoning-context';
import { definitions } from '@/src/mock/reference';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { sampleOperation } from '@/src/infrastructure/postgres/sample-lifecycle';
import { handleSampleRequest } from '@/app/api/samples/route';
import { authorizedOperation } from '@/src/infrastructure/postgres/authorized-application';
import { dispatchRepository } from '@/app/api/repository/route';
import type {
  SampleAggregate,
  SampleDetail,
} from '@/src/application/sample-lifecycle';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { PlanningWorkspaceRecord } from '@/src/application/repository-ports';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';
import { draftFromSnapshot } from '@/src/application/run-draft';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import {
  createEmptyLifecycleState,
  recordActualExecution,
} from '@/src/features/run-registration/lifecycle-authoring';
import { readSampleSelections } from '@/src/infrastructure/postgres/sample-run-links';

void test('Sample runtime: isolated PostgreSQL, HTTP, exact Run links and explicit authority', async (t) => {
  const bin = process.env.DXT_POSTGRES_BIN;
  assert.ok(
    bin,
    'Native PostgreSQL path required; external connections never accepted',
  );
  const run = promisify(execFile),
    dir = await mkdtemp(join(tmpdir(), 'dxt-sample-runtime-')),
    data = join(dir, 'data'),
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
  let db: PgDatabase | undefined;
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
    db = new PgDatabase({
      connectionString: `postgresql://sample_test@127.0.0.1:${port}/postgres`,
    });
    const sql = db;
    t.diagnostic(
      (await sql.query<{ server_version: string }>('SHOW server_version'))
        .rows[0].server_version,
    );
    for (const f of (await readdir('src/infrastructure/postgres/migrations'))
      .filter((f) => /^\d{3}.*\.sql$/.test(f))
      .sort())
      await sql.query(
        await readFile(
          join('src/infrastructure/postgres/migrations', f),
          'utf8',
        ),
      );
    await seedProductionSlice(sql, configurationRepository);
    await sql.transaction((s) => provisionConfigurationCatalog(s, definitions));
    await provisionMeasurementReferences(sql, definitions);
    await provisionReasoningContexts(sql, lifecycleAuthoringProfiles);
    await sql.query(`INSERT INTO auth_org_unit(id,kind) VALUES('sample-org','DEPARTMENT'),('other-org','DEPARTMENT');
  INSERT INTO auth_principal VALUES('sample-writer','sample-writer',true,'GENERAL_USER'),('sample-viewer','sample-viewer',true,'GENERAL_USER'),('sample-admin','sample-admin',true,'ADMIN'),('sample-outsider','sample-outsider',true,'GENERAL_USER');
  INSERT INTO auth_membership VALUES('sample-writer','sample-org',false),('sample-viewer','sample-org',false),('sample-outsider','other-org',false);
  INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) SELECT study_id,'sample-writer','sample-org' FROM study ON CONFLICT(study_id) DO UPDATE SET responsible_user_id='sample-writer',responsible_department_id='sample-org',visibility='RESPONSIBLE_DEPARTMENT';`);
    for (const action of ['CREATE_RUN', 'EDIT_RUN_PLAN'])
      await sql.query(
        'INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) SELECT $1||study_id,study_id,$2,$3,$2 FROM study',
        [randomUUID(), 'sample-writer', action],
      );
    for (const [pid, action] of [
      ['sample-writer', 'READ_SAMPLE'],
      ['sample-writer', 'REGISTER_SAMPLE'],
      ['sample-writer', 'REVISE_SAMPLE'],
      ['sample-viewer', 'READ_SAMPLE'],
    ])
      await sql.query(
        'INSERT INTO dxt_sample.access_grant(id,owning_org_id,principal_id,action,granted_by) VALUES($1,$2,$3,$4,$5)',
        [`${pid}-${action}`, 'sample-org', pid, action, 'sample-admin'],
      );
    const api = async (input: unknown, pid = 'sample-writer') => {
      const r = await handleSampleRequest(
        new Request('http://localhost/api/samples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-principal-id': 'sample-writer',
            'x-role': 'ADMIN',
          },
          body: JSON.stringify(input),
        }),
        (raw) => sampleOperation(sql, pid, raw),
      );
      return {
        status: r.status,
        data: (await r.json()) as SampleDetail & {
          rows: unknown[];
          code?: string;
        },
      };
    };
    const ok = async (input: unknown, pid = 'sample-writer') => {
      const r = await api(input, pid);
      assert.equal(r.status, 200, JSON.stringify(r));
      return r.data;
    };
    const document = (revision = 1): SampleAggregate => ({
      owningOrgId: 'sample-org',
      sample: {
        id: 'contract-sample',
        sampleCode: 'AGENT TEST ONLY',
        name: 'Contract Sample',
        materialId: null,
        supplierId: null,
        description: null,
        status: 'Draft',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      revision: {
        id: `contract-r${revision}`,
        sampleId: 'contract-sample',
        revision,
        requestNumber: null,
        developmentItemNumber: null,
        registrationSource: 'DIRECT_REGISTRATION',
        effectiveAt: '2026-01-01T00:00:00.000Z',
        status: 'Draft',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      composition: {
        nodes: [
          {
            id: 'root',
            nodeType: 'SAMPLE_REVISION',
            referenceId: `contract-r${revision}`,
            label: 'Contract root',
          },
        ],
        edges: [],
      },
      properties: [
        {
          id: 'p0',
          materialNodeId: 'root',
          propertyDefinitionId: 'property-particle-size-v1',
          value: 0,
          unit: null,
          valueType: 'NUMBER',
          source: 'DIRECT_ENTRY',
          effectiveAt: null,
          evidenceId: null,
        },
      ],
    });
    const write = (
      aggregate: SampleAggregate,
      expectedLatest: number,
      commandId = randomUUID(),
      pid = 'sample-writer',
    ) => api({ operation: 'write', aggregate, expectedLatest, commandId }, pid);
    let first: SampleDetail;
    await t.test(
      'HTTP register persists immutable aggregate, zero value, idempotency and exact readback',
      async () => {
        const commandId = randomUUID();
        const a = await write(document(), 0, commandId);
        assert.equal(a.status, 200, JSON.stringify(a));
        first = a.data;
        assert.equal(first.properties[0].value, 0);
        assert.deepEqual((await write(document(), 0, commandId)).data, first);
        assert.equal(
          (await sql.query('SELECT count(*) n FROM dxt_sample.revision'))
            .rows[0].n,
          '1',
        );
      },
    );
    await t.test(
      'invalid graph, duplicate identity, typed value and unresolved reference persist nothing',
      async () => {
        const invalids = [
          () => {
            const d = document(2);
            d.composition.nodes.push({ ...d.composition.nodes[0] });
            return d;
          },
          () => {
            const d = document(2);
            d.properties[0].materialNodeId = 'missing';
            return d;
          },
          () => {
            const d = document(2);
            d.properties[0].value = 'not-number';
            return d;
          },
          () => {
            const d = document(2);
            d.composition.nodes.push({
              id: 'other',
              label: 'Other',
              nodeType: 'RAW_MATERIAL',
              referenceId: 'unverified',
            });
            d.composition.edges.push({
              id: 'e',
              parentNodeId: 'root',
              childNodeId: 'other',
              ratioValue: null,
              ratioUnit: null,
              order: 0,
            });
            return d;
          },
          () => {
            const d = document(2);
            d.composition.edges.push({
              id: 'loop',
              parentNodeId: 'root',
              childNodeId: 'root',
              ratioValue: null,
              ratioUnit: null,
              order: 0,
            });
            return d;
          },
        ];
        for (const make of invalids) {
          const r = await write(make(), 1);
          assert.ok([400, 409].includes(r.status), JSON.stringify(r));
        }
        assert.equal(
          (await sql.query('SELECT count(*) n FROM dxt_sample.revision'))
            .rows[0].n,
          '1',
        );
      },
    );
    await t.test(
      'viewer/admin/cross-org cannot register or revise; exact grant required; spoof headers ignored',
      async () => {
        assert.deepEqual(
          await ok({ operation: 'options' }, 'sample-viewer'),
          [],
        );
        assert.equal(
          (await write(document(2), 1, randomUUID(), 'sample-viewer')).status,
          403,
        );
        assert.equal(
          (await write(document(2), 1, randomUUID(), 'sample-admin')).status,
          403,
        );
        assert.equal(
          (
            await api(
              { operation: 'detail', id: 'contract-sample' },
              'sample-outsider',
            )
          ).status,
          404,
        );
        assert.deepEqual(
          (await ok({ operation: 'list' }, 'sample-outsider')).rows,
          [],
        );
      },
    );
    const call = (input: Record<string, unknown>, pid = 'sample-writer') =>
      authorizedOperation(sql, pid, input, dispatchRepository);
    const created = (await call({
      operation: 'run.create',
      slug: 'adhesion-material-optimization',
      commandId: randomUUID(),
    })) as RunPlanningSnapshot;
    let plan = (await call({
      operation: 'run.planning',
      runId: created.id,
    })) as PlanningWorkspaceRecord;
    const material = plan.snapshot.assignments.find(
      (a) => a.kind === 'MATERIAL',
    )!;
    assert.ok(material, 'existing specimen fixture material assignment');
    const key = material.id;
    const reload = async () =>
      (plan = (await call({
        operation: 'run.planning',
        runId: created.id,
      })) as PlanningWorkspaceRecord);
    const save = async (snapshot: RunPlanningSnapshot) => {
      await call({
        operation: 'run.plan.save',
        record: { ...plan, snapshot },
        command: { commandId: randomUUID(), expectedVersion: plan.version },
      });
      return reload();
    };
    await t.test(
      'authorized Plan selection and delete/reinsert writer preserve exact Revision and history',
      async () => {
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, sampleRevisionId: 'contract-r1' } : a,
          ),
        });
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)?.sampleRevisionId,
          'contract-r1',
        );
        const before = (
          await sql.query(
            'SELECT count(*) n FROM dxt_sample.run_assignment_link WHERE mapping_id IS NOT NULL',
          )
        ).rows[0].n;
        await save({
          ...plan.snapshot,
          intent: 'AGENT TEST ONLY unchanged selection',
        });
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)?.sampleRevisionId,
          'contract-r1',
        );
        assert.equal(
          (
            await sql.query(
              'SELECT count(*) n FROM dxt_sample.run_assignment_link WHERE mapping_id IS NOT NULL',
            )
          ).rows[0].n,
          before,
        );
        const detail = await ok({ operation: 'detail', id: 'contract-sample' });
        assert.equal(detail.usage[0].state, 'CURRENT');
      },
    );
    await t.test(
      'Plan reference replacement clears stale registered revision instead of remapping it',
      async () => {
        const original = plan.snapshot.assignments.find((a) => a.id === key)!;
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key
              ? { ...a, referenceId: 'formulation-f-base-01-r2' }
              : a,
          ),
        });
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)?.sampleRevisionId,
          null,
        );
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, referenceId: original.referenceId } : a,
          ),
        });
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, sampleRevisionId: 'contract-r1' } : a,
          ),
        });
      },
    );
    await t.test(
      'append Revision preserves old snapshot and stale expected-latest conflicts',
      async () => {
        assert.equal((await write(document(2), 1)).status, 200);
        assert.deepEqual(
          (
            await ok({
              operation: 'detail',
              id: 'contract-sample',
              revision: 1,
            })
          ).properties,
          first.properties,
        );
        assert.equal((await write(document(3), 1)).status, 409);
        await assert.rejects(
          sql.query(
            "UPDATE dxt_sample.revision SET properties='[]' WHERE id='contract-r1'",
          ),
          /append-only/,
        );
        await assert.rejects(
          sql.query('TRUNCATE dxt_sample.run_assignment_link'),
          /append-only/,
        );
      },
    );
    await t.test(
      'actual Run copy through Preview/Create pins selected r1 after newer r2 exists',
      async () => {
        const source = {
          seriesSlug: 'adhesion-material-optimization',
          source: 'EXISTING_RUN',
          sourceRunId: created.id,
          includeDraftOptions: true,
        };
        const p = (await call({
          operation: 'run.preview',
          input: source,
        })) as AuthoritativeRunPreview;
        const request = {
          ...source,
          sourceFingerprint: p.sourceFingerprint,
          draft: draftFromSnapshot(p.snapshot, p.options!),
        };
        const ready = (await call({
          operation: 'run.preview',
          input: request,
        })) as AuthoritativeRunPreview;
        assert.equal(ready.readiness.status, 'READY');
        const copied = (await call({
          operation: 'run.create.preview',
          input: request,
          fingerprint: ready.fingerprint,
          command: { commandId: randomUUID() },
        })) as RunPlanningSnapshot;
        assert.notEqual(copied.id, created.id);
        assert.ok(
          copied.assignments.some((a) => a.sampleRevisionId === 'contract-r1'),
        );
        assert.ok(
          !copied.assignments.some((a) => a.sampleRevisionId === 'contract-r2'),
        );
      },
    );
    await t.test(
      'clear/remove/re-add stable key never resurrects prior selection; history truth is explicit',
      async () => {
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, sampleRevisionId: null } : a,
          ),
        });
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)?.sampleRevisionId,
          null,
        );
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, sampleRevisionId: 'contract-r1' } : a,
          ),
        });
        const old = structuredClone(
          plan.snapshot.assignments.find((a) => a.id === key)!,
        );
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.filter((a) => a.id !== key),
        });
        delete old.sampleRevisionId;
        await save({
          ...plan.snapshot,
          assignments: [...plan.snapshot.assignments, old],
        });
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)?.sampleRevisionId,
          null,
        );
        const detail = await ok({ operation: 'detail', id: 'contract-sample' });
        assert.ok(
          detail.usage.some(
            (x: SampleDetail['usage'][number]) =>
              x.run === created.runNumber && x.state === 'HISTORICAL',
          ),
        );
        assert.ok(
          !detail.usage.some(
            (x: SampleDetail['usage'][number]) =>
              x.run === created.runNumber && x.state === 'CURRENT',
          ),
        );
      },
    );
    await t.test(
      'revoked READ hides selected revision, denies resave/copy; explicit clear is allowed',
      async () => {
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, sampleRevisionId: 'contract-r1' } : a,
          ),
        });
        await sql.query(
          "UPDATE dxt_sample.access_grant SET active=false WHERE id='sample-writer-READ_SAMPLE'",
        );
        await reload();
        const a = plan.snapshot.assignments.find((a) => a.id === key)!;
        assert.equal(a.sampleRevisionId, null);
        assert.equal(a.sampleAccessDenied, true);
        await assert.rejects(save(plan.snapshot), /unavailable/);
        const beforeRuns = (
          await sql.query('SELECT count(*) n FROM experiment_run')
        ).rows[0].n;
        const source = {
          seriesSlug: 'adhesion-material-optimization',
          source: 'EXISTING_RUN',
          sourceRunId: created.id,
          includeDraftOptions: true,
        };
        const preview = (await call({
          operation: 'run.preview',
          input: source,
        })) as AuthoritativeRunPreview;
        const input = {
          ...source,
          sourceFingerprint: preview.sourceFingerprint,
          draft: draftFromSnapshot(preview.snapshot, preview.options!),
        };
        const confirmation = (await call({
          operation: 'run.preview',
          input,
        })) as AuthoritativeRunPreview;
        await assert.rejects(
          call({
            operation: 'run.create.preview',
            input,
            fingerprint: confirmation.fingerprint,
            command: { commandId: randomUUID() },
          }),
          /unavailable/,
        );
        assert.equal(
          (await sql.query('SELECT count(*) n FROM experiment_run')).rows[0].n,
          beforeRuns,
        );
        const items = structuredClone(plan.snapshot.assignments);
        await readSampleSelections(
          sql,
          (
            await sql.query<{ run_id: string }>(
              'SELECT run_id FROM experiment_run WHERE run_domain_id=$1',
              [created.id],
            )
          ).rows[0].run_id,
          items,
        );
        assert.equal(items.find((x) => x.id === key)?.sampleAccessDenied, true);
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((x) =>
            x.id === key
              ? { ...x, sampleRevisionId: null, sampleAccessDenied: false }
              : x,
          ),
        });
        await sql.query(
          "UPDATE dxt_sample.access_grant SET active=true WHERE id='sample-writer-READ_SAMPLE'",
        );
      },
    );
    await t.test(
      'execution evidence freezes selected revision and rejects Plan mutation atomically',
      async () => {
        await save({
          ...plan.snapshot,
          assignments: plan.snapshot.assignments.map((a) =>
            a.id === key ? { ...a, sampleRevisionId: 'contract-r1' } : a,
          ),
        });
        await sql.query(
          "INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) SELECT $1,study_id,'sample-writer','RECORD_ACTUAL','sample-writer' FROM study WHERE series_slug='adhesion-material-optimization'",
          [randomUUID()],
        );
        const model = createExperimentWorkspace(
            plan.snapshot,
            configurationRepository,
          ),
          state = createEmptyLifecycleState(
            plan.snapshot,
            lifecycleAuthoringProfiles['adhesion-material-optimization'],
          );
        const actual = recordActualExecution(state, model, {
          id: randomUUID(),
          operationId: model.operations.find((o) => o.role === 'PROCESS')!.id,
          subjectId: model.subjects[0].id,
          status: 'COMPLETED',
          startedAt: '2026-01-01T00:00:00.000Z',
          endedAt: '2026-01-01T00:01:00.000Z',
          actualOverrides: {},
        });
        await call({
          operation: 'execution.save',
          runId: created.id,
          records: actual.actualEvidence,
          command: { commandId: randomUUID(), expectedVersion: 0 },
        });
        await assert.rejects(
          save({
            ...plan.snapshot,
            assignments: plan.snapshot.assignments.map((a) =>
              a.id === key ? { ...a, sampleRevisionId: null } : a,
            ),
          }),
          /locked/i,
        );
        await reload();
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)?.sampleRevisionId,
          'contract-r1',
        );
      },
    );
    await t.test(
      'Run Sample read locks grant policy before snapshot; concurrent revoke waits and next command redacts',
      async () => {
        let acquired!: () => void, release!: () => void;
        const locked = new Promise<void>((r) => {
            acquired = r;
          }),
          gate = new Promise<void>((r) => {
            release = r;
          });
        const gated: import('@/src/infrastructure/postgres/sql-database').SqlDatabase =
          {
            query: sql.query.bind(sql),
            close: async () => {},
            transaction: (work) =>
              sql.transaction((session) =>
                work({
                  query: async <
                    Q extends
                      import('@/src/infrastructure/postgres/sql-database').SqlRow,
                  >(
                    query: string,
                    args?: unknown[],
                  ) => {
                    const result = await session.query<Q>(query, args);
                    if (query === 'SELECT dxt_sample.lock_policy()') {
                      acquired();
                      await gate;
                    }
                    return result;
                  },
                }),
              ),
          };
        const pending = authorizedOperation(
          gated,
          'sample-writer',
          { operation: 'run.planning', runId: created.id },
          dispatchRepository,
        );
        await locked;
        let revoked = false;
        const revoke = sql
          .query(
            "UPDATE dxt_sample.access_grant SET active=false WHERE id='sample-writer-READ_SAMPLE'",
          )
          .then(() => {
            revoked = true;
          });
        await new Promise((r) => setTimeout(r, 40));
        assert.equal(revoked, false);
        release();
        const prior = (await pending) as PlanningWorkspaceRecord;
        assert.equal(
          prior.snapshot.assignments.find((a) => a.id === key)
            ?.sampleRevisionId,
          'contract-r1',
        );
        await revoke;
        await reload();
        assert.equal(
          plan.snapshot.assignments.find((a) => a.id === key)
            ?.sampleAccessDenied,
          true,
        );
        await sql.query(
          "UPDATE dxt_sample.access_grant SET active=true WHERE id='sample-writer-READ_SAMPLE'",
        );
        await reload();
      },
    );
    await t.test(
      'trusted backend role template serves HTTP without Sample table ownership',
      async () => {
        await sql.query(
          await readFile(
            'docs/implementation/issue-9/runtime-role-template.sql',
            'utf8',
          ),
        );
        await sql.query(`CREATE ROLE sample_service LOGIN;GRANT dxt_sample_runtime TO sample_service;
        GRANT USAGE ON SCHEMA public TO sample_service;GRANT SELECT ON ALL TABLES IN SCHEMA public TO sample_service;
        GRANT EXECUTE ON FUNCTION dxt_study_access_reason(text,uuid,text) TO sample_service;`);
        const service = new PgDatabase({
          connectionString: `postgresql://sample_service@127.0.0.1:${port}/postgres`,
        });
        try {
          const response = await handleSampleRequest(
            new Request('http://localhost/api/samples', {
              method: 'POST',
              body: JSON.stringify({
                operation: 'write',
                aggregate: document(3),
                expectedLatest: 2,
                commandId: randomUUID(),
              }),
            }),
            async (raw) => {
              try {
                return await sampleOperation(service, 'sample-writer', raw);
              } catch (e) {
                t.diagnostic(String(e));
                throw e;
              }
            },
          );
          assert.equal(
            response.status,
            200,
            JSON.stringify(await response.json()),
          );
          for (const query of [
            "UPDATE dxt_sample.revision SET properties='[]'",
            'UPDATE dxt_sample.access_grant SET active=false',
            'TRUNCATE dxt_sample.run_assignment_link',
          ])
            await assert.rejects(service.query(query), /permission denied/);
        } finally {
          await service.close();
        }
      },
    );
    await t.test(
      'client role cannot bypass trusted server using direct DML/function/GUC actor spoof',
      async () => {
        await sql.query('CREATE ROLE sample_client LOGIN');
        await sql
          .transaction(async (session) => {
            await session.query('SET SESSION AUTHORIZATION sample_client');
            try {
              await session.query("SET app.principal='sample-writer'");
              await assert.rejects(
                session.query(
                  "SELECT dxt_sample.allowed('sample-writer','sample-org',NULL,'READ_SAMPLE')",
                ),
                /permission denied/,
              );
            } finally {
              await session.query('RESET SESSION AUTHORIZATION');
            }
          })
          .catch((e) => {
            assert.match(String(e), /current transaction is aborted/);
          });
        const c = new PgDatabase({
          connectionString: `postgresql://sample_client@127.0.0.1:${port}/postgres`,
        });
        try {
          for (const query of [
            'SELECT * FROM dxt_sample.revision',
            'UPDATE dxt_sample.assignment_selection SET mapping_id=NULL',
            "SELECT dxt_sample.write_revision('sample-writer','spoof',0,'{}')",
            'SET ROLE sample_test',
          ])
            await assert.rejects(
              c.query(query),
              /permission denied|cannot set role/,
            );
        } finally {
          await c.close();
        }
      },
    );
    await t.test(
      'WP03: R1 → R2 and selected old R1 → R3 retain exact origin, optional reason and old Run usage',
      async () => {
        const beforeUsage = (
          await ok({ operation: 'detail', id: 'contract-sample', revision: 1 })
        ).usage;
        const firstDocument = document();
        firstDocument.sample.id = 'clone-sample';
        firstDocument.sample.sampleCode = 'CLONE AGENT TEST ONLY';
        firstDocument.revision.sampleId = 'clone-sample';
        firstDocument.revision.id = 'clone-r1';
        firstDocument.composition.nodes[0].referenceId = 'clone-r1';
        const r1 = await ok({
          operation: 'write',
          aggregate: firstDocument,
          expectedLatest: 0,
          commandId: randomUUID(),
        });
        assert.equal(r1.cloneOrigin, null);
        const revisionDocument = (source: SampleDetail, id: string) => {
          const d = cloneSampleRevision(source, id, '2026-01-02T00:00:00.000Z');
          d.revision.effectiveAt = '2026-01-02T00:00:00.000Z';
          return d;
        };
        const secondDocument = revisionDocument(r1, 'clone-r2');
        secondDocument.properties[0].value = 7;
        const r2 = await ok({
          operation: 'write',
          aggregate: secondDocument,
          expectedLatest: 1,
          copiedFromRevisionId: 'clone-r1',
          commandId: randomUUID(),
          changeReason: 'First controlled change',
        });
        assert.equal(r2.cloneOrigin?.copiedFromRevisionId, 'clone-r1');
        const oldSource = await ok({
          operation: 'detail',
          id: 'clone-sample',
          revision: 1,
        });
        const thirdDocument = revisionDocument(oldSource, 'clone-r3');
        assert.equal(thirdDocument.revision.revision, 3);
        assert.equal(thirdDocument.properties[0].value, 0);
        const command = {
          operation: 'write',
          aggregate: thirdDocument,
          expectedLatest: 2,
          copiedFromRevisionId: 'clone-r1',
          commandId: randomUUID(),
          changeReason: '',
        };
        const r3 = await ok(command);
        assert.deepEqual(r3.cloneOrigin, {
          copiedFromRevisionId: 'clone-r1',
          copiedFromRevision: 1,
          changeReason: null,
        });
        assert.deepEqual(
          (await ok(command)).cloneOrigin,
          r3.cloneOrigin,
          'same command retries exactly',
        );
        assert.equal(
          (await api({ ...command, copiedFromRevisionId: 'clone-r2' })).status,
          409,
          'receipt includes exact origin',
        );
        assert.equal(
          (await ok({ operation: 'detail', id: 'clone-sample', revision: 2 }))
            .properties[0].value,
          7,
        );
        assert.equal(
          (await ok({ operation: 'detail', id: 'clone-sample', revision: 1 }))
            .properties[0].value,
          0,
        );
        assert.deepEqual(
          (
            await ok({
              operation: 'detail',
              id: 'contract-sample',
              revision: 1,
            })
          ).usage,
          beforeUsage,
          'old Run links do not change',
        );
        assert.equal(
          r3.history.find((h) => h.revision === 3)?.copiedFromRevision,
          1,
        );
        const r4 = revisionDocument(r3, 'clone-r4');
        for (const source of ['missing-revision', 'contract-r1']) {
          const bad = await api({
            operation: 'write',
            aggregate: r4,
            expectedLatest: 3,
            copiedFromRevisionId: source,
            commandId: randomUUID(),
          });
          assert.equal(bad.status, 409, 'foreign/nonexistent origin rejected');
        }
        const races = await Promise.all(
          ['a', 'b'].map((suffix) =>
            api({
              operation: 'write',
              aggregate: revisionDocument(r3, `clone-r4-${suffix}`),
              expectedLatest: 3,
              copiedFromRevisionId: 'clone-r1',
              commandId: randomUUID(),
            }),
          ),
        );
        assert.deepEqual(races.map((r) => r.status).sort((a, b) => a - b), [200, 409]);
        const current = await ok({ operation: 'detail', id: 'clone-sample' });
        assert.equal(current.latestRevision, 4);
        assert.equal(current.history.length, 4);
        for (const pid of [
          'sample-viewer',
          'sample-admin',
          'sample-outsider',
        ]) {
          assert.equal(
            (
              await api(
                {
                  operation: 'write',
                  aggregate: revisionDocument(current, `denied-${pid}`),
                  expectedLatest: 4,
                  copiedFromRevisionId: 'clone-r1',
                  commandId: randomUUID(),
                },
                pid,
              )
            ).status,
            403,
          );
        }
        await sql.query(
          "UPDATE dxt_sample.access_grant SET active=false WHERE id='sample-writer-REVISE_SAMPLE'",
        );
        assert.equal(
          (await api(command)).status,
          403,
          'retry checks revoked capability',
        );
        await sql.query(
          "UPDATE dxt_sample.access_grant SET active=true WHERE id='sample-writer-REVISE_SAMPLE'",
        );
        for (const query of [
          "UPDATE dxt_sample.revision_clone_origin SET change_reason='changed'",
          'DELETE FROM dxt_sample.revision_clone_origin',
          'TRUNCATE dxt_sample.revision_clone_origin',
        ]) {
          await assert.rejects(sql.query(query), /append-only/i);
        }
        const legacy = await ok({
          operation: 'detail',
          id: 'contract-sample',
          revision: 2,
        });
        assert.equal(legacy.cloneOrigin, null, 'legacy source not inferred');
      },
    );
  } finally {
    await db?.close();
    if (started)
      await run(join(bin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w']);
    await rm(dir, { recursive: true, force: true });
  }
});
