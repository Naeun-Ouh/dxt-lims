# Issue #16 proposed migration validation evidence

Date: 2026-11-25 (Asia/Seoul). Base: PR #12 `819492221209a86487a1c12dbc7b1a9fb7f6a84a`.

**Architecture review candidate only. Not applied to the application or any UAT database.**

SQL SHA-256: `fed293baeb3d23fe307d7c796bd2732239d184b4e0d3b4de1f953f837706cfe0`.

Command (local PostgreSQL binary path is environment-specific):

```sh
DXT_POSTGRES_BIN=/Volumes/Postgres-2.9.6-18/Postgres.app/Contents/Versions/18/bin node docs/proposals/issue-16/validate-proposal.mjs
```

The runner created and removed its own disposable PostgreSQL cluster. Baseline migrations 001–015 and existing Measurement/Reasoning contracts produced the pre-migration history. The final SQL candidate was deliberately failed before commit, rolled back, then successfully applied and exercised in this isolated cluster only.

Exact final output:

```text
PASS baseline 001–015, old payloads/IDs/FKs byte-equivalent, all historical origins UNKNOWN_LEGACY
PASS two distinct versioned targets under same Study/package; legacy selection unchanged; revision CAS/idempotency/denied actor
PASS atomic ABSENT/SELECTED creation, exact context selection, same-study/package compatibility, missing-origin rollback
PASS adoption retry/conflict, two-connection race, deterministic sequence, history unchanged, all immutable guards
PASS legacy four-column insert/read, existing FK write, uniqueness conflicts; proposal not registered or deployed
SERVER 18.6 (Postgres.app)
✔ Issue 16 proposed migration on disposable PostgreSQL: compatibility, provenance and concurrent adoption (7786.779125ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8288.71675
```

Additional checks: changed-file `oxlint` (including type-aware rules) PASS; `git diff --check` PASS. No product TypeScript/build changes; no whole-product test-count claim from this proposal. No Human UAT or scientific acceptance inferred from SQL tests.

Runtime integration still required after exact SQL review: atomic origin write with trusted Principal, no-context-aware Run reads, historical exact-ID reads, expected interpretation sequence in authoring, and coordinated deployment. No migration registration is included.
