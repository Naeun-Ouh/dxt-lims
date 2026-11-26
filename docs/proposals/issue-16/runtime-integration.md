# Coordinated runtime contract — review candidate, not implemented

Baseline: reviewed PR #21 `501b68ea06a11daf6f6de29b60e6d5fe5bade8f9` plus validated NULL-visibility hardening `d9fb191` ([evidence](https://github.com/Naeun-Ouh/dxt-lims/pull/21#issuecomment-7180892520)); both are integrated into this isolated proposal branch. This document is the exact implementation proposal for the next approved runtime slice. SQL in this directory remains unregistered. It is **not safe to deploy migration 016 alone**.

## One scientific permission authority

The proposed `dxt_explicit_scientific_access_reason(pid, sid, action)` is the single scientific decision function for all nine actions. It checks supported action, active principal, VIEW_RUN resource visibility (NULL → CONTEXT_UNAVAILABLE), then active/unexpired principal or ordinary-unit grant. Responsibility/creator/Admin alone never grants scientific authoring. Existing non-scientific discovery/administration retains the legacy function. A responsible user or Admin with the explicit capability is allowed; the old reason-string-precedence failure is removed.

At coordinated cutover, replace the scientific branch of `PostgresAuthorization.authorize` with:

```sql
SELECT dxt_explicit_scientific_access_reason($1,$2,$3) reason,
       (SELECT version FROM study_access WHERE study_id=$2) version
```

Keep its action allowlist, `require` error mapping, context version and permission projections. SQL revision/origin/adoption/authoring commands use this exact helper. No parallel hand-maintained implementation is to remain after cutover. Tests compare the approved current runtime algorithm against the proposed helper for every scientific action and adversarial scope/expiry/revocation/NULL cases; this is compatibility evidence, not a claim that the runtime already calls the function.

## Trusted identity, payload and ACL boundary

The backend login is trusted infrastructure, not a researcher identity. `resolvePrincipal` resolves an active Principal from server authentication; neither payload, headers nor caller-supplied GUC may select the actor. Do not expose generic SQL execution or these SQL functions directly to a browser. The backend supplies the actor after authentication and exact capability/resource checks. New functions independently recheck the same capability. A stolen trusted-server credential remains a deployment/security incident; this proposal does not pretend PostgreSQL can distinguish legitimate and malicious calls using the same trusted credential.

Use a protected NOLOGIN migration owner for SECURITY DEFINER functions, separate from the server login. Function search_path is fixed to `pg_catalog, public, pg_temp`; public must not be writable by untrusted principals. PUBLIC EXECUTE is revoked transactionally. `trusted-server-acl.PROPOSED.sql` grants only named entry points to an audited NOLOGIN server group. Do not grant table DML on criteria/revision/selection/origin/adoption or compatibility view to the backend. Trigger entry functions are not public APIs. The role contract tests untrusted caller-chosen actor, GUC spoofing, SET ROLE, direct table/view insert and function execution denial. It also proves the trusted group still rejects an ungranted scientific actor.

Before any production deployment, inventory `pg_auth_members`, role SUPERUSER/BYPASSRLS/CREATEROLE flags, table and column ACLs, schema CREATE and function EXECUTE privileges. Physical rename preserves old ACLs: the candidate's PUBLIC revocation does **not** erase grants to unknown existing roles. Explicitly revoke all unapproved named-role write privileges and deny owner-role membership before cutover; otherwise STOP. Runtime principal-grant census from PR #21 and this database-role census are separate required checks. No existing/live census or grant mutation was performed here.

`create_reasoning_criteria_revision` accepts only object JSON plus exact definition/Study/package identity, immutable UUID and CAS. It is **not** a substitute for scientific payload validation. The future trusted application command must parse `confirmStudyReasoningSchema`/initial-criteria inputs, use `reasoningPrerequisites` with `readMeasurementCatalog` and the exact pinned configuration, validate referenced Target parameter/point/rule/evaluation/next-action definitions, then call SQL inside the same transaction. The server computes request hashes. The isolated SQL fixtures intentionally exercise identity/CAS with labeled synthetic payloads; they do not demonstrate scientifically valid Target creation. Full application validation remains an explicit runtime implementation gate.

## Creation-path inventory and exact changes

| Current path | Current durable boundary | Required coordinated change |
| --- | --- | --- |
| `PostgresRunRepository.create` with Draft/Study Default/Previous Run/Blank source | `postgres-repositories.ts:insertSnapshot`, invoked inside create transaction | Carry trusted Principal through the application command; immediately call `record_run_reasoning_origin` before success receipt/readback/COMMIT. Current execution-only flow writes ABSENT; no automatic Target. |
| `createFromPreview`, `createFromStudyDefault` | Delegates to the same `create` | Same origin write; preview stays non-persistent and never creates an origin. |
| `createFromPreviousRun(previousRunId, decisionId)` / Next Run | Delegates to `create`; retained plan/Decision source logic | New Run origin ABSENT unless a future reviewed explicit selection command supplies SELECTED. Do not infer selection from source Run/current Study/Decision. Source Evaluation/Decision keeps its old context. |
| `seedProductionSlice` / `scripts/seed-production-slice-1.ts` | Seeds configuration and Study defaults, **does not INSERT experiment_run** | No origin needed for Study-only seed. Any seed subsequently invoking create must provide explicit trusted test/service Principal and capability. |
| Repository tests / native test setup | Create Runs through repository; proposal SQL harness also uses direct INSERT | Update post-016 repository contracts to supply actor/origin. Direct SQL imports must atomically include exact ABSENT/SELECTED provenance; unclassified historical imports require separately reviewed evidence classification, never manufacture UNKNOWN_LEGACY after migration. |
| Import application/API | No independent production Run import writer found | No new import feature. Future import must use same authorizing/atomic boundary; deferred trigger intentionally rejects direct insert with missing origin. |

All production `INSERT INTO experiment_run` hits in the inspected source resolve to `insertSnapshot`. Keep the deferred origin trigger: a failed capability, invalid binding or missing origin rolls back Run, subjects, assignments and idempotency receipt together. Test every repository delegate after implementing the above; the current proposal demonstrates SQL atomicity, not completed repository adaptation.

## Exact active and historical reads

Replace `reasoning-context.ts:readReasoningContext` Run → Study/package inference with `run_reasoning_resolution` → `reasoning_criteria_revision` by exact UUID. Return an explicit union: UNKNOWN_LEGACY, ABSENT, SELECTED/ADOPTED plus origin context, interpretation context and sequence. UNKNOWN_LEGACY never means absent at creation. The compatibility view remains only for frozen legacy Study selection; it must not serve Run interpretation.

Evaluation `getContext` uses active interpretation for **new authoring** only. `getByRun`/`getStateByRun` must load each saved `engineer_evaluation.context_id`, its exact revision payload and bound summary/Target; do not recalculate a past evaluation using active criteria. Existing `evaluations()` projections currently discard the SQL context ID when returning payload: add an explicit historical provenance projection rather than overwriting or embellishing the saved payload. Do the same for `decision.context_id`, exact referenced Evaluation IDs, Next Action type revisions and captured preview. Preserve old receipt/context FKs through physical rename.

A historical view and new-authoring inspector may show different criteria. Label historical evidence with its own revision; show current interpretation separately. Do not silently relabel history to make the UI look consistent. Historical visibility still requires the existing Run read permission, not today's ability to author criteria.

## Authoring transaction and retry order

1. Resolve trusted actor and required action; lock the same `experiment_run` row used by adoption.
2. Recheck permission inside transaction, including retries.
3. Look up immutable record/command identity **before validating an unchanged retry against today's active criteria**. An exact prior request returns the original result/context; changed request under same identity conflicts. Current `saveByRun` methods read current context before existing-record replay and must be reordered.
4. New commands carry `expectedInterpretationContextId` and `expectedInterpretationSequence` from the viewed active state. Include both in canonical request hash and immutable receipt input. Call proposed `assert_run_reasoning_authoring` while holding Run lock. Reject missing/stale/mismatched expectations before inserting evidence.
5. Validate all incoming new evidence against that exact revision and pinned measurement catalog. Never mix target IDs from one revision with payload/rules from another. A new Decision referencing Evaluations from a different context must reject as context mismatch in this bounded slice; historical mixed evidence already saved remains readable without mutation. A broader cross-criteria comparison feature needs its own explicit product semantics.
6. Insert immutable evidence with exact `context_id`; commit receipt/current projection in the same transaction. No raw evidence rewrite.

Proposed guard tests observe actual PostgreSQL lock contention: adoption waits behind authoring's Run lock; after adoption commits, stale authoring fails with sequence/context conflict. This proves the primitive, **not** integration of the existing authoring repositories. Required future contracts: simultaneous adoption/new Evaluation; old unchanged idempotent replay after adoption; revocation before retry; different-revision Target ID collisions; historic records with different active context; failure atomicity across record and receipt.

## Legacy view consumers and compatibility limits

| Consumer | Current behavior | Post-cutover contract |
| --- | --- | --- |
| `studyReadiness`, `confirmStudyReasoning` | Study/package fixed selection read and four-column INSERT | Optional reusable Study criteria only. Replace writes with authenticated validated revision/selection command before granting backend access; compatibility insert remains deployer-only. No first-Run gate. |
| `study-bootstrap.ts:confirmInitialStudyReasoning` | Exact initial Target/context and receipt | Preserve existing receipts; move any retained command through trusted capability + payload validation. No direct backend legacy-view DML. |
| `provisionReasoningContexts` development provisioning | Named four-column INSERT | Maintenance-only controlled seed with no serving-app login permission; preserve existing IDs. Not automatically invoked by production reads. |
| Migration 008/015 receipts + Evaluation/Decision FKs | Foreign keys reference physical table | OID-preserving rename retains exact UUID references; future FKs target revision table, never view. |
| External consumers / exports / SQL tooling | Unknown | Inventory required. Four-column read shape retained; ON CONFLICT on view and new FK-to-view unsupported. No claim of external compatibility until inventory complete. |

## Deployment and separate approvals

Approval requested for this exact 016 SQL, ACL contract and coordinated runtime plan only. Sample 017 is independent; neither proposal authorizes the other. Do not register/apply 016 until runtime/read/write/ACL changes and full regression/native tests pass and Architecture approves coordinated application. Maintenance cutover must stop old writers; old application cannot create Runs under the new deferred-origin guard. Transactional failure-before-COMMIT rollback is tested. After new immutable versions/adoptions exist, preserve data and forward-repair; do not flatten/drop provenance to roll back. Backups and controlled restore rehearsal remain deployment gates.

Human acceptance: NOT RUN. No live permissions, UAT data, production migration or PR merge performed.
