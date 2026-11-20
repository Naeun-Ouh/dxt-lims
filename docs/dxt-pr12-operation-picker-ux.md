# PR #12 — Run Draft Operation lookup UX

## Human feedback and scope

The participant found the source-selection wording awkward and requested a searchable master lookup/selection modal for Operations. Study creation was not disputed. This feedback is not Human acceptance of the revised implementation.

## Changes

- “생성 출처 선택” → “실험 차수 시작 방식” (Run starting point). Blank and Previous Run are not necessarily templates; Study Default remains an optional source.
- Replace the Operation dropdown with “공정 기준정보 조회”. Search by existing Operation name/ID, equipment/module label or condition name; filter process/measurement Operations.
- Select multiple references, retain selections across searches, show selection-order badges and add in that order. Cancel discards modal selection only.
- Reorder added Operations using up/down controls. Existing participation and condition authoring remain in the draft.
- Reuse the already-loaded exact-reference options. No new master-data interface, database, schema, permission, readiness or scientific default is introduced.
- Native modal semantics provide background isolation and keyboard focus containment; opening focuses the search field.

## Validation — agent checks only

- Browser: Specimen Cure/Mix multi-selection across searches, no-result state, addition in selection order, downward reorder, Measurement filter, cancellation without adding Test.
- Browser: Wafer equipment-specific search, KO/EN labels, modal layout, disabled empty-selection action; no horizontal dialog overflow at the inspected desktop size.
- Corrected an inherited checkbox-grid CSS rule that placed the selection badge on a second line.
- Fresh-page KO/EN switching works. During development HMR, one existing tab temporarily retained KO text after EN selection; fresh-page verification did not reproduce this.
- Full repository tests: 330 passed. TypeScript, changed-file lint, production build and diff whitespace validation pass.
- Responsive visual checks: KO at 720px and desktop; EN at 1440px. No dialog horizontal overflow; selection badge remains in its right-hand column.
- No Run was created and no setup/configuration/scientific data was saved during these UI checks.

## Preview and Human retest

Existing 3232/3233 environments and stored data were preserved. Updated UI runs separately on 3234 with the existing researcher principal and existing exact reference data.

- Specimen: http://127.0.0.1:3234/runs/new?series=agent-run-draft-specimen&from=study-default
- Wafer: http://127.0.0.1:3234/runs/new?series=agent-run-draft-wafer&from=blank

These agent-labeled routes are for inspecting the UI. Do not present them as completed Human UAT. The existing fresh Human scenarios remain unaccepted.

Suggested human observations: Is the starting-point terminology clear? Can the participant find a desired Operation, distinguish equipment variants, select several Operations and understand their order? Does cancellation behave as expected? Record facts separately from interpretations.

Human acceptance: NOT RUN for this revision. PR #12 remains unmerged. Issues #13/#9 remain out of scope.

## Dense table follow-up

The Operation lookup now renders one row per existing Operation option/context, with eight primary columns: selection/order, Operation name, type, area, equipment, module, major conditions and configured measurement items. A sticky table header and internal horizontal/vertical scrolling keep Add/Cancel outside the scrolling region. Rows use 12px text and compact padding.

Operation-name buttons open a secondary detail panel without selecting the row. Option/revision/area/equipment/module/parameter IDs appear there only. Display labels are resolved from the existing exact catalog/context; when the current adapter supplies only a technical ID as a label, the primary cell says “Display name unavailable” rather than fabricating a name. This means some equipment variants currently require opening details to distinguish their IDs. No new master-data endpoint or label mapping was invented.

Agent regression checks on the table revision:
- Wafer: five options render as five rows, including three distinct Exposure equipment contexts; eight column headers; no technical IDs in primary row text.
- Opening Exposure details reveals the exact equipment/module IDs without selecting it.
- Selected Exposure then CD-SEM across a search, filtered both out, and retained two selections. Add preserved their order; downward movement produced CD-SEM then Exposure.
- Selecting Coating and cancelling left the two draft Operations unchanged.
- KO desktop (1440px) and EN narrow (720px) inspected; narrow results scroll horizontally while actions remain available.
- TypeScript, changed-file lint, production build and whitespace checks passed. The earlier 330-test result belongs to the preceding picker revision; this display-only follow-up used browser regression checks and did not repeat backend contracts.

Updated isolated preview: http://127.0.0.1:3235/runs/new?series=agent-run-draft-wafer&from=blank (Specimen uses `series=agent-run-draft-specimen`). Previous servers and stored UAT data remain untouched. No Preview/Create/Save was invoked in agent UI verification. Human acceptance remains NOT RUN for this UI revision; no merge.
