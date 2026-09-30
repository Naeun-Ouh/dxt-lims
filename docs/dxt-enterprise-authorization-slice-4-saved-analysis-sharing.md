# Authorization Slice 4 — Saved Analysis ownership, sharing and source intersection

Status: COMPLETE within the existing trusted server-development Principal pilot. Production Core and Analysis v1 remain frozen. No real authentication, organization dashboard, audit storage, scientific copying or new Analysis engine was introduced.

## Trusted ownership and legacy migration

New production `analysis.save` creates the Saved Analysis configuration, exact source rows, trusted ownership mapping and receipt in one transaction. `owner_principal_id` and `created_by_principal_id` come exclusively from the resolved server Principal. The existing display `owner` on a new View uses its trusted user ID. Browser owner strings, headers, role claims and sharing labels cannot select ownership or create audience authority. Creation provenance is immutable; content updates do not change the owner mapping or historical display owner.

Migration 012 extends existing `saved_analysis_access` with PRIVATE/STUDY/DEPARTMENT/AREA audience context and nullable trusted creation provenance. Existing mapped records become PRIVATE, with unknown historical creator left NULL. Unmapped legacy Views remain inaccessible, including to an Admin through scientific read endpoints. Legacy SHARED is never treated as a grant. The trusted provisioning CLI retains explicit `analysisOwners` mappings; it does not infer them from display names or backfill historical creators. Administrative corrections increment the aggregate version and leave creation provenance unchanged.

## Actions and current owner behavior

The action vocabulary is `VIEW_SAVED_ANALYSIS`, `EDIT_SAVED_ANALYSIS`, `SHARE_SAVED_ANALYSIS`, `DELETE_SAVED_ANALYSIS`, and `MANAGE_SAVED_ANALYSIS_ACCESS`.

An owner has VIEW/EDIT and eligibility to SHARE, subject to all-source access and the independent publication ceiling. Shared viewers receive VIEW only. Explicit trusted principal/unit grants may confer EDIT, SHARE or access-management authority separately; a write grant alone is not a substitute for the View audience or scientific source access. Public sharing commands manage VIEW recipients only; they cannot manufacture editors or access managers.

DELETE remains **denied for every Principal**, with `canDeleteSavedAnalysis:false`. Frozen Analysis has no deletion/archive command; design §23.7 explicitly proposed no new deletion operation. This slice does not invent retention/deletion semantics. Public ownership transfer and generic access delegation are also denied. Ownership correction and capability provisioning remain explicit trusted administrative operations; no self-service transfer UI was introduced. These are documented boundaries, not an authorization bypass.

## Audience model

- PRIVATE: owner and explicit grants only.
- STUDY: current `VIEW_STUDY` audience of an exact selected source Study. Membership is resolved dynamically; no copied list of Study users.
- DEPARTMENT: current non-managed membership of an exact Department.
- AREA: current non-managed membership of an exact Area.
- Explicit recipients: a trusted Principal, Department or Area. These are additional readers; PRIVATE with explicit recipients is supported.

There is no ORGANIZATION publication. Unit kinds and targets are resolved server-side. The new `saved_analysis_access_grant` reuses existing grant structure (principal XOR unit, action, trusted sponsor, active/expiry), with a Saved Analysis FK because the existing Study and Configuration grants have incompatible resource FKs. No permissions are copied onto individual scientific source-reference rows.

An independently shared viewer never gains EDIT, SHARE, DELETE or access-management rights. Publication and explicit recipients are managed through one replacement command; removing a recipient or setting PRIVATE with no recipients revokes its audience path. Another independently valid audience may still permit that user, so complete revocation removes all applicable audience paths.

## Sharing ceiling

Saved Analysis ownership and scientific VIEW are insufficient to publish. The caller needs SHARE on the View **and `MANAGE_ACCESS` on every contributing source Study**, including the root Study and underlying derived/representative-result lineage. Slice 1 already requires an explicit MANAGE_ACCESS grant for ordinary users; responsible Study ownership and department/leadership VIEW do not supply it. Existing Admin MANAGE_ACCESS policy is an explicit trusted operational exception, not a new science grant.

Allowed targets are bounded further:

- STUDY must be one of the contributing source Studies.
- DEPARTMENT must match every source's responsible Department and each source must have non-PRIVATE publication.
- AREA requires every source to be published to that same explicit Area.
- Direct Principal sharing requires an active registered Principal and MANAGE_ACCESS on every source. It is a bounded explicit collaboration exception; the collaborator still receives no source permissions.
- Explicit Department/Area recipients obey the same publication bounds as visibility.

Thus a Study viewer cannot publish its data to an Area merely by creating a Saved Analysis. A configuration governance role does not imply sharing authority. Public commands never insert or update Study, Run or Measurement access grants.

An editor may rename or change visualization/configuration without gaining SHARE. Every edit revalidates all resulting sources. Expanding a shared View to another source Study additionally rechecks the publication ceiling for the final View; same-Study scientific edits remain EDIT operations.

## Strict all-source intersection

`CanOpen = SavedAnalysisAudienceAllows AND AllScientificSourcesAccessible`.

The SQL predicate used for list/detail and replacement saves checks:

- root Study visibility and every declared Run and Dataset;
- Dataset → Run → Study identity, declared Subjects and exact Parameter metadata;
- every saved source reference's actual Dataset, execution, Subject and Parameter observation;
- exact representative-result Dataset/Subject/Parameter identity;
- recursive Measurement value lineage and representative source values.

Missing identity or access denies the entire View. There is no partial result, fallback Dataset, latest-summary substitution or raw-value copying. A missing source still remains in the stored immutable scientific reference; authorization does not repair or reinterpret it.

List SQL filters audience and the complete intersection before returning IDs, titles or counts. Detail performs the same predicate before loading configuration. A metadata Admin grant adds no scientific bypass. Existing Study policy separately gives ADMIN explicit Study VIEW; that policy remains unchanged, but Admin alone does not create a Saved Analysis audience.

## Transactions, concurrency and revocation

Content, exact references, new trusted ownership and command receipt commit atomically. Audience policy, recipient grants, aggregate version and sharing receipt also commit atomically. Content saves do not accept audience changes through legacy `visibility`; publication is a separate authorized command. Both use the existing `saved_analysis.version`, so stale sharing and content changes conflict rather than overwrite each other. No combined partially committed save/share endpoint exists.

Commands lock the Saved Analysis row and operate inside the authorized repeatable-read transaction. The existing shared policy locks hold current Study/organization rights stable during the request. Sharing metadata uses the resource row lock instead of a global shared ACL-table lock, avoiding lock-upgrade deadlocks between writers. Trusted grant/mapping provisioning also locks that row and increments the same version. Serialization/deadlock failures return CONFLICT for reload/retry.

Receipts are namespaced by trusted Principal, operation and command identity. Authorization is re-evaluated before receipt replay. Concurrent creation with the same public ID cannot steal an existing View's ownership. Audience replacement uses deterministic grant identities, so retries cannot create duplicate recipients.

Share revocation, source revocation and organization transfer take effect on the next request. Owner identity survives source loss but no longer opens the scientific View. Scientific result requests from an open Saved Analysis carry its ID, allowing audience plus all-source authorization in the **same server transaction** as Measurement retrieval. The UI clears result/inspector state on failure and revalidates on window focus. No promise is made to erase already downloaded information or push revocation into a disconnected client; no realtime subsystem was added.

## UI and repository boundary

Existing repository ports gained optional production access-read/share commands; browser prototype behavior stays local and unchanged. Production `analysis.load` includes server-derived edit/share/delete permissions, and `analysis.access` exposes the scoped sharing options and current version. The existing Workspace adds only a compact sharing control, explicit recipient removal/revoke-all, and an enabled/disabled Update Saved View command. New Views start private. Sharing does not expose an unfiltered enterprise directory selector.

Core SavedAnalysisView still contains references, selection/configuration and visualization settings. It has no Measurement values. Public PRIVATE/SHARED display labels are projected from authoritative audience policy; legacy display labels are not policy. Runtime ownership, audience and scientific access are checked at the application boundary, not inside each chart or scientific calculation.

## Attribution and audit readiness

New owner/creator IDs and grant `granted_by` use trusted server identity. Organization changes never rewrite them. Successful share commands expose actor, Saved Analysis ID, action, audience, result, reason and resulting version. Failed commands expose equivalent trusted context through `SavedAnalysisCommandFailure.commandContext` for a future server audit sink; HTTP denial messages remain generic. No audit database, approval process or scientific value logging was introduced.

The trusted CLI accepts `savedAnalysisGrants` with an active ADMIN sponsor, preserving the earlier administrative delegation exception. It cannot infer legacy ownership. Ordinary share commands can publish readers only and cannot delegate scientific or Saved Analysis editing powers.

## Query/index review

Existing exact Dataset/Run/Subject identities, package Parameter references and Measurement value/lineage/summary keys serve source joins. The existing Saved Analysis owner index and new partial `(saved_analysis_id, action) WHERE active` grant index serve audience checks. Strict list intersection is performed in SQL, without browser filtering or hidden-title counts. This is a correctness-first pilot strategy; pagination and enterprise-volume query tuning remain future evidence-driven work, not a weakened subset policy.

## Tests and final validation

Focused contract: `tests/postgres-saved-analysis-authorization-contract.ts`. It exercises parsed HTTP requests and database persistence for Wafer and Specimen through identical policy paths: trusted creation, spoofed owners/headers, private visibility, independent Edit/Share rights, publication ceiling, direct collaborators with no source rights, dynamic Study/Department/Area audiences, explicit group grants, organization transfer, multi-source failure, missing/mismatched exact identities, share/source/owner revocation, SQL list leakage, immutable ownership provenance, idempotency, optimistic conflicts, concurrent creation, injected sharing rollback and denied update/share/revoke/delete/transfer requests with zero saved-state mutation. Raw scientific grants are compared before/after sharing to prove no propagation.

UI tests verify permission-derived sharing controls and the source-access explanation. Existing scientific authorization regressions remain covered. Persona E2E refers to parsed HTTP handler + database contracts, not a multi-user browser login test.

Final validation (2026-09-20):

- Focused Saved Analysis sharing/source-intersection contracts, scientific authorization regression and permission-rendering tests passed first.
- Full `npm test` executed **once**: **254 passed** — 108 Domain, 127 Workspace, 19 PostgreSQL/PGlite and permission tests; zero failures.
- Native PostgreSQL **18**: passed the Core lifecycle/concurrency/restart contracts plus authorization Slices 1–4, including Wafer and Specimen sharing and content/share races.
- TypeScript, changed-file lint, PostgreSQL build, browser build, and `git diff --check`: passed.
- Repository-wide lint: **105 existing errors**, unchanged-file debt reported separately.
- Existing local verification DB: prior migration checksums verified; migration **012** applied. No implicit ownership backfill or new sharing grants were provisioned.
- Live loopback HTTP on port 3100: Analysis route **200**, authorized list **200** with zero mapped Views for the current pilot user, unavailable/unmapped View **404**. No scientific or ownership records were created through these read-only smoke checks.

## Deferred work

Slice 5: apply the same authorized-root predicates to organization dashboards, aggregates, counts, recent activity, calendar and cross-scope search; prove no hidden-title/count leakage and correct source intersection under current organization changes. Add bounded-query/scale evidence before broader rollout.

Real authentication: trusted IdP/session verification, stable subject-to-Principal mapping, session/logout/revocation, CSRF protection for cookie-authenticated writes, account lifecycle and directory synchronization, verified deployment isolation and removal of development identity selection. Comprehensive audit, tenant rollout, organization/access-management UI and self-service ownership transfer/deletion policies remain separate gates.

## Files changed in this slice

- Application: `saved-analysis-access.ts` (new), `repository-ports.ts`, `dxt-application.ts`.
- PostgreSQL: `saved-analysis-sharing.ts` (new), `saved-analysis-authorization.ts`, `authorized-application.ts`, `migrations/012_authorization_saved_analysis.sql` (new).
- API/HTTP: `app/api/repository/route.ts`, `src/infrastructure/http/http-repositories.ts`.
- UI: `src/features/analysis/workspace.tsx`, `sharing-control.tsx` (new), compact-control styles in `app/globals.css`.
- Scripts: `migrate-production-slice-1.mjs`, `provision-authorization-pilot.mjs`.
- Tests: `postgres-saved-analysis-authorization-contract.ts` (new), `postgres-adapter.test.tsx`, `postgres-native.test.ts`.
- Documentation: this report (new), `dxt-enterprise-authorization-v1-design.md`.

No `src/domain` file was changed in this slice. Existing uncommitted work was preserved.

## Final review

1. **YES** — new production ownership is bound to the trusted server Principal.
2. **YES** — legacy free-text owner/SHARED values grant no access; unmapped Views fail closed.
3. **YES** — audience policy is independent from scientific source permissions.
4. **YES** — open/list/detail and Saved Analysis result requests require audience AND complete exact-source access.
5. **NO** — sharing never grants Run/Measurement access.
6. **YES** — one unauthorized required source denies the entire multi-source View.
7. **YES** — source revocation denies the next server request, including pinned result queries.
8. **YES** — VIEW, EDIT and SHARE are distinct. DELETE is separately and universally denied under frozen no-deletion semantics; no deletion feature is claimed.
9. **YES** — source MANAGE_ACCESS and bounded Study publication targets constrain sharing.
10. **NO** — unauthorized direct sharing/update/revoke/delete/transfer requests cannot mutate saved state.
11. **YES** — lists and details apply the audience/source predicate server-side before returning metadata.
12. **YES** — current membership changes access without rewriting trusted owner/creator provenance.
13. **YES** — metadata management does not bypass audience or source checks. Existing separately defined Study ADMIN VIEW remains unchanged.
14. **YES** — Wafer and Specimen share the same generic model and tests.
15. **NO** — frozen Core/Analysis semantics were not changed; authorization metadata and boundary checks were added.
16. **NO** — no exposed sharing/write endpoint bypasses the authorized production composition.
17. **YES** — Slice 4 is complete within the existing trusted development-identity pilot, with deletion and public transfer explicitly deferred by frozen policy.
18. **Gaps:** organization-dashboard predicates and aggregate/count leakage tests; enterprise-volume query evidence; real IdP/session and directory integration; trusted identity lifecycle/revocation and deployment isolation; future audit storage. See Deferred work for precise boundaries.
