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
