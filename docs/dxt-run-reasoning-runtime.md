# Run criteria and interpretation runtime

Approved runtime scope: PR #17 decision 7181025200 and Issue #1 decision 7181025756. This is coordinated application/schema work, not production migration approval.

## Implemented boundary

- Migration 016 remains the single explicit scientific permission resolver. Migration 017 consumes it and separately protects the trusted function schema from PUBLIC CREATE. No new implicit role, creator or responsibility grant is introduced.
- Every shared Run creation path records `ABSENT` atomically: no criteria are automatically inferred from Study defaults, copied Runs or fixture profiles. The immutable schema also represents `SELECTED` when creation explicitly selects a criteria revision; the current creation UI does not select criteria. Existing Runs migrate to `UNKNOWN_LEGACY`, never guessed `ABSENT` or `SELECTED`.
- Generic persisted Run Evaluation screens load exact package references and offer explicit criteria authoring or selection. Numeric Target values, point, aggregation and Evaluation reference are user inputs. Next Action reference selection is optional. Criteria are never an execution readiness gate.
- An immutable criteria revision and its Run interpretation adoption commit together. Existing-family revisions use optimistic revision checks. Adoption requires the expected interpretation sequence, exact Study/package, matching configured Measurement parameter/point and explicit `MANAGE_REASONING_CONTEXT`.
- Save retries keep immutable revision identity and command identity. A lost response can be retried without a second revision or adoption. Input changes under the same identity conflict.
- Evaluation and Decision commands carry expected criteria context/sequence. New records reject stale interpretation; unchanged historical records and receipts are checked before current-context validation and remain replayable after adoption, subject to current explicit authorization.
- Existing historical Evaluation/Decision foreign keys are preserved. Current workspace projection only uses records authored under the active context. Historical records show their own immutable criteria revision, saved comment/conclusion and saved Next Action, rather than recalculating against the current Target.
- Decision without Next Action persists normally. Adding Next Action requires its separate explicit capability, including receipt retries. Next Run creation uses the existing boundary and records its own creation origin.
- Direct repository use must supply a trusted principal via the repository factory's third argument or trusted SQL-session metadata. HTTP derives this value from the authenticated server boundary, not request payload or session GUC. Test principals exist only under `tests/`.

## Exact data/permission constraints

No fallback criteria are taken from mock profiles. Package manifests must include Evaluation definitions and their exact criterion closure; Next Action types must also be explicitly pinned. Legacy packages without these references remain usable for process/Measurement execution, while new Evaluation criteria authoring requires an eligible exact package. Existing stored historical criteria remain readable.

The SQL functions are server entry points. Caller-supplied actor arguments are not an authentication system; PUBLIC execution and direct table access are revoked. A protected server login and deployment ACL census remain separate rollout requirements. Owner-level contract execution proves runtime behavior, not a complete production least-privilege deployment. An untrusted role contract proves that a browser-like SQL role cannot invoke protected functions with a forged actor or read criteria tables.

## Automated evidence

`node tests/run-reasoning-runtime.mjs` runs an isolated PGlite fixture and the reusable `runCriteriaContract(database)` contract. It validates:

- exploratory Run with no criteria; exact package criteria authoring with valid zero Target;
- same-family immutable revision and atomic adoption; exact retries and command collision;
- real Actual → Measurement → Evaluation → Decision, with no Next Action required;
- unchanged historical Evaluation/Decision replay after a new criteria revision;
- historical record-owned context preservation and current workspace isolation;
- stale new authoring/adoption, immutable revision update rejection;
- denied Administrator, revoked explicit grant, incompatible process-only Run selection;
- concurrent revision/adoption CAS with one winner and no orphan revision;
- untrusted SQL role table/function denial even with a forged privileged actor.

The same exported contract is registered in the coordinated native PostgreSQL and full regression runners. Root integration records final native/build/browser evidence. Agent checks never constitute Human acceptance. No existing UAT data or live grants are modified by this work.
