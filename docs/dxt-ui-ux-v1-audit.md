# DXT LIMS UI/UX v1 E2E Audit

Audit date: 2026-09-14  
Primary scenario: DTS Improvement, Run 18 → Run 19  
Secondary proof: Adhesion Material Optimization, Run 3 → Run 4

## Freeze decision

**NO — the navigation and context grammar are coherent after the safe polish, but a new Run cannot yet be advanced through Actual capture, Measurement acquisition, Engineer Evaluation authoring, and Decision authoring from the UI.** Existing fixture-backed Runs demonstrate the complete read/understand/continue loop, while a newly created Run is authorable only in Plan.

No Core, Generic Framework, Configuration semantic, or Measurement persistence change was made during this audit.

## Lifecycle walkthrough

| Transition | Outcome | Decision |
| --- | --- | --- |
| Home → Continue Working | Correctly identifies DTS Improvement, Run 18, and Evaluation as the destination after the deep-link fix. | Pass for existing Run |
| Home → Study | Study purpose, target, owner, area, latest Runs, and next actions remain recognizable. | Pass |
| Study → Experiment Setup | Operation → Item defaults are understandable; technical package identity is now confined to Inspector depth. | Pass |
| Study/Decision → Create Run | Previous Run, Study Default, Existing Run, and Blank sources are distinguishable; inheritance preview explains the full-snapshot/delta-view behavior. | Pass |
| Create Run → Plan | Study, Run, Subjects, Operations, inherited values, FIXED/VARIED, and changed cells remain visible. | Pass |
| Plan → Actual | Existing execution evidence is readable as match/changed/missing. A fresh Run has no authoring path for Actual evidence. | **Fail for fresh Run** |
| Actual → Measurement | Existing authoritative datasets and missing/excluded values are traceable. A fresh Run has no acquisition/registration path here. | **Fail for fresh Run** |
| Measurement → Analysis | Run, Study, Parameter, Dataset, and Subject context are preserved; explicit Return and Continue links were added. | Pass for existing data |
| Analysis → Evaluation | The current Run can be restored directly in Evaluation. | Pass for existing data |
| Evaluation → Decision | Existing result → achievement → judgment → decision → next-action reasoning is clear. Judgment and decision remain read-only fixtures. | **Fail for fresh Run** |
| Decision → Preview/Create Next Run | Inherited and Changed values are separated; a created preview now exposes the next Run Plan directly. | Pass for fixture continuation |
| Material R&D critical flow | Study Setup, Specimen Plan, Actual, Measurement, Analysis, Evaluation, and next-Run grammar use the shared surfaces without Wafer terminology in reusable UI. | Pass for existing fixture |

## Findings

| ID | Finding | Severity | Affected screen | User impact | Classification | Recommendation | Implemented now |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UX-01 | A direct `?view=evaluation`, `measurement`, or `actual` URL initially rendered Plan. | P1 | Home → Run Engineering Grid | Continue Working landed at Plan and required the engineer to select the intended stage again. | UX ONLY | Restore the URL stage after client hydration and browser navigation. | YES |
| UX-02 | Study query tabs changed their active state while the previous body could remain visible. | P1 | Study Overview / Setup / Runs | User could believe Setup was open while viewing Overview. | UX ONLY | Use reliable document navigation for query-backed Study views. | YES |
| UX-03 | Analysis had no explicit path back to the originating Run or forward to Evaluation. | P1 | Analysis | Experiment context felt like a separate application. | UX ONLY | Show context-aware Run/Study return and Evaluation continuation links. | YES |
| UX-04 | Create Next Run ended at a local staged message with no next surface. | P1 | Evaluation → Next Action | The central experiment iteration loop stopped after confirmation. | UX ONLY | Expose the created Run's Plan immediately after staging. | YES |
| UX-05 | Material R&D was not discoverable from Home. | P1 | Home | The generic framework proof required knowing a direct URL. | PROJECTION | Include the active Material Study in Recent Experiments and global R&D counts. | YES |
| UX-06 | Analysis always displayed `SEMICONDUCTOR R&D`, including Specimen analysis. | P1 | Material Analysis | Semiconductor terminology leaked into the generic workflow. | PROJECTION | Resolve the workspace context label from the selected analysis source. | YES |
| UX-07 | Run 19 and CMP Run 13 returned to their Study and Run 19 was labeled Execution despite only having a Plan surface. | P1 | Home | Navigation lost the selected Run and overstated lifecycle progress. | PROJECTION | Link directly to each Run Plan and show the implemented stage. | YES |
| UX-08 | Configuration package IDs were prominent during normal Study Setup and Run creation. | P2 | Study Setup / Create Run | Engineers were asked to interpret implementation vocabulary. | UX ONLY | Show a Reference Set/revision summary and keep exact IDs in Inspector. | YES |
| UX-09 | Empty Analysis results did not explain recovery. | P2 | Analysis Table | Users knew the selection was empty but not which controls to change. | UX ONLY | Point to Run, Dataset, Parameter, and Subject filters. | YES |
| UX-10 | Analysis header actions could compete for width at compact desktop sizes. | P2 | Analysis | Context links and Save View could crowd the title. | UX ONLY | Wrap actions and stack the header at narrow widths. | YES |
| UX-11 | Newly created Runs cannot author Actual evidence, acquire/register Measurement data, record Engineer Evaluation, or author a Decision in these work surfaces. | **P0** | Plan → Actual → Measurement → Evaluation | An engineer cannot complete a fresh lifecycle; only fixture-backed lifecycle review is possible. | PROJECTION | Define the smallest authoring command surfaces against the already-frozen domain boundaries in a later product task. | **NO** |
| UX-12 | Analysis filter edits and saved views are in-memory UI state. | P1 | Analysis | Leaving the page may require rebuilding an analysis selection. | PROJECTION | Add approved browser or repository-backed view persistence without copying Measurement values. | NO |
| UX-13 | `Series` and `Study` appear together in navigation, headings, routes, and legacy screens. | P1 | Home / Study / legacy Run | The same scientific grouping has two visible names. | UX ONLY | Adopt `Study` as the user-facing canonical term; retain `Series` only as a compatibility/technical route until migration. | NO |
| UX-14 | Explicit loading states are absent because current scenarios are synchronous fixtures. | P3 | Study / Run / Analysis | No current blocker; asynchronous integration could look blank later. | UX ONLY | Add compact loading rows when remote repositories are introduced. | NO |
| UX-15 | Wide engineering grids require horizontal scrolling at all reviewed widths. | P2 | Plan / Actual / Measurement / Evaluation | Dense work remains usable, but first-time users must notice the subject scrollbar. | UX ONLY | Preserve sticky identity columns and add a subtle horizontal-overflow cue in a later polish pass. | NO |

## Information hierarchy and density

- Home behaves as overview: Continue Working is the dominant action, followed by active work and recent experiments.
- Study behaves as context: purpose and target precede defaults and Run history.
- Engineering Grid behaves as work: Operation/Item rows and Subjects dominate; deep identity and validation metadata stay in Details/Inspector.
- Analysis behaves as understanding: compact context, visualization, table, and optional provenance Inspector share one surface.
- Evaluation keeps calculated achievement separate from Engineer Judgment and Decision.
- The remaining density concern is discoverability of horizontal overflow, not excess vertical whitespace.

## Inheritance and experimental intent

| State | Current UX | Audit result |
| --- | --- | --- |
| INHERITED | Create Run preview identifies source and carried-forward groups; Run Plan displays the complete snapshot. | Pass |
| CHANGED | Plan uses changed cell state and Next Run preview has a separate Changed section. | Pass |
| VARIED | Diamond marker represents experimental intent independently of edited values. | Pass |
| MISSING | Em dash and explicit missing status are used in Actual, Measurement, Analysis, and Evaluation. | Pass |
| INVALID | Invalid cells retain validation styling and error count. | Pass |

`Changed != VARIED` remains intact: Changed records a delta from the inherited value, while VARIED records the engineer's scientific intent across Subjects.

## Terminology decision log

| Current term | Where used | Conflict | Recommended canonical term | Migration urgency |
| --- | --- | --- | --- | --- |
| Series / Experiment Series | Explorer label, routes, legacy screens | Competes with Study for the same user concept. | **Study** in product UI; retain Series in compatibility routes/code. | P1 |
| Study | Home, Study Overview, Setup, Analysis | Clear scientific grouping and already dominant in new UX. | **Study** | Keep |
| Experiment | Study description, scope, work-surface labels | Sometimes means the Study and sometimes the configured work inside a Run. | Use **Study** for the longitudinal effort and **Experiment in Run** for configured scope when needed. | P2 |
| Run | All lifecycle surfaces | Consistent experimental iteration identity. | **Run** | Keep |
| Subject | Generic planning and analysis | Correct generic term; users still need contextual labels. | **Subject**, displayed as Wafer or Specimen from data. | Keep |
| Wafer / Specimen | Domain fixtures and Subject headers | Correct only when the selected Subject type supplies it. | **Wafer** or **Specimen** contextually | Keep |
| Measurement / Result | Measurement Grid, Analysis, Evaluation | Generally clear: Measurement is observation; Result is selected/representative value. | **Measurement** and **Result** | Keep |
| Evaluation / Judgment | Evaluation work surface | Correct separation between calculated achievement and human interpretation. | **Evaluation** / **Engineer Judgment** | Keep |
| Decision / Next Action | Evaluation continuation | Correct experiment-level reasoning; does not behave as task management. | **Decision** / **Next Action** | Keep |
| Reference / Definition / Configuration | Setup, Inspector, Reference Studio | Definition/package terms become architecture leakage outside deep detail. | **Reference Set** in normal flows; exact Definition/Configuration IDs in Inspector/Studio. | P2 |

## Empty, error, accessibility, and viewport review

- No Runs: provides a direct New Run action and explains Study Default vs Blank.
- No Subjects: model validation prevents an apparently valid subject grid; a production repository error state remains future work.
- No Measurement / missing values: explicit `—`, MISSING RESULT, and disabled unavailable stages remain distinguishable from zero.
- No Analysis selection: table and chart expose an empty state with filter recovery guidance.
- Invalid or unavailable experiment items: Study Setup now gives an engineer-facing recovery message; exact applicability detail remains in Inspector/Reference Studio.
- No Next Action: the projection displays `No action selected`; authoring the action remains part of UX-11.
- Keyboard/focus: shared links, buttons, and summaries have visible `:focus-visible`; grid inputs have explicit active outlines; icon-only row actions have accessible labels.
- 1440/1280 desktop evidence and the compact responsive rules were reviewed. At 1024 and below, Inspector/decision content stacks while wide grids retain horizontal scrolling and sticky identity columns. A 678px in-app-browser stress pass also retained access to controls, though mobile behavior is outside v1 scope.

## Validation scope

- DTS existing-data lifecycle: Home → Study → Setup → Create Run → Plan → Actual → Measurement → Analysis → Evaluation → Decision → Next Run.
- Material proof: Study → Setup → Specimen Run → Actual → Measurement → Analysis → Evaluation.
- Safe fixes changed only UI and projection code.
- All 205 tests pass (108 domain tests and 97 workspace/UI projection tests).
- TypeScript `--noEmit`, changed-file `oxlint`, production build, and `git diff --check` pass.
- Repository-wide lint reports existing debt separately: legacy `<img>` use, generated/shared component accessibility rules, React effect-state rules, floating test promises in `tests/domain.test.ts`, and shared chart template-expression typing. None are in the changed-file lint set for this audit.
