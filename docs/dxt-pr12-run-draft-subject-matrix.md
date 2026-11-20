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
