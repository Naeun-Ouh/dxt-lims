# PR #12 — bounded DXT enterprise Grid normalization

## TASK / STATUS

Normalize Run Draft and Operation lookup around one compact table/form language. Implemented; keep PR #12 unmerged. Exact final commit and localhost source verification are recorded in the PR completion comment and local `tmp/pr12-run-draft-uat/design-system-head.json`.

Read Issue #1, #14, #11 and PR decisions including 7029669233, 7039828932 and 7039948451 before implementation. The newer Run Draft ownership policy supersedes the original Study-bootstrap acceptance journey.

## DESIGN SYSTEM CHANGES

Ant Design is the enterprise pattern reference, not a new dependency or a pixel-copy. Reference: [Table](https://ant.design/components/table/) (compact density, selection, fixed header, editable cells, ellipsis) and [Form](https://ant.design/components/form/) (compact controls, required indicators and inline feedback). Existing DXT branding and native semantic controls remain.

- Shared `DxtGridFrame`, `DxtStatus`, `DxtCellText` presentation primitives.
- `app/dxt-grid.css` defines DXT color, text, spacing, radius, border, control-height, density, hover, selected, focus, disabled, read-only and feedback tokens.
- Lookup, order, conditions, Measurement and Preview share `.dxt-grid`. Existing duplicated table-base styling was removed.
- 32px controls, 16px checkboxes, sticky headers, internal horizontal scrolling and tooltip-backed text truncation.
- Preview and Add are default actions; Create Run is primary; move actions use labeled arrows; removal is danger-styled. Source selection uses a selected state rather than another primary action.

## OPERATION LOOKUP GRID

One row per exact context; selection/order, name, type, area, equipment, module, conditions and Measurement capability. Existing search, filters, ordered multi-selection, Add/Cancel and secondary technical detail remain. Measurement rows carry a distinct type badge. Long labels truncate with native title text; complete references remain in detail. Missing source display names are still shown as unavailable, not replaced with fabricated names.

## OPERATION ORDER GRID

Same context columns and condition summary; compact up/down and remove actions. Expandable participation controls retain bulk and individual selection. Values and participation stay attached to their Operation while reordering. No drag/drop or new execution object.

## CONDITIONS GRID

Required/optional labels use display-only `conditionRequirements` supplied by the existing exact configuration resolver. This is additive response metadata, not a persisted field or a new schema; the server still independently validates Preview/Create.

Required coverage gaps, Missing, Invalid, Not entered and Not Participating remain distinct. Value-format checks reuse `validateStudySetupItem`; errors include local guidance. Requiredness labels do not invent assignments. Inputs preserve strings; NUMBER uses decimal input mode rather than coercion (the authoritative validator accepts existing numeric representations). BOOLEAN uses an explicit blank/true/false select so an unanswered condition is not silently converted to false. Existing reference/select editors remain. FIXED/VARIED persisted values are untouched, with KO 고정 조건 / 실험 변수 and the approved tooltip.

## MEASUREMENT GRID

Section 4 uses Operation, point, parameter checkbox, unit, supporting-parameter status and validation columns. It appears only for selected Measurement Operations. Point changes retain the existing clear-parameter-selection behavior. Supporting requirements are shown by catalog name and never auto-selected. Compatibility/selection feedback is explanatory; existing readiness remains authoritative. Process-only Runs do not acquire a Measurement prerequisite.

## STUDY / SEMANTICS CHANGED

NO domain/schema/auth/readiness/persistence changes. The existing Study surface remains context, reference information, optional defaults and history/Create Run. No execution editor was moved back to Study. No new dependency, migrations, grants, Target, Evaluation, automatic values, Sample lifecycle or #13/#9 changes.

## VALIDATION — agent evidence only

- Full repository suite: **333/333 PASS**, including three new presentation regressions and PostgreSQL/PGlite contracts.
- Native PostgreSQL 18 contract suite: **PASS** on a separate temporary database.
- TypeScript, changed-file lint, production build, `git diff --check`: PASS.
- New tests verify required/optional and uncovered participation feedback without creating assignments; KO/EN invalid values and unchanged role/value/unit; Measurement supporting prerequisites without automatic selection; process-only absence of Measurement controls.
- Existing Run Draft PostgreSQL contract verifies exact requiredness metadata is supplied for every resolved condition.
- Browser: Specimen and Wafer populated source readback, type-filter multi-selection retention and ordered addition, up/down reorder, removal, empty search and Cancel, inline invalid numeric input, required empty rows, Measurement point and parameter selection, READY Preview with/without Measurement, KO/EN, desktop 1440 and narrow 720. Tables scroll internally; page does not overflow. Visible checkboxes measure 16×16.
- AGENT ONLY Wafer Run **2** was created through the browser and routed to Plan at `/series/agent-run-draft-wafer/runs/2/engineering-grid?view=plan`, using the existing explicit AGENT source values. No Human Study was created or edited by the agent.
- Denied persona receives an actionable permission message and no execution editor/Create action.
- Development HMR invalidated the locale/application provider during code updates. Fresh tabs after updates showed consistent KO/EN and completed creation. Old HMR tabs are not UAT evidence.
- A final build attempt initially hit local disk exhaustion before starting; retry using the existing log completed successfully. Existing data/servers were not removed to reclaim space.

## HUMAN UAT — READY, acceptance NOT RUN

Updated code on **3237** (researcher) and **3238** (existing no-Run persona). Earlier UAT servers/data are preserved. These are local development personas, not SSO or production acceptance.

**Actual human entry:** http://127.0.0.1:3237/studies/new

The reserved Human Studies do not exist yet (read-only check). Do not use a future deep link as if creation has already passed. Participant creates:

- `UAT ONLY · Run Draft Specimen`, slug `human-run-draft-specimen`, Material/Specimen reference context.
- `UAT ONLY · Run Draft Wafer`, slug `human-run-draft-wafer`, PHOTO/Wafer reference context.

Follow the existing explicit-grant facilitator procedure in `docs/dxt-pr12-run-draft-implementation-and-uat.md`: creation must not imply scientific capability. Only after human Study creation, use the pre-existing bounded grant helper for that reserved Study if necessary; do not grant the denied persona. No new grants were made in this task.

Then discover Create Run from overview and choose Blank. Expected routes after the human creates each Study:

- http://127.0.0.1:3237/runs/new?series=human-run-draft-specimen&from=blank
- http://127.0.0.1:3237/runs/new?series=human-run-draft-wafer&from=blank

Use the previously documented explicit test-only values (not scientific recommendations): Specimen UAT-SP01/02/03, Cure Temperature 120 / 실험 변수, Cure Time 30 / 고정 조건; exclude SP03 for participation observation. Wafer UAT-W01/02/03, Exposure, EXP-R01, Focus 0, RET-01, D035 Rev.2, Energy 35 / 실험 변수. No Target/Evaluation/Next Action. Human performs Preview/Create, Plan readback and reload. Separately add Measurement only for the optional acquisition-intent case.

Ask for natural observations of grid density, lookup selection, ordering, required/invalid feedback, participation and condition scope. Record facts separately from interpretation. Do not pre-emptively guide button locations. Status stays NOT RUN until a participant actually begins.

**Agent inspection routes** (not Human acceptance):

- http://127.0.0.1:3237/runs/new?series=agent-run-draft-specimen&from=previous-run
- http://127.0.0.1:3237/runs/new?series=agent-run-draft-wafer&from=previous-run
- Denial: http://127.0.0.1:3238/runs/new?series=agent-run-draft-wafer&from=blank

## REMAINING / NEXT RECOMMENDED TASK

Remaining: Human usability acceptance, real master display-name completeness, local machine disk headroom. Internal table scrolling is intentional at narrow widths; long scientific identifiers are not shortened in data. No full design-system rewrite.

Next task: **bounded Human UAT of the updated Run Draft flow at the final PR head**. Do not merge before real acceptance and Product/Architecture review.
