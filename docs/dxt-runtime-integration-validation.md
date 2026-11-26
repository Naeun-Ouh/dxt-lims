# DXT runtime integration — agent evidence and bounded Human UAT

Authority: PR22 comment7181024719, PR17 comment7181025200, Issue1 comment7181025756. Both schema directions are approved for disposable development implementation. Production deployment and Human acceptance remain separate.

## Integrated scope

PR12 Run Draft + PR21 explicit scientific authority + PR19 generic Actual/Measurement + PR20 non-applicability + PR18 material usage, followed by shared authority016, reasoning017 and Sample018. Local branch integration is not a GitHub PR merge. The root working checkout and existing UAT databases are preserved.

## Migration and authorization boundary

Migration order is `016_shared_scientific_authority` → `017_run_reasoning_provenance` → `018_sample_lifecycle`. The shared prerequisite is independently reviewable in [PR #23](https://github.com/Naeun-Ouh/dxt-lims/pull/23), commit `9b570f228aad1cd1a0ec4c96f9b03ebfba829ce7`. Sample and reasoning approvals remain separate; ordering does not combine their production rollout gates.

The migration runner refuses new lifecycle migrations without `DXT_SCHEMA_STAGE=disposable-development`. The disposable harness creates a new empty PostgreSQL cluster, ignores inherited application database variables, records exact SQL checksums, and provisions only labeled agent principals and explicit grants. Existing UAT clusters and permissions are not used.

The trusted server resolves the principal. Request bodies cannot choose their author or gain privileges from Study responsibility. No production role provisioning or deployment is performed. Final evidence distinguishes database-owner test execution from any separately verified restricted-role contracts.

## Required agent verification

| Boundary | Required evidence |
|---|---|
| Shared authority | All nine explicit actions, creator/responsibility/admin restrictions, active/principal/unit scope, revoked/expired/null denial |
| Sample register/revise | Actual UI and authoritative readback; full graph validation; immutable old revision; idempotency/CAS; KO/EN; denied writes |
| Sample usage | Exact selected revision, copy/rewrite persistence; clear/remove/re-add never resurrects history; no-read users cannot see exact linked Sample metadata; Plan lock |
| Criteria | Optional after Run creation; author/revise/adopt exact context; no automatic Target or Study-derived Run context |
| Interpretation | Measurement→Evaluation→Decision→Next Action; stale context rejection; old retries and historical criteria remain exact |
| Persistence | Reload and independent connection readback; transactional rollback on invalid input; no partial durable state |
| Complete stack | Full repository suite, native PostgreSQL, TypeScript, changed-file lint, build, browser KO/EN |

Only explicitly labeled disposable AGENT fixtures are used. Agent actions and screenshots do not constitute Human acceptance.

## Bounded Human UAT (after agent verification)

Human acceptance starts **NOT RUN**. A human should use the fresh development routes documented with the final evidence:

1. Create a Sample and inspect its recorded revision, composition and properties; append a new revision and confirm the old revision remains readable.
2. Create an exploratory Run with no Target/Evaluation/Next Action. Select an exact Sample revision on a material assignment, create the Run, reload, and inspect usage.
3. On an unlocked disposable Plan, clear/remove/re-add the assignment. Confirm that a previous Sample selection is not silently restored. Copy a Run and check the exact revision rather than latest.
4. Record Actual and Measurement. Optionally author/select criteria, evaluate a measured result and save a Decision/Next Action. Confirm historic evaluation criteria remain unchanged after an explicit later criteria selection.
5. Switch KO/EN and repeat the key navigation/readback steps. With the separately scoped read-only environment, confirm protected actions are unavailable with an understandable reason.

Record exact route, locale, action, observed result and confusion separately from interpretation. Report defects before changing scope. No Human PASS or PR merge is inferred from automated results.

## Final automated result — 2026-11-26

**Initial verification snapshot (superseded by the follow-up below): runtime automated checks PASS; browser BLOCKED; Human acceptance NOT RUN.** The Mac is locked and CUA automatic unlock failed; the user has been asked to unlock it. No alternate browser-control path was used to bypass this condition. KO/EN UI implementations exist, but layout, editable controls, dialog interaction and locale switching still require browser verification before claiming complete end-to-end acceptance.

| Check | Result | Evidence |
|---|---|---|
| Full repository regression | 365/365 PASS | `tmp/runtime-final-head-tests.log` |
| Native PostgreSQL integration, restart/readback, explicit permissions, criteria provenance | PASS, PostgreSQL 18.7 | `tmp/runtime-final-native.log` |
| Focused native Sample lifecycle | 14/14 PASS | `docs/implementation/issue-9/runtime.md` |
| All tracked TypeScript, including final HTTP scripts | PASS | `tmp/runtime-final-tracked-tsc.log` |
| Changed runtime/test/script lint and diff checks | PASS | Workstream validation plus final script checks |
| Production build | PASS | `tmp/runtime-final-build.log` |
| Sample HTTP registration/revision/readback/retry, viewer/denied access, four initial criteria-free Runs | 26 checked HTTP responses PASS | Committed evidence JSON |
| Specimen + Wafer Actual → Measurement → criteria → Evaluation → Decision/Hold → criteria revision → historical readback | PASS; 44 responses in final verification pass | Committed evidence JSON |
| Nine canonical route HTTP availability checks | HTTP 200 | This verifies serving, **not** hydrated browser behavior |
| Browser KO/EN and human acceptance | BLOCKED / NOT RUN | Mac lock, no acceptance inferred |

The native criteria-role denial test uses one transaction connection with savepoints. A pooled `SET ROLE` test was corrected because session settings cannot safely span pooled connections. Legacy Wafer test fixtures lacked required CHIPINDEX_X/Y reference pins; tests now first prove NOT_READY and then complete those exact references in their own new databases. No measurement values/defaults or readiness bypass were introduced. The full suite includes the final product source; later edits are test scripts and reporting only.

TypeScript validation enumerated **all tracked TS/TSX/MTS files**, preserving the project's compiler options. The raw project glob also scans ignored disposable server copies under `tmp/`; those deliberately preserved older copies contain incomplete historical test harness files and are excluded from the tracked-source check. No tracked product/test file was excluded. Final HTTP scripts also passed typed lint.

The first Specimen HTTP scenario durably completed, then a verifier assertion read historical provenance from the wrong response object. The verifier was corrected to read record-owned provenance; the completed scenario was independently reloaded successfully. The final pass created the complete Wafer scenario and rechecked Specimen historical records. This was a verifier correction, not a falsely claimed successful first attempt.

## Reviewable commits and PRs

| Boundary | PR | Exact head |
|---|---|---|
| Shared scientific authority | #23 | `9b570f228aad1cd1a0ec4c96f9b03ebfba829ce7` |
| Sample runtime | #24 | `0ac41121876584f09a880422afad7f27da2e9202` |
| Criteria/interpretation runtime | #25 | `0d3bfe3db7e7c18654913ef58a199b3aaa928edd` |
| Integrated regression adaptation | integration branch | `523f237e5f2f62396fc08f67f4a80acf5565b685` |
| Final network verifier | integration branch | `ec0ba85ce2c9076dff936c885195868e0e437483` |

#24 and #25 target `codex/runtime-prerequisites` at `d1aa2dfcf5a7b3e30d538d4d7b69653cced82123` so each new runtime remains independently reviewable. The consolidated integration branch targets main as a draft and contains the unmerged prior stacks. No GitHub PR has been merged. The final reporting commit is recorded in the GitHub consolidation comment to avoid a self-referential document hash.

## Final SQL SHA256 — confirmed against disposable database ledger

| Migration | SHA256 |
|---|---|
| 016 shared scientific authority | `76e93d9ca79116275c01dc1332aa2230473098e5afe6dbadd77e45256646398e` |
| 017 Run reasoning provenance | `a90513c006937884bb8b7b7727cedfd1f2f620ad9974de8ecfbc1e8a31e9eae7` |
| 018 Sample lifecycle | `2b173988476e802ebb0f204e48c49c748712530eef5a80b5116ea74240253326` |

All three ledger entries equal the current SQL file bytes. Earlier failed or superseded AGENT clusters are preserved for diagnostics and are not final evidence. The active environment is `tmp/agent-integration-cJ4BZZ`, newly created from empty PostgreSQL. Its seed metadata originally recorded source HEAD `7015887`; the exact fixture repair was then committed as `855f64f`. The active server's 292 `app/` and `src/` files were byte-compared with `ec0ba85`: zero differences. This distinguishes provisioning metadata from the actually verified runtime source.

## Working local routes

These are **AGENT TEST ONLY**, not existing Human UAT acceptance environments. Numeric values are labeled synthetic contract inputs, not scientific evidence. All screens share the existing KO/EN header locale switch.

- Writer catalog/registration: http://127.0.0.1:59769/samples (registration is an inline form, not a `/samples/new` route).
- Sample exact original revision: http://127.0.0.1:59769/samples/2dc69ade-64c3-4618-a993-f86aee1bef4f/revisions/1
- Sample latest revision: http://127.0.0.1:59769/samples/2dc69ade-64c3-4618-a993-f86aee1bef4f
- Specimen exploratory Run, no criteria: http://127.0.0.1:59769/series/agent-integration-specimen/runs/1/engineering-grid?view=plan
- Wafer exploratory Run, no criteria: http://127.0.0.1:59769/series/agent-integration-wafer/runs/1/engineering-grid?view=plan
- Specimen interpreted Run with retained historic criteria: http://127.0.0.1:59769/series/agent-integration-specimen/runs/2/engineering-grid?view=evaluation
- Wafer interpreted Run with retained historic criteria: http://127.0.0.1:59769/series/agent-integration-wafer/runs/2/engineering-grid?view=evaluation
- Actual/Measurement: use the same Run2 routes with `view=actual` or `view=measurement`.
- Analysis: http://127.0.0.1:59769/analysis
- Read-only principal: http://127.0.0.1:59772/samples and the identical Run paths on port59772.
- Denied principal: http://127.0.0.1:59773/samples and the identical Run paths on port59773. Protected details return404 without disclosing existence; attempted writes return403.

## Remaining gates and deferred scope

- The browser-discovered Evaluation navigation blocker is fixed and regression-covered. No unresolved confirmed P1 remains in the exercised paths; this is not a claim of complete product or Human acceptance.
- The Mac lock is resolved. Bounded browser checks are recorded below. Exact revision picker/clear and the full Human UAT matrix remain separate acceptance work; they were not manually exercised in this follow-up.
- Production migration rollout and environment-specific trusted server roles/ACL census remain unapproved and unperformed. The current owner-backed development server is not evidence of a production least-privilege deployment; focused restricted-role contracts are reported separately.
- Sample and reasoning deployment gates remain separate. `PropertyDefinitionId` is persisted under the existing property aggregate, not an authoritative master-binding claim. Supplier/material identity is not invented.
- Creation currently records explicit ABSENT. Criteria may be authored/adopted after Run creation; no pre-creation criteria picker is claimed. Legacy UNKNOWN_LEGACY is never guessed or backfilled.
- P2/P3 visual polish and broader Sample property-master integration remain follow-up work. No existing UAT data, live permission or historical scientific record was modified.

Machine-readable checked statuses, routes, source attestation and final SQL hashes: `docs/dxt-runtime-integration-evidence.json`.


## Approved-policy follow-up — 2026-11-26

Authority: latest explicit user approval and Issue #1 frontend minimum-policy comment7181556471. Retained the approved prospective `SUBJECT_FIRST_V1` implementation from PR12 commit `2e1a1b2fa28255fb02b92509aef8c9582fe4d6cc`: Subject value/role precedence, common fallback, zero validity, order independence, legacy interpretation preservation, copy disclosure, effective Actual Recipe and exact reference validation. No resolver, schema, authorization or historical data changes were needed in this follow-up.

### Minimal corrections

- Persisted Run Evaluation navigation previously required already-loaded measurement/Target bindings. Actual/Measurement load stages do not load those bindings, so the tab stayed disabled even with existing criteria; criteria-free Runs also could not reach optional criteria authoring. Production navigation now opens the Evaluation workspace independently. Existing permission checks, evidence prerequisites and save boundaries remain unchanged. Fixture-only navigation retains its existing gate.
- Sample registration/revision controls now reuse existing DXT border/background/primary-action tokens. Server validation paths are converted to KO/EN visible field labels; the Effective date field exposes invalid state. No new layout framework or design refactor.

### Bounded AGENT browser evidence (not Human acceptance)

All actions used only the newly provisioned AGENT database on ports59769/59772/59773. No existing Human UAT environment, live grant or production migration was touched.

| Check | Observation |
|---|---|
| Sample registration, KO | Created `AGENT-BROWSER-PILOT-1126`, ID `f63fe9e9-3ae6-418d-88dd-f26a256acd7e`, through the form; persisted Revision1 readback. |
| Sample revision, EN | Created Revision2 with request `AGENT-BROWSER-REV2`; reloaded persisted date/request. Revision1 still shows its original date and absent request. No properties/scientific values invented. |
| Form input automation limitation | Initial datetime `fill` changed the displayed DOM value without updating React state; save returned validation and preserved inputs. A native keyboard event updated state and the form saved. Recorded as an automation limitation, not Human usability evidence. |
| Specimen historical interpretation | Run2 displays current criteria Revision2 plus original Revision1 Evaluation and Decision/Hold in history. |
| Wafer Actual/Measurement | Actual Recipe `EXP-R01` matches Plan; Focus `0` remains valid. Measurement BCD `0 nm` reloaded; second Subject is N/A rather than Missing. |
| Evaluation navigation regression | Actual → Measurement → Evaluation works after fix. Criteria-free Specimen Run1 Plan → Evaluation opens optional criteria UI and explains that execution/Measurement remain available. No criteria were created for this Run. |
| Read-only principal | Sample Create Revision disabled with explicit reason; Evaluation criteria controls and Save Evaluation disabled; read-only message visible. |
| Denied principal | Sample detail exposes no Sample information; localized unavailable/no-access message and Retry only. |
| Analysis | Table-first, Save Analysis label, value0 vs N/A rows, result-selected right Inspector, KO/EN locale switch. |
| 1440×900 viewport | Evaluated EN Evaluation and KO Analysis screenshots; visible layout has no severe clipping/overlap. This is a bounded check, not a full responsive-screen audit. Viewport restored afterward. |

The writer app and both permission variants received only changed frontend files from this branch. Existing AGENT HTTP proof remains valid for backend workflows; browser actions above supplement rather than replace it. Human acceptance remains **NOT RUN**.

### Validation and remaining work

Final outcomes are in the machine-readable evidence under `approvedPolicyFollowup`. Logs: `tmp/pilot-followup-tests.log`, `tmp/pilot-followup-native.log`, `tmp/pilot-followup-types.log`, `tmp/pilot-followup-lint.log`, `tmp/pilot-followup-build.log`.

One intermediate full run hit `configuration_activation_check1` (activation interval constraint) in an unchanged PGlite configuration contract. The isolated contract rerun passed; the failure log is retained as `tmp/pilot-followup-tests-prior-failure.log`. No timestamp constraint was weakened and no unrelated configuration code was changed. Root cause is not established; retain this as a regression stability follow-up even if the final full rerun passes.

Deferred: environment badge still says Mock environment on the disposable PostgreSQL UI; some criteria labels/secondary controls need wording/visual polish. These do not bypass authorization or affect persistence. No P2/P3 redesign was performed. Exact Sample picker/clear browser coverage and Human acceptance remain required before claiming full UI acceptance. Production migration gates stay separate and all PRs remain unmerged.
