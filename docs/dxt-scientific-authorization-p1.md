# Scientific authorization P1 — responsibility is not scientific authority

Authority: [decision 7163843471](https://github.com/Naeun-Ouh/dxt-lims/issues/1#issuecomment-7163843471), [kickoff 7180326665](https://github.com/Naeun-Ouh/dxt-lims/issues/1#issuecomment-7180326665).

Implementation is isolated on `codex/scientific-authorization-p1`, based on PR #12 commit `2e1a1b2fa28255fb02b92509aef8c9582fe4d6cc`. This is a focused stacked PR targeting `codex/issue-11-study-bootstrap`, not a merge of sibling workstreams. No changes to condition precedence, Sample schema, #16 SQL, UI, live grants, or existing UAT data.

## Boundary and behavior

The authoritative production HTTP command boundary remains `authorizedOperation` → `PostgresAuthorization` inside the same repeatable-read transaction as the write. Existing policy-table locks serialize grants/revocations with commands. All scientific commands and their permission projections now require both current Study visibility and an active, unexpired, exact-action explicit principal or non-managed unit-membership grant. Responsibility and supplied client roles cannot satisfy the capability check. Policy version is `explicit-scientific-authoring-v6`.

No schema or SQL migration is required. Historical migration files and SQL function definitions remain checksum-stable. Their scientific role-based results are **legacy policy evidence, not authorization for production writes**; they are retained for transition inventory. Current production direct SQL callers use these functions only for discovery/read scope and access administration. Future scientific entry points must use `PostgresAuthorization`, never a direct legacy `dxt_study_access_reason(..., scientific_action)` call. This deployment does not provide database-account security against a trusted operator with direct SQL access; that is not the application threat boundary.

The explicit-grant reason wins for scientific actions even when the actor is responsible or ADMIN. This fixes the former masking of explicit grants by `RESPONSIBLE_USER`. There is no implicit conversion of old role access into grants.

## Exact action-by-role matrix

`D` = deny without an applicable explicit action grant. `E` = allow with explicit action grant **and** existing resource visibility. `X` = deny even with a write grant if resource access is absent. `R` = deny after all applicable grants are revoked/expired; an independent still-valid principal/unit grant may continue to authorize.

| Action | Creator only | Responsible only | ADMIN only | Member/leader only | Responsible + explicit | ADMIN + explicit | Non-owner + explicit and scope | Cross-org write grant only | Revoked/expired |
|---|---|---|---|---|---|---|---|---|---|
| CREATE_RUN | D | D | D | D | E | E | E | X | R |
| EDIT_RUN_PLAN | D | D | D | D | E | E | E | X | R |
| RECORD_ACTUAL | D | D | D | D | E | E | E | X | R |
| RECORD_MEASUREMENT | D | D | D | D | E | E | E | X | R |
| MANAGE_MEASUREMENT_VALIDITY | D | D | D | D | E | E | E | X | R |
| AUTHOR_EVALUATION | D | D | D | D | E | E | E | X | R |
| AUTHOR_DECISION | D | D | D | D | E | E | E | X | R |
| AUTHOR_NEXT_ACTION | D | D | D | D | E | E | E | X | R |
| MANAGE_REASONING_CONTEXT | D | D | D | D | E | E | E | X | R |

An inactive principal, absent Study access context, or NULL visibility result always denies. A follow-up for review 7180748191 explicitly guards SQL NULL before checking grants; an adversarial disposable-database contract replaces the visibility function with a NULL-returning implementation inside a rolled-back transaction and verifies denial for all nine actions, including a valid explicit grant. Grant checks are action-specific: one grant never supplies the other eight capabilities. Managed-only organization membership is not a unit grant recipient. Approved cross-organization collaboration remains possible with a separate explicit VIEW_RUN/VIEW_STUDY relationship plus the scientific action grant. ADMIN visibility and MANAGE_ACCESS remain existing administrative duties, not scientific authority. Creator identity has no independent role branch; Study creation still records its responsible user but writes zero scientific grants.

Unchanged actions: discovery/read actions, EDIT_STUDY, EDIT_STUDY_SETUP, MANAGE_ACCESS, configuration governance and Study-creation grants. Responsible users retain existing Study metadata/default setup duties; these do not create or edit a Run, write evidence, or initialize optional reasoning criteria. Existing Plan locks, exact references, provenance and immutable scientific histories still apply after authorization succeeds.

## Legacy privilege inventory and transition risks

The legacy implicit surface is exactly eight actions for each active responsible principal: CREATE_RUN, EDIT_RUN_PLAN and the six execution/measurement/interpretation actions. MANAGE_REASONING_CONTEXT was already explicit-only and remains so. The creation→responsibility mapping made creators implicit recipients. ADMIN alone had no scientific authoring entitlement, but an ADMIN who was also responsible inherited the same eight capabilities.

`inventoryImplicitScientificAccess` returns each Study/principal/action whose old reason was RESPONSIBLE_USER, the proposed effect/reason, and:

- `REVIEW_REQUIRED`: implicit access will no longer authorize. Do not silently backfill grants.
- `EXPLICIT_GRANT_PRESERVED`: an applicable explicit grant already exists, including grants previously hidden by reason precedence.

Disposable-database evidence covers all eight implicit actions, preservation of an explicit responsible-user grant, unchanged grant rows during inventory, inactive users, expired/revoked grants, principal and unit grants, and organization membership loss. **No live/UAT inventory or privilege update was performed.** Actual affected principal counts remain an environment-specific deployment prerequisite; test counts are not a production census.

Operator-only read-only inventory tool (Node 22+; existing dependencies):

```sh
mkdir -p tmp/scientific-access-review
node_modules/.bin/esbuild scripts/audit-scientific-access.ts --bundle --platform=node --format=esm --packages=external --outfile=tmp/scientific-access-review/audit.mjs
# DATABASE_URL must be supplied explicitly for the separately authorized target.
node tmp/scientific-access-review/audit.mjs > tmp/scientific-access-review/inventory.json
```

The tool uses a REPEATABLE READ READ ONLY transaction, performs SELECTs only, never loads a local .env automatically, and is not a startup/migration hook. Inventory contains internal principal/Study IDs: retain it in restricted operator records, not a public GitHub comment.

### Required reviewed transition before deployment

1. Product/Architecture and the environment owner authorize a read-only inventory on the exact deployment target. Review each affected principal/Study/action with current organizational responsibilities, explicit grants, expiration and revocation history.
2. Record an explicit decision for each `REVIEW_REQUIRED` row: authorized narrowly scoped capability, or intentional loss of implicit access. Responsibility alone is not justification for a blanket grant. Do not reactivate revoked/expired rights.
3. If grants are approved, an authorized operator applies only the reviewed assignments with attributable grantor/expiry. Do not backfill all owners or admins, change existing evidence authors, or rewrite Runs. **This implementation does not execute this step.**
4. Recheck inventory, scope and action-level denials in a fresh acceptance environment. Coordinate application cutover: old and new application versions must not concurrently serve scientific writes because old versions retain implicit authority. Drain existing commands; revocations take effect for subsequent transactions under the established lock policy.
5. Deploy only after the transition and required acceptance are reviewed. Rollback to the old application would restore implicit authoring and therefore requires security review; never use rollback as an unreviewed grant mechanism.

## Automated validation

- Full repository regression: **349 tests PASS**, zero failures, including all 24 PGlite adapter tests.
- Native **PostgreSQL 18.7** contract suite: PASS on a newly initialized temporary database, including the complete nine-action authorization matrix, read-only inventory, Wafer/Specimen lifecycle and restart/readback checks. Temporary database was removed by the runner.
- Focused scientific authorization, creator/Study bootstrap, configuration authorization and migration-risk tests: PASS. Revoked responsible-user grants deny Actual/Measurement/Evaluation/Decision writes without persisting rows; explicit authorized users still complete the workflows.
- TypeScript: PASS for all tracked source files plus added files using a temporary project config to exclude ignored sibling worktrees. Product tsconfig unchanged.
- Changed-file type-aware lint (`--no-ignore`): PASS for 13 TypeScript/TSX files. Full-repository lint was not used as a new gate.
- Production build (`DXT_REPOSITORY=postgres npm run build`): PASS. Isolated worktree needed an ignored non-secret `.openai/hosting.json` with unused hosting bindings; no deployment or credentials were introduced.
- `git diff --check`: PASS. Inventory CLI bundles successfully; inventory logic executes inside a READ ONLY transaction in both database contract suites.
- Initial regression failures exposed test actors relying on implicit responsibility and a shared native-test fixture cleanup omission; explicit disposable test grants/cleanup corrected those tests. Initial build/typecheck setup errors were the missing ignored hosting config, corrected locally. Final gates above passed.

No browser automation or test results are counted as Human acceptance. The tests use disposable fixtures only; no existing UAT/live grants or scientific data were modified.

## Human acceptance and separate gates

Human acceptance: **NOT RUN** for this authorization change. Existing PR #12 Human UAT status is not changed. No PR merged; no environment deployed. Required remaining gates: reviewed live privilege transition, bounded exact-head Human UAT, sibling-stack integration regression. Sample schema and #16 SQL remain separate approvals.
