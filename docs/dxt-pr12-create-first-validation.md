# PR #12 — Create-first validation and final review

Product decision: [7130049724](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7130049724).
Supersedes the mandatory Preview → Create UX at 202dae2. Do not merge before Human UAT passes.

## Behavior

1. `실험 차수 생성` / `Create Run` calls the existing authoritative `previewCreation` boundary with the current transient draft and source fingerprint. A separate Preview action is no longer required or displayed.
2. NOT_READY preserves the draft and persists nothing. Subject and Operation errors appear in their authoring sections; missing/invalid conditions appear at the corresponding scoped cells; Measurement errors appear at the relevant Measurement row alongside existing point/parameter/supporting-parameter feedback. Focus and scrolling move to the first error. An action-area summary lists the server's prerequisites, with duplicate condition messages collapsed for presentation.
3. READY opens an inline `실험 차수 생성 확인` / `Confirm Run creation` review. It includes all Subjects, ordered Operations, applicable and non-applicable Subjects, scoped condition values/roles and Measurement plans. The editor/source controls are temporarily disabled while the review is open so the reviewed plan cannot silently diverge from the draft.
4. `취소` returns to the unchanged transient draft. `최종 생성` is the only UI action calling `createFromPreview`. Existing fingerprint, server revalidation, idempotency, concurrency and rollback behavior remain intact. Failed final-confirm retries retain the command ID; interrupted-response copy does not claim that a write definitely failed.
5. Permission/source/network errors appear near the actions with existing permission/conflict guidance or a draft-specific retry message. No separate Study Setup save is requested by the generic Run error.

No schema, domain, authorization, readiness or repository changes. No Target/Evaluation/Next Action gate, automatic scientific defaults, condition-range schema, or Issue #13/#9 work. FIXED/VARIED and Not Participating != Missing remain unchanged.

## Files

- `production-run-entry.tsx`: UI orchestration, review visibility, server-error placement and focus.
- `run-draft-actions.tsx`: single Create-first action and concise feedback.
- `run-creation-review.tsx`: non-persistent review with Cancel / Final Create.
- `run-draft-feedback.tsx`: maps existing server messages to UI locations; never determines readiness.
- `run-draft-subjects.tsx`, `run-draft-editor.tsx`, `run-draft-condition-cell.tsx`, `run-draft-measurement-grid.tsx`: local feedback at authoring locations. Condition input length reflects the existing 4000-character request constraint.
- `app/entry-final.css`, `src/shared/i18n/en.json`, `ko.json`: feedback styling and shared KO/EN labels.
- `tests/run-draft-grid.test.tsx`: Create-first action state, exact scoped feedback, non-participating exclusion, review content and non-mutation checks.

## Agent validation (not Human acceptance)

- Full repository tests: 339 PASS, including PostgreSQL adapter contracts.
- Native PostgreSQL 18 contract suite: PASS in an isolated temporary database, including non-persistent preview, rejected incomplete creation, final creation, readback, explicit permissions and retry/concurrency/rollback contracts.
- Final focused tests: 13 PASS (9 grid/action/feedback/review plus 4 localization).
- TypeScript, changed-file lint, production build and `git diff --check`: PASS.
- Browser Specimen: blank Create displays separate Subject/Operation errors and focuses the first; populated Create opens review without Preview; Cancel preserves the draft; removing a required common condition highlights only applicable Subjects; no review is opened for invalid input.
- Browser Wafer: Create opens the review directly; Cancel restores editable draft; invalid numeric Energy highlights its common-value cell; missing CD-SEM plan is explained in that Measurement row. KO/EN messages were inspected.
- Browser checks stopped before Final Create. Existing UAT data and the user's completed Run 2 were not changed. Final persistence behavior was exercised only by isolated contract tests.
- Development hot reload briefly lost the application provider after source synchronization. Restarting only the new 3242 server resolved it; the final review/Cancel flow was rechecked on a fresh load.
- A disk-space write failure was recovered before validation; only an abandoned October test-bundle directory was removed. Existing UAT databases/servers were preserved.

## Human retest

New UI server (old 3241 preserved):

- [Specimen / Previous Run](http://127.0.0.1:3242/runs/new?series=agent-run-draft-specimen&from=previous-run)
- [Specimen / Blank](http://127.0.0.1:3242/runs/new?series=agent-run-draft-specimen&from=blank)
- [Wafer / Previous Run](http://127.0.0.1:3242/runs/new?series=agent-run-draft-wafer&from=previous-run)

These routes reuse explicitly labeled existing agent/UAT Studies; the saved source Runs are read-only inputs. Old saved data is not reset. Scientific values are existing test inputs, not endorsed experimental values.

Observe without pre-teaching button locations: can the participant start creation, understand each blocking input, correct it, inspect review, cancel without losing the draft, and finally confirm creation? Then verify Plan readback and reload persistence. Record the exact inputs/actions and observations. Do not infer Human acceptance from agent checks or eventual navigation alone.

Revised-flow Human acceptance: **NOT RUN**. Previous Preview/Create usability result remains FAIL for the superseded UX. PR #12 remains unmerged.
