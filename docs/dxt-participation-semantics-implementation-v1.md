# DXT Participation Semantics v1 — G01 + G02

Date: 2026-09-28. Scope: the participation gaps recorded in `dxt-final-figma-gap-audit-v1.md`; this does not close other audit gaps.

## Outcome

- **G01: CLOSED for the production-backed Run Plan workspace.** Operation-level single/multiple Subject participation can be staged with Apply/Cancel and persisted through the existing Save Plan command.
- **G02: CLOSED for the Actual and Measurement grid projections.** Nonparticipants are N/A, excluded from missing/pending expectations, while genuine out-of-plan observations remain visible and traceable.
- **25-wafer Human UAT: PARTIALLY READY.** The isolated 25-wafer fixture and automated branch/rejoin acceptance checks exist. The live UI was exercised using existing four-wafer Runs. A persisted, isolated 25-wafer UAT Run has not been provisioned and its interactive end-to-end walkthrough has not been performed. Do not mistake automated fixture coverage for completed human validation.
- No database schema/migration, Sample lifecycle, Study creation, Evaluation, Reference validation, or Analysis v2 change.

## Authoring and persistence

The existing `RunPlanningSnapshot.subjectOperationIds` is the Operation × Subject membership source of truth. No Split Group, branch identity, or additional persistence entity was introduced.

An Operation row's **N / total participants** opens a compact inline checkbox editor. It shows all Subjects in the Run snapshot, supports individual selection and select-all, and offers Apply/Cancel. Apply stages membership; Save Plan persists the full snapshot through the existing application/repository boundary. Cancel discards the open editor's tentative selection. An unsaved notice distinguishes staging from persistence.

Nonparticipating Plan cells show N/A and do not expose normal value inputs. Persisted assignments and Fixed/Intentionally Varied roles are retained, so participation is not a destructive assignment deletion. Unsaved value edits/errors on newly excluded cells are removed from the pending grid edit set. Existing selection/copy/paste behavior for participating values is retained.

Unsaved membership is applied only to the Plan presentation. Switching to Actual or Measurement continues to use committed membership; returning to Plan retains its staged edit until navigation/reload or save. No downstream observations are reinterpreted by an unsaved checkbox change.

Existing server authorization, optimistic version checking, atomic snapshot save, and downstream-evidence Plan lock remain authoritative. Participation controls are disabled for read-only/locked Plans; direct command rejection is also covered by repository tests. A lock discovered during loading/saving removes the stale participation draft.

Previous/Existing Run creation preserves source membership when remapping Operation IDs. Study Default continues its existing all-subject default; Blank remains empty.

## New-operation defaults

During Plan validation, a newly inserted Operation with no explicit participants inherits the preceding Operation's participants. Explicit nonempty membership wins, existing Operations are never re-defaulted, and later edits can remove every participant. A first Operation with no predecessor has no inherited participants.

The current model does not distinguish an explicitly empty participant set from an unspecified set on the first insertion of a new Operation. Both receive the upstream default; an empty final set can be authored afterward. No new Operation insertion UI or split/merge management workflow was added.

## Projection rules

### Actual

- Planned participant + absent evidence retains Missing Actual / no execution record.
- Nonparticipant + absent evidence is `NOT_PARTICIPATING`, rendered N/A and excluded from missing comparisons, counts, and filters.
- Nonparticipant + real evidence retains the execution event and actual values, with `unexpected`/out-of-plan indication and `UNPLANNED_ACTUAL` comparisons.
- Exact Run/Operation/Subject identity remains required. Evidence with a null planned-item link can still resolve through that identity; a conflicting non-null planned-item identity is not silently reassigned.
- Execution events and original Plan assignments are not rewritten by projection.

### Measurement

- Expected rows come from configured measurement plans, unioned with observed parameter/point rows. No measurement Operation, raw value, or dataset is fabricated.
- Participating Subject + no representative result remains Pending.
- Nonparticipant + no observation is N/A, excluded from Pending counts/filter results.
- Genuine nonparticipant observations remain inspectable and marked out-of-plan. Even evidence without an available representative value is not relabeled as an expected missing result.
- Subject/Site grain, raw evidence, validity decisions, dataset/execution references, and representative-result calculation are unchanged.

## Isolated branch/rejoin fixture

`tests/fixtures/participation-25.ts` uses existing PHOTO reference context and 25 wafer identities. It contains no acquired scientific measurements.

| Operation | Participants |
| --- | --- |
| P | W01–W15 |
| A | W01, W03, W05, W07, W09 |
| B | W02, W04, W06, W08, W10 |
| C | W11–W15 |
| D | W01–W15 |

W16–W25 participate in none of these Operations. Tests establish disjoint A/B/C, A ∪ B ∪ C = P, and D = P without a Split Group object. Across five Operations × 25 wafers, 45 pairs participate and 80 do not. With no execution evidence, the 80 nonparticipant projections are N/A and only participating expectations may be Missing. The configured D measurement has 15 expected pending results and 10 N/A cells.

## Files changed in this task

| File | Change |
| --- | --- |
| `src/features/run-registration/participation.ts` | Immutable membership edit and new-operation inheritance helpers |
| `src/features/run-registration/participation-editor.tsx` | Compact bilingual participation editor |
| `src/features/run-registration/engineering-grid.tsx` | Count action, staged membership, save integration, lock protection, Plan-only draft projection |
| `src/features/run-registration/planning-model.ts` | Reject duplicate Operation membership entries |
| `src/application/plan-authoring.ts` | Apply inheritance at existing Plan validation boundary |
| `src/features/experiment-series/run-entry-model.ts` | Preserve source participation on copied Operation IDs |
| `src/features/run-registration/actual-execution-model.ts` | Participation-aware status/comparisons and unexpected-evidence metadata |
| `src/features/run-registration/actual-execution-grid.tsx` | N/A rendering, missing filtering/counts, out-of-plan indication |
| `src/features/run-registration/measurement-grid-model.ts` | Configured/observed row descriptors and participation-state helper |
| `src/features/run-registration/measurement-execution-grid.tsx` | Pending expectations, N/A cells, retained out-of-plan observations |
| `src/shared/i18n/en.json`, `src/shared/i18n/ko.json` | Shared participation/action/status labels |
| `app/lifecycle-final.css` | Participation panel/checklist/actions/unsaved notice styling |
| `tests/fixtures/participation-25.ts` | Isolated 25-wafer branch/rejoin fixture |
| `tests/participation.test.tsx` | Nine focused semantics/rendering tests |
| `tests/postgres-plan-authoring-contract.ts` | Membership persistence/read-back and locked participation rejection |
| `tests/postgres-scientific-authorization-contract.ts` | Unauthorized participation save rejection |
| `tests/run.mjs` | Include participation test group |
| `docs/dxt-participation-semantics-implementation-v1.md` | This report |

Domain impact is restricted to membership and its expected-evidence projections. No scientific values, identities, authorization policy, immutable evidence, or schema were changed.

## Tests and validation

Nine focused tests cover topology; immutable single/multiple edits; invalid IDs/read-only edits; inheritance/explicit defaults; Actual missing exclusion and rendering; unexpected Actual retention; planned Measurement rows and pending exclusion; out-of-plan Measurement state; and bilingual editor/disabled Apply rendering.

The PostgreSQL contract extensions exercise membership save/read-back, downstream-evidence lock rejection, and a caller without Plan-edit permission. Tests use isolated PGlite databases, not the live UAT database.

Validation chronology and limits:

1. A complete run passed **295 tests** before the final UI-only polishing: participation 9, domain 108, localization 4, catalog 4, entry 10, workspace 139, PostgreSQL adapter 21.
2. After final edits, **TypeScript passed**, **changed-file lint passed**, and the **production client/server build passed**. Logs: `tmp/participation-tsc-final.log`, `tmp/participation-lint-final.log`, `tmp/participation-build-final.log`.
3. A complete rerun passed all **274 non-PostgreSQL tests**, but the PostgreSQL phase reported 3 passes/18 failures and terminated with disk exhaustion (`ENOSPC`). That attempt is **not** reported as a clean final full-suite pass. Log: `tmp/participation-tests-final.log`. Only the temporary databases created by this failed attempt were removed; unrelated files/databases were not cleaned up.
4. The final participation **9/9** and workspace **139/139** tests were then rerun separately and passed. Logs: `tmp/participation-final-participation.log`, `tmp/participation-final-workspace-inline.log`.
5. Repository lint over `app src tests scripts vite.config.ts` still reports **86 errors outside changed files**; changed-file lint is clean. Log: `tmp/participation-repository-lint-final.log`. No blanket lint cleanup was attempted.
6. `git diff --check` passed. No Native PostgreSQL rerun is claimed for this task.

Live 1440px browser checks, KO and EN:

- Run 20: open EXPOSURE participants; deselect multiple Subjects; Apply updates counts and removes normal inputs from excluded cells. Cancel leaves the applied set unchanged.
- Run 20: navigation/reload without Save restores committed membership and disabled Save Plan. No scientific write was submitted.
- Run 20: staged W02 exclusion followed by Actual still displays W02's committed expected execution state, rather than N/A.
- Run 19: existing execution lock disables participation buttons and Save Plan.
- Run 20 Measurement: zero datasets/zero raw observations still exposes its configured BCD and 3SIG expectations, with 8 pending results across 4 participating Subjects.
- Final inline editor screenshots in both languages show visible Apply/Cancel actions, compact checkbox layout, and no observed clipping/overlap. IDs and values are unchanged.

## Remaining boundaries and Human UAT

- Production-backed Run routes are the supported persisted authoring path. Legacy in-memory prototype screens do not gain a new persistence architecture in this task.
- New Operation insertion defaults have the empty-versus-unspecified limitation described above; there is no new insertion UI.
- Live 25-wafer provisioning, a human branch/rejoin walkthrough, and a clean full PostgreSQL rerun after disk space is restored remain to be done. The existing four-wafer browser workflow is usable now.
- This task does not claim overall DXT Human-UAT readiness or close other Figma-audit gaps.

Review routes:

- Editable Plan: `http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan`
- Locked Plan: `http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan`
- Actual / Measurement: same Run routes with `?view=actual` or `?view=measurement`.

For a 25-wafer human acceptance pass, provision the isolated fixture in a disposable UAT context, edit A/B/C/D membership through the count button, Save Plan and reload, verify N/A versus missing filters, then verify the existing evidence lock rejects further membership changes. Do not overwrite existing scientific Runs to manufacture this scenario.
