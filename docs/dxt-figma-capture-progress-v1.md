# DXT Figma As-Is Capture Progress v1

Session: 2026-09-26. Target: https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX
Source manifest: `docs/dxt-figma-capture-manifest-v1.json`

## Status: stopped at the first-frame quality gate

Localhost:3200 returned HTTP 200. The DXT Figma connection resolved target page `4:3` (01_As-Is) and existing sections. HTML-to-design capture for Home completed and created node `11:2`, named exactly `Home / Dashboard / Populated`. It contains 120 editable TEXT nodes and 195 FRAME descendants; it is not a flattened image.

**Global blocker:** Figma `loadFontAsync` rejected `Arial Bold` because the Arial family is unavailable. Read-only inspection confirmed **116 of 120 text nodes have missing fonts**, with Arial Regular, Bold and Semi Bold among the imported styles. This is shared typography infrastructure, not a localhost error. No substitution to Arimo or another font was made because the user required unmodified As-Is typography.

The imported Home frame remains on the root of 01_As-Is (`4:3`), not yet inside section `8:6`. Name is correct; adjacent manifest-ID label and final placement remain incomplete. Its capture ID and manifest ID are linked below. The failed organization call stopped during font loading before canvas mutation. No Legacy frame was imported.

A frame counts as **CAPTURED only when import, exact naming, placement, ID annotation and editability/quality verification have passed**. Therefore the successfully imported but blocked Home pilot is recorded as FAILED, not as an accepted capture.

## Totals

- Total manifest: 152
- READY first-pass candidates: 100
- Imports completed: 1
- CAPTURED (accepted): 0
- FAILED: 1 (Home typography QA/organization)
- DEFERRED: 151 = 99 unsubmitted READY + 52 conditional
- All P1 READY captured: NO
- 01_As-Is ready for Product Owner visual review: NO

- P1: total 61; READY 58; CAPTURED 0; FAILED 1; DEFERRED 60
- P2: total 52; READY 38; CAPTURED 0; FAILED 0; DEFERRED 52
- P3: total 39; READY 4; CAPTURED 0; FAILED 0; DEFERRED 39

## Manifest corrections

- `legacy-next`: route corrected from `PREVIEW` to `/series/dts-improvement/runs/1`; state `PREVIEW`; frame `Legacy / Next Run / Preview`; open the existing legacy Create Next Run modal without proceeding.
- `legacy-conditions`: route corrected from `EXPANDED` to `/series/dts-improvement/runs/4`; state `EXPANDED`; frame `Legacy / Conditions / Expanded`; expand existing condition/Sample details.
- Updated corresponding purpose, setupSteps and URL fields in JSON and Markdown. No inventory entries were added or removed. Every route now begins with `/`.

## Data and code discipline

- Scientific/configuration/authorization writes for screenshots: **NO**.
- Product UI wording/CSS/layout changes: **NO**.
- Temporary external Figma capture script was inserted only in `app/layout.tsx`, then removed. The final layout is byte-for-byte equal to its pre-capture version.
- No reset/reseed, server replacement or application Principal switch. The Figma DXT connection is separate from the application Principal.
- Browser viewport was set to 1440 × 1000 for Home; reset during cleanup.
- Home capture was polled to completed. Three additional capture IDs were preallocated but never submitted; no new captures were begun after the blocker was diagnosed. These are abandoned reservations, not reusable captured URLs. The study-runs reservation ID was not retained in the truncated tool output; do not guess or reuse it.

## Resume prerequisite

### Arial preflight recheck — 2026-09-26

User requested a gated three-screen validation (Home / Dashboard / Populated; Run / Plan Wafer / Editable; Analysis / Workspace / Default), with no font substitution and no batch continuation on any font mismatch.

Read-only recheck on the DXT Figma connection (`dev@dxt.co.kr`) failed before new capture:

- `listAvailableFontsAsync()` returned **zero Arial styles**.
- `loadFontAsync()` failed for Arial Regular, Bold, and Semi Bold: `The font family "Arial" does not exist.`
- Existing Home node `11:2` still contains 120 editable TEXT nodes, 116 with missing fonts: 55 Arial Regular, 7 Arial Bold, 54 Arial Semi Bold. The other 4 use Cousine; their fidelity to localhost has not been verified, so an all-Arial pass is not claimed.
- Home validation: **BLOCKED at font preflight**. Plan Wafer and Analysis validation: **NOT STARTED**. Spacing/layout and full editing validation: **NOT VERIFIED**.
- New capture submissions: **0**. Remaining READY batch: **NOT STARTED**. Existing ledger counts unchanged.
- No font substitution, Figma node mutation, product-code change, or scientific/configuration/authorization write occurred during this recheck.

Resume only when Arial loads in the Figma MCP environment; then perform the three requested screen validations before any remaining READY batch.

Make the original Arial fonts available to the Figma Agent/MCP environment, including resolving the imported Semi Bold style, without silently changing product typography. Then verify Home text rendering/editability, complete its section placement and ID annotation, and continue READY entries in P1 → P2 → P3 order. Use fresh IDs for unsubmitted/abandoned reservations. Do not recapture the already-consumed Home ID.

## Entry ledger

A dash means no completed frame / no retained capture ID, not a fabricated identifier.

### home-populated — FAILED
- Frame: Home / Dashboard / Populated
- Priority / availability: P1 / READY
- Capture ID: `14e281bf-8ffa-42f5-9fa4-d6625bf08240`
- Figma node: [11:2](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8?node-id=11-2)
- Reason: Import completed, but capture QA/organization FAILED: 116/120 text nodes have missing Arial fonts. Original typography cannot be faithfully edited in this Figma environment; section placement and adjacent ID label were not completed.

### home-empty — DEFERRED
- Frame: Home / Dashboard / Empty
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### home-error — DEFERRED
- Frame: Home / Dashboard / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### study-overview — DEFERRED
- Frame: Study / Overview / Populated
- Priority / availability: P1 / READY
- Capture ID: `2353e44c-5864-4b5f-a292-a202698c6eaa`
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot. Capture-ID allocation was queued alongside Home organization before the font failure returned; no page submission was made.

### study-runs — DEFERRED
- Frame: Study / Runs / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot. Capture-ID allocation was queued alongside Home organization before the font failure returned; no page submission was made.

### setup-wafer — DEFERRED
- Frame: Study / Setup Wafer / Editable
- Priority / availability: P1 / READY
- Capture ID: `5a784073-9617-410a-a6d9-dfe2535348a0`
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot. Capture-ID allocation was queued alongside Home organization before the font failure returned; no page submission was made.

### setup-specimen — DEFERRED
- Frame: Study / Setup Specimen / Editable
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### setup-picker — DEFERRED
- Frame: Study / Setup Picker / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### setup-inspector — DEFERRED
- Frame: Study / Setup Inspector / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### setup-readonly — DEFERRED
- Frame: Study / Setup / Read Only
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### setup-saving — DEFERRED
- Frame: Study / Setup / Saving
- Priority / availability: P3 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### setup-saved — DEFERRED
- Frame: Study / Setup / Saved
- Priority / availability: P2 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### setup-error — DEFERRED
- Frame: Study / Setup / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### readiness-ready — DEFERRED
- Frame: Study / Reasoning Readiness / Ready
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### readiness-proposal — DEFERRED
- Frame: Study / Reasoning Readiness / Proposal
- Priority / availability: P2 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### readiness-missing — DEFERRED
- Frame: Study / Reasoning Readiness / Not Ready
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### create-study-default — DEFERRED
- Frame: Creation / Source / Study Default
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-previous — DEFERRED
- Frame: Creation / Source / Previous Run
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-existing — DEFERRED
- Frame: Creation / Source / Existing Run
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-blank — DEFERRED
- Frame: Creation / Source / Blank
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-review — DEFERRED
- Frame: Creation / Review / Preview
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-blank-review — DEFERRED
- Frame: Creation / Blank Review / Empty
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-invalid — DEFERRED
- Frame: Creation / Source / Invalid
- Priority / availability: P3 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### create-not-ready — DEFERRED
- Frame: Creation / Review / Not Ready
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### create-busy — DEFERRED
- Frame: Creation / Review / Loading
- Priority / availability: P3 / TRANSIENT
- Capture ID: — (not submitted)
- Figma node: —
- Reason: TRANSIENT — excluded from this first pass by request.

### plan-wafer — DEFERRED
- Frame: Run / Plan Wafer / Editable
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-specimen — DEFERRED
- Frame: Run / Plan Specimen / Editable
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-cmp — DEFERRED
- Frame: Run / Plan Cmp / Editable
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-locked — DEFERRED
- Frame: Run / Plan / Locked
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-collapsed — DEFERRED
- Frame: Run / Plan / Collapsed
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-key-columns — DEFERRED
- Frame: Run / Plan / Compact Keys
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-details — DEFERRED
- Frame: Run / Plan Inspector / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-focus — DEFERRED
- Frame: Run / Focus Range / Selecting
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-focus-applied — DEFERRED
- Frame: Run / Plan / Focused
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-full — DEFERRED
- Frame: Run / Plan / Full History
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-varied — DEFERRED
- Frame: Run / Plan / Varied
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-changed — DEFERRED
- Frame: Run / Plan / Changed
- Priority / availability: P1 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### plan-selection — DEFERRED
- Frame: Run / Plan / Range Selected
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-dirty — DEFERRED
- Frame: Run / Plan / Unsaved
- Priority / availability: P1 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### plan-invalid — DEFERRED
- Frame: Run / Plan / Invalid
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### plan-saving — DEFERRED
- Frame: Run / Plan / Saving
- Priority / availability: P3 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### plan-saved — DEFERRED
- Frame: Run / Plan / Saved
- Priority / availability: P2 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### scope-backbone — DEFERRED
- Frame: Run / Scope / Selecting
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### scope-range — DEFERRED
- Frame: Run / Scope / Range Selected
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### scope-subjects — DEFERRED
- Frame: Run / Scope / Confirmation
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### scope-change-subjects — DEFERRED
- Frame: Run / Scope / Subject Picker
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### plan-participation — DEFERRED
- Frame: Run / Plan / Non Participant
- Priority / availability: P2 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### actual-wafer — DEFERRED
- Frame: Actual / Execution Wafer / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-specimen — DEFERRED
- Frame: Actual / Execution Specimen / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-empty — DEFERRED
- Frame: Actual / Execution / Empty
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-override — DEFERRED
- Frame: Actual / Entry / Override Selected
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-deviations — DEFERRED
- Frame: Actual / Execution / Deviation Filter
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-missing — DEFERRED
- Frame: Actual / Execution / Missing
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-details — DEFERRED
- Frame: Actual / Inspector / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### actual-saving — DEFERRED
- Frame: Actual / Entry / Saving
- Priority / availability: P3 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### actual-saved — DEFERRED
- Frame: Actual / Entry / Saved
- Priority / availability: P2 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### actual-invalid — DEFERRED
- Frame: Actual / Entry / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### measurement-wafer — DEFERRED
- Frame: Measurement / Results Wafer / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-specimen — DEFERRED
- Frame: Measurement / Results Specimen / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-cmp — DEFERRED
- Frame: Measurement / Results Cmp / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-site-entry — DEFERRED
- Frame: Measurement / Entry / Site
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-subject-entry — DEFERRED
- Frame: Measurement / Entry / Subject
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-sites — DEFERRED
- Frame: Measurement / Site Detail / Selected
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-inspector — DEFERRED
- Frame: Measurement / Inspector / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-empty — DEFERRED
- Frame: Measurement / Results / Empty
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### measurement-excluded — DEFERRED
- Frame: Measurement / Site Detail / Excluded
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### measurement-saving — DEFERRED
- Frame: Measurement / Entry / Saving
- Priority / availability: P3 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### measurement-saved — DEFERRED
- Frame: Measurement / Entry / Saved
- Priority / availability: P2 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### measurement-invalid — DEFERRED
- Frame: Measurement / Entry / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### evaluation-wafer — DEFERRED
- Frame: Evaluation / Assessment Wafer / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-specimen — DEFERRED
- Frame: Evaluation / Assessment Specimen / Populated
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-missing — DEFERRED
- Frame: Evaluation / Assessment / Missing
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-unreviewed — DEFERRED
- Frame: Evaluation / Assessment / Not Reviewed
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-details — DEFERRED
- Frame: Evaluation / Inspector / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-authoring — DEFERRED
- Frame: Evaluation / Decision Entry / Editable
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-action-type — DEFERRED
- Frame: Evaluation / Decision Entry / Action Changed
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-preview — DEFERRED
- Frame: Evaluation / Next Run / Preview
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### evaluation-created — DEFERRED
- Frame: Evaluation / Next Run / Created
- Priority / availability: P1 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### evaluation-saving — DEFERRED
- Frame: Evaluation / Decision Entry / Saving
- Priority / availability: P3 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### evaluation-error — DEFERRED
- Frame: Evaluation / Decision Entry / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### evaluation-narrow — DEFERRED
- Frame: Evaluation / Decision Entry / Narrow Layout
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-default — DEFERRED
- Frame: Analysis / Workspace / Default
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-wafer — DEFERRED
- Frame: Analysis / Workspace Wafer / Selected Data
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-specimen — DEFERRED
- Frame: Analysis / Workspace Specimen / Selected Data
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-filters — DEFERRED
- Frame: Analysis / Selection / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-table — DEFERRED
- Frame: Analysis / Workspace / Table
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-bar — DEFERRED
- Frame: Analysis / Workspace / Bar
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-scatter — DEFERRED
- Frame: Analysis / Workspace / Scatter
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-details — DEFERRED
- Frame: Analysis / Inspector / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-empty — DEFERRED
- Frame: Analysis / Workspace / Empty
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-save — DEFERRED
- Frame: Analysis / Save View / Open
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-saved — DEFERRED
- Frame: Analysis / Workspace / Saved
- Priority / availability: P1 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-update — DEFERRED
- Frame: Analysis / Save View / Update
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-sharing — DEFERRED
- Frame: Analysis / Sharing / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### analysis-shared-reader — DEFERRED
- Frame: Analysis / Sharing / Read Only
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### analysis-unresolved — DEFERRED
- Frame: Analysis / Workspace / Unresolved
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### analysis-saving — DEFERRED
- Frame: Analysis / Save View / Saving
- Priority / availability: P3 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### analysis-error — DEFERRED
- Frame: Analysis / Workspace / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### reference-definitions — DEFERRED
- Frame: Reference / Definitions / Read Only
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-filtered — DEFERRED
- Frame: Reference / Definitions / Filtered
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-empty — DEFERRED
- Frame: Reference / Definitions / Empty
- Priority / availability: P3 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-definition — DEFERRED
- Frame: Reference / Definition Inspector / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-create — DEFERRED
- Frame: Reference / Definition Entry / Editable
- Priority / availability: P2 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### reference-revision — DEFERRED
- Frame: Reference / Definition Inspector / New Revision
- Priority / availability: P2 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### reference-applicability — DEFERRED
- Frame: Reference / Applicability / Read Only
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-rule-detail — DEFERRED
- Frame: Reference / Applicability Inspector / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-rule-form — DEFERRED
- Frame: Reference / Applicability Entry / Editable
- Priority / availability: P2 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### reference-rule-invalid — DEFERRED
- Frame: Reference / Applicability Entry / Invalid
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### reference-resolver-photo — DEFERRED
- Frame: Reference / Resolver PHOTO / Resolved
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-resolver-material — DEFERRED
- Frame: Reference / Resolver Material / Resolved
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-packages — DEFERRED
- Frame: Reference / Package Versions / Populated
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-package-active — DEFERRED
- Frame: Reference / Package Inspector / Active
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-package-inactive — DEFERRED
- Frame: Reference / Package Inspector / Inactive
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-package-validation — DEFERRED
- Frame: Reference / Package Validation / Validated
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### reference-package-draft — DEFERRED
- Frame: Reference / Package Versions / Draft
- Priority / availability: P2 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### reference-package-invalid — DEFERRED
- Frame: Reference / Package Validation / Invalid
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### reference-package-authorized — DEFERRED
- Frame: Reference / Package Inspector / Activation Available
- Priority / availability: P2 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### reference-error — DEFERRED
- Frame: Reference / Studio / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### samples-list — DEFERRED
- Frame: Samples / Master / Populated
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### samples-empty — DEFERRED
- Frame: Samples / Master / Empty
- Priority / availability: P3 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-detail — DEFERRED
- Frame: Samples / Sample / Populated
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-revision — DEFERRED
- Frame: Samples / Revision / Delta
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-first-revision — DEFERRED
- Frame: Samples / Revision / Initial
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-create-1 — DEFERRED
- Frame: Samples / Create Identity / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-create-2 — DEFERRED
- Frame: Samples / Create Revision Information / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-create-3 — DEFERRED
- Frame: Samples / Create Material Structure / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-create-4 — DEFERRED
- Frame: Samples / Create Properties / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### sample-create-5 — DEFERRED
- Frame: Samples / Create Review / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-run — DEFERRED
- Frame: Legacy / Run Detail / Populated
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-wafer — DEFERRED
- Frame: Legacy / Identity Detail / Selected
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-measurement — DEFERRED
- Frame: Legacy / Measurement Detail / Site Table
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-scatter — DEFERRED
- Frame: Legacy / Measurement Detail / Scatter
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-prep-group — DEFERRED
- Frame: Legacy / Data Preparation / Group
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-prep-calc — DEFERRED
- Frame: Legacy / Data Preparation / Calculate
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### access-plan — DEFERRED
- Frame: Access / Plan / Read Only
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### access-actual — DEFERRED
- Frame: Access / Actual / Read Only
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### access-measurement — DEFERRED
- Frame: Access / Measurement / Read Only
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### access-evaluation — DEFERRED
- Frame: Access / Evaluation / Read Only
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### access-forbidden — DEFERRED
- Frame: Access / Study / Forbidden
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### access-saved — DEFERRED
- Frame: Access / Saved Analysis / Unauthorized
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### access-run-unavailable — DEFERRED
- Frame: Access / Run / Error
- Priority / availability: P3 / FAULT_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: FAULT_REQUIRED — excluded from this first pass by request.

### not-found — DEFERRED
- Frame: Access / Not Found / Not Found
- Priority / availability: P3 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### study-runs-empty — DEFERRED
- Frame: Study / Runs / Empty
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### study-runs-more — DEFERRED
- Frame: Study / Runs / Paginated
- Priority / availability: P2 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### run-loading — DEFERRED
- Frame: Run / Workspace / Loading
- Priority / availability: P3 / TRANSIENT
- Capture ID: — (not submitted)
- Figma node: —
- Reason: TRANSIENT — excluded from this first pass by request.

### evaluation-saved — DEFERRED
- Frame: Evaluation / Decision Entry / Saved
- Priority / availability: P2 / WRITE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: WRITE_REQUIRED — excluded from this first pass by request.

### reference-definition-invalid — DEFERRED
- Frame: Reference / Definition Entry / Invalid
- Priority / availability: P3 / ROLE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: ROLE_REQUIRED — excluded from this first pass by request.

### reference-resolver-empty — DEFERRED
- Frame: Reference / Resolver / No Match
- Priority / availability: P3 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### reference-package-assembled — DEFERRED
- Frame: Reference / Package Inspector / Assembled
- Priority / availability: P2 / STATE_REQUIRED
- Capture ID: — (not submitted)
- Figma node: —
- Reason: STATE_REQUIRED — excluded from this first pass by request.

### legacy-evidence — DEFERRED
- Frame: Legacy / Evidence Viewer / Open
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-next — DEFERRED
- Frame: Legacy / Next Run / Preview
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.

### legacy-conditions — DEFERRED
- Frame: Legacy / Conditions / Expanded
- Priority / availability: P2 / READY
- Capture ID: — (not submitted)
- Figma node: —
- Reason: READY but not submitted: global Figma font infrastructure stop after Home pilot.
