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

**Runtime implementation and automated checks PASS. Browser verification is BLOCKED, not passed. Human acceptance is NOT RUN.** The Mac is locked and CUA automatic unlock failed; the user has been asked to unlock it. No alternate browser-control path was used to bypass this condition. KO/EN UI implementations exist, but layout, editable controls, dialog interaction and locale switching still require browser verification before claiming complete end-to-end acceptance.

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

- No unresolved **confirmed runtime P1 defect** remains in the exercised contracts. Browser verification is an unresolved validation blocker; UI completeness/KO–EN layout is not asserted.
- Unlock Mac, then run bounded browser checks on these new routes: editable form submission, exact revision picker/clear, Plan lock, historic interpretation display, locale switch and denied controls. Human acceptance remains a separate gate.
- Production migration rollout and environment-specific trusted server roles/ACL census remain unapproved and unperformed. The current owner-backed development server is not evidence of a production least-privilege deployment; focused restricted-role contracts are reported separately.
- Sample and reasoning deployment gates remain separate. `PropertyDefinitionId` is persisted under the existing property aggregate, not an authoritative master-binding claim. Supplier/material identity is not invented.
- Creation currently records explicit ABSENT. Criteria may be authored/adopted after Run creation; no pre-creation criteria picker is claimed. Legacy UNKNOWN_LEGACY is never guessed or backfilled.
- P2/P3 visual polish and broader Sample property-master integration remain follow-up work. No existing UAT data, live permission or historical scientific record was modified.

Machine-readable checked statuses, routes, source attestation and final SQL hashes: `docs/dxt-runtime-integration-evidence.json`.
