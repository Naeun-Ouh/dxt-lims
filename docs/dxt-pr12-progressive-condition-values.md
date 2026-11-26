# PR #12 — Progressive condition authoring

Product decision: [7130508445](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7130508445).

## User flow

- Each condition starts with one **조건값 / Condition value** input. It is the common planned condition for Subjects to which the Operation applies.
- **대상별로 다르게 설정 / Set differently by Subject** reveals the Subject columns for that condition only.
- Expanded cells are labeled **대상별 조건값 / Subject-specific condition value**. Empty cells show **공통 조건값 사용 / Use common condition value**, with the common value and role when available.
- Clearing a Subject cell removes only that Subject-scoped assignment. It never creates an empty override. Common values and other Subjects' assignments remain unchanged.
- Existing Subject assignments are expanded on entry. Collapsing retains them and shows their count; it never clears or normalizes the draft.
- Non-applicable Subjects show **미적용** without an editor. A missing required common condition still fails the existing authoritative validation. Subject field errors are automatically revealed.
- Confirmation review uses the same new terminology. Only Final Create persists a Run.

No schema, domain, authorization, readiness, repository or Plan/Actual semantics changed. Assignment scope, ordering and role values are preserved; UI disclosure does not write data.

## Changed files

- `src/features/experiment-series/run-draft-condition-row.tsx`: per-condition progressive disclosure.
- `src/features/experiment-series/run-draft-condition-cell.tsx`: direct input and blank Subject fallback without an empty assignment.
- `src/features/experiment-series/run-draft-editor.tsx`: integrates rows; common condition header and instructions.
- `src/features/experiment-series/run-creation-review.tsx`: consistent review terminology.
- `src/shared/i18n/en.json`, `ko.json`: localized labels and helpers.
- `app/entry-final.css`: bounded, wrapping disclosure buttons.
- `tests/run-draft-grid.test.tsx`: scope-preservation, fallback and rendering checks.

## Agent verification

- Full repository tests: 341 PASS, including PostgreSQL adapter contracts.
- Focused tests: 15 PASS (11 draft grid/actions/feedback/review + 4 localization).
- TypeScript, changed-file lint, production build and diff checks: PASS.
- Browser Specimen: default common-only rows; expand/input/collapse/reopen preserves a scoped value; clear restores common value; non-applicable cells have no editor; empty required common value blocks confirmation with focused inline feedback.
- Browser Wafer: scientific IDs, values and units unchanged; option-valued Subject editor can select then clear back to common; authoritative validation reaches confirmation without scoped entries after clearing.
- KO/EN: readable labels and helpers; disclosure text wraps within its cell. No document-level horizontal overflow; Subject columns retain internal horizontal scrolling.
- Fixed a first-character focus loss found during agent verification by retaining the input's React key across unassigned/assigned transitions.
- Browser verification stopped before Final Create. No UAT Run or scientific data was saved. Previous 3242 server/tab was not modified.

## Human retest

Human acceptance for this UX: **NOT RUN**. Agent verification is not Human acceptance. PR #12 remains unmerged.

Fresh server, same preserved labeled UAT data:

- Specimen: http://127.0.0.1:3243/runs/new?series=agent-run-draft-specimen&from=previous-run
- Wafer: http://127.0.0.1:3243/runs/new?series=agent-run-draft-wafer&from=previous-run

Observe whether the participant understands the default condition, discovers the exception action naturally, understands empty Subject cells as inheritance, and can review the intended scope before final creation. Do not count agent-created confirmation as acceptance. Post-first-Run behavior and condition master metadata remain outside this task.
