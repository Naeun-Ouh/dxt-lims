# PR #12 — Execution Readiness policy reset

Date: 2026-11-13. Baseline: `70e935c`. Scope: Issue #11 / PR #12 only.

Authority: [Product Policy Reset](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-6630802566), superseding the mandatory initial-Target journey. This report supersedes readiness instructions in earlier PR #12 UAT preparation/blocker notes; their recorded human observations remain historical evidence.

## TASK

Enable a newly persisted Study to save explicit execution structure and create its first exploratory Run without Target, Evaluation or Next Action prerequisites. Keep optional initial Evaluation Criteria authoring and its approved provenance boundary.

## STATUS

Implemented and technically verified. **HUMAN UAT REQUIRED — DO NOT MERGE.** Prior Human UAT remains FAIL; acceptance of this revised policy is NOT RUN. Every browser result below is agent-operated technical verification, not human acceptance.

## DISCOVERY / RETAINED

Discovery preceded changes. No new schema, domain model or authorization expansion was needed.

| Existing implementation | Decision |
| --- | --- |
| Explicit Subject ID/label authoring | Retained; no normalization or generated Subjects |
| Exact applicable Operation selection and ordering | Retained |
| Explicit assignment value/intent persistence | Retained; no fabricated values |
| Immutable Study Setup revisions, command receipts and optimistic concurrency | Retained |
| Exact configuration/profile/Subject-type resolution | Retained |
| Generic persisted Study routes | Retained |
| Authoritative first-Run preview, fingerprint, atomic create, idempotency and readback | Retained; readiness check replaced within the bootstrap boundary |
| Migration 015 | Retained unchanged for optional initial Evaluation Criteria provenance and atomic command receipt |
| EDIT_STUDY_SETUP / MANAGE_REASONING_CONTEXT / CREATE_RUN | Retained as independent explicit capabilities |

The former mandatory dependencies were:

- `StudyBootstrap`: preview depended on combined scientific `state.readiness`.
- `readBootstrap`: unconditional `Measurement plan` structural prerequisite.
- `previewPersistedCreation`: unconditional `studyReadiness`.
- Run creation transaction: unconditional `requireStudyReadiness`.
- `reasoningPrerequisites`: required a Next Action reference alongside Target/Evaluation.
- `initialReasoningSchema`: required at least one Next Action ID.

Migration 015 remains useful: it proves who explicitly confirmed the optional initial criteria, enforces immutable receipt/idempotency, and preserves historical context pins. No migration was added, edited or removed.

## REMOVED FROM FIRST-RUN GATE

For Studies created through the persisted Study creation/bootstrap boundary, first-Run preview and server-side creation no longer require a scientific reasoning context, Target, Evaluation reference, Decision or Next Action. An absent Measurement plan is allowed when no Measurement Operation is selected.

The boundary is detected from the existing persisted `study-create:` receipt, not a list of fixture slugs. Imported/legacy seeded workspaces retain their existing lifecycle contract; their incomplete historical execution metadata is not silently repaired, reinterpreted or supplemented. Migrating those legacy workspaces is outside this new-Study/first-Run correction.

## READINESS MODEL

| Layer | Computation | First-Run effect |
| --- | --- | --- |
| Execution | Persisted Study exists; at least one Subject; ordered Operations; exact compatible package/profile/Subject type; required assignments from exact applicability validation profiles; explicit values valid for each participating Subject | Sole gate |
| Measurement | Selected Measurement Operations have a plan, compatible parameter/point and required supporting parameters; otherwise NOT_CONFIGURED | Only the selected acquisition intent contributes prerequisites to Execution |
| Evaluation | Optional explicitly entered Target plus compatible Evaluation references | Never gates exploratory first Run |
| Continuation | Decision / Next Action after interpretation | Never gates first Run; no new continuation workflow or persisted readiness state |

`execution-readiness.ts` is a derived application projection; it neither writes data nor supplies defaults. Preview and creation recompute against exact persisted configuration. Creation checks inside the existing transaction before Run allocation/insertion. Participation membership controls which Subjects require execution conditions; non-participation does not become missing evidence.

Optional Evaluation Criteria are collapsed by default. Their existing explicit-confirmation boundary still requires saved complete execution structure and eligible references. Confirmation can send `nextActionIds: []`. Existing zero-context/zero-Run initialization and historical immutability remain intact.

## ERROR MESSAGE CHANGES

Identified leak paths: generic API 503 `Production repository request failed.`, HTTP fetch/JSON errors and forwarded storage errors, component `error.message`, and the application provider's repository loading/failure copy.

- Unknown transport/storage errors become action-specific messages for Setup, Evaluation Criteria and Run preview/create.
- Known input failures explain duplicate Subject IDs, missing/incompatible Measurement parameter/point, unavailable conditions, or explicit Target input.
- Permission failures ask the researcher to contact the Study manager; no automatic grants.
- Conflicts preserve entered values and ask the researcher to review the latest saved state.
- The application loading/error surface says workspace, not repository.
- Disabled optional criteria explain unsaved Setup, required execution conditions, missing eligible references, busy state or permission. Missing CREATE_RUN has its own visible explanation.

Example KO fallback: `설정을 저장하지 못했습니다. 입력값을 확인한 후 다시 시도해 주세요.` Technical details remain implementation evidence rather than researcher-facing copy. This is the bounded bootstrap/transport cleanup, not an audit of every legacy error message.

## VARIED LABEL CHANGE

- KO VARIED / Intentionally Varied: **실험 변수**.
- KO FIXED / Fixed: **고정 조건**.
- Definition/tooltip: **비교를 위해 이번 실험에서 의도적으로 값을 달리하는 조건**.
- Shared dictionary keys are reused. Persisted `VARIED` / `FIXED`, IDs, units and values remain unchanged.
- The obsolete Next Action selection was removed from initial criteria authoring, not from the continuation domain.

## VALIDATION

| Verification | Result |
| --- | --- |
| Focused execution readiness and bootstrap feedback suites | PASS (4 + 6 tests), also included in full run |
| Full repository tests | PASS: 330 tests, 0 failed, 0 skipped; includes 23 PostgreSQL/PGlite contracts |
| Native PostgreSQL 18 contracts | PASS: native adapter suite including Wafer/Specimen bootstrap, authorization, concurrency, rollback, idempotency and historical immutability |
| TypeScript | PASS for canonical app/src/tests/config sources using an extending temporary config excluding ignored temporary server copies; repository tsconfig unchanged |
| Changed-file lint | PASS |
| Production client/server build | PASS |
| `git diff --check` | PASS |

Contracts now cover process-only exploratory creation with no Target/Measurement/Next Action, optional Target with an empty Next Action list, denied creation, required-condition omissions rejected by both preview and direct server creation with zero persisted Runs, immutable optional criteria receipts, and exact Run readback. Error tests cover internal transport/storage messages and localized labels.

### Agent browser verification — isolated database copy only

All writes used `dxt_pr12_policy_agent_20261113`, copied from the preserved UAT database, with its existing explicit grants. Separate servers: researcher 3218, no-reasoning 3219, no-run 3220. Test values are synthetic software inputs in that copy, not scientific defaults or evidence.

| Scenario | Observed result |
| --- | --- |
| Specimen, no Target | Existing copied Subject `1234`, Mix Formulation `F-BASE-01`; explicitly selected Mixing Speed and entered `500`. Save moved revision 5→6; Execution READY, Measurement NOT_CONFIGURED, Evaluation unset. Preview→create Run 1→Plan readback succeeded. Zero criteria records. |
| Wafer required conditions | Entered `AGENT-W01`, `AGENT-W02`, selected Exposure. Saving without required Focus/Energy produced specific not-ready reasons. Explicit Focus `0`, Energy `35` satisfied the requirements. |
| Measurement input error | Added CD-SEM but omitted point/parameters. Save displayed actionable selection guidance and preserved entered data. Selected POST, BCD, Chip index X/Y; save succeeded. |
| Wafer optional Target | Explicit BCD / POST / MEAN / GTE / `1 nm` plus eligible Evaluation reference. No Next Action input. Confirmation, preview, Run 1 creation and Plan readback succeeded. Exactly one criteria record with zero Next Action references. |
| No criteria permission | Optional confirmation disabled with explanation. After explicit required Focus was saved, first-Run preview remained enabled despite no MANAGE_REASONING_CONTEXT. |
| No Run permission | Preview disabled with visible KO instruction to request Run creation access. No creation occurred. Server denial also verified by contracts. |
| KO/EN | Both bootstrap locales exercised; approved KO labels/tooltip covered by localization tests. |

Read-only database reconciliation after verification:

| Database / Study | Setup revision | Runs | Criteria |
| --- | --- | --- | --- |
| Original Human UAT / specimen | 5 | 0 | 0 |
| Original Human UAT / wafer | 1 | 0 | 0 |
| Isolated agent copy / specimen | 6 | 1 | 0 |
| Isolated agent copy / wafer | 3 | 1 | 1 |

Original servers 3212–3214 and saved Human UAT data were not reset or upgraded during this verification. Port 3218 is an agent verification copy, not a fresh human acceptance environment. Do not treat the old 3212 server as serving this new commit.

## HUMAN UAT REQUIRED

Retest the approved journey with a human: Study → explicit Subjects → ordered Operations → required conditions → Save Setup → Execution Ready → Preview → Create first Run. Run the no-Target exploratory path first, then the optional-criteria and denied-permission paths. Ask whether the separate readiness messages and `실험 변수` meaning are understood. Technical automation does not establish usability acceptance.

## SEMANTICS CHANGED

**YES — the approved application readiness policy changed.** Target/Evaluation/Next Action are no longer prerequisites for new-Study exploratory creation. **NO — frozen scientific meanings, Plan/Actual separation, participation/evidence meaning, raw evidence immutability, persisted intent enums, authorization, schema and historical pins did not change.**

## REMAINING

- Human acceptance of the revised journey: NOT RUN; PR #12 remains draft/unmerged.
- Initial optional criteria still use the existing pre-first-Run immutable confirmation boundary. Adding/changing Target after an exploratory Run needs a separately scoped context/adoption flow; this PR does not invent one.
- Legacy imported workspace readiness migration is outside this bounded bootstrap change.
- Generic newly created Runs render their explicit Plan correctly. Subsequent generic Actual/Measurement/Evaluation authoring completeness is not asserted by this first-Run verification; in the Wafer readback, Measurement/Evaluation tabs were disabled despite optional criteria being present. That existing projection/authoring integration is not silently counted as complete or expanded here.
- P2 layout refinements and Sample lifecycle remain deferred.

## FILES CHANGED IN THIS POLICY RESET

- `src/application/execution-readiness.ts` (new)
- `src/application/study-bootstrap.ts`, `study-readiness.ts`, `dxt-application-provider.tsx`
- `src/infrastructure/postgres/study-bootstrap.ts`, `postgres-repositories.ts`
- `src/infrastructure/http/http-repositories.ts`, `app/api/repository/route.ts`
- `src/features/experiment-series/study-bootstrap.tsx`, `study-bootstrap-feedback.ts`
- `src/shared/i18n/en.json`, `ko.json`
- `tests/execution-readiness.test.ts` (new), `postgres-study-bootstrap-contract.ts`, `study-bootstrap-feedback.test.ts`, `localization.test.tsx`, `run.mjs`
- This report. Existing untracked local preparation/audit documents are excluded from the commit.
