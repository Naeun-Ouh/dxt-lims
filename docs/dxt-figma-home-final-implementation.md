# DXT Home FINAL implementation

2026-09-27 · Figma `146:5` populated and `146:236` empty.

Applied the compact header/navigation, right-aligned Study & Runs entry, 40px continue row, three summary metrics, full-width recorded-activity Gantt, dense recent-Run table, accessible-Study list and empty states. Both states share ProductionHome and the existing locale layer. Home styling is scoped; other Workspace variants retain their behavior.

## Files

- `app/home-final.css` and its import in `app/globals.css`
- `src/features/experiment-home/production-home.tsx`
- `src/features/experiment-home/experiment-calendar.tsx`
- `src/shared/ui/workspace.tsx` — optional Home shell
- `src/shared/i18n/en.json`, `ko.json` — four shared labels
- `public/figma/home/80d0c.svg`, `16529.svg`, `c7328.svg`, `153d5.svg`
- `tests/entry-final.test.tsx` — two Home regression tests

## Semantic fidelity

No domain, repository, authorization, schema or scientific write changes. The server's scoped dashboard remains the source of counts, rows, periods and destinations. No sample dates/counts from Figma were inserted.

The design's Equipment Calendar/reservation copy is presented as Experiment Calendar/recorded activity because the available projection contains Run creation→latest-record periods, not equipment bookings. The existing This Week count retains its label rather than being mislabeled Prior Runs. Mine/shared, ETCH/UTIL-1 and stalled-record figures from the design have no equivalent supplied source and are not fabricated. The existing NO avatar and KO/EN switch remain. Actual same-day intervals appear short rather than being expanded into fictitious multi-day spans.

## Validation

- Populated Home and isolated empty-projection render inspected at 1440px in Korean and English; no page horizontal overflow. Empty-state verification did not clear live data or change permissions.
- Four SVG assets downloaded locally, loaded successfully and checked in their slots. Intrinsic dimensions: 12×1, 5×5, and two 258.4×1 separators; browser subpixel rounding only.
- Continue opened the exact current Material Run4 Evaluation. Study & Runs opened `/studies`. Study/Run/calendar links retain source-provided or canonical destinations.
- Entry/Home tests: 10 passed. Workspace tests, including recorded-calendar interval and empty projection checks: 139 passed. Total focused tests: 149.
- TypeScript, changed-file lint, production build and `git diff --check` passed.
- The isolated empty-state preview server was stopped after inspection. Production UAT data was not written.

Review: http://localhost:3200/ . The pre-existing non-PostgreSQL mock Home is outside this authorized-production Home change.
