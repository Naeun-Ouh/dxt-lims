# Production Adapter Slice 4 — Evaluation, Decision and Next Action

Review: 2026-09-17 (implementation and local authoring began 2026-09-16).
Status: **YES — Slice 4 acceptance complete**. Implementation and automated native PostgreSQL proof pass. Real browser authoring and post-process-restart Evaluation/Decision/NextAction and Preview checks passed for both Wafer and Specimen. The final Wafer check completed on 2026-09-17 after explicit user approval restored browser access.

## Frozen boundary

Measurement Result → calculated Target Achievement → human Engineer Evaluation → Decision → Next Action remains intact. Target Achievement uses the existing `calculateTargetAchievement` projection over exact Target and representative Measurement result. No editable achievement table or independent achievement authority was introduced.

EvaluationRepository owns Engineer Evaluation. DecisionRepository owns distinct Decision and NextAction records. The existing UI saves Decision and Next Action together; that frozen command remains atomic. There is no new NextAction-only UI/workflow. Saving continuation intent does not create a Run. SavedAnalysis remains explicitly unsupported in production.

## Tables and exact references

Incremental, checksum-locked migration `004_evaluation_decision.sql` follows unchanged 001–003:

- `reasoning_context`: immutable exact Study/package-bound snapshot of the existing Target bindings and reference catalog needed by the frozen Evaluation/NextAction UI. Technical UUID plus unique Study/package. This fills the concrete dependency where earlier slices had not persisted the existing static Target/NextAction configuration. It is configuration, not a judgment or achievement cache.
- `evaluation_state`: independent Run-scoped optimistic aggregate version.
- `engineer_evaluation`: technical UUID, stable frozen authoring ID, Run/RunSubject, context, Target identity and exact MeasurementSummary FK; human disposition, rationale, evaluator and timestamp are the frozen payload.
- `evaluation_current`: ordered current evaluation identities; no copied observations.
- `decision_state`: independent optimistic version and current Decision pointer.
- `decision`: technical UUID, stable frozen authoring ID, Run and exact reasoning context, conclusion/rationale/author/time and frozen continuation scope. The existing Next Run Preview is a Plan proposal, stored separately from the Decision payload; it contains no Measurement values.
- `decision_evaluation_ref`: ordered exact Evaluation identities selected as evidence.
- `decision_result_ref`: ordered exact Target/Summary references and the calculated status captured by the frozen Decision context. This status is historical computational context, never the authoritative current Target Achievement. Summary resolves the exact Dataset, MeasurementExecution, Parameter and Subject; values are not copied.
- `next_action`: separate technical UUID, Decision FK, exact configured action-type identity and frozen action note. No assignee, due date, schedule, approval or PMS fields.
- `reasoning_command_receipt`: Run/kind/command uniqueness, canonical request hash, successful version and exact result identities. No copied scientific values.

Run/Subject composite FKs, parent FKs and unique technical/domain identities enforce structure. Application validation checks exact Target/Parameter/Summary matching, Run membership, configured action type and source Run/preview validity. Missing scientific references fail explicitly; they never fall forward to another Dataset. Measurement immutability and FKs prevent referenced evidence from disappearing under existing retention behavior.

Indexes cover Evaluation Run/Subject, Target/Summary, Decision Run and reverse Decision/Evaluation references. These are small human-authored aggregates, not a high-volume Measurement data store.

## Authoring and editing

The frozen authoring functions assign a new identity for a new save and replace the current Subject/Target judgment or Run decision. Persistence preserves the older identity and updates the current pointer. This allows an existing Decision to retain its exact previous Evaluation reference after re-evaluation. It adds neither a revision-history UI nor event sourcing nor enterprise audit workflow.

Existing author/timestamp fields are retained. The local proof uses the existing mock profile names (Lee Seunghyun and Kim Jiwon) only as development actors, not authenticated enterprise identities. Rationale explicitly labels development verification. Authentication/authorization is not implemented.

No automatic Achievement status is required by Evaluation persistence. The frozen contract still requires a measured Subject summary and a Target identity; a configured target with no calculable comparison may produce NOT_EVALUABLE while a human records judgment. A targetless authoring UI is not added. Tests verify NOT_EVALUABLE projection, and the write path does not gate on ACHIEVED/NOT_ACHIEVED or create fake achievements.

## Transactions, retries and concurrency

Each Evaluation or combined Decision/NextAction save is one native transaction:

1. Lock the owning Run to serialize competing writes.
2. Look up the persisted command receipt before version checking. An identical retry is a no-op; different content with the same command ID conflicts.
3. Require expectedVersion and compare the independent Evaluation or Decision version.
4. Validate exact scientific references and insert immutable records/links.
5. Update current pointers and version; commit the receipt atomically.

A failure during NextAction insertion rolls back the already inserted Decision and leaves current state/version and receipts unchanged. Retried older commands do not restore older current judgment. Different content under an existing authoring identity conflicts. SQL-specific write errors become application-level errors; stale writes are `CONFLICT`.

Browser and InMemory implementations share versioned envelopes and retry semantics for contract parity. They are used only in their explicit compositions/tests. Production uses PostgreSQL exclusively. No fallback path was added.

UI saves await commit, disable repeat clicks while pending, preserve command identity/time for retry, then perform a separate repository read. HTTP → DxtApplication → repository → PostgreSQL remains the command path. Evaluation loading obtains persisted exact definitions and all user-authored reasoning through repositories, not fixture judgments. Analysis continues to query MeasurementRepository and its existing Continue to Evaluation link remains unchanged.

## Verification

Automated validation passed:

- 238 tests: 108 domain, 122 workspace, 8 PostgreSQL-compatible integration groups.
- Native PostgreSQL 18/node-postgres: both Subject types, exact evidence links, stored retries, competing expectedVersion writers (one success/one Conflict), rollback injection and historical Decision references after re-evaluation.
- Shared repository behavior against PostgreSQL, InMemory and Browser.
- Native database stop/start plus new pools/application/adapters; Evaluation, Decision, NextAction and preview compare equal after restart, and old command retries do not revert current state.
- Unavailable Summary references reject without changing state.
- Existing Measurement/Analysis and Plan/Actual regressions remain passing.
- TypeScript, changed-file lint, PostgreSQL and browser production builds, `git diff --check`.
- Migration re-execution verified all four checksums.

Repository-wide lint debt is separate: the existing 105 errors in domain tests and pre-existing UI components remain outside this slice.

## Real browser proof and completed acceptance

Verification app: `http://localhost:3100`, `DXT_REPOSITORY=postgres`, native PostgreSQL 18 on loopback port 55437, database `dxt_slice_verified`. Only existing definition context was explicitly provisioned; no Evaluation/Decision/NextAction records were seeded.

Wafer, DTS Improvement Run 19:

- Analysis → Continue to Evaluation worked over persisted BCD 17.1 nm / SITE S01.
- Target 16.8–17.2 nm projected ACHIEVED; human disposition ACCEPT and distinct rationale saved/read back.
- Evaluation `evaluation-1789566999470-yz1wl1` references `measurement-1789565346595-bb0umt:summary`.
- Decision `decision-1789567022024-jmcucu`: proceed with controlled process-window validation.
- Separate Next Action: design the next experiment with Energy 36 while retaining other conditions.
- Existing Next Run Preview opened, preserving full inherited Plan and Energy 35 → 36 delta.

Specimen, Adhesion Material Optimization Run 4:

- Analysis → Continue to Evaluation worked over persisted Peel Force 5.8 N / SUBJECT, no Site or MES.
- Target ≥22 N projected NOT ACHIEVED; human disposition INFORMATIVE saved separately.
- Evaluation `evaluation-1789567142406-7sqevp` references `measurement-1789565453341-o9esbj:summary`.
- Decision `decision-1789567191867-y1lp32`: retain specimen as the baseline for formulation revision.
- Separate Next Action note requests controlled cure-temperature validation. The preview retained the current default selected assignment; no new Run was created. Preview remains a separate explicit Plan proposal, not execution of the note.

Read-only native SQL confirmed both Evaluation → exact Summary → Decision → NextAction chains. The app process/pool was destroyed and recreated. Material's Evaluation reasoning chain and Next Run Preview reopened unchanged.

The initial final Wafer inspection was blocked by two automatic approval-review timeouts. After explicit user approval on 2026-09-17, a new browser tab loaded the restarted app successfully. It displayed W01 BCD 17.1 nm, calculated ACHIEVED, Engineer Accept, the original development rationale, and the original controlled process-window Decision. Design Next Experiment remained available, and Preview Next Run restored Run 20 from Run 19, four inherited assignments and Energy 35 → 36. No new scientific records or Run were created during this final read-only verification. Both native restart assertions and real browser restart checks now pass for both Subject types.

All required Slice 4 acceptance gates are closed. Review routes:

- `http://localhost:3100/series/dts-improvement/runs/19/engineering-grid?view=evaluation`
- `http://localhost:3100/series/adhesion-material-optimization/runs/4/engineering-grid?view=evaluation`

## Next Run and deferred scope

Next Run Preview is repository-restored and reachable. Saving a NextAction leaves Run count unchanged. The production HTTP Run repository still rejects `saveSnapshot` for previous-Run creation; only Study-default creation is exposed. Therefore Create Next Run is not newly implemented or claimed verified here. Production Previous Run → Next Run creation is the next continuity task. There is no browser-fixture substitute.

Other deferred work: SavedAnalysis production adapter, Analysis v2/grid-first analysis, preprocessing, approval/e-signature, audit product, auth, object storage, integrations, task management/WBS, AI and DOE. Target/NextAction context provisioning is explicit bootstrap; future versioned Target authoring should replace bootstrap without mutating existing pinned contexts.

## Changed files for this slice

New:

- `src/application/reasoning-record.ts`
- `src/infrastructure/postgres/migrations/004_evaluation_decision.sql`
- `src/infrastructure/postgres/reasoning-context.ts`
- `src/infrastructure/postgres/postgres-reasoning-repositories.ts`
- `scripts/seed-production-reasoning.ts`
- `tests/postgres-reasoning-contract.ts`
- this report

Updated:

- Application repository ports and DxtApplication
- PostgreSQL composition/unsupported guards; HTTP, Browser and InMemory adapters
- Repository API route
- Lifecycle authoring state/hook, engineering-grid persisted context selection and awaited Evaluation UI save handlers
- Ordered migration runner
- PostgreSQL/native test harnesses and Run/Execution deferred-repository assertions
- Production transition and persistence schema documents

Core Domain and Generic Framework files were not changed by this slice. The working tree contains extensive earlier implementation changes; they are not all attributable to Slice 4.
