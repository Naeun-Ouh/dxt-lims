# DXT FINAL Figma-to-Implementation Gap Audit v1

Audit date: 2026-09-27. Target: `http://localhost:3200`. Verdict: **PARTIALLY READY** for facilitated Human UAT of existing Studies and Runs; **not ready for unrestricted end-to-end acceptance of all FINAL capabilities**.

Product code was not changed. No scientific, configuration, authorization, activation, creation, or save command was submitted in the live application. Navigation, filters, selection, locale switching, Inspector opening, and non-persistent previews were exercised. The locale was returned to KO.

## Result and counting rules

| Measure | Count |
| --- | ---: |
| Latest approved canonical Figma screen/state frames audited | **28** |
| IMPLEMENTED | **8** |
| PARTIAL | **16** |
| VISUAL_ONLY | **2** |
| MISSING whole screens | **0** |
| DEFERRED exact-state verification | **2** |
| Confirmed P0 gaps | **0** |
| Distinct P1 gaps | **6** |

These are screen rollups, not counts of individual controls. Missing controls are identified below even though no entire approved screen is absent. The two DEFERRED frames have rendering implementations but lack the exact live data state needed for a faithful localhost comparison. They are not counted as fully implemented. NOT_APPLICABLE applies to individual illustrative/out-of-scope elements, not a whole frame here.

IMPLEMENTED means the screen's meaningful approved read/interaction behavior has a real implementation and no material screen-specific gap was found in this audit. It does **not** mean every persistence path was re-executed, every role was impersonated, or a pixel-perfect visual regression passed. Common limitations below still apply to all screens.

P0 = confirmed security/data-integrity failure or inability to use the core workflow. P1 = blocks a principal acceptance scenario or materially misrepresents workflow/state. P2 = secondary UX, consistency, or explanatory gap. Zero confirmed P0 findings is not a security certification: restricted-role sessions and live writes were deliberately not exercised.

## Scope and evidence

Source of truth: [DXT LIMS UI/UX Figma](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX). All 28 listed nodes were retrieved through Figma design context and their reference screenshots inspected. Scope is the explicitly approved node set in the task history, reconciled with the implementation reports; it is not a claim that every unrelated page in the Figma file was discovered.

Canonical supersessions: Plan `4:4` → `124:8`; Run creation `130:275` → `127:427`; Run review `130:354` → `127:502`. Older As-Is capture frames and visible legacy Run pages are not counted as new FINAL screens. KO/EN, Inspector open/closed, and domain variants are supplementary checks unless separately approved as a frame.

Evidence levels used:

- **L** — current localhost observation or non-writing interaction.
- **S** — current source/command/permission inspection.
- **I** — isolated, non-persistent model probe using a cloned existing fixture.
- **T** — existing test coverage inspected, not rerun as part of this audit.
- **D** — exact live-state verification deferred.

Browser inspection used a requested 1440 × 900 viewport, screenshots, accessibility snapshots and selected DOM geometry checks. The in-app screenshot provider has a scaling/rendering limitation at the forced viewport; comparisons establish structure, hierarchy, readability and major layout, **not** pixel-perfect typography. No severe page overflow was observed in sampled Plan, Measurement, Evaluation, Analysis, Sample Revision and Package Review states. This is not a blanket responsive/mobile pass.

Representative existing data:

- DTS Improvement Run **20**: editable Plan, four Wafers; W01 Energy 37, W02–W04 36, Focus 1.
- DTS Improvement Run **19**: locked Plan; Energy planned 37 / actual 38; W01 BCD 17.05 nm; W02–W04 missing; one SITE observation; saved assessment/conclusion.
- Adhesion Material Optimization Run **4**: SP-01 Peel Force 24 N against ≥22 N; remaining Subjects missing. Run **5** is the existing editable continuation, not recreated here.
- CMP Stability Run **13**: W01 PRE Thickness 550 nm and POST 500 nm in distinct datasets. No fabricated automatic removal-rate result.
- Saved Analysis `analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8`, “UAT v1 PHOTO BCD 17.05”: opens the saved Line context, one available result and three missing Subjects.
- Samples D031 Rev.3 / Rev.2, D035 Rev.2: existing **fixture catalog**. Rev.3 has two fixture usages, Rev.2 none. These are not newly authored production records.
- Repository-resolved PHOTO/CMP/Material package versions. PHOTO v1 is currently INACTIVE; historical Run access still resolves its exact pin. Do not activate it merely to match an illustrative screenshot.

## Summary matrix

All routes below are relative to `http://localhost:3200`. Query/interaction instructions are part of the exact state. Frame links use the approved node identifiers.

| Screen | Figma frame/node | Route / state entry | Visual status | Functional status / rollup | Gap | Severity | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home populated | [146:5](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=146-5) | `/` | IMPLEMENTED | IMPLEMENTED · L/S | Recorded-activity Gantt and authorized metrics work; actual six Runs differ from design examples | — | Include Continue and calendar navigation in UAT; do not call this an equipment booking calendar |
| Home empty | [146:236](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=146-236) | `/`, empty authorized result | PARTIAL verification | DEFERRED · S/T/D | Current principal has three Studies; exact empty dashboard not reproduced live | P2 coverage | Use an approved empty-scope UAT account, without clearing data |
| Study list | [130:7](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=130-7) | `/studies` | PARTIAL | PARTIAL · L/S | Status/Owner filters disabled, cells unavailable; technical identifiers replace some descriptive context | P2 | Expose authoritative metadata or explicitly retain an unavailable state |
| Create Study | [130:161](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=130-161) | `/studies/new` | PARTIAL | VISUAL_ONLY · L/S | No create command; primary, Domain/Area/Owner/Team/Reference Kit controls disabled | **P1 G04** | Define authorized Study creation boundary before creation acceptance |
| Study Overview | [127:8](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=127-8) | `/series/dts-improvement?view=overview` | IMPLEMENTED | PARTIAL · L/S | Overview shows Active/owner while discovery reports those fields unavailable; provenance inconsistent | P2 G07 | Align metadata sourcing and distinguish static descriptive context |
| Study Runs | [127:132](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=127-132) | `/series/dts-improvement?view=runs` | IMPLEMENTED | IMPLEMENTED · L/S | Correct current Run 19/20 data, links and inherited-change context; real rows may be taller | — | Retain real lifecycle states rather than Figma example “Complete” |
| Study Setup | [127:251](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=127-251) | `/series/dts-improvement?view=setup` | PARTIAL | PARTIAL · L/S | INACTIVE kit next to Ready needs explanation; existing autosave behavior differs from explicit save elsewhere | P2 G07/G08 | Explain exact historical pin/readiness and autosave boundary |
| Create Run / source | [127:427](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=127-427) | `/runs/new?series=dts-improvement&from=study-default` | IMPLEMENTED | IMPLEMENTED · L/S | Four source choices have real handlers; current audit exercised Study Default preview only | — | Execute all source/create round trips in isolated writable UAT |
| Create Run / review | [127:502](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=127-502) | Same route → Review Inheritance | IMPLEMENTED | IMPLEMENTED · L/S | Exact package/subjects/operations/assignments rendered; Create command wired, not submitted | — | Validate persistence/idempotency with a designated disposable UAT Run |
| Plan Wafer editable | [124:8](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=124-8) | `/series/dts-improvement/runs/20/engineering-grid?view=plan` | IMPLEMENTED | PARTIAL · L/S/T | Participation dots/counts are read-only; no per-operation or multi-Subject participation editor | **P1 G01** | Add an explicitly scoped participation workflow in a later implementation task |
| Actual | [124:204](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=124-204) | `/series/dts-improvement/runs/19/engineering-grid?view=actual` | PARTIAL | PARTIAL · L/S/I | N/A still contributes to missing projection/counts; header Save opens form; import disabled | **P1 G02**; P2 G08 | Correct participation-aware missing semantics; clarify record/save action |
| Measurement | [124:360](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=124-360) | Same Run → `?view=measurement` | PARTIAL | PARTIAL · L/S | Absent result rendered as dash without participation distinction; pending rows depend on existing datasets; header Save opens form | **P1 G02**; P2 G08 | Separate expected participating results from non-participants; retain real evidence |
| Evaluation reviewed | [133:2350](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=133-2350) | Same Run → `?view=evaluation`, W01 | PARTIAL | PARTIAL · L/S | Extra disposition select; hidden multi-field Decision form and separate save remain | **P1 G03** | Align UI orchestration with approved compact flow without merging scientific concepts |
| Evaluation missing | [133:2459](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=133-2459) | Same route → W02 | PARTIAL | PARTIAL · L/S | Result Missing and disabled Save correct; conclusion radio choices remain available unlike disabled design | **P1 G03** | Make action availability and prerequisites explicit and consistent |
| Evaluation Inspector | [133:2567](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=133-2567) | Same route → result/Details | IMPLEMENTED | PARTIAL · L/S | Provenance opens correctly, but parent Evaluation still has G03 | **P1 G03** | Preserve Inspector while fixing the authoring interaction |
| Analysis Table default | [139:8](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=139-8) | `/analysis?study=dts-improvement&runs=19` | IMPLEMENTED | IMPLEMENTED · L/S | Table first; context/filter/sort; Save Analysis consistently named | — | Preserve exact data references; UAT actual save separately |
| Analysis Line | [139:212](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=139-212) | Same route → Line | IMPLEMENTED | IMPLEMENTED · L/S | Real data contains one point, not illustrative multi-point trend | NOT_APPLICABLE | Do not invent scientific data to match chart shape |
| Analysis Scatter | [139:437](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=139-437) | Same route → Scatter | IMPLEMENTED | IMPLEMENTED · L/S | One plotted point, three missing; no fabricated correlation | NOT_APPLICABLE | Add richer real UAT data only through normal authorized acquisition |
| Analysis Inspector | [139:677](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=139-677) | Same route → W01 BCD detail | IMPLEMENTED | IMPLEMENTED · L/S | Exact execution/dataset/summary/parameter IDs visible; closes independently | — | Retain technical IDs verbatim |
| Samples list / selected | [152:7](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-7) | `/samples` → D031 | IMPLEMENTED | PARTIAL · L/S | Working catalog search/filter/selection; counts/usages come from static fixture contexts | **P1 G05** | Label/catalog-bound UAT clearly; resolve live usages before production traceability claims |
| Sample Detail | [152:195](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-195) | `/samples/D031` | PARTIAL | PARTIAL · L/S | Exact fixture revision switching works; Mark Inactive/Create Revision unavailable; selected-revision side panel always open | **P1 G05**; P2 G09 | Specify authoring boundary and consistent optional Inspector |
| Create Sample | [152:351](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-351) | `/samples` → Create Sample → Review Sample | PARTIAL | VISUAL_ONLY · L/S | Explicit preview only; Finish review does not persist a Sample | **P1 G05** for full creation UAT | Keep preview warning; exclude from creation acceptance until a command exists |
| Reference Definitions | [152:452](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-452) | `/reference?section=definitions` | PARTIAL | PARTIAL · L/S | Real repository rows, filters, Inspector and command paths; current principal cannot author; some raw UI enum labels | P2 G10/G11 | Translate display enums; validate allowed and denied governance roles separately |
| Applicability | [152:678](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-678) | `/reference?section=applicability&definition=condition-energy-v1&inspector=1` | PARTIAL | PARTIAL · L/S | Uses selected-definition scope; Figma search/Area/intent filtering and impact summaries are not equivalent | P2 G12 | Implement or explicitly defer the additional browse/impact controls |
| Package Versions | [152:916](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-916) | `/reference?section=packages&package=config-package-photo-v1&inspector=1` | PARTIAL | PARTIAL · L/S | Real draft/assemble/validate boundary; activated-at/by/history/readiness table differs; validation deep link can pre-mark UI passed | **P1 G06**; P2 G12 | Await authoritative validation; distinguish missing audit metadata from registered placeholders |
| Package Review | [152:1124](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=152-1124) | `/reference?section=packages&package=config-package-photo-v1&review=1` | PARTIAL | PARTIAL · L/S | Exact manifest and rule-set counts work; no activation timeline; checklist state has G06; activation correctly disabled here | **P1 G06**; P2 G12 | Bind readiness to completed validation; clarify historical count and unavailable timeline |
| Sample Revision used | [157:5](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=157-5) | `/samples/D031/revisions/3` | IMPLEMENTED | PARTIAL · L/S | Real fixture deltas and prior revision links; Create New Revision disabled; usages navigate legacy Run1/2 | **P1 G05** | Keep exact revision trace; distinguish fixture usage from production usage |
| Sample Revision Draft / empty | [157:220](https://www.figma.com/design/ocXq0VLr5UFjSBBSza19W8/DXT-LIMS-UI-UX?node-id=157-220) | No current exact Draft record; `/samples/D031/revisions/2` only covers empty usage | PARTIAL verification | DEFERRED · L/S/T/D | Empty usage verified; actual Draft/effective-date-empty state unavailable live | P2 coverage | Use a sanctioned Draft record after authoring boundary exists; do not relabel Active data |

## Meaningful UX element register

This register separates display, commands, intentional boundaries and validation coverage. A disabled action due to the current principal is not automatically a missing implementation.

| Area / element | Classification | Evidence and limit |
| --- | --- | --- |
| Global navigation, breadcrumb, locale switch, compact shell/footer | IMPLEMENTED | L/S; route links and persisted local locale work; historical legacy Run pages retain older shell |
| KO/EN shared components and unchanged scientific identifiers | IMPLEMENTED | Same components/dictionary; W01/SP-01, equipment IDs, dataset IDs, units and numerical values preserved |
| Complete KO display-label consistency | PARTIAL | Package Review renders ACTIVE/INACTIVE and semantic/data types directly; Sample usage displays Candidate/WORSE/SIMILAR; these are display states, not immutable scientific IDs |
| Home Continue, metrics, recent Runs, Gantt | IMPLEMENTED | Authorized live data; calendar describes recorded activity, not reserved equipment time |
| Equipment booking / resource scheduling | NOT_APPLICABLE | No such scientific/operational capability should be inferred from the illustrative calendar title |
| Study list search/domain filter/latest Run navigation | IMPLEMENTED | Real authorized discovery data and working narrowing/navigation |
| Study Owner/Status filters and authoritative list fields | MISSING | Disabled controls/dashes; no discovery contract values; Overview's static metadata is not a substitute |
| Study creation form layout/local inputs | VISUAL_ONLY | No create command; visible explanation and disabled action |
| Run source choice, preview, exact inherited manifest | IMPLEMENTED | Real callbacks/server preview; Study Default preview exercised; alternate sources source-inspected |
| Create Run persistence revalidation | DEFERRED | Existing implementation/previous reports are evidence of wiring, not a new live write test |
| Study Setup variable/intent/reference editing | IMPLEMENTED | Existing command/data path; not edited live because setup changes can autosave |
| Setup inactive-pin vs readiness explanation | PARTIAL | Both statuses appear together with insufficient explanation for a first-time user |
| Plan frozen reference columns, Subject scroll, Operation hierarchy, nested Items | IMPLEMENTED | L/S; no card conversion; stable Subject identifiers |
| Plan editable values, Fixed/Intentionally Varied, changed/invalid handling | IMPLEMENTED | L/S/T; genuine editor/validation paths; no value writes during audit |
| Plan locking after execution evidence | IMPLEMENTED | Run19 Save and scope definition disabled; value inputs readOnly; Run20 remains editable |
| Focus Range / Scope selection vs participation | IMPLEMENTED for focus/scope | Separate view/scope controls exist; not a per-operation membership editor; no scope confirmation submitted |
| Operation × Subject participation display | IMPLEMENTED | Dots/counts; N/A display and edit rejection covered by source/existing isolated test |
| Per-operation participation editing | MISSING | No membership toggle/command in the Operation cells |
| Multi-Subject participation editing / branch and rejoin authoring | MISSING | Grid multi-cell selection/paste edits variable values only; scope assignment is not operation membership |
| Non-participating vs empty value in Plan | IMPLEMENTED | Nonparticipant cells have N/A and no value editor; blank participating value remains distinct |
| Non-participating vs Missing across Actual/Measurement | PARTIAL | Actual N/A render exists, but projections/counts include missing nonparticipant comparisons; Measurement absent cells lack participation-aware distinction |
| Actual plan comparison and difference filter | IMPLEMENTED | Live Energy 37 → 38 survives difference filtering; observed evidence kept separate from Plan |
| Actual record form / Measurement manual entry | IMPLEMENTED | Genuine command callbacks; header actions open forms, form buttons save; no live submission performed |
| Header Save Actual / Save Measurement action semantics | PARTIAL | First click opens/closes the entry form rather than saving; same label has different meanings in header and form |
| Tool import / measurement file import | DEFERRED | Explicitly disabled with explanation; not a functional import merely because Figma draws the action |
| Measurement representative selection, immutable source detail, SITE drill-down | IMPLEMENTED | W01 BCD17.05 and exact measurement execution/dataset/summary references; SITE remains subordinate to Subject |
| Pending Measurement coverage before first dataset | PARTIAL | Operation list derives from existing projections, not all expected measurement operations; empty evidence cannot demonstrate full pending backbone |
| CMP PRE/POST and Material Subject-grain results | IMPLEMENTED | Existing separate observations displayed; no automatic invented derived scientific values |
| Target auto-assessment vs Engineer Comment distinction | IMPLEMENTED | W01 achieved, W02 missing; missing result cannot be saved as engineer evaluation |
| Approved Evaluation v1 compact authoring flow | PARTIAL | Result Summary → Target → Comment → Conclusion visually exists, but disposition and multi-field separate Decision save remain |
| Run Conclusion radio choices as a complete/next-run command | VISUAL_ONLY alone | Selecting a radio only changes local next-action type; separate details/Save Decision command is needed |
| Existing Decision save and Preview Next Run | IMPLEMENTED boundary | Real independent commands/preview links; not equivalent to a single Save Evaluation operation |
| Analysis Table-first / Table → Line → Bar → Scatter | IMPLEMENTED | Default TABLE in source and browser; Line/Scatter exercised; Bar renderer is wired, inspected in source |
| Analysis scope, dataset/Subject selection, filter and sort | IMPLEMENTED | FilterGroup selectors and handlers exist; repository-resolved sources, no mock numeric replacement |
| Save Analysis terminology | IMPLEMENTED | Header and actual save form use Save Analysis; Update Saved Analysis is explicit for an existing object |
| Saved Analysis reopen and exact-reference context | IMPLEMENTED | Existing saved Line analysis reopened with its data context; write callback uses exact references/version contract |
| Sharing management for allowed/denied recipients | DEFERRED live validation | Current principal sees disabled Manage sharing; source retains audience AND source-access rule; no grant was attempted |
| Lifecycle Inspector closed by default / selected-cell opening | IMPLEMENTED | Plan value, Measurement result, Evaluation detail, Analysis result open secondary right panel; core editing remains outside |
| All Inspectors identical default/open behavior | PARTIAL | Sample Detail always shows selected-revision panel; Revision detail defaults open per its later FINAL frame; Studio uses optional panel; latest specific design overrides blanket default only where explicit |
| Samples search/filter/revision switching/deltas | IMPLEMENTED for fixture catalog | Exact local catalog revisions, not fabricated values; not production Sample authoring or production usage discovery |
| Production Sample creation/revision/inactivation | MISSING | Preview and disabled revision action do not create immutable persisted artifacts |
| Create Sample preview-only warning / review / back | IMPLEMENTED | Live warning and review observed; no false success that claims a saved Sample |
| Sample production usage traceability | PARTIAL | Revision-specific fixture usage exists; it omits current production UAT Run usages and links legacy Run pages |
| Certificate/QC/signature/hash/author example fields absent from data | NOT_APPLICABLE | Do not copy illustrative Figma facts or invent traceability evidence |
| Reference definitions, exact immutable revisions, repository filtering | IMPLEMENTED | Actual registry data; command and governance guards inspected; authorship unavailable to current principal is expected |
| Applicability additional search/Area/intent controls and impact summaries | MISSING | Current selected-definition filtering and View Packages are narrower than Figma's browse/impact surface |
| Create draft → assemble → validate → activate / deactivate | IMPLEMENTED command boundary | Actual command callbacks and permission guards, not decorative buttons; not executed live |
| Reference Package Review exact manifest / rule-set coverage | IMPLEMENTED | Correct exact definition IDs and pinned rule-set counts, no invented area coverage |
| Validation checklist correctness on `validation=1` deep link | PARTIAL | UI marks selected version validated before async validation completes; see G06 |
| Activation timestamp/by/history presentation | MISSING | Current Registered/status/safety information is not the Figma activation timeline |
| Approval workflow implied by an illustrative review badge | NOT_APPLICABLE | Explicitly excluded from product scope; not recommended as part of this UI audit |
| Current principal's Reference authoring restrictions | IMPLEMENTED | Disabled Create Definition/New Revision/Add Rule/Create Draft/Activate observed; source checks governance scope |
| Scientific read-only account, forbidden routes, negative authorization matrix | DEFERRED live validation | No alternate sanctioned role session provided; existing code/tests are not fresh negative-role browser evidence |
| Saving/saved/error/conflict feedback | PARTIAL validation coverage | Existing handlers/notices inspected; transient server writes/failures were not induced; no fabricated “passed” state |

## P1 gap register — six distinct issues

### G01 — Operation-level and multi-Subject participation authoring is missing

**Evidence:** `src/features/run-registration/engineering-grid.tsx:1320` renders participant counts/cells without a membership edit handler. `grid-plan-context.ts` reads `snapshot.subjectOperationIds`; Focus Range explicitly does not change participation. Existing branching tests in `tests/workspace-inline.test.tsx:2498` construct membership programmatically and test edit rejection, not a working participation UI.

**Impact:** An engineer cannot express “W01/03/05 go through A, W02/04/06 through B, all rejoin C” from the approved workspace. Neither scope selection nor copying values satisfies this task.

**Recommended action:** Specify and implement membership selection and multi-Subject application at the Operation boundary, preserving existing locking/authorization/assignment semantics. Until then explicitly exclude branching authoring from accepted UAT scope. No implementation was made here.

### G02 — N/A display does not consistently remove nonparticipants from Missing semantics

**Evidence:** `actual-execution-model.ts:223` projects every operation × every Subject. `actual-execution-grid.tsx:154` filters those projections and `:181` counts all comparisons. Its later cell renderer checks participation, but the counts/filter logic does not.

An isolated probe cloned the existing PHOTO fixture, removed W01 from EXPOSURE participation, supplied no evidence, and called the actual projection. Result: `participates: false`, `status: NOT_EXECUTED`, and **six MISSING_ACTUAL comparisons**: Equipment, Recipe, Focus, Reticle, Material, Energy. This probe wrote no repository or scientific state. Thus N/A display alone does not fix the projection/summary classification.

`measurement-execution-grid.tsx:438` renders all Subjects for an existing metric and shows `—` for an absent projection; its Pending predicate does not consult participation. Operations themselves derive from existing measurement projections. This is a source-confirmed gap; current live UAT Runs have all-participating scopes, so the branching Measurement case was not claimed as live-reproduced.

**Impact:** Branching experiments can show misleading missing/unrecorded work, while wholly unmeasured expected operations are not represented by the same pending backbone.

**Recommended action:** Make expected participation explicit in read projections/counts/filtering and preserve unplanned actual observations. Test N/A, participating-but-missing, recorded, and rejoined Subjects together. Do not conceal actual out-of-plan evidence.

### G03 — Evaluation v1 simplification is only partial

**Evidence:** `evaluation-execution-grid.tsx:467` saves only Engineer Evaluation. The separate `saveDecision` at `:494` requires an existing evaluation plus Decision/Rationale/Next Action inputs. `:623` hides those inputs under Record conclusion details, with another Save Decision & Next Action at `:703`/`:722`. The disposition dropdown remains in the normal flow. Live W02 correctly disables Save Evaluation, but still shows enabled conclusion radio controls.

**Impact:** The approved compact surface suggests Comment + Conclusion are one save task. Save Evaluation does not persist the selected conclusion. Choosing Complete Run/Create Next Run is not itself completion or creation, creating a likely first-time-user false expectation.

**Recommended action:** Align the UI save orchestration/labels and prerequisite feedback with the approved four-part flow, while retaining independent target assessment, evaluation and decision semantics. Do not silently drop the separate domain command or invent a completed Run.

### G04 — Create Study is a presentation, not an available workflow

**Evidence:** `src/features/experiment-series/create-study.tsx:12` explicitly states that creation is unavailable; primary and unresolved reference/ownership controls are disabled. The frozen repository has no corresponding authored route command in this screen.

**Impact:** A user cannot start the full journey from a new Study. This is not a CSS gap and cannot be accepted as a completed creation scenario.

**Recommended action:** Establish the authorized Study authoring contract in a separate task, or limit initial UAT to the three existing Studies with this boundary clearly stated.

### G05 — Sample authoring and production usage traceability remain outside the implemented boundary

**Evidence:** `src/features/samples/model.ts:1` imports mock materials, definitions and experiment contexts. `usages` reads those contexts rather than production Run assignments. The catalog reports D035's older fixture usages even though live Run19/20 use D035 Rev.2. D031 usage links open legacy Run1/2 with the older shell, not the production engineering-grid flow. `sample-create/create-sample.tsx:83` warns that nothing is saved. `sample-revision-detail/detail.tsx:85` disables Create New Revision; Sample Detail has no working Mark Inactive/Create Revision command.

**Impact:** Exact revision comparison is usable for the fixture catalog, but the screen is not a complete operational Sample master or an authoritative production usage audit. In particular do not infer that these static usage rows have gone through the production authorized query boundary. This audit found no demonstrated exposure of real private data; it also cannot certify that boundary from fixture rendering.

**Recommended action:** Preserve the explicit preview-only boundary. Define and authorize Sample authoring/usage repository projections before full Sample lifecycle UAT. Keep fixture demonstrations visibly distinct from live scientific traceability; do not manufacture author/QC/certificate records.

### G06 — Package validation deep link can imply success before validation completes

**Evidence:** `src/features/reference-studio/package-view.tsx:54` initializes `validated` by calling `void studioCommands.validatePackageVersion(selectedId)` and immediately returning `selectedId` when `initialValidation` is true. The checklist treats `validated === selected.id` as passed; activation UI also uses it as a prerequisite. `app/reference/page.tsx` exposes this via `validation=1` or the corresponding `state` suffix. Ordinary explicit Validate uses an awaited command and differs from this initializer.

**Impact:** On a slow or rejected validation, a deep-linked UI can show passed checks prematurely. Backend activation validation/permissions still exist; this is **not** evidence that an invalid package was activated. The deep link was intentionally not opened because it calls a validation command during render.

**Recommended action:** Await completed exact-version validation, render pending/error explicitly, and derive each success indication from the returned outcome. Add an isolated rejection/delay test. No validation or activation command was run for this audit.

## Secondary gaps and deliberate differences

- **G07 — Metadata/readiness explanation:** Study list lacks authoritative Owner/Status while Overview displays `series.owner` and a hardcoded Active badge (`experiment-series/series.tsx:36`). Setup can display INACTIVE configuration with lifecycle Ready. Historical exact pins may be valid; the UI must explain the distinction, not change their semantics.
- **G08 — Primary action consistency:** Buttons generally occupy the right action area. Save Plan submits pending edits; Save Actual and Save Measurement open a form before a second save; Save Analysis opens a named-save form; Evaluation has a separate Decision save. The first two should not imply an already submitted record. Import actions are explicitly disabled/deferred. Setup/intent/scope autosave boundaries need consistent disclosure.
- **G09 — Inspector consistency:** Lifecycle/Analysis Inspectors are secondary and selection driven. Sample Detail lacks the same close/reopen behavior; Revision details intentionally start open in the later approved frame. Shared 280px desktop styling is present, but identical lifecycle positioning/default behavior across every context is not established. Preserve later frame-specific exceptions rather than forcing a redesign.
- **G10 — KO/EN residual display labels:** Core actions and canonical lifecycle terms switch correctly. Package Review raw status/semantic type cells bypass `t`; Sample usage role/decision labels also remain English. IDs, parameter names, units and actual user-authored English comments must remain unchanged. No severe KO truncation was observed in sampled screens, but a full 28 × 2 transient-state layout pass remains unperformed.
- **G11 — Authorization coverage:** Current scientific writer cannot govern configuration or manage this Saved Analysis's sharing. Disabled authoring is expected, not proof of a dead button. Negative-role UI, forbidden source combinations and live write rejection need sanctioned alternate-role UAT sessions. The fixed display name is not proof of authenticated identity; trusted-principal pilot limitations remain.
- **G12 — Studio browse/impact/history:** Applicability lacks Figma's full search/Area/intent browse surface and affected-Study summary. Package tables show Created/Registered and usage instead of activated-at/by/history and full readiness columns. Review has rule-set coverage rather than detailed Area/Operation coverage. Historical Runs count only **earlier versions** (`authoring-model.ts:331`), so PHOTO v1 can say 0 while the selected version has two pinned Runs; its label needs that qualification.
- **NOT_APPLICABLE:** Extra rows, multi-point scientific chart shapes, certificate/QC/hash/author values and approval workflow shown as illustrative Figma data must not be copied as facts. Approval workflow was explicitly excluded in prior scope. Sparse real data and disabled unauthorized activation are not design defects.

## What was verified versus still pending

Live checks covered Home populated, Study list/create/overview/runs/setup, Run source/preview, editable and locked PHOTO Plan, Actual difference filter, Measurement selection/Inspector, Evaluation achieved/missing/Inspector, Analysis default/Line/Scatter/Inspector/saved reopen, Samples list/create preview/detail/revision used/empty usage, Definitions selection/Inspector, Applicability selection/Inspector, Packages and Package Review. Material evaluation and CMP PRE/POST measurement were also checked with the same shared components.

KO and EN were exercised across the shared shell and representative Study, lifecycle, Analysis, Samples and Studio screens. Some route/state pairs were inspected in one locale plus source comparison, not all 56 combinations. Bar rendering, alternate Run source handlers, Site-detail implementation, authoring callbacks and sharing guards were source-inspected. They must not be represented as newly completed live-save or negative-role tests.

New verification executed: isolated participation projection probe described in G02; read-only browser interactions; product-tree SHA-256 comparison. All **404 baseline files** under `app`, `src`, `public`, and `tests` remained unchanged, with no new product files. The 28 matrix rows were mechanically counted: 8 IMPLEMENTED + 16 PARTIAL + 2 VISUAL_ONLY + 2 DEFERRED. Existing rendering/domain/repository tests and previous implementation reports were consulted as secondary evidence. No new product tests were added. Full tests, TypeScript, lint and build were **not rerun**, because this task only creates documentation and does not change product implementation. Previous pass counts are not relabeled as current audit results.

Exact-state coverage deferred: empty authorized Home, actual Draft Sample revision, 25-Wafer production branching fixture, target-not-met live result, writable governance role, scientific read-only/forbidden account, save/error/conflict transitions. These are explicit verification limits, not fabricated successful captures. No data was reset or invented to obtain them.

## Human UAT decision

**PARTIALLY READY.** Begin a facilitated UAT round on existing Studies/Runs for navigation, editable-versus-locked Plan understanding, real Actual comparison, acquired Measurement inspection, Target/Engineer interpretation, Table-first Analysis and saved-context reopen. Samples can be evaluated as fixture catalog browsing and preview UX; Studio as authorized read-only review for the current principal.

Do **not** claim full FINAL acceptance for new Study creation, persistent Sample creation/revision/inactivation, production Sample usage, branching/multi-Subject participation design, participation-aware missing counts, or the simplified Evaluation conclusion-save journey. G06 also blocks accepting Reference readiness as reliable for all supported deep links. These six P1 issues need resolution or a clearly agreed exclusion before full end-to-end acceptance.

Before accepting write or authorization scenarios, use designated writable test records and sanctioned role accounts. Preserve exact package pins, scientific evidence and current production data. This report requests no automatic fixes and makes no domain, repository, authorization, measurement/evaluation, schema or locking changes.
