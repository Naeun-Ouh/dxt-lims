# PR #12 — Run Draft execution grids

## Scope

UI-only follow-up to the Operation master lookup table. Study creation, domain/schema, authorization, execution readiness and persistence remain unchanged. PR #12 must remain unmerged.

## Changes

- Separate section 2 (Process Flow) and section 3 (Conditions).
- Operation grid columns: order, Operation, type, area, equipment, module, condition summary, up/down movement, removal. Existing master lookup still appends selected exact options in selection order.
- Each Operation row has a collapsed participation editor, retaining Select all/Clear selection, individual Subjects and explicit Not Participating labels. Existing removal of subject-specific assignments when a Subject leaves the Operation is preserved; global assignments remain global.
- Conditions grid columns: Operation, condition name, value, unit, FIXED/VARIED role, applicable participating Subjects, validation status and add/remove actions. Unauthored definitions render as placeholder rows without creating assignments or default scientific values. Add value retains the prior explicit blank-row action.
- Existing `validateStudySetupItem` supplies entered-value format validation. A blank authored value is Missing; an invalid format is Invalid; an absent assignment is Not entered (or Not Participating when no Subjects participate). Valid format does not claim Execution Ready. Requiredness, coverage and overall readiness remain authoritative in Preview/Create.
- Existing Measurement point/parameter controls are relocated intact into section 4 for selected Measurement Operations only.
- Compact 12px table text, sticky headers, contained scrolling, wider English role/action columns; shared KO/EN component implementations.

## Validation — agent checks, not Human acceptance

- TypeScript, changed-file lint, production build and `git diff --check`: passed.
- Focused existing regressions: 16 passed (4 execution-readiness, 3 Study-bootstrap, 9 participation). Full backend contracts were not repeated for this UI refactor.
- Specimen Previous Run: preserved Cure Temperature 120 / VARIED and Cure Time 30 / FIXED; 2 of 3 Subjects participate. AGENT-SP03 remains visibly Not Participating and absent from condition application choices.
- Non-numeric temperature displays Invalid; whitespace displays Missing; restoring 120 displays valid format.
- Restricting temperature to AGENT-SP02 then removing that Subject from participation removes only that subject-specific assignment. Clearing participation marks the unassigned temperature as Not Participating, while preserving the global time value.
- Added Coat/Test through the unchanged lookup and reordered them: condition values followed their Operation, Cure Time stayed 30, Measurement controls remained attached to Test. FINAL point selection still works.
- Wafer Previous Run: reference choices, units, values and FIXED/VARIED roles preserved. Server Preview returned Execution Readiness READY without Target, Evaluation or Next Action. No Create Run was invoked.
- Removing the Wafer Operation clears its condition rows and invalidates the prior preview.
- KO 1440px and EN desktop/narrow 720px inspected. Narrow tables scroll internally. English Intentionally Varied remains visible in the widened role column.

## Environment / Human retest

Updated isolated UI: http://127.0.0.1:3236

- Populated Specimen draft: http://127.0.0.1:3236/runs/new?series=agent-run-draft-specimen&from=previous-run
- Populated Wafer draft: http://127.0.0.1:3236/runs/new?series=agent-run-draft-wafer&from=previous-run

These AGENT-labeled routes are UI previews, not Human acceptance evidence. Earlier servers and UAT data were preserved. Browser changes remained transient; no Run, configuration or Study setup was persisted.

Human acceptance: NOT RUN for this revision. Ask the participant to assess column density, discoverability of participation, condition scopes, validation wording and ordering. Missing equipment/module display labels remain an existing source-data limitation; technical IDs are not manufactured into display names. Issues #13/#9 remain out of scope; no merge.
