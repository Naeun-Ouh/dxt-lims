# Issue #16 proposed migration validation evidence

Date: 2026-11-26 (Asia/Seoul). Integrated authorization baseline: reviewed PR #21 `501b68ea06a11daf6f6de29b60e6d5fe5bade8f9` plus NULL fail-closed correction `d9fb191`.

**Architecture review candidate only. Not registered or applied to the application, production or any existing UAT database. No live permission changes.**

SQL SHA-256: `8d8e77b56edc641d20b7a0ced389aa7f263c9223ed4e19eea48a6cdfb5e49a15`.

Command:

```sh
PATH=/Users/naeunouh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
DXT_POSTGRES_BIN=/Volumes/Postgres-2.9.7-18/Postgres.app/Contents/Versions/18/bin \
node docs/proposals/issue-16/validate-proposal.mjs
```

The runner ignores DATABASE_URL, creates a random-port disposable PostgreSQL cluster, installs baseline migrations 001–015, and generates historical evidence using existing repository contracts. It injects failure before proposed COMMIT and verifies rollback, then applies the proposal **only inside this disposable cluster**. The cluster is stopped/removed in finally. Restricted roles, grants, memberships and visibility mutations are synthetic contract fixtures inside that cluster, not live grants or UAT state.

Exact final native output:

```text
PASS baseline 001–015, old payloads/IDs/FKs byte-equivalent, all historical origins UNKNOWN_LEGACY
PASS SQL/runtime nine-action parity: owner/admin explicit grants, revoked/expired, inactive principal, resource visibility, cross-org denial, unit scope and NULL fail-closed
PASS restricted DB role: caller-chosen actor/GUC/SET ROLE/function/direct-table/legacy-view bypass denied; trusted server still checks capability
PASS two distinct versioned targets under same Study/package; legacy selection unchanged; revision CAS/idempotency/denied actor
PASS atomic ABSENT/SELECTED creation, exact context selection, same-study/package compatibility, missing-origin rollback
PASS proposed authoring guard: exact context/sequence, denied actor, observed Run-lock contention, stale authoring after adoption
PASS adoption retry/conflict, two-connection race, deterministic sequence, history unchanged, all immutable guards
PASS legacy four-column insert/read, existing FK write, uniqueness conflicts; proposal not registered or deployed
SERVER 18.7 (Postgres.app)
✔ Issue 16 proposed migration on disposable PostgreSQL: compatibility, provenance and concurrent adoption (2710.310125ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2899.767833
```

Additional checks: tracked-source TypeScript with the new contract included PASS; changed-file type-aware oxlint PASS; `git diff --check` PASS. The worktree uses an ignored copy of the root hosting metadata required by vite.config's TypeScript import; no product configuration changed.

This is one native proposal test containing the above contracts, not a deployed-feature or Human UAT claim. The parent separately validated the PR #21 NULL follow-up with full 349-test regression, full native PostgreSQL contracts, TSC, lint and production build; this proposal does not repeat or reattribute those as runtime #16 implementation evidence.

## Exact limitations and remaining gates

- Runtime still uses its approved inline policy; the future coordinated release must replace it with the proposed shared SQL helper. No dual policy may remain at rollout.
- Existing Run create/Next Run repository paths are inventoried, but **not yet adapted** to atomic origin. The current seed creates only Study/configuration. No production Run import writer exists. The deferred guard rejects missing-origin direct inserts; this is not evidence that all future runtime writers are implemented.
- SQL authoring guard/CAS/race primitives are tested. Existing Evaluation/Decision repositories still need expected-context/sequence input, unchanged historical retry ordering and exact context projections before deployment.
- Legacy INSERT compatibility is verified under the protected deployer. The proposed trusted-server ACL intentionally denies direct compatibility-view writes; existing bootstrap writers need coordinated command adaptation.
- Synthetic SQL target payloads test immutable identity/provenance. Scientific payload/measurement-catalog validation remains required in the future trusted application command and is not fabricated by these fixtures.
- Production ACL/role membership inventory, external dependencies, privilege transition review, coordinated cutover/restore rehearsal and bounded Human UAT remain mandatory. No claim of production role isolation is made from disposable-role tests.
- Sample schema proposal 017 is a separate approval gate. Migration 016 remains PROPOSED/unregistered; no PR merge.

Human acceptance: **NOT RUN**.
