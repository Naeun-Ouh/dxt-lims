# DXT Study and Run Entry — Figma FINAL implementation

Implemented Figma file `ocXq0VLr5UFjSBBSza19W8`, nodes `127:8`, `127:132`, `127:251`, `127:427`, `127:502`.

## Screens and components

- Study Overview: compact shared shell, 200px Study navigator, Overview / Experiment Setup / Runs tabs, scientific context and target cards.
- Study Runs: existing authorized repository-backed Run navigation and list in the compact table; exact Run destinations and lifecycle remain unchanged.
- Study Experiment Setup: collapsible Operation group rows, inline default editors, Fixed / Varied badges with full accessible labels, optional existing Inspector. Ready context is a compact expandable summary; incomplete readiness retains the existing confirmation flow.
- Run creation: contiguous source selection rows, Review Inheritance primary action, centered empty preview.
- Run review: exact inherited package, Subjects, Operations and assignments; Item / Value / Intent / Source table; readiness and creation controls. Repeated labels and Subject/Position-specific assignments retain their visible distinguishing context. Unique item Operation context remains in the title attribute.
- Existing Korean/English locale mechanism reused. Identifier values, scientific values and units are unchanged.

## Files changed in this task

- `src/shared/ui/workspace.tsx`
- `src/features/experiment-series/entry-shell.tsx`
- `src/features/experiment-series/series-explorer.tsx`
- `src/features/experiment-series/productized-series.tsx`
- `src/features/experiment-series/study-setup-workspace.tsx`
- `src/features/experiment-series/study-readiness-panel.tsx`
- `src/features/experiment-series/run-entry-view.tsx`
- `src/shared/i18n/ko.json`
- `app/globals.css` — new scoped stylesheet import
- `app/study-final.css`
- `public/figma/study/` — 10 original Figma SVG assets, unchanged geometry
- `tests/entry-final.test.tsx`
- `tests/workspace-inline.test.tsx`
- This report

Existing unrelated workspace changes were retained.

## Product logic changed? NO

No changes to domain models, repository or application commands, authorization, database schema, scientific calculations, Plan locking, configuration activation or Run inheritance. Existing adapters still own all writes and preview/create behavior. Accordion and navigation state are presentation-only.

## Validation

- 1440 × 900 browser screenshots inspected for all five screens in Korean and English.
- Confirmed 32px global header, 24px breadcrumb, 200px Study sidebar, 500px Run-entry columns, right-aligned primary actions, no page horizontal overflow.
- Inspected exact SVG slots and loaded intrinsic geometry. Select arrows use the original Figma SVGs.
- Checked Operation collapse/re-expand and Inspector open/close; Material Study uses the same component.
- Live browser validation did not save Study Setup, create a Run, confirm readiness, or change scientific/configuration/authorization data. Only navigation, locale preference and local view state changed.
- TypeScript: pass.
- Changed TypeScript/TSX file lint: pass.
- Build: pass.
- `git diff --check`: pass.
- 274 tests pass across the final suite results: 108 domain, 4 localization, 8 entry UI, 133 workspace and 21 PostgreSQL adapter tests. Five source-text assertions initially depended on obsolete markup/formatting; updated to the new dedicated Runs view and whitespace/quote-independent checks. Both affected UI suites were rerun successfully after corrections.

## Deliberate differences from Figma sample content

- Existing data is authoritative: no sample scientific values, package IDs, Run counts or states were copied into stored data. In particular, current Focus remains FIXED and the Material Study inherits its actual five assignments.
- Full Run deltas and Subject-specific inheritance rows may be taller than Figma's sample rows to keep their distinguishing information visible.
- KO/EN locale controls remain available in the header.
- Existing Study metadata source remains unchanged; this UI task does not add a new metadata repository.
- No major clipping/overlap was found at the requested 1440px viewport.

## Review routes

- `http://localhost:3200/series/dts-improvement?view=overview`
- `http://localhost:3200/series/dts-improvement?view=runs`
- `http://localhost:3200/series/dts-improvement?view=setup`
- `http://localhost:3200/series/adhesion-material-optimization?view=setup`
- `http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default`
- For review: choose a source and click **Review Inheritance / 상속 내용 검토**. Creation is a separate action.
