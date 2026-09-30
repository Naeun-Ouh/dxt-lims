# DXT Enterprise Authorization — Slice 2: Scientific authoring

Implemented for the same trusted, loopback development-identity pilot as Slice 1. Production Core v1 remains frozen. This extends the existing authorized composition, Study-root grants and scoped SQL; it does not implement authentication, a new scientific model or sharing management.

## Policy and actions

Policy identity: `scientific-authoring-v2`. Migration 010 preserves the Slice 1 predicate as `dxt_study_access_reason_v1` and adds a wrapper for downstream actions. Existing Study/Run actions and PRIVATE/department/Area/managed-scope behavior are unchanged. The generic grant action constraint is extended; no capability columns were added to scientific tables.

Read aliases VIEW_EXECUTION, VIEW_MEASUREMENT, VIEW_EVALUATION and VIEW_DECISION resolve the same VIEW_RUN relationship. NextAction and Analysis scientific context inherit that root read. Read aliases do not independently publish a Study; collaborators need VIEW_RUN/VIEW_STUDY plus the compatible authoring grant. There is no parameter-level or RAW-versus-DERIVED confidentiality split in this slice.

The six independent write capabilities are RECORD_ACTUAL, RECORD_MEASUREMENT, MANAGE_MEASUREMENT_VALIDITY, AUTHOR_EVALUATION, AUTHOR_DECISION and AUTHOR_NEXT_ACTION. A Study-level grant applies only to that capability on Runs and evidence rooted in that Study. There are no per-MeasurementValue ACL rows, domain-specific roles or Wafer/MES identity assumptions.

Responsible user receives the six scoped authoring capabilities. This adopts the requested responsible-user pilot baseline and the authoritative design §16 Measurement baseline, which explicitly includes validity management. Exclusion/restore remains a distinct capability for delegated specialists. Department members and leaders receive only inherited VIEW; scientific authoring requires explicit grants. ADMIN alone receives no scientific authoring. An Admin with a grant still passes every frozen scientific validator/lock.

Current memberships/grants are re-evaluated on each request. Organization moves never rewrite scientific authors/history. Missing principal/root/policy and uncovered operations deny. Configuration mutations, reasoning-context adoption and Saved Analysis writes remain denied.

## Command boundary

`authorizedOperation` resolves the Run's Study, checks access, and invokes `authorizeScientificInput` before repository writes, inside the existing repeatable-read transaction and policy-table SHARE locks. Saved Analysis ownership mappings are also protected by that transaction's policy lock. Requests cannot select the server Principal. Forged author/role headers have no authority. Actor-scoped command receipts and reauthorization on retry remain in force.

- Actual save requires RECORD_ACTUAL. Existing immutable evidence identities, allowed Subjects/Operations, Plan/Actual separation and Plan locking remain repository responsibilities.
- Measurement save first requires root VIEW. The incoming append-only graph is compared with persisted evidence. New/changed Executions, Datasets, Values or Summaries require RECORD_MEASUREMENT. New/changed validity decisions require MANAGE_MEASUREMENT_VALIDITY. A combined request requires both. A pure no-op/retry still requires at least one applicable Measurement authoring capability, so VIEW cannot mutate version/receipt state. Omitting old rows cannot delete frozen evidence and does not create a deletion permission. A new observation marked EXCLUDED also requires both capabilities. A validity operation which independently supplies new scientific Summary/observation data also requires recording authority.
- Evaluation requires AUTHOR_EVALUATION. Exact result/Target/Subject validation and immutable evaluation identities remain unchanged. Missing/incompatible sources produce scientific validation rejection after authorization ALLOW.
- Decision requires AUTHOR_DECISION. If incoming or existing context includes NextAction or a continuation preview, AUTHOR_NEXT_ACTION is additionally required, including attempts to clear/replace a prior continuation. All required capabilities are checked before the combined command writes anything. NextAction remains scientific continuation, with no task/due-date/approval semantics.
- Creating a next Run still uses existing CREATE_RUN plus source VIEW and frozen Decision/NextAction validation. Consuming an already-authored continuation does not silently grant its authoring capability.

Permission denials are generic 403 for visible resources; invisible/missing sources are generic 404. Scientific conflicts/validation retain 409 and their existing scientific errors; they are not relabeled as missing permission. No alternative scientific HTTP endpoint bypasses the authorized composition.

## Trusted attribution

New `EngineerEvaluation.evaluator`, `Decision.recordedBy`, and `MeasurementValidityDecision.actor` use the persisted server Principal's stable user ID. Client author strings are ignored for authoritative attribution. For already-existing immutable identities, the persisted original author is preserved; other attempted content changes still reach and fail the existing immutable-identity check. Retry normalization is stable and never substitutes the retrying user's name for the historical author.

Actual and raw/manual Measurement schemas do not currently have author fields. Their source-system/provenance fields are not repurposed as author identity. This slice adds no fake author property, scientific schema change, or audit database. Comprehensive per-command attribution for those record types is a future audit/attribution concern. New records with existing author fields are trusted; legacy display-name authors are not retroactively authenticated.

## Query enforcement and Analysis

The authorized composition constructs MeasurementRepository with an internal, trusted principal scope. SQL predicates on the owning Run's Study filter Dataset discovery and independent Measurement queries before ordering and LIMIT checks. Existing bounded 1–10000 value queries and 1000-entry Dataset catalog bounds remain. Analysis uses those scoped sources and cannot bypass Measurement access.

Explicit Run/Dataset filters use set-based SQL `unnest` / NOT EXISTS validation. If any explicit source is missing or inaccessible, the entire request fails rather than silently substituting a visible subset. Unfiltered queries return only authorized evidence. No browser-provided role or load-all-then-filter authorization exists. Site/Subject/parameter/validity filters and exact RAW/DERIVED provenance remain intact. Core graph hydration is unchanged; existing repository validation confines lineage to the Run.

Indexes from Slice 1 cover membership, Study scope and grant lookup. Existing Dataset/Value Run/source indexes remain. The added Saved Analysis ownership index supports audience filtering. Large-enterprise query-plan tuning, pagination of broader catalogs and replacing coarse policy locks require measured follow-up; this is still a bounded pilot, not enterprise load certification.

## Saved Analysis: read-only audience AND all sources

Strict all-source access is the v1 policy. `accessibleSavedAnalysisIds` filters in PostgreSQL before loading metadata or returning lists. It requires:

1. Explicit trusted ownership mapping (or Admin access to an explicitly mapped view), plus parent Study VIEW.
2. Access to every Run and Dataset declared in the saved configuration.
3. Access to every source reference, with exact Dataset→Run→Study, Subject, optional MeasurementExecution and optional representative-result identity resolution.

Any missing/inaccessible required source rejects the whole view. The response says Saved Analysis or required sources are unavailable/inaccessible; it reveals no hidden source names or values. The existing unavailable-view UI does not render default scientific rows in place of a failed saved identity. Lists omit the view entirely. Revocation and missing exact sources are tested.

Migration 010 adds `saved_analysis_access(saved_analysis_id, owner_principal_id)` because legacy configuration.owner is an unverified display string, not trusted identity. No ownership is inferred from that string or from a Study owner. Unmapped legacy views remain unavailable, even to Admin. The privileged pilot provisioning CLI accepts explicit `analysisOwners: [{savedAnalysisId, principalId}]` backfill mappings. This is trusted administrative provisioning, not a share-management API. The historical saved configuration is untouched.

PRIVATE and legacy SHARED both require that trusted mapped audience at present. SHARED is not reinterpreted as public or department-wide. Explicit Saved Analysis sharing/audiences, share commands, ownership transfer, and configuration write authorization remain deferred. This narrower read-only policy intentionally fails closed until those policies exist.

## UI projection

Planning read-back includes `scientificPermissions`: canRecordActual, canRecordMeasurement, canManageMeasurementValidity, canEvaluate, canDecide and canAuthorNextAction. It also retains Study permissions for continuation creation. Existing Engineering Grid supplies authoring callbacks only when permitted. Inspecting evidence, provenance, results, evaluation and decisions remains available to viewers. The frozen combined Decision/NextAction form requires both flags. React performs no role/organization interpretation. No new screen or validity editor was introduced.

## Proof and validation

`tests/postgres-scientific-authorization-contract.ts` runs the parsed production Request handler, authorized composition and real repositories for fresh Wafer and Specimen lifecycles. It uses distinct owner, department viewer, operator, measurement specialist, validity specialist, evaluator, decision authority, cross-department collaborator, leader, Admin and unrelated personas. Scientific fixture preparation uses existing frozen command builders; protected writes pass through the HTTP command boundary.

Coverage includes direct denied Actual/Measurement/exclusion/restore/Evaluation/Decision requests with no scientific row-count mutation; mixed Measurement+validity capabilities; atomic Decision/NextAction capability checks; separate authoring personas; forged actor claims; stable retries; current membership revocation without author rewrite; owner/Admin scientific validation and Plan locks; scoped SQL queries and limits; strict mixed-source rejection; trusted Saved Analysis audience, all-source access, revocation and missing exact references. Both subject types share the identical policy and production code path. The existing full Core contracts continue through trusted adapters to verify scientific semantics separately from authorization.

These are end-to-end API/SQL persona contracts, not a claim of automated full-browser persona acceptance testing. Full authentication/session and browser deployment security remain out of scope.

## Deferred gates

Configuration governance needs explicit author versus activation/Study-readiness capabilities; verified scope mapping, delegation ceilings and reference discovery policy; immutable exact-package checks must remain independent.

Saved Analysis sharing needs trusted ownership rollout, explicit audience targets and publication ceilings, share/manage commands, revocation behavior and all-source policy preservation. The current read-only mapping is not a sharing implementation.

Before deployment beyond the trusted loopback pilot: verified per-request authentication/session protection, real directory integration, unresolved PRIVATE leadership oversight decisions, trusted administrative access commands, tenant isolation, audit/evidence delivery in their own slices, and load/revocation/concurrency validation. Parameter/source confidentiality, electronic signatures, organization dashboards, Analysis v2 and AI/DOE are not implemented.

## Completed validation — 2026-09-20

- Full suite: **250 passed** (108 domain, 127 workspace, 15 PostgreSQL/PGlite integration contracts).
- Native PostgreSQL 18: passed, including fresh Wafer/Specimen persona contracts, Core lifecycle, concurrency and actual database restart/reconnection tests.
- TypeScript: passed. Changed-file lint: passed. Repository-wide lint retains **105 pre-existing errors**, reported separately and not expanded into unrelated fixes.
- PostgreSQL and browser builds: passed. `git diff --check`: passed.
- Live loopback HTTP: Wafer/Specimen inherited reads and owner capability projection pass; scoped Dataset discovery returns 200; missing Saved Analysis returns 404. The existing local verification DB has migration 010 applied; scientific records were not backfilled or rewritten by the migration.
- Persona authoring E2E evidence is the parsed Request handler + real PostgreSQL contract, not a full-browser multi-user login test.

Files changed: `src/application/authorization.ts`, `src/application/repository-ports.ts`; PostgreSQL `authorization.ts`, `authorized-application.ts`, `scientific-authorization.ts`, `saved-analysis-authorization.ts`, `postgres-measurement-repository.ts`, migration `010_authorization_scientific.sql`; `engineering-grid.tsx`; migration/provisioning scripts; Slice 1 test compatibility plus scientific authorization contract and both test harnesses; README and authorization design/implementation docs. No domain scientific algorithm was modified.

## Final review

1. YES — Run visibility governs downstream reads.
2. YES — RECORD_ACTUAL is server-enforced separately from VIEW.
3. YES — RECORD_MEASUREMENT is server-enforced separately from VIEW.
4. YES — validity management is a distinct capability.
5. YES — Evaluation authorship is independent of Measurement recording.
6. YES — Decision authorship is independent of Evaluation.
7. YES — NextAction authoring is protected scientific continuation.
8. NO — direct unauthorized scientific requests cannot mutate evidence/reasoning.
9. YES — department viewers retain read-only evidence access.
10. YES — scoped explicit grants provide selective cross-department authoring.
11. YES — leadership VIEW is not authorship.
12. YES — Admin alone has no scientific authorship; granted Admin still obeys scientific validation/locks.
13. YES — Saved Analysis requires trusted audience AND all exact source access; missing/unmapped sources fail closed.
14. YES — Measurement source filtering precedes SQL bounds and browser delivery.
15. YES — existing author fields on new Evaluation/Decision/validity records use trusted Principal user ID. Actual/raw Measurement currently have no author field; no new scientific/audit field was invented.
16. YES — membership changes do not rewrite historical authors or scientific snapshots.
17. YES — identical generic policy path for Wafer and Specimen.
18. NO — frozen Core semantics were not changed.
19. NO — no uncovered scientific write endpoint bypass; unsupported writes deny.
20. YES — Slice 2 is complete within the same limited trusted-identity pilot; not full enterprise deployment readiness.
21. Remaining gates: Configuration scope/capability governance; Saved Analysis ownership backfill and explicit sharing audiences/ceilings/commands with all-source intersection; verified authentication/session and directory/admin integration; unresolved broader private-oversight policy; audit/evidence/tenant isolation and enterprise scale validation. See Deferred gates.
