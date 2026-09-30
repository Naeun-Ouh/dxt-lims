# DXT Enterprise Authorization — Slice 1: Study / Run

Status: implemented for a trusted, single-organization local pilot. Validation results below. Production Core v1 scientific semantics remain frozen. This is not an Internet-facing authentication system or complete enterprise authorization rollout.

## Identity and trust boundary

Production uses `DXT_REPOSITORY=postgres`, `DXT_AUTH_PROVIDER=server-development` and `DXT_DEV_PRINCIPAL=<persisted principal id>`. The Principal is selected exclusively by server environment, resolved against `auth_principal`, and rejected if missing, unknown or inactive. Request role/capability/principal headers are ignored. The browser cannot select a persona. All callers of one development server share that server's identity; run it on loopback with trusted operators only. To change persona, restart the server with a different configured identity.

Replace `developmentPrincipalId` with verified authentication middleware/session claims later. Keep directory/membership resolution and authorization in the database. A future authenticated provider must validate issuer/audience/session/revocation and provide stable principal ID, not accept browser role assertions. SSO/login/UI is not included.

`productionRequest` is the only production HTTP composition. `authorizedOperation` owns the policy check and the repository command transaction. Raw repository adapters remain trusted internal infrastructure (migrations, administrative provisioning and Core tests); they are not an alternate HTTP route. The only API route is `/api/repository`. Neither HTTP operation payloads nor query strings select an unrestricted composition.

## Policy model and provisional choices

Study is the policy root; Run lookup resolves its Study. No Run/Measurement ACL columns were added. Current principal membership is evaluated for every request without authorization caching.

Canonical actions: VIEW_STUDY, VIEW_RUN, EDIT_STUDY, EDIT_STUDY_SETUP, CREATE_RUN, EDIT_RUN_PLAN, MANAGE_ACCESS.

- Responsible user: Study/Run view, metadata/default authoring, Create Run and editable Plan. Not automatic access administration.
- Responsible department member: view only. CREATE_RUN or other authoring requires an explicit grant.
- Part/Team/Department manager: recursive managed organization view only. Module manager: view only through a configured Study–Module relationship.
- Admin: broad view of provisioned Studies and MANAGE_ACCESS. Scientific writing requires a separate explicit grant; no lock bypass.
- Explicit grant: Study-scoped capability for a principal or current member of an organization unit. It must be active and unexpired. An authoring grant does not imply VIEW; cross-department collaborators need an explicit VIEW grant as well. VIEW_STUDY and VIEW_RUN are equivalent visibility at this inherited root.
- PRIVATE: responsible user, explicit VIEW grantees and Admin. Leadership oversight for PRIVATE remains an unresolved PO policy; this pilot grants **no implicit leadership exception**. This is fail-closed handling, not approval of the broader proposed exception in the design.
- RESPONSIBLE_DEPARTMENT (default): responsible department plus the above relationships.
- AREA: explicit Area membership adds visibility; responsible department access remains. Null Area never grants Area visibility and never removes responsibility/department access.
- Missing principal, missing Study policy or unsupported operation: deny. Invisible/missing resource reads and writes use generic 404; visible resources lacking write capability use generic 403. No internal policy reasons are exposed over HTTP.

The SQL predicate returns internal reason metadata. `AuthorizationDecision` adds principal, action, Study ID, effect, policy version `study-run-v1`, and Study policy context version. This is readiness for future audit, not persisted audit. Context version describes Study policy only; it is not a complete directory snapshot/version. No permission cache exists. Global directory/grant epochs are deferred until needed.

## Storage and provisioning

Migration 009 adds only authorization sidecars: `auth_principal`, `auth_org_unit`, `auth_membership`, `study_access`, `study_module_access`, `study_access_grant`, and the common `dxt_study_access_reason` SQL function. Existing migrations and scientific tables are unchanged.

The pilot has one organization namespace. Units model PART/TEAM/DEPARTMENT hierarchy, AREA and MODULE. Provision explicit ownership and memberships with the trusted CLI:

```sh
DATABASE_URL=... npm run db:migrate
DATABASE_URL=... node scripts/provision-authorization-pilot.mjs /path/to/approved-pilot-manifest.json
DXT_REPOSITORY=postgres DXT_AUTH_PROVIDER=server-development DXT_DEV_PRINCIPAL=pilot-owner DATABASE_URL=... npm run dev -- --host 127.0.0.1 --port 3100
```

Manifest fields are `principals` (id/userId/role/active), `units` (id/kind/parentId), `memberships` (principalId/unitId/managed), `studies` (slug/responsiblePrincipalId/departmentId/areaId/visibility/moduleIds), and `grants` (id/studySlug/principalId/unitId/action/grantedBy/active/expiresAt). Exactly one grant target is required by the database. Named principals' memberships are replaced atomically; omitted principals are untouched. Named grants are upserted; revoke explicitly with active=false, rather than assuming omission revokes. Study ownership is never inferred from historical display names. The CLI checks Study department/Area/Module unit kinds. Database credentials and this CLI are privileged administration, not an end-user command API. MANAGE_ACCESS is evaluated/projected, but there is no access-management UI or delegated administration endpoint.

Organization transfer/revocation changes these sidecars only. Existing createdBy/authoredBy/provenance/Run snapshots are not rewritten. A future attribution slice must add trusted actor attribution to new events without migrating historical labels by guesswork.

## Query and command enforcement

Study listing, Run listing and bootstrap pin discovery use `dxt_study_access_reason` in SQL predicates, before records reach application/browser memory. Counts displayed in production Home derive only from this scoped Study list. Demo resume/calendar/count fixtures are suppressed in production rather than claiming they are live authorized activity. Home retains existing shell/table styling. Search based on returned Run lists cannot discover rows excluded by SQL. Exact Study/Run reads authorize their resolved root before loading scientific payloads. Static and dynamic Study route layouts and Study pages have server guards.

Bootstrap returns only exact configuration packages pinned by accessible Study versions/Runs and their registered measurement references. It does not expose global authoring drafts, Run-usage counts or inaccessible Study names. No implicit latest-version substitution exists.

Protected commands:

- `study.edit`: EDIT_STUDY, metadata-only display name/intent, optimistic aggregate-version check. Does not rewrite any historical Run. No new editor UI.
- `study.save`: EDIT_STUDY_SETUP, then unchanged setup revision, pin and applicability validation.
- `run.create`, `run.preview`, `run.create.preview`: CREATE_RUN on target Study. Previous/Existing source also requires VIEW_RUN; foreign-Study sources are rejected. Study Default/Previous/Existing/Blank share this path.
- `run.next`: source VIEW_RUN plus CREATE_RUN on inherited Study, then existing Decision/NextAction scientific checks.
- `run.plan.save`: EDIT_RUN_PLAN, then unchanged repository version and evidence-lock validation. Permission does not override Actual or Measurement evidence locks.

Command receipts are namespaced by principal and operation using deterministic UUIDs. Every replay is reauthorized. Study metadata editing uses optimistic concurrency rather than adding a new receipt subsystem.

Authorization and Core commands share a repeatable-read transaction. SHARE locks on authorization tables stabilize directory/root/grant policy until the command completes; revocation waits for already-authorized in-flight work. Nested repository read transactions join the existing repeatable snapshot rather than attempting to change transaction isolation after queries. Core root locks and validations remain authoritative. Under concurrency, serialization failure is fail-closed; reload/retry, never bypass checks.

This deliberately coarse pilot locking is not the enterprise scaling strategy. Indexes cover grant Study/action, membership unit/principal, Study department/Area, and organization parent. SQL evaluates the function per candidate root; large lists need measured query plans, pagination and potentially optimized joins/materialized entitlement context, still before counts/payloads. The current Run list hydrates only authorized rows; it is not a load-all-then-filter implementation. PostgreSQL RLS is not implemented: the server's database credential remains privileged infrastructure.

## UI permissions and future surfaces

Server projection contains canEditStudy, canEditStudySetup, canCreateRun, canEditPlan and canManageAccess. React does not infer organization policy from role names. Study Setup controls are disabled for viewers; New Run links are suppressed; Plan permission combines with existing scientific lock and save state. These controls are advisory; direct API calls follow the same checks.

Actual/Measurement/Evaluation/Decision reads by Run inherit root view. Their authoring commands are denied for every persona in this pilot, including Admin. Configuration mutation, Study reasoning adoption, Saved Analysis reads/writes, global Measurement queries/dataset discovery and other uncovered operations fail closed. Some deferred surfaces retain existing UI entry points but return a concise denial; this pilot intentionally cannot complete a full new scientific lifecycle through HTTP. Core lifecycle regression is tested through trusted adapters separately. No specialized capabilities or redesign were added.

## Validation evidence

`tests/postgres-authorization-contract.ts` executes the same parsed HTTP handler and production authorization composition with trusted server-injected personas, both in PGlite and native PostgreSQL 18. Forged role/principal headers cannot change identity. The test covers:

- owner, same-department viewer, unrelated department, Part leader, Module leader, Area member, explicit collaborator, Admin, inactive/unknown identity;
- scoped Study and Run lists, empty bootstrap, direct details and inherited view;
- all four creation sources, direct denied create/setup/metadata/Plan calls and unchanged persisted data;
- explicit view versus edit grants, grant revocation, missing policy context and fail-closed future writes;
- null Area, PRIVATE leadership denial, Admin/owner/private explicit access;
- unlocked Plan permission combinations and authorized owner/Admin blocked by actual evidence;
- current membership change without historical Run modification;
- identical policy/composition for Wafer and Specimen.

Full Core tests, native restart/concurrency/lifecycle contracts, TypeScript, changed-file lint, browser/PostgreSQL builds and diff hygiene are recorded in the implementation report. This document does not claim SSO, enterprise load/security certification, multi-tenant isolation or browser end-to-end coverage from repository tests alone.

## Remaining gates

Before a broader pilot: real authenticated per-request identity/session protection; finalized PRIVATE leadership oversight and stewardship transfer policies; production directory synchronization and administrative authorization; consistent trusted future actor attribution; measured revocation/concurrency/load behavior; paginated scoped dashboards/search; audit persistence in its own slice; deployment isolation, credentials and tenant boundaries.

Before Measurement/Evaluation/Configuration/SavedAnalysis: canonical specialized capabilities and source relationships; Measurement exclusion/restore/execution boundaries; independent Evaluation/Decision authoring permission with scientific validation; configuration stewardship/activation scope and immutable package rules; Saved Analysis ownership/audience plus intersection of access to every source Study and exact Dataset/result pin; Evidence/file authorization and protected delivery; configuration discovery policy for references not yet used by an accessible Study. Do not open the currently denied operations until those policies and direct attack tests exist.

## Completed verification — 2026-09-19

- `npm test`: 249 passed (108 domain, 127 workspace, 14 PostgreSQL/PGlite integration contracts).
- Native PostgreSQL 18: passed, including the authorization contract and existing restart/concurrency/full-lifecycle regression.
- TypeScript: passed. Changed-file oxlint: passed. Repository-wide oxlint: 105 existing errors outside this change; not repaired by this slice.
- PostgreSQL build: passed. Browser build: passed. `git diff --check`: passed.
- Live local HTTP with server-selected `pilot-viewer`: reads succeed; forged ADMIN/principal headers do not elevate; direct Setup/Create/Plan writes return 403; exact before/after Study Setup and Run lists remain equal.
- Browser smoke: owner Home and Wafer Setup opened. This exposed a Navigator dependency on global Dataset discovery; Navigator now reads Measurement per already-authorized Run. Full browser persona E2E is not claimed; both subject families have parsed-HTTP/native-DB contracts.
- Migration 009 applied to the existing local verification database. Explicit synthetic `pilot-owner`, `pilot-viewer`, `pilot-unrelated` principals provisioned. These are test responsibility assignments, not inferred real employee identities. Owner preview restored at port 3100; bind remains loopback.

Changed files for this slice: application authorization contract/repository error and planning projection types; PostgreSQL authorization service, authorized composition, server composition and migration 009; repository HTTP route/client; provisioning and migration scripts; Home and Study route guards; Study Setup/Create links/Run Navigator/Plan permission projection; PostgreSQL authorization test contract and both test harnesses; this document, design update and README. No domain algorithm was changed.

## Final review answers

1. YES — trusted server identity, no client role claims.
2. YES — Study list/detail server scoped.
3. YES — Run inherits Study.
4. YES — Study Setup writes server enforced.
5. YES — all four visible Run creation modes, plus Next Run, authorized.
6. YES — permission and frozen Plan lock are independently required.
7. NO — unauthorized direct Setup/Plan requests cannot mutate data.
8. YES — explicit principal/unit cross-department grants without public visibility.
9. YES — managed scope gives view, not scientific authoring.
10. YES — membership revocation changes current access without changing historical snapshots.
11. YES — granted Admin still cannot bypass evidence lock.
12. YES — SQL scope precedes payloads/counts/browser search.
13. YES — generic Wafer/Specimen policy path.
14. NO — frozen scientific semantics were not changed.
15. NO — no uncovered production Study/Run write endpoint; unsupported operations deny.
16. YES for the explicitly trusted loopback, server-identity pilot defined above. Not ready for an externally accessible, independently authenticated multi-user production deployment.
17. Remaining gaps are listed in Remaining gates: authentication/session boundary, policy approvals, directory/admin integration, specialized downstream capabilities, all-source Saved Analysis authorization, audit/evidence delivery, tenant isolation and production scale/revocation proof.
