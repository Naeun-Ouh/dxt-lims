# DXT bilingual UI v1

Implemented 2026-09-27. Presentation-only English/Korean localization for the shared DXT workflow. Product logic changed: **NO**.

## Architecture

- One component tree. `LocaleProvider` exposes `t` through React Context and subscribes to a tiny local preference store with `useSyncExternalStore`.
- Korean is the server/default locale. Header KO/EN controls update `document.documentElement.lang` and the isolated `dxt.ui.locale.v1` localStorage preference. The application provider is not remounted when locale changes.
- Central `ko.json` maps English source-message keys to Korean. `en.json` holds canonical English terminology overrides; otherwise the English source key is the English message.
- Registered validation templates interpolate opaque values. Unknown server diagnostics remain verbatim. Error objects, commands and persisted records are never rewritten.
- `LocalizedText` translates server-rendered access/error presentation without changing server authorization checks.
- Native select values, identifiers, keys, routes, field state, numbers, units, parameter/equipment names and scientific free text stay unchanged. Only option labels change.

## Coverage

Global header/breadcrumbs, Home, Study overview/setup/runs/navigation, Run creation and preview, Plan and scope selection, Actual, Measurement, Analysis/save/sharing, Evaluation/continuation previews, Inspectors, validation/empty/loading/access messages.

**832 translated keys.** No separate Korean or English page implementations and no new localization dependency.

## Verification

- Full existing suite: 108 domain + 133 workspace + 21 PostgreSQL integration tests passed.
- Four added localization tests cover default Korean, placeholder parity, canonical terminology, opaque IDs/scientific values, bilingual Plan control values and snapshot invariance, and untranslated native option/control values.
- Final UI regression rerun: 133 workspace + 4 localization tests passed.
- TypeScript, changed-file lint, production build and `git diff --check` passed.
- Browser viewport: 1440 × 900. Screenshots inspected in Korean and English. Main workflow: Study → Run creation preview → Plan → Actual → Measurement → Analysis → Evaluation. No Create/Save/Confirm scientific or authorization actions were submitted.
- Existing data: DTS Improvement Runs 19/20 and Adhesion Material Optimization Run 4. No new scientific data was created for validation.
- Korean numeric validation displayed `Energy: 숫자 값을 입력하세요` and disabled Save Plan; the test input was restored and reloaded without saving.
- Locale switch preserved an unsaved Plan input; the test value was restored without saving. Analysis aggregation remained `MEAN` while the displayed option changed to `평균`. Material Plan `Cure Temperature SP-01` remained read-only with value `120`.
- Inspector placement/width remained unchanged by locale: Plan 280px; existing Analysis Inspector 290px. Page width stayed 1440px, with no clipped buttons in inspected states.
- Korean Home calendar dates use Korean formatting while retaining UTC. Existing scientific timestamps/IDs remain unchanged.

## Layout findings and corrections

Flexible action sizing and toolbar wrapping accommodate Korean labels. The compact Plan shell keeps its existing grid dimensions and frozen columns. Measurement's previously unstyled Save action now has the same visible primary button treatment. No significant locale-induced clipping, overlap or grid misalignment remained in inspected Korean or English states.

## Untranslated content and limits

- Scientific/configuration names, user-entered comments, rationale, Study titles, source names, technical IDs, units and numeric data intentionally retain their original content.
- Unregistered backend diagnostics fall back to their original English text; this is not an exhaustive translation of every possible production exception.
- Reference Studio and Samples page bodies and obsolete prototype workspaces are outside this task's workflow scope; their shared header changes language but their existing body copy can remain English.
- This validates navigation, presentation, form/selection preservation, previews and existing result reads. It does not submit new scientific records or replace full localization review of every future data/error combination.

## Files changed

- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `app/series/[seriesSlug]/layout.tsx`
- `app/series/adhesion-material-optimization/layout.tsx`
- `app/series/adhesion-material-optimization/page.tsx`
- `app/series/cmp-stability/layout.tsx`
- `app/series/cmp-stability/page.tsx`
- `app/series/dts-improvement/layout.tsx`
- `app/series/dts-improvement/page.tsx`
- `docs/dxt-bilingual-ui-v1.md`
- `src/application/dxt-application-provider.tsx`
- `src/features/analysis/sharing-control.tsx`
- `src/features/analysis/workspace.tsx`
- `src/features/experiment-home/experiment-calendar.tsx`
- `src/features/experiment-home/home.tsx`
- `src/features/experiment-home/production-home.tsx`
- `src/features/experiment-series/create-run-entry.tsx`
- `src/features/experiment-series/created-run-grid.tsx`
- `src/features/experiment-series/production-run-entry.tsx`
- `src/features/experiment-series/productized-series.tsx`
- `src/features/experiment-series/repository-series-runs.tsx`
- `src/features/experiment-series/series-explorer.tsx`
- `src/features/experiment-series/series.tsx`
- `src/features/experiment-series/study-readiness-panel.tsx`
- `src/features/experiment-series/study-setup-workspace.tsx`
- `src/features/run-registration/actual-execution-grid.tsx`
- `src/features/run-registration/engineering-grid.tsx`
- `src/features/run-registration/evaluation-execution-grid.tsx`
- `src/features/run-registration/measurement-execution-grid.tsx`
- `src/features/run-registration/scope-selection-panel.tsx`
- `src/shared/i18n/en.json`
- `src/shared/i18n/ko.json`
- `src/shared/i18n/locale.tsx`
- `src/shared/i18n/messages.ts`
- `src/shared/i18n/text.tsx`
- `src/shared/ui/inspector-drawer.tsx`
- `src/shared/ui/workspace.tsx`
- `tests/localization.test.tsx`
- `tests/postgres-adapter.test.tsx`
- `tests/run.mjs`
- `tests/workspace-inline.test.tsx`
