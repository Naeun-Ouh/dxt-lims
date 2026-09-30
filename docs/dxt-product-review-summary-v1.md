# DXT Product Review Summary v1

Audit date: **2026-09-26 KST**. Scope: current working tree, PostgreSQL UAT at `localhost:3200`, with DXT Production Core v1 frozen. This is a decision document, not a new freeze sign-off. No product, Domain, persistence, authorization or UI code was changed in this audit. No scientific save/create/activation/share command was executed.

Evidence is labeled **source inspection**, **live read-only UI**, or **pure local probe**. Prior freeze/UAT reports are historical context, not fresh proof. The audit is broad but does not claim exhaustive runtime testing of every role, route, dataset shape, conflict or every individual string. Authenticated enterprise deployment, load and penetration testing are outside this review.

## Product decision

**PARTIALLY coherent; ready for a structured Product Owner walkthrough, not an unqualified product acceptance.** The repository architecture is stronger than the cross-screen interaction model. The largest risks concern which evidence is assessed, which capabilities users can actually exercise, and whether a UI success means a durable command occurred.

**23 findings: 8 P1, 14 P2, 1 P3. No confirmed P0 identified in this bounded review.** These are current audit findings, not a rewrite of the prior freeze result. Eight P1 findings comprise seven logic defects and one production/prototype UX boundary risk.

## Thirteen required review dimensions

| Dimension | Status / conclusion |
| --- | --- |
| 1. Overall product logic | PARTIALLY: Core concepts separated, product behavior has meaningful gaps. |
| 2. Lifecycle consistency | PARTIALLY: full registered loop exists; repeated-evidence and permission composition require review. |
| 3. Save/commit consistency | NO for uniform comprehension: blur auto-save vs explicit save vs new immutable version vs local prototype. |
| 4. Terminology consistency | NO: canonical terms vary and technical mechanisms surface in primary work. |
| 5. Major function completeness | PARTIALLY: repositories largely delivered, UI/behavior gaps and constrained onboarding remain. |
| 6. Navigation continuity | PARTIALLY: useful canonical transitions, Blank/readiness/prototype/error dead ends. |
| 7. Generic framework | PARTIALLY: shared science valid, name-limited application entry. |
| 8. Top 10 logic risks | Listed below; validated state and UI claims reviewed separately. |
| 9. Top 10 terminology problems | Listed below; no terms renamed. |
| 10. Top 10 UX inconsistencies | Listed below; recent fixes acknowledged. |
| 11. Missing v1 functions | F09 cross-Study accepted invariant unresolved; existing partial workflows F01–F07 listed separately. |
| 12. Enhancement backlog | Create Study/onboarding/routing scope, durable extra measurement continuation, directory picker, batch entry, richer history. |
| 13. Deferred enterprise work | SSO/identity lifecycle, organizational policies, enterprise audit/retention, live integrations, operations/HA and large-data scaling. |

## Top 10 logic risks / manual PO review order

1. **F03 · P1 — Repeated measurement assessment depends on array order.** Decide exact evidence-selection policy. Do not silently choose latest or average.
2. **F04 · P1 — Measurement process link selects the first event for a Subject.** Confirm intended process-to-measurement linkage semantics for multiple Operations.
3. **F02 · P1 — Next Run preview can report creation without a creator.** Require a successful persisted creation result before ready state; explicitly distinguish read-only preview.
4. **F01 · P1 — Evaluation-only permission hides Evaluation authoring.** Separate the two authoring capabilities; agree the role walkthrough before any correction.
5. **F05 · P1 — Actual form defaults to a fixed historical date.** Agree safe time-entry defaults and timezone wording; do not silently rewrite existing records.
6. **F06 · P1 — Analysis visual controls overpromise their effect.** Make current controls truthful and avoid incompatible-unit comparisons.
7. **F07 · P1 — Concurrent Study auto-save can silently skip another edit.** Define serialized commits and visible pending/error state before fixing.
8. **F08 · P1 — Prototype preparation remains reachable in production navigation space.** Choose explicit prototype isolation or removal from production route space; preprocessing itself remains deferred.
9. **F12 · P2 — Actual records planned values by default.** PO review whether explicit confirmation is sufficient or field-level observations are required.
10. **F09 · P2 — Cross-Study Saved Analysis selection is not delivered in current workspace.** Confirm whether cross-Study authoring remains a v1 commitment; current implementation is partial.

## Top 10 terminology problems

1. Study vs Series in context and links.
2. Saved Analysis vs Saved View.
3. Reference Set vs Configuration Package/version.
4. Grain vs SUBJECT_SUMMARY vs Representative.
5. Actual values defaulted from Plan vs independently recorded observation.
6. Ready to Activate vs Study lifecycle readiness.
7. Add to Draft Rule Set vs creating a new immutable version.
8. snapshot / package pin / manifest exposed before scientific content.
9. USER AUTHORED / system resolved and long dataset IDs competing with task.
10. Mock environment and static user display despite server-resolved pilot identity.

## Top 10 UX inconsistencies

1. F14: same-looking edits auto-save in Setup, wait for Save in Plan, and remain view-only in Analysis.
2. F01/F15: one permission hides an independent task; disabled Setup fieldset also disables inspection.
3. F02: read-only preview can reach a ready state without create callback.
4. F13: offered Subject/Operation combinations are broader than recordable membership.
5. F20: Measurement save styling lags the corrected Actual/Evaluation buttons.
6. F16: IDs and mechanism prose crowd primary work while Inspector exists.
7. F08: production route space includes local-only prototype save/create actions.
8. F11: Blank creates a Plan with no route to add the first Operation.
9. F19: safe sharing model requires opaque recipient IDs and raw visibility codes.
10. F21/F22: generic error/continuation screens lack a consistently meaningful next step.

## Evidence strength and walkthrough plan

Read-only browser collection covered 12 route entries, including all four Material lifecycle tabs, registered PHOTO/CMP paths, Reference, Setup, Analysis and a legacy preparation path. One Run creation entry used an unsupported query key and is excluded from generated-navigation defect claims; the correct Material `?series=` entry was subsequently verified. One exact Saved Analysis was reopened without mutation, and the Analysis Group switch left the SVG unchanged, consistent with the inspected renderer. Source inspection traced all lifecycle owners and independent capability checks. Pure probes reproduced evaluator-only UI loss, Study-name restriction and order-sensitive evaluation. No product fixes or scientific writes were made. No new full regression/build pass is claimed.

Suggested walkthrough: Reference exact version → Study Setup auto-save and readiness → Run source preview → registered Plan/Focus/scope → Actual default fields → Measurement repeated result/process linkage → Analysis filters/chart controls/save/reopen/share → Evaluation as independent evaluator → Decision as permitted author → preview as reader versus creator → newly committed independent Plan. Use dedicated test data for any later write validation. This audit only read existing UAT data.

## Explicit final answers

| Question | Answer | Qualification |
| --- | --- | --- |
| 1. Complete lifecycle logically coherent? | PARTIALLY | Owners and core separations exist; F01–F08 prevent a full product-level YES. |
| 2. Plan / Actual / Measurement / Evaluation / Decision / NextAction distinct everywhere? | PARTIALLY | Persisted concepts separated; default actual assertions, UI permission coupling, and prototype continuation muddy user interpretation. |
| 3. Changed and VARIED consistently distinguished? | YES | In inspected canonical paths, intent and differences are separate. Legend consistency remains terminology debt. |
| 4. Subject / Site / Position consistently distinguished? | YES | Inspected shared schemas/adapters preserve separation; no automatic coordinate identity inference. Not a claim that Position authoring is fully delivered. |
| 5. Save/commit understandable across all editable screens? | NO | Auto-save, explicit save, create, scope commit and local prototype actions lack a unified commitment model; F07/F14/F18. |
| 6. User-facing terminology consistent? | NO | Study/Series, Reference Set/Package, Saved View/Analysis and technical state labels vary. |
| 7. Unnecessary technical terms exposed? | YES | snapshot, exact package/pin, manifest/draft shell, SUBJECT_SUMMARY, system resolved, dataset/result IDs; repository/aggregate-style failure language may escape. IDs remain justified in Inspector. |
| 8. Primary actions understandable? | PARTIALLY | Recent Actual/Evaluation save styling fixed; rule-version creation label, local continuation and static active controls remain confusing. |
| 9. One clear purpose per major screen? | PARTIALLY | Main lifecycle stages recognizable; Setup readiness metadata, Evaluation+Decision forms and Analysis provenance compete with primary task. |
| 10. Clear next action at every stage? | PARTIALLY | Canonical registered loop exists; Blank, absent readiness proposals, local extra-measurement preview and some errors create dead ends. |
| 11. All frozen v1 major functions implemented? | PARTIALLY | Main repositories are present; existing-role and evidence/visual behavior gaps plus unresolved cross-Study commitment prevent categorical YES. |
| 12. Genuinely incomplete v1 functions? | LIST | Independent evaluator workflow; truthful no-create-permission preview; deterministic explicit repeated-result context; accurate process linkage; functioning advertised chart grouping/axes; reliable consecutive Setup saves. Cross-Study authoring is a scope reconciliation item F09. |
| 13. Enhancements rather than defects? | LIST | Arbitrary Study onboarding, first-operation authoring from Blank, durable additional-measurement continuation, friendly directory picker, batch entry and richer provenance navigation—subject to explicit PO scope. |
| 14. Generic framework valid for Wafer and Specimen? | PARTIALLY | Shared scientific path and repositories work for registered scenarios; hardcoded Study names limit truly generic product entry. |
| 15. Semiconductor-specific leakage into generic product logic? | YES | Product entry has named DTS/CMP/Material branches and shared header defaults to SEMICONDUCTOR R&D. No demonstrated PHOTO/CMP branching in scientific SQL persistence; distinguish entry leakage from Core type design. |
| 16. Semiconductor terminology leakage into Material R&D? | NO | No confirmed leakage on canonical Material pages inspected. This is bounded UI evidence, not a guarantee for every legacy route. |
| 17. Historical Runs interpretable from UI? | PARTIALLY | Exact identities/pins retained and historical routes open; implicit representative selection and prototype route ambiguity reduce confidence. |
| 18. Authorization and scientific validation visibly/logically separate? | PARTIALLY | Server policies are separate from scientific validation; independent capabilities conflated by UI F01 and unexplained disabled/hidden controls. |
| 19. Top 10 manual PO review issues? | LIST | Priority list below; use read-only/synthetic contexts before any scientific corrections. |
| 20. Ready for a Product Owner full manual walkthrough? | YES | Ready as a findings-driven review of the current product. Not approved for acceptance, re-freeze or external production rollout; log gaps rather than save around them. |

## Deliverables and source trail

- [Logic audit and findings](dxt-product-logic-audit-v1.md) — lifecycle authority/editability/owner, frozen rules, findings, save and navigation maps.
- [Terminology and action inventory](dxt-terminology-audit-v1.md) — current/proposed terms with rationale; no rename implemented.
- [Major functions and user goals](dxt-major-function-inventory-v1.md) — 14 function groups, coverage and scope boundaries.

These four requested Markdown documents are the review artifacts. No product UI, broad refactor or Analysis v2 work was added.
