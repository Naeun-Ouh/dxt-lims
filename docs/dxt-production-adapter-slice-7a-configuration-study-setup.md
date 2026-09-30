# Phase 3 Slice 7A — Configuration authoring and Study Setup

2026-09-18. Scope: existing Reference Studio commands and Study defaults, backed by PostgreSQL. Run Plan editing/commit-lock policy remains Slice 7B. No Core Domain, lifecycle, Analysis v2, or approval workflow changes.

## Ownership and application boundary

Reference defines what CAN be used; Study Setup defines what WILL normally be used; each Run owns its independent materialized snapshot. UI writes go through the application command facade and HTTP repository transport, never directly to SQL.

`ConfigurationAuthoringBoundary.load/execute` is the asynchronous authoring repository contract. `PostgresConfigurationAuthoring` implements it with the existing `ConfigurationManagementCommands`. The facade supplies a command identity, awaits commit, performs a fresh SQL load, then replaces the read-only hydrated configuration source. The existing resolver remains synchronous. Browser composition continues using its original command/repository implementation.

Supported mutations are create draft package, create immutable definition revision, create applicability rule-set version, assemble package version, activate and deactivate. Package validation uses the hydrated exact graph; activation revalidates inside its transaction. No independent persisted validation verdict becomes authority.

All command input derives from persisted catalog/registry data. `configurationCandidate` uses the existing domain's InMemoryConfigurationRepository only as a transaction-local validation/copy-on-write buffer reconstructed from the SQL snapshot. It is discarded after the SQL transaction. It is not an alternate repository, fallback, seed, or process-memory source of truth. Likewise the read-only hydrated runtime source reuses the existing immutable registry implementation. A missing database/catalog/Study produces an explicit error.

## Configuration persistence and atomicity

Existing configuration revision, package, exact member and activation tables remain authoritative. Migration 006 adds only missing authoring metadata, draft identity, lifecycle overlays and command receipts; it does not introduce a second master.

Each mutation locks `configuration_authoring_state`, checks the durable command receipt, loads the current SQL graph, applies existing domain validation, writes new immutable artifacts and a result receipt, and increments the authoring version in one transaction. The deliberately conservative singleton lock serializes authoring. Scope/package lineage locking and the existing unique ACTIVE index also remain in force.

Activation closes the previous active interval and inserts the new interval, updates package lifecycle status and rule lifecycle overlays, and commits the receipt atomically. Uniqueness remains `(scopeType, scopeId, stablePackageId)`: PHOTO and CMP can be ACTIVE simultaneously in one scope. No Area-name or Subject-name branch was added. Lifecycle status is an overlay; exact scientific payloads/membership are not rewritten. Activated and historical immutable definitions/packages retain their old IDs and payloads. Scientific changes create new revisions/versions.

Identical retries return the persisted result; reusing the command ID for different input conflicts. Failed activation after closing the old interval rolls back the entire change. Failed definition receipt insertion rolls back the inserted revision too. The UI retains a pending command identity until commit plus read-back succeeds.

Existing Reference catalog data is installed explicitly by `scripts/seed-production-configuration-catalog.ts` into `configuration_revision` under catalog namespaces. This is a bootstrap/migration action, never an automatic runtime fallback. The existing manifest writer is reused with explicitly supplied SQL-derived new manifests. Runtime does not provision fixture packages or Study defaults.

## Study Setup storage and exact pins

`StudyRepository.getSetup/saveSetup` owns defaults. Saving writes a new complete `study_setup_version` with ordered Operation, assignment and Measurement-plan children, then advances the Study current pointer. Assignments preserve exact definition revision, assignment reference and applicability IDs alongside Study-owned value, intent and grain. Display metadata is validated against the resolver, not treated as an independent Definition authority. Migration 006 adds assignment ordinal to preserve authored row order and a Study command receipt.

The server locks the Study, checks receipt, requires `expectedVersion == current.revision` and `next.revision == current + 1`, and validates the entire snapshot before writing. Study identity/Area/Subject/profile, Operation context/backbone and Measurement plan are preserved. Every Item is resolved by the same authoritative configuration resolver against the exact selected package and stored Operation context. Default values use existing validation. JSON object key order does not count as scientific change. Failure rolls back version, children, pointer and receipt together; stale saves conflict.

The existing UI now loads before rendering and awaits save plus repository read-back. Add Item and default edits use the existing picker/table. FIXED/VARIED and Subject grain retain the frozen UI's existing display/editability limits; no new intent/grain editor was introduced.

A minimal exact `Reference Set version` selector was added at the existing Reference Set display because the old screen had no way to explicitly adopt a newly activated package. There is no auto-upgrade. Explicit selection re-resolves applicability for the SAME exact definition revision/kind/assignment reference, while preserving Study-owned values and intent. It does not substitute a later Definition revision or reset defaults from the package. Incompatible Items fail explicitly. Server validation still checks metadata and values against the chosen package. No separate production screen or setup redesign was introduced.

Changing Study defaults or activating a package never updates historical Runs. Create Run reads the current persisted Study Setup and materializes a full snapshot with exact package/revision references. Existing Runs retain their original pins, values, intent and provenance. Plan mutation remains unsupported under the previous policy.

## Real PostgreSQL UI proof

Used the existing local PostgreSQL verification database on port 55437 and app on port 3100. Authoring actions were performed through Reference Studio and Study Setup, not direct SQL writes:

- PHOTO: created `definition-exposure-dwell-v1`, authored PHOTO/Exposure/Wafer/Subject applicability with default 35, assembled and activated `config-package-photo-v3`. Study explicitly selected v3, added Exposure Dwell and saved 36. Existing Energy stayed 35/VARIED despite the newer package's different configured default/role.
- Material: created `definition-cure-dwell-offset-v1`, authored Material R&D/Cure/Specimen/Subject applicability with default 35, assembled and activated `config-package-material-rd-v2`. Study selected v2, added Cure Dwell Offset and saved 36. Formulation, Cure Temperature 120 °C, Cure Time and other existing settings remained present.
- Stopped the application process and its pool, started a fresh process, reopened both Studies, and observed the same exact package and saved value 36.
- Through New Run → From Study Default → Review Inheritance → Create Run & Open Plan, created DTS Run **21** and Material Run **6**. Plan shows Exposure Dwell 36 for W01–W04 and Cure Dwell Offset 36 for SP-01–SP-04 respectively.
- Reopened Reference Studio after restart: PHOTO v3 and Material v2 ACTIVE, each used by one new Run; historical v1 usage remains two Runs per Study. CMP remains independently ACTIVE.

Review routes:

- `/reference?section=packages&package=config-package-photo-v3&validation=1`
- `/reference?section=packages&package=config-package-material-rd-v2&validation=1`
- `/series/dts-improvement?view=setup`
- `/series/adhesion-material-optimization?view=setup`
- `/series/dts-improvement/runs/21/engineering-grid?view=plan`
- `/series/adhesion-material-optimization/runs/6/engineering-grid?view=plan`

The application retains pre-existing demo wording in the shared header; backend proof is the real PostgreSQL command/read-back and restart path, not that label. No UI Plan edit was performed or implemented.

## Automated proof and remaining boundary

`tests/postgres-configuration-study-contract.ts` exercises both Subject contexts with the same generic contract: definition/rule/package authoring, durable retry and command-ID conflict, exact activation/hydration, explicit package adoption retaining existing values, new Item 35 → Run A, Study default 36 → Run B, unchanged Run A and pre-activation Run, optimistic conflict, and injected multi-row rollback. Activation and receipt failures leave no partial artifacts. The native PostgreSQL harness additionally stops/restarts the database and reloads authoring state, both Study defaults and exact historical/new Run snapshots through a new pool/application. Existing activation/Run/Execution/Measurement/reasoning/Next Run/Saved Analysis contracts remain in the same suites.

Validation results are recorded after the final run below. The only remaining frozen authoring implementation boundary is Slice 7B: Run Plan authoring/editability/commit-lock semantics. Full Production E2E Freeze remains pending that slice. Enterprise governance, authorization rollout, deployment/operations and Analysis v2 are outside this slice and are not claimed complete.

Final regression also covers deactivating an already-INACTIVE historical package: only that exact version's activation can close; the current active version remains open. A subsequent successful Definition revision leaves the prior revision and already-created Run untouched.

## Changed files

- Application: `src/application/configuration-authoring.ts`, `configuration-command-facade.ts`, `dxt-application.ts`, `dxt-application-provider.tsx`.
- Transport/composition: `app/api/repository/route.ts`, `src/infrastructure/http/http-repositories.ts`, `src/infrastructure/postgres/server-composition.ts`.
- PostgreSQL: `postgres-configuration-authoring.ts`, `study-setup-storage.ts`, `postgres-repositories.ts`, `slice-seed.ts`, `migrations/006_configuration_study_authoring.sql` under `src/infrastructure/postgres/`.
- Existing UI: `authoring-model.ts`, `definitions-view.tsx`, `applicability-view.tsx`, `package-view.tsx`, `home.tsx` under `src/features/reference-studio/`; `study-setup-model.ts`, `study-setup-workspace.tsx` under `src/features/experiment-series/`.
- Bootstrap/migration: `scripts/seed-production-configuration-catalog.ts`, `scripts/migrate-production-slice-1.mjs`.
- Tests: `tests/postgres-configuration-study-contract.ts`, `tests/postgres-adapter.test.tsx`, `tests/postgres-native.test.ts`.
- Documentation: this file, `docs/dxt-production-repository-transition.md`, `docs/dxt-production-persistence-schema-v1.md`.

This is the Slice 7A file set, not a claim that all existing uncommitted workspace changes belong to this task.

## Final validation result

- Existing test suite: **241 passed**, 0 failed (108 domain, 122 workspace, 11 database-compatible integration groups).
- Native PostgreSQL 18 integration: **passed**, including database stop/start, a fresh pool, exact authoring/Study/Run read-back, rollback and historical pin regression.
- TypeScript `tsc --noEmit`: **passed**.
- Lint on all Slice 7A changed code/scripts/tests: **passed**.
- PostgreSQL build and browser build: **passed**.
- `git diff --check`: **passed**.
- Repository-wide lint: **105 pre-existing errors**; reported separately and not fixed in this slice. Temporary generated test/bootstrap bundles were excluded by their normal cleanup before this count.

## Final review

1. Frozen Reference Studio writes PostgreSQL Configuration: **YES**.
2. Immutable Definition/Package revisions preserved: **YES**.
3. Corrected package ACTIVE invariant preserved: **YES**.
4. Authored Configuration hydrates after restart: **YES**.
5. Existing Study Setup authors/saves PostgreSQL defaults: **YES**.
6. Authoritative applicability resolver used: **YES**.
7. Study defaults separate from Configuration authority: **YES**.
8. Study changes leave existing Runs unchanged: **YES**.
9. Future Runs use updated defaults: **YES**.
10. Study save transactional: **YES**.
11. Optimistic concurrency enforced: **YES**.
12. Retry-sensitive commands have durable idempotency: **YES**.
13. Wafer/Specimen share the generic Production path: **YES**.
14. Browser/InMemory/localStorage/mock fallback in verified path: **NO**. Transaction-local domain validation and immutable hydrated objects are not fallback persistence.
15. Historical exact Run pins preserved: **YES**.
16. Run Plan editing implemented: **NO**.
17. Core/Generic Framework/frozen UI semantics changed: **NO**. The explicit Reference Set control connects the existing exact-package choice to persistence; it does not change lifecycle or scientific meaning. Its addition is disclosed above.
18. Slice 7A complete: **YES**.
19. Only remaining frozen authoring boundary is Run Plan editing/lock semantics: **YES**. Production operational/governance work and deferred Analysis v2 are separate scope.
