# DXT 25-Wafer Human UAT Preparation v1

Prepared 2026-09-29 (Asia/Seoul). **Environment preparation and agent verification only: Human UAT has not been performed or passed.**

## Readiness

**PARTIALLY READY.** The live 25-wafer authoring, save/reload, Actual, Measurement, and separate locked-Plan paths are usable and verified. Two boundaries remain:

1. The current immutable-evidence storage rules prevent individual deletion of the locked UAT Run. Reset of the unlocked editable Run is provided, but complete disposable-context removal is not supported without a separately disposable database/approved retention mechanism. No triggers, constraints, schema, or evidence were altered to bypass this restriction.
2. The optional out-of-plan Actual authoring scenario is deferred: the authoritative execution command and database foreign key require existing Subject × Operation participation. Projection support must not be mistaken for support for entering such evidence through the production command path.

A supervised participant can start the main authoring tasks now. This is not an unconditional READY claim for every requested disposal and optional-evidence scenario.

## 1. Study and Run identities

The existing **local isolated UAT** PostgreSQL environment on port 55439 is used. It is not an enterprise production deployment. App base: `http://localhost:3200`.

The route/API supports three existing Study slugs. To avoid changing Study authoring capability, the new Runs belong to the existing safe UAT Study **DTS Improvement**, domain ID `series-dts-improvement`, slug `dts-improvement`.

| Purpose | Run | Run domain ID | Name |
| --- | --- | --- | --- |
| Human participation authoring | 22 | `uat25-20260929-v1-editable-22` | `UAT25 20260929-v1 — PARTICIPATION EDITABLE` |
| Separate lock check | 21 | `uat25-20260929-v1-locked-21` | `UAT25 20260929-v1 — LOCK CHECK` |

Subjects have independent IDs in each Run: `uat25-20260929-v1-editable.W01` through `.W25`, and `uat25-20260929-v1-locked.W01` through `.W25`. Display labels remain W01–W25. They are software-UAT identities, not physical-wafer identity claims. No existing PHO7814 subject was reused.

Run allocation advanced the Study's normal allocation/version counter. Study setup, configuration, permissions, and existing scientific Runs were not edited. Run 19/20 snapshot, planning, execution, measurement, evaluation, and decision read hashes matched before and after all preparation commands.

## 2. Exact routes

- [Editable 25-wafer Plan](http://localhost:3200/series/dts-improvement/runs/22/engineering-grid?view=plan)
- [Editable Run Actual](http://localhost:3200/series/dts-improvement/runs/22/engineering-grid?view=actual)
- [Editable Run Measurement](http://localhost:3200/series/dts-improvement/runs/22/engineering-grid?view=measurement)
- [Separate locked Plan](http://localhost:3200/series/dts-improvement/runs/21/engineering-grid?view=plan)
- [Lock-check execution provenance](http://localhost:3200/series/dts-improvement/runs/21/engineering-grid?view=actual)

Always verify Run **22** before editing. Do not use Run 19 or 20 for this exercise. The common grid header displays Study and Run number; the full UAT name/intent is in the saved Run metadata. The shared Study's Home/Run list can include the new UAT Runs; this is namespace isolation, not a separate tenant/database.

## 3. Provisioned data

- Two new repository-backed Run snapshots, each with 25 Subjects and five Operations P/A/B/C/D.
- Existing exact PHOTO package/profile/subject type references: `config-package-photo-v1`, `experiment-profile-photo-v1`, `subject-wafer-r1`.
- P/A/B/C use the existing EXPOSURE operation definition/context. D uses the existing CD-SEM measurement definition/context, POST/BCD expectation. Labels P/A/B/C/D are UAT topology labels, not newly invented scientific definitions.
- No explicit Split Group entity. Branch/rejoin is derived from membership.
- No explicit parameter-value assignments were seeded. The grid can display existing configuration defaults (Recipe, Focus, Reticle, Material, Energy); these are planning/reference defaults, not new acquired observations. Do not edit them for this participation task.
- Separate Run 21 contains one controlled, non-numeric software lock-check execution record for **P/W01**, through the normal authorized `execution.save` HTTP command. Source system: `DXT_UAT_SOFTWARE_CHECK`; event ID: `uat25-20260929-v1-lock-software-check`. Status OBSERVED, observed values empty, recipe/equipment strings empty, and source reference explicitly says no physical processing or measured values. This is test evidence of the software command/lock behavior, not physical execution evidence or scientific endorsement.

Provisioning uses a fixed-fixture trusted CLI, the existing `authorizedOperation` CREATE_RUN transaction and full-snapshot repository command. Pinned context and Study readiness are validated; the repository allocates numbers and reads snapshots back. It is not a new HTTP authoring endpoint. Name edits, reset, and lock records use existing authorized HTTP commands. No direct table update was used to manufacture UI state.

## 4. Intentionally not provisioned

- No measurement execution, dataset, raw value, site result, representative result, or fake measured result in either Run.
- No execution record in editable Run 22.
- No Evaluation, Decision, Next Action, Saved Analysis, Sample, new Study, new reference definition, approval, or authorization grant.
- No out-of-plan execution record; no membership/foreign-key manipulation to force one into storage.
- No pre-saved final A/B/C branch topology in editable Run 22.

## 5. Starting state and user-authored target

Run 22 was restored to the following state after agent validation; Plan version **4**, unlocked, zero Actual records, zero Measurement datasets/values.

| Operation | Starting participants | Human-authored target |
| --- | --- | --- |
| P | W01–W15 | W01–W15 |
| A | W01–W15 | W01, W03, W05, W07, W09 |
| B | W01–W15 | W02, W04, W06, W08, W10 |
| C | W01–W15 | W11–W15 |
| D | W01–W15 | W01–W15 |

W16–W25 start and remain nonparticipating in all five Operations. Users edit the A/B/C delta themselves. P and D preserve the upstream/rejoin set. Expected final counts are **15 / 5 / 5 / 5 / 15**, each out of 25. A/B/C are disjoint, their union equals P, and D equals P.

Run 21 already has the final topology solely to inspect locked behavior. It must not substitute for the user's Run 22 authoring task.

## 6. User task

Give the participant the starting Plan route and the target sets above. Ask them to configure the three branches, save, reload, explain which wafers participate in each Operation, and distinguish missing evidence from nonparticipation in Actual/Measurement.

Facilitator-only path: click the Operation's participant count, select the appropriate Subjects, Apply, then Save Plan. Apply alone is not persistence. Cancel discards the currently open editor selection. Horizontal scrolling/Subject navigation gives access to W01–W25; they are not all expected to fit simultaneously in a narrow viewport.

Do not create Operations, enter measurement numbers, or alter parameter values to complete this task. P/A/B/C/D and the Subjects are pre-provisioned prerequisites; their creation is not scored as a user success.

## 7. Expected Actual states

- Run 22 initially contains **zero** execution records.
- Participating pairs show **No execution record / 실행 기록 없음**, the current Missing Actual presentation.
- Nonparticipating pairs show **N/A**. They must not contribute to the unrecorded-value count.
- After the target topology is authored, A/W01 is expected-but-unrecorded; A/W02 is N/A; every P/A/B/C/D cell for W16–W25 is N/A.
- The Missing/미기록 filter operates on rows containing expected missing values. A qualifying row can retain N/A cells in other Subject columns; visible N/A cells do not mean they were counted as Missing.
- Status-pair totals and the UI's unrecorded-*value* count are different grains; do not equate them. There are 45 participating Operation × Subject pairs and 80 nonparticipants across the five Operations after branching.

## 8. Expected Measurement states

D has one configured POST/BCD expectation. With D = W01–W15 and no datasets:

- W01–W15: Pending / 미수집 (dash placeholders), **15 pending**.
- W16–W25: N/A, **10 nonparticipants**, not Pending.
- Pending filter retains participating empty cells and removes nonparticipant placeholders from that filter's result cells. The count remains 15, not 25.
- No representative result or site observation is fabricated to fill the screen.

## 9. Lock test

The facilitator can use Run 21 without changing the editable scenario. Its five participation buttons, scope edit and Save Plan are disabled. Existing execution evidence locks the original Plan.

Server validation attempted a real membership change against Run 21 through `run.plan.save`; it was rejected with **HTTP 409, CONFLICT, “Plan locked after execution evidence was recorded.”** The record remained unchanged.

For a human transition test, the participant can finish/save the Run 22 membership task first, then record an explicitly designated software-UAT execution through Actual using a participating pair. That irreversibly changes Run 22 from the resettable starting scenario to a locked test record. Use a fresh batch for later participants after that transition; do not remove evidence or unlock the original Plan.

Optional out-of-plan authoring is **DEFERRED**. `PostgresExecutionRepository.saveByRun` resolves participation through `run_subject_operation`, and migration 002 enforces that relationship. Existing projections can retain an unexpected observation, but this UAT cannot safely generate one via the current authoritative command. No schema or membership workaround was attempted.

## 10. Reset, repeat, and cleanup boundary

Run commands from the repository root with Node >=22.13 and the existing localhost app available.

### Reset participation before another human session

```sh
node scripts/prepare-participation-uat.mjs reset-editable
```

This reloads Run 22, rejects a locked Run, and restores only its participation to W01–W15 for every Operation via the normal Plan command. It does not delete evidence, clear arbitrary parameter edits, change references, or reset Plan version counters. Reload the browser afterward. If other Plan fields have been edited, use a fresh batch rather than pretending this membership reset restores every scientific setting.

### Read-only verification

```sh
node scripts/prepare-participation-uat.mjs verify
```

### Fresh batch after a lock or unrelated edits

Choose a new batch ID; retain the exact IDs/routes printed by the command (numbers are allocated, not assumed):

```sh
DXT_UAT_BATCH=20260929-session2 \
DXT_DEV_PRINCIPAL=uat-owner \
DATABASE_URL=postgresql://dxt_test@127.0.0.1:55439/postgres \
node scripts/prepare-participation-uat.mjs provision
```

Use the same `DXT_UAT_BATCH` for subsequent `verify`, `reset-editable`, and optional `lock` commands. Repeating provision for the same batch is idempotent and does not reset human edits. `lock` affects only that batch's separately designated lock-check Run.

### Physical cleanup is not available for the locked context

The execution event and its command receipts have immutable DELETE/UPDATE triggers. No supported Run deletion command exists. **Do not disable triggers, use TRUNCATE/CASCADE, delete the whole shared UAT database, or restore an old whole-database backup to remove these Runs**: those operations would bypass evidence safeguards or affect unrelated Runs.

For now, retain the explicitly named locked Run as UAT evidence, remove its URL from the active facilitator session list, and reset the unlocked Run or provision a fresh batch. Complete physical disposal requires a separately disposable database established *before* evidence authoring, or an explicitly designed retention/cleanup mechanism. Neither is silently introduced in this task. This is the reason the strict full-request readiness remains PARTIALLY READY.

## 11. Validation performed

Agent-driven checks, not human acceptance:

1. Opened actual localhost Run 22 Plan; confirmed W01–W25 headers and all five Operations.
2. Opened the 25-checkbox A editor, removed W02/W04, applied and clicked the real **Save Plan** button.
3. Reloaded the route: A persisted as **13/25**, W02 rendered N/A, Save Plan was disabled. API read-back confirmed version 3 and exact membership.
4. Actual showed W01 as no execution record and A/W02 plus W16–W25 as N/A. Missing filter retained those N/A cells as nonmissing context.
5. Measurement showed zero datasets/raw observations, **15 Pending and 10 N/A**; Pending filter excluded the ten nonparticipant result placeholders.
6. Created the separately labeled nonnumeric lock-check record through the authorized command; verified the five participation actions were disabled on Run 21 and the server rejected a membership change with 409.
7. Restored Run 22 membership through the reset command; confirmed version 4, all five counts 15/25, no lock and no Actual/Measurement data.
8. Navigated horizontally to W25 through the existing Subject-next control; W24/W25 columns were visible and N/A at the right edge. The automation tool's direct native-select action timed out; the existing next-subject control completed the navigation. No product defect was inferred from that tool timeout.
9. Protected Run 19/20 hashes matched throughout preparation. No writes targeted those Runs.
10. **All 295 tests passed**, including all 21 PostgreSQL/PGlite adapter tests; the previous disk-space failure did not recur. TypeScript and new-script lint passed. No UI/domain product code changed, so no new UI build was required. Native live PostgreSQL was used for this provisioning/HTTP validation; the automated 21-test suite uses isolated PGlite databases, not a claimed Native-suite rerun.

Evidence under `docs/evidence/participation-20260929-v1/`:

- `manifest.json`: provisioned identities and initial snapshots.
- `provision-verification.json`: persisted initial membership and routes.
- `ui-save-readback.json`: read-back of the real browser save (A 13/25).
- `lock-rejection.json`, `lock-verification.json`: rejected command and lock state.
- `reset-editable-verification.json`: final user starting state.
- `*-protected-before.json`: Run 19/20 content hashes; each command also compared the after state.
- `browser-validation.json`: concise observed browser checks.

Validation logs: `tmp/uat25-full-tests.log`, `tmp/uat25-tsc.log`, `tmp/uat25-lint.log`. Disk free space at start was approximately 4.7 GiB.

Changed implementation artifacts are limited to `scripts/prepare-participation-uat.ts`, its `.mjs` build/launch wrapper, this document and evidence files. No product page, domain, repository implementation, authorization policy or schema was edited.

## 12. Facilitator card

**USER TASK** — “Run 22에서 25장 중 W01–W15를 A/B/C의 지정된 세 경로로 나누고 D에서 다시 합류하도록 설정하세요. 저장·새로고침 후 실제/계측 화면에서 미참여와 미기록을 설명하세요.”

**EXPECTED RESULT** — P/D 각 15장, A/B/C 각 5장. W16–W25는 모든 공정에서 미참여. 저장 후 참여 관계 유지. D는 15 Pending, 10 N/A.

**DO NOT HELP WITH** — 참여 편집 버튼의 위치, Apply와 Save의 차이, 대상 선택 방법, N/A와 Missing의 의미를 먼저 알려주지 않는다. Run 식별·시스템 오류·실제 데이터 보호에는 개입하고 도움 여부를 기록한다.

**OBSERVE** — 첫 클릭까지 시간, 개별/다중 선택, 잘못 포함한 대상, 취소·복구, 저장 피드백, 새로고침 후 확인, 가로 이동, 미참여/미기록 해석, 잠긴 Run에서 보이는 안내.

**PASS CRITERIA** — 도움 없이 정확한 집합을 저장·재조회하고, N/A가 누락 집계가 아님을 설명하며, 별도 잠긴 Run의 참여를 바꿀 수 없음을 이해한다. 사람이 수행한 실제 결과를 NOT RUN / PASS / ASSISTED / FAIL로 별도 기록한다. 이 준비 보고서 자체는 PASS가 아니다.
