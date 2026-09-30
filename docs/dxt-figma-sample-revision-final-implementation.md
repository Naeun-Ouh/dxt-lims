# Sample revision detail — Figma FINAL implementation

Figma source: `ocXq0VLr5UFjSBBSza19W8`, nodes `157:5` and `157:220`.

## Implemented

- Shared catalog page shell and compact 56px revision summary header.
- Material hierarchy with inline exact property values and composition ratios, including D035 intermediate levels.
- A single revision change table, supplied by the existing comparison service. Numeric differences are display-only; no stored values change.
- Exact-revision experiment usage, with an empty state and working Run links.
- A 280px provenance panel: registration, supplier, revision identity and existing technical references. Close/reopen and previous-revision navigation work.
- Shared English/Korean implementation and locale dictionary.

## Files changed for this task

- `src/features/sample-revision-detail/detail.tsx`
- `app/sample-studio-final.css`
- `src/shared/i18n/en.json`
- `src/shared/i18n/ko.json`
- `public/figma/sample-revision/close.svg`
- `public/figma/sample-revision/arrow-right.svg`
- `tests/catalog-final.test.tsx`
- This report.

## Validation

- Focused catalog tests: 4 passed, including two new tests for exact revision values/usage isolation, baseline and nested structure, and Draft/empty presentation. Draft is an isolated test fixture restored after the test; production catalog data is unchanged.
- TypeScript: passed.
- Changed TypeScript file lint: passed. Local Figma SVGs use native image elements with a documented lint exception for intrinsic icon geometry.
- Client/server build: passed (`tmp/sample-revision-final-build.log`).
- `git diff --check`: passed.
- Browser at 1440×900, KO and EN: no document horizontal overflow; Inspector 280px; header 56px; regular table rows 28px; material rows 32px; all icons loaded.
- Browser interactions checked: close/reopen provenance, previous revision, back to Sample, experiment usage link to Run 1, language switch.
- Visual screenshots checked for section hierarchy, density, layout and clipping. The browser capture provider paints at reduced scale inside its 1440px bitmap; CSS dimensions were additionally verified from DOM geometry. This is structural visual validation, not a pixel-perfect screenshot diff.

## Deliberate differences from illustrative Figma data

- Existing data is authoritative: D031 Rev.03 has 2 uses and raw-material purity 99.5%, not the Figma example's 3 uses and 99.95%.
- No fabricated QC, certificate, registered-by person, SHA or technical specification was added. The technical panel shows actual available identifiers.
- Revision authoring has no existing command boundary here. Create New Revision is disabled with an explanation; no preview is misrepresented as a saved revision.
- The catalog has no Draft revision. The empty state is browser-validated using real D031 Rev.02; Draft styling is covered by the isolated rendering test.
- Existing Run links and existing domain/authorization behavior are preserved.

Product/domain logic changed: **NO**. Repository, authorization, database schema and scientific/configuration data writes: **none**.

## Review routes

- `/samples/D031/revisions/3` — populated use history
- `/samples/D031/revisions/2` — empty use history
- `/samples/D031/revisions/1` — baseline revision
- `/samples/D035/revisions/2` — nested material composition and ratio changes
