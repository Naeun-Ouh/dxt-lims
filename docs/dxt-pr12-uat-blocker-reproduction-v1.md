# PR #12 — Human UAT blocker reproduction and bounded feedback fix

Date: 2026-11-04. Reproduction baseline: `9287f14ad32658f6c451fbe4c44b687efbd985af`.

**Human acceptance: FAIL. HUMAN RETEST REQUIRED. PR #12 must remain unmerged.**

## ROOT CAUSE

### Evidence boundary

Actual human findings: [PR #12](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-6630294037), [Issue #11](https://github.com/Naeun-Ouh/dxt-lims/issues/11#issuecomment-6630295182). Save Setup did not work from the participant's perspective, Initial Target was inactive without a clear route forward, and Intentionally Varied was not understood.

Everything below is **AGENT REPRODUCTION / TECHNICAL VALIDATION**, not Human acceptance. The connected browser inventory contained no preserved human tab. Consequently, its original unsaved input, exact failed action sequence and failed request payload were unavailable. The participant was asked for that evidence without refreshing or clearing their tab. No original human failure payload is inferred from later persisted state.

The saved Specimen state was already revision 4, Subject `1234`, one `Mix` Operation, Formulation `F-BASE-01` with `VARIED`, and no Measurement plan. This differs from the earlier unsaved three-Subject narrative. The agent did not restore old values or replace the participant's current data with the UAT task card.

### Save Setup — controlled sequence and trace

1. Read the existing bootstrap state from the researcher UAT server on 3212.
2. Open a separate diagnostic tab through loopback proxy 3215, forwarding to that unchanged server and logging requests/responses locally.
3. Load the persisted Specimen Study, leave every field unchanged, and click **Save Setup / 설정 저장** once.
4. Inspect its response, rendered feedback position and read-only native PostgreSQL readback.

Captured request at **2026-11-04 12:17:06 UTC**:

```json
{
  "operation": "study.bootstrap.save",
  "slug": "uat-pr12-specimen-human",
  "input": {
    "expectedRevision": 4,
    "subjects": [
      {
        "id": "1234",
        "displayLabel": "1234"
      }
    ],
    "operations": [
      {
        "optionId": "option-e35c2927e319c3d08dc6",
        "point": null,
        "parameterIds": [],
        "items": [
          {
            "applicabilityId": "material-formulation-r1",
            "value": "F-BASE-01",
            "intentRole": "VARIED"
          }
        ]
      }
    ]
  },
  "commandId": "02bd78f8-9d44-47c6-bf74-8ce82ac15218"
}
```

| Check | Observation |
| --- | --- |
| Click handler | Fired: the matching `study.bootstrap.save` POST was recorded. |
| Client validation before fix | No command-schema preflight in the click handler; this valid payload reached the API. |
| HTTP response | 200; authoritative bootstrap returned revision 5, the same Subject/assignment values, and `structuralMissing: ["Measurement plan"]`. |
| Application/repository error | None on this controlled request. |
| Persistence | Native PostgreSQL read-only queries confirmed revisions 1–5, current Subject `1234`, zero reasoning contexts and zero Runs. |
| Visible response | Success output existed, but its bounding box was y=-141.92 to -126.42 in a 720px viewport after clicking Save. It was above the visible form. |
| Other stale presentation | Parent Study metadata still displayed revision 4 until reload, while bootstrap readback was revision 5. The bounded fix explicitly reports the authoritative saved revision beside Save; it does not redesign parent metadata refresh. |
| Invisible blocker on this request | None blocked submission. An incomplete Measurement plan did not prevent saving partial structural Setup; it correctly prevented Initial Target. |

**Data-impact disclosure:** this single unchanged-value reproduction created Setup revision **4 → 5** through the existing repository command. It was not a read-only operation. No scientific values were changed, no Target/Run was created, and no database reset or rollback was performed. Original UAT servers and any original participant tab were not restarted or navigated.

The old server log contains two HTTP 400 responses followed by successful saves, but no corresponding original payloads. Therefore **the original reported unsuccessful submission is not yet fully reproduced or diagnosed**. The controlled successful request proves a feedback defect, not that every human Save attempt succeeded.

An attempted diagnostic invalid submission was rejected by automatic approval review because it could mutate preserved UAT state. It was not retried or sent through a direct API workaround. The agent-only diagnostic tab was closed without saving its local removal of Mix.

Instead, an isolated API contract test submitted an empty Operations array to `handleRepositoryRequest` with a dispatch callback that must never run. It returned **400 `{ "error": "Invalid repository request." }` before application/repository dispatch**, so there was no DB persistence. This establishes one generic-error path, **not** the missing original human request's root cause.

### Initial Target — actual disabled condition

At the preserved saved-state baseline / after the unchanged-value save:

| Condition | Actual value / effect |
| --- | --- |
| busy | false after request completion |
| dirty | false after loading / successful readback |
| missing MANAGE_REASONING_CONTEXT | false; `canInitializeReasoning: true` |
| structuralMissing | **["Measurement plan"] — actual blocking condition** |
| failed Setup save | not responsible for this loaded state; the controlled Save succeeded |
| unavailable exact references | Evaluation and active Next Action references exist; no eligible Target parameter/point is exposed because no Measurement plan was saved |
| closed | false; no reasoning context or first Run exists |

Before the fix, the top-of-form summary mentioned incomplete Measurement plan, but the disabled Target fieldset itself did not explain how that prerequisite related to activation or what to do next. The human's confusion is consistent with that missing explanation; it is not an authorization failure or a reason to bypass readiness.

## FIX SCOPE

Bounded presentation/application feedback only:

- Keep pending, success and failure feedback beside the action that produced it, including Save Setup. Report the authoritative saved revision.
- Preflight with the **existing** `bootstrapSetupSchema`; show clear missing-Subject/missing-Operation errors before submission, without altering the input or replacing server validation.
- Keep server/repository errors visible at Save. Failed commands do not hydrate/replace unsaved inputs.
- Explain Target unavailability beside the fieldset: why, missing prerequisite, next action. Distinguish busy, unsaved changes, explicit permission, closed authoring, saved structural gaps and unavailable exact references.
- Disable Target for unavailable numeric Measurement parameters / required exact references already necessary to submit the existing command. Do not synthesize references or scientific defaults.
- Share the same KO/EN translation resources. No P2 layout refinement.

Files in the focused change:

- `src/features/experiment-series/study-bootstrap.tsx`
- `src/features/experiment-series/study-bootstrap-feedback.ts`
- `src/shared/i18n/en.json`
- `src/shared/i18n/ko.json`
- `tests/study-bootstrap-feedback.test.ts`
- `tests/run.mjs`
- `docs/dxt-pr12-uat-blocker-reproduction-v1.md`

The existing untracked local facilitator runbook was updated to mark its old NOT RUN header historical. It is not added wholesale to this focused PR.

## VALIDATION

- `npm test`: **326 passed, 0 failed, 0 skipped**, including 6 new bounded feedback/schema/API-dispatch tests.
- TypeScript: passed.
- Changed-file lint: passed.
- Production build: passed.
- `git diff --check`: passed.
- Actual original-server request: HTTP 200 and native PostgreSQL readback as above. This is not a claim that the entire native PostgreSQL regression suite was rerun.
- Separate verification app on 3216: read-only page load from existing UAT DB confirms the current saved-state Target explanation in KO.
- Isolated component harness with a mocked API and **no database access**: KO success at y=379–394, server error at y=392–408, both visible beside Save; missing-Operation preflight displays its concrete error. EN switching preserves and translates the same error and Target prerequisites. Mock success is not persistence evidence.
- No Target confirmation, first-Run preview/create, grant change, schema migration or fixture edit was performed.

Local request evidence remains under ignored `tmp/pr12-blocker-repro/`; full environment/catalog payloads are not committed.

## HUMAN RETEST REQUIRED

Human acceptance remains **FAIL** until actual human retest is recorded. Do not merge.

The original 3212/3213/3214 copies were left unchanged to avoid refreshing a participant's unsaved form. A separate verification copy with the bounded fix uses the same researcher principal and saved UAT DB:

- http://127.0.0.1:3216/series/uat-pr12-specimen-human

This route reads the saved revision 5 state, **not any unsaved draft in another tab**. Keep any original unsaved tab intact. Do not discard or copy over its data merely to move to this route. Missing original-input evidence remains needed to diagnose the original failed Save request.

Retest observations to collect (no control-location coaching unless requested):

1. Original failed input/action sequence and any visible error, if still available.
2. Whether Save clearly communicates success or the specific blocking input; whether unsuccessful saving preserves the participant's input.
3. Whether the participant understands why Target is unavailable and the prerequisite to make it available, without facilitator explanation.
4. Once the participant explicitly completes and saves eligible Setup, whether Target activates correctly; do not fill or confirm it on their behalf.
5. Record terminology understanding separately; then continue the bounded Specimen, Wafer and explicit-grant scenarios only as appropriate. Agent checks do not satisfy these steps.

## SEMANTICS CHANGED

**NO.** No domain, schema, repository behavior, authorization policy, readiness bypass, automatic Target creation, fixture default or `VARIED` enum change.

Current UI mapping is `Intentionally Varied` / `VARIED` → `의도적 변경`. It appears in the Setup assignment role selector and shared dictionary. The role is experimental intent, not evidence that Actual differed from Plan.

Product/Architecture label candidates (proposal only; none applied):

1. **비교 실험을 위해 바꾸는 조건** — clearest purpose, longer label.
2. **실험 변수로 변경** — compact selector label, with the definition below as supporting copy.
3. **의도적으로 달리한 조건** — emphasizes deliberate differences rather than accidental change.

Shared definition: **비교를 위해 실험 변수로 삼아 의도적으로 값을 달리하는 조건.** Select a label before any terminology implementation. Existing scientific intent and stored VARIED values remain untouched.
