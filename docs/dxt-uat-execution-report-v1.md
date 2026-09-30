# DXT UAT Execution Report v1

2026-09-21 · trusted development Principal pilot · no SSO · no product code changes.

Defined **91** · Executed **84** · PASS **83** · FAIL **1** · BLOCKED **7**.

**Manual engineering-user sessions: 0.** PASS below means evidence-backed automated functional proof or agent-driven browser observation. It is not user acceptance. A BLOCKED case is defined but not counted as executed; EX-14 is an attempted environment test and counts as FAIL.

## Decision

- **CORE FUNCTIONAL READY — PARTIALLY.** PHOTO/CMP/Material lifecycle passes on fresh native PostgreSQL; original historical environment unavailable and CLN-specific onboarding absent.
- **USER ACCEPTANCE READY — PARTIALLY.** Scenario pack and reviewable UAT environment exist; human usability, membership-selection walkthrough and wide-grid keyboard tasks remain unaccepted.
- **ENTERPRISE PILOT READY — NO.** Not approved for broader live enterprise users. Controlled trusted-Principal human UAT can begin; original history/recovery and real identity/policy mapping are not accepted. SSO remains intentionally deferred; this task did not make it a prerequisite for supervised local UAT.

## Counts by domain

| Domain | Defined | Executed | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|---:|
| PHOTO | 14 | 11 | 11 | 0 | 3 |
| CMP | 9 | 9 | 9 | 0 | 0 |
| CLN | 4 | 2 | 2 | 0 | 2 |
| MAT | 10 | 10 | 10 | 0 | 0 |
| ANA | 10 | 10 | 10 | 0 | 0 |
| AUTH | 13 | 13 | 13 | 0 | 0 |
| EX | 15 | 15 | 14 | 1 | 0 |
| NAV | 3 | 3 | 3 | 0 | 0 |
| CFG | 3 | 3 | 3 | 0 | 0 |
| SHARE | 6 | 6 | 6 | 0 | 0 |
| HIST | 2 | 2 | 2 | 0 | 0 |
| HUMAN | 2 | 0 | 0 | 0 | 2 |

MAT = Material; ANA = Analysis; AUTH = Authorization; EX = Exception. NAV/CFG/SHARE/HIST/HUMAN are separately counted to avoid hiding navigation, configuration, sharing and human gaps inside technical domains. Scenario counts are not equal to the 47 focused automated tests, which may support multiple scenarios.

## Severity counts (unique findings)

| Classification | P0 | P1 | P2 | P3 | Total |
|---|---:|---:|---:|---:|---:|
| DEFECT | 0 | 1 | 0 | 0 | 1 |
| UX DEBT | 0 | 0 | 8 | 2 | 10 |
| Combined defect + UX findings | 0 | 1 | 8 | 2 | 11 |

Ten ENHANCEMENT candidates are separate and not counted as defects. Human-test unavailability is a validation gap, not an invented product defect. Repeated references to D01 do not increase the P1 count.

## Blockers and incomplete acceptance

- **PHOTO-01 BLOCKED** — No new Study authoring route in frozen scope. Existing seeded Study Setup edited (Energy 35→36); new Study creation cannot be accepted.
- **PHOTO-03 BLOCKED** — Four inherited Subjects displayed and W02 focus selected. Current Workspace actually links back to Study; a manually entered legacy /workspace route is unsupported for Run 20. Full membership editing remains unaccepted, not a proven broken link. Focus/jump is not membership selection.
- **PHOTO-14 BLOCKED** — Original PostgreSQL cluster unavailable; fresh Run 19 proof cannot substitute for original historical evidence.
- **CLN-01 BLOCKED** — No dedicated CLN Study/ready configuration in current three-Study catalog. Do not relabel CMP as CLN.
- **CLN-04 BLOCKED** — No frozen first-class Delta engine verified; calculated delta acceptance blocked; no engine added.
- **EX-14 FAIL** — pg_ctl: not a database cluster directory; essential cluster files absent. No historical data repaired or deleted.
- **HUMAN-01 BLOCKED** — No real engineering users participated. Agent/browser/API results are not human acceptance.
- **HUMAN-02 BLOCKED** — Model scaling and scope rendering tests passed; full long-history browser/human acceptance not executed.

D01 was documented before continuation. Old cluster was left untouched; a new isolated UAT cluster was seeded with existing configuration only. No scientific evidence was deleted to reset a test. No P0 was found; no dependent corrupt-data branch was continued. No code fix or unrelated feature was introduced.

## What engineers can do, and what is not yet accepted

- PHOTO: actual UI creation, Plan edit/save/reload, Actual deviation, SITE measurement, Evaluation display, Analysis charts and Saved View were exercised. Evaluation/Decision/next-Run authoring was completed through the same application HTTP boundary; unassisted human continuation is still pending.
- CMP: native HTTP lifecycle created Run 13 and 14 with separate PRE 550/POST 500 datasets. CMP Evaluation/Measurement screens were opened. It was not an all-click human workflow.
- Material: native lifecycle created Specimen Run 4 and 5; Peel Force 24 N and browser-entered Viscosity 920 cP use SUBJECT grain. MIX/COAT/CURE/TEST and formulation context persist; captured Material screens do not demand Wafer, Site or MES.
- CLN: frozen generic pre/process/post representation is supported structurally by CMP. No dedicated CLN configuration or first-class Delta result was invented. Dedicated CLN science and calculated Delta are not accepted.
- Analysis: Run-prefiltered sources, MEAN/RAW, Trend/Bar/Table, numeric-coordinate Scatter, private Saved View and restart reopen tested. RAW/DERIVED distinction additionally has fixture proof; no new preprocessing engine. Missing source / revoked-source intersection tests fail closed.
- Authorization: all requested policy personas have focused server tests. This is not real authentication or real employee access certification.

## Validation and evidence

47 focused automated tests passed: 6 repository/HTTP/PGlite contract cases + 41 model/render cases. Live native PostgreSQL 18.6 / HTTP added PHOTO 19→20, CMP 13→14, Material 4→5 lifecycle proof. Eight negative HTTP requests recorded (seven scientific/resource cases plus unknown package). Server and database restart preserved six Run snapshots, five datasets and one Saved View byte-for-byte by serialized SHA-256 comparison. Browser reopened the exact Saved View and 17.05 result.

No application source changed, therefore no unrelated full 256-test suite, TypeScript build or lint was rerun. Documentation/evidence links, scenario arithmetic and diff whitespace are checked separately. Existing repository changes were not reset or committed.

Evidence: [scenario catalog](dxt-uat-scenario-set-v1.md), [machine-readable results](evidence/uat-v1/scenario-results.json), [API tests](evidence/uat-v1/focused-api.log), [model tests](evidence/uat-v1/focused-workspace.log), [native lifecycle](evidence/uat-v1/native-lifecycle.json), [negative requests](evidence/uat-v1/exceptions.json), [restart](evidence/uat-v1/restart-after.json), [environment failure](evidence/uat-v1/environment-blocker.md).

## Final review — 23 explicit answers

1. **Scenarios defined:** 91
2. **Executed:** 84
3. **Passed:** 83
4. **Failed:** 1
5. **Blocked:** 7
6. **P0 count:** 0
7. **P1 count:** 1 (environment/recovery DEFECT)
8. **P2 count:** 8 UX DEBT; 0 product DEFECT
9. **P3 count:** 2 UX DEBT; 0 product DEFECT
10. **PHOTO intended workflow:** PARTIALLY — existing Study lifecycle proven; new Study creation, full Subject membership UI and original history remain unaccepted.
11. **CMP intended workflow:** PARTIALLY — generic lifecycle proven; full human workflow pending.
12. **CLN/pre-post representation:** PARTIALLY — separate PRE/POST and explicit evaluation supported; dedicated CLN config/Delta not provided.
13. **Material R&D intended workflow:** PARTIALLY — generic lifecycle including Specimen/Peel/Viscosity proven; human acceptance pending.
14. **Analysis v1 sufficient for acceptance scope:** PARTIALLY — frozen v1 mechanics pass; some pre/post and multi-source needs belong to v2.
15. **Analysis v2 candidates:** Join, Merge, Pivot, Calculate/Delta, prepared-data Aggregate, Grid shaping, multi-source working set, chart mapping. All ENHANCEMENT only.
16. **Authorization personas as designed:** YES within focused implemented-policy tests; real employee/browser persona acceptance pending.
17. **Scientific data-integrity defects:** NO observed in executed coverage. Original cluster unavailability does not prove or disprove old-data integrity.
18. **Authorization/data-leak defects:** NO observed in executed coverage; not a penetration test or certification.
19. **Historical Runs reproducible:** PARTIALLY — controlled old-pin tests and fresh old/next pairs pass; original historical database cannot reopen.
20. **Understandable without DXT architecture knowledge:** PARTIALLY — contextual Study/Run flow exists, but no unassisted real-user proof; technical labels and interaction debts remain.
21. **Top 10 UX debts:** U01–U10 below.
22. **Top 10 enhancements:** E01–E10 below; not implemented.
23. **Ready for broader human UAT:** PARTIALLY — supervised trusted-Principal human UAT can begin on the isolated environment; unrestricted enterprise pilot cannot.

## Top 10 UX debts

- **U01 (P2)** Trusted user is UAT Engineer while header still shows SL / Mock environment.
- **U02 (P2)** Engineering grid typography is very small at 1440×1000; sparse data leaves substantial empty space.
- **U03 (P2)** Stage tab changes did not update initial ?view=plan; reload returned to Plan.
- **U04 (P2)** Setup default persisted, but save/autosave state was not obvious during navigation.
- **U05 (P2)** New Run initially offered Previous Run despite empty Run history; user must explicitly choose Study Default.
- **U06 (P2)** SUBJECT_SUMMARY, representative, dataset and exact definition jargon requires explanation for a first-time engineer.
- **U07 (P2)** Scatter becomes available with raw numeric coordinates but initially keeps Run order; coordinate X requires another selection.
- **U08 (P3)** Jump selector disables already-visible Subjects; it can be mistaken for selection or membership editing.
- **U09 (P3)** Dataset and representative IDs are truncated; exact-source confirmation requires Inspector/tooltip discovery.
- **U10 (P2)** Actual timestamps default to 2026-09-14 rather than UAT execution date; engineer must correct both before saving.

## Top 10 enhancement candidates

- **E01 — New Study authoring.** Outside frozen entry scope; current validation uses seeded Studies.
- **E02 — Dedicated CLN onboarding/configuration.** Requires real CLN definitions and approved measurement semantics; CMP is only structural proof.
- **E03 — Join.** ANALYSIS V2 ENHANCEMENT CANDIDATE: align rows using explicit keys.
- **E04 — Merge.** ANALYSIS V2 ENHANCEMENT CANDIDATE: assemble compatible dataset rows with provenance.
- **E05 — Pivot.** ANALYSIS V2 ENHANCEMENT CANDIDATE: reshape Subject/parameter/pre/post dimensions.
- **E06 — Calculate, including pre/post Delta.** ANALYSIS V2 ENHANCEMENT CANDIDATE: explicit formula, units and lineage; no inferred subtraction.
- **E07 — Prepared-data Aggregate.** ANALYSIS V2 ENHANCEMENT CANDIDATE: grouped working-table aggregates; existing v1 MEAN/MEDIAN/MIN/MAX are already supported.
- **E08 — Grid shaping.** ANALYSIS V2 ENHANCEMENT CANDIDATE: reusable working-table column/row shaping.
- **E09 — Multi-source working set.** ANALYSIS V2 ENHANCEMENT CANDIDATE: multiple selected sources as a managed preparation context.
- **E10 — Chart mapping.** ANALYSIS V2 ENHANCEMENT CANDIDATE: explicit prepared-column-to-axis/group mapping.

## Human UAT handoff and review routes

Use the existing trusted pilot under supervision. Start participants at Home; do not coach the architecture. Ask them to identify Study/Run/stage, select scope/Subjects, preserve FIXED/VARIED, distinguish Plan/Actual and missing/zero, explain achievement versus judgment, and Preview before Create. Record clicks/time/errors and confidence using the scenario format. Run separate sessions for engineer, department viewer, specialist and configuration manager. Only human evidence can close HUMAN-01/02.

- [UAT Home](http://localhost:3200/)
- [PHOTO Run 19 Evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- [CMP Run 13 Evaluation](http://localhost:3200/series/cmp-stability/runs/13/engineering-grid?view=evaluation)
- [Material Run 4 Measurement](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=measurement)
- [Exact Saved Analysis](http://localhost:3200/analysis?savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)

Port 3200 is the isolated UAT environment. Previous 3100 is not presented as recovered. Restart/backup instructions are in the evidence README; do not delete the old data directory or treat this test cluster as a production deployment.
