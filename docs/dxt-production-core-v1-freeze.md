# DXT Production Core v1 — Final Freeze Review

Review rerun: **2026-09-19 KST**. Decision: **YES**.

**DXT PRODUCTION CORE v1 — FROZEN**

**P0 = 0 · P1 = 0.** Both fresh PostgreSQL lifecycles completed, including application/pool recreation, exact Saved Analysis restoration, persisted reasoning, explicit independent Next Run creation, and editing the new Plan after restart. This freezes the defined Production Core v1 scientific workspace, not enterprise deployment readiness. Stop Core feature development.

## Fresh rerun scenarios

This decision uses new Runs from this rerun, not closure Runs 24/25 or 9/10.

- **Wafer / PHOTO v3:** Reference Studio showed the exact package ACTIVE; Study Setup showed exact reasoning READY. Study Default created **Run 28**. W01 Energy was edited to **40**, saved, and restored after application restart. Actual EXPOSURE **41** did not rewrite Plan40 or VARIED; Plan then displayed its execution lock. BCD **17.05 nm** was recorded at SITE grain. Analysis saved BAR / MEAN / Run grouping context with exact dataset/parameter/subject/result references. After another application/pool restart, saved ID `analysis-view-27bb2679-2dc7-4af8-abcf-a64ca119397c` restored Run28, one Dataset, four Subjects, MEAN, BAR, X=Run order, Group=Subject, unchanged filters and the exact authoritative value. Target Achievement was SYSTEM RESOLVED ACHIEVED; engineer ACCEPT, Decision and Design Next Experiment were USER AUTHORED. Preview proposed W01 **40 → 42**; explicit Create produced **Run 29**. A third application/pool restart restored the new Plan42; it was editable before its own evidence, edited to **43**, saved and reloaded. Source Run28 remains Plan40 / Actual41.
- **Specimen / Material v2:** exact ACTIVE package and READY Study context; Study Default created **Run 11**. The persisted Mix / Coat / Cure / Test context uses the same generic repositories. SP-01 Cure Temperature **125°C** was saved and restored after restart; manual CURE Actual **126°C** remained separate and locked Plan125. Peel Force **24 N** was recorded at SUBJECT grain, with no fake Site or MES dependency. Saved Analysis `analysis-view-26e276ac-84bc-4308-9f09-cd31b1f514d4` restored Run11, one Dataset, four Subjects, exact Peel Force references, MEAN/BAR and grouping/filter configuration after restart. SYSTEM RESOLVED ACHIEVED and USER AUTHORED ACCEPT/Decision/NextAction persisted. Preview **125 → 127** did not itself create a Run; explicit Create produced **Run 12**. After restart its independent Plan127 was editable, changed to **128**, saved and reloaded. Source Run11 remains Plan125 / Actual126.

Fresh source Evaluations and Decisions were reopened after the final application restart. Native PostgreSQL tests separately stop/start the actual database and recreate adapters, then compare Configuration, Study, Runs, evidence, Saved Analysis and Decisions against exact prior records. The next Run's own Actual locking its Plan is covered for both domains in the same fresh native contract.

## New finding during this rerun — corrected

**P1-R1, Saved Analysis missing-ID substitution:** `/analysis?savedView=missing-freeze-rerun` displayed an explicit error but also default DTS result rows/Save View and rewrote the requested URL. Although these were real PostgreSQL values, they were not the requested saved context. This violated fail-explicitly/reproducibility UX.

Minimal correction in `src/features/analysis/workspace.tsx`: requested saved identity must resolve before rendering the analytical surface or replacing its URL; open failures render only the unavailable boundary. The same boundary handles a listed view disappearing or its read failing. No scientific model or Analysis capability was added. Regression test in `tests/workspace-inline.test.tsx` prevents initial default-result rendering for exact saved entry. Live retest confirms missing ID shows only its error and retains its URL; both valid fresh saved IDs still restore correctly. All tests, TypeScript, changed-file lint and both builds were rerun after the correction. **Closed, not an outstanding P1.**

## Frozen lifecycle and boundaries

Reference Studio → Configuration/reasoning readiness → Study Setup → explicit Run creation → editable Plan → Actual and Plan lock → Measurement → Analysis → Saved Analysis → restart/reopen → Evaluation → Decision → NextAction → preview → explicit independent Next Run → restart → editable new Plan.

- **ACTIVE ≠ READY.** ACTIVE is one exact version per `(scopeType, scopeId, stablePackageId)`; different stable packages may coexist in one scope. The live PHOTO/CMP package list and activation contracts confirm that invariant. READY belongs to an exact Study/package pair and requires validated immutable Target bindings and Evaluation/NextAction definitions.
- Study selection alone does not infer scientific meaning. An existing exact context can be reused; a new pair requires explicit registered-proposal review/confirmation and a distinct context identity. No automatic copying/aliasing occurs. Missing context blocks all Run creation before number allocation/insert. Newly authored package tests exercise NOT_READY → invalid confirmation rejection → explicit confirmation → READY and historical immutability. No bootstrap was used in either fresh product flow.
- Reference defines what CAN be used; persisted Study defaults define what WILL normally be used; the Run full snapshot defines what THIS Run uses. Study/activation/revision changes do not rewrite historical Runs. Study Setup and exact packages rehydrate from PostgreSQL after restart.
- Definition revisions, package membership/payload and reasoning contexts are immutable. Study reasoning confirmation and its receipt are atomic; package activation does not require reasoning for every Study.

## All advertised Run sources

Normal `/runs/new` was exercised in production. Preview says **Create Next Run** and resolves repository data; only commit allocates the number.

- **Study Default:** fresh Wafer28 and Specimen11 use persisted Study Setup.
- **Previous:** actual latest persisted Wafer29 was previewed and independently created as **Run30**.
- **Existing:** selected persisted Wafer28 was previewed and independently cloned as **Run31**. This preserves frozen template semantics, not navigation or source mutation.
- **Blank:** **Run32** preserved Study/package/Subjects and zero inherited Operations/assignments/Measurement plan. Its Plan read-back displayed **0 rows**, without fixture substitution. It does not invent a new Operation authoring feature.

Every mode uses UI → Application → RunRepository → PostgreSQL full-snapshot transaction and durable receipt. Preview fingerprint changes fail rather than silently changing the source. The fresh generic contract tests all four modes in Wafer and Specimen, per-mode injected rollback, durable retry, unique numbering under races, exact read-back after database restart and source stability. No advertised mode calls unsupported HTTP snapshot persistence.

## Scientific evidence and reproducibility

Plan and Actual remain separate. Plan saves lock the authoritative Run and reject stale saves once Actual or Measurement exists; the loaded-editable → concurrent Actual commit → stale Plan rejection race passes. FIXED/VARIED is experimental intent; a changed Actual or inherited delta does not redefine it. New Run editability is Run-scoped and ends on its own evidence.

MeasurementExecution → MeasurementDataset → MeasurementValue persists transactionally. Wafer SITE and Specimen SUBJECT use the same adapter, with parent Subject/Run/Study provenance. Measurement query ports are independent of loading the whole Run aggregate. Analysis v1 queries these authoritative values; Saved Analysis stores only whitelisted configuration and exact source references, not copied values. Missing pinned Dataset/representative references produce explicit unresolved evidence, not another source. Native contracts cover missing references, retries, conflicts and post-restart re-query.

Target Achievement remains a computed projection of configured Target and exact summary. Engineer Evaluation is authored interpretation with exact evidence references. Decision is a separate scientific conclusion; NextAction is separate scientific continuation, committed with Decision. No assignee/due-date/WBS/progress model was introduced. NextAction/preview never automatically creates a Run. Explicit creation produces an independent FULL snapshot, exact source/package provenance and INHERITED/CHANGED metadata without copying prior execution evidence.

## Historical identity and legacy isolation

Live historical PHOTO **Run19** and Material **Run4** opened their requested Evaluation identities after all newer runs; they did not resolve latest. Automated routing additionally covers CMP13. Exact old package/revision/reasoning/evidence references survive changed Study defaults, activation and new contexts; native contracts compare historical snapshots after these mutations and database restart.

Manual PHOTO18/CMP12 `/workspace` requests redirect to exact `/engineering-grid` URLs. Those absent database identities return `Saved Run could not be loaded.`; neither legacy fixture authoring nor browser-save/module-store state is mounted. Fixed prototype canonical routes also resolve exact production identities. Primary production navigation targets canonical grids. Demo routes/hooks remain separately composed.

Missing Study entry and missing Run were checked live. Missing package/reasoning/Measurement or Saved Analysis source paths are covered by authoritative contracts; missing Saved Analysis identity was additionally corrected/retested live above. No Browser/InMemory/localStorage/mock fallback exists in the verified authoritative production path.

## Authoritative owners and architecture

- Configuration: `PostgresConfigurationAuthoring`, immutable revisions/graphs and activation records.
- Study: PostgreSQL Study repository and versioned Study Setup storage.
- Run: `PostgresRunRepository`, full snapshot/children, Plan version/lock and creation receipts.
- Execution: `PostgresExecutionRepository`, evidence/current version and receipts.
- Measurement: `PostgresMeasurementRepository`, independent query port and immutable evidence.
- Evaluation: PostgreSQL Evaluation repository, exact reasoning/summary references and authored records.
- Decision: PostgreSQL Decision repository, separate exact scientific conclusion.
- NextAction: separately persisted concept within the atomic Decision transaction.
- SavedAnalysis: `PostgresSavedAnalysisRepository`, refs/configuration/version/receipts.
- Reasoning readiness: exact immutable `reasoning_context` plus `study_reasoning_adoption`, owned by explicit Study commands.

**Remaining Browser-only authoritative owner in this frozen scope: NONE.** Sample registration remains its explicitly labeled non-persisting mock review surface, as documented in the original scope; this review does not promote it into a production authoring feature. Static domain labels/adapters may still be imported by projections; production catalogs, targets, values and evidence are repository-resolved. SQL adapters do not branch by PHOTO/CMP/Material/Wafer/Specimen; Subject kind typing and assignment-kind dispatch are not domain-specific persistence strategies.

UI → Application/Command/Projection → Repository Port → PostgreSQL remains intact. Production composition fails if configuration cannot load. UI does not query SQL or save authoritative data to localStorage. Atomicity/receipts/version checks cover Configuration, readiness, Study, Run creation, Plan, Actual, Measurement, Evaluation, Decision/NextAction, Next Run and Saved Analysis. No partial authoritative state or silent lost update was observed in injected-failure/race tests.

## Verification and evidence

- **248 tests PASS:** 108 domain, 127 workspace, 13 PostgreSQL integration.
- **Native PostgreSQL18 PASS:** fresh new-package Wafer/Specimen lifecycles, all four modes, database restart, rollback, retry/idempotency, concurrency, Plan-lock race, own-evidence lock reset and historical read-back. The first invocation lacked the required binary-path environment variable; configured rerun passed.
- **TypeScript PASS. Changed-file lint PASS. PostgreSQL build PASS. Browser build PASS. `git diff --check` PASS.**
- Repo-wide source lint remains **105 pre-existing diagnostics**. A concurrent lint attempt included transient generated test bundles; rerunning after test cleanup restored the same 105-source-debt baseline. No new source lint debt.
- No broad refactor or new product feature. Product changes in this review are limited to the proven P1-R1 boundary and its regression test.
- [Fresh walkthrough DOM evidence](evidence/production-core-freeze-rerun-walkthrough.json): ordered USER AUTHORED actions, SYSTEM RESOLVED achievement, inherited/changed previews, restart read-backs, historical routes and failure boundaries, including before/after P1-R1.
- [Fresh PostgreSQL diagnostic evidence](evidence/production-core-freeze-rerun-sql.json): exact pins, readiness, evidence counts and Saved Analysis references. The diagnostic supplements the browser flow and native contracts; it alone is not freeze proof.

## P2/P3 and deferred scope

P2, non-blocking: existing 105 lint diagnostics; legacy shared header still says “Mock environment” despite PostgreSQL composition; a duplicate React option-key warning in Material selection; narrow-viewport engineering grids require horizontal scrolling. None changed saved scientific meaning or blocked the fresh loops. No P2 redesign was performed.

Operational scale debt: 10,000 Measurement values / 1,000 Dataset listings are explicit fail-on-limit guards, not silent truncation. High-volume pagination is deferred. Blank remains an empty Plan with the frozen authoring capabilities; general new scientific-catalog authoring beyond registered reasoning proposals is not added by this freeze.

P3/deferred enterprise scope: authentication, authorization, enterprise audit/signatures, object storage, live MES/TAS/RMS/YES, advanced import/export, Analysis v2/Grid-first Analysis, preprocessing, DOE, AI, warehouse/streaming, advanced caching and full high-volume pagination. These are not implicitly delivered by “Production Core v1”.

## Explicit final answers

1. **YES** — explicit Study/package readiness without silent copying.
2. **YES** — ACTIVE remains distinct from READY.
3. **YES** — fresh Wafer28 →29 completed.
4. **YES** — fresh Specimen11 →12 completed.
5. **YES** — all four visible creation modes production-backed.
6. **YES** — missing Study/config/reasoning fails explicitly.
7. **YES** — editable pre-evidence Plan and authoritative post-evidence/race lock.
8. **YES** — Plan differs from Actual without mutation.
9. **YES** — Measurement authoritative and independently queryable.
10. **YES** — Analysis consumes repository values without duplication.
11. **YES** — Saved Analysis exact-source restart restoration; missing-ID boundary corrected.
12. **YES** — system Target Achievement and authored Evaluation distinct.
13. **YES** — Evaluation, Decision and NextAction distinct and traceable.
14. **YES** — explicit independent full-snapshot Next Run.
15. **YES** — new Run editable before its own evidence.
16. **YES** — historical meaning independent of current Study/configuration.
17. **YES** — historical URLs resolve exact requested Run.
18. **YES** — legacy fixture workspace isolated.
19. **NO** — no fallback in the verified authoritative path.
20. **NO** — no frozen authoritative surface missing production backing within the defined scope.
21. **NO** — no Core/Generic Framework/scientific semantics change.
22. **NO** — P0 remaining =0.
23. **NONE** — P1 remaining =0, including corrected P1-R1.
24. **YES** — full production scientific lifecycle loop closed.
25. **YES — DXT PRODUCTION CORE v1 — FROZEN.**

## Post-freeze change policy

Stop Core feature development. Route future requirements through:

1. Configuration.
2. Domain Adapter.
3. Projection.
4. Proven Generic Framework gap.
5. Core Domain change only as a last resort, with explicit impact/reproducibility review.

Preserve immutable historical definitions/evidence, exact pins and independent Plan/Actual semantics. Fix proven correctness defects with narrow regression coverage; do not use P2 polish or enterprise roadmap requests to reopen frozen Core by default.

---

## Original failed review — historical evidence (superseded by the rerun above)

### Original review record

Review date: 2026-09-18–19 KST. Decision: **NO — not frozen**.

Closure update (2026-09-19): the three findings below are preserved as the original review evidence. P0-01 and P1-01/P1-02 have now been addressed and validated with fresh PHOTO v3 / Material v2 lifecycles, explicit reasoning confirmation, all four production creation sources and canonical route isolation. See [blocker closure and 21 answers](dxt-production-core-v1-freeze-blocker-closure.md). **Ready to rerun final review; this does not retroactively change the original NO or declare FROZEN.**

## 1. Freeze decision

Remaining: **P0 = 1, P1 = 2**. Native PostgreSQL contracts pass, but the fresh product walkthrough does not close the lifecycle. Passing slice tests is not equivalent to passing the continuous product loop.

- **P0-01: newly adopted packages cannot reach Evaluation.** Fresh DTS Run 23 pins `config-package-photo-v3`; fresh Material Run 8 pins `config-package-material-rd-v2`. Both save Actual and Measurement and restore Saved Analysis, then display `Exact scientific reasoning definitions are not provisioned for this Run.` SQL confirms no exact `(study_id, package_version_id)` reasoning context. `readReasoningContext` correctly fails closed; only the explicit bootstrap script provisions these contexts. Configuration activation and Study adoption do not establish or validate this downstream prerequisite. This blocks Evaluation → Decision → Next Action → Next Run for both fresh scenarios. Existing v1 runs remain resolvable. A package being ACTIVE does not currently imply full lifecycle readiness.
- **P1-01: advertised Run creation sources are not production-complete.** `/runs/new` defaults to Previous Run; Previous/Existing/Blank call HTTP `run.saveSnapshot`, which is unsupported. The live default path produced `Run could not be created. Retry uses the same request identity.` Previous/Existing previews use fixture context. The heading still predicts Run 19 after Run 23 exists. A missing Study read also retains the initially constructed setup instead of reporting missing configuration. Study Default creation itself is server-authoritative and worked.
- **P1-02: legacy fixture authoring surfaces remain exposed in production.** `/series/dts-improvement/runs/18/workspace` renders the PHOTO fixture and a browser-save claim under PostgreSQL composition. The shared legacy hook starts with a fixture, retains it on null/failed repository reads, and keeps optimistic edits in a module store when saves fail. CMP Run 12 has the same route/hook pattern. These surfaces do not meet the fail-explicitly production contract, even though the newly created Engineering Grid path does.

One additional defect was corrected: fixed routes for DTS Run 19, CMP Run 13, and Material Run 4 omitted `runNumber`, resolving the latest Run instead of the URL's historical Run. The three pages now pass their exact number. A route regression test covers all three, and live historical Wafer/Specimen URLs now show their requested Run and persisted reasoning.

No contexts were copied from mocks or silently inherited from another package to make the new flows pass. Closing P0-01 requires an explicit authoritative target/reasoning-context provisioning and validation boundary for package adoption; it is not safe to infer that scientific targets remain identical. The entry/legacy findings require completing or explicitly separating their supported production boundaries. Those changes are not hidden inside this final review.

## 2. Frozen Production lifecycle candidate

The contract under review remains:

Reference → Study Setup → new Run → editable Plan → Actual/Plan lock → Measurement → Analysis → Saved Analysis → Evaluation → Decision → Next Action → preview → explicitly create independent Next Run → editable new Plan.

This review proves the fresh UI sequence through reopened Saved Analysis in both domains. **The remaining fresh sequence is blocked, not passed.** Earlier-package integration tests exercise reasoning and next-Run behavior, but do not replace this acceptance failure.

## 3. Production persistence owners

- Configuration: `PostgresConfigurationAuthoring`; immutable revisions/packages, authoring receipts, activation records.
- Study: PostgreSQL Study repository and `study-setup-storage`; immutable setup versions and current pointer.
- Run: PostgreSQL Run repository; full snapshot, exact package, normalized subjects/operations/assignments, version and receipts.
- Execution: `PostgresExecutionRepository`; execution records, current state and command receipts.
- Measurement: `PostgresMeasurementRepository`; execution/dataset/value, representative and validity records; independent query port.
- Evaluation: `PostgresEvaluationRepository`; immutable evaluation identities, exact summary/context references and current projection.
- Decision: `PostgresDecisionRepository`; immutable decision identity and exact evidence references.
- NextAction: separate persisted concept owned by the Decision transaction, not a task-management aggregate.
- SavedAnalysis: `PostgresSavedAnalysisRepository`; configuration plus exact source references and optimistic version.

All nine owner implementations exist. That does **not** mean every frozen product surface is backed end to end: P0-01 and P1-01/02 remain. Target/reasoning-context authoring for new package pins is bootstrap-only. Sample registration explicitly describes itself as a non-persisting mock review; it is not counted as a newly completed production authoring feature or silently included in this freeze.

## 4. Configuration / Study / Run boundaries

Reference determines what CAN be used, Study what WILL normally be used, Run what THIS Run uses. The verified Study Default command reloads persisted setup/context, resolves exact applicability, allocates the Run number and writes a full independent snapshot transactionally.

Reference Studio after restart shows PHOTO v3 and Material v2 ACTIVE, their older versions INACTIVE, and CMP v1 ACTIVE alongside PHOTO in the same AREA. Tests cover immutability, new revisions preserving old definitions, failed activation rollback, and the Phase 2.1 uniqueness key `(scopeType, scopeId, stablePackageId)`.

During this review, Exposure Dwell and Cure Dwell Offset Study defaults changed from 36 to 38. Fresh Runs 23/8 inherited 38. Earlier Runs remain pinned to their own saved values and package versions. Definition/activation authoring was exercised by native contracts; the live review verified the already authored packages rather than adding new scientific definitions.

## 5. Plan edit / lock contract

Fresh Runs have an editable Plan. Save uses expected aggregate version, durable command identity and a Run root lock. Evidence writers acquire that same root lock. The save transaction checks historical Actual, Measurement, Evaluation or Decision existence, not only a UI flag/current pointer. Native two-connection race proof rejects a stale Plan save after Actual commits. Measurement without Actual also locks Plan.

Run 23 W01 Energy changed 35 → 36; Run 8 SP-01 Cure Temperature changed 120 → 121. An application restart recreated composition/pool and both values reappeared. Actual then locked both Plans. No Plan lock boolean was introduced.

## 6. Plan versus Actual contract

Run 23: Plan Energy 36, Actual 37. Run 8: Plan Cure Temperature 121, Actual 122. Manual Actual did not rewrite planned values or FIXED/VARIED intent. Changed remains distinct from VARIED. Existing automated contracts verify complete snapshot equality across Actual writes and persisted retry handling.

## 7. Measurement contract

Fresh Wafer W01: BCD 17.1 nm, SITE S01 with coordinates 0/0. Fresh Specimen SP-01: Peel Force 5.9 N, SUBJECT grain, no Site. Both are real manually authored PostgreSQL datasets and observations.

MeasurementExecution → MeasurementDataset → MeasurementValue remains independent of Run snapshots. RAW/SOURCE and DERIVED provenance, representative-result references and validity history remain representable. Query/validity/rollback tests pass. Missing Subjects display `—`/MISSING rather than zero. Run loading does not bulk-load measurement observations.

Bounded queries fetch limit+1 and throw rather than silently truncate: 10,000 values, 1,000 listed datasets. Future paging/streaming is P2 operational work.

## 8. Analysis / Saved Analysis contract

Analysis queries MeasurementRepository and projects existing evidence. Both new observations appeared alongside historical results; untouched Subjects remained missing.

Saved views created in this review:

- Wafer: `analysis-view-931f2616-9225-4453-95ea-6b5a699f18fb`, Runs 19/23, BCD, four Subjects, BAR/MEAN.
- Specimen: `analysis-view-4ce5fe4b-d88e-415e-b527-8a157aa42242`, Runs 4/8, Peel Force, four Subjects, BAR/MEAN.

After navigating away and restarting the application/pool, opening each ID restored selection, exact dataset/parameter/representative references and visualization. The saved record contains configuration/references, not copied scientific values. The SQL evidence artifact lists those exact references. Missing-source and mismatched-reference rejection is covered by repository contracts; no substitute source is selected.

## 9. Evaluation / Decision / NextAction contract

Target Achievement is a computation from target configuration and authoritative representative evidence. It is not the human Evaluation. Decision stores the selected evidence references; later re-evaluation does not rewrite old decision evidence. NextAction is scientific continuation, with no assignee/due-date/WBS semantics.

Historical Run 19 and Material Run 4 restore their persisted Evaluation/Decision after restart and after current Study/package changes. Native tests verify immutable evidence references, concurrency, idempotency and rollback. **Fresh Runs 23/8 cannot reach this stage because of P0-01.** Do not interpret these historical/test successes as fresh E2E completion.

## 10. Next Run loop

Native contracts prove preview does not create a Run; explicit create uses a durable receipt, independently allocates a Run, persists a full snapshot, preserves source provenance/INHERITED/CHANGED and uses the source's exact package policy. Source data stays unchanged. A new Run has no inherited downstream evidence, so its Plan is editable; its own evidence locks it.

Fresh review Runs 23/8 have no authored Evaluation/Decision/NextAction and no next Run created from them. Preview/create/restart/new-Plan steps are **blocked**, not waived. The earlier v1 Run 19→20 and Material Run 4→5 remain historical evidence only.

## 11. Generic Wafer / Specimen proof

Both fresh cases use the same HTTP application ports and PostgreSQL adapters. Wafer uses SITE Measurement; Specimen uses SUBJECT Measurement with manual equipment and no MES/Site requirement. Searching reusable application/PostgreSQL code found no PHOTO/CMP/WAFER/SPECIMEN conditional branches in persistence behavior; subject-kind type declarations are not name-based dispatch. Fixture provisioning and domain projection metadata are explicit and separate from authoritative reads.

Both cases fail at the same missing exact reasoning-context boundary. Thus generic persistence is demonstrated, but complete generic lifecycle acceptance is **PARTIALLY** proven.

## 12. Transactions / concurrency / idempotency

Audited commands: configuration authoring/activation, Study save, create Run, save Plan, record Actual, record Measurement, Evaluation, Decision/NextAction, create Next Run, save Analysis. They execute through adapter transactions. Aggregate/root locks and expected versions guard mutable state; evidence revisions are append-only. Successful retry receipts return the original result; changed payload/reused identities or stale versions are rejected. NextAction and Decision commit together.

Native PostgreSQL tests exercise mid-write failures, concurrent allocation, lost-update rejection, Plan/evidence races, durable receipts, and a real database stop/start with new pool/adapters. Unsupported HTTP commands fail rather than fabricate persisted success. Their presence in the normal UI is nevertheless P1-01.

## 13. Historical reproducibility / repository boundary

Exact Run snapshots, package pins, definition revisions and evidence references survive mutable current Study/configuration changes and restart. Fixed historical URL routing was the only product correction in this review. The native test suite verifies old/new snapshot equality after actual database restart.

The verified created-Run path is UI → Application/Command/Projection → repository port → HTTP boundary → PostgreSQL adapter. No direct SQL or localStorage access was found in feature/shared UI. Production composition has no browser-repository fallback: initialization/read failures are explicit. There is **no authoritative fallback in the fresh path verified here**, including its Evaluation failure. Legacy fixture routes are a separately reproduced violation and remain P1-02.

## 14. Known P2/P3 debt and validation

P2: explicit bounded Measurement queries; misleading `Mock environment` shell label in PostgreSQL mode; ambiguous duplicate material option labels/React keys; static Run-number preview; pre-existing lint debt; legacy prototype navigation cleanup. These do not excuse the separately listed P0/P1 failures.

Validation after the historical-route correction:

- Full suite: 244 passing tests (108 domain, 124 workspace, 12 PostgreSQL/PGlite groups).
- Native PostgreSQL 18 integration: pass, including repository contracts, restart, rollback, retries, optimistic conflicts, lock race and Saved Analysis exact references.
- TypeScript: pass. Changed-file lint: pass. PostgreSQL and browser production builds: pass. `git diff --check`: pass.
- Read-only `scripts/review-production-core.mjs`: **exit 1, intentional readiness failure**; two current Study pins lack exact reasoning contexts. This is not a passing acceptance test.
- Fresh live Wafer and Specimen acceptance: **blocked at Evaluation**. UI refresh/application restarts were performed; native tests additionally restart PostgreSQL itself.

Repository-wide lint has 105 pre-existing errors: no-floating-promises 84; prefer-tag-over-role 10; restrict-template-expressions 3; no-img-element 2; react-compiler 2; anchor-has-content 1; click-events-have-key-events 1; label-has-associated-control 1; no-noninteractive-element-interactions 1. No new violation was introduced. This debt is not the reason for withholding Freeze.

Review evidence: [SQL read-back](evidence/dxt-production-core-v1-review.json), [live walkthrough](evidence/dxt-production-core-v1-walkthrough.md). Logs reside in `/private/tmp/dxt-freeze-{tests,native,ts,changed-lint,lint-all,build-postgres,build-browser}.log`.

## 15. Explicitly deferred enterprise work

Authentication, authorization/organization policy, enterprise audit, electronic signatures, object storage, live MES/TAS/RMS/YES integrations, advanced import/export, Analysis v2/grid-first analysis, advanced preprocessing, DOE, AI, warehouse/event streaming/caching and full high-volume pagination are deferred. None caused this negative freeze decision.

## 16. Post-freeze change policy

Once the actual blockers are resolved and both fresh loops rerun successfully, use: Configuration → Domain Adapter → Projection → Generic Framework gap → Core Domain change last. No Core/Generic/frozen UI semantic redesign occurred in this review. No freeze declaration is issued today.

## Final 23 answers

1. Production Configuration authored/restored: **YES**, within the implemented configuration command set; lifecycle readiness gap is P0-01.
2. Production Study Setup authored/restored: **YES**.
3. Fresh Run created/edited before evidence: **YES**, using Study Default.
4. Actual locks Plan without mutation: **YES**.
5. Measurement authoritative/independently queryable: **YES**.
6. Production Measurement feeds Analysis: **YES**.
7. Saved Analysis exact-reference restoration without copied values: **YES**.
8. Target Achievement versus Engineer Evaluation distinct: **YES**.
9. Evaluation/Decision/NextAction distinct and traceable: **YES** for provisioned contexts; fresh-package authoring is blocked.
10. Explicit independent full-snapshot Next Run: **YES** in native contracts/historical provisioned contexts; not completed from fresh review Runs.
11. New Next Run editable before own evidence: **YES** in repository/lock contracts; fresh review continuation is blocked.
12. Both subjects complete the same generic Production lifecycle: **PARTIALLY**; fresh UI loops stop at Evaluation.
13. Historical reproducibility independent of mutable current context: **YES**, after exact-route correction.
14. Critical writes transactional: **YES**.
15. Implemented retry-sensitive commands idempotency-safe: **YES**.
16. Required optimistic concurrency enforced: **YES**.
17. Browser/InMemory/localStorage/mock fallback in the verified fresh authoritative path: **NO**. Legacy exposed routes outside that path do fall back and block product-wide Freeze.
18. Any frozen authoritative surface lacking complete Production backing: **YES** — exact reasoning-context authoring/adoption, advertised non-default Run creation, and legacy fixture authoring. All nine principal SQL adapter classes exist; completeness is at the surface/command boundary, not just class existence.
19. Core/Generic/frozen UI semantics changed: **NO**; historical URL correction restores intended identity.
20. P0 remaining: **YES**, P0-01.
21. P1 remaining: **P1-01 unsupported advertised Run creation; P1-02 exposed fixture authoring/failure fallback.**
22. Complete Production scientific loop closed: **PARTIALLY**.
23. Ready to Freeze: **NO**.
