# Issue #9 — exact Sample lifecycle migration and integration proposal

Status: **PROPOSAL FOR ARCHITECTURE REVIEW — NOT ACTIVATED**. This is a separate approval gate from Issue #16 / PR #17. Existing runtime migration registration, UAT data and live permissions are untouched. PR #18's truthful read-only usage slice remains unchanged; this proposal does not claim Sample creation is operational in the product.

Authority: Issue #9 comment [7163845909](https://github.com/Naeun-Ouh/dxt-lims/issues/9#issuecomment-7163845909), PR #21 [7180748191](https://github.com/Naeun-Ouh/dxt-lims/pull/21#issuecomment-7180748191), Issue #1 [7180749019](https://github.com/Naeun-Ouh/dxt-lims/issues/1#issuecomment-7180749019). Base: PR #21 including NULL-visibility hardening `d9fb191`.

## Exact deliverables and separate approval gate

- `017_sample_lifecycle.proposed.sql`: executable proposal DDL/commands, **outside runtime migrations**. Requires existing 001–015. Number 016 remains reserved for reasoning design; this proposal has no dependency on 016's criteria semantics/tables. Migration-ledger ordering must be coordinated at activation; do not create an empty 016 or silently skip a ledger prerequisite. If 017 is approved first, independently apply the approved Sample change only through a separately reviewed ledger ordering change.
- `activate-roles.proposed.sql`: explicit restricted-owner/server-service role activation **template**, tested only inside disposable clusters. No live role/grant changes. Environment role names and trusted login membership need review.
- `sample-contract.test.ts` / `run-contract.mjs`: creates and destroys its own native PostgreSQL cluster; accepts no database URL. It applies 001–015 and this proposal only to that disposable cluster. Seed references and scientific values are test fixtures, never a production fallback.

## Retained boundaries

Stable Sample and SampleRevision fields reuse `src/domain/material/sample.ts`. Composition nodes/edges and property values reuse `structure.ts` / `property.ts`, retained as immutable aggregate snapshots. The registered Sample Revision and configured material reference are different identifiers. No existing configuration reference is renamed, reinterpreted or migrated into a Sample Revision. No status transition, supplier redesign, certificate/QC, genealogy or Actual-consumption command is added.

## Concrete data model

| Table | Identity / invariant | Meaning |
| --- | --- | --- |
| `dxt_sample.sample` | immutable ID; unique `(owning_org_id,sample_code)` | stable identity in explicit existing organization namespace |
| `revision` | immutable ID; unique `(sample_id,revision_number)` | complete immutable metadata, composition and property snapshot |
| `access_grant` | explicit principal OR ordinary membership unit; org and optional exact Sample scope | independent READ_SAMPLE / REGISTER_SAMPLE / REVISE_SAMPLE, active/expiry aware |
| `command_receipt` | `(actor_id,command_id)`; exact canonical JSONB request incl expected latest | atomic idempotency/readback; no key replay with changed payload |
| `material_mapping` | exact package version + reference kind/id + registered revision | explicit validated selection assertion at assignment creation, not a latest resolver |
| `run_assignment_link` | `(run_id,assignment_domain_id,link_version)`; original physical row UUID audit-only | append-only exact Plan-link history, survives current Plan writer row replacement |
| `legacy_unlinked_assignment` | stable Run + assignment-domain key inventoried at activation | protects existing unresolved usage from retrospective inference even after physical row UUID replacement |

The last table records only existing stable assignment keys, not a scientific mapping. It never changes an existing assignment, Run, revision or result. Existing assignments are unresolved and stay unresolved. Any evidence-backed historical linking needs a separate future approval.

Non-null supplier/material identity references are rejected because no authoritative operational master resolution exists today. NULL is allowed. A future authoritative resolver must be approved and explicitly integrated before lifting these checks; fixture IDs, labels or config-reference names are not evidence of supplier/material identity.

## Exact command contracts

`RegisterSample(commandId, owningOrgId, sample, firstRevision, composition, properties)`:

1. Resolve Principal from the trusted server boundary, never body/header `actorId`. Check active principal plus explicit org READ_SAMPLE **and** REGISTER_SAMPLE grants. Membership/creator/admin/Study rights alone confer neither.
2. Parse the existing Zod schemas and cross-object references: revision belongs to Sample, node references and property materialNodeId resolve within the submitted aggregate; exact external reference validation when supported. The current proposal tests individual existing schemas; full graph/cross-object application validation must be implemented before exposing commands. SQL is defense in depth, not a replacement for those schemas.
3. Use `write_revision(pid, commandId, 0, aggregate)` in one transaction. Identity + revision + receipt commit together; any validation failure rolls all back.
4. Return the exact recorded revision, not a latest lookup. Reload uses scoped reads.

`AppendSampleRevision(commandId, expectedLatest, aggregate)`:

- Requires explicit READ_SAMPLE + REVISE_SAMPLE in the owning org/exact Sample scope, independent of who created it.
- Sample identity cannot be modified during append. Full new snapshot, stable new revision ID, revision number `expectedLatest + 1`.
- Advisory lock serializes command key and Sample allocation; immutable identity row lock and latest comparison reject stale writers (`40001`). Two different commands racing with the same expected version yield one winner; a retry of identical command returns original revision. Revoked/expired principals cannot recover a success through a stale receipt.
- Null/empty actor, command, version, Sample or org fail closed. Numeric zero property value is retained as data. No default scientific values are supplied.

Sample commands do not use scientific Study capability aliases. Grant management is separate administrative provisioning, not a new UI or permission inferred from Sample ownership. Proposed Sample table grants are empty on install; no administrator, creator or department-wide grants are backfilled.

## Scope and authorization

| Situation | Result |
| --- | --- |
| creator / responsible user / admin / ordinary organization membership only | no Sample read/register/revise capability |
| explicit scoped action grant + active principal | allow only that action and matching org / exact Sample |
| REVISE without READ | denied; write capability does not silently disclose Sample |
| direct cross-org scoped READ grant | explicit access to only the granted Sample/org; no implicit neighboring access |
| unit action grant | active ordinary membership required; managed membership alone is not a grant |
| revoked/expired grant, inactive principal, removed unit membership, NULL context | denied, including command retries |
| Run material linking | existing Run visibility **and** explicit CREATE_RUN / EDIT_RUN_PLAN **and** Sample READ |

SQL functions receive a principal identifier from the **trusted server**. A SQL argument or custom GUC is not authentication. Untrusted roles get no schema access/function execute/table DML; they cannot select a privileged role or spoof an actor through a setting. The trusted service is an intentional trust boundary: if compromised, actor selection cannot be secured merely by SQL parameter checks. No function is granted to end-user database logins.

SECURITY DEFINER uses a dedicated NOLOGIN/NOSUPERUSER/NOBYPASSRLS owner and fixed search_path. PUBLIC EXECUTE is revoked. PUBLIC schema CREATE is revoked because legacy authorization functions internally resolve other public functions without qualification. Review any pre-existing CREATE grants to named roles too; every schema on the definer search path must be writable only by trusted owners. Runtime service gets entrypoint EXECUTE, never direct Sample DML or schema CREATE. Revision/mapping/link/receipt/identity mutation and TRUNCATE are rejected; superuser/owner DDL remains an administrative trust boundary, not claimed protection against administrators disabling triggers.

### Scientific policy integration prerequisite

The proposal's Run-link function currently embeds a **temporary parity implementation** of PR #21's visibility-first, explicit-action-only policy, including NULL denial. This is contract evidence, not approval for two lasting scientific resolvers. Before runtime activation, replace that block with the coordinated `dxt_explicit_scientific_access_reason` authority from the Issue #16 integration proposal, and have `PostgresAuthorization` call the same authority. Package that shared helper independently of reasoning table migration 016; adopting it must not approve or activate Target/Evaluation schema. Sample registration/revision permissions remain their own scoped resource policy. The final reviewed migration/hash must include this integration change and parity evidence before registration.

## Exact Run assignment linkage and current writer compatibility

The current `savePlanningWorkspace` deletes and recreates `run_assignment` rows with fresh UUIDs. A link FK to physical `run_assignment_id` would either lose provenance through cascade or break every Save Plan. Therefore the proposal stores immutable link events keyed by stable `(run_id, assignment_domain_id)`; row UUID is only original evidence. Tests reproduce delete/reinsert and preserve the exact link. A different explicitly selected revision appends a new version with expected-link-version CAS; it never rewrites the prior event.

Required coordinated runtime changes, **not implemented by this proposal**:

1. Extend the planning transport/snapshot with an optional explicitly selected SampleRevision ID and expected link version. Keep configured material reference unchanged. Load existing resolved link by stable key; mark absent legacy links unresolved. Do not infer from display labels.
2. In existing authoritative Preview/Create/Save Plan, validate the assignment against its exact pinned configuration and applicability, preserving permissions, Plan locks and fingerprint/version checks. Resolve selected SampleRevision with scoped READ and match an allowed configured MATERIAL reference; reject an unknown or mismatched context.
3. Inside the same transaction as assignment insertion, call `link_new_assignment`. For a new Run use CREATE_RUN; existing unlocked Plan uses EDIT_RUN_PLAN. Never call this as an asynchronous post-create repair job. Map rollback to existing actionable application errors.
4. Physical rewrite with unchanged selection keeps existing event; explicit revision change appends an event with CAS. If operation/assignment is removed, retain prior events for audit; the current usage projector only joins currently present assignments. Re-adding a stable domain key must be an explicit selection, not automatic latest-link resurrection. Do not auto-fill missing selections from old events during save.
5. Copy/Previous Run carries the exact selected revision ID and source provenance to the new Run and revalidates READ/config/context at creation. A later Sample revision never changes copied or historical meaning. If user changes revision, show that change; no silent latest substitution.
6. Frozen Run and post-execution Plan cannot be edited; enforce existing `planLockReason` / `validatePlanEdit`. No Sample command changes that rule or Actual evidence.
7. Usage read joins the latest link event matching the **current** assignment's package/ref identity; missing or mismatched link is explicitly unresolved, never joined to latest Sample revision. Historical audit reads use stored event/revision, not current latest. Apply Run visibility AND Sample READ before linked Sample detail/count/search. Existing unlinked PR #18 material projection remains truthful and separate.

The SQL command also requires insertion in the current top-level transaction (`xmin` guard); it fails closed for rows inserted by a subtransaction, so the future coordinated writer must not use a nested savepoint for assignment insertion/linking. This is a proposed guard, not a durable provenance identifier. Stable legacy-key inventory prevents rewriting a historical unresolved row from bypassing the guard. Full application Plan-lock, input-schema and applicability validation still must be integrated before activation.

## Migration and operational risk review

- New tables only; old operational rows and grants unchanged. Inventory is read-only against old material assignments. Historical results/provenance retain existing representations.
- Blocking migration risks: organization namespace uniqueness/case policy (current proposal uses exact text, not implicit case folding), existing duplicate/unverified imported sample codes (no import included), trusted login role mapping, named-role CREATE on public schema, transaction savepoint usage, stable assignment-ID reuse, runtime writer/read/copy transport changes.
- Identity is immutable and no rename/status transition command is offered. If later required, approve it separately.
- SQL aggregate checks enforce required top-level shapes and identity metadata; full existing schema and cross-object validation belongs at the trusted application command. Public SQL entrypoints must not be exposed directly to clients.
- Forward deployment: backup/inventory → independent Sample schema approval → final coordinated helper/writer/ACL contracts → migration in disposable staging → opt-in activation → Human UAT. No grant migration inferred from creator/responsibility. Rollback of application should disable new writes; do not drop immutable tables after use.
- Explicitly deferred: Actual consumption evidence, status lifecycle, supplier/material master resolution, QC/certificate, broad genealogy. Plan usage is never labeled consumption.

## Reproducible agent validation

Run from repository root with Node runtime available:

```sh
DXT_POSTGRES_BIN=/Volumes/Postgres-2.9.7-18/Postgres.app/Contents/Versions/18/bin node docs/proposals/issue-9/run-contract.mjs
```

The harness provisions its own temporary PostgreSQL 18 cluster and removes it in `finally`. No external connection URI is accepted. Native contracts cover atomic registration, exact readback, idempotency mismatch/retry, CAS concurrency, immutable prior snapshots, zero, malformed shape, namespace uniqueness, explicit read/register/revise, cross-org explicit read, revocation/expiry/inactive principal/unit removal, creator/admin denial, NULL fail-closed, preserved unresolved historical usage, physical row replacement, actual new Run copy, immutable link-version history, untrusted actor/GUC/role spoof denial, trusted execute-only calls and no direct DML, and fresh connection readback.

See `validation.txt` for the final exact SQL hash and test output. These are **agent contract checks only**. Full product UI lifecycle and Human acceptance are **NOT RUN**; Sample write UX is not ready for Human UAT until the approved runtime integration exists. Full application regression is not re-claimed for a proposal-only branch; production application code is unchanged from the reviewed base.
