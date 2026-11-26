# Issue #9 Sample runtime implementation

## Runtime boundary

Migration `018_sample_lifecycle.sql` is registered after shared authority 016. It does not require reasoning tables from 017. Apply only in reviewed, fresh disposable development environments until the separate Sample deployment approval gate is satisfied. Existing UAT/live grants and data are untouched.

The trusted server resolves the principal before dispatch. `/api/samples` accepts no actor or role from request headers/body. `sampleOperation` validates the complete aggregate and obtains fixed policy locks before its repeatable-read snapshot. Run operations that project or link Sample selections acquire the same lock before their first principal/policy read. Other Study/reasoning commands do not call the Sample helper.

`dxt_sample.lock_policy()` is a no-argument, fixed-table SECURITY DEFINER lock helper, with PUBLIC execution revoked. It grants no resource access. This avoids granting authorization-table UPDATE merely to obtain a SHARE lock. Grant resolution still requires active explicit READ_SAMPLE / REGISTER_SAMPLE / REVISE_SAMPLE scopes; ordinary membership only matches an explicitly granted unit, and creator/administrator status never implies scientific capability.

`runtime-role-template.sql` defines the actual Sample runtime privileges: SELECT on Sample tables; INSERT on mapping/history/current selection; UPDATE on current selection; EXECUTE on the validated command entrypoints. This is a **trusted server** role, not a browser or end-user SQL role. It has no grant-table DML, immutable-revision DML, DELETE, TRUNCATE, ownership or schema CREATE. Existing public repository permissions and dedicated function-owner deployment remain a separate reviewed environment setup. Tests prove the Sample HTTP command with a non-owner service role and reject a separate client role's function/DML/GUC impersonation attempts.

## Persistence and provenance

Sample identity is organization-scoped and immutable. Every revision atomically appends its existing domain metadata, full composition graph and property values. Expected-latest comparison and actor-scoped idempotency receipts reject stale or changed retries. Exact historical revision routes reload immutable snapshots.

Validation covers graph uniqueness, one revision root, connected nodes, edge endpoints, cycles, nonnegative ratios, property-node membership and typed values (including numeric zero). Referenced Sample revisions require scoped READ; raw/intermediate composition references require an existing exact readable configuration reference. Supplier/material identity remains NULL because no authoritative operational mapping is available. PropertyDefinitionId is currently retained under the existing property aggregate semantics; its storage **does not claim authoritative catalog binding**. Master-driven property selection and reference closure are a separate follow-up, not invented scientific defaults in this change.

A Run material assignment retains its exact configuration reference. An explicit selected Sample Revision adds an exact package/reference/revision mapping and append-only linkage history. A separate current selection table records SELECTED, CLEARED or REMOVED; current selection is never inferred from history. Clearing/removing and re-adding an identical stable assignment key cannot resurrect an old link. Existing Plan deletion/reinsertion of physical assignment rows preserves explicitly retained selection without deleting history. Replacing a material reference clears a carried Sample link rather than silently remapping it. Existing unresolved assignment inventory remains unresolved and cannot be retrospectively linked.

Run copies preserve an explicitly selected revision, even after a newer Sample revision exists. Losing READ permission redacts the revision and marks the selection unavailable; save/copy is rejected until it is explicitly cleared or access restored. No fallback to latest occurs. Plan lock rules and Actual evidence remain unchanged. Usage UI distinguishes current Plan selection from historical selections and never claims Actual consumption.

## UI

One KO/EN implementation supports catalog search, exact detail, immutable history, registration, revision creation, composition/property authoring, and permission-aware disabled actions. Errors preserve form state and use actionable localized copy. Local datetime input is held as a local string and converted once on submit. Run Draft uses an exact revision picker. Existing unlocked Plan material rows and existing Subject overrides expose compact revision lookup/clear controls; changes remain local until Save Plan. Plan Inspector provides the selected revision detail link. Modal selection uses native dialog focus behavior.

## Validation

Command:

```
DXT_POSTGRES_BIN=/Volumes/Postgres-2.9.7-18/Postgres.app/Contents/Versions/18/bin node tests/run-sample-runtime.mjs
```

Native PostgreSQL 18.7, new temporary cluster only: **14/14 tests PASS** (13 cases plus suite). The suite executes actual Sample HTTP handlers and the existing authorized Run Preview/Create/Save/readback boundary. It covers full aggregate rollback, permissions, zero, immutable revisions, exact Run copy, clear/remove/re-add, reference replacement, denied copy rollback, execution lock, concurrent grant revocation, and restricted service/client roles. No existing environment URL is accepted by the runner.

UI/API esbuild bundles pass. Focused TypeScript passes for all tracked application/tests plus new Sample files (excluding vite.config whose pre-existing `.openai/hosting.json` is not present in the isolated worktree); parent integration owns full build/TypeScript/regression validation. Changed Sample files pass lint. Browser/Human acceptance is recorded separately by the parent; automated tests are not Human acceptance.
