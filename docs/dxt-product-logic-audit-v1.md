# DXT Product Logic Audit v1

Audit date: **2026-09-26 KST**. Scope: current working tree, PostgreSQL UAT at `localhost:3200`, with DXT Production Core v1 frozen. This is a decision document, not a new freeze sign-off. No product, Domain, persistence, authorization or UI code was changed in this audit. No scientific save/create/activation/share command was executed.

Evidence is labeled **source inspection**, **live read-only UI**, or **pure local probe**. Prior freeze/UAT reports are historical context, not fresh proof. The audit is broad but does not claim exhaustive runtime testing of every role, route, dataset shape, conflict or every individual string. Authenticated enterprise deployment, load and penetration testing are outside this review.

## Verdict

**PARTIALLY coherent as one complete product.** The authoritative lifecycle is structurally separated, but permission/UI composition, ambiguous evidence selection, visualization promises and persistence cues prevent an unqualified YES. No confirmed P0 emerged in this bounded audit; P1 findings below require triage. Prior frozen status is not silently revoked or revalidated.

## Stage purpose, authority, ownership and next action

| Stage | Purpose | Authority | Inherited / authored / resolved | Editability / immutability | Persisting/application owner | Next meaningful action |
| --- | --- | --- | --- | --- | --- | --- |
| Reference / Configuration | Define reusable permitted context | Immutable definition/rule revisions and exact package manifest; activation pointer is separate | Existing version copied into a new revision/version; engineer authors definition/applicability; resolver validates applicability | Revisions/assembled payload immutable; change by new identity; activate/deactivate changes lifecycle record | ConfigurationManagementCommands → configuration command facade → PostgresConfigurationAuthoring; configuration revision/package/draft/activation tables | Study Setup / exact adoption |
| Study | Identify one scientific investigation and responsibility context | Persisted Study and access context | Registered Study identity; general new Study creation not exposed | Existing scope/setup permissions separate from science writing | PostgresStudyRepository + study/study_access; no Create Study port | Study Setup |
| Study Setup | Choose defaults for future Runs | Versioned StudySetup; exact Study/package reasoning context | Reference defaults selected by engineer; applicability resolved; prior context only a reviewed proposal | Auto-committed defaults can evolve; existing Runs unchanged; confirmed reasoning context immutable | DxtApplication.studies.save → PostgresStudyRepository.saveSetup / study_setup_version; confirmStudyReasoning / reasoning_context + study_reasoning_adoption | Review inheritance → Create Run |
| Run creation | Create independent experiment iteration | Persisted full Run snapshot after commit | Study Default, Previous, Existing or Blank; preview resolves source/fingerprint; number assigned at commit | Preview editable source choice; committed Run identity/source pinned | runs.createFromPreview / createFromStudyDefault / createFromPreviousRun → PostgresRunRepository; experiment_run, plan children, command receipt | Plan |
| Plan | Define intended operations, subjects and experimental variables | Run snapshot, assignments, participation, saved scope/focus | Full source setup inherited; values and FIXED/VARIED authored separately; references resolved by operation context | Explicit Save Plan before evidence; permanently locked after any Actual/Measurement/reasoning evidence including superseded records | runs.savePlanning → PostgresRunRepository.savePlanningWorkspace; plan-lock.ts serializes evidence race | Actual |
| Actual | Record what happened for exact Run/Subject/Operation | Immutable execution evidence; current evidence mapping/version | Manual form defaults equipment/values from Plan unless overridden; user records status/time/actual differences | New event identity for re-authoring, old event immutable; no Plan rewrite | DxtApplication.recordActual/executions.save → PostgresExecutionRepository; execution_event/current/state/receipts | Measurement |
| Measurement | Record observations at Subject or Site grain | MeasurementExecution, Dataset, Values, Summaries, Validity decisions | Exact parameter/unit from package; user inputs observation; manual path creates dataset and one-value numeric mean; source lineage stored | Raw identities immutable; validity decisions separate; not MaterialPropertyValue | recordMeasurement → PostgresMeasurementRepository; measurement_execution/dataset/value/summary/validity tables | Analysis or Evaluation |
| Analysis | Inspect existing measurements without creating observations | Repository observations and query-time projection | User selects sources/aggregation/chart/filter; calculated view; no new raw scientific facts | Transient configuration; saved only via Saved Analysis; current chart limitations F06 | DxtApplication.analysisSourceCatalog/queryAnalysisSources → MeasurementRepository.query; no Analysis-result writer | Save Analysis / single-Run Evaluation |
| Saved Analysis | Reopen exact source context and view settings | Whitelisted view config + exact source refs; access policy | User names view and selects sharing; source values re-resolved | Explicit save/update with version checks; no measurement-value copy; latest config can update | savedAnalyses.save → PostgresSavedAnalysisRepository; saved_analysis/source_ref/command_receipt; separate sharing owner | Reopen / inspect / authorized share |
| Target Achievement | Assess configured target against measured result | Target binding + exact representative Measurement result | System projection calculates status; not a manually editable achievement fact | No separate achievement editor; order-sensitive choice remains F03 | calculateTargetAchievement/projectEvaluations; readReasoningContext + Measurement repository; no independent achievement repository | Engineer Evaluation |
| Engineer Evaluation | Record engineering interpretation | Authored judgment/comment with exact target/summary references | User authors disposition/rationale; achieved does not imply accepted | New immutable evaluation record; selected/effective evaluation references preserved | recordEvaluation → PostgresEvaluationRepository; engineer_evaluation/evaluation state/receipts | Decision |
| Decision / Next Action | Record conclusion and scientific continuation | Distinct Decision and NextAction objects, committed together | User supplies conclusion/reason/action and optional planned next change; references evaluation/target/subjects | Original evidence not rewritten; save does not execute NextAction or create Run | recordDecision → PostgresDecisionRepository; decision + next_action in atomic transaction, decision state/receipts | Preview next experiment or action-specific continuation |
| Next Run Preview | Review proposed inherited and changed setup | Derived preview from saved Decision/source Plan | Complete Plan inherited; explicit delta proposed; previous evidence excluded | Preview not a created Run; proposed number not allocated identity | createNextRunPreview; persisted as decision proposal context; no experiment_run insert until Create | Create Next Run |
| Next Run → Plan | Start next independent iteration | New persisted Run and own Plan lock | Source/Decision/exact package lineage inherited, no previous observations | Editable until its own evidence; historical Run unchanged | runs.createNextFromPrevious → PostgresRunRepository transaction + receipt | Edit new Plan / Actual |

Owner evidence: [src/application/dxt-application.ts:35](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/dxt-application.ts:35) · [src/application/repository-ports.ts:33](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/repository-ports.ts:33) · [src/infrastructure/postgres/postgres-repositories.ts:141](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-repositories.ts:141) · [src/infrastructure/postgres/postgres-configuration-authoring.ts:44](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-configuration-authoring.ts:44) · [src/infrastructure/postgres/reasoning-context.ts:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/reasoning-context.ts:6) · [src/infrastructure/postgres/plan-lock.ts:3](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/plan-lock.ts:3) · [src/infrastructure/postgres/postgres-saved-analysis-repository.ts:9](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/postgres-saved-analysis-repository.ts:9)

## Frozen distinction review

| Rule | Status | Evidence / qualification |
| --- | --- | --- |
| Plan ≠ Actual | PARTIALLY in UX; separated in storage | Separate repositories and lock preserved; default Plan→Actual copying needs explicit product decision (F12). |
| Changed ≠ VARIED | YES in reviewed shared path | Assignment intent independent of inheritance/actual delta; both symbols need a clear legend. |
| Missing ≠ Zero | YES in inspected projections | Null/empty displayed as —; aggregation returns null for no values; numeric zero not coalesced away. Not an exhaustive malformed-input proof. |
| RAW ≠ DERIVED | YES in model; terminology partial | Dataset origin SOURCE/DERIVED and RAW aggregation are separate axes; UI labels need explanation. |
| Subject ≠ Site | YES in shared evidence model | SubjectRef remains parent; measurement granularity SUBJECT/SITE with site identity/coordinates. |
| Position ≠ Site | YES in inspected boundaries | Separate condition/application position and measurement site; no automatic mapping found; Plan edit rejects unsupported position assignments. |
| Target Achievement ≠ Engineer Evaluation | PARTIALLY | Projection vs authored record intact; result-selection ambiguity F03 and permission gating F01 undermine use. |
| Evaluation ≠ Decision | PARTIALLY | Separate records/commands; same authoring panel wrongly couples permissions F01. |
| Decision ≠ NextAction | YES in storage; PARTIALLY presentation | Saved atomically but distinct intent; action execution/prototype continuation must not be implied complete. |
| Preview ≠ Created Run | PARTIALLY | Repository commit/number allocation correct; optional callback UI false-ready path F02. |
| Study Default ≠ Historical Run | YES in traced owners | Independent Run full snapshot and exact configuration; Study save does not update Runs. |
| ACTIVE Package ≠ Study/package READY | YES in traced owners; PARTIALLY language | Activation and reasoning adoption are separate; Ready to Activate vs Lifecycle readiness needs sharper labels. |

## Findings register

### F01 — Evaluation-only permission hides Evaluation authoring

**P1 · LOGIC DEFECT**

The panel requires both onRecordEvaluation and onRecordDecision although server permissions are separate. A person permitted to evaluate but not decide has no Save Evaluation UI.

Evidence: SSR probe: both callbacks → Save Evaluation present; Evaluation callback only → absent. [src/features/run-registration/evaluation-execution-grid.tsx:210](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:210)

PO decision / proposed follow-up (not implemented): Separate the two authoring capabilities; agree the role walkthrough before any correction.

### F02 — Next Run preview can report creation without a creator

**P1 · LOGIC DEFECT**

The Create handler uses optional onCreateNextRun?.() and then unconditionally setStaged(true). The preview is rendered from saved continuation even when create permission removes the callback. This can show ready/open UI without a commit.

Evidence: Static executable path; no unauthorized write was attempted or demonstrated. [src/features/run-registration/evaluation-execution-grid.tsx:353](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:353)

PO decision / proposed follow-up (not implemented): Require a successful persisted creation result before ready state; explicitly distinguish read-only preview.

### F03 — Repeated measurement assessment depends on array order

**P1 · LOGIC DEFECT**

Evaluation selects the first Subject + Parameter + Point match, without operation/dataset/result choice or ambiguity state. Multiple valid results can lead to a different assessment when ordering changes.

Evidence: Pure projection probe: same candidates, reversed order → 18.2 vs 99; different summary IDs. Synthetic probe does not claim production data changed. [src/features/run-registration/evaluation-grid-model.ts:102](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-grid-model.ts:102)

PO decision / proposed follow-up (not implemented): Decide exact evidence-selection policy. Do not silently choose latest or average.

### F04 — Measurement process link selects the first event for a Subject

**P1 · LOGIC DEFECT**

Manual Measurement uses actualEvidence.find by Subject only. It does not identify the relevant process Operation or require the engineer to choose it. Multiple executed operations can produce a misleading process lineage link.

Evidence: Static construction path, constrained to same Subject; not proof of cross-Subject contamination. [src/features/run-registration/lifecycle-authoring.ts:245](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/lifecycle-authoring.ts:245)

PO decision / proposed follow-up (not implemented): Confirm intended process-to-measurement linkage semantics for multiple Operations.

### F05 — Actual form defaults to a fixed historical date

**P1 · LOGIC DEFECT**

Started/Completed default to 2026-09-14 09:00/09:30, including on this 2026-09-26 audit. Saving without editing sends those literal dates.

Evidence: Current form source and live Actual DOM; no scientific record saved during audit. [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301)

PO decision / proposed follow-up (not implemented): Agree safe time-entry defaults and timezone wording; do not silently rewrite existing records.

### F06 — Analysis visual controls overpromise their effect

**P1 · LOGIC DEFECT**

Group is stored/restored but never supplied to the chart. Run/Subject X choices both fall back to row index. Multiple parameter units share one unlabeled numeric scale and one trend line.

Evidence: Chart source inspected; Group affects saved config, not plot grouping. A live read-only switch to PARAMETER left SVG unchanged (the single-point sample alone is not conclusive; the missing groupBy render input is decisive). This is an existing v1 rendering defect, not a request for Analysis v2. [src/features/analysis/workspace.tsx:277](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/workspace.tsx:277)

PO decision / proposed follow-up (not implemented): Make current controls truthful and avoid incompatible-unit comparisons.

### F07 — Concurrent Study auto-save can silently skip another edit

**P1 · LOGIC DEFECT**

persist returns immediately when saving is true, while value editors remain enabled. A second edit during an in-flight save is not queued or committed; success notice for the first may be misleading.

Evidence: Static timing path; network-delay browser reproduction not performed. [src/features/experiment-series/study-setup-workspace.tsx:73](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/study-setup-workspace.tsx:73)

PO decision / proposed follow-up (not implemented): Define serialized commits and visible pending/error state before fixing.

### F08 — Prototype preparation remains reachable in production navigation space

**P1 · UX DEBT**

Legacy Run1–4 preparation route mounts mock data and React-local Create Group/Save as Recipe actions without a production-mode guard. It can look like the same durable product.

Evidence: Live /series/dts-improvement/runs/1/data-preparation opened on port3200. Source uses mock datasets/local state. No private PostgreSQL leakage asserted. [app/series/dts-improvement/runs/[runId]/data-preparation/page.tsx:1](/Users/naeunouh/Documents/ChatGPT/LIMS/app/series/dts-improvement/runs/[runId]/data-preparation/page.tsx:1)

PO decision / proposed follow-up (not implemented): Choose explicit prototype isolation or removal from production route space; preprocessing itself remains deferred.

### F09 — Cross-Study Saved Analysis selection is not delivered in current workspace

**P2 · MISSING V1 FUNCTION**

Source references can carry Study IDs, but AnalysisSelection has one studyId and projectAnalysisRows filters to it. The UI replaces Study selection instead of selecting across Studies. Earlier accepted architecture asked for cross-Series membership.

Evidence: Current schema + projection + UI inspected; legacy SavedAnalysis schema alone does not prove current UI capability. [src/domain/analysis/workspace.ts:121](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/analysis/workspace.ts:121)

PO decision / proposed follow-up (not implemented): Confirm whether cross-Study authoring remains a v1 commitment; current implementation is partial.

### F10 — General Study onboarding is not exposed

**P2 · UX DEBT**

StudyRepository has load/saveSetup but no createStudy command. Run creation schema and route accept three named Studies. Shared scientific machinery works for the registered Wafer/Specimen fixtures, not arbitrary new Studies.

Evidence: Schema probe rejects new-independent-study. Freeze describes registered scenarios, so this is a product-scope limit, not an invented missing frozen feature. [src/application/run-creation.ts:5](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/run-creation.ts:5)

PO decision / proposed follow-up (not implemented): PO must approve scope of Create Study and remove any claim of unrestricted onboarding.

### F11 — Blank Run has no visible route to author its first Operation

**P2 · UX DEBT**

Blank is advertised and commits an empty Plan, while current Grid edits existing operations/assignments and provides no Add Operation flow. validatePlanEdit also requires nonempty steps for a saved edit.

Evidence: Run entry and Plan edit boundary inspected; documented frozen limitation, not permission to add operation authoring now. [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11)

PO decision / proposed follow-up (not implemented): Explain the limitation at creation or decide future empty-Plan onboarding scope.

### F12 — Actual records planned values by default

**P2 · UX DEBT**

Use planned values automatically supplies observedValues from Plan. A warning is now visible, but a single save can assert multiple actual values the engineer did not individually enter. Plan is not mutated.

Evidence: recordActualExecution copies absent overrides; this is current authoring policy, not automatic scientific verification. [src/features/run-registration/lifecycle-authoring.ts:124](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/lifecycle-authoring.ts:124)

PO decision / proposed follow-up (not implemented): PO review whether explicit confirmation is sufficient or field-level observations are required.

### F13 — Subject and Operation selectors do not advertise participation constraints

**P2 · UX DEBT**

Actual and Measurement forms offer model.subjects independent of the selected Operation. The server rejects invalid membership; users can select an unrecordable pair.

Evidence: UI selector population versus DxtApplication execution membership validation. [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301)

PO decision / proposed follow-up (not implemented): Make valid participation context visible; retain server guard.

### F14 — Save boundaries vary without a product-wide explanation

**P2 · UX DEBT**

Study defaults commit on blur/change, Plan requires Save Plan, Scope confirmation also saves pending Plan edits, Focus is view-only, Analysis settings are transient until Save View.

Evidence: Handlers traced to owners; no claim that every Apply persists. [src/features/run-registration/engineering-grid.tsx:193](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/engineering-grid.tsx:193)

PO decision / proposed follow-up (not implemented): Agree shared pending/saved/discard language and clarify coupled Scope commit.

### F15 — Read-only state is not consistently explained

**P2 · UX DEBT**

Study Setup uses a disabled outer fieldset, including inspection buttons, without a permission-specific banner. Actual/Measurement authoring disappears; Evaluation has the stronger F01 coupling.

Evidence: Permission composition and loaded UI inspected; no permission bypass observed. [src/features/experiment-series/study-setup-workspace.tsx:73](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/study-setup-workspace.tsx:73)

PO decision / proposed follow-up (not implemented): Separate viewing depth from editing capability and explain why controls are unavailable.

### F16 — Internal identity terms compete with scientific work

**P2 · TERMINOLOGY ISSUE**

Exact Package IDs, snapshot, USER AUTHORED, system resolved, SUBJECT_SUMMARY, dataset/result IDs and manifest wording appear in primary surfaces. Some IDs are appropriate in Inspector.

Evidence: Current sources and live DOM; see terminology catalog. [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11)

PO decision / proposed follow-up (not implemented): Keep exact identities in depth; use task-oriented labels in primary surfaces.

### F17 — Runtime and actor labels are misleading

**P2 · TERMINOLOGY ISSUE**

Shared header says Mock environment while this composition uses PostgreSQL, and displays 오나은 statically while server resolves trusted uat-owner. This is not evidence that server audit attribution was changed.

Evidence: Header source, server identity resolver and UAT environment. [src/shared/ui/workspace.tsx:48](/Users/naeunouh/Documents/ChatGPT/LIMS/src/shared/ui/workspace.tsx:48)

PO decision / proposed follow-up (not implemented): Show accurate environment/principal labels; keep authorization owned by server.

### F18 — Add to Draft Rule Set creates a new immutable version

**P2 · TERMINOLOGY ISSUE**

The action creates applicabilityRuleSetVersion immediately; it does not edit an existing mutable draft as the label implies.

Evidence: Handler calls createApplicabilityRuleSetVersion with next version then closes. [src/features/reference-studio/applicability-view.tsx:444](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/reference-studio/applicability-view.tsx:444)

PO decision / proposed follow-up (not implemented): Use Create Rule Set Version / clarify package release separately.

### F19 — Sharing requires technical recipient IDs

**P2 · UX DEBT**

Backend protects audience AND every source, but the user must enter Principal/Department/Area IDs and interpret raw visibility codes.

Evidence: Sharing control source; no live grant changed in audit. [src/features/analysis/sharing-control.tsx:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/sharing-control.tsx:6)

PO decision / proposed follow-up (not implemented): Provide understandable recipient context in a separately approved UX task.

### F20 — Measurement save button still lacks scoped primary styling

**P2 · UX DEBT**

Actual and Evaluation received scoped button fixes; Measurement still renders button.primary without the equivalent lifecycle-authoring primary style.

Evidence: Source and CSS scan; includes live Measurement surface. Previous fixes are not reported as still broken. [src/features/run-registration/measurement-execution-grid.tsx:154](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/measurement-execution-grid.tsx:154)

PO decision / proposed follow-up (not implemented): Review remaining lifecycle save CTAs together; do not assume class primary styles itself.

### F21 — Recovery is fail-closed but often not guided

**P2 · UX DEBT**

Missing identity/configuration, forbidden writes and stale versions return explicit errors, often raw IDs or generic unavailable text. Loading/error branches often lack an in-context retry/back action.

Evidence: Application errors and Run/Study/Analysis render boundaries inspected. Security intentionally combines unavailable/access-denied for reads. [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11)

PO decision / proposed follow-up (not implemented): Offer safe navigation/reload without disclosing hidden resource existence.

### F22 — Additional Measurement continuation is a local prototype

**P3 · ENHANCEMENT**

Create Measurement Plan sets staged local state and explicitly says Prototype measurement plan staged locally. No durable production command is connected here.

Evidence: Evaluation continuation code inspected; do not confuse saved NextAction intent with completed follow-up execution. [src/features/run-registration/evaluation-execution-grid.tsx:353](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:353)

PO decision / proposed follow-up (not implemented): Decide a separate follow-up measurement planning slice; not Analysis v2 or a hidden completed v1 capability.

### F23 — Identity and operational readiness remain pilot-scoped

**P2 · DEFERRED ENTERPRISE WORK**

server-development Principal is trusted server configuration; no IdP/session mapping, production sign-in lifecycle or enterprise identity resolution is implemented here.

Evidence: developmentPrincipalId only accepts server-development + configured Principal. [src/infrastructure/postgres/authorization.ts:17](/Users/naeunouh/Documents/ChatGPT/LIMS/src/infrastructure/postgres/authorization.ts:17)

PO decision / proposed follow-up (not implemented): Maintain explicit pilot boundary; settle policies before real-user deployment.

## Save / Commit model

| Surface | Classification | Authoritative moment / CTA | Feedback / inconsistency |
| --- | --- | --- | --- |
| Reference definition | CREATE / COMMIT | Create Revision 1 / Create New Revision persists immutable revision | New revision ≠ published package. Technical creation vocabulary and limited schema editor. |
| Applicability | CREATE / COMMIT | Add to Draft Rule Set creates new immutable version | F18 label implies editing draft; validation alone does not publish. |
| Package | CREATE / COMMIT | Create Draft, Assemble Version, Activate/Deactivate | Validate is READ ONLY assessment. Activation authority separate from Study readiness. |
| Study Setup | AUTO SAVE | Select change immediately; text blur/Enter → studies.save | Saving/notice shown, no durable global dirty indicator; F07 skip/race and F15 readonly ambiguity. |
| Study reasoning | CREATE / COMMIT | Confirm reasoning for selected Package | Immutable context after confirmation; no registered proposal can be a dead end. |
| Run entry | CREATE / COMMIT | Review Inheritance is preview; Create Run & Open Plan commits | Clear commit, technical snapshot/pin metadata foregrounded. |
| Run Plan | EXPLICIT SAVE | Save Plan | Saved/Saving/error present; scope confirmation shares save and can include pending edits F14. |
| Focus selection | READ ONLY | Apply focus changes view only | View state, not science/persistence; distinction now explicitly described. |
| Actual | EXPLICIT SAVE | Save execution record → new evidence identity/current mapping | Success after read-back; default date F05 and default values F12; no proof individual fields measured. |
| Measurement | EXPLICIT SAVE | Save Measurement → execution/dataset/value/summary | Success after read-back; save styling F20; one observation per submission, not batch acquisition. |
| Analysis work surface | READ ONLY | Changing filters/chart config modifies view state and URL | Not a measurement writer; no promise of durable configuration until Save View. |
| Saved Analysis | CREATE / COMMIT then EXPLICIT SAVE | Save View creates; Update Saved View edits config version | Reads exact refs after save; conflict retry/readback; missing source explicit; cross-Study F09. |
| Sharing | EXPLICIT SAVE | Save sharing / Revoke all sharing | Immediate destructive revocation CTA distinct from staged Add recipient; technical recipient IDs F19. |
| Evaluation | EXPLICIT SAVE | Save Evaluation | Requires measured result+rationale; saved notice; inaccessible to evaluator-only F01. |
| Decision / NextAction | EXPLICIT SAVE | Save Decision & Next Action | Atomic joint commit of separate concepts; does not create Run. |
| Next Run Preview | READ ONLY then CREATE / COMMIT | Preview vs Create Next Run | Repository semantics clear, UI no-callback path F02. |
| Additional Measurement preview | READ ONLY / local prototype | Create Measurement Plan only sets local staged | No authoritative save owner; explicitly prototype but looks like lifecycle action F22. |
| Legacy Data Preparation | Local prototype, not authoritative AUTO SAVE | Create Group / Save as Recipe local useState | Production route-space confusion F08; do not classify as durable v1 pipeline. |

Save/Commit inconsistency list: **F07, F08, F12, F14, F15, F18, F20, F21, F22**. Protected historical Plan should remain read-only; that is not itself a defect. A configured hidden action is not evidence of a missing permission on the server.

## Cross-screen consistency and information hierarchy

| Concept | Observed inconsistency | PO interpretation |
| --- | --- | --- |
| Subject | Scope membership / recording target / jump-to-column / analysis filter / evaluation cell selection use related labels | Actual now distinguishes target and jump; remaining screens need equally explicit purpose. |
| Operation | Plan controls visible range; Actual/Measurement selectors use all offered subjects | Do not equate UI scope filtering with operation participation. F13. |
| Parameter / Unit | Plan uses context-applicable definitions; Measurement shows canonical unit; Analysis permits multiple units on one chart | F06 affects interpretation, not merely spacing. |
| Grain | SUBJECT, SITE, SUBJECT_SUMMARY, Representative and Data Resolution appear across screens | Observation location vs aggregation vs display resolution need separate labels. |
| FIXED / VARIED; Changed | Roles are explicit; Actual delta independent; inherited changes different again | Core semantics pass; symbols/legends need consistency. |
| Package / version | Reference Studio Package vs Study Reference Set; IDs foregrounded in Run preview | Same selected artifact deserves coherent friendly label plus exact depth. |
| Save / commit | Auto-save on defaults vs explicit Plan vs immediate immutable reference creation | Explain commitment before editing rather than rely on toast. |
| Lock / permission | Plan explains evidence lock; Setup fieldset disables all including depth; Evaluation gates independent roles | F01/F15; distinguish authority from scientific editability. |
| Missing / invalid | Missing values shown as —; invalid input and unavailable sources often raw error strings | Preserve missing vs zero; provide recovery without hidden-resource disclosure. |
| Lifecycle navigation | Single-Run Analysis can return to Evaluation; multi-Run has no unique next Evaluation; optional NextAction local prototype | Avoid auto-evaluating cross-Run results; explicit target Run selection is a future UX decision. |
| Hierarchy | Reference IDs/readiness dominate Setup/preview; Analysis table includes dataset/result/source IDs before depth | Grid primary; Inspector technical depth. Existing exact-ID Inspector should be kept, not globally renamed. |

## Navigation map

| From | Current context / primary task | Primary CTA | Next / gap |
| --- | --- | --- | --- |
| Home / Search | Study list and permitted Run summaries | Continue / Open Study | Latest stage; dashboard means activity, not task completion. |
| Reference Studio | Definition → applicability → package authoring | Create revision / Create version / Validate / Activate | Adopt in Study Setup; reference activation alone not ready. |
| Study | Investigation overview / Setup / Runs | Experiment Setup / Create Next Run | No general Create Study path F10. |
| Study Setup | Defaults for future Runs | Auto-save edits / Confirm reasoning | Run creation; no proposal available requires administrator/scientific configuration, not an unexplained retry. |
| Run entry | Chosen source and inherited context | Create Run & Open Plan | Blank is known empty-Plan dead end F11. |
| Plan | Selected Run, intended design | Save Plan / Actual tab | Plan lock explained; Focus is viewing only. |
| Actual | Selected Run, actual execution | Save execution record / Go to Measurement | Button navigation now explicit; default date remains problematic. |
| Measurement | Run + Subject + Operation + Parameter | Save Measurement / Analyze | Analysis filters and result context; not automatic evaluation. |
| Analysis | Study, one or more Runs, datasets, subjects | Save View / Continue to Evaluation for one Run | Multi-Run must select a Run; current UI is single-Study. |
| Saved Analysis | Exact stored context and audience | Open / Update Saved View / Manage sharing | Failures preserve exact identity, but recovery guidance limited. |
| Evaluation | Target + selected Subject result | Save Evaluation | Decision; F01 permission coupling. |
| Decision / NextAction | Selected evaluation and proposed continuation | Save Decision & Next Action | Preview saved action; no automatic execution. |
| Preview | Inherited/changed setup | Create Next Run | Open committed Plan, subject to F02. |
| Legacy Data Preparation | Mock wafer dataset | Create Group / Save as Recipe | Local state; looks durable F08. |

## Domain specialization checks

**Generic framework: PARTIALLY.** Shared SubjectRef, execution/measurement/reasoning repositories and Grid components support both registered Wafer and Specimen scenarios. SQL adapters inspected do not choose scientific behavior by PHOTO/CMP/Material name. However the application Run creation schema and routing explicitly enumerate Study names (F10); this fails a strict claim of name-independent onboarding. Fixture construction in planning-model and Material adapter is not by itself a Core branching defect.

**Semiconductor:** Lot is observed/manufacturing context; PhysicalWafer and alias/candidate identity structures remain distinct. Slot is observed slotPosition, not the universal Subject key. Wafer SubjectRefs are specialized identities; Site resides under measurement and retains parent Subject/Run/Study; Position represents intended application context. No automatic Position↔Site mapping or enterprise-wide physical wafer resolution was found or added. Legacy wafer-oriented analysis schemas coexist with the current generic SavedAnalysisView; their existence must not be counted as current cross-Study UI support.

**Material:** RawMaterial → FormulationDefinition → immutable FormulationRevision → FormulationUsage(exact revision, Run/Subject/Operation, intent) is separated from Specimen as tested subject. Mix/Coat/Cure/Test come from the Material configuration/scenario. Material characteristic properties are not primary experiment Measurement. Current Material Plan/Actual/Measurement/Evaluation pages show Subject/SP labels, not Wafer/Site fabricated by a semiconductor assumption. No confirmed semiconductor vocabulary leakage on the canonical Material pages inspected; a globally shared Samples/prototype surface is not proof that Specimen becomes material property or wafer. Formulation catalog onboarding remains limited, not a new science subsystem.

Evidence: [src/domain/experiment/subject.ts:4](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/experiment/subject.ts:4) · [src/domain/material/formulation.ts:55](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/material/formulation.ts:55) · [src/features/material-rd/material-rd-scenario.ts:18](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/material-rd/material-rd-scenario.ts:18) · [src/domain/execution/index.ts:10](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/execution/index.ts:10) · [src/features/run-registration/legacy-semiconductor-execution-adapter.ts:1](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/legacy-semiconductor-execution-adapter.ts:1) · [src/domain/analysis/workspace.ts:121](/Users/naeunouh/Documents/ChatGPT/LIMS/src/domain/analysis/workspace.ts:121) · [src/application/run-creation.ts:5](/Users/naeunouh/Documents/ChatGPT/LIMS/src/application/run-creation.ts:5)

## Validation performed and limits

- Live read-only routes: Home; Reference; Material Study Setup; Material Run4 Plan/Actual/Measurement/Evaluation; Analysis; PHOTO Run19 Plan; CMP Run13 Measurement; legacy Run1 Data Preparation. Browser text stored under `tmp/product-audit-v1/page-*.txt` and `browser.json` (temporary evidence, not enterprise audit retention).
- One initial Run-entry probe used unsupported `?study=` and opened default DTS; this is **not** evidence of a generated-link defect. Correct application parameter is `?series=`; a supplemental live check using `?series=adhesion-material-optimization&from=study-default` opened the Material creation context correctly. No create action was clicked.
- Pure SSR probe: both authoring callbacks render Save Evaluation; evaluator-only callback does not. New Study slug rejected by command schema.
- Pure evaluation probe: same Subject/Parameter/Point candidates ordered [18.2,99] → 18.2; reversed →99. No observations were changed or persisted.
- Current authorization source inspected for pre-aggregation scope and audience AND all-source access. No fresh multi-principal browser sign-in or full SQL security regression was performed.
- Supplemental read-only Saved Analysis opening restored exact saved identity `analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8` and displayed its sharing boundary. This confirms one existing saved view, not every access-policy case. Supplemental results: `tmp/product-audit-v1/supplement.json`.
- No full tests/build rerun is presented as audit proof. Product was not edited. Historical passing tests do not establish human comprehensibility.
