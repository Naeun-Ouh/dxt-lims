# Issue #16 — immutable Run criteria provenance: SQL review candidate

Status: **DESIGN / MIGRATION REVIEW ONLY — NOT APPROVED FOR APPLICATION**.

This proposal follows [the safety correction 7145097572](https://github.com/Naeun-Ouh/dxt-lims/issues/16#issuecomment-7145097572), which supersedes historical `ABSENT` backfill. The SQL exists only under `docs/proposals/issue-16`; it is not registered in the application migration sequence. No application code, UAT database, migration ledger, authorization policy or scientific record was changed. PR #12 remains unmerged.

## CURRENT SCHEMA

- Migration 004: `reasoning_context(id, study_id, package_version_id, payload)` has `UNIQUE(study_id, package_version_id)` and immutable update/delete triggers.
- `engineer_evaluation.context_id` and `decision.context_id` already store exact immutable UUID references. Migration 008 adoption and migration 015 initial-criteria receipts also reference this identity.
- `readReasoningContext()` joins Run → current Study/package context; it cannot distinguish creation absence, unknown legacy provenance, selected criteria or later interpretation.
- `PostgresRunRepository.create` already uses a transaction, locks the Study, checks source fingerprint/readiness, calls `insertSnapshot`, updates the idempotency receipt and reads back before commit.
- Existing explicit capability `MANAGE_REASONING_CONTEXT` requires a grant. Admin/Study owner does not automatically receive that scientific capability. This proposal does not change that policy.

## FAILURE MODE

A context added later to a Study/package is silently available to earlier Runs through the current resolver. A new binding alone does not solve multiple targets: uniqueness prevents two distinct criteria payloads within the same Study/package. Blindly removing uniqueness makes existing queries ambiguous. Treating every legacy Run as `ABSENT` fabricates creation-time knowledge.

## PROPOSED TABLES+KEYS

Exact DDL: [016_run_reasoning_provenance.PROPOSED.sql](./016_run_reasoning_provenance.PROPOSED.sql).

| Object | Identity / constraint | Meaning |
| --- | --- | --- |
| `reasoning_criteria_definition` | UUID; immutable Study/package scope | Version family for reusable criteria, not a new scientific entity |
| `reasoning_criteria_revision` | Existing context UUID remains PK; `(definition_id, revision)` unique; exact Study/package composite FK | Immutable complete existing criteria payload; multiple distinct revisions allowed under the same Study/package |
| `study_legacy_reasoning_selection` | `(study_id, package_version_id)` PK; exact composite FK | Explicitly freezes the one context that existing Study/package consumers historically resolve |
| `reasoning_context` | Four-column compatibility view | Existing IDs, payloads, Study/package cardinality and INSERT shapes remain usable |
| `run_reasoning_origin` | Run PK; state/context consistency; actor/evidence; immutable | Creation-time `UNKNOWN_LEGACY`, `ABSENT`, or exact `SELECTED` |
| `run_reasoning_interpretation_adoption` | UUID PK; unique Run/command and Run/sequence; immutable | Explicit later interpretation choice with actor, expected sequence, request hash and rationale |

The physical `reasoning_context` table is renamed, not copied/rekeyed. PostgreSQL keeps existing Evaluation/Decision/receipt foreign keys bound to the same table object. Old rows become revision 1 in individual version families, with their original UUID and payload. Their creator/time remain NULL because this information was not recorded; migration does not invent it.

The legacy view exposes exactly the four original columns. Its insert-only trigger creates a version family, revision 1 and fixed legacy selection atomically. Existing duplicate Study/package writes still fail. Update/delete are rejected. No later revision silently replaces the legacy selection. Existing scientific context UUIDs remain authoritative.

### CONSTRAINT CHECK

- New origin `ABSENT` requires NULL context; `SELECTED` requires an exact context UUID. Both require an existing actor and `CREATE_RUN`; selecting criteria additionally requires explicit `MANAGE_REASONING_CONTEXT`.
- `UNKNOWN_LEGACY` is inserted only during migration before the new insert guard is installed. Future commands cannot use it to evade an explicit creation answer.
- Bindings verify context Study and package equal the Run's persisted Study and exact package pin. Cross-Study and cross-package contexts fail.
- Adoption requires the existing explicit reasoning capability. It never confers `AUTHOR_EVALUATION`, `AUTHOR_DECISION` or other scientific permission.
- Definition revision writes use `create_reasoning_criteria_revision`: explicit actor/capability, version-family row lock, expected revision and immutable UUID retry identity. Reusing an ID for different payload/actor/version fails.
- Application must validate payload shape, Target parameter/point/rule references and exact package membership using existing validators **before** revision writes. SQL tests of identity/versioning are not scientific-validity tests. No fake Target defaults are introduced.
- Definition/revision/selection/origin/adoption records reject update/delete and truncate. Ordinary DB owner maintenance can bypass any trigger; this proposal does not claim to authorize arbitrary SQL clients.

## READ RESOLUTION

`run_reasoning_resolution` explicitly returns creation state, creation context, interpretation context and interpretation sequence. It never joins via Study defaults to invent Run criteria.

1. Creation answer comes only from origin. `UNKNOWN_LEGACY` is displayed as unknown, never as proven absence.
2. Current interpretation is the highest committed adoption **sequence**, not timestamp ordering.
3. If no adoption exists, `SELECTED` uses its creation context; `ABSENT` and `UNKNOWN_LEGACY` yield no interpretation context.
4. Every saved Evaluation or Decision resolves its own `context_id` against `reasoning_criteria_revision`, even after later adoption.
5. An unknown legacy Run may acquire explicit interpretation criteria while its origin remains unknown. A new exploratory Run may do the same while origin stays absent.

### EXACT READ CHANGES (future approved implementation; not in this PR)

- `src/infrastructure/postgres/reasoning-context.ts:readReasoningContext`: resolve Run domain ID → origin/adoption view → exact revision; return explicit no-context/unknown state, not a guessed Study context.
- `PostgresEvaluationRepository.getContext/saveByRun` and `PostgresDecisionRepository.saveByRun`: consume exact interpretation revision. At authoring, carry expected context/sequence from the viewed state and reject if another actor adopted different criteria. The existing Run lock used by reasoning writes and the adoption lock must be the same row.
- Historical saved Evaluation/Decision reads: retain stored context UUID; fetch its payload from the revision table. Do not recompute against newly adopted criteria.
- Study readiness/proposals and initial-criteria bootstrap may continue using the compatibility view during the transition. A future version-selection UI queries revision identities explicitly, never `rows[0]` for a Study/package.
- New Run continuation must not silently copy criteria from a current Study or a newer interpretation; explicit selection is needed if creation-time criteria are desired. Current execution-only creation records ABSENT.

The compatibility view deliberately preserves old Study lookup behavior; it is **not** a substitute for changing the unsafe Run resolver. SQL alone does not complete Issue #16.

## WRITE FLOW

### EXACT CREATE WRITE POINT

In `src/infrastructure/postgres/postgres-repositories.ts`, inside the existing transaction:

```text
authorize trusted Principal for CREATE_RUN
lock Study; check idempotency/source fingerprint/execution readiness
insertSnapshot(...) → run_id
INSERT run_reasoning_origin(run_id, state='ABSENT', principal_id, evidence)
mark idempotency SUCCEEDED; read back; COMMIT
```

Future explicit creation criteria use SELECTED + exact revision UUID and the existing reasoning capability. No Target or Evaluation prerequisite is added to execution readiness. A deferred constraint trigger prevents committing any new Run without an origin. A failed origin insert rolls the entire Run transaction back.

### Later interpretation and concurrency

`append_run_reasoning_adoption` locks the Run and rechecks the trusted actor's explicit capability. Existing same-command/same-hash/context/actor/rationale/expected-sequence returns the previous ID. Different payload under the same command conflicts. After retry handling, expected sequence must equal the committed head. The next row gets `expected + 1`. Two concurrent different commands from the same head cannot both succeed; the loser must reread. Concurrent identical retries return one ID and create one row.

The server computes the canonical request hash and supplies the server-resolved Principal. The browser must never choose the actor. Existing permission guards remain in place; these SQL checks are defense in depth, not a replacement identity mechanism. Capability revocation is rechecked even for retries.

`confirmed_at` is audit time only; wall-clock ties/backdating cannot select a different current context. No mutable head pointer or supersedes column is required because Run/sequence provides one deterministic lineage.

## MIGRATION

### REQUIRED MIGRATION

Candidate next migration number is 016, subject to the actual approved branch ordering at implementation time. The proposal is not put under `src/infrastructure/postgres/migrations` and has no runtime registration.

1. Maintenance/controlled rollout; transaction locks both context and Run writes.
2. Rename physical context table; preserve its UUIDs and FK object identity.
3. Add version-family metadata and backfill it deterministically from existing IDs. Temporarily disable only the immutable update trigger within this transaction for metadata backfill; restore immediately. Do not alter payloads, old context IDs, existing Evaluation/Decision records or Run records.
4. Create fixed legacy selection and four-column compatibility view/insert guard.
5. Insert UNKNOWN_LEGACY origins for **all** existing Runs; install immutable and future-write guards.
6. Create append-only adoption, deterministic resolution and deferred new-Run origin guard; commit.

No historical ABSENT/SELECTED exceptions are invented. If independent persisted creation evidence is later found, Architecture must review an exact evidence-to-Run mapping **before** an alternative backfill is applied. A saved Evaluation context, current matching Study context, seed resemblance or timestamp proximity is not proof of creation-time selection/absence. Migration timestamp records when provenance classification was recorded, not when the Run was created.

The harness injects a failure immediately before COMMIT and verifies rollback restores the original table and rows with no proposed tables. It then applies the candidate only to the disposable database and verifies all old rows/FKs. Existing UAT data and migration ledgers are never read/written by the harness.

### Deployment/rollback boundaries

The old application cannot create Runs after this SQL because the deferred origin guard intentionally fails closed. Therefore approve SQL **and** coordinated repository changes before deployment; do not apply the SQL alone to a serving app. This is not presented as a zero-downtime migration.

Rollback before COMMIT is transactional and tested. After new revision/adoption writes begin, do not drop tables or flatten back into the old unique context table. Forward repair is required to preserve new evidence. Backup/restore rehearsal and exact production role/ACL review remain deployment prerequisites, not permission to delete data.

## BACKWARD COMPATIBILITY

| Existing use | Proposed behavior / evidence |
| --- | --- |
| `SELECT id, payload FROM reasoning_context WHERE id=...` for legacy records | Same row, UUID and payload |
| Study/package query expecting one row | Exactly original fixed selection; later versions are not implicit replacements |
| Four-column `INSERT INTO reasoning_context VALUES(...)` | Tested unchanged shape via insert-only trigger; duplicate Study/package still conflicts |
| Named four-column INSERT in provisioning/bootstrap | Same trigger path (no new required legacy input) |
| Existing Evaluation/Decision `context_id` | Same UUID, NOT NULL and FK; PostgreSQL target follows physical rename |
| Migration 008/015 receipt foreign keys | Preserved; legacy receipt insert tested |
| Existing immutable triggers | Physical trigger retained; compatibility view denies update/delete |
| New FK `REFERENCES reasoning_context` | **Must use reasoning_criteria_revision**; a view cannot be an FK target |
| `ON CONFLICT` against compatibility view | **Not supported**; repository search found no such current caller. Future upserts must use explicit revision/selection commands |
| New revision selected by Run | New resolver uses revision table; legacy view intentionally does not expose it |

No new nullability is introduced in saved Evaluation/Decision provenance. Their old IDs are neither rewritten nor backfilled with a new context. Existing legacy authoring routes retain their existing authorization guards; the compatibility insert trigger does not add a new public API or grant a capability.

## TEST MATRIX / VALIDATION

Reproduce from this worktree with the normal project dependencies available:

```sh
DXT_POSTGRES_BIN=/path/to/PostgreSQL/bin node docs/proposals/issue-16/validate-proposal.mjs
```

The runner ignores DATABASE_URL, allocates a free local port, creates a fresh PostgreSQL cluster, installs baseline migrations 001–015, runs existing measurement/reasoning repository contracts to populate historical evidence, tests proposed SQL, and finally stops/removes only its own temporary cluster. Synthetic threshold payloads are explicitly SQL identity test values, not UAT scientific data or application fixtures.

| Check | Expected |
| --- | --- |
| Inject failure before migration COMMIT | Full schema/data rollback |
| Baseline contexts, Runs, saved Evaluation/Decision | Complete old rows equal after migration |
| All 5 existing reasoning FKs | Still reference original UUIDs through renamed table |
| Legacy Run with existing saved evaluations | UNKNOWN_LEGACY, no inferred creation criteria |
| Same Study/package, two distinct target payloads | Two exact version IDs; legacy selection remains original |
| Revision retries/stale expected version/changed payload | Replay / conflict / conflict |
| New ABSENT and SELECTED Runs | Atomic origin; exact chosen context |
| Missing origin / SELECTED without ID / ABSENT with ID | Transaction fails, no durable Run |
| Future UNKNOWN_LEGACY | Rejected |
| Wrong Study / wrong package | Rejected at binding boundary |
| Admin or ungranted actor | No scientific capability escalation |
| Later adoption | Current interpretation changes; origin does not |
| Same command retries including simultaneous retries | One persisted identity |
| Two connections, different adoption commands, same expected sequence | Exactly one wins, other conflicts |
| Old Evaluation/Decision after adoption | All old payloads and context IDs unchanged |
| Definition/revision/selection/origin/adoption update/delete; origin truncate | Rejected |
| Legacy INSERT + uniqueness + receipt FK | Existing write contract retained |

Native PostgreSQL 18.6 validation: PASS. Exact execution log and final SQL hash are recorded in [validation.md](./validation.md). This is one native integration test containing the checks above, not a claim that a new deployed feature or Human UAT passed. Full product build/test reruns are unnecessary for documentation/proposal-only code; current PR #12 regression is a separate workstream.

## RISKS / ARCHITECTURE REVIEW REQUIRED

1. Approve the physical rename + compatibility view/insert trigger instead of nullable new provenance columns or destructive uniqueness removal. This is a substantive schema decision, deliberately not applied.
2. Approve UNKNOWN_LEGACY for every existing Run in the absence of reviewed creation evidence. Accept that legacy interpretation is unavailable until explicitly adopted, while saved Evaluation/Decision remain readable through exact IDs.
3. Approve immutable definition families/revision CAS and explicit per-Run selection/adoption capability reuse. No new capability or implicit owner/Admin scientific access is proposed.
4. Confirm coordinated runtime rollout: trusted Principal in origin writes, generic no-context reads, exact historical reads and expected interpretation version in scientific authoring. Missing any of these blocks deployment.
5. The tests exercise actual baseline migrations and repository-generated historical rows, but cannot prove compatibility of external SQL consumers, production ACLs or unsupported historical exports. Inventory those before production migration; ON CONFLICT/view FK users require explicit remediation.

Human acceptance: **NOT RUN**. No new UI delivered by this design PR. Remaining executable work after Architecture reviews exact SQL: implement the approved repository/read/write contract on a focused branch, rerun full and native contracts, then prepare bounded Human UAT. Do not merge or apply this candidate as part of unrelated Actual/Measurement or Sample lifecycle work.
