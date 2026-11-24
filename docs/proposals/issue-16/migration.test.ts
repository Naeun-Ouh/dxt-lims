import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { Pool } from 'pg';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { seedProductionSlice } from '@/src/infrastructure/postgres/slice-seed';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { provisionMeasurementReferences } from '@/src/infrastructure/postgres/measurement-references';
import { provisionReasoningContexts } from '@/src/infrastructure/postgres/reasoning-context';
import { productionMeasurementContract } from '@/tests/postgres-measurement-contract';
import { productionReasoningContract } from '@/tests/postgres-reasoning-contract';

void test('Issue 16 proposed migration on disposable PostgreSQL: compatibility, provenance and concurrent adoption', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dxt-issue16-review-'));
  const bin = process.env.DXT_POSTGRES_BIN;
  assert.ok(
    bin,
    'Explicit native PostgreSQL bin is required; no existing database is accepted',
  );
  const run = promisify(execFile);
  const data = join(directory, 'data');
  const socket = join(directory, 'socket');
  await mkdir(socket);
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
  let started = false;
  let db: PgDatabase | undefined;
  let pool: Pool | undefined;
  try {
    await run(join(bin, 'initdb'), [
      '-D',
      data,
      '-U',
      'dxt_test',
      '--auth=trust',
      '--no-locale',
      '--encoding=UTF8',
    ]);
    await run(join(bin, 'pg_ctl'), [
      '-D',
      data,
      '-l',
      join(directory, 'postgres.log'),
      '-o',
      `-p ${port} -h 127.0.0.1 -k ${socket}`,
      'start',
      '-w',
    ]);
    started = true;
    const connectionString = `postgresql://dxt_test@127.0.0.1:${port}/postgres`;
    db = new PgDatabase({ connectionString, max: 2 });
    pool = new Pool({ connectionString, max: 4 });
    const q = (sql: string, args: unknown[] = []) => pool!.query(sql, args);
    const baseline = 'src/infrastructure/postgres/migrations';
    for (const file of (await readdir(baseline))
      .filter((f) => /^\d{3}.*\.sql$/.test(f))
      .sort())
      await q(await readFile(join(baseline, file), 'utf8'));
    await seedProductionSlice(db, configurationRepository);
    await provisionMeasurementReferences(db, definitions);
    await provisionReasoningContexts(db, lifecycleAuthoringProfiles);
    // Existing repository contracts produce real pre-migration Evaluation/Decision rows.
    await productionReasoningContract(
      db,
      await productionMeasurementContract(db),
    );
    const oldContexts = (await q('SELECT * FROM reasoning_context ORDER BY id'))
      .rows;
    const oldEvaluations = (
      await q('SELECT * FROM engineer_evaluation ORDER BY id')
    ).rows;
    const oldDecisions = (await q('SELECT * FROM decision ORDER BY id')).rows;
    assert.ok(oldEvaluations.length && oldDecisions.length);
    const oldRuns = (await q('SELECT * FROM experiment_run ORDER BY run_id'))
      .rows;
    await q(
      "INSERT INTO auth_principal VALUES ('review-author','review-author',true,'GENERAL_USER'),('review-denied','review-denied',true,'GENERAL_USER'),('review-admin','review-admin',true,'ADMIN')",
    );
    await q(
      "INSERT INTO auth_org_unit VALUES('review-dept','DEPARTMENT',NULL)",
    );
    await q(
      "INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) SELECT study_id,'review-author','review-dept' FROM study",
    );
    await q(
      "INSERT INTO study_access_grant(id,study_id,principal_id,action,granted_by) SELECT study_id::text,study_id,'review-author','MANAGE_REASONING_CONTEXT','review-author' FROM study",
    );

    const sql = await readFile(
      'docs/proposals/issue-16/016_run_reasoning_provenance.PROPOSED.sql',
      'utf8',
    );
    await assert.rejects(
      q(sql.replace('COMMIT;', 'SELECT 1/0; COMMIT;')),
      /division by zero/,
    );
    await q('ROLLBACK');
    assert.equal(
      (
        await q(
          "SELECT relkind FROM pg_class WHERE oid='reasoning_context'::regclass",
        )
      ).rows[0].relkind,
      'r',
    );
    assert.equal(
      (await q("SELECT to_regclass('run_reasoning_origin') AS id")).rows[0].id,
      null,
    );
    assert.deepEqual(
      (await q('SELECT * FROM reasoning_context ORDER BY id')).rows,
      oldContexts,
    );
    await q(sql);
    assert.deepEqual(
      (await q('SELECT * FROM reasoning_context ORDER BY id')).rows,
      oldContexts,
    );
    assert.deepEqual(
      (await q('SELECT * FROM engineer_evaluation ORDER BY id')).rows,
      oldEvaluations,
    );
    assert.deepEqual(
      (await q('SELECT * FROM decision ORDER BY id')).rows,
      oldDecisions,
    );
    assert.deepEqual(
      (await q('SELECT * FROM experiment_run ORDER BY run_id')).rows,
      oldRuns,
    );
    assert.equal(
      (
        await q(
          "SELECT count(*)::int n FROM run_reasoning_origin WHERE state='UNKNOWN_LEGACY' AND context_id IS NULL",
        )
      ).rows[0].n,
      oldRuns.length,
    );
    assert.equal(
      (
        await q(
          'SELECT count(*)::int n FROM run_reasoning_resolution WHERE interpretation_context_id IS NOT NULL',
        )
      ).rows[0].n,
      0,
    );
    const fks = (
      await q(
        "SELECT conrelid::regclass::text AS source,confrelid::regclass::text AS target FROM pg_constraint WHERE contype='f' AND conrelid IN ('engineer_evaluation'::regclass,'decision'::regclass,'study_initial_reasoning_receipt'::regclass,'study_reasoning_adoption'::regclass) AND confrelid='reasoning_criteria_revision'::regclass",
      )
    ).rows;
    assert.equal(fks.length, 5);
    console.log(
      'PASS baseline 001–015, old payloads/IDs/FKs byte-equivalent, all historical origins UNKNOWN_LEGACY',
    );

    const original = oldContexts[0];
    const template = oldRuns.find(
      (r) =>
        r.study_id === original.study_id &&
        r.configuration_package_version_id === original.package_version_id,
    )!;
    assert.ok(template);
    const definition = original.id;
    const a = randomUUID();
    const b = randomUUID();
    // SQL contract values only: not UAT data, not claims of validated scientific criteria.
    const payloadA = {
      testOnly: true,
      target: { id: 'TEST-A', threshold: 10 },
    };
    const payloadB = {
      testOnly: true,
      target: { id: 'TEST-B', threshold: 20 },
    };
    const revise = (
      id: string,
      expected: number,
      payload: unknown,
      actor = 'review-author',
    ) =>
      q('SELECT create_reasoning_criteria_revision($1,$2,$3,$4,$5,$6,$7) id', [
        id,
        definition,
        original.study_id,
        original.package_version_id,
        expected,
        actor,
        payload,
      ]);
    await revise(a, 1, payloadA);
    await revise(b, 2, payloadB);
    assert.equal((await revise(b, 2, payloadB)).rows[0].id, b);
    await assert.rejects(
      revise(randomUUID(), 2, payloadB),
      /Criteria revision changed/,
    );
    await assert.rejects(revise(b, 2, payloadA), /identity reused/);
    await assert.rejects(
      revise(randomUUID(), 3, payloadB, 'review-admin'),
      /explicit capability/,
    );
    assert.deepEqual(
      (await q('SELECT * FROM reasoning_context ORDER BY id')).rows,
      oldContexts,
    );
    assert.deepEqual(
      (
        await q('SELECT payload FROM reasoning_criteria_revision WHERE id=$1', [
          a,
        ])
      ).rows[0].payload,
      payloadA,
    );
    assert.deepEqual(
      (
        await q('SELECT payload FROM reasoning_criteria_revision WHERE id=$1', [
          b,
        ])
      ).rows[0].payload,
      payloadB,
    );
    console.log(
      'PASS two distinct versioned targets under same Study/package; legacy selection unchanged; revision CAS/idempotency/denied actor',
    );

    let number = 9000;
    const freshRun = () => ({
      ...template,
      run_id: randomUUID(),
      run_domain_id: `review-${randomUUID()}`,
      run_number: ++number,
    });
    const insertRun =
      'INSERT INTO experiment_run SELECT (jsonb_populate_record(NULL::experiment_run,$1)).*';
    const create = async (
      state: string,
      context: string | null = null,
      actor = 'review-author',
    ) => {
      const record = freshRun();
      const client = await pool!.connect();
      try {
        await client.query('BEGIN');
        await client.query(insertRun, [record]);
        await client.query(
          'INSERT INTO run_reasoning_origin(run_id,state,context_id,principal_id,evidence) VALUES($1,$2,$3,$4,$5)',
          [record.run_id, state, context, actor, 'Isolated contract creation'],
        );
        await client.query('COMMIT');
        return record.run_id;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
    const absent = await create('ABSENT');
    const selectedA = await create('SELECTED', a);
    const selectedB = await create('SELECTED', b);
    const resolve = async (id: string) =>
      (await q('SELECT * FROM run_reasoning_resolution WHERE run_id=$1', [id]))
        .rows[0];
    assert.equal((await resolve(absent)).interpretation_context_id, null);
    assert.equal((await resolve(selectedA)).interpretation_context_id, a);
    assert.equal((await resolve(selectedB)).interpretation_context_id, b);
    await assert.rejects(create('SELECTED'), /check constraint/);
    await assert.rejects(create('ABSENT', a), /check constraint/);
    await assert.rejects(create('UNKNOWN_LEGACY'), /migration-only/);
    await assert.rejects(
      create(
        'SELECTED',
        oldContexts.find((c) => c.study_id !== original.study_id)!.id,
      ),
      /exact Run Study\/package/,
    );
    await assert.rejects(
      create('SELECTED', a, 'review-admin'),
      /denied|explicit capability/,
    );
    const withoutOrigin = freshRun();
    await assert.rejects(q(insertRun, [withoutOrigin]), /atomically/);
    assert.equal(
      (
        await q('SELECT 1 FROM experiment_run WHERE run_id=$1', [
          withoutOrigin.run_id,
        ])
      ).rowCount,
      0,
    );
    const otherPackage = (
      await q(
        'SELECT package_version_id FROM configuration_package_version WHERE package_version_id<>$1 LIMIT 1',
        [original.package_version_id],
      )
    ).rows[0].package_version_id;
    const wrongPackage = randomUUID();
    await q('SELECT create_reasoning_criteria_revision($1,$1,$2,$3,0,$4,$5)', [
      wrongPackage,
      original.study_id,
      otherPackage,
      'review-author',
      payloadB,
    ]);
    await assert.rejects(
      create('SELECTED', wrongPackage),
      /exact Run Study\/package/,
    );
    console.log(
      'PASS atomic ABSENT/SELECTED creation, exact context selection, same-study/package compatibility, missing-origin rollback',
    );

    const adopt = (
      rid: string,
      ctx: string,
      expected: number,
      command: string = randomUUID(),
      actor = 'review-author',
      hash = 'test-hash',
    ) =>
      q('SELECT append_run_reasoning_adoption($1,$2,$3,$4,$5,$6,$7,$8) id', [
        randomUUID(),
        rid,
        ctx,
        expected,
        actor,
        command,
        hash,
        'Isolated contract interpretation choice',
      ]);
    const first = await adopt(absent, a, 0, 'repeat');
    assert.deepEqual((await adopt(absent, a, 0, 'repeat')).rows, first.rows);
    await assert.rejects(adopt(absent, b, 0, 'repeat'), /identity reused/);
    await assert.rejects(adopt(absent, b, 0), /selection changed/);
    await assert.rejects(
      adopt(absent, b, 1, 'denied', 'review-denied'),
      /explicit capability/,
    );
    const race = await Promise.allSettled([
      adopt(absent, b, 1),
      adopt(absent, a, 1),
    ]);
    assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(race.filter((r) => r.status === 'rejected').length, 1);
    assert.match(
      String(
        (race.find((r) => r.status === 'rejected') as PromiseRejectedResult)
          .reason,
      ),
      /selection changed/,
    );
    const rows = (
      await q(
        'SELECT * FROM run_reasoning_interpretation_adoption WHERE run_id=$1 ORDER BY sequence',
        [absent],
      )
    ).rows;
    assert.deepEqual(
      rows.map((r) => Number(r.sequence)),
      [1, 2],
    );
    assert.equal((await resolve(absent)).origin_state, 'ABSENT');
    assert.equal((await resolve(absent)).creation_context_id, null);
    assert.equal(
      (await resolve(absent)).interpretation_context_id,
      rows[1].context_id,
    );
    const repeatRace = await Promise.all([
      adopt(absent, b, 2, 'concurrent-repeat'),
      adopt(absent, b, 2, 'concurrent-repeat'),
    ]);
    assert.deepEqual(repeatRace[0].rows, repeatRace[1].rows);
    assert.equal(
      (
        await q(
          'SELECT count(*)::int n FROM run_reasoning_interpretation_adoption WHERE run_id=$1 AND command_id=$2',
          [absent, 'concurrent-repeat'],
        )
      ).rows[0].n,
      1,
    );
    const historical = template.run_id;
    await adopt(historical, b, 0);
    assert.equal((await resolve(historical)).origin_state, 'UNKNOWN_LEGACY');
    assert.deepEqual(
      (await q('SELECT * FROM engineer_evaluation ORDER BY id')).rows,
      oldEvaluations,
    );
    assert.deepEqual(
      (await q('SELECT * FROM decision ORDER BY id')).rows,
      oldDecisions,
    );
    for (const table of [
      'reasoning_criteria_revision',
      'reasoning_criteria_definition',
      'study_legacy_reasoning_selection',
      'run_reasoning_origin',
      'run_reasoning_interpretation_adoption',
      'reasoning_context',
    ]) {
      await assert.rejects(q(`DELETE FROM ${table}`), /immutable/);
      const column =
        table === 'run_reasoning_origin'
          ? 'evidence'
          : table === 'run_reasoning_interpretation_adoption'
            ? 'rationale'
            : table === 'study_legacy_reasoning_selection'
              ? 'package_version_id'
              : 'id';
      await assert.rejects(
        q(`UPDATE ${table} SET ${column}=${column}`),
        /immutable/,
      );
    }
    await assert.rejects(q('TRUNCATE run_reasoning_origin'), /immutable/);
    console.log(
      'PASS adoption retry/conflict, two-connection race, deterministic sequence, history unchanged, all immutable guards',
    );

    // Existing four-column INSERT callers keep their contract and uniqueness.
    const legacy = randomUUID();
    const newPackage = (
      await q(
        'SELECT package_version_id FROM configuration_package_version p WHERE NOT EXISTS(SELECT 1 FROM reasoning_context c WHERE c.study_id=$1 AND c.package_version_id=p.package_version_id) LIMIT 1',
        [original.study_id],
      )
    ).rows[0].package_version_id;
    await q('INSERT INTO reasoning_context VALUES($1,$2,$3,$4)', [
      legacy,
      original.study_id,
      newPackage,
      payloadA,
    ]);
    assert.equal(
      (await q('SELECT id FROM reasoning_context WHERE id=$1', [legacy]))
        .rows[0].id,
      legacy,
    );
    await assert.rejects(
      q('INSERT INTO reasoning_context VALUES($1,$2,$3,$4)', [
        randomUUID(),
        original.study_id,
        newPackage,
        payloadB,
      ]),
      /duplicate key/,
    );
    await q(
      'INSERT INTO study_reasoning_adoption(study_id,command_id,context_id,source_context_id,request_hash) VALUES($1,$2,$3,$4,$5)',
      [
        original.study_id,
        'legacy-write-check',
        legacy,
        original.id,
        'test-only',
      ],
    );
    assert.equal(
      (
        await q(
          'SELECT context_id FROM study_reasoning_adoption WHERE command_id=$1',
          ['legacy-write-check'],
        )
      ).rows[0].context_id,
      legacy,
    );
    console.log(
      'PASS legacy four-column insert/read, existing FK write, uniqueness conflicts; proposal not registered or deployed',
    );
    console.log(
      'SERVER',
      (await q('SHOW server_version')).rows[0].server_version,
    );
  } finally {
    await pool?.end();
    await db?.close();
    if (started)
      await run(join(bin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w']);
    await rm(directory, { recursive: true, force: true });
  }
});
