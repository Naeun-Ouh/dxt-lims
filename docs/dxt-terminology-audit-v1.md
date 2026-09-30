# DXT Terminology Audit v1

Audit date: **2026-09-26 KST**. Scope: current working tree, PostgreSQL UAT at `localhost:3200`, with DXT Production Core v1 frozen. This is a decision document, not a new freeze sign-off. No product, Domain, persistence, authorization or UI code was changed in this audit. No scientific save/create/activation/share command was executed.

Evidence is labeled **source inspection**, **live read-only UI**, or **pure local probe**. Prior freeze/UAT reports are historical context, not fresh proof. The audit is broad but does not claim exhaustive runtime testing of every role, route, dataset shape, conflict or every individual string. Authenticated enterprise deployment, load and penetration testing are outside this review.

## Canonical language

Use **Study, Run, Subject, Operation, Plan, Actual, Measurement, Analysis, Evaluation, Decision, Next Action** consistently. Specialize Subject to Wafer or Specimen when the configured domain makes that useful; do not replace generic scientific identity with Lot or Slot. Exact technical identifiers belong in provenance when they answer a real traceability question. No automatic rename was performed.

| Current term | Problem | Recommended user-facing term | Rationale |
| --- | --- | --- | --- |
| Study / Series | UI says Study but paths/code/errors say Series | Study | One user-facing investigation term; keep technical routing internal. |
| Run / Experiment | Experiment may mean Study, Run or design scope | Run; Experiment scope where intended | Distinguish iteration identity from selected operation range. |
| Subject | Recording target, membership, filter and jump use same word | Recording subject / Selected subjects / Jump to column | Label the action, retaining canonical Subject. |
| Operation / Process Step | Equivalent backbone names differ across older screens | Operation | Keep process-step ID in provenance only. |
| Plan / Planned | Intent sometimes reads like observed data | Plan / Planned value | Do not imply execution; especially default actual inputs F12. |
| Actual / Execution | Tab Actual; dashboard Execution | Actual (execution records) | Provide plain-language mapping, not a new concept. |
| Measurement / Result | Raw values, summary and dataset often all called result | Measurement value / Summary result | Separate observation from aggregation. |
| Analysis / Analyze | Workspace vs verb navigation | Analysis / Open Analysis | No measurement or interpretation is saved by navigation. |
| Evaluation / Judgment | May be confused with calculated achievement | Engineer Evaluation | User-authored interpretation distinct from calculation. |
| Decision / Conclusion | Two labels can appear equivalent | Decision; rationale as separate field | Scientific conclusion, not approval workflow. |
| NextAction / Next Action | Internal concatenated form appears in technical text | Next Action | Scientific continuation, not task assignment. |
| Reference Set / Configuration Package | Same exact package described differently | Configuration package; version label beside it | Consistent selection noun across Reference, Study and Run. |
| Definition / Revision | A new definition creates Revision1; rename may imply mutation | Definition / Definition revision | Preserve immutable version meaning. |
| Applicability / Resolver | Architecture-oriented terminology | Where this definition can be used; Test availability | Engineer intent before implementation. |
| Ready to Activate / Reasoning Readiness / READY | Package validation and exact Study readiness can be conflated | Package ready to activate / Study ready for lifecycle | Two scopes, not one universal Ready flag. |
| Target / Target Achievement | Sometimes no indication calculated | Target / Target achievement (calculated) | Keep rule vs assessed observation. |
| FIXED / VARIED | May be inferred from differing actual values by user | Fixed / Intentionally varied | Explicit experimental role; not actual deviation. |
| Inherited / Changed | Could mean prior Run delta or actual deviation | Inherited from Run N / Plan changed / Actual differs | Qualify baseline of comparison. |
| RAW / SOURCE / DERIVED | RAW is aggregation; SOURCE is dataset origin | Individual measurements / Source dataset / Derived dataset | Different axes; do not rename SOURCE to RAW blindly. |
| Grain / SUBJECT_SUMMARY | Implementation enum appears as task label | Measurement level: Subject or Site; Subject summary | Aggregation is not experimental subject type. |
| Parameter | An input variable and a measured quantity can share this term | Condition parameter / Measurement parameter | Qualify role when selecting; preserve exact definition identity in depth. |
| Unit | Symbols may be absent from charts or differ across selected parameters | Value with unit; unit-labeled axis | Never imply incompatible quantities are comparable (F06). |
| Site / Position | Coordinates can look identical | Measurement site / Experiment position | No automatic scientific equivalence. |
| Dataset / dataset ID | Full ID dominates table/header | Measurement dataset with short friendly label | Retain full ID in Inspector/copy detail. |
| Representative result / subject summary | Unclear which result and aggregation | Summary result · Mean/Median/etc. | Show exact chosen dataset; F03 cannot be solved by wording alone. |
| Saved View / Saved Analysis / SAVE ANALYSIS VIEW | One stored artifact has three names | Saved Analysis; Save analysis / Update saved analysis | Views are saved context, not copied data. |
| snapshot / full snapshot | Implementation language in creation instructions | Independent copy of this Run’s plan | Keep full snapshot in technical provenance. |
| package pin / exact pin | Unfamiliar mechanism foregrounded | Configuration version used by this Run | Exact ID remains available in details. |
| repository / aggregate | Infrastructure errors can escape | Could not load/save; reload current version | Include technical details expandable; do not hide actionable failure. |
| USER AUTHORED / system-resolved | Author/source metadata competes with task | Entered by engineer / Calculated from target and result | Useful provenance but secondary to work. |
| Draft shell / manifest / Assemble Version | Developer package construction vocabulary | Create draft package / Create package version | Explain immutable creation and release in supporting text. |
| Add to Draft Rule Set | Actually creates next immutable version | Create Rule Set Version | Predict durable action F18. |
| Mock environment / static user name | Misrepresents persistence/identity | Accurate pilot environment + current server principal | Never derive server permissions from display name. |
| Missing / Invalid / Excluded | Distinct states risk being summarized as missing | Not recorded / Invalid value / Excluded with reason | Missing is not zero, exclusion is not deletion. |
| Record Measurement / Continue / Details | Navigation, mutation and depth sometimes indistinct | Open Measurement / Save measurement / Selected cell details | Use verb that predicts side effect. |
| Recipient ID / PRINCIPAL | Enterprise IDs required without user context | Person / Department / Area with recognized identifier | Current implementation still requires exact ID; recommendation not implementation. |

Catalog wording suggestions are grouped under **F16 · P2 · TERMINOLOGY ISSUE**, with F17/F18 for the named environment and rule-version problems. Inventory entries describing correct behavior are not additional findings; action defects reference the classified logic register.

## Primary button/action inventory

| Surface / current action | Navigation or mutation | Assessment / recommendation | Visual priority |
| --- | --- | --- | --- |
| Home: Continue | Navigation | Adequate with Study/Run/stage context; no save | Primary |
| Study: Create Next Run | Navigation to creation | Does not create immediately; open creation wording can help | Primary |
| Reference: Create Definition / Create Revision1 | Open form / durable creation | Distinguish form opening from commit | Primary commit |
| Reference: Create New Revision | Durable creation | Good; explain immutable old revision | Primary |
| Applicability: Validate Rule | Read-only validation | Good; does not persist | Secondary |
| Applicability: Add to Draft Rule Set | Durable new version | Misleading F18 | Primary create |
| Package: Create Draft / Assemble Version | Durable creation | Explain two separate artifacts; no activation yet | Secondary / primary by current step |
| Package: Validate / Activate vN | Read-only / global version activation | Scope/impact must be clear; ACTIVE not Study READY | Validate secondary; activation primary |
| Package: Deactivate | State-changing | Not deletion; may affect future selection, not old pins | Caution/secondary |
| Study: Add Item / Remove from Study Setup | Immediate auto-save | Explain immediate effect on future Runs | Secondary / removal caution |
| Study: Confirm reasoning for selected Package | Durable immutable adoption | Too technical but action is explicit | Primary when blocked |
| Run entry: Review Inheritance | Read-only preview | Good | Primary first step |
| Run entry: Create Run & Open Plan | Create then navigate | Clear authoritative commit | Primary |
| Plan: Save Plan | Explicit save | Clear; scope confirm also saves draft edits F14 | Primary |
| Plan: Apply focus | View-only | Good current helper text; not persistent science | Secondary |
| Plan: Confirm Experiment Scope | Save scope plus pending plan edits | Hidden coupled commit F14 | Primary in scope mode |
| Actual: Save execution record | Persist evidence | Clear after recent fix; defaults need review | Primary |
| Actual: Go to Measurement | Navigation | Clear; does not save current form | Secondary/navigation |
| Measurement: Save Measurement | Persist evidence | Clear label but missing primary style F20 | Should be primary |
| Measurement: Analyze | Navigation | Open Analysis makes destination explicit | Secondary |
| Analysis: Save View / Save | Create saved context | Use Save Analysis; do not imply measurements copied | Secondary opener / primary commit |
| Analysis: Update Saved View | Persist config version | Distinct from Save as new; clear permission context needed | Secondary |
| Analysis: Continue to Evaluation | Navigation | Clear for one selected Run | Primary continuation |
| Sharing: Add recipient / Save sharing | Stage / persist | Distinguish staging from effective access | Secondary / primary |
| Sharing: Revoke all sharing | Immediate mutation | More consequential than local remove; visually distinguish | Caution |
| Evaluation: Subject Evaluation | No handler / selected display mode | Looks actionable but is a static active label | Status/tab, not primary |
| Evaluation: Save Evaluation | Persist interpretation | Clear, but F01 hides it for independent evaluator | Primary |
| Decision: Save Decision & Next Action | Atomic joint persistence | Good two distinct concepts named; does not execute action | Primary |
| Continuation: Preview Next Run | Read-only | Clear proposal, not creation | Primary continuation |
| Preview: Create Next Run | Durable create if callback exists | F02 can falsely report success; wording alone insufficient | Primary |
| Additional measurement: Create Measurement Plan | Local prototype | Creates no persisted plan F22; explicit prototype qualifier needed before action | Not production primary |
| Back / Current Workspace | Navigation | Recent Grid fix names Operation workspace or Study & Runs; other return links retain context | Secondary |
| Details / Inspector | Depth | Specify selected cell/result; some disabled readers cannot inspect F15 | Secondary |

## Top 10 terminology decisions

1. Saved Analysis vs Saved View: one stored artifact name.
2. Study vs Series: use Study in user language.
3. Actual default values: do not imply observations independently verified.
4. Grain vs Summary vs Subject: separate location and aggregation.
5. Reference Set vs Package/version: coherent naming and exact traceability.
6. Ready to Activate vs Study lifecycle Ready: independent statuses.
7. Add to Draft Rule Set: reveal immediate new version creation.
8. USER AUTHORED/system resolved: secondary provenance, not dominant instructions.
9. snapshot/package pin/dataset IDs: move mechanism into appropriate depth.
10. Mock environment/static actor: display actual runtime identity.

Evidence: [src/shared/ui/workspace.tsx:48](/Users/naeunouh/Documents/ChatGPT/LIMS/src/shared/ui/workspace.tsx:48) · [src/features/reference-studio/applicability-view.tsx:444](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/reference-studio/applicability-view.tsx:444) · [src/features/experiment-series/study-setup-workspace.tsx:73](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/study-setup-workspace.tsx:73) · [src/features/experiment-series/production-run-entry.tsx:11](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/experiment-series/production-run-entry.tsx:11) · [src/features/run-registration/actual-execution-grid.tsx:301](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/actual-execution-grid.tsx:301) · [src/features/run-registration/measurement-execution-grid.tsx:154](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/measurement-execution-grid.tsx:154) · [src/features/run-registration/evaluation-execution-grid.tsx:210](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/run-registration/evaluation-execution-grid.tsx:210) · [src/features/analysis/workspace.tsx:277](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/workspace.tsx:277) · [src/features/analysis/sharing-control.tsx:6](/Users/naeunouh/Documents/ChatGPT/LIMS/src/features/analysis/sharing-control.tsx:6)

Semiconductor terms were not observed on canonical Material lifecycle pages in this read-only sample. `SEMICONDUCTOR R&D` remains the shared header default and old prototype routes contain Wafer-specific terms; these must not be reused for a new generic entry without a domain context.
