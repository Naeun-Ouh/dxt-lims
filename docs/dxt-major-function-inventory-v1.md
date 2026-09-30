# DXT Major Function Inventory v1

Audit date: **2026-09-26 KST**. Scope: current working tree, PostgreSQL UAT at `localhost:3200`, with DXT Production Core v1 frozen. This is a decision document, not a new freeze sign-off. No product, Domain, persistence, authorization or UI code was changed in this audit. No scientific save/create/activation/share command was executed.

Evidence is labeled **source inspection**, **live read-only UI**, or **pure local probe**. Prior freeze/UAT reports are historical context, not fresh proof. The audit is broad but does not claim exhaustive runtime testing of every role, route, dataset shape, conflict or every individual string. Authenticated enterprise deployment, load and penetration testing are outside this review.

## Classification rules

**IMPLEMENTED** means an identifiable current code path/owner exists for the defined function, not a claim that every operational case passed. **PARTIAL** means advertised behavior has a gap or restricted scope. **NOT IMPLEMENTED** is availability, not automatically a frozen-v1 defect. **INTENTIONALLY DEFERRED** is outside the frozen scope. F01–F23 refer to the logic audit.

## 1. Configuration / Reference

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Definition revision creation and exact resolution | IMPLEMENTED | [src/infrastructure/postgres/postgres-configuration-authoring.ts:44](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-configuration-authoring.ts:44) | Immutable create commands; existing payload not edited in place. |
| Applicability versions and context resolver | IMPLEMENTED | [src/features/reference-studio/applicability-view.tsx:444](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/reference-studio/applicability-view.tsx:444) | Definition/Operation/Equipment context; immutable rules; wording debt F18. |
| Package draft / assembly / validation / atomic activation/deactivation | IMPLEMENTED | [src/infrastructure/postgres/postgres-configuration-authoring.ts:44](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-configuration-authoring.ts:44) | Exact versions and transaction; ACTIVE separate from READY. |
| General scientific readiness/target authoring for a brand-new Study | PARTIAL | [src/infrastructure/postgres/reasoning-context.ts:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/reasoning-context.ts:6) | Registered proposal adoption exists; no unrestricted scientific context editor. |
| Approval workflow / signatures / enterprise import/export | INTENTIONALLY DEFERRED | [src/infrastructure/postgres/postgres-configuration-authoring.ts:44](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-configuration-authoring.ts:44) | Explicitly outside frozen v1; not missing v1. |

## 2. Study

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Read Study, overview and runs | IMPLEMENTED | [src/infrastructure/postgres/postgres-repositories.ts:141](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-repositories.ts:141) | Repository-backed registered Studies. |
| Create arbitrary new Study | NOT IMPLEMENTED | [src/application/repository-ports.ts:33](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/repository-ports.ts:33) | No creation port/UI; accepted pilot uses registered Studies, PO scope decision F10. |
| Default value/reference editing and item selection | PARTIAL | [src/features/experiment-series/study-setup-workspace.tsx:73](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/study-setup-workspace.tsx:73) | Production saves exist; concurrent auto-save issue F07. |
| Select exact package for future Runs | IMPLEMENTED | [src/features/experiment-series/study-setup-workspace.tsx:73](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/study-setup-workspace.tsx:73) | Historical Runs unaffected. |
| Confirm exact Study/package reasoning readiness | IMPLEMENTED | [src/infrastructure/postgres/reasoning-context.ts:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/reasoning-context.ts:6) | Explicit proposal confirmation, immutable context; no automatic copying. |

## 3. Run creation

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Study Default / Previous / Existing / Blank source commit | IMPLEMENTED | [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11) | Repository preview fingerprint, explicit commit and number allocation. |
| Arbitrary Study identifier onboarding | PARTIAL | [src/application/run-creation.ts:5](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/run-creation.ts:5) | Three Study allowlist limits otherwise shared mechanism. |
| Full inherited Plan, independent identity, exact source provenance | IMPLEMENTED | [src/infrastructure/postgres/postgres-repositories.ts:141](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-repositories.ts:141) | New Run does not carry previous execution/measurement. |

## 4. Plan

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Existing assignment values and FIXED/VARIED editing | IMPLEMENTED | [src/features/run-registration/engineering-grid.tsx:193](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/engineering-grid.tsx:193) | Exact applicability and server validation; explicit Save Plan. |
| Operation scope selection and Subject subset | IMPLEMENTED | [src/features/run-registration/grid-plan-context.ts:1](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/grid-plan-context.ts:1) | Persisted scope restored; selection mode separate from normal editor. |
| View Focus / expand / key-column collapse | IMPLEMENTED | [src/features/run-registration/engineering-grid.tsx:193](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/engineering-grid.tsx:193) | View-only focus can operate while Plan is locked. |
| Branch/rejoin participation display | IMPLEMENTED | [src/features/run-registration/grid-plan-context.ts:1](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/grid-plan-context.ts:1) | Uses existing Subject→Operation membership; N/A is not missing. |
| General route/Operation/Position authoring from Blank | NOT IMPLEMENTED | [src/features/run-registration/engineering-grid.tsx:193](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/engineering-grid.tsx:193) | Known frozen limit; no new routing editor or Position↔Site mapping implied. |
| Historical and concurrent Plan lock | IMPLEMENTED | [src/infrastructure/postgres/plan-lock.ts:3](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/plan-lock.ts:3) | Evidence guard includes old/superseded history, not just current display. |

## 5. Actual

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Manual execution status/time and actual override commit | PARTIAL | [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301) | Production persistence exists; historical defaults F05 and auto-filled values F12. |
| Plan vs Actual comparison, missing/difference filters | IMPLEMENTED | [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301) | No Plan rewrite or automatic VARIED inference. |
| Subject/Operation-aware selection usability | PARTIAL | [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301) | Server membership check; selectors insufficient F13. |
| Live MES/other source integration, multi-attempt routing authoring | INTENTIONALLY DEFERRED | [src/features/run-registration/legacy-semiconductor-execution-adapter.ts:1](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/legacy-semiconductor-execution-adapter.ts:1) | Adapter/provenance abstraction exists, no enterprise live integration delivered. |

## 6. Measurement

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Manual Subject/Site observation and exact parameter/unit | IMPLEMENTED | [src/features/run-registration/measurement-execution-grid.tsx:154](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/measurement-execution-grid.tsx:154) | New immutable acquisition records, no Sample-property storage. |
| Process execution association | PARTIAL | [src/features/run-registration/lifecycle-authoring.ts:245](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/lifecycle-authoring.ts:245) | Subject-only first-event selection F04. |
| Validity and derived lineage repository structures | IMPLEMENTED | [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) | Separate from raw immutable values; preservation/query path inspected. |
| Full production validity editor / batch ingestion / preparation workbench | INTENTIONALLY DEFERRED | [src/features/data-preparation/workspace.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/data-preparation/workspace.tsx:11) | Do not count old local prototype as durable implementation. |
| Select repeated result for evaluation | PARTIAL | [src/features/run-registration/evaluation-grid-model.ts:102](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-grid-model.ts:102) | First match rather than explicit scientific selection F03. |

## 7. Analysis

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Repository-backed selection/filter/table and numeric aggregates | IMPLEMENTED | [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) | Read-only thin projection; missing values stay null. |
| Trend / Bar / Scatter and axis/group controls | PARTIAL | [src/features/analysis/workspace.tsx:277](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/workspace.tsx:277) | F06: group unused, categorical X ordinal fallback, mixed-unit visual ambiguity. |
| Cross-Run within one Study | IMPLEMENTED | [src/domain/analysis/workspace.ts:121](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/analysis/workspace.ts:121) | Multiple run/dataset/subject membership supported. |
| Cross-Study analysis authoring | PARTIAL | [src/domain/analysis/workspace.ts:121](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/analysis/workspace.ts:121) | Explicit ref schema broad; current selection/projector single-Study F09. |
| Analysis v2, DOE, advanced stats, AI, preprocessing pipeline | INTENTIONALLY DEFERRED | [src/features/analysis/workspace.tsx:277](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/workspace.tsx:277) | Not a frozen-v1 missing feature. |

## 8. Evaluation

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Configured target calculation from exact summary | PARTIAL | [src/features/run-registration/evaluation-grid-model.ts:102](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-grid-model.ts:102) | Rule calculation separated; repeated-result ambiguity F03. |
| Engineer disposition/rationale persistence | IMPLEMENTED | [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) | Separate authoritative record and exact evidence references. |
| Independent evaluator-only user workflow | PARTIAL | [src/features/run-registration/evaluation-execution-grid.tsx:210](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:210) | Server permission separate but UI needs Decision callback F01. |

## 9. Decision / NextAction

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Separate scientific decision and continuation concepts | IMPLEMENTED | [src/features/run-registration/lifecycle-authoring.ts:124](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/lifecycle-authoring.ts:124) | Atomic save; not workflow task/due-date model. |
| Exact evaluation/target/subject/operation linkage | IMPLEMENTED | [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) | Persisted references validated in reasoning repository. |
| Additional Measurement continuation execution | PARTIAL | [src/features/run-registration/evaluation-execution-grid.tsx:353](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:353) | Saved action intent exists; local preview execution F22 only. |

## 10. Next Run

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Inherited/changed preview | IMPLEMENTED | [src/features/run-registration/evaluation-execution-grid.tsx:353](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:353) | Proposal is separate from creation. |
| Authorized explicit independent Run commit | IMPLEMENTED | [src/infrastructure/postgres/postgres-repositories.ts:141](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-repositories.ts:141) | Transactional persistence/receipt and separate future Plan. |
| Read-only/permission-denied preview state | PARTIAL | [src/features/run-registration/evaluation-execution-grid.tsx:353](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:353) | F02 false-ready path without callback; no demonstrated server bypass. |

## 11. Authorization

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Study/Run inheritance, independent scientific capabilities | IMPLEMENTED | [src/infrastructure/postgres/authorization.ts:17](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/authorization.ts:17) | Trusted Principal pilot policies; UI coupling remains F01. |
| Reference governance and exact configuration permissions | IMPLEMENTED | [src/infrastructure/postgres/postgres-configuration-authoring.ts:44](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-configuration-authoring.ts:44) | Server command authorization separate from domain validation. |
| Real SSO / session revocation / production identity provisioning | INTENTIONALLY DEFERRED | [src/infrastructure/postgres/authorization.ts:17](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/authorization.ts:17) | Explicit enterprise work F23; pilot permission checks do not substitute authentication. |

## 12. Dashboard / Search

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Scope-filtered Home, Run lists, search/autocomplete | IMPLEMENTED | [src/infrastructure/postgres/scoped-discovery.ts:18](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/scoped-discovery.ts:18) | SQL permission intersection precedes count/search/page; source inspection, not fresh complete SQL suite. |
| Calendar and recent activity projections | IMPLEMENTED | [src/infrastructure/postgres/scoped-discovery.ts:18](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/scoped-discovery.ts:18) | Activity context, not promises of scheduling/workflow completion. |
| General scheduled resource planning | INTENTIONALLY DEFERRED | [src/infrastructure/postgres/scoped-discovery.ts:18](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/scoped-discovery.ts:18) | Calendar representation is not an enterprise workflow subsystem. |

## 13. Saved Analysis

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Save/open/update exact source refs and whitelisted config | IMPLEMENTED | [src/infrastructure/postgres/postgres-saved-analysis-repository.ts:9](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-saved-analysis-repository.ts:9) | No copied measurement values; exact missing reference unresolved. |
| Audience AND all underlying-source permission enforcement | IMPLEMENTED | [src/features/analysis/sharing-control.tsx:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/sharing-control.tsx:6) | Server checks; technical recipient UI partial. |
| Friendly people picker / ownership transfer / retention/delete policy | INTENTIONALLY DEFERRED | [src/features/analysis/sharing-control.tsx:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/sharing-control.tsx:6) | Policy/enterprise UX; do not claim delivered. |

## 14. Error / Recovery

| Function | Status | Evidence | Scope / limit |
| --- | --- | --- | --- |
| Validation/conflict/idempotency/rollback command boundaries | IMPLEMENTED | [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) | Source/previous contracts; no new mutation tests this audit. |
| Missing Saved Analysis identity fails without substitution | IMPLEMENTED | [src/features/analysis/saved-view-repository.ts:34](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/saved-view-repository.ts:34) | Exact opening boundary prevents default result substitution. |
| Guided retry/reload/back and pending-draft recovery | PARTIAL | [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11) | F07/F14/F21; no all-screen recovery guarantee. |
| Production-safe legacy route isolation | PARTIAL | [app/series/dts-improvement/runs/[runId]/data-preparation/page.tsx:1](/Users/naeunouh/Documents/ChatGPT/LIMS/app/series/dts-improvement/runs/[runId]/data-preparation/page.tsx:1) | Canonical workspace isolation exists; old Run/preparation paths remain. |
| Enterprise backup/restore, monitoring, load/HA readiness | INTENTIONALLY DEFERRED | [src/infrastructure/postgres/authorization.ts:17](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/authorization.ts:17) | Not established by local UAT or this audit. |

## User goal coverage

| Goal | User goal | Coverage | Exact evidence | Qualification |
| --- | --- | --- | --- | --- |
| 1 | Define reusable experiment context | YES | [src/infrastructure/postgres/postgres-configuration-authoring.ts:44](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-configuration-authoring.ts:44) | Definition/applicability/package versions with exact resolution; general scientific authoring limitations stated. |
| 2 | Create a Study | NO | [src/application/repository-ports.ts:33](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/repository-ports.ts:33) | No general Create Study UI/command; only registered Study contexts. This is not silently reclassified as frozen v1 scope. |
| 3 | Configure Study defaults | PARTIALLY | [src/features/experiment-series/study-setup-workspace.tsx:73](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/study-setup-workspace.tsx:73) | Durable auto-save available; F07 concurrent save and readonly clarity. |
| 4 | Create Run | PARTIALLY | [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11) | All four source modes for registered Studies; arbitrary Study allowlist and Blank authoring limits. |
| 5 | Change experimental conditions | PARTIALLY | [src/features/run-registration/engineering-grid.tsx:193](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/engineering-grid.tsx:193) | Existing applicable assignments editable before evidence; no general blank Operation/Position authoring. |
| 6 | Record what actually happened | PARTIALLY | [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301) | Manual commit works; default dates/values and participation choices require correction/review. |
| 7 | Record measurements | PARTIALLY | [src/features/run-registration/measurement-execution-grid.tsx:154](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/measurement-execution-grid.tsx:154) | Manual typed Subject/Site records; process-event linkage F04 and current button UX. |
| 8 | Analyze results | PARTIALLY | [src/features/analysis/workspace.tsx:277](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/workspace.tsx:277) | Repository table/aggregates available; current chart controls incomplete F06 and single-Study selection. |
| 9 | Judge target achievement | PARTIALLY | [src/features/run-registration/evaluation-grid-model.ts:102](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-grid-model.ts:102) | Calculated projection intact; ambiguous repeated results F03. |
| 10 | Record engineer interpretation | PARTIALLY | [src/features/run-registration/evaluation-execution-grid.tsx:210](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:210) | Record exists; independently authorized evaluator workflow blocked F01. |
| 11 | Record scientific decision | PARTIALLY | [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) | Atomic scientific persistence works for permitted author; UI permission coupling and exact evidence choice need review. |
| 12 | Design next experiment | PARTIALLY | [src/features/run-registration/evaluation-execution-grid.tsx:353](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:353) | Preview and authorized commit exist; no-callback false-ready F02; one selected next assignment change in current form. |
| 13 | Reproduce historical experiment context | PARTIALLY | [src/features/analysis/saved-view-repository.ts:34](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/saved-view-repository.ts:34) | Exact Run/config/source pins intact; ambiguous live evaluation selection and cross-Study current view restrictions remain. |
| 14 | Share analysis safely | PARTIALLY | [src/features/analysis/sharing-control.tsx:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/sharing-control.tsx:6) | Audience AND all sources enforced in server path; pilot identity and technical recipient interface limit real-user readiness. |
| 15 | Work within authorization scope | PARTIALLY | [src/infrastructure/postgres/authorization.ts:17](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/authorization.ts:17) | Server-scoped pilot path exists; role UI gating F01 and real authentication deferred. |

## Genuine incompleteness vs scope expansion

The following are incomplete **within existing advertised functionality**: independent Evaluation authoring for an evaluator-only role (F01); truthful read-only Next Run preview completion (F02); unambiguous repeated-result basis (F03); precise process-event association (F04); truthful current chart controls (F06); reliable consecutive Study auto-save (F07). These are defects/partial behavior, not permission to add a new subsystem.

Cross-Study Saved Analysis (F09) conflicts with the earlier accepted cross-Series architecture invariant; current frozen demonstration scope was narrower. It is catalogued as the one missing-v1 commitment requiring explicit PO scope reconciliation. It is **not delivered merely because reference records include studyId**.

General Create Study, arbitrary Study onboarding, blank-plan routing authoring, additional Measurement plan execution, and general scientific readiness editor are unavailable/partial capabilities that require explicit scope decisions. They are not automatically declared Production Core v1 freeze blockers.

Enhancements: friendly recipient lookup; evidence selection UX once scientific policy is decided; clearer metadata hierarchy; batch convenience; richer history navigation. Deferred enterprise: real authentication/SSO, session revocation, actual organization/module mapping and policy approvals, enterprise audit/signatures, retention/ownership transfer, operational backup/load/HA, live integrations, enterprise wafer identity resolution. Analysis v2, advanced statistics/DOE/AI and production preprocessing remain explicitly outside this task.
