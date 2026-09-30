# Samples / Reference Studio FINAL implementation

Implemented 2026-09-27 from Figma file `ocXq0VLr5UFjSBBSza19W8`.

## Screens and review routes

- `152:7` Samples list, filters, selected Sample Inspector: `/samples` (select D031 or D035).
- `152:195` Sample detail, revision table, selected revision context: `/samples/D031`.
- `152:351` Create Sample presentation: `/samples` → Create sample. This remains the existing non-persistent registration preview; Review Sample / Finish review do not save a Sample.
- `152:452` Definitions, filters and optional Inspector: `/reference?section=definitions`.
- `152:678` Applicability grid and optional Inspector: `/reference?section=applicability&definition=condition-energy-v1&inspector=1`.
- `152:916` Package Versions and optional Inspector: `/reference?section=packages&package=config-package-photo-v1&inspector=1`.
- `152:1124` Package Review: `/reference?section=packages&package=config-package-photo-v1&review=1`.

Use `http://localhost:3200` as the base URL. Exact visible package versions remain subject to the current server-authorized repository projection.

## UI changes

A scoped catalog shell reuses the common header, bilingual locale switch and footer. Samples and Studio use compact tables, pale borders, shared typography, right-aligned primary actions and a 280px secondary Inspector. Studio navigation is a horizontal tab strip. Closing an Inspector returns the table to full width. Narrow screens stack the Inspector and allow table scrolling.

Samples retains actual D031/D035 catalog data. Selecting a revision changes its attributes/structure and trace details together; the identity header continues to show the true latest revision. Existing revision and usage links remain available. Create Sample uses a single form with optional revision/structure detail instead of five wizard pages. Its existing preview-only boundary is explicitly labeled.

Studio filters operate only on the repository-resolved, already-authorized rows. Package Review displays exact included definition revisions, rule sets and readiness; the existing validation and activation commands and permissions are reused. Opening review does not execute a command. Existing technical manifest access, configuration test surface, authoring forms and immutable revision behavior remain available.

## Files changed in this task

- `app/globals.css` — one scoped stylesheet import.
- `app/sample-studio-final.css` — Samples and Studio presentation.
- `app/reference/page.tsx` — optional review query state.
- `src/shared/ui/workspace.tsx` — opt-in catalog shell and active navigation.
- `src/shared/ui/inspector-drawer.tsx` — optional Figma close SVG; existing consumers retain their default.
- `src/features/sample-explorer/explorer.tsx`.
- `src/features/sample-detail/detail.tsx`.
- `src/features/sample-create/create-sample.tsx`.
- `src/features/reference-studio/home.tsx`.
- `src/features/reference-studio/definitions-view.tsx`.
- `src/features/reference-studio/applicability-view.tsx`.
- `src/features/reference-studio/package-view.tsx`.
- `src/shared/i18n/en.json`, `src/shared/i18n/ko.json`.
- `public/figma/catalog/search.svg`, `public/figma/catalog/close.svg` — supplied Figma assets, intrinsic geometry preserved. Existing identical shell assets reused.
- `tests/catalog-final.test.tsx`, `tests/run.mjs`.
- `tests/workspace-inline.test.tsx` — three source assertions updated to recognize localized labels; test intent preserved.
- This report.

## Validation

- TypeScript: passed.
- Changed implementation files and new test lint: passed.
- Build: passed (client and server).
- `git diff --check`: passed.
- Test groups: domain 108; localization 4; catalog 2; entry 10; workspace 139; PostgreSQL adapter 21. Total 284 tests passed across the full run and targeted rerun. The initial full run's two workspace failures were literal-source assertions after localization; updating the assertions and rerunning all 139 workspace tests passed. No assertion about permissions or immutability was removed.
- New tests verify bilingual catalog data fidelity and that rendering all Studio sections / Package Review performs zero command calls and leaves the configuration registry unchanged.
- Live read-only UI checks at 1440px: Samples selection, D031 detail and Rev.1 selection; registration review/cancel; Definitions → Applicability → Packages → Review; EN/KO switching; Samples search and Studio status filter; read-only authorization states. No live Save, Create Definition, activation, deactivation or scientific write was submitted.
- DOM measurements: no document horizontal overflow, Inspector width 280px, primary review action aligned to the content's right edge; SVGs loaded successfully with nonzero intrinsic dimensions.
- Screenshots were visually inspected for the seven structures. The in-app screenshot provider renders a scaled top-left image inside its full-page canvas at the forced viewport; therefore this is structural visual validation with DOM geometry, not a claim of a pixel-perfect screenshot diff.

## Deliberate differences from illustrative Figma data

- No invented materials, authors, certificate/QC data, timestamps or activation history.
- Sample creation still does not persist; new revision creation and Mark Inactive were not added because the existing Sample implementation has no corresponding command boundary.
- Package creation remains the existing draft → assemble → validate sequence. No approval workflow was introduced.
- Package Review shows actual rule-set coverage and historical-pin safety rather than fabricated approval/activation history. Current UAT permissions disable authoring actions as before.
- Scientific names, identifiers, enum values and units remain exact; labels/actions are localized. Real row counts can differ from the example designs.

Core domain, repository behavior, authorization policy, database schema and scientific semantics changed: **NO**.
