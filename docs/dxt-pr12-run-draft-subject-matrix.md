# PR #12 — Subject objects and Operation × Subject authoring matrix

## Scope and observed problem

Human feedback: the Subject textarea did not convey individual experiment objects; separating Operation order from condition authoring obscured which Operation/Subject the values belonged to. This feedback motivates a bounded UI refactor. It is not recorded as acceptance of the new UI.

Read Issue #1, #14, #11 and the latest PR #12 comments before implementation. Based on c01c7f2. No merge; Issue #13/#9 remain excluded.

## Changes

- Subject objects: add by ID and optional display name, then show individually in a compact list. Explicit explanation of Wafer/Specimen identity, immediate count, blank/duplicate ID feedback, individual removal. This is transient Run authoring, not Sample master registration.
- One semantic table replaces separate Operation order and Conditions sections. Operation rows contain attributes and participation checkboxes; nested condition rows keep their Operation context. Subject columns align across every row.
- Left reference block: order, Operation, type, area, equipment, module, reorder/remove. Attributes can be collapsed to make room for Subject columns. Desktop reference columns freeze; narrow screens use internal horizontal scrolling without a page-wide overflow.
- Right block: common assignments followed by each Subject. Common and Subject-specific assignments remain separately editable with their original scopes. Existing assignment array order is preserved. Rendering does not convert common values into individual assignments, manufacture values, or infer new precedence. Both assignments are explicitly labeled when present.
- Non-participating cells show 미참여, not Missing; their condition inputs are absent. Participating cells without required coverage show Missing. Switching participation preserves the existing removal of excluded Subjects' scoped assignments and retains common assignments.
- Required/optional metadata, value format feedback and FIXED/VARIED roles remain visible. KO labels are 고정 조건 / 실험 변수 with the approved definition.
- Operation lookup retains search, context rows, multi-selection and ordered Add. Moving an Operation carries its conditions/participation unchanged. Measurement plan remains the existing separate section, now numbered 3.

## Files

- `src/features/experiment-series/run-draft-editor.tsx`: unified matrix and ordered Operation interactions.
- `src/features/experiment-series/run-draft-subjects.tsx`: Subject object form/list and removal projection.
- `src/features/experiment-series/run-draft-condition-cell.tsx`: scoped condition editor and feedback.
- Removed `run-draft-conditions-grid.tsx`: obsolete standalone condition table.
- `run-draft-measurement-grid.tsx`: section numbering only.
- `app/dxt-grid.css`: shared-token matrix density, sticky references, object form and cell layout.
- `src/shared/i18n/{ko,en}.json`: shared user-facing labels.
- `tests/run-draft-grid.test.tsx`: matrix coverage, raw value/role preservation, Subject removal and no render-time mutation.

## Preserved boundary

No domain, schema, authorization, readiness, repository, scientific value, exact pin, Study Default or historical Run changes. No persisted draft entity. No Target/Evaluation requirement. No new automatic participation when an object is added to an existing Operation. Explicit operation addition retains the existing all-current-Subjects participation behavior.

## Agent validation

- Focused matrix tests: PASS, 5 tests.
- TypeScript, changed-file lint, production build and diff whitespace: PASS.
- Full suite: 335/335 PASS. Native PostgreSQL 18: PASS. Initial concurrent verification exhausted local disk space (ENOSPC / PostgreSQL 53100); sequential reruns distinguish environment failure from product failure. No UAT database was deleted.
- Browser, isolated port 3239: Specimen and Wafer sources, KO/EN, 1440px/720px, object addition/removal, duplicate rejection, nonparticipation of newly added objects, scoped condition editing, excluded scoped-condition cleanup with common value retention, master Add, Operation reorder/remove with value retention, valid execution-ready previews, invalid numeric value with actionable feedback and disabled Create.
- Preview only: no Create Run/Save Setup/Target action performed. Agent-only transient input values were not persisted. Existing 3237 and earlier environments/tabs preserved.

## Human retest

Human acceptance: NOT RUN for this revision. Agent checks are not Human acceptance.

UI inspection using existing AGENT data:
- Specimen: http://127.0.0.1:3239/runs/new?series=agent-run-draft-specimen&from=previous-run
- Wafer: http://127.0.0.1:3239/runs/new?series=agent-run-draft-wafer&from=previous-run

Inspect whether the meaning of each Subject object is clear; add/remove a draft object; identify participation and conditions in the same Operation; compare common versus individual scopes; collapse attributes and scroll Subject columns; reorder an Operation and check attached values. Do not report a human pass from these agent checks. Broader first-Run Human UAT remains pending.

Remaining: human usability acceptance; source master display-name completeness. Missing display names are not replaced by technical IDs.

## Wording-only Human UAT follow-up

Implements Product/Architecture decision [7041220375](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7041220375).

- Draft/Measurement-plan/Preview terminology: 공정 적용, 적용/미적용. Explicit helper: 이 실험 대상이 해당 공정을 수행하는지 지정합니다. 미적용은 결과 누락이 아니라 해당 공정의 대상이 아님을 의미합니다.
- Common assignment → 공통 계획값; Subject-specific assignment → 대상별 계획값, including Add actions, coexistence helper and Preview. These are planned conditions, with no Actual/history implication.
- Dedicated authoring labels avoid relabeling existing Actual/evidence projections. Internal participation fields, enum values, scope/order, callbacks, readiness and persistence remain unchanged.
- Existing grouped child rows/background/indentation and attribute collapse retained; no additional expand/collapse behavior or redesign.
- No condition-range schema or editor added. Min/max/unit/options/precision/requiredness belong to future condition master/reference metadata; existing metadata consumption stays unchanged.
- Validation: 5 existing matrix invariant tests (extended terminology assertions) + 4 localization tests PASS; TypeScript, changed-file lint, diff whitespace PASS. Browser KO 1440px, EN 720px, intact controls/no page overflow, execution-ready read-only Preview with planned terminology. No scientific write/Create action. Full backend/native suites not repeated for wording-only changes; the earlier 335-test/native result belongs to the preceding revision.
- Isolated wording preview: http://127.0.0.1:3240/runs/new?series=agent-run-draft-specimen&from=previous-run . Existing 3239 environment/input preserved.
- Human retest required; agent checks are not acceptance. PR remains unmerged.

## Preview / Create discoverability follow-up (2026-11-23)

Product decision: PR #12 comment 7103334680. UI-only correction.

- Preview action is now `실험 차수 미리보기` (`Run Preview`). It still calls the existing non-persistent preview/readiness boundary.
- `실험 차수 생성` remains visible as the rightmost primary action before and after Preview. Initial/loading/unavailable states disable it. The adjacent live description explains why, with `미리보기를 먼저 확인해 주세요.` before review or the translated exact missing prerequisites after NOT_READY.
- Only the current READY preview enables Create. Existing draft/source edits clear the preview and disable Create again. Busy requests disable both actions.
- Existing Create handler, fingerprint/idempotency handling, readiness, authorization, domain, schema and persistence are unchanged. No scientific data was saved during verification.

Validation: 10 focused tests PASS (6 grid/action tests and 4 localization tests), TypeScript, changed-file lint and `git diff --check` PASS. KO/EN action-state coverage includes initial, unavailable, NOT_READY, READY, busy and cleared preview. Browser: initial disabled reason, server READY enables Create, removal of a required condition clears Preview and disables Create, then NOT_READY explains the missing Cure Time condition in KO and EN. Visual check shows both actions right-aligned and the reason directly below. Browser fill attempt did not change the controlled value; the edit-invalidation check instead used the existing remove-condition control in an isolated agent draft. No Create action executed. Full repository/PostgreSQL/build suites were not rerun for this presentation-only change.

Verification server: http://127.0.0.1:3241/runs/new?series=agent-run-draft-specimen&from=previous-run . Existing UAT servers/data were preserved. Agent observations are not Human acceptance. Human retest of Preview/Create discoverability remains required; PR #12 must remain unmerged.
