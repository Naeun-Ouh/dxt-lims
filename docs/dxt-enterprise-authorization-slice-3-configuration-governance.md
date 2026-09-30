# Authorization Slice 3 — Configuration governance

Status: COMPLETE within the trusted development-Principal pilot. This is the existing trusted server-development Principal pilot. It does not introduce authentication, an IAM administration UI, approval workflow, or enterprise deployment certification. Production Core v1 scientific semantics remain frozen.

## Boundary and capabilities

Production GET/POST `/api/repository` enters `authorizedOperation`. Principal identity comes from server configuration and active persisted identity; client headers, role names and actor strings cannot select it. Definition, applicability, package, and reasoning mutations are authorized inside the same repeatable-read transaction as the existing authoritative commands. The policy snapshot holds shared locks on authorization tables, including the two new configuration access tables. Current grant/membership revocation cannot race an in-flight authorized transaction. Subsequent requests reauthorize. No global ALLOW cache exists.

Five configuration-scope actions are independent:

- `VIEW_CONFIGURATION`: discover definitions, applicability and package versions within an explicitly mapped readable scope.
- `AUTHOR_DEFINITION`: create an immutable definition revision in that scope.
- `MANAGE_APPLICABILITY`: create an immutable rule-set version in that scope.
- `CREATE_PACKAGE_VERSION`: create a draft shell and assemble an exact package manifest in that scope.
- `ACTIVATE_PACKAGE_VERSION`: activate or deactivate an exact persisted package version in that scope.

`MANAGE_REASONING_CONTEXT` is a separate Study-scoped capability using `study_access_grant`. It requires Study visibility as well as the explicit action grant. It does not imply Study Setup editing, package assembly, activation, or any scientific observation authorship. Study ownership, department membership, leadership and ADMIN do not supply this capability automatically.

Command scope comes from the submitted immutable artifact on creation; assembly scope comes from the persisted draft; activation/deactivation scope comes from the persisted exact package. Client-supplied extra scope/role/author fields cannot override stored authority. Missing/malformed targets, missing Principal, unresolved scope, missing capability and invalid organizational mapping fail closed. Exact referenced revisions outside the readable projection cannot be smuggled into an authoring command through the privileged internal snapshot.

## Scope and organization

Migration `011_authorization_configuration.sql` adds:

- `configuration_access_scope`: explicit mapping of `(scope_kind, scope_owner_id)` to an organization unit, individual Principal, or the registered GLOBAL root.
- `configuration_access_grant`: scoped action, principal OR unit grantee, sponsor, active state and optional expiration. This follows existing generic grant semantics; no configuration-table permission booleans or domain-specific roles are added.

Frozen Configuration supports GLOBAL, AREA, TEAM and USER. DEPARTMENT is an organization/grantee kind, **not** a new Core Configuration scope. A department may receive an explicit grant on an existing AREA/TEAM/etc. resource scope. AREA/TEAM mappings must resolve to the corresponding current organization kind. Configuration identifiers are not assumed to equal directory identifiers. USER scope is explicitly mapped to a Principal. GLOBAL is an explicit resource, never a wildcard granting mutation over other scopes.

Readable scope policy: active Principals may read registered GLOBAL references; an exact explicit configuration grant implies VIEW of its scope; mapped unit membership, current managed organization descendants, or the mapped USER may view that scope. ADMIN can view registered scopes, but receives no configuration mutation rights without explicit grants. Leaders have visibility only over the managed scope and authorized Study dependencies; leadership never creates configuration-writing grants.

The new partial `(scope_kind, scope_owner_id, action) WHERE active` grant index serves capability lookup. Existing principal/unit membership, organization-parent and package-member indexes serve joins and historical dependency selection. Scope mapping has an exact composite primary key. Pilot-scale SQL scope predicates may scan revision metadata; no speculative indexing or new query engine was introduced.

## Discovery versus historical interpretation

Discovery SQL selects readable package scopes plus exact package IDs pinned by every accessible Study setup revision and Run. It selects their exact transitive members and necessary catalog/measurement reference metadata. Scoped unassembled definitions and drafts remain discoverable only in readable scopes. Package usage counts include only accessible Runs. Reading no packages is a valid empty projection; Reference Studio renders an empty state without attempting to inspect unavailable rows.

An engineer can therefore read the definition and applicability metadata of an authorized historical Run after configuration governance grants are revoked. This dependency does not grant authoring, draft creation, activation, or broad access to other packages in the same scope. Package adoption may use a newly discoverable applicable package without requiring that it was already pinned. Study Setup still independently requires `EDIT_STUDY_SETUP` and frozen selection validation.

The authoritative internal command boundary retains its complete transaction candidate for integrity validation. This privileged snapshot is not returned to users. Public snapshots are SQL-scoped and include per-request scope permissions. Normal runtime resolution remains PostgreSQL → exact hydration → synchronous resolver. Authorization is not inserted into individual scientific definition lookups. Incomplete drafts shown in authoring discovery are not indiscriminately hydrated as runtime packages.

## Immutable artifacts, activation and readiness

Authorization permits an attempt; frozen commands and database constraints determine validity. Existing definitions, draft identities, manifests and confirmed reasoning contexts remain immutable. Changes require explicit new revisions/versions. Activating an invalid package returns a validation failure, not a permission failure. A failed command rolls back its changes and receipt.

Activation keeps one active interval per `(scopeType, scopeId, stablePackageId)`, with separate families allowed concurrently. Existing atomic supersession of a prior version is preserved. The database uniqueness constraint independently rejects a second open interval in the same lineage. Activation still does not create reasoning context.

`ACTIVE != READY`: package activation and exact Study/package reasoning confirmation remain distinct scientific concepts and distinct capabilities. Confirmation still requires an exact same-Study source proposal, explicit target bindings, confirmation and existing scientific validation. There is no automatic copying on activation, and no silent readiness inheritance.

Receipts are reauthorized before replay and namespaced by trusted Principal + operation + client command ID. A revoked author cannot retry an earlier successful receipt to bypass the current policy.

## Delegation ceiling and attribution

There is no public governance grant/delegation command. Ordinary authors, responsible users, leaders and package managers cannot delegate even their own capability through the application. The existing trusted administrator provisioning CLI is the only supported provisioning path. New configuration grants and Study reasoning grants require an explicitly named **active ADMIN sponsor**, verified by that CLI. This is the pilot's explicit Admin delegation exception: a trusted access administrator may provision governance rights they do not personally exercise. Holding ADMIN does not itself enable any science mutation. Database administrators remain privileged infrastructure operators, not untrusted application callers.

The provisioning manifest now accepts `configurationScopes` and `configurationGrants`; existing `grants` accepts `MANAGE_REASONING_CONTEXT`. Named Principal membership replacement remains explicit. Grant omission is not revocation; use `active:false` or expiration. Current mappings and memberships drive the next request's decision. Do not derive or backfill assignments from names, fixture domain labels or historical authors.

Existing configuration revision, draft, package, activation and reasoning-context schemas contain no `createdBy`, `authoredBy` or `activatedBy` field. None was invented. Schema parsing strips arbitrary client author strings; actor-scoped receipts use the trusted Principal. Existing governance grant `granted_by` is a validated provisioning sponsor, not a scientific artifact author. Historical scientific identity is not rewritten on employee transfer. Comprehensive attribution/audit is deferred.

## UI projection

Reference Studio uses server-derived scoped `canAuthorDefinition`, `canManageApplicability`, `canCreatePackageVersion` and `canActivatePackageVersion`. Unauthorized commands are disabled; scope-specific commands check the selected artifact scope. The existing definition scope selector uses authorized mapped scopes in the PostgreSQL adapter. Study readiness returns `canManageReasoningContext`, separately disabling confirmation. Read/inspection and validation remain available where their metadata is readable. There is no redesign, new login, or new management screen. The explicitly selected browser prototype adapter retains its existing local behavior.

## Evidence and validation

`tests/postgres-configuration-authorization-contract.ts` exercises the parsed HTTP Request handler, authorized application transaction and database for separate Wafer and Specimen scenarios. It proves independent author/rules/package/activation/readiness personas; responsible-user/department/leader/Admin denial; spoofed headers; exact stored target scope; cross-scope denial; zero database mutation on rejected requests; immutable revision protection and new-revision independence; invalid activation rollback; active uniqueness; ACTIVE versus READY; explicit reasoning validation; ordinary Study adoption; historical pins after revocation; receipt replay denial; unit membership transfer; unknown/mismatched scope failure; and no unauthorized private discovery.

`tests/postgres-adapter.test.tsx` also verifies server-projected disabled authoring buttons, scope-specific rights and empty discovery rendering. Native PostgreSQL runs the same governance contract after existing Core/restart proofs. Test identities and mappings are explicit fixture setup, not product branches.

Final results (2026-09-20):

- Focused governance contract, existing authorization contracts and permission-rendering tests passed before the final full regression run.
- Full `npm test` run **once**: **252 passed** (108 Domain, 127 workspace, 17 PostgreSQL/PGlite and permission tests), zero failures.
- Native PostgreSQL **18**: complete Core contracts, concurrency/restart proofs, Slice 1/2 and new Wafer/Specimen governance contract passed.
- TypeScript, changed-file lint, PostgreSQL build, browser build and `git diff --check`: passed.
- Repository-wide lint: **105 existing errors**, reported separately; unchanged-file debt was not repaired.
- Local verification database: migrations 001–010 checksums verified, migration 011 applied. Automatic approval review timed out once; its explicitly permitted retry succeeded. No governance grants were silently provisioned.
- Live loopback HTTP on port 3100: bootstrap 200 (5 accessible exact packages, 18 definition descriptors), Reference route 200, Wafer and Specimen Study/readiness reads 200. Current pilot owner receives `canManageReasoningContext:false` and no automatic governance scopes.

Persona E2E means parsed HTTP handler + database, not a full-browser multi-user login test.

## Remaining gates

Saved Analysis Slice 4 still needs authoritative owner migration/backfill, explicit audience membership/publication representation, scoped share/unshare commands, publication/delegation ceilings, revocation and concurrency semantics, and server/UI projections and attack tests. Every shared analysis must continue to intersect its audience with **all** exact scientific source access; sharing must not grant source access or duplicate raw measurements. Current trusted-owner + all-source policy stays unchanged.

Real authentication/session lifecycle, external directory/admin integration, audit/evidence retention, broader PRIVATE oversight decisions, multi-tenant deployment and enterprise-scale policy performance remain separate enterprise-readiness gates. No such feature was added here.

## Files changed in this slice

- Application: `authorization.ts`, `configuration-permissions.ts` (new), `configuration-authoring.ts`, `configuration-command-facade.ts`, `study-readiness.ts`.
- PostgreSQL: `authorization.ts`, `authorized-application.ts`, `configuration-authorization.ts` (new), `postgres-configuration-authoring.ts`, `migrations/011_authorization_configuration.sql` (new).
- Reference Studio: `permissions.ts` (new), `definitions-view.tsx`, `applicability-view.tsx`, `package-view.tsx`; Study `study-readiness-panel.tsx`.
- Scripts: `migrate-production-slice-1.mjs`, `provision-authorization-pilot.mjs`.
- Tests: `postgres-configuration-authorization-contract.ts` (new), `postgres-adapter.test.tsx`, `postgres-native.test.ts`.
- Documentation: this file (new), `dxt-enterprise-authorization-v1-design.md`.

No Core Domain file was changed by this slice. Earlier uncommitted repository work was preserved.

## Final review

1. **YES** — Configuration VIEW is distinct from mutation rights.
2. **YES** — Definition revision authoring requires an explicit scoped capability.
3. **YES** — Applicability creation is independently protected.
4. **YES** — Draft creation and package assembly are independently protected.
5. **YES** — Exact package activation/deactivation requires its own capability.
6. **YES** — Study reasoning context requires an explicit separate capability.
7. **YES** — ACTIVE and READY remain distinct concepts and distinct permissions.
8. **YES** — Responsible users consume authorized Configuration without automatic governance.
9. **YES** — Exact mapped resource scopes bound governance rights.
10. **YES** — Leaders retain authorized visibility without configuration write defaults.
11. **YES** — ADMIN alone does not author scientific configuration.
12. **NO** — Unauthorized direct production HTTP commands cannot mutate these artifacts; denial tests assert zero database changes.
13. **YES** — ALLOW still passes through immutable revision, validation and ACTIVE uniqueness rules.
14. **YES** — Authorized historical Run pins remain readable after governance revocation.
15. **YES, where applicable** — No frozen Configuration artifact currently has the named author fields. None was invented; forged author properties are discarded and trusted Principal namespaces receipts. Trusted provisioning verifies grant sponsors.
16. **YES** — Wafer and Specimen exercise the same generic policy and command path.
17. **NO** — Frozen Production Core scientific semantics were not changed.
18. **NO** — No exposed production Configuration write endpoint bypasses the authorized composition. Raw adapters/provisioning remain trusted infrastructure, not public endpoints.
19. **YES** — Slice 3 is complete within the existing trusted development-identity pilot.
20. **Remaining Slice 4 gaps:** trusted Saved Analysis ownership backfill; audience representation; share/unshare capabilities and publication ceilings; atomic commands and revocation/concurrency; source-intersection query enforcement for shared audiences; UI projections and direct API tests. Authentication, directory integration and audit are separate readiness gates, not implemented sharing prerequisites in this slice.
