# PR #12 — deterministic condition precedence P1

Implementation authorization: PR #12 comments [7163903814](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7163903814) and [7163842018](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7163842018). Verification: 2026-11-26.

## Root cause and correction

The legacy resolver used the last assignment in array order. PostgreSQL reload orders assignment IDs lexically, so sorting an authoring array alone cannot guarantee stable precedence (including assignment-10 versus assignment-2). Actual comparisons separately derived intent from the common assignment. Changing the global resolver would reinterpret historical Plans.

New persisted Plans therefore carry `conditionResolution: SUBJECT_FIRST_V1`, stored in the existing `experiment_run.planning_context` JSON. No migration, table, column, authorization policy, or new draft entity is added. Historical Plans without this marker retain their existing resolver and read behavior. Plan saves cannot add, remove, or change the marker. New production creation paths materialize the prospective policy; direct copy paths that would change effective interpretation must use reviewed Run Draft creation.

For V1 Plans:

- A nonblank Subject assignment overrides common regardless of input/storage order. Its FIXED/VARIED intent wins with its value.
- Clearing/removing a Subject assignment inherits common value and intent. Numeric `0` is a value.
- Invalid nonblank input remains explicit and is rejected by authoritative validation, never silently replaced by common.
- Duplicate exact applicability/scope is rejected. Authoritative writes require canonical condition labels and reject conflicting same-name definitions, preventing presentation keys from splitting or combining exact conditions incorrectly.
- Non-applied Operations remain N/A, not Missing.
- Plan Grid values, per-Subject role badges, Varied filtering, Actual comparison, and new Actual Recipe defaults use the effective Subject assignment. Explicit Actual overrides remain independent evidence.

## Historical and copy behavior

Legacy overlap is flagged without rewriting assignments, Plans, or evidence. Copy preview reports old versus prospective effective value and role. Run Draft and final confirmation disclose the source interpretation changes; final confirmation shows the draft's effective values for each Subject and marks non-applicable Subjects separately. Preview is non-persistent; Final Create remains the durable action and still verifies the authoritative fingerprint.

Copying or clearing an override never mutates the source Run. No historical Actual, Measurement, Evaluation, raw evidence, or UAT record is migrated. Existing legacy position/unscoped source limitations continue to fail explicitly rather than fabricate replacement data. Demo fixture restoration retains its legacy behavior; the new creation policy is enforced on the production persisted Run boundary.

## Automated evidence

| Check | Result |
| --- | --- |
| Full `npm test` | 348 PASS, 0 FAIL |
| Native PostgreSQL 18.7 contract suite | PASS, including Wafer and Specimen precedence contracts |
| TypeScript, all tracked source/tests plus added files | PASS |
| Changed-file type-aware lint | PASS |
| Production `DXT_REPOSITORY=postgres npm run build` | PASS |
| `git diff --check` | PASS |

Focused coverage includes both array orders; more than ten lexical assignment IDs; common edits; Subject `0`; clearing to common `0`; inherited/effective FIXED/VARIED; invalid input without persistence; duplicate scope including blank duplicate; canonical-label enforcement; nonparticipation; Previous/Existing Run copy; legacy unchanged SQL assignment rows/readback; Plan version upgrade/downgrade rejection; Plan/Actual consumer agreement; Recipe observed defaults/explicit overrides; and KO/EN copy-review disclosure.

Tests: `tests/condition-consumers.test.ts`, `tests/condition-copy-review.test.tsx`, `tests/postgres-condition-precedence-contract.ts` (integrated into the existing Wafer/Specimen bootstrap contract and native suite).

Local logs: `tmp/condition-precedence-p1/{full-tests,native,tsc-tracked,lint,build}.log` (ignored). TypeScript/lint use a generated temporary config enumerating tracked files and the new task files, excluding ignored nested worktrees/server copies; product compiler configuration is unchanged. An execution-session reset interrupted an earlier run; final evidence above is from completed reruns with project-local logs.

## Agent browser checks — not Human acceptance

Separate agent-only database `condition_precedence_p1` and app port 3250, using disposable contract fixtures. Existing Human UAT environments were not used or changed.

- Specimen Previous Run draft: common `0`/고정 조건 is inherited by blank Subject cells; other Subjects retain explicit values/실험 변수; P13 is 미적용.
- Create opens a non-persistent confirmation showing these effective values; KO/EN both readable. Final Create was not clicked in this browser check (durable Create/reload is covered by SQL contracts).
- Legacy Wafer Run #4: overlap notice is visible and historical effective Focus P1 remains `37`.

These are AGENT verification observations only. Human acceptance for this fix is NOT RUN; no existing Human result is promoted or reset.

## Remaining gates

Human retest at the final PR head remains required. PR #12 remains unmerged. Responsibility/creator authorization policy, Sample write schema/policy, and Issue #16 SQL approval remain separate, untouched gates. No P2/P3 visual work is included.

## Human retest focus

On a fresh labeled UAT copy after facilitation: enter common and Subject values in either order; verify Subject zero and explicit role; edit common while preserving the override; clear the override and verify inherited value/role; leave an Operation non-applied; review/create/reload; copy a legacy overlap and inspect the disclosed value/role change. Original UAT data must remain preserved. Record actual human observations separately from this automated evidence.
