# PR #12 — Execution-only transient Run Draft and fresh Human UAT

Date: 2026-11-20. Authority: Product/Architecture [decision 7029669233](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7029669233), following [discovery 7029614589](https://github.com/Naeun-Ouh/dxt-lims/pull/12#issuecomment-7029614589).

## TASK / STATUS

Implement the bounded Study-context → execution-only Run Draft → authoritative Preview/Create flow. Implementation and agent validation complete; **Human acceptance: NOT RUN**. PR #12 remains unmerged. The old Study-detail bootstrap UAT is superseded, not reclassified as passed.

## RETAINED

- Persisted Study identity, exact configuration pins, existing explicit grants and generic Study routing.
- RunPlanningSnapshot, existing transactional Preview/Create/idempotency/readback boundaries, source provenance and historical Run preservation.
- Existing Study Default and Previous Run copy sources. The Draft never writes back to either source.
- Migration 015 and the guarded legacy initial-context endpoint remain unchanged. No new migration, authorization action, persistent Draft entity or criteria resolution rule.
- Existing Plan locking, Plan/Actual distinction, non-participation/evidence distinction and scientific enums remain unchanged.

## IMPLEMENTATION

Study detail presents identity, purpose, department, experiment reference information, optional defaults and Run history. Concrete bootstrap authoring is removed from the generic persisted Study detail. Create Run opens a transient Draft; a Study can be valid with zero Subjects, default Operations and Runs.

The Draft authors Subjects, ordered Operations, Operation × Subject participation, common/per-Subject condition values, FIXED/VARIED intent and a conditional Measurement plan. BLANK starts with no execution content. Study Default and Previous Run copy execution content into an independent candidate. There is no implicit default save. Existing legacy fixture workspace surfaces are not migrated or scientifically reinterpreted by this change.

`runCreationRequestSchema` accepts a strict authored `draft` and matching `sourceFingerprint`. Source-load requests opt into `includeDraftOptions`; existing read-only Preview clients do not acquire new catalog requirements. Server materialization resolves Operation/item metadata from exact references, validates identities and participation, recomputes readiness on Preview and Create and rejects stale/mismatched fingerprints. Only Create persists a Run. The candidate is not stored in local storage or a Draft table. Refresh/navigation loses the transient candidate; the page describes this and uses an unload warning. Switching source with edits requires confirmation.

Unsupported source conditions outside an Operation or at position grain fail closed rather than silently dropping scientific content. This bounded editor supports common and Subject-grain execution conditions. Such a source can be viewed through its existing Run; select a representable source or Blank for this authoring flow.

## READINESS / REMOVED FROM FIRST-RUN GATE

Execution readiness is computed for the candidate: Subjects, ordered Operations, applicable required conditions and exact configuration. Nonparticipants are excluded from required per-Subject condition checks. Selecting a Measurement Operation requires a compatible point and parameters, including supporting parameters. Process-only creation does not require a Measurement plan.

Target, Evaluation, Decision and Next Action are not Draft prerequisites. This Draft accepts no criteria payload and creates no reasoning context. It neither manufactures criteria nor changes legacy Study/package resolution. **All Run-specific Target/Evaluation persistence and read-resolution remain in Issue #13.** An optional-criteria Human UAT is deliberately excluded from this execution-only acceptance.

## ERROR MESSAGE / TERMINOLOGY CHANGES

- Researcher-facing `실험 기준정보` and the approved helper replace the primary exact-configuration wording.
- FIXED → `고정 조건`; VARIED → `실험 변수`. Tooltip: `비교를 위해 이번 실험에서 의도적으로 값을 달리하는 조건`.
- Shared KO/EN dictionaries cover the Draft controls, source absence, readiness and errors.
- Empty/incomplete Draft Preview lists missing prerequisites and disables Create. No previous Run directs the user to Blank or Study Default. Permission denial directs them to the Study manager. Unexpected technical failures use the existing sanitized actionable message boundary.
- No persistence/domain enum translation. IDs, values, reference pins and units remain unchanged.

## VALIDATION — AGENT ONLY

| Check | Result / observation |
| --- | --- |
| Full repository tests | PASS, 330 tests, including 23 PostgreSQL adapter tests. |
| Native PostgreSQL 18 | PASS, full native contract entry includes Wafer and Specimen Draft contracts. |
| TypeScript | PASS with canonical sources; temporary config excludes ignored `tmp` UAT app copies and `dist`. No product tsconfig change. |
| Changed-file lint | PASS. |
| Production build | PASS, client and server. Existing vinext static route-classification notice remains. |
| Diff whitespace | PASS. |
| Empty generic Study | Browser-created AGENT ONLY Studies contain no concrete Subjects/default Operations or criteria. Explicit CREATE_RUN grant is separately provisioned. |
| Specimen | Blank → 3 Subjects → Cure → 120 °C / 30 min → readiness READY → Create Run 1 → Plan → reload. Subject 3 excluded from Cure; N/A preserved, not Missing. Temperature VARIED and time FIXED read back. |
| Wafer | Blank → 3 Subjects → Exposure → explicit recipe, focus, reticle, material, energy → READY → Create Run 1 → Plan → reload. Energy 35 read back. |
| Previous Run | Browser copies prior Subjects, participation, conditions and intent into the candidate. Contract changes a copy, adds/reorders Measurement, creates Run 2, verifies readback and unchanged Run 1. |
| Study Default / Blank | Browser Study Default stays empty after Run creation. Contract verifies default version/Subjects unchanged and Blank still empty. Existing configured-default copy covered by bootstrap contract. |
| Conditional Measurement | Browser adding Test without point/parameters gives NOT_READY with missing-plan explanation; FINAL + Peel Force gives READY. Reordering preserves the Preview sequence and associated conditions. Contract verifies persisted order/plan/readback. |
| Denied principal | Separate 3233 persona cannot enter Draft authoring; KO actionable permission alert. Contracts reject denied Preview/Create with no writes. |
| Invalid/stale candidate | Duplicate IDs, unknown participation, missing required values, stale source, changed candidate fingerprint and unapproved criteria fields rejected. Preview has zero Run writes; retries return the same created Run. |
| KO / EN at 1440px | Observed readable labels, aligned condition inputs and right-aligned primary buttons; document width 1425 ≤ viewport 1440 in both locales. No main-content `repository`, `adapter`, `database` or `API` text in observed Draft states. Tooltip text matches policy. |
| Unsaved source-switch confirmation | Agent reached the native confirmation but in-app browser control then timed out. Confirmation accept/cancel automation is **inconclusive**, not recorded as passed. Human should check this secondary behavior. No persistence was triggered. |

Browser mutations were confined to `AGENT ONLY` Studies in the new isolated UAT database. Agent-chosen numeric values are test inputs, not scientific recommendations or product defaults. Read-only SQL after browser creation: each agent Study has 1 Run, 0 default Subjects and 0 reasoning contexts. No Human Study has been created for the participant.

## FRESH HUMAN UAT ENVIRONMENT

The implementation commit containing this document is the version under test; the PR validation comment records its exact SHA. Final source checksums are in local `tmp/pr12-run-draft-uat/source-manifest.json`. Servers run copies of that source, not the old 3212 or 3222 application.

| Persona | Route / purpose |
| --- | --- |
| Researcher | http://127.0.0.1:3232/studies/new — begin Human Study creation |
| Researcher, Study list | http://127.0.0.1:3232/studies |
| Denied CREATE_RUN | http://127.0.0.1:3233/series/agent-run-draft-specimen |
| Denied direct entry | http://127.0.0.1:3233/runs/new?series=agent-run-draft-specimen&from=blank |
| Agent Specimen evidence only | http://127.0.0.1:3232/series/agent-run-draft-specimen/runs/1/engineering-grid?view=plan |
| Agent Wafer evidence only | http://127.0.0.1:3232/series/agent-run-draft-wafer/runs/1/engineering-grid?view=plan |

Dedicated database: `dxt_pr12_run_draft_20261120` on the existing local PostgreSQL test server. Existing migrations 001–015 applied; no new schema. Existing eligible UAT reference packages and explicitly labeled test personas/grants provisioned. Study creator does not automatically gain CREATE_RUN. The researcher has the existing explicit department Study creation grant; per-Study CREATE_RUN is granted separately by the facilitator after human creation. No EDIT_STUDY_SETUP or MANAGE_REASONING_CONTEXT is needed for this flow.

Old environments/data at 3212 and the earlier 54a3b3f UAT remain preserved. Do not restart, reset or use them as acceptance evidence for this refactor.

## FACILITATOR NOTES

Do not fill, save, preview or create on behalf of the participant. Record their actions, words and outcome separately from interpretation. Do not turn automated results into Human acceptance. Avoid button-location coaching unless requested.

### Primary Specimen journey — NOT RUN

1. Participant opens 3232 `/studies/new`. Create name `UAT ONLY · Run Draft Specimen`, ID `human-run-draft-specimen`, their own UAT purpose, department `uat-pr12-department`, reference information `Material Experiment · Material R&D · Specimen · v1`. No concrete execution input is required here.
2. Observe empty Study overview. At this point an intentional explicit-permission facilitator step is required; creation alone grants no scientific capability. Run the allowlisted helper **after** participant creation:

   ```sh
   /Users/naeunouh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tmp/pr12-run-draft-uat/grant-after-create.mjs human-run-draft-specimen
   ```

   Working directory: `/Users/naeunouh/Documents/ChatGPT/LIMS`. Helper only grants existing VIEW_STUDY, VIEW_RUN and CREATE_RUN actions to `uat-pr12-researcher` on the named UAT Study, logs the grant, and writes no execution or criteria data. Participant reloads overview after the facilitator confirms the grant.
3. Participant enters Create Run, chooses Blank and authors `UAT-SP01`, `UAT-SP02`, `UAT-SP03`. Intended route: http://127.0.0.1:3232/runs/new?series=human-run-draft-specimen&from=blank . This deep link is a facilitator diagnostic; the participant should first discover entry from overview.
4. Use process-only Cure. Explicit test inputs: Cure Temperature `120`, Cure Time `30`; mark temperature `실험 변수` and time `고정 조건`. Ask them to explain the role meaning. These values are UAT inputs only, not material recommendations. For participation coverage, exclude SP03 from Cure and observe `미참여`.
5. Participant checks readiness/Preview, verifies Subjects, order, participation, values and intent, then creates the first Run. **No Target, Evaluation criteria, Next Action or Measurement plan.**
6. Expected route after successful create: http://127.0.0.1:3232/series/human-run-draft-specimen/runs/1/engineering-grid?view=plan . Participant checks displayed values/N/A and reloads to verify persistence.
7. Return to Study; confirm Run history and that Study Default was not automatically saved. Check Previous Run copy and Blank independently; do not create another Run unless included in the participant's test plan.

### Wafer journey — NOT RUN

Repeat with name `UAT ONLY · Run Draft Wafer`, ID `human-run-draft-wafer`, reference information `Process Experiment · PHOTO · Wafer · v1`. Use the same helper with `human-run-draft-wafer` after human creation.

Inputs: `UAT-W01`, `UAT-W02`, `UAT-W03`; Exposure with `equipment-exp-01-r1`; explicit Recipe `EXP-R01`, Focus `0`, Reticle `RET-01`, Material `D035 Rev.2`, Energy `35`. Energy role `실험 변수`; others `고정 조건`. These are test-only values. Verify participation, readiness, Preview, Create and reload as above. Target/Evaluation/Next Action remain absent.

Expected overview: http://127.0.0.1:3232/series/human-run-draft-wafer . Expected first Plan: http://127.0.0.1:3232/series/human-run-draft-wafer/runs/1/engineering-grid?view=plan . Reserved Human routes return unavailable until the participant creates their Study.

### Secondary checks — NOT RUN

- KO/EN switch preserves the transient candidate and scientific values.
- Missing required condition/invalid value: actionable prerequisite, Create blocked, no silent save.
- Add Measurement only when testing structured acquisition intent: point and eligible parameters become required; do not proceed into Measurement/Evaluation execution (#13 scope).
- Reorder Operations; verify Preview order and correct condition association.
- Change source with unsaved input: cancel retains candidate; confirm replaces it. Native confirmation automation was inconclusive; obtain real observation.
- 3233 persona: see permission denial and next step; no authoring/creation. Do not grant CREATE_RUN to this persona.
- Browser navigation/unload with an unsaved Draft: observe warning and transient-state expectations. No durable draft/resume is promised.

## HUMAN RESULT LEDGER

| Scenario | Human acceptance | Actual observation |
| --- | --- | --- |
| Specimen process-only first Run | NOT RUN | Await participant |
| Wafer process-only first Run | NOT RUN | Await participant |
| KO/EN, source copy, ordering, participation | NOT RUN | Await participant |
| Invalid prerequisites / denied permissions | NOT RUN | Await participant |

Use only NOT RUN / IN PROGRESS / PASS / PASS WITH FOLLOW-UP / FAIL. Keep fact, interpretation, severity and proposed action in separate fields. PR #12 remains unmerged until Product/Architecture review and genuine Human acceptance.

## SEMANTICS CHANGED / REMAINING

**YES:** approved application ownership/readiness boundary: concrete execution authoring is now on the transient Run Draft, not mandatory Study setup; BLANK is truly empty. **NO:** schema, authorization, scientific semantics, persisted intent values, evidence or historical pins changed.

Issue #13 owns Run-specific criteria/provenance/read-resolution and post-first-Run Measurement/Evaluation work. Issue #9 is untouched. Persistent drafts, automatic default write-back and a new default-management workflow are not implemented. Human usability acceptance remains open, including native source-switch confirmation. No merge performed.

## FILES

- `src/application/run-draft.ts`, `run-creation.ts`: strict transient input, exact server materialization and preview contract.
- `src/infrastructure/postgres/postgres-repositories.ts`, `study-bootstrap.ts`: exact options reuse, BLANK behavior, candidate readiness and atomic persistence reuse.
- `src/features/experiment-series/run-draft-editor.tsx`, `production-run-entry.tsx`, `persisted-study.tsx`, `app/runs/new/page.tsx`, `app/entry-final.css`: Draft authoring and context-only Study entry.
- Study creation application/infrastructure/component: human-facing exact-reference option labels.
- `study-bootstrap-feedback.ts`, shared `en.json` / `ko.json`: actionable feedback and shared localization.
- `tests/postgres-run-draft-contract.ts`, bootstrap/freeze/authorization contracts, Study creation and readiness tests: behavior and policy regression coverage.
