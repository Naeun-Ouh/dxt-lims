# Production Adapter Slice 2 — Actual Execution

Status: implemented and verified locally against native PostgreSQL 18 and the existing Actual UI on 2026-09-16. This is a bounded persistence slice, not a production deployment or completion of the downstream lifecycle.

## Authoritative path

Frozen Actual UI → `DxtApplication.recordActual` → `ExecutionRepository` → HTTP transport → server application validation → `PostgresExecutionRepository` → PostgreSQL transaction. After save, the client application makes a separate Execution query and renders that query's result. No Browser, InMemory, fixture Actual, or mock downstream fallback is used in this path.

Production composition owns Configuration, Study, Run Plan and Execution. Measurement, Analysis persistence, Evaluation, Decision and NextAction production adapters remain unsupported. The existing Record Measurement action remains visible; selecting it returns an explicit unsupported-repository error. The existing header's “Mock environment” describes the local test environment; it is not evidence of a repository fallback.

The verified routes are created Runs backed by Slice 1, not the historical fixture demonstration routes:

- `http://localhost:3100/series/dts-improvement/runs/19/engineering-grid?view=actual`
- `http://localhost:3100/series/adhesion-material-optimization/runs/4/engineering-grid?view=actual`

## Frozen behavior and ownership

`recordActualExecution` previously replaced the current evidence for one Subject/Operation with a new command-derived event identity. That behavior remains. No event-sourcing model, approval states, new science concepts, or Core Domain fields were introduced.

The port adds `getStateByRun(): { version, records }`. `getByRun()` remains compatible for evidence readers. `saveByRun()` accepts the existing complete current-evidence collection plus command ID and expected version and returns the persisted command result. The version belongs to Execution state, independent of the Run Plan version. It is passed through application authoring state as repository metadata.

Physical re-authoring inserts new evidence, changes the current pointer, and retains prior evidence for exact references and retry receipts. Unchanged evidence identities are reused after exact-content verification. Reusing an identity with changed content is rejected. Evidence and receipts cannot be updated or deleted. Reads use the current pointer directly; there is no event replay. There is no history UI or enterprise audit subsystem in this slice.

## Migration and physical records

Migration `002_actual_execution.sql` is incremental. Applied migration 001 was not edited. `npm run db:migrate` (and the compatible `db:migrate:slice1` alias) runs ordered checksum-verified migrations under a transaction/advisory lock. Reapplying verifies checksums and skips applied migrations.

- `execution_state`: one Execution aggregate version per technical Run UUID.
- `execution_event`: immutable evidence identity, Run/RunSubject/RunOperation UUID references, exact planned-item string, frozen observed context, status, timestamps, source metadata and optional identity attributes.
- `execution_observed_value`: ordered frozen string values and exact Definition Descriptor revision references. No inferred scientific type or identity.
- `execution_current`: current event per Run/Subject/Operation, ordered to preserve the frozen collection.
- `execution_command_receipt`: unique `(run_id, command_id)`, canonical request hash, successful result version.
- `execution_command_result`: ordered event references belonging to that command's result. Values are not copied into receipts.

No Measurement tables, FK stubs, binaries, or object storage were added. Plan measurement-plan tables from Slice 1 remain intentions only.

## Identity and Plan integrity

Run-domain ID, Subject-domain ID and Operation-domain ID are exact existing application identities, resolved to persisted technical UUIDs. There is no join by display label, operation name, lot, wafer slot, or specimen description. Human-readable-looking Subject IDs retain their pre-existing identity semantics; no physical identity resolver was added.

Composite FKs bind an event to RunSubject and RunOperation within the same Run, plus the existing RunSubjectOperation membership. Current pointers reference the same full event membership tuple. Application and repository validation reject incompatible planned-item references. The frozen planned identity is `planned:{runId}:{subjectId}:{operationId}`; a nullable reference remains nullable for evidence already supported by the model. The authoring command always supplies the exact planned identity.

Actual observed values never update Run assignments, Run version, Study defaults or FIXED/VARIED. Tests prove both a VARIED value stays VARIED and a differing FIXED value stays FIXED. `CHANGED` remains the value comparison, independent of scientific intent.

The frozen evidence model stores observed equipment/recipe/resource values as strings, not separately resolved Actual equipment revision IDs. This slice preserves those exact strings and does not infer master-data identity. Definition IDs in observed values are exact registered Descriptor revisions with DB FKs. Adding richer Actual resource/reference semantics requires a future domain requirement.

## Transactions, retries and concurrency

One write uses real BEGIN/COMMIT/ROLLBACK:

1. Lock the persisted Run row to serialize Execution writes, without updating Plan.
2. Check the persisted command receipt. An identical retry returns its original version and evidence references, even after a subsequent edit; a different payload using the same command ID conflicts.
3. Read Execution's current version; missing state starts at zero. Require matching expectedVersion. An absent or stale token cannot silently overwrite.
4. Increment the independent Execution version. Validate exact membership/planned identity and insert new event/value records.
5. Replace current pointers, insert the command receipt and ordered result references, and query the persisted result.
6. Commit all writes together. Any failure rolls back events, values, pointers, version and receipt.

A separate query after commit feeds the Actual UI. A subsequent concurrent edit may legitimately be reflected in that query. The repository retry result itself remains the original command result.

Native tests issue competing saves through separate adapter instances on the same database/pool: exactly one succeeds; the stale request becomes application `CONFLICT`. HTTP transport preserves typed application errors; SQL errors are not shown to the user. The UI waits for save plus read-back before showing success, disables duplicate in-flight submission, and retains command identity for a same-payload retry after an uncertain response. Conflict recovery is an explicit reload; no merge/collaboration UI is added.

## Query and external boundaries

Actual stage loads Run and Execution only. It does not query Measurement/Evaluation/Decision. Run-scoped reads take a shared lock compatible with the writer's serialization lock, so version/current pointers/evidence are consistent. Evidence and value rows are fetched in batches. Primary/current indexes cover Run and Subject/Operation; additional indexes cover event Run/status and Subject/Operation. No enterprise query engine or virtualization was added.

The three frozen event statuses remain OBSERVED, COMPLETED, INTERRUPTED. UI projections remain NOT_EXECUTED/UNKNOWN/EXECUTED/PARTIAL as before. Source system and record strings can be empty; manual authoring uses `DXT Manual` and a DXT-generated command reference. No MES identity, Site, external service, or equipment integration is required. Optional identity context and source references round-trip, including null vs absent context. Timestamps are preserved as their original strings to avoid changing timezone/precision representation. No note field was invented; the current command has none.

## Proof performed

Native PostgreSQL 18 through `pg`, not only PGlite:

- Create new Wafer and Specimen Runs through Slice 1; capture full Plan snapshots.
- Record manual Actual, then override a VARIED and a FIXED value; read back both and compare full Plan unchanged.
- Shared Execution contract runs for PostgreSQL, InMemory and Browser: version increments, persisted retry, old receipt after later edit, changed-payload rejection, immutable identity, stale conflict and defensive read copies.
- Validate invalid Subject, Operation and planned-item membership rejection.
- Force failure in observed-value insertion after the state/event write. Event/value/receipt/result counts and the complete current state remain unchanged.
- Competing writers: one success, one CONFLICT, one version increment.
- Preserve external source metadata and identity context; exercise OBSERVED and INTERRUPTED as well as manual COMPLETED.
- Dispose adapters, stop/start native PostgreSQL, recreate application/adapters; compare both Runs and Execution states exactly.

Real browser proof used the existing UI on the PostgreSQL composition:

- DTS Improvement Run 19 / W01 / EXPOSURE: manual completed execution, Energy Plan 35 → Actual 37, CHANGED; Plan intent marker retained.
- Adhesion Material Optimization Run 4 / SP-01 / CURE: manual completed execution, Cure Temperature Plan 120 → Actual 122 °C, CHANGED; no MES or Site requirement.
- SQL inspection confirmed both records reference their exact persisted RunSubject/RunOperation and descriptor revisions.
- Terminated the app process, created a fresh process/pool, and reopened both Actual URLs. Both evidence values/statuses restored, with USER AUTHORED and Record Measurement still visible.
- Selecting Record Measurement explicitly reports the unsupported downstream repository; no mock downstream records appear.

Browser regression uses its persisted storage envelope and a recreated adapter in the shared contract. Legacy Browser execution/lifecycle storage remains readable; the new versioned envelope takes precedence only after a new save. Browser storage remains a demo adapter, without cross-tab transaction guarantees.

## Validation and remaining limits

Validation results are recorded at completion below. Both normal and PostgreSQL build profiles are checked. Native tests are independent of the long-lived browser proof database.

Deferred: all downstream production lifecycle adapters, auth, authorization, enterprise audit, deployment/connection operations, equipment/source integrations, binary evidence storage, import/export, workflow, AI and DOE. Execution concurrency is conservative per Run; per-Subject concurrent editing is not introduced. Existing fixture pages remain demo pages. No hosted production deployment is claimed.

## Changed files

- `src/application/repository-ports.ts`, `execution-record.ts`, `dxt-application.ts`
- `src/infrastructure/postgres/migrations/002_actual_execution.sql`, `postgres-execution-repository.ts`, `postgres-repositories.ts`, `unsupported-repositories.ts`
- `src/infrastructure/http/http-repositories.ts`, `app/api/repository/route.ts`
- `src/infrastructure/browser/browser-repositories.ts`, `src/infrastructure/memory/in-memory-repositories.ts`
- `src/features/run-registration/lifecycle-authoring.ts`, `use-lifecycle-authoring.ts`, `actual-execution-grid.tsx`, `engineering-grid.tsx`
- `scripts/migrate-production-slice-1.mjs`, `package.json`
- `tests/execution-repository-contract.ts`, `postgres-execution-contract.ts`, `postgres-adapter.test.tsx`, `postgres-native.test.ts`, `postgres-run-contract.ts`
- This document, `docs/dxt-production-repository-transition.md`, `docs/dxt-production-persistence-schema-v1.md`

### Final validation results

- `npm test`: **236 passed** (108 domain, 122 workspace/application, 6 PostgreSQL-compatible integration tests).
- `npm run test:postgres-native` with native PostgreSQL 18: **passed**, including shared execution contracts, concurrent writes, rollback, full server restart and replay of persisted command receipts after restart.
- `tsc --noEmit`: passed.
- Changed-file `oxlint`: passed; final contract additions checked again.
- `DXT_REPOSITORY=postgres npm run build`: passed.
- Default `npm run build` (Browser/Sites profile): passed. Existing Vinext static route classification warnings remain.
- `git diff --check`: passed.
- Incremental migration rerun: both applied checksums verified; no reapplication.
- Repository-wide lint: **105 existing errors**, separate from this slice (84 in `tests/domain.test.ts`, 2 in `src/features/experiment-run/interactions.tsx`, 19 in existing UI components/hooks). No unrelated cleanup performed.
- Existing Material Plan rendering reports duplicate `F-BASE-01` option keys in development; no Actual persistence failure resulted. This unrelated UI debt remains outside this slice.

### Strict final review

1. Real PostgreSQL Actual storage: **YES**.
2. Exact Production Run/Subject/Operation identities: **YES**.
3. Recording Actual leaves Plan unchanged: **YES**.
4. Actual can differ without changing VARIED intent: **YES**.
5. Real DB transaction: **YES**.
6. Persisted Execution idempotency: **YES**.
7. Stale writes detected: **YES**.
8. Repository read-back after restart: **YES**.
9. Frozen Actual UI renders genuine DB read-back: **YES**.
10. Browser/InMemory/mock fallback in the verified path: **NO**.
11. Manual Execution without MES: **YES**.
12. Wafer and Specimen through the same adapter: **YES**.
13. Failed write leaves no partial authoritative state: **YES**.
14. Frozen Plan/Actual/Changed/VARIED semantics retained: **YES**.
15. Core/Generic Framework/frozen scientific UI semantics changed: **NO**.
16. Measurement production persistence implemented: **NO**.
17. Study → Plan → Actual through PostgreSQL: **YES**.
18. Bounded Production Adapter Slice 2 complete: **YES**.
