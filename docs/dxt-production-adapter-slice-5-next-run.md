# Production Adapter Slice 5 — Previous Run → Next Run

Date: 2026-09-17
Status: **YES — complete**, including native PostgreSQL and real Wafer/Specimen browser creation, Study navigation and post-application-restart Plan read-back.

## Frozen semantics and authoritative owner

Storage remains a full independent Run snapshot; Preview/UX remains a delta view. NextAction is scientific continuation intent, not a Run. Opening Preview and loading its source do not create anything. Only explicit Create Next Run commits a new ordinary Run through RunRepository. No NextRunRepository or parallel Run structure was added.

The existing `createNextRunPreview` materializer clones the complete source Plan. It inherits the **exact source configurationPackageVersionId**, profile and Subject type pins rather than resolving active defaults. It carries Subjects, Operations, assignments, measurement intention, exact references and FIXED/VARIED intent. Inherited assignment provenance is `PREVIOUS_RUN`; explicit overrides use the existing `AD_HOC` representation and delta `CHANGED`. Root provenance is `PREVIOUS_RUN` with exact `sourceId` and source label.

Changed relative to the source is independent of intentional VARIED within a Run. The materializer copies `intentRole` unchanged. Integration tests explicitly change a FIXED numeric assignment and verify it remains FIXED. The verified DTS source Energy was already VARIED; its new value 36 does not create that role.

## Command and server materialization

`RunRepository.createFromPreviousRun(sourceRunId, decisionId, command)` extends the existing owner. The frozen UI calls DxtApplication, HTTP transport calls the application command, and PostgreSQL performs the same Slice 1 transactional snapshot persistence.

The command identifies the exact saved Decision, not a browser-provided Plan object. In the database transaction it resolves the source Run and that Decision's stored NextRunPreview, validates source membership, applies its explicit change list using the frozen materializer, and assigns a fresh Run identity. It then persists all normal Run tables and returns repository read-back. The source Decision/NextAction remain historical intent; they are not rewritten as the created Run.

The UI awaits success, disables creation while pending, reports errors, and uses the **returned allocated Run number** for the Open Plan link. It does not treat the preview's proposed number or the request object as the committed result. A stable request ID is retained during retries in the mounted authoring session. Opening the new Plan performs its normal repository lookup.

## Transaction, numbering, idempotency

No migration was needed. Existing Slice 1 schema already stores full snapshots, exact package/member references, source provenance and delta. Applied migrations 001–004 were not edited.

One existing Create Run transaction includes:

1. Insert or resolve the persisted idempotency record keyed by command identity; request hash covers source Run and exact Decision identity.
2. Read exact persisted source/proposal; fail explicitly if unavailable.
3. Lock the Study row and allocate its next Run number.
4. Materialize the entire new Plan, retaining the exact source package policy.
5. Insert Run root, RunSubjects, RunOperations, memberships, assignments/subtypes and measurement intentions, then advance Study numbering and complete the receipt.
6. Read the saved full snapshot before commit and return it.

Retries with the same command resolve the original committed Run. Different input under the same command ID conflicts. Concurrent distinct commands serialize numbering on the Study lock and have distinct Run numbers/identities. There is no unlocked MAX+1 allocation. A required assignment insert failure rolls back the root, all children, numbering change and receipt. Source Run rows are never updated by this path.

## Independence and provenance

`provenance.sourceId` stores the exact immutable source Run identity. New Plan reads use the new Run's own tables; they do not rebuild it from the source, current Study Setup, current display labels, or active Configuration. Tests change Study defaults and activate another package after creation, then compare the saved new snapshot unchanged.

Technical child IDs may be rebased when the actual Study allocation differs from the preview number. Scientific Subjects, Operation context, assignment values/roles/references, package pin, inheritance and delta meaning match Preview. Proposal-local delta IDs are not scientific comparison keys.

## Study navigation

Study → Runs and Study Navigator now consume repository-read Runs. A shared hook combines persisted Plan identities and existing lifecycle repository state for stage links. Newly created Runs enter Plan; an existing Run with Evaluation opens Evaluation. Browser composition explicitly supplies its existing presentation fixtures; production receives no fixture Run seeds. Failed production reads show errors rather than fixture rows.

The navigation path currently loads the existing Run snapshot list and per-Run low-volume lifecycle state plus Dataset metadata. It never loads raw Measurement values. This is sufficient for this bounded continuity slice; a paginated server-side Run navigation projection is a future scale improvement, not implemented here.

## Automated verification

All 239 tests passed: 108 domain, 122 workspace, 9 database-compatible integration groups. Native PostgreSQL 18/node-postgres also passed the complete integration harness including database stop/start and new application/pool/adapters.

`tests/postgres-next-run-contract.ts` proves for both Subject types:

- Preview read does not increase Run count; explicit creation does.
- Full Subjects/Operations/assignments and exact references match Preview scientifically.
- Changed FIXED values remain FIXED; inheritance and delta are retained.
- Source snapshot remains byte-for-byte structurally equal through repository reads.
- Same-command concurrent retries produce one Run; different commands allocate unique Study Run numbers.
- New snapshot remains unchanged after Study/default and active-package changes.
- Injected failure after root/Subjects/Operations but during assignment insertion leaves no partial authoritative state or receipt.
- RunRepository read/list contract works for the created ordinary Run.
- Recreated native database/application adapters restore the identical Plan; persisted command replay resolves the same created Run.

TypeScript, changed-file lint, PostgreSQL build, browser production build and `git diff --check` pass. Repository-wide lint still has the same 105 pre-existing errors, reported separately. No test claims production SLA or large-scale navigation performance.

## Real UI proof

Local app at port 3100 used `DXT_REPOSITORY=postgres`, native PostgreSQL 18 on loopback port 55437, database `dxt_slice_verified`. No new Run was seeded or created through a test-only browser shortcut.

Before either explicit Create, read-only SQL showed exactly the existing DTS Run 19 and Material Run 4. Opening the persisted Preview left that count unchanged.

DTS:

- Source Run 19: `run-4a07daaa-6728-46e7-b78e-90673177ce30-19`.
- Existing Decision Preview: Energy 35 → 36; Focus 0, Material D035 Rev.2, Recipe EXP-R01, Reticle RET-01 inherited.
- Clicked Create Next Run, awaited repository success, then Open Run #20 Plan.
- Created Run 20: `run-361973a6-61db-470a-adcb-86367fc6b6d1-20`.
- Native SQL confirmed 4 Subjects, 3 Operations, 5 assignments, exact source Run and `config-package-photo-v1`.
- Plan showed W01–W04, all Energy values 36, full inherited values, existing intent roles and measurement intentions without copied Actual/Measurement observations.

Material:

- Source Run 4: `run-51731d83-7942-4bc9-9421-bce236279fdd-4`.
- Used its exact previously saved Preview and explicit Create; no new scientific change was inferred from the action note.
- Created Run 5: `run-d4bc7521-e4e2-4f4c-b514-3f08c71f4e65-5`.
- Native SQL confirmed 4 Specimens, 4 Operations, 5 assignments and `config-package-material-rd-v1` with exact source Run.
- Plan restored Formulation F-BASE-01, Mixing Speed 500, Coating Thickness 20, Cure Temperature 120 and Cure Time 30. No Wafer, Site or MES was required.
- The previously saved frozen Preview contains an explicit same-value Formulation override (`F-BASE-01 → F-BASE-01`). This slice preserves that proposal and its existing provenance representation; it does not reinterpret the action note as a cure-temperature change. Meaningful changed-value preservation and Changed/FIXED separation are covered independently by both native and database-compatible tests.

The app process was stopped and restarted, replacing application composition and pool/adapters. For both studies, Study Runs and Navigator showed the new Run from repository data. Clicking the list's new Run link reopened the frozen Plan UI with the same Subjects, full values and intents. Native integration independently restarts PostgreSQL and compares entire snapshots and persisted retry results.

Review routes:

- `http://localhost:3100/series/dts-improvement/runs/20/engineering-grid?view=plan`
- `http://localhost:3100/series/adhesion-material-optimization/runs/5/engineering-grid?view=plan`
- `http://localhost:3100/series/dts-improvement?view=runs`
- `http://localhost:3100/series/adhesion-material-optimization?view=runs`

## Changed files

- `src/application/repository-ports.ts`: explicit Previous Run creation contract.
- `src/application/dxt-application.ts`: next-run command/read-back and explicit browser navigation seeds.
- `src/application/dxt-application-provider.tsx`: composition-only navigation seed injection and optional context for static standalone renders.
- `src/infrastructure/postgres/postgres-repositories.ts`: reuse existing transactional materialization, receipt and numbering path.
- `src/infrastructure/http/http-repositories.ts`, `app/api/repository/route.ts`: application transport for exact source/proposal command.
- Browser/InMemory repository implementations: same port over existing saved Decision Preview.
- `use-lifecycle-authoring.ts`, `evaluation-execution-grid.tsx`: stable retry command, awaited create, actual committed Run link and pending/error handling.
- `productized-series.tsx`, `series-explorer.tsx`, new `repository-series-runs.tsx` and `use-repository-series-runs.ts`: existing navigation supplied by repository reads.
- New `tests/postgres-next-run-contract.ts`; PostgreSQL-compatible and native harness integration.
- This report and transition documentation.

## Deferred boundary

SavedAnalysis production persistence and Analysis v2 remain deferred. No new Core Domain or Generic Framework semantics, UI redesign, workflow, integrations, scientific calculations or duplicate Run structures were introduced. Committed production Plan editing remains outside the earlier Slice 1 boundary; new Runs use the same ordinary lifecycle and can receive Actual/Measurement/Evaluation without a special NextRun model. The whole new Run lifecycle need not be executed again for this hand-off proof.
