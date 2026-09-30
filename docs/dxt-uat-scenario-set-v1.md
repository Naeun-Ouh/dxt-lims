# DXT UAT Scenario Set v1

Execution date: 2026-09-21 (Asia/Seoul). Frozen Production Core and Authorization Slices 1–5; trusted development Principal only. SSO intentionally deferred.

Defined **91** · Executed **84** · PASS **83** · FAIL **1** · BLOCKED **7**.

These are scenario-level results, not automated test counts. PASS means the stated automated/observed contract passed at the evidence level shown. **Zero human acceptance sessions have occurred.** A scenario with only API evidence has no usability acceptance. BLOCKED is outside the executed denominator; partial observations do not convert it to PASS.

## Strategy and scope

Waves: (1) environment/core smoke, (2) PHOTO, (3) CMP/pre-post, (4) Material, (5) Analysis v1, (6) authorization, (7) exceptions/recovery, (8) history. Existing reference definitions only. Product code was not changed. No enhancements implemented, no SSO, no Core/Auth redesign, no Analysis v2. No P0 observed; dependent original-history branch stopped at the environment failure. Other work uses an isolated UAT database.

Every finding is exactly DEFECT, UX DEBT, or ENHANCEMENT. Passing scenarios without a finding have “—”. Severity counts in the report count **unique findings**, not repetitions in dependent scenarios. P2 enhancement priority is backlog priority, not a defect count. Manual findings must not be inferred from API coverage.

## Environment and deterministic data

Original history: localhost:3100 / PostgreSQL 55437 unavailable; original cluster was not modified. See [environment blocker](evidence/uat-v1/environment-blocker.md).

Isolated UAT: [Home](http://localhost:3200/), PostgreSQL 18.6, port 55439, database `postgres`, `server-development` Principal `uat-owner` / UAT Engineer. Seeded DTS Improvement, CMP Stability and Adhesion Material Optimization using existing configuration. No new Studies falsely claimed as UI-created. Scripts are in `tmp/uat-v1/`; scientific evidence is retained in the isolated cluster, not deleted to reset tests. The workspace `tmp` directory is still a test location, **not a production durability/backup solution**.

Inputs: PHOTO W01 Energy 37 / Actual 38; Focus 1; BCD SITE S01 (X=0,Y=1) 17.05 nm. CMP Thickness PRE 550 / POST 500 nm. Material SP-01 Peel Force 24 N at FINAL and Viscosity 920 cP SUBJECT. These synthetic values test software behavior, not scientific conclusions. Unmeasured Subjects stay missing. Next iterations change a FIXED numeric condition by +1 without making it VARIED. Runtime-generated immutable IDs are recorded in evidence; command IDs are stable for retries.

Run pairs: PHOTO 19→20; CMP 13→14; Material 4→5. One Saved View: `analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8`. No raw values are copied into SavedAnalysis. Exact IDs: [lifecycle](evidence/uat-v1/native-lifecycle.json), [saved refs](evidence/uat-v1/saved-views.json), [restart snapshot](evidence/uat-v1/restart-before.json).

## Personas and policy

| Persona | Test relationship | Expected boundary |
|---|---|---|
| Responsible User | Own authorized Study/Run | Allowed scientific commands before locks |
| Responsible Department Viewer | Department membership, no scientific grants | Read allowed; scientific writes denied |
| Measurement Specialist | VIEW plus RECORD_MEASUREMENT | Measure allowed; unrelated scientific commands denied |
| Scientific Evaluator | VIEW plus AUTHOR_EVALUATION | Evaluation allowed; measurement/decision not implied |
| Decision Authority | VIEW plus AUTHOR_DECISION; NextAction grant independent | Decision and NextAction permissions remain separate |
| Part/Team Leader | Leadership of ancestor unit | Mapped non-private descendants visible; no implicit scientific write or PRIVATE bypass |
| Module Leader | Explicit managed Study–Module link | Linked non-private Study intersection only; org label alone insufficient |
| Cross-Department Collaborator | Explicit resource grant | Granted source visible; other sources hidden |
| Configuration Manager | Explicit governance scope | Only assigned definition/applicability/package governance |
| Admin | Mapped administrative role | Mapped visibility/governance; no automatic science-write or lock bypass |
| Unrelated User | No relationship/grant | No resource identity/count/list leakage; direct requests denied |

VIEW, action-specific WRITE, scientific state validation, scoped list/search/dashboard and direct API are separate checks. “My” means authorized responsible/collaborative work, not createdBy. PRIVATE leader access is not approved. Module mapping is explicit and independent of org hierarchy. All-source Saved Analysis intersection remains mandatory. Real IdP identities and organizational mapping are not accepted by these test personas.

## Evidence and execution method

- [Focused API contracts](evidence/uat-v1/focused-api.log): six test cases using isolated PGlite databases and parsed HTTP authorization boundaries; NOT native PostgreSQL evidence for all personas.
- [Focused model/render contracts](evidence/uat-v1/focused-workspace.log): 41 tests. These prove semantics/rendering, not human usability.
- [Native lifecycle](evidence/uat-v1/native-lifecycle.json) / [HTTP trace](evidence/uat-v1/http-trace.json): existing application commands over live HTTP into PostgreSQL 18.6 for all three domains.
- [Negative requests](evidence/uat-v1/exceptions.json): live HTTP error messages and status codes; invalid requests did not alter evidence.
- [Restart comparison](evidence/uat-v1/restart-after.json): full snapshot hash equality after app and PostgreSQL restart; not a backup/restore test.
- Browser evidence uses a dedicated Chrome profile and 1440×1000 viewport. No personal browser data accessed. Agent inspected representative screenshots; no real user signed off.

Harness corrections (incorrect locators, disabled Scatter before RAW, stale stage after reload, legacy convenience API instead of current preview API, reloading reasoning catalog at stage transition, configured FINAL measurement point, and missing PostgreSQL restart port) are not product defects. Final proof files show corrected execution. No harness timeout is counted as a product FAIL.

## Scenario status index

| ID | Scenario | Status | Method | Finding |
|---|---|---|---|---|
| [PHOTO-01](#photo-01) | Create Study and Study Setup | BLOCKED | Browser + scope inspection | ENHANCEMENT E01 |
| [PHOTO-02](#photo-02) | Create Run from Study Default | PASS | Browser + PostgreSQL | UX DEBT U05 |
| [PHOTO-03](#photo-03) | Select Wafer Subjects | BLOCKED | Browser partial + rendering proof | UX DEBT U08 |
| [PHOTO-04](#photo-04) | Edit Plan before evidence | PASS | Browser | UX DEBT U02 |
| [PHOTO-05](#photo-05) | Preserve FIXED / VARIED | PASS | API / native PostgreSQL | — |
| [PHOTO-06](#photo-06) | Record Actual deviation | PASS | Browser | UX DEBT U10 |
| [PHOTO-07](#photo-07) | Plan remains unchanged | PASS | API / native PostgreSQL | — |
| [PHOTO-08](#photo-08) | Record SITE Measurement | PASS | Browser + PostgreSQL | — |
| [PHOTO-09](#photo-09) | Analyze BCD | PASS | Browser | UX DEBT U09 |
| [PHOTO-10](#photo-10) | Achievement vs Engineer Evaluation | PASS | Browser read + API write | UX DEBT U06 |
| [PHOTO-11](#photo-11) | Decision and NextAction | PASS | API / native PostgreSQL | — |
| [PHOTO-12](#photo-12) | Preview then Create Next Run | PASS | API / native PostgreSQL | — |
| [PHOTO-13](#photo-13) | Changed is not VARIED | PASS | API / native PostgreSQL | — |
| [PHOTO-14](#photo-14) | Original historical PHOTO reproducibility | BLOCKED | API / native PostgreSQL | DEFECT D01 dependency |
| [CMP-01](#cmp-01) | CMP Study Setup | PASS | API / projection proof | — |
| [CMP-02](#cmp-02) | CMP Run creation | PASS | API / projection proof | — |
| [CMP-03](#cmp-03) | CMP Subjects and Plan | PASS | API / projection proof | — |
| [CMP-04](#cmp-04) | CMP Manual Actual | PASS | API / projection proof | — |
| [CMP-05](#cmp-05) | CMP PRE/POST Measurement | PASS | API / projection proof | — |
| [CMP-06](#cmp-06) | CMP Analysis | PASS | API / projection proof | — |
| [CMP-07](#cmp-07) | CMP Evaluation | PASS | API / projection proof | — |
| [CMP-08](#cmp-08) | CMP Decision and Next Run | PASS | API / projection proof | — |
| [CMP-09](#cmp-09) | CMP screen context | PASS | Browser read + API proof | — |
| [CLN-01](#cln-01) | Dedicated CLN setup | BLOCKED | API / native PostgreSQL | ENHANCEMENT E02 |
| [CLN-02](#cln-02) | Generic pre/process/post representation | PASS | API / native PostgreSQL | — |
| [CLN-03](#cln-03) | Existing comparison and evaluation | PASS | API / native PostgreSQL | — |
| [CLN-04](#cln-04) | First-class delta result | BLOCKED | API / native PostgreSQL | ENHANCEMENT E06 |
| [MAT-01](#mat-01) | Formulation and Specimens | PASS | API / projection proof | — |
| [MAT-02](#mat-02) | Mix / Coat / Cure / Test backbone | PASS | API / projection proof | — |
| [MAT-03](#mat-03) | Manual Actual without MES | PASS | API / projection proof | — |
| [MAT-04](#mat-04) | Peel Force measurement | PASS | API / projection proof | — |
| [MAT-05](#mat-05) | Viscosity measurement | PASS | Browser | — |
| [MAT-06](#mat-06) | Material Analysis | PASS | API / projection proof | — |
| [MAT-07](#mat-07) | Material Evaluation | PASS | API / projection proof | — |
| [MAT-08](#mat-08) | Material Decision / NextAction | PASS | API / projection proof | — |
| [MAT-09](#mat-09) | Material Next Run | PASS | API / projection proof | — |
| [MAT-10](#mat-10) | Material terminology | PASS | Browser | — |
| [ANA-01](#ana-01) | Run/Dataset/Parameter/Subject selection | PASS | Browser + focused proof | — |
| [ANA-02](#ana-02) | Aggregation and raw origin | PASS | Browser + focused proof | — |
| [ANA-03](#ana-03) | Trend / Bar / Table | PASS | Browser + focused proof | — |
| [ANA-04](#ana-04) | Numeric-coordinate Scatter | PASS | Browser + focused proof | UX DEBT U07 |
| [ANA-05](#ana-05) | Save exact Analysis context | PASS | Browser + focused proof | — |
| [ANA-06](#ana-06) | Restart/reopen Saved View | PASS | Browser + focused proof | — |
| [ANA-07](#ana-07) | Missing source | PASS | Focused automated proof | — |
| [ANA-08](#ana-08) | Unauthorized source | PASS | Focused automated proof | — |
| [ANA-09](#ana-09) | RAW != DERIVED | PASS | Focused automated proof | — |
| [ANA-10](#ana-10) | Analysis Inspector and scroll | PASS | Browser + focused proof | UX DEBT U09 |
| [AUTH-01](#auth-01) | Responsible User | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-02](#auth-02) | Responsible Department Viewer | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-03](#auth-03) | Measurement Specialist | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-04](#auth-04) | Scientific Evaluator | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-05](#auth-05) | Decision Authority | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-06](#auth-06) | Part/Team Leader | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-07](#auth-07) | Module Leader | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-08](#auth-08) | Cross-Department Collaborator | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-09](#auth-09) | Configuration Manager | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-10](#auth-10) | Admin | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-11](#auth-11) | Unrelated User | PASS | PGlite + parsed HTTP policy contracts | — |
| [AUTH-12](#auth-12) | Permission yes / state no | PASS | API / native PostgreSQL | — |
| [AUTH-13](#auth-13) | Permission no / state yes | PASS | API / native PostgreSQL | — |
| [EX-01](#ex-01) | Missing Study | PASS | API / focused proof | — |
| [EX-02](#ex-02) | Missing Run | PASS | API / focused proof | — |
| [EX-03](#ex-03) | Missing Configuration | PASS | API / focused proof | — |
| [EX-04](#ex-04) | ACTIVE but not READY | PASS | API / focused proof | — |
| [EX-05](#ex-05) | Missing Measurement source | PASS | API / focused proof | — |
| [EX-06](#ex-06) | Missing Saved Analysis | PASS | API / focused proof | — |
| [EX-07](#ex-07) | Unauthorized resource | PASS | API / focused proof | — |
| [EX-08](#ex-08) | Plan locked | PASS | API / focused proof | — |
| [EX-09](#ex-09) | Stale optimistic version | PASS | API / focused proof | — |
| [EX-10](#ex-10) | Duplicate retry | PASS | API / focused proof | — |
| [EX-11](#ex-11) | Invalid Subject | PASS | API / focused proof | — |
| [EX-12](#ex-12) | Invalid Site | PASS | API / focused proof | — |
| [EX-13](#ex-13) | Invalid Parameter | PASS | API / focused proof | — |
| [EX-14](#ex-14) | Original environment reopen | FAIL | Environment probe | DEFECT D01 |
| [EX-15](#ex-15) | Fresh app/DB restart | PASS | Native PostgreSQL + server restart + browser | — |
| [NAV-01](#nav-01) | Home → lifecycle navigation | PASS | Browser | UX DEBT U03 |
| [NAV-02](#nav-02) | Authorized dashboard counts | PASS | Browser owner + persona API | UX DEBT U01 |
| [NAV-03](#nav-03) | Study Setup save feedback | PASS | Browser | UX DEBT U04 |
| [CFG-01](#cfg-01) | Normal Study user vs Configuration Manager | PASS | API / native PostgreSQL | — |
| [CFG-02](#cfg-02) | Version creation and activation | PASS | API / native PostgreSQL | — |
| [CFG-03](#cfg-03) | Study package selection and readiness | PASS | API / native PostgreSQL | — |
| [SHARE-01](#share-01) | Owner | PASS | API / native PostgreSQL | — |
| [SHARE-02](#share-02) | Shared Viewer | PASS | API / native PostgreSQL | — |
| [SHARE-03](#share-03) | Unauthorized Viewer | PASS | API / native PostgreSQL | — |
| [SHARE-04](#share-04) | Source access revoked | PASS | API / native PostgreSQL | — |
| [SHARE-05](#share-05) | Cross-department collaborator | PASS | API / native PostgreSQL | — |
| [SHARE-06](#share-06) | Admin | PASS | API / native PostgreSQL | — |
| [HIST-01](#hist-01) | Older version semantics in controlled tests | PASS | API / native PostgreSQL | — |
| [HIST-02](#hist-02) | Fresh UAT source versus next iteration | PASS | API / native PostgreSQL | — |
| [HUMAN-01](#human-01) | Unassisted engineer acceptance | BLOCKED | MANUAL USER ACCEPTANCE — not executed | — |
| [HUMAN-02](#human-02) | Long-history and keyboard usability | BLOCKED | MANUAL USER ACCEPTANCE — not executed | — |

## Stable manual execution format

For a later human session, copy each scenario; retain the ID and expected result, record participant/date/environment, replace Actual/Status and capture clicks/time/errors. Do not overwrite this automated execution record. Preconditions: seeded exact Study package is READY, intended persona provisioned, source evidence from preceding accepted steps present. API-only steps must be performed through the UI by a human before usability PASS. Click counts below count purposeful button/cell activations; fills/select changes are stated separately. Harness retries, reloads and direct route navigation are not silently counted as human clicks.

<a id="photo-01"></a>
### PHOTO-01 — Create Study and Study Setup

- **Purpose:** Create Study and Study Setup.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Home → create a new Study → open Setup → save defaults.
- **Expected result:** A new Study with reusable Setup is available.
- **Actual result:** No new Study authoring route in frozen scope. Existing seeded Study Setup edited (Energy 35→36); new Study creation cannot be accepted.
- **Status:** **BLOCKED**; method: Browser + scope inspection.
- **Finding classification / severity:** ENHANCEMENT E01 / P2.
- **Evidence:** [photo-setup.txt](evidence/uat-v1/photo-setup.txt).
- **UX — clicks:** 2 navigation clicks; creation unavailable. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

<a id="photo-02"></a>
### PHOTO-02 — Create Run from Study Default

- **Purpose:** Create Run from Study Default.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Existing DTS Study → New Run → Study Default → Review Inheritance → Create Run & Open Plan.
- **Expected result:** Run inherits exact Setup defaults and package pin.
- **Actual result:** Run 19 created; Energy 36, Focus 0, D035 Rev.2, EXP-R01, RET-01.
- **Status:** **PASS**; method: Browser + PostgreSQL.
- **Finding classification / severity:** UX DEBT U05 / P2.
- **Evidence:** [photo-run-entry.txt](evidence/uat-v1/photo-run-entry.txt); [photo-preview.png](evidence/uat-v1/photo-preview.png); [photo-plan.txt](evidence/uat-v1/photo-plan.txt).
- **UX — clicks:** 4 from Setup. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-03"></a>
### PHOTO-03 — Select Wafer Subjects

- **Purpose:** Select Wafer Subjects.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Before evidence, enter Scope selection; choose W01–W04; confirm; reopen membership.
- **Expected result:** Selected Wafer membership survives without changing assignments.
- **Actual result:** Four inherited Subjects displayed and W02 focus selected. Current Workspace actually links back to Study; a manually entered legacy /workspace route is unsupported for Run 20. Full membership editing remains unaccepted, not a proven broken link. Focus/jump is not membership selection.
- **Status:** **BLOCKED**; method: Browser partial + rendering proof.
- **Finding classification / severity:** UX DEBT U08 / P3.
- **Evidence:** [photo-plan.txt](evidence/uat-v1/photo-plan.txt); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** 1 cell click; membership path unmeasured. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

<a id="photo-04"></a>
### PHOTO-04 — Edit Plan before evidence

- **Purpose:** Edit Plan before evidence.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Set W01 Energy 37; set common Focus 1; Save Plan; reload.
- **Expected result:** Edits persist before execution.
- **Actual result:** 37 and 1 read back after reload.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** UX DEBT U02 / P2.
- **Evidence:** [photo-plan-saved.png](evidence/uat-v1/photo-plan-saved.png).
- **UX — clicks:** 1 Save; 2 fills; Tab/reload; cell-selection click excluded. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-05"></a>
### PHOTO-05 — Preserve FIXED / VARIED

- **Purpose:** Preserve FIXED / VARIED.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Inspect Energy and Focus roles before and after editing and next iteration.
- **Expected result:** Values changing do not redefine intent.
- **Actual result:** Energy remains VARIED; Focus remains FIXED.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [photo-plan.txt](evidence/uat-v1/photo-plan.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-06"></a>
### PHOTO-06 — Record Actual deviation

- **Purpose:** Record Actual deviation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Actual → EXPOSURE/W01 → Energy override 38 → enter timestamps → Save Actual.
- **Expected result:** Actual 38 compares against Plan 37.
- **Actual result:** Deviation persisted with one process execution.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** UX DEBT U10 / P2.
- **Evidence:** [photo-actual.txt](evidence/uat-v1/photo-actual.txt); [photo-actual.png](evidence/uat-v1/photo-actual.png).
- **UX — clicks:** 2 button clicks + 2 selector changes + 3 fills. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-07"></a>
### PHOTO-07 — Plan remains unchanged

- **Purpose:** Plan remains unchanged.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Reopen Plan after Actual; compare saved snapshot; attempt edit/save.
- **Expected result:** Plan unchanged and scientifically locked.
- **Actual result:** Snapshot unchanged; save rejected 409 with explicit lock message.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-08"></a>
### PHOTO-08 — Record SITE Measurement

- **Purpose:** Record SITE Measurement.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Measurement → BCD/W01 → SITE → S01, X=0,Y=1 → 17.05 → Save.
- **Expected result:** Site result belongs to W01/Run/Operation; not experiment Position.
- **Actual result:** SITE BCD 17.05 nm saved with exact parent and coordinates.
- **Status:** **PASS**; method: Browser + PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [photo-measurement.txt](evidence/uat-v1/photo-measurement.txt); [photo-measurement.png](evidence/uat-v1/photo-measurement.png); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** 2 button clicks + grain selection + 4 fills. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-09"></a>
### PHOTO-09 — Analyze BCD

- **Purpose:** Analyze BCD.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Evaluation → Analyze → Trend/Bar/Table → inspect results.
- **Expected result:** Existing BCD shown; missing Subjects remain missing.
- **Actual result:** 17.05 plotted; three Subjects missing, not zero.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** UX DEBT U09 / P3.
- **Evidence:** [analysis-saved.txt](evidence/uat-v1/analysis-saved.txt); [analysis-bar.txt](evidence/uat-v1/analysis-bar.txt); [analysis-table.txt](evidence/uat-v1/analysis-table.txt).
- **UX — clicks:** 1 navigation + 3 chart selections. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-10"></a>
### PHOTO-10 — Achievement vs Engineer Evaluation

- **Purpose:** Achievement vs Engineer Evaluation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Open Evaluation before judgment; record ACCEPT and rationale; reopen.
- **Expected result:** Calculated target result stays distinct from user judgment.
- **Actual result:** Initially ACHIEVED/Not reviewed; after API authoring ACHIEVED/Engineer Accept.
- **Status:** **PASS**; method: Browser read + API write.
- **Finding classification / severity:** UX DEBT U06 / P2.
- **Evidence:** [photo-evaluation.txt](evidence/uat-v1/photo-evaluation.txt); [photo-evaluation.png](evidence/uat-v1/photo-evaluation.png); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** 1 stage click; authoring N/A. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-11"></a>
### PHOTO-11 — Decision and NextAction

- **Purpose:** Decision and NextAction.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Record controlled-continuation decision, reason and Design Next Experiment; reopen.
- **Expected result:** Decision explains why; NextAction identifies action; no implicit Run creation.
- **Actual result:** Saved independent IDs and action shown in selected reasoning context.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [photo-evaluation.txt](evidence/uat-v1/photo-evaluation.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-12"></a>
### PHOTO-12 — Preview then Create Next Run

- **Purpose:** Preview then Create Next Run.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Save continuation; verify preview identity absent; create once; retry same command.
- **Expected result:** Preview creates nothing; retry creates no duplicate.
- **Actual result:** Preview GET 404; Run 20 created once; exact retry returns Run 20.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-13"></a>
### PHOTO-13 — Changed is not VARIED

- **Purpose:** Changed is not VARIED.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Propose numeric FIXED change; create next Run; inspect role and old Run.
- **Expected result:** Changed FIXED value remains FIXED; source unchanged.
- **Actual result:** Focus increment remained FIXED; source snapshot comparison passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="photo-14"></a>
### PHOTO-14 — Original historical PHOTO reproducibility

- **Purpose:** Original historical PHOTO reproducibility.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Reopen pre-UAT Run 18/older Setup/package/reasoning pins in original database.
- **Expected result:** Original evidence remains interpretable.
- **Actual result:** Original PostgreSQL cluster unavailable; fresh Run 19 proof cannot substitute for original historical evidence.
- **Status:** **BLOCKED**; method: API / native PostgreSQL.
- **Finding classification / severity:** DEFECT D01 dependency / P1.
- **Evidence:** [environment-blocker.md](evidence/uat-v1/environment-blocker.md).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

<a id="cmp-01"></a>
### CMP-01 — CMP Study Setup

- **Purpose:** CMP Study Setup.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Load CMP Stability Setup and exact pin.
- **Expected result:** CMP context only.
- **Actual result:** Existing CMP Setup used through generic repository.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-02"></a>
### CMP-02 — CMP Run creation

- **Purpose:** CMP Run creation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Preview Study Default; create Run.
- **Expected result:** Own CMP Run, no PHOTO toggle.
- **Actual result:** Run 13 created independently.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-03"></a>
### CMP-03 — CMP Subjects and Plan

- **Purpose:** CMP Subjects and Plan.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Read Subjects, THK PRE/M2 CU CMP/THK POST and assignments.
- **Expected result:** Wafer identities and CMP configuration retained.
- **Actual result:** Four Subjects; generic backbone and exact CMP package.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-04"></a>
### CMP-04 — CMP Manual Actual

- **Purpose:** CMP Manual Actual.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Record process execution on first Subject.
- **Expected result:** Execution independent from Plan.
- **Actual result:** COMPLETED execution persisted; Plan unchanged.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-05"></a>
### CMP-05 — CMP PRE/POST Measurement

- **Purpose:** CMP PRE/POST Measurement.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Record thickness PRE 550 and POST 500.
- **Expected result:** Separate MeasurementExecutions and datasets.
- **Actual result:** Distinct PRE/POST datasets; same Subject lineage.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-06"></a>
### CMP-06 — CMP Analysis

- **Purpose:** CMP Analysis.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Project CMP measurements through shared Analysis model.
- **Expected result:** Shared component and lineage, no CMP special case.
- **Actual result:** Existing projection tests pass; live PRE/POST datasets available.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-07"></a>
### CMP-07 — CMP Evaluation

- **Purpose:** CMP Evaluation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Evaluate POST Thickness against 495–505.
- **Expected result:** POST achievement separate from judgment.
- **Actual result:** 500 ACHIEVED and explicit ACCEPT; PRE not substituted.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-08"></a>
### CMP-08 — CMP Decision and Next Run

- **Purpose:** CMP Decision and Next Run.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Save continuation and create/retry next Run.
- **Expected result:** Independent next Run with inherited exact context.
- **Actual result:** Run 14 created, source unchanged and FIXED intent preserved.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cmp-09"></a>
### CMP-09 — CMP screen context

- **Purpose:** CMP screen context.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Open Run 13 Evaluation and Measurement.
- **Expected result:** CMP-specific options and current Study/Run visible.
- **Actual result:** THK PRE/THK POST; DTS/Thickness; no PHOTO equipment selector mixing observed.
- **Status:** **PASS**; method: Browser read + API proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [cmp-stability-measurement.txt](evidence/uat-v1/cmp-stability-measurement.txt); [cmp-stability-evaluation.txt](evidence/uat-v1/cmp-stability-evaluation.txt); [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cln-01"></a>
### CLN-01 — Dedicated CLN setup

- **Purpose:** Dedicated CLN setup.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Select a configured CLN Study and create Run.
- **Expected result:** CLN-specific approved process and measurement definitions.
- **Actual result:** No dedicated CLN Study/ready configuration in current three-Study catalog. Do not relabel CMP as CLN.
- **Status:** **BLOCKED**; method: API / native PostgreSQL.
- **Finding classification / severity:** ENHANCEMENT E02 / P2.
- **Evidence:** [seed.log](evidence/uat-v1/seed.log); [home.txt](evidence/uat-v1/home.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

<a id="cln-02"></a>
### CLN-02 — Generic pre/process/post representation

- **Purpose:** Generic pre/process/post representation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Use current CMP THK PRE → process → THK POST as structural proof.
- **Expected result:** Independent pre/post results retain process context.
- **Actual result:** 550/500 stored separately; structure supported. This is not CLN scientific acceptance.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cln-03"></a>
### CLN-03 — Existing comparison and evaluation

- **Purpose:** Existing comparison and evaluation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Inspect two datasets and evaluate explicit POST target; compare PRE manually.
- **Expected result:** Comparison does not overwrite raw data or invent delta result.
- **Actual result:** Distinct dataset lineage and 500 POST assessment preserved; no derived delta persisted.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cln-04"></a>
### CLN-04 — First-class delta result

- **Purpose:** First-class delta result.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Request stored POST−PRE result with formula and lineage.
- **Expected result:** If unsupported, leave original results unchanged and log v2 need.
- **Actual result:** No frozen first-class Delta engine verified; calculated delta acceptance blocked; no engine added.
- **Status:** **BLOCKED**; method: API / native PostgreSQL.
- **Finding classification / severity:** ENHANCEMENT E06 / P2.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

<a id="mat-01"></a>
### MAT-01 — Formulation and Specimens

- **Purpose:** Formulation and Specimens.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Load Adhesion Study defaults and create Run.
- **Expected result:** Formulation and Specimen are distinct references.
- **Actual result:** Run 4; SP-01–SP-04; formulation preserved.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-02"></a>
### MAT-02 — Mix / Coat / Cure / Test backbone

- **Purpose:** Mix / Coat / Cure / Test backbone.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Inspect material operation sequence and parameter applicability.
- **Expected result:** Generic Operations represent material work.
- **Actual result:** MIX, COAT, CURE, TEST preserved in live snapshot.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-03"></a>
### MAT-03 — Manual Actual without MES

- **Purpose:** Manual Actual without MES.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Record first process execution manually.
- **Expected result:** No MES identity dependency.
- **Actual result:** Actual persisted using SubjectRef only.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-04"></a>
### MAT-04 — Peel Force measurement

- **Purpose:** Peel Force measurement.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Record 24 N for SP-01 at FINAL, SUBJECT grain.
- **Expected result:** No Site required.
- **Actual result:** 24 N persisted; siteIdentity null.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-05"></a>
### MAT-05 — Viscosity measurement

- **Purpose:** Viscosity measurement.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Open TEST → Viscosity → 920 → Save.
- **Expected result:** Existing experiment viscosity parameter usable without material-property conflation.
- **Actual result:** 920 cP SUBJECT result saved separately from Peel Force.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** — / —.
- **Evidence:** [material-viscosity.txt](evidence/uat-v1/material-viscosity.txt); [material-viscosity.png](evidence/uat-v1/material-viscosity.png).
- **UX — clicks:** 1 Save + 1 selector + 1 fill, after route opened. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-06"></a>
### MAT-06 — Material Analysis

- **Purpose:** Material Analysis.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Project Specimen evidence through common Analysis component.
- **Expected result:** Same model as wafer; no forced wafer/site mapping.
- **Actual result:** Generic subject Analysis and fresh lifecycle tests passed.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-07"></a>
### MAT-07 — Material Evaluation

- **Purpose:** Material Evaluation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Assess Peel Force target and record independent judgment.
- **Expected result:** System vs engineer distinction retained.
- **Actual result:** 24 N ACHIEVED; ACCEPT saved.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-08"></a>
### MAT-08 — Material Decision / NextAction

- **Purpose:** Material Decision / NextAction.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Save controlled-continuation decision and action.
- **Expected result:** Distinct decision and action with evidence refs.
- **Actual result:** Decision linked to exact Evaluation and representative result.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-09"></a>
### MAT-09 — Material Next Run

- **Purpose:** Material Next Run.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create next Run and retry same command.
- **Expected result:** Source unchanged; no duplicate.
- **Actual result:** Run 5 created; Run 4 unchanged at creation.
- **Status:** **PASS**; method: API / projection proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="mat-10"></a>
### MAT-10 — Material terminology

- **Purpose:** Material terminology.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Open Material Evaluation and Measurement.
- **Expected result:** Specimen labels; no Wafer/Site/MES requirement.
- **Actual result:** SP-01–SP-04 and MATERIAL R&D; SUBJECT only; no Wafer text in captured body.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [adhesion-material-optimization-evaluation.txt](evidence/uat-v1/adhesion-material-optimization-evaluation.txt); [adhesion-material-optimization-measurement.txt](evidence/uat-v1/adhesion-material-optimization-measurement.txt).
- **UX — clicks:** N/A. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-01"></a>
### ANA-01 — Run/Dataset/Parameter/Subject selection

- **Purpose:** Run/Dataset/Parameter/Subject selection.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Enter Analyze from Run 19; inspect filters; query selected IDs.
- **Expected result:** Only selected source context.
- **Actual result:** Run 19, one Dataset, BCD, four Subjects preserved.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [analysis-saved.txt](evidence/uat-v1/analysis-saved.txt); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** 1 Analyze. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-02"></a>
### ANA-02 — Aggregation and raw origin

- **Purpose:** Aggregation and raw origin.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Switch MEAN to RAW; inspect source refs.
- **Expected result:** RAW values and existing summaries retain exact provenance.
- **Actual result:** MEAN representative vs RAW observation references differ correctly.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [analysis-saved.txt](evidence/uat-v1/analysis-saved.txt); [analysis-scatter.txt](evidence/uat-v1/analysis-scatter.txt); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** 1 selector change. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-03"></a>
### ANA-03 — Trend / Bar / Table

- **Purpose:** Trend / Bar / Table.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Select the three modes using same measurement selection.
- **Expected result:** Same source values across views.
- **Actual result:** 17.05 and missing Subjects retained in captured modes.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [analysis-saved.txt](evidence/uat-v1/analysis-saved.txt); [analysis-bar.txt](evidence/uat-v1/analysis-bar.txt); [analysis-table.txt](evidence/uat-v1/analysis-table.txt).
- **UX — clicks:** 3 chart clicks. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-04"></a>
### ANA-04 — Numeric-coordinate Scatter

- **Purpose:** Numeric-coordinate Scatter.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Verify disabled Scatter on summary without coords; select RAW then coordinate X.
- **Expected result:** Scatter only usable with numeric coordinate evidence.
- **Actual result:** Summary disabled; RAW exposes Chip X/Y; selected Chip X renders. Default Run order still needs explicit correction.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** UX DEBT U07 / P2.
- **Evidence:** [analysis-scatter.txt](evidence/uat-v1/analysis-scatter.txt); [analysis-scatter.png](evidence/uat-v1/analysis-scatter.png).
- **UX — clicks:** 1 aggregation + 1 Scatter + 1 X selector. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-05"></a>
### ANA-05 — Save exact Analysis context

- **Purpose:** Save exact Analysis context.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Save named private view; inspect stored record.
- **Expected result:** Exact dataset/result references, no copied values.
- **Actual result:** One named Saved View persists exact reference configuration.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [saved-views.json](evidence/uat-v1/saved-views.json); [analysis-saved.png](evidence/uat-v1/analysis-saved.png).
- **UX — clicks:** 2 buttons + name fill. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-06"></a>
### ANA-06 — Restart/reopen Saved View

- **Purpose:** Restart/reopen Saved View.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Restart application and PostgreSQL; open saved URL.
- **Expected result:** Same exact sources and values.
- **Actual result:** Data hash unchanged; exact saved URL reopens 17.05.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [restart-after.json](evidence/uat-v1/restart-after.json); [reopened-analysis.txt](evidence/uat-v1/reopened-analysis.txt).
- **UX — clicks:** 0 clicks; URL navigation. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-07"></a>
### ANA-07 — Missing source

- **Purpose:** Missing source.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Submit Saved View with missing Dataset/Parameter/representative; inspect missing display.
- **Expected result:** Fail closed, no substitute latest/zero.
- **Actual result:** Missing exact sources rejected by sharing contract; empty/missing projection tested.
- **Status:** **PASS**; method: Focused automated proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-08"></a>
### ANA-08 — Unauthorized source

- **Purpose:** Unauthorized source.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Revoke one source from multi-source Saved View and query/list.
- **Expected result:** Entire view denied without partial leaked values.
- **Actual result:** Direct API/list fail closed with full-source intersection.
- **Status:** **PASS**; method: Focused automated proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-09"></a>
### ANA-09 — RAW != DERIVED

- **Purpose:** RAW != DERIVED.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Inspect source/derived projection and references.
- **Expected result:** Origin and lineage never silently merged.
- **Actual result:** Fixture projection/provenance tests passed; no fresh derived authoring implied.
- **Status:** **PASS**; method: Focused automated proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ana-10"></a>
### ANA-10 — Analysis Inspector and scroll

- **Purpose:** Analysis Inspector and scroll.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Inspect exact refs; scroll table right/left twice at 1440×1000.
- **Expected result:** Context reachable and no obvious visual clipping.
- **Actual result:** Inspector opened exact Dataset/Execution/representative IDs; scroll positions 18→0→18→0 at 1062px viewport/1080px table. Long-history/25-Subject usability remains pending.
- **Status:** **PASS**; method: Browser + focused proof.
- **Finding classification / severity:** UX DEBT U09 / P3.
- **Evidence:** [analysis-scroll.png](evidence/uat-v1/analysis-scroll.png); [analysis-inspector.txt](evidence/uat-v1/analysis-inspector.txt); [scroll-observation.json](evidence/uat-v1/scroll-observation.json).
- **UX — clicks:** 1 Inspector click; 4 scripted horizontal scrolls. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-01"></a>
### AUTH-01 — Responsible User

- **Purpose:** Responsible User.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Own authorized Study/Run; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Allowed scientific commands before locks
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-02"></a>
### AUTH-02 — Responsible Department Viewer

- **Purpose:** Responsible Department Viewer.
- **Persona:** Responsible Department Viewer.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Department membership, no scientific grants; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Read allowed; scientific writes denied
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-03"></a>
### AUTH-03 — Measurement Specialist

- **Purpose:** Measurement Specialist.
- **Persona:** Measurement Specialist.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** VIEW plus RECORD_MEASUREMENT; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Measure allowed; unrelated scientific commands denied
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-04"></a>
### AUTH-04 — Scientific Evaluator

- **Purpose:** Scientific Evaluator.
- **Persona:** Scientific Evaluator.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** VIEW plus AUTHOR_EVALUATION; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Evaluation allowed; measurement/decision not implied
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-05"></a>
### AUTH-05 — Decision Authority

- **Purpose:** Decision Authority.
- **Persona:** Decision Authority.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** VIEW plus AUTHOR_DECISION; NextAction grant independent; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Decision and NextAction permissions remain separate
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-06"></a>
### AUTH-06 — Part/Team Leader

- **Purpose:** Part/Team Leader.
- **Persona:** Part/Team Leader.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Leadership of ancestor unit; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Mapped non-private descendants visible; no implicit scientific write or PRIVATE bypass
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-07"></a>
### AUTH-07 — Module Leader

- **Purpose:** Module Leader.
- **Persona:** Module Leader.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Explicit managed Study–Module link; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Linked non-private Study intersection only; org label alone insufficient
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-08"></a>
### AUTH-08 — Cross-Department Collaborator

- **Purpose:** Cross-Department Collaborator.
- **Persona:** Cross-Department Collaborator.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Explicit resource grant; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Granted source visible; other sources hidden
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-09"></a>
### AUTH-09 — Configuration Manager

- **Purpose:** Configuration Manager.
- **Persona:** Configuration Manager.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Explicit governance scope; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Only assigned definition/applicability/package governance
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-10"></a>
### AUTH-10 — Admin

- **Purpose:** Admin.
- **Persona:** Admin.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Mapped administrative role; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** Mapped visibility/governance; no automatic science-write or lock bypass
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-11"></a>
### AUTH-11 — Unrelated User

- **Purpose:** Unrelated User.
- **Persona:** Unrelated User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** No relationship/grant; request list/search/dashboard, direct reads, allowed and forbidden commands.
- **Expected result:** No resource identity/count/list leakage; direct requests denied
- **Actual result:** Focused server-boundary contracts passed for implemented persona policy. Browser role-switch and real-person acceptance not executed.
- **Status:** **PASS**; method: PGlite + parsed HTTP policy contracts.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-12"></a>
### AUTH-12 — Permission yes / state no

- **Purpose:** Permission yes / state no.
- **Persona:** Responsible User / Admin.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Grant scientific action; record evidence; retry locked/invalid scientific write as authorized user/Admin.
- **Expected result:** Scientific validation rejects despite grant.
- **Actual result:** Plan/Actual locks reject; Admin explicit grant does not bypass locks.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log); [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="auth-13"></a>
### AUTH-13 — Permission no / state yes

- **Purpose:** Permission no / state yes.
- **Persona:** Responsible Department Viewer.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Attempt authoring against scientifically valid state with viewer principal.
- **Expected result:** Denied before mutation.
- **Actual result:** Forged header/actor and unauthorized scientific commands rejected.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-01"></a>
### EX-01 — Missing Study

- **Purpose:** Missing Study.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Open/request an unknown Study.
- **Expected result:** Clear unavailable/error, no fixture fallback.
- **Actual result:** API unknown slug 400 Invalid repository request; recovery wording remains technical.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-02"></a>
### EX-02 — Missing Run

- **Purpose:** Missing Run.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Request unknown Run ID.
- **Expected result:** 404 concealment; no substitute Run.
- **Actual result:** 404 Resource unavailable or access denied.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-03"></a>
### EX-03 — Missing Configuration

- **Purpose:** Missing Configuration.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Resolve nonexistent exact package in creation/setup.
- **Expected result:** Fail closed; no latest fallback.
- **Actual result:** Unknown exact package denied 403 with no fallback; readiness/adoption tests cover invalid context.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [missing-configuration.json](evidence/uat-v1/missing-configuration.json); [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-04"></a>
### EX-04 — ACTIVE but not READY

- **Purpose:** ACTIVE but not READY.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Activate package without reasoning readiness; attempt Run creation.
- **Expected result:** Activation alone cannot enable lifecycle.
- **Actual result:** Explicit readiness and confirmed reasoning required in frozen closure tests.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-05"></a>
### EX-05 — Missing Measurement source

- **Purpose:** Missing Measurement source.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Query invalid Dataset/source for saved analysis.
- **Expected result:** Reject missing exact references.
- **Actual result:** Missing source reference permutations rejected.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-06"></a>
### EX-06 — Missing Saved Analysis

- **Purpose:** Missing Saved Analysis.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Open unknown saved view ID.
- **Expected result:** Unavailable; do not render default results first.
- **Actual result:** 404; exact entry rendering test prevents fallback.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json); [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-07"></a>
### EX-07 — Unauthorized resource

- **Purpose:** Unauthorized resource.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Request hidden Study/Run/view and inspect counts.
- **Expected result:** No existence leakage.
- **Actual result:** Scoped SQL and all-source contracts passed.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-08"></a>
### EX-08 — Plan locked

- **Purpose:** Plan locked.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Save Plan after Actual exists.
- **Expected result:** Reject and preserve snapshot.
- **Actual result:** 409 explicit Plan locked message.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-09"></a>
### EX-09 — Stale optimistic version

- **Purpose:** Stale optimistic version.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Save old planning version / stale creation fingerprint.
- **Expected result:** Conflict; no silent overwrite.
- **Actual result:** Focused planning and closure tests rejected stale writes.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-10"></a>
### EX-10 — Duplicate retry

- **Purpose:** Duplicate retry.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Retry exact Next Run command.
- **Expected result:** One new Run.
- **Actual result:** Same Run ID returned in all three domains.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-11"></a>
### EX-11 — Invalid Subject

- **Purpose:** Invalid Subject.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Submit value referencing Subject outside Run.
- **Expected result:** Reject membership mismatch.
- **Actual result:** 409 Parameter/Unit/Subject incompatible.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-12"></a>
### EX-12 — Invalid Site

- **Purpose:** Invalid Site.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Submit SUBJECT value containing fabricated Site.
- **Expected result:** Reject Site/Subject mismatch.
- **Actual result:** 409 fake Site or coordinates.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-13"></a>
### EX-13 — Invalid Parameter

- **Purpose:** Invalid Parameter.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Submit unresolved Parameter reference.
- **Expected result:** Reject exact reference mismatch.
- **Actual result:** 409 incompatible exact Dataset.
- **Status:** **PASS**; method: API / focused proof.
- **Finding classification / severity:** — / —.
- **Evidence:** [exceptions.json](evidence/uat-v1/exceptions.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-14"></a>
### EX-14 — Original environment reopen

- **Purpose:** Original environment reopen.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Start prior cluster at /private/tmp/dxt-slice-browser/data.
- **Expected result:** Historical database starts and remains accessible.
- **Actual result:** pg_ctl: not a database cluster directory; essential cluster files absent. No historical data repaired or deleted.
- **Status:** **FAIL**; method: Environment probe.
- **Finding classification / severity:** DEFECT D01 / P1.
- **Evidence:** [environment-blocker.md](evidence/uat-v1/environment-blocker.md).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="ex-15"></a>
### EX-15 — Fresh app/DB restart

- **Purpose:** Fresh app/DB restart.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Record hashes; stop/restart isolated server and PostgreSQL; reopen.
- **Expected result:** All persisted IDs and contents unchanged.
- **Actual result:** Six Runs, five datasets and one Saved View hash unchanged; UI reopened.
- **Status:** **PASS**; method: Native PostgreSQL + server restart + browser.
- **Finding classification / severity:** — / —.
- **Evidence:** [restart-before.json](evidence/uat-v1/restart-before.json); [restart-after.json](evidence/uat-v1/restart-after.json); [reopened-analysis.png](evidence/uat-v1/reopened-analysis.png).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="nav-01"></a>
### NAV-01 — Home → lifecycle navigation

- **Purpose:** Home → lifecycle navigation.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Home → DTS Study → Setup → Run → Plan → Actual → Measurement → Evaluation → Analysis.
- **Expected result:** Study/Run/stage remain visible with relevant next action.
- **Actual result:** Browser path traversed; labels present. Stage tabs do not update initial ?view=plan, so reload returned to Plan.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** UX DEBT U03 / P2.
- **Evidence:** [home.txt](evidence/uat-v1/home.txt); [photo-setup.txt](evidence/uat-v1/photo-setup.txt); [photo-evaluation.txt](evidence/uat-v1/photo-evaluation.txt); [analysis-saved.txt](evidence/uat-v1/analysis-saved.txt).
- **UX — clicks:** Observed per-step counts above; uninterrupted human click total not measured. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="nav-02"></a>
### NAV-02 — Authorized dashboard counts

- **Purpose:** Authorized dashboard counts.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Inspect Continue/Recent/Calendar and filtered counts for owner/leader/area/module/collaborator.
- **Expected result:** Only authorized sources contribute before aggregation.
- **Actual result:** Live owner: six Runs; scoped SQL contracts confirm hidden sources excluded.
- **Status:** **PASS**; method: Browser owner + persona API.
- **Finding classification / severity:** UX DEBT U01 / P2.
- **Evidence:** [home.txt](evidence/uat-v1/home.txt); [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="nav-03"></a>
### NAV-03 — Study Setup save feedback

- **Purpose:** Study Setup save feedback.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Edit Energy default; leave Setup and create from it.
- **Expected result:** Persisted default usable and save status understandable.
- **Actual result:** 36 inherited; persistence correct, automatic-save affordance not obvious.
- **Status:** **PASS**; method: Browser.
- **Finding classification / severity:** UX DEBT U04 / P2.
- **Evidence:** [photo-setup.txt](evidence/uat-v1/photo-setup.txt); [photo-plan.txt](evidence/uat-v1/photo-plan.txt).
- **UX — clicks:** 1 fill + Tab + navigation. Navigation: Study/Run context visible in captured screen; labels/density/next action: assess linked findings; error: no additional error beyond Actual; Inspector: not fully exercised; grid: captured narrow four-Subject layout; horizontal scrolling: only ANA-10 exercised; keyboard: field entry/Tab only, no full shortcut acceptance.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cfg-01"></a>
### CFG-01 — Normal Study user vs Configuration Manager

- **Purpose:** Normal Study user vs Configuration Manager.
- **Persona:** Responsible User / Configuration Manager.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Read Reference Studio configuration; attempt definition/applicability/package changes as both personas.
- **Expected result:** Read access does not grant management; manager limited to scope.
- **Actual result:** Scoped governance direct API tests pass; human Studio walkthrough pending.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cfg-02"></a>
### CFG-02 — Version creation and activation

- **Purpose:** Version creation and activation.
- **Persona:** Configuration Manager.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create revisions/rules/package, validate/activate, inspect prior Run pins.
- **Expected result:** Immutable versions and historical pins unchanged.
- **Actual result:** Focused governance/adoption contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="cfg-03"></a>
### CFG-03 — Study package selection and readiness

- **Purpose:** Study package selection and readiness.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Select exact package; inspect ACTIVE status separately from reasoning readiness.
- **Expected result:** Only READY exact configuration authorizes complete lifecycle.
- **Actual result:** Existing PHOTO v1 is INACTIVE but Ready; new-package readiness contract tested.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [photo-setup.txt](evidence/uat-v1/photo-setup.txt); [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="share-01"></a>
### SHARE-01 — Owner

- **Purpose:** Owner.
- **Persona:** Owner.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create/share view; query/list/write using persona; check source grants unchanged.
- **Expected result:** Owner with all sources may read/edit/share within ceiling
- **Actual result:** Focused Saved Analysis ownership, recipient, revocation, cross-source and admin contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="share-02"></a>
### SHARE-02 — Shared Viewer

- **Purpose:** Shared Viewer.
- **Persona:** Shared Viewer.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create/share view; query/list/write using persona; check source grants unchanged.
- **Expected result:** Audience plus all sources required
- **Actual result:** Focused Saved Analysis ownership, recipient, revocation, cross-source and admin contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="share-03"></a>
### SHARE-03 — Unauthorized Viewer

- **Purpose:** Unauthorized Viewer.
- **Persona:** Unauthorized Viewer.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create/share view; query/list/write using persona; check source grants unchanged.
- **Expected result:** Audience alone grants no source access
- **Actual result:** Focused Saved Analysis ownership, recipient, revocation, cross-source and admin contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="share-04"></a>
### SHARE-04 — Source access revoked

- **Purpose:** Source access revoked.
- **Persona:** Source access revoked.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create/share view; query/list/write using persona; check source grants unchanged.
- **Expected result:** Entire saved view becomes unavailable
- **Actual result:** Focused Saved Analysis ownership, recipient, revocation, cross-source and admin contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="share-05"></a>
### SHARE-05 — Cross-department collaborator

- **Purpose:** Cross-department collaborator.
- **Persona:** Cross-department collaborator.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create/share view; query/list/write using persona; check source grants unchanged.
- **Expected result:** Explicit audience and every source grant required
- **Actual result:** Focused Saved Analysis ownership, recipient, revocation, cross-source and admin contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="share-06"></a>
### SHARE-06 — Admin

- **Purpose:** Admin.
- **Persona:** Admin.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create/share view; query/list/write using persona; check source grants unchanged.
- **Expected result:** Mapped administration does not propagate scientific grants
- **Actual result:** Focused Saved Analysis ownership, recipient, revocation, cross-source and admin contracts passed.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="hist-01"></a>
### HIST-01 — Older version semantics in controlled tests

- **Purpose:** Older version semantics in controlled tests.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create old Run; change Setup/package/definition/reasoning; reopen old exact pins.
- **Expected result:** Old meaning unchanged; no newest-version substitution.
- **Actual result:** Controlled adoption/historical-pin contracts pass. This does not recover original database.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-api.log](evidence/uat-v1/focused-api.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="hist-02"></a>
### HIST-02 — Fresh UAT source versus next iteration

- **Purpose:** Fresh UAT source versus next iteration.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Create next Run after FIXED change; compare source and restart hashes.
- **Expected result:** Old Run and exact source refs unchanged.
- **Actual result:** All three old/new pairs preserved and restart hash matched.
- **Status:** **PASS**; method: API / native PostgreSQL.
- **Finding classification / severity:** — / —.
- **Evidence:** [native-lifecycle.json](evidence/uat-v1/native-lifecycle.json); [restart-after.json](evidence/uat-v1/restart-after.json).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. No product change made for this scenario.

<a id="human-01"></a>
### HUMAN-01 — Unassisted engineer acceptance

- **Purpose:** Unassisted engineer acceptance.
- **Persona:** Real engineering participants.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Recruit PHOTO, CMP, Material and viewer/governance users; execute assigned scenarios without architecture coaching; record timing/confidence/errors.
- **Expected result:** Engineers complete work correctly and explain result/decision distinctions.
- **Actual result:** No real engineering users participated. Agent/browser/API results are not human acceptance.
- **Status:** **BLOCKED**; method: MANUAL USER ACCEPTANCE — not executed.
- **Finding classification / severity:** — / —.
- **Evidence:** execution report.
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

<a id="human-02"></a>
### HUMAN-02 — Long-history and keyboard usability

- **Purpose:** Long-history and keyboard usability.
- **Persona:** Responsible User.
- **Preconditions:** Common environment/persona prerequisites above; relevant predecessor evidence available. Original-history scenarios require the original database; human scenarios require a real participant.
- **Test data:** Domain-specific inputs and exact IDs in the linked evidence; no substituted latest package or invented CLN definition.
- **Steps:** Use 100+ Operations and 25 Subjects; keyboard edit and horizontal/vertical scroll; open Inspector.
- **Expected result:** No clipping, reachable confirmation, understandable focus and efficient editing.
- **Actual result:** Model scaling and scope rendering tests passed; full long-history browser/human acceptance not executed.
- **Status:** **BLOCKED**; method: MANUAL USER ACCEPTANCE — not executed.
- **Finding classification / severity:** — / —.
- **Evidence:** [focused-workspace.log](evidence/uat-v1/focused-workspace.log).
- **UX — clicks:** N/A. Navigation/label clarity/density/error wording/next action/Inspector/grid/horizontal scrolling/keyboard: N/A for API/model proof; all require manual execution. Error message itself is recorded where applicable.
- **Notes:** Automated evidence is not human acceptance. Preserve old evidence and stop dependent writes if a P0 is encountered. This scenario remains open; do not count the partial work as a pass.

## Findings — DEFECT

**D01 · P1 · Environment/recovery · OPEN.** Original temporary PostgreSQL data directory lacks essential cluster files and cannot start. Reproduction, scope and workaround are in [environment-blocker.md](evidence/uat-v1/environment-blocker.md). This blocks original-history UAT, not evidence that the current application corrupted data. No minimal application correction was justified; isolated UAT environment only. No P0 or authorization leak observed in executed coverage.

## Top 10 UX debts

| ID | Severity | Observation | Evidence |
|---|---|---|---|
| U01 | P2 | Trusted user is UAT Engineer while header still shows SL / Mock environment. | home.png; saved-views.json |
| U02 | P2 | Engineering grid typography is very small at 1440×1000; sparse data leaves substantial empty space. | photo-plan.png |
| U03 | P2 | Stage tab changes did not update initial ?view=plan; reload returned to Plan. | photo-evaluation.txt; photo-plan.txt |
| U04 | P2 | Setup default persisted, but save/autosave state was not obvious during navigation. | photo-setup.txt |
| U05 | P2 | New Run initially offered Previous Run despite empty Run history; user must explicitly choose Study Default. | photo-run-entry.txt |
| U06 | P2 | SUBJECT_SUMMARY, representative, dataset and exact definition jargon requires explanation for a first-time engineer. | photo-evaluation.png |
| U07 | P2 | Scatter becomes available with raw numeric coordinates but initially keeps Run order; coordinate X requires another selection. | analysis-scatter.txt |
| U08 | P3 | Jump selector disables already-visible Subjects; it can be mistaken for selection or membership editing. | photo-plan.txt |
| U09 | P3 | Dataset and representative IDs are truncated; exact-source confirmation requires Inspector/tooltip discovery. | analysis-saved.png |
| U10 | P2 | Actual timestamps default to 2026-09-14 rather than UAT execution date; engineer must correct both before saving. | src/features/run-registration/actual-execution-grid.tsx:310; photo-actual.txt |

All ten remain backlog; no UI redesign or fixes. These are agent observations, pending confirmation by real users.

## Top 10 enhancements / Analysis v2 observation log

- **E01 — New Study authoring:** Outside frozen entry scope; current validation uses seeded Studies.
- **E02 — Dedicated CLN onboarding/configuration:** Requires real CLN definitions and approved measurement semantics; CMP is only structural proof.
- **E03 — Join:** ANALYSIS V2 ENHANCEMENT CANDIDATE: align rows using explicit keys.
- **E04 — Merge:** ANALYSIS V2 ENHANCEMENT CANDIDATE: assemble compatible dataset rows with provenance.
- **E05 — Pivot:** ANALYSIS V2 ENHANCEMENT CANDIDATE: reshape Subject/parameter/pre/post dimensions.
- **E06 — Calculate, including pre/post Delta:** ANALYSIS V2 ENHANCEMENT CANDIDATE: explicit formula, units and lineage; no inferred subtraction.
- **E07 — Prepared-data Aggregate:** ANALYSIS V2 ENHANCEMENT CANDIDATE: grouped working-table aggregates; existing v1 MEAN/MEDIAN/MIN/MAX are already supported.
- **E08 — Grid shaping:** ANALYSIS V2 ENHANCEMENT CANDIDATE: reusable working-table column/row shaping.
- **E09 — Multi-source working set:** ANALYSIS V2 ENHANCEMENT CANDIDATE: multiple selected sources as a managed preparation context.
- **E10 — Chart mapping:** ANALYSIS V2 ENHANCEMENT CANDIDATE: explicit prepared-column-to-axis/group mapping.

E03–E10 are reviewer-generated candidates from the requested workflow, not reported requests from human participants. They are all classified ENHANCEMENT; none implemented. E06 is the concrete pre/post gap; current v1 can display independent PRE/POST evidence and evaluate an explicitly selected result.

## Authorization findings

No authorization/data-leak defect observed in focused tests. Personae are deterministic server-side fixtures; no browser login switching, SSO, directory sync, session revocation or real employee mapping tested. Native PostgreSQL lifecycle was run as one trusted owner; broader persona policy proof uses PGlite/parsed HTTP. These limits prevent enterprise identity acceptance.
