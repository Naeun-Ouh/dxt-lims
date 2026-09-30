# DXT Figma FINAL — Study and Run entry screens

Implemented Figma file `ocXq0VLr5UFjSBBSza19W8`, nodes `130:7` (Study list), `130:161` (Study creation form), `130:275` (Run source), `130:354` (Run review).

## Routes

- `/studies` — authorized Study list, search, domain filter, latest Run navigation.
- `/studies/new` — Study creation form presentation; creation unavailable (see boundary below).
- `/runs/new?series=dts-improvement&from=study-default` — Run creation source; Review Run opens the resolved review on the same route.
- Existing CMP and Material routes continue through the same Run entry component using their `series` query.

## Components and layout

Shared compact shell: 32px header, 28px breadcrumb, light 24px footer. Existing locale preference and KO/EN switch retained. Study list uses compact 40px rows; latest Run column is widened to accommodate Korean labels. Study creation uses a 900px two-column form. Run entry uses two 500px columns with a 32px gap, source selection on the left and resolved preview on the right. Primary actions are right aligned. Native controls and exact downloaded SVG assets are used, rather than Figma screenshot images.

`RunEntryView` is shared by production and browser adapters. Existing server preview, fingerprint validation, readiness checks, idempotency identity and create command remain in their original containers. All assignments remain visible, including Operation/Subject/Position context. Units are read only from the preview's exact package and definition revisions; no latest-version fallback. No domain, authorization, repository, schema, locking, measurement or evaluation implementation changed.

Study discovery uses existing authorized `study.list`, `study.load`, `run.summaries`, and `dashboard.query` reads. Search narrows only authorized rows. Latest Run is the highest Run number; Last Activity is independently resolved from the Study's latest recorded Run activity. It is not assumed to equal the newest Run's timestamp.

## Boundary and remaining differences

**Study creation is presentation only.** There is no create-Study command in the frozen repository interface or authorized API. The form does not write or persist data; Create Study and unresolved reference/ownership controls are disabled, with an explicit explanation. Target inputs are empty local form fields, not fabricated scientific defaults. Connecting Study creation requires a separately defined and authorized authoring command.

Study status and ownership are not exposed by the current discovery contract. Those cells show a dash; their filters are disabled rather than inventing Active/Draft status or owners. There are three actual authorized UAT Studies, not the six example rows in Figma. The browser fixture list does not claim a Run count or latest Run when no authorized summary projection is supplied.

Scientific assignment labels and identifiers remain verbatim. Full intent labels replace Figma's abbreviated F/V so both locales retain unambiguous meaning. The review can grow vertically for real assignment data. Study creation allows natural page scrolling rather than clipping the bottom of the form.

## Files changed in this task

- `app/entry-final.css`
- `app/globals.css` (stylesheet import)
- `app/studies/page.tsx`
- `app/studies/new/page.tsx`
- `src/shared/ui/workspace.tsx`
- `src/shared/i18n/ko.json`
- `src/features/experiment-series/entry-shell.tsx`
- `src/features/experiment-series/study-list.tsx`
- `src/features/experiment-series/create-study.tsx`
- `src/features/experiment-series/run-entry-view.tsx`
- `src/features/experiment-series/create-run-entry.tsx`
- `src/features/experiment-series/production-run-entry.tsx`
- `public/figma/entry/` (11 exact SVG assets)
- `tests/entry-final.test.tsx`
- `tests/run.mjs`
- This report.

## Validation

- Full suite: 271 tests passed (108 domain, 4 localization, 5 initial entry UI, 133 workspace, 21 PostgreSQL adapter tests). After the final pinned-unit presentation addition, the focused entry suite passed all 6 tests.
- Final TypeScript, changed-file lint and production build passed. `git diff --check` passed.
- Four screens visually inspected at 1440 × 900 in Korean and English; no page horizontal overflow, clipped primary buttons or broken grid alignment observed. Review-to-source navigation and Study search verified in the browser. Actual existing DTS Run context and Study Default revision 2 were used.
- Asset files are non-empty; inspected rendered SVG dimensions match the original roots (5px environment indicator, 12px menu/row arrow, 11×12px search, 10px source circles/empty preview indicator, 8px resolved source indicator, 900/460×1px section rules). Select chevrons retain 8×8px intrinsic dimensions.
- No live Create/Save action was submitted. No scientific, configuration or authorization write was performed during browser validation. The selected locale is Korean.

Product logic changed: **NO**. Navigation and presentation changed; Study creation remains explicitly unavailable pending its command boundary.
