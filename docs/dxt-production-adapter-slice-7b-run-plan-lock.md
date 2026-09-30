# Phase 3 Slice 7B — Run Plan authoring and evidence-derived locking

2026-09-18. Implements mutable intent before scientific evidence and immutable intent after evidence, through the existing Engineering Grid and RunRepository. No new scientific Plan revision, lifecycle status, approval, unlock, permissions, or Analysis model.

## Exact lock rule

An existing PostgreSQL Run is editable while it has no persisted `execution_event`, `measurement_execution`, `engineer_evaluation`, or `decision` record. Any one of these locks its Plan. NextAction is owned by Decision and needs no separate predicate. Evaluation/Decision are included defensively because their current authoring contracts do not categorically require prior Actual/Measurement for every record.

The predicate checks immutable historical records, not just current pointers. Superseding a record or clearing a current selection never unlocks Plan. No application delete/unlock command was added. No mutable `isLocked` flag is stored. An empty execution state/version by itself is not evidence.

`getPlanningWorkspace` returns the complete snapshot, existing scope/manual-focus context, current infrastructure version and derived `lockReason` from one repeatable-read SQL transaction. Locked snapshots remain readable with exact subjects, operations, intent, assignments, package/revisions and provenance.

## Authoritative command and race protection

Frozen Plan Grid → DxtApplication.runs.savePlanning → RunRepository.savePlanningWorkspace → PostgreSQL.

One transaction:

1. Lock the exact `experiment_run` row `FOR UPDATE`.
2. Check the durable Run-scoped command receipt; a successful identical retry is an acknowledgement, not a new write. Reused identity with different content conflicts.
3. Derive the evidence lock and reject locked changes with `CONFLICT` and a compact scientific-history reason.
4. Require the current `aggregate_version` to equal `expectedVersion`.
5. Hydrate the Run's exact package and validate snapshot structure, subject context, operation profile and applicable assignment revisions/values. Missing persisted Operation context fails explicitly, before any fixture-backed workspace path could execute. No package rebase is invented.
6. Replace the mutable Plan's relational children and update the existing root snapshot fields, delta and planning context. The Run root is never deleted/recreated.
7. Increment Plan version and write the successful idempotency receipt in the same transaction.

Execution, Measurement and reasoning writes already acquire the same Run root lock. Thus either Plan commits first and evidence follows it, or evidence commits first and Plan rechecks/rejects. A stale UI permission cannot bypass this serialization. Foreign keys also protect referenced Subject/Operation rows. No evidence is removed to permit a Plan save.

The native two-connection race test deliberately holds the Actual transaction after it acquires the root lock, starts a stale Plan save on the other connection, and then releases Actual. Actual commits; Plan fails as locked; the snapshot is unchanged.

## Snapshot, provenance and reference semantics

The complete relational snapshot remains authoritative. Delta is only the existing UX/provenance projection. The command preserves Run/Study identity, creation identity, provenance/sourceRunId, exact package, experiment profile and subject type. Assignment values/intent use the existing generic resolver and validators. Values selected from reference options retain their exact revision; an unchanged display value does not silently choose another revision with the same label.

Study defaults are not written by Plan save. A new Next Run is a separate root and has its own evidence-derived editability. Editing it cannot update its source Run.

The Grid's existing value and role controls are translated into the full snapshot. Subject overrides retain stable assignment identity on repeated edits. Changed values add existing `CHANGED` delta metadata and `AD_HOC` assignment provenance; unchanged inherited assignments retain their source provenance. `FIXED` / `VARIED` is changed only by the explicit role control, never inferred from a numerical difference. Existing Next Run delta/source metadata is retained.

No new subject/operation/grain editor was introduced. The frozen Engineering Grid supports subject values and intentional roles; the repository retains the full snapshot/context boundary. Browser/demo continues its existing behavior and repository contracts; PostgreSQL is the acceptance authority.

## Version, idempotency and rollback

Run creation starts `aggregate_version` at 1. Each successful distinct Plan save increments it once. Actual, Measurement, Evaluation and Decision maintain their own repository versions and do not increment Plan version. These are infrastructure concurrency tokens, not scientific revisions.

The existing `idempotency_record` table is reused under `SAVE_PLAN:<technical Run ID>`. Hash covers snapshot, planning context and expected version with canonical object-key ordering. A successful retry after evidence exists is a no-op and cannot rewrite a locked snapshot. New requests after evidence are rejected even with the current version.

Injected failure during assignment insertion proves that deleted/reinserted mutable children, root fields, provenance, version and receipt all roll back. Stale version saves and command-ID misuse are tested independently. There is no partial Plan commit.

## UI behavior and genuine read-back

The existing Grid gains a compact Save Plan action/status. Value/role edits remain local drafts until this explicit save; successful save is followed by a repository read-back. Reload uses PostgreSQL data. Pending writes disable further authoring; failure remains visible. Returning from Actual/Measurement refreshes Plan editability.

Locked numeric inputs are read-only; reference selectors, role toggles and Save Plan are disabled. Search, filters, expand/collapse, Subject navigation and contextual details remain available. Persisted Changed indicators remain separate from VARIED. If another user records evidence while an editable page is open, the server refuses its save, and the UI reloads the locked snapshot rather than displaying a successful local-only edit. There is no Production localStorage/InMemory/mock fallback.

## Schema and files

Migration `007_run_plan_authoring.sql` adds only `experiment_run.planning_context` JSON for the pre-existing scope ranges/manual-focus projection. Existing relational Plan tables, root version and idempotency table are reused. Previous migration checksums are unchanged.

Changed files:

- `src/application/plan-authoring.ts`, `repository-ports.ts`, `dxt-application.ts`.
- `src/infrastructure/postgres/plan-lock.ts`, `postgres-repositories.ts`, `migrations/007_run_plan_authoring.sql`.
- `src/infrastructure/http/http-repositories.ts`, `app/api/repository/route.ts`.
- `src/features/run-registration/engineering-grid-plan-edit.ts`, `engineering-grid.tsx`.
- `scripts/migrate-production-slice-1.mjs`.
- `tests/postgres-plan-authoring-contract.ts`, `postgres-native.test.ts`, `postgres-adapter.test.tsx`, `workspace-inline.test.tsx`.
- This report, `docs/dxt-production-repository-transition.md`, `docs/dxt-production-persistence-schema-v1.md`.

## Actual PostgreSQL UI proof

Both Runs were created through the existing New Run → From Study Default → Create Run & Open Plan UI on localhost:3100, backed by the local PostgreSQL verification DB.

- DTS Run **22**, PHOTO exact package **v3**: Exposure Dwell W01 **36 → 37**, kept **FIXED**. Saved and restarted the application/pool; Plan restored 37 while other wafers remained 36. Recorded EXPOSURE Actual for W01. Plan then showed the execution lock, disabled authoring, and retained 37/FIXED.
- Material Run **7**, exact package **v2**: Cure Temperature SP-01 **120 → 121°C** and Cure Dwell Offset **36 → 37** saved together. Restart restored both. Recorded Manual Actual CURE with **122°C**, leaving Plan at **121°C**. Plan locked; Specimen labels SP-01–SP-04 remained, without MES/Site assumptions.
- A second application/pool restart after Actual restored both locked states.
- Direct calls through the same PostgreSQL RunRepository attempted new Plan saves for those two real UI Runs and were rejected as locked. Read-back snapshots were unchanged; both Study Dwell defaults remained **36**. Existing DTS Run 19 and Material Run 4 were immediately locked.

Review:

- `/series/dts-improvement/runs/22/engineering-grid?view=plan`
- `/series/adhesion-material-optimization/runs/7/engineering-grid?view=plan`
- The same routes with `view=actual` show independent execution evidence.

## Automated acceptance and remaining scope

The new shared PostgreSQL contract runs for both Studies and proves editable save, full read-back, default/source independence, Changed versus FIXED, version conflict, durable retry, exact package rejection, rollback, a fresh independent Next Run, and lock after Actual. It also records Measurement on a fresh Specimen Run **without Actual**, then proves Measurement alone blocks Plan writes. Existing downstream historical Runs are checked too.

The native harness additionally exercises two-connection lock ordering and real database restart/new pool, preserving both an editable Next Run and a locked Run. Existing lifecycle/activation/repository/browser regression suites remain enabled. Grid projection tests verify stable overrides and explicit role changes without source mutation.

Slice 7B closes the remaining frozen authoring persistence boundary. This makes the product ready for the **final Production E2E Freeze Review**, not automatically frozen or production-deployed. Authorization, privileged corrections, enterprise audit/governance, operations hardening and Analysis v2 remain explicitly outside this task.

## Final validation result

- **243 tests passed**: 108 domain, 123 workspace, 12 database-compatible integration groups; zero failures.
- Native PostgreSQL 18: passed, including two-connection Actual/Plan lock race, Measurement-only lock, real DB restart and fresh application/pool reads.
- TypeScript and all changed-file lint: passed.
- PostgreSQL production build and browser build: passed.
- `git diff --check`: passed.
- Repository-wide lint: **105 pre-existing errors**, unchanged and reported separately.

The relational assignment writer now persists the exact applicability rule selected by the authoritative context-aware resolver, rather than taking the first same-reference rule in a package.

## Final review

1. Fresh PostgreSQL Plan editable before downstream evidence: **YES**.
2. Authoritative full snapshot persisted: **YES**.
3. Study Setup unchanged by Run edit: **YES**.
4. Source Run unchanged by Next Run edit: **YES**.
5. Changed and VARIED distinct: **YES**.
6. Actual locks Plan: **YES**.
7. Measurement locks Plan, including without Actual: **YES**.
8. Lock checked in authoritative save transaction: **YES**.
9. Actual/Plan-save race fails safely: **YES**.
10. Optimistic concurrency: **YES**.
11. Idempotent Plan retries: **YES**.
12. Complete rollback on failure: **YES**.
13. Locked Plan readable: **YES**.
14. Lock survives application restart: **YES**.
15. Fresh independent Next Run editable until its own evidence: **YES**.
16. Same Wafer/Specimen production path: **YES**.
17. Browser/InMemory/localStorage/mock fallback: **NO**.
18. New Plan revision/approval workflow: **NO**.
19. Core/Generic Framework/frozen scientific UI semantics changed: **NO**. Save/read-only state completes the requested persistence boundary without adding new experimental editing concepts.
20. Requested frozen authoring boundaries Production-backed: **YES**.
21. Slice 7B complete: **YES**.
22. Ready for final Production E2E Freeze Review: **YES**. The review itself is still to be performed; no deployment/operational freeze is declared here.
