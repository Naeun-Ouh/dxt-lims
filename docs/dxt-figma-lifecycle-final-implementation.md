# DXT Figma lifecycle FINAL implementation

Validated: 2026-09-27. Scope: presentation and interaction only.

## Design coverage

Source file: `ocXq0VLr5UFjSBBSza19W8`.

- `124:8`: Plan — compact shell, lifecycle navigation, operation hierarchy, frozen reference columns, subject grid, scope interaction, secondary Inspector.
- `124:204`: Actual — matching grid, comparison filters, execution detail selection, record disclosure and primary Save Actual.
- `124:360`: Measurement — matching grid, collection filters, subject/site detail, record disclosure and primary Save Measurement.
- `133:2350`: reviewed Evaluation — result summary, calculated target assessment, Engineer Comment and Run Conclusion.
- `133:2459`: missing-result Evaluation — explicit missing result and disabled evaluation save.
- `133:2567`: Evaluation Inspector — secondary result, definition and provenance context.
- `139:8`: Analysis Table — scope, selected results, save action and secondary result detail.
- `139:212`: Analysis Line — real observation data and series grouping.
- `139:437`: Analysis Scatter — run/subject or available coordinate axes.
- `139:677`: Analysis Inspector — exact selected-result context.

Shared changes: compact header/breadcrumb, locale-aware text, primary action at the right, and a 280px right Inspector closed until selection or an explicit Details action. Existing scientific values and identifiers remain unchanged.

## Files changed in this implementation

- `app/globals.css`, `app/lifecycle-final.css`
- `src/shared/ui/workspace.tsx`, `src/shared/ui/lifecycle-inspector-close.tsx`
- `src/features/run-registration/engineering-grid.tsx`
- `src/features/run-registration/actual-execution-grid.tsx`
- `src/features/run-registration/measurement-execution-grid.tsx`
- `src/features/run-registration/evaluation-execution-grid.tsx`
- `src/features/analysis/workspace.tsx`, `src/features/analysis/result-chart.tsx`
- `src/shared/i18n/en.json`, `src/shared/i18n/ko.json`
- `public/figma/lifecycle/*.svg` — local source-design icons
- `tests/workspace-inline.test.tsx`
- This report.

Other existing working-tree changes predate this task and are not attributed to this implementation.

## Button and navigation verification

Browser checks used existing UAT data, at 1440 × 900 in Korean and English. Live scientific writes were not submitted.

- Lifecycle tabs preserve the current Study/Run; Analysis receives the existing Study, Run and parameter context.
- Plan: operation expand/collapse, All/Varied filters, subject navigation, cell selection, Inspector close, Focus range, Define Scope, Continue, Back and Cancel checked. Editable Run 20 and locked Run 19 checked. No scope confirmation or plan write submitted.
- Actual: record panel open/cancel, All/Differs from plan/Not recorded filters, subject selection, operation expansion, result selection, Inspector close, Go to Measurement and Compare to Plan checked. Compare returns to the same Run's locked Plan when execution evidence exists.
- Measurement: record panel open/cancel, All/Collected/Pending, operation expansion, result selection and Inspector close checked. Site detail remains a disclosure; unavailable Material site detail stays disabled.
- Evaluation: subject switching, Details/close, Subject Evaluation, missing-result disabled Save Evaluation, Next Run preview and Cancel checked. Switching to missing W02 does not display W01's recorded conclusion.
- Analysis: Table, Line, Bar and Scatter each select a distinct view; scope toggle, table Inspect, chart-point selection, Inspector close, Save Analysis panel open/close and opening an existing Saved Analysis checked. Updating an existing saved analysis is labeled separately from Save Analysis. Sharing stays disabled under the current authorization context.
- Save/create persistence behavior is covered by the existing isolated command/repository tests. Live Save Actual, Save Measurement, Save Evaluation, Save Decision/Next Action, Save Analysis and Create Next Run were deliberately not submitted against UAT data.
- Import from Tool / Import Data are explicitly disabled with explanation because an existing supported import command is unavailable. They do not navigate to a dead-end screen or pretend to save data.

This verification covers the target lifecycle screens and their button groups; it is not a claim that every unrelated application menu or every authorization role was exercised.

## Validation

- 280 tests passed across the final suite results: domain 108, localization 4, entry 8, workspace 139, PostgreSQL adapter 21.
- The initial full run identified three stale UI assertions; they were corrected and the final workspace suite passed all 139 tests.
- TypeScript: passed.
- Changed TSX-file lint: passed.
- Application production build: passed.
- `git diff --check`: passed.
- PostgreSQL adapter tests used the existing isolated test setup; native PostgreSQL integration was not rerun in this task.
- Browser screenshots were inspected at 1440px for Plan, Actual, Measurement, Evaluation and Analysis. No major page overflow, toolbar clipping or Inspector alignment issue remained in the checked Korean/English states. Inspector width was verified at 280px.

Added regression checks cover missing-result save protection, closed-by-default authoring/Inspector surfaces, render without writes, distinct Analysis view identities, unchanged scientific chart values and bilingual Inspector close actions.

## Preserved behavior and remaining differences

Product/domain logic changed: **NO**. Repository behavior, authorization policy, schema, Plan locking, measurement calculations, target assessment and command boundaries are unchanged. Chart presentation groups existing observations by parameter/unit; it does not derive or replace scientific results.

- Actual UAT data determines counts and chart density. Figma's example scientific data was not fabricated.
- Evaluation and Decision remain separate existing commands. Required engineer judgment and conclusion details remain available within the compact UI; no combined save transaction was invented.
- Actual and Measurement recording retain the existing command fields in a collapsible authoring panel.
- Unsupported import actions remain disabled.
- Visual validation targets meaningful layout fidelity, not pixel-identical font rasterization.

## Review routes

- Editable Plan: `http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan`
- Actual: `http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual`
- Measurement: `http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement`
- Evaluation: `http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation`
- Material: `http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=evaluation`
- Analysis: `http://localhost:3200/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1`
