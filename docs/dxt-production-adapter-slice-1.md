# DXT Production Adapter Vertical Slice 1

Date: 2026-09-16
Status: **Phase 2.1 corrected; Slice 1 acceptance path verified on native PostgreSQL 18 and the real browser.**

This is the Configuration hydration → Study Setup read → Create Run → independent Plan snapshot → repository read-back slice. It is not a deployment of the full product or of downstream lifecycle persistence.

## Architecture history: stop, correct, resume

The first implementation correctly stopped when Phase 2 specified one active package per scope. Frozen commands deactivate only earlier versions of the **same packageId in the same scope**. PHOTO v1 and v2 share `config-package-photo`; CMP belongs to `config-package-cmp`. Their version IDs are separate exact identities.

The approved Phase 2.1 correction is:

`(scope_type, scope_id, stable package_id) → at most one current package_version_id`

The original defect was reproduced with a scope-only unique index (SQLSTATE 23505 for valid PHOTO/CMP coexistence). It was not worked around. The schema, catalog, ERD, transaction description and hydration guidance were corrected before resuming Run work. The original migration was an undeployed prototype used only in disposable local databases. It was corrected in place, not given fictional deployed migration history. Once applied by the migration runner, checksum changes are rejected and require a new migration.

## Activation and immutable Configuration

`configuration_package` stores stable lineage; `configuration_package_version` stores its exact version and immutable payload. `configuration_activation` records scope, lineage, exact version, activation interval and version metadata.

- A partial unique index covers `(scope_type, scope_id, package_id) WHERE active_to IS NULL`.
- A composite FK ensures the activated version belongs to the recorded lineage.
- Scope keys are non-null. GLOBAL has the canonical empty owner key; other scopes require an owner.
- The activation transaction locks the stable package row, validates/hydrates the exact released graph, closes the previous interval and inserts the new activation. This also serializes competing first activations; other packages remain independent. Different scopes of one package conservatively share the lineage lock.
- Activating the current exact version returns the existing activation identity. Replacing it appends history; rows are not deleted. Database constraints remain the final concurrency guard.
- Activation does not rewrite package payloads, membership, Study pins or Run pins. Package status is release eligibility metadata; scope-specific current activation is represented by activation rows, not a single global ACTIVE lookup.
- Revision payload updates/deletes, package payload/key updates/deletes and membership updates/deletes are rejected. Published membership is sealed against additions; published packages cannot return to DRAFT.

The synchronous runtime source is `HydratedConfiguration`: data comes from SQL, is parsed with the existing schemas, checked for required profile/rule/grain closure, and exposed through frozen clone-returning reads. Its authoring transaction method throws. Reusing the in-process reader implementation is not a seed/fallback path. Bootstrap only hydrates exact pins found in persisted Setup/Run records in a repeatable-read transaction. No request asks for “the single active package in this scope.”

## Adapter path

`Frozen feature → DxtApplication → repository port → HTTP transport → server DxtApplication → PostgreSQL repository`

`DXT_REPOSITORY=postgres` selects the composition in the server layout; otherwise Browser remains the default. The client gets a serialized hydrated configuration source and HTTP-backed ports, never a database URL or SQL client. The transport exposes an allowlist of operations with validated input. Feature components do not branch on PostgreSQL or environment variables.

`DATABASE_URL` is server-only environment configuration. The native PostgreSQL development/build profile omits the Cloudflare runtime plugin; the default profile is preserved. The two builds are separately validated. This local slice does not select or implement an enterprise hosting/authentication platform.

Missing configuration, Setup and requested Run produce explicit errors. No production factory spreads Browser or InMemory repositories. Downstream ports throw an unsupported-slice error. The created-Run screen waits for repository read-back and fails visibly on missing data instead of fabricating a fixture Run. Plan mode no longer eagerly loads downstream lifecycle repositories.

The navigation shell and seed catalog remain the existing demo product shell. It is the persisted Setup, Run snapshot, selected Subjects, assignments, pins and operation context that the verified Plan path loads from PostgreSQL. Fixture import is confined to explicit test bootstrap for the persisted scientific data; no fixture default is used by the Production CreateRun command when reads fail.

## Actual tables

Configuration: `configuration_package`, `configuration_package_version`, `configuration_activation`, `configuration_revision`, `configuration_package_member`.

Study: `study`, `study_subject_default`, `study_setup_version`, `study_setup_operation`, `study_setup_assignment`, `study_setup_measurement_plan`.

Run: `experiment_run`, `subject`, `run_subject`, `run_operation`, `run_subject_operation`, `run_assignment`, `run_condition_assignment`, `run_recipe_assignment`, `run_material_usage`, `run_resource_usage`, `run_measurement_plan`, `run_measurement_plan_parameter`, `idempotency_record`.

Migration runner metadata: `dxt_schema_migration`.

Study, Run and Subject relational PKs are UUIDs; domain/display identifiers remain separate. No enterprise-wide Wafer resolution was added. The existing wafer/specimen business identity is retained for deterministic test bootstrap.

The slice specializes the general Phase 2 artifact/revision design into explicit package lineage/version tables and a typed revision collection key. Configuration payloads and low-volume operation context use JSONB; Run assignment scientific scalar values have typed numeric/boolean/text/reference metadata, definition/grain/reference FKs, unit and applicability identities. The compatibility projection retains the original display string. Subject/operation membership and assignments have composite parent constraints to prevent cross-Run links.

Study Setup is read-only in this Production slice. Its compatibility defaults retain the frozen string value plus typed editor/unit/grain/options metadata. Full Reference Studio authoring persistence and the rest of the Phase 2 table catalog are not implied by this slice.

## Create Run transaction and snapshot

The application calls `RunRepository.createFromStudyDefault`, which performs the authoritative transaction:

1. Claim the persisted CreateRun command receipt using the command identity and stable request payload (Study identity, not newly materialized defaults).
2. A duplicate request verifies its hash and reads the prior successful Run. Changed defaults do not change the replay result; reusing the key for a different request conflicts.
3. Lock the Study row; read its exact Setup version and persisted Subject defaults within the same transaction.
4. Hydrate the exact pinned package and materialize the Plan from persisted Setup/context. No scenario selection supplies production Run data.
5. Allocate the Study-scoped next number under the lock, with a database `(study_id, run_number)` unique constraint.
6. Insert Run, selected Subjects, Operations, membership, assignments, typed subtypes, measurement-plan rows and source provenance.
7. Read the snapshot from the inserted relational rows and mark the receipt successful. Commit before returning.
8. The Plan route performs another repository read; the command object is not handed to the Plan screen.

Run-owned Study/Subject display labels and operation/equipment/module context are copied, so changing current labels or Setup values does not alter historical Plans. Exact package and reference pins remain unchanged after activation. Date-only compatibility values are sent as explicit UTC instants to avoid implicit database timezone shifts.

`aggregate_version` is stored and stale `expectedVersion` is rejected. This slice does not enable edits to committed Production Plans or implement collaborative editing; the token/conflict representation is the required concurrency boundary.

## Native PostgreSQL evidence

`tests/postgres-native.test.ts` starts a real PostgreSQL 18 server with `initdb`/`pg_ctl`, applies the actual SQL migration, seeds explicit test data and uses `pg` over TCP. It runs the shared activation and Run contracts, disposes the adapter, stops/restarts PostgreSQL and reads the original Run through a fresh composition. It passes.

The previous native failure was caused by treating multi-statement migration results as a single `pg.QueryResult`; the subsequent server teardown obscured the original failure. The adapter now handles the multi-result response and the test closes its pool before stopping the server even on failure.

Coverage includes:

- A: different package identities active in the same scope.
- B: two versions of the same package/scope rejected by PostgreSQL.
- C: different scopes select different versions of the same package.
- D: replacement closes the prior interval and preserves both activation identities; concurrent requests leave one current version.
- E: Setup and current labels change, then activation changes; fresh exact hydration and Run read-back preserve the original snapshot/pin.
- Explicit PHOTO/CMP coexistence without domain-name branches.
- Wafer and Specimen through the same repository/application path, including Cure Temperature VARIED and exact formulation reference.
- Four concurrent unique create requests; three concurrent retries of one request; persisted deduplication after Setup changes.
- A real trigger rejects assignment insertion **after** Run root, Subjects and Operations were written. Counts of all snapshot groups/receipts and the next Run number remain unchanged after rollback.
- Required package pin, unknown FK, Run number conflict, cross-lineage activation, immutable configuration and stale-version failures.
- The same save/read/list/created-Run contract runs against Browser, InMemory and PostgreSQL; no raw measurement values are involved.

PGlite tests are supplemental and reported separately from the native server proof.

## Browser evidence and review routes

A separate loopback test database and application on port 3100 were used, preserving the user's existing port 3000 service. Both paths were exercised through the real controls:

- DTS Improvement → Experiment Setup → New Run → From Study Default → Review Inheritance → Create Run & Open Plan. Run 19 shows four Wafer Subjects, Energy 35 VARIED, and the configured FIXED Recipe/Focus/Reticle/Material.
- Adhesion Material Optimization → Experiment Setup → New Run → From Study Default → Create Run & Open Plan. Run 4 shows SP-01–SP-04, Mix/Coat/Cure/Test, Cure Temperature 120 VARIED and formulation defaults.

Database queries confirmed one persisted Run for each path with PHOTO v1 and Material R&D v1 pins. App composition and PostgreSQL were both stopped/restarted and each Plan reloaded with the same values. A missing Run route was also checked: it displayed an error rather than a fixture Plan.

Review while the local test service is running:

- `http://localhost:3100/series/dts-improvement/runs/19/engineering-grid?view=plan`
- `http://localhost:3100/series/adhesion-material-optimization/runs/4/engineering-grid?view=plan`

These are local disposable test data, not deployed production master data. Existing duplicate formulation option-key warnings in the Material UI were observed; no unrelated selector redesign was made.

## Reproduction

Set server `DATABASE_URL` to an isolated PostgreSQL database. Run `npm run db:migrate:slice1`; a second run verifies the checksum and performs no schema mutation. `scripts/seed-production-slice-1.ts` is explicitly TEST DATA and is never invoked by application composition. Bundle it with the existing esbuild tool for local bootstrap, then run it against that isolated database.

Start the native profile with `DXT_REPOSITORY=postgres npm run dev -- --port 3100`. The same variable must be present for the production-profile build/runtime. With no adapter setting, the original Browser composition remains selected.

Run native tests with `DXT_POSTGRES_BIN` pointing to a PostgreSQL installation's `bin` directory: `npm run test:postgres-native`. Tests allocate their own temporary database directory and loopback port and clean up on completion. No binary or credential is committed.

## Validation

- Unit/workspace and supplemental integration suite: **235 passed** (108 + 122 + 5).
- Native PostgreSQL integration, including shared activation/Run contracts and restart: **passed**.
- Browser read-back, missing-Run failure and restart reopening: **passed** for Wafer and Specimen.
- TypeScript: **passed**. Changed-file lint: **passed**. Default Browser/Cloudflare build and native PostgreSQL build: **passed**, executed separately. `git diff --check` plus explicit checks of new slice files: **passed**.
- Repository-wide lint: **105 pre-existing errors**, outside changed slice files. The temporary seed bundle was removed before this count; no generated-file errors are presented as existing debt.

## Changed files in this slice

Infrastructure: all files under `src/infrastructure/postgres/`; `src/infrastructure/http/http-repositories.ts`; Browser/InMemory repository implementations.

Application: `repository-ports.ts`, `dxt-application.ts`, `dxt-application-provider.tsx`, `hydrated-configuration.ts`.

Composition: `app/api/repository/route.ts`, `app/layout.tsx`, `vite.config.ts`.

Compatibility projection/entry: `create-run-entry.tsx`, `created-run-grid.tsx`, `run-entry-model.ts`, `study-setup-model.ts`, `study-setup-workspace.tsx`, `planning-model.ts`, `workspace-model.ts`, `use-lifecycle-authoring.ts`, `engineering-grid.tsx`.

Tests/tooling: PostgreSQL test files and shared contract helpers, existing test runner/Link stub, migration and explicit seed scripts, package manifest/lockfile. The wider dirty worktree contains earlier product phases and is not attributed to this task.

Documentation: this report, `dxt-production-persistence-schema-v1.md`, `dxt-production-repository-transition.md`.

## Final review

A. Phase 2.1:

1. Multiple DIFFERENT packages ACTIVE in one scope: **YES**.
2. Multiple versions of the SAME package ACTIVE in one scope: **NO**.
3. ACTIVE uniqueness uses stable package identity: **YES**.
4. PHOTO/CMP coexist without special-case branching: **YES**.
5. Activation history preserved: **YES**.
6. Historical Run retains original exact package pin after activation: **YES**.
7. Phase 2 schema/documentation corrected consistently: **YES**.

B. Phase 3 Slice 1:

8. Native PostgreSQL integration passes: **YES**.
9. Configuration hydrated from real PostgreSQL: **YES**.
10. Study Setup read through Production Adapter: **YES**.
11. Independent full Run Plan snapshot persisted transactionally: **YES**, for the scoped Study Default creation path.
12. Genuine PostgreSQL Run read-back: **YES**.
13. Application/adapter restart reopens Run: **YES**.
14. Frozen Plan UI reopens PostgreSQL-backed Run: **YES**.
15. Browser/InMemory/mock fallback in verified Production data path: **NO**.
16. Both Wafer and Specimen through the same adapter: **YES**.
17. Frozen Core/Generic Framework/UI scientific semantics changed: **NO**. Optional persisted operation context and loading/error handling bridge storage; no scientific concept was redesigned.
18. Production Adapter Vertical Slice 1 complete: **YES**, within the stated create/read scope; not a full production rollout.

## Explicitly deferred

Production authoring of Study Setup/Reference Studio, committed Plan editing, Previous/Existing/Blank creation paths, downstream Actual/Measurement/Evaluation/Decision/Saved Analysis/Evidence persistence, authentication/authorization, enterprise audit, integrations, bulk ingestion, advanced caching, event streaming, AI and DOE. Unsupported production commands fail explicitly. No downstream persistence was implemented merely to make the Plan proof pass.
