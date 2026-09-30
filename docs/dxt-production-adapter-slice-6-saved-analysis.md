# Production Adapter Slice 6 — Saved Analysis

Date: 2026-09-17

Status: **Saved Analysis slice complete. Full frozen-product Production persistence remains PARTIALLY complete.** The previously excluded Configuration authoring, Study Setup writes, and committed Plan editing are not implemented by this slice. No claim is made that every frozen authoring command now has a production implementation.

## Frozen contract and ownership

SavedAnalysisRepository stores only the existing SavedAnalysisView contract: identity/name/owner/visibility, Study/Run/Subject/Parameter/Dataset selections, exact source references, preparation/aggregation/validity policy, visualization/x dimension/grouping, text/sort filters and savedAt. Measurement remains authoritative for all observation and representative-result values. No Core Domain or Analysis v1 semantics changed; no Analysis v2 structures were introduced.

The existing repository permits replacement under the same saved ID. The frozen UI's Save View creates a fresh ID; no Update/Delete/Archive UI existed, so none was added. The production repository supports same-ID updates with an expected version. Delete/retention workflow remains absent, and no command removes Measurement data.

## Physical schema

Migration `005_saved_analysis.sql`, applied by the existing checksum-locked migration runner:

- `saved_analysis`: UUID technical PK, unique domain ID, owning Study FK, version, created_at/updated_at, whitelisted configuration JSON.
- `saved_analysis_source_ref`: ordered exact Study/Run/Subject/MeasurementExecution/Dataset/Parameter/representative-result domain references, owned by the saved view through a parent FK.
- `saved_analysis_command_receipt`: unique view/command identity, canonical request hash and successful version; no copied results.

Selection arrays remain in the validated configuration document rather than introducing redundant membership tables. Exact per-result source references have separate relational rows. JSON is rebuilt using the frozen Zod contract; arbitrary extra result/point/observation properties are not persisted.

Scientific source identities deliberately are retained as exact strings, without a cascading Measurement FK. A saved reference can remain addressable when its source is unavailable. This is an implementation refinement of Phase 2's conceptual FK/tombstone design: this slice has no source deletion workflow or new tombstone owner. The parent Study FK and child ownership constraints enforce structural integrity; the existing resolver checks scientific availability at read time. Missing references are never rewritten to latest/same-parameter/same-Run alternatives.

No old migration was edited. The migration runner verifies already-applied checksums and serializes migration application.

## Commands, transaction and concurrency

Path: frozen Save View → DxtApplication.savedAnalyses → HTTP command → application boundary → PostgresSavedAnalysisRepository.

`getState(id)` returns the existing view plus its repository version. `save(view, {commandId, expectedVersion})` creates at version 0 or updates the exact current version. The application supplies version 0 for a fresh save. A stale or missing update token conflicts rather than silently overwriting.

One database transaction inserts/resolves the unique view identity, locks that row, checks the persisted receipt, checks the expected version, updates configuration, replaces all ordered references, increments version and writes the receipt. Concurrent creates of one ID serialize on its unique key/row lock. Identical retries are no-ops, including after later updates and process restart. Different content under the same command identity conflicts. Since save returns void, replay acknowledges the original successful command without restoring old configuration; subsequent get returns the current version.

An injected source-reference INSERT failure after parent write rolls back parent/children/receipt. Failed updates restore the previous parent and its old reference set. No Measurement, Run or Evaluation rows are changed.

## Read-back and URL boundary

The UI awaits save and performs repository get/list read-back before reporting success. It retains the pending saved identity for retry, disables concurrent submission and reports failures. Opening a listed view also queries its exact saved identity rather than treating the displayed list object as authority.

Reopen restores the saved selection/configuration, then queries MeasurementRepository with exact Run/Dataset/Parameter/Subject IDs. Availability checks now run against the resulting Measurement projection, not the metadata-only discovery catalog. A missing pinned Dataset, Subject, Parameter, Execution or representative result is shown explicitly; unresolved pinned views suppress substituted scientific rows. Projection supplies only the saved representative-result IDs to the existing Analysis calculation. A different same-context summary cannot replace a pin; a view saved without a representative-result ID continues to calculate from its selected Measurement inputs. Empty catalogs still allow a saved view to be identified and its missing sources displayed. Missing saved-view IDs and repository failures are explicit errors.

The URL remains lightweight navigation: study/runs/parameters/subjects/view/savedView. It contains neither the full configuration nor values. Both real browser restart proofs used only `?savedView=...`, showing that SQL configuration, rather than the other URL parameters, restores the view. Browser seed compatibility remains composition-owned; Production receives no seeds or Browser repository.

## Automated proof

All **240 tests pass** (108 domain, 122 workspace, 10 database-compatible integration groups). The native PostgreSQL 18 harness also passes with a real database stop/start and a new pool, repositories and application.

New shared Saved Analysis contract checks PostgreSQL, Browser and InMemory reads, save/read-back, same-ID update, optimistic conflicts, duplicate retry and old retry after later update. Production tests additionally cover:

- Wafer and Specimen against real persisted Measurement, through the same repository and Analysis projection.
- Exact source/configuration restoration and matching Analysis rows; MEAN representative pins remain exact even when another summary with the same context is present, and missing pins do not fall forward.
- Concurrent identical saves produce one view; command-ID reuse with different input conflicts.
- Missing exact Dataset references remain stored; another available Dataset of the selected Parameter is not substituted.
- SQL configuration equals the whitelisted frozen contract; no observation, representative value or chart/table result columns exist.
- Multi-part create and update rollback, no successful failed-command receipt, unchanged Measurement state.
- Native restart read-back and persisted update-command replay.

TypeScript, changed-file lint, PostgreSQL build, browser production build and `git diff --check` pass. Repository-wide lint remains **105 pre-existing errors**. No production performance/SLA or large Saved View catalog claim is made; list remains the existing unpaginated low-volume API.

## Real browser authoring/restart evidence

Local app: `DXT_REPOSITORY=postgres`, port 3100; native PostgreSQL 18, database `dxt_slice_verified`, loopback port 55437. Both views were created by clicking Save in the existing UI. An initial HTTP validation mismatch (new-save expectedVersion omitted) was corrected to explicitly send 0 before successful authoring.

DTS:

- Saved ID: `analysis-view-4b297333-65c3-4c60-8233-18fd3e187873`.
- Run 19: `run-4a07daaa-6728-46e7-b78e-90673177ce30-19`; W01 / PHO7814.01; Parameter `parameter-bcd-v1`.
- Dataset `measurement-1789565346595-bb0umt:dataset`; exact execution/summary use the same prefix with `:execution` / `:summary`.
- Measurement resolves **17.1 nm**; BAR, MEAN, X=RUN, group=SUBJECT, ALL datasets, includeExcluded=true.

Material:

- Saved ID: `analysis-view-29137742-2d7c-415e-a45f-3db49447be3f`.
- Run 4: `run-51731d83-7942-4bc9-9421-bce236279fdd-4`; SP-01, SPECIMEN; Parameter `parameter-peel-force-v1`.
- Dataset `measurement-1789565453341-o9esbj:dataset`; exact execution/summary use the same prefix with `:execution` / `:summary`.
- Measurement resolves **5.8 N**; same BAR/MEAN configuration. No Wafer, MES or Site prerequisite.

Navigating to the other Study left each view in the repository. The app process was then stopped and restarted, recreating the server composition and PostgreSQL pool. Each view reopened from its saved ID alone, restoring the original selection and configuration. The Inspector displayed the same exact Dataset, Parameter and representative-result identities and values. Read-only native SQL independently confirmed both version-1 configurations and exact source rows. Native automated tests separately restart the database itself.

Review:

- http://localhost:3100/analysis?savedView=analysis-view-4b297333-65c3-4c60-8233-18fd3e187873
- http://localhost:3100/analysis?savedView=analysis-view-29137742-2d7c-415e-a45f-3db49447be3f

## Full product persistence audit / remaining boundary

- Configuration: exact PostgreSQL package/revision hydration and native activation exist. The runtime HydratedConfiguration is read-only; full Reference Studio definition/package authoring commands are not connected to PostgreSQL.
- Study: PostgreSQL Setup read/provisioning exists; `PostgresStudyRepository.saveSetup` explicitly rejects unsupported authoring.
- Run: PostgreSQL independent full snapshot creation/read, previous→next continuity and saved scope exist; committed Plan editing remains explicitly outside the prior slice.
- Execution, Measurement, Evaluation, Decision and NextAction: production adapters/transactions implemented by Slices 2–4.
- SavedAnalysis: production create/update/read/version/idempotency/atomic reference persistence implemented here.

There is no silent Browser fallback in the verified lifecycle/Saved Analysis path. Nevertheless, full frozen authoritative authoring coverage is **PARTIALLY**, and unconditional Production E2E Freeze readiness is **PARTIALLY**. These prior explicit exclusions should be resolved or formally excluded from the Production freeze scope. This slice does not broaden into those owners. Authentication/authorization, operational deployment, enterprise audit, and Analysis v2 remain deferred.

## Changed files

- New `src/infrastructure/postgres/migrations/005_saved_analysis.sql` and `postgres-saved-analysis-repository.ts`.
- `scripts/migrate-production-slice-1.mjs`: ordered migration registration.
- `src/application/repository-ports.ts`, `dxt-application.ts`: versioned read and save command boundary.
- `src/infrastructure/postgres/postgres-repositories.ts`, `unsupported-repositories.ts`: production composition/port shape.
- `src/infrastructure/http/http-repositories.ts`, `app/api/repository/route.ts`: saved-view transport.
- Browser/InMemory repository implementations: existing contract plus version/retry parity.
- `src/features/analysis/workspace.tsx`, `saved-view-repository.ts`: awaited read-back, exact reopen, source validity and explicit failure handling.
- New `tests/postgres-saved-analysis-contract.ts`; updated `postgres-adapter.test.tsx`, `postgres-native.test.ts`, and earlier Run/Execution assertions that SavedAnalysis was unsupported.
- This report, transition documentation and physical schema addendum.
