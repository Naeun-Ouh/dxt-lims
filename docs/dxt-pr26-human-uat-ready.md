# PR #26 release-candidate checks and Human UAT

Authority: Product/Architecture comment [7187254223](https://github.com/Naeun-Ouh/dxt-lims/pull/26#issuecomment-7187254223). Checked 2026-11-26. Features and cosmetic work frozen. This update changes only diagnostic/provisioning scripts and evidence; no `app/`, `src/`, schema or authorization changes.

**HUMAN UAT READY; Human acceptance NOT RUN. Do not merge or deploy.** Final reporting SHA is in the PR comment (avoids a self-referential commit hash). Runtime product source is `fe5c326f55e943cededd975e1f59d155faf564b8`; all 292 `app/` and `src/` files in each fresh server copy match. Subsequent reporting/harness commits do not change these files.

## Remaining Sample browser verification — AGENT only

All writes below were in the disposable AGENT environment on port59769, never an existing Human UAT database. Browser actions were followed by authoritative repository readback and reload. Sample `AGENT-BROWSER-PILOT-1126`, Sample ID `f63fe9e9-3ae6-418d-88dd-f26a256acd7e`, exact Revision1 `cd187a6c-7cf9-46f1-8b4b-bea1c5c4f432`; Revision2 also exists.

| Action | Durable observation | Result |
|---|---|---|
| Wafer Run1 Plan picker: select R1 while R2 exists, save/reload | Exact R1 retained, not latest R2 | PASS |
| Clear selection, save/reload | `sampleRevisionId=null`; no selected revision/clear action | PASS |
| Reselect R1, save/reload | Exact R1 restored explicitly | PASS |
| Link R1 in draft and create Run3 | Exact R1 persisted | PASS |
| Copy Run3 and create Run4 | R1 preserved despite available R2 | PASS |
| Copy Run4, remove Material assignment, create Run5 | No MATERIAL assignment remains | PASS |
| Copy Run5, re-add material value, create Run6, reload | New assignment has `sampleRevisionId=null`; no resurrected R1 | PASS |
| Read original Runs and Sample R1 detail/usage | Runs1/3/4 retain R1; old revision date/request unchanged; cleared Run1 usage retained as history; no Run5/6 linked usage | PASS |

Intermediate readbacks before an unconfirmed automation click completed are retained in the raw log, not interpreted as save failures. Confirmed native browser Save actions and subsequent reads establish the results above. No agent check counts as Human acceptance.

P2 deferred: an unlinked persisted null selection can show a misleading revision-unavailable message in the secondary picker. It does not recreate links or block explicit selection; no cosmetic/wording fix was made during this freeze.

## Intermittent activation test — bounded diagnosis

The original intermediate full-suite failure remains recorded: `configuration_activation_check1` in the unchanged configuration activation contract. Its original exception did not retain the failing timestamps/row; **original root cause is unconfirmed**, and a later green run does not erase it.

- Fixed budget: five independent in-memory PGlite databases, one contract execution each; all five passed. No failure-triggered retry loop. Instrumentation captured 60 activation writes and 130 active-row timestamp observations, transaction IDs, SQL/parameters, wall and monotonic clocks. Minimum observed wall-clock minus active-from was 0.040s; no negative interval observed.
- Separate negative control: after seeding an isolated database, move only that Node process's `Date.now` back one hour. PGlite realtime clock follows it. Updating activation end time reproduces SQLSTATE23514 / the same named constraint; the failed statement preserves the old active-from and null active-to. Clock restored in `finally`; no host clock or real database modified.
- This proves a clock rollback can trigger the integrity guard, **not** that it caused the original incident. No timestamp constraint, ordering invariant, production code or readiness rule was relaxed.
- Repro command for future diagnostics: `node scripts/run-activation-diagnostics.mjs`. It uses only new in-memory databases, records every iteration and exits nonzero if any fails. Do not treat repeated execution until green as acceptance.
- Residual risk: regression stability remains unresolved for configuration activation; the bounded Human Run/Sample workflow does not activate configurations. Investigate a recurrence using the preserved timestamp/transaction diagnostics before claiming the intermittent failure fixed.

## GitHub / CI

At product head `fe5c326`, GitHub reports PR26 OPEN, DRAFT, mergeable=true, merged=false. Base main `1211d1c119fa460d07a1985d87f7883b6f969556` is an ancestor (0 commits behind, 60 ahead). The prior mergeable=false observation is not current. This is conflict status, not merge permission.

Neither main nor this head has tracked `.github` workflows. Exact-head PR-triggered workflow lookup and combined status lookup return no records. **No recorded CI / not configured; do not describe this as CI PASS.** Final-head recheck is posted on PR26. No branch was merged or retargeted, and no acceptance/deployment gate was bypassed.

Prior exact-product-head evidence remains: 367 tests, native PostgreSQL18.7 contracts, TypeScript, changed-file lint and production build PASS, with the intermittent failure retained separately. This freeze follow-up ran focused diagnostics, script lint, TypeScript and diff checks; no unnecessary full regression/build cycle was repeated.

## Clean integrated Human environment

One fresh disposable PostgreSQL environment: `tmp/human-uat-integration-VktaNP`. Old UAT and AGENT databases remain intact. Provisioning seeds reference catalogs, two labeled empty Study identities and explicit grants only. Initial read-only check: **0 Runs, 0 Samples, 0 Sample Revisions, 0 Run assignments, 0 Measurement executions**. All Run/Sample/scientific inputs are for the human to enter. No Target or Next Action is auto-created.

| Persona | URL | Scope |
|---|---|---|
| Writer | http://127.0.0.1:62891/series/human-uat-pilot-wafer | Explicit Study scientific and Sample register/revise grants in this disposable environment |
| Viewer | http://127.0.0.1:62893/series/human-uat-pilot-wafer | Explicit view grants; no scientific or Sample authoring grants |
| Denied | http://127.0.0.1:62895/series/human-uat-pilot-wafer | No organization membership or Study/Sample grants |

Additional writer routes:

- [Blank Wafer Run](http://127.0.0.1:62891/runs/new?series=human-uat-pilot-wafer&from=blank)
- [Specimen Study](http://127.0.0.1:62891/series/human-uat-pilot-specimen)
- [Blank Specimen Run](http://127.0.0.1:62891/runs/new?series=human-uat-pilot-specimen&from=blank)
- [Samples](http://127.0.0.1:62891/samples)
- [Analysis](http://127.0.0.1:62891/analysis)

Personas are trusted local development identities, not SSO/production security evidence. Responsibility/creation alone does not grant scientific permissions. The two Study identities are pre-created so explicit grants can be attached; do not interpret them as a Human Study-creation PASS. A newly human-created Study will need its own explicit grants before authoring. Technical reference/organization seed IDs retain their existing fixture names but are isolated in this new database.

Read-only HTTP200 checks prove shell availability only, including for denied personas; they are **not** proof of resource access or Human permission acceptance. Scoped grants and migration checksums are captured in the companion evidence JSON. Migration016/017/018 hashes are unchanged; production application remains prohibited.

### Facilitator route (human performs every write)

1. In Samples, register a clearly labeled synthetic `HUMAN-UAT-PILOT` sample and note its Revision1. Use the existing catalog choices; enter no unverified scientific claims.
2. Open the Wafer Study → Create Run → Blank. Add objects `HUMAN-W01`, `HUMAN-W02`. Select/reorder operations from the master lookup. Set required conditions; exercise a valid numeric zero and `고정 조건` / `실험 변수`. For one operation leave the second Subject 미적용. It must not appear as Missing. For structured acquisition explicitly add the configured Measurement operation/point/parameter; process-only creation must also work.
3. Link Sample Revision1 to the applicable material assignment. Leave Target/Evaluation/Next Action absent. Select `실험 차수 생성`: invalid values must retain the draft with exact reasons; valid input opens a non-persistent review. Only `최종 생성` creates the Run. Reload Plan and confirm exact values, role, order, applicability and revision.
4. Create Sample Revision2. Copy the earlier Run: R1 remains pinned. In separate copies exercise clear, assignment removal and re-add; no old link may return without explicit selection. Reload and inspect old revision usage/history.
5. Record Actual, then Measurement on the configured path. Reload both; compare Plan vs Actual and Missing vs 미적용. Open Analysis (Table-first), select results, Save Analysis. Optionally author criteria, Evaluation, Decision and Next Action; none is a prerequisite for the exploratory Run. Preserve previous criteria/results when authoring a new revision.
6. Repeat the bounded create/readback path with Specimen. Switch KO/EN, inspect the same data. Using viewer and denied ports, verify visible reasons/read-only or denied access without changing grants. Record the exact action, expected result, actual result and route.

Do not coach button locations unless requested. Record human facts separately from agent interpretation. Acceptance states: NOT RUN / IN PROGRESS / PASS / PASS WITH FOLLOW-UP / FAIL. Stop on a potential P1, preserve inputs and evidence; do not patch silently or merge. **Current state: NOT RUN.**

## Outstanding gates

- Confirmed open product P1 in the exercised paths: **none identified**; coverage is bounded, not universal acceptance.
- Unresolved validation risk: original intermittent activation failure has no established cause. No claim of resolution.
- Human acceptance: NOT RUN, mandatory before merge. GitHub CI evidence absent, not green.
- Production migration, role/ACL validation and separate schema deployment approvals remain outstanding. No deploy performed.
- Deferred P2/P3: null-selection wording, environment badge, secondary-label density and broader visual polish. New features remain frozen.
