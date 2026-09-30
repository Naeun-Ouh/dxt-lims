# DXT LIMS UI/UX v1 Freeze

Freeze review date: 2026-09-15  
Decision: **GO — freeze approved**

## Release boundary

DXT UI/UX v1 is frozen around one continuous experiment lifecycle:

`Home → Study → Experiment Setup → Create Run → Plan → Actual → Measurement → Analysis → Evaluation → Decision → Next Action → Next Run`

The final live walkthrough used freshly authored semiconductor data in **DTS Improvement, Run 20 → Run 21** and the shared Material R&D framework in **Adhesion Material Optimization, Run 5**. No Core Domain, Generic Experiment Framework, Configuration architecture, or Analysis meaning changed during this review.

## Freeze blockers

There are **no open P0 or P1 UI/UX blockers**.

| Severity | Open findings | Freeze effect |
| --- | --- | --- |
| P0 | None | None |
| P1 | None | None |
| P2 | Wide subject grids rely on intentional horizontal scrolling; internal `Series` identifiers/routes remain as compatibility vocabulary. | Accepted for v1 |
| P3 | Explicit asynchronous loading/retry states are deferred until remote repositories exist. | Accepted for v1 |

## Verified lifecycle continuity

| Transition | Context that remains visible or recoverable | Result |
| --- | --- | --- |
| Home → Study | Study name, active Run, stage, and direct continuation | Pass |
| Study → Experiment Setup | Study purpose, Reference Set, operations, items, defaults, intent, and grain | Pass |
| Setup → Create Run → Plan | source choice, inherited full snapshot, Run identity, Subjects, FIXED/VARIED, exact reference choices | Pass |
| Plan → Actual | Run/Subject/Operation context; Plan remains immutable while Actual is authored separately | Pass |
| Actual → Measurement | execution context, measurement operation, Subject, parameter, value, unit, and grain | Pass |
| Measurement → Analysis | Study, Run, dataset, parameter, Subject, representative method, and source provenance | Pass |
| Analysis → Evaluation | explicit return/continue paths preserve originating Study and Run | Pass |
| Evaluation → Decision | Result → calculated achievement → human judgment → decision → next action remains one reasoning chain | Pass |
| Decision → Next Run | previous Run provenance, inherited assignments, explicit changed assignments, and independent next-Run Plan | Pass |

## Authoring and projection boundaries

The UI labels authoritative interaction boundaries directly:

- **USER AUTHORED:** Plan edits, Actual execution records, manual Measurement observations, Engineer Evaluation, Decision, Next Action, and saved Analysis configuration.
- **INHERITED:** a Study Default or Previous Run is copied into a new independent Run full snapshot. The source is provenance, not a live dependency.
- **SYSTEM RESOLVED:** applicability, source-backed Analysis rows, representative results, Target Achievement, and next-Run preview are projections over authoritative source records.

Plan, Actual, Measurement, Analysis, and Evaluation keep separate responsibilities. The Inspector exposes exact identities, provenance, applicability, and advanced detail; normal editing stays in the main work surface. Analysis selects and compares existing results and does not become a second Measurement system.

## Inheritance and experimental intent

The frozen rule is:

`Reference Set → Study Default → Run full snapshot → Previous Run → Next Run full snapshot`

A Run never re-resolves a newer default or reference revision after creation. The UI may present a delta for review, while storage remains a complete independent snapshot. **Changed** means the value differs from its explicit source. **VARIED** means the engineer intentionally varies an experimental factor across Subjects. These states are independent.

The Run 21 preview verified four inherited assignments and one explicit Recipe change from Run 20. Exact Sample/Formulation revisions remain pinned when used by a Run.

## Saved Analysis reproducibility

A saved Analysis view restores Study/Run selection, explicit Subject membership, dataset filter, parameter, aggregation/representative method, validity policy, visualization configuration, and the exact MeasurementDataset/representative-result references used when available. Raw observation values are not copied into the saved view. If a pinned source becomes unavailable, the view remains identifiable and reports the missing source instead of silently substituting another dataset.

## Canonical terminology

- **Study** is the user-facing longitudinal scientific context.
- **Run** is one engineer-defined experimental iteration.
- **Subject** is the generic identity; the active Domain Adapter presents **Wafer** or **Specimen** where appropriate.
- **Measurement** is an observation; **Result** is a selected or representative value derived from observations.
- **Evaluation** is human interpretation; **Target Achievement** is calculated; **Decision** and **Next Action** express scientific continuation.
- **Reference Set** is the normal-workflow term. Exact definition, revision, rule-set, and package identities remain in Inspector and Reference Studio.

Internal names such as `ExperimentSeries`, `seriesSlug`, and `/series/*` remain compatibility debt. They do not appear as competing user-facing product terminology in the reviewed v1 flow.

## Generic framework boundary

Reusable lifecycle surfaces depend on Subject Type, Operation, assignment kind, grain, measurement point, and configured labels. Semiconductor-specific PHOTO/CMP fixtures and Material R&D fixtures enter through configuration and Domain Adapters. Material R&D uses Specimen, MIX/COAT/CURE/TEST, Formulation, Cure Temperature, Peel Force, and Viscosity without Wafer, Site, Lot, reticle, or semiconductor-equipment assumptions leaking into the shared UI.

## Responsive, density, and state review

- At 1440 and 1280 px, the Engineering Grid and optional 238 px Inspector remain within the page; the subject table owns horizontal overflow.
- At 1024 px, the page still has no body-level horizontal overflow. The grid retains sticky identity columns and an internal horizontal scroll; Analysis filters resolve to four columns and its result table owns horizontal overflow.
- Home remains an overview, Study remains context, Engineering Grid remains the work surface, Analysis remains the understanding surface, and Evaluation remains the reasoning/continuation surface.
- Empty Runs, missing Subjects, missing Measurements, empty Analysis selection, invalid/unavailable items, missing Next Action, and unavailable saved-analysis sources have distinguishable guidance or validation behavior. Asynchronous remote-loading failures remain future infrastructure work.

## Validation evidence

Live browser verification covered Run 20 Plan, one persisted Actual execution record, one persisted BCD Measurement dataset/value, calculated Target Achievement, authored Evaluation and Decision/Next Action, a restored saved Analysis view with exact source references, and creation/opening of Run 21. Material Run 5 verified the same Evaluation/Decision grammar using Specimens and Peel Force.

Automated gates at freeze: **226/226 tests**, TypeScript `--noEmit`, changed-file `oxlint`, production build, and `git diff --check` pass. Repository-wide lint remains a separate baseline: 105 existing errors, dominated by floating promises in the legacy domain test file plus shared/generated component rules. None was introduced by this documentation-only freeze review.

## Post-freeze change policy

After v1 freeze, any new requirement must be implemented in this order:

1. Configuration
2. Domain Adapter
3. Projection
4. Generic Framework gap, only when the first three cannot express the requirement
5. Core Domain change, only as a last resort with explicit architecture review

The next work should focus on production repositories, authentication/authorization, audit durability, concurrency, and operational deployment. These are productization tasks, not reasons to reopen the frozen lifecycle grammar.
