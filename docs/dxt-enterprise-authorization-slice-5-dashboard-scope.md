# Authorization Slice 5 — Dashboard, aggregation and discovery scope

Status: **COMPLETE within the trusted server-development Principal pilot**. Date: 2026-09-20. Production Core v1 remains frozen. No authentication, audit persistence, tenant security, employee scoring, organization-management UI or scientific capability was added.

## Authoritative query boundary

`trusted Principal → current authorized Study relation → requested scope intersection → SQL projection/aggregation → UI`.

Migration 013 introduces `dxt_discoverable_studies(principal)`. It resolves the active Principal, current memberships, managed organization closure and active/unexpired explicit grants in SQL. The existing detail-policy function `dxt_study_access_reason_v1` now consumes that same relation; downstream scientific actions continue through the existing wrapper. There is no dashboard-specific policy engine. The shared effective policy constant is `organization-discovery-v5` for detail decisions and query diagnostics.

`authorizedResourceScopeSql` materializes accessible roots, intersects any requested dimension, and joins Runs by their actual Study FK. Counts, GROUP BY, sorting, pagination, literal text matching and bounded calendar/recent selection operate on that relation. Queries never retrieve inaccessible root names or global totals into Node/React. A caller-supplied department, Area, Module or Study slug only narrows scope and cannot grant access. Unknown/inaccessible dimension IDs both yield an empty projection; malformed query shape yields 400 without resource lookup.

The production facade dispatches these projections before loading scientific/configuration aggregates. One dashboard SQL statement supplies all cards and groups. The existing repeatable-read transaction and authorization-table SHARE locks retain a stable policy snapshot; membership changes affect the next request. No authorization response cache was introduced. API responses use `Cache-Control: no-store`; Home is dynamic.

## My scope

**My = currently discoverable Studies where the trusted Principal is the responsible user OR has an active/unexpired explicit Study collaboration/authoring grant**, directly or through current non-managed unit membership. Pure `MANAGE_ACCESS` administration is excluded from personal relevance. Explicit VIEW_STUDY/VIEW_RUN collaboration, delegated scientific/Setup/Plan authority and explicit Study reasoning stewardship qualify, but no write grant bypasses the independent VIEW requirement.

Creator/display-name equality is never consulted. Department/Area viewers, ordinary leaders and broad Admin VIEW alone do not qualify as personal work. A private explicitly shared Study can qualify for its actual collaborator without exposing other Studies in that department. Runs inherit the selected Study relevance; no separate Run creator ownership is invented.

Production Home uses MY for Continue Working, metrics, calendar and recent rows. Its existing Accessible Studies section uses ACCESSIBLE so readers can still navigate resources they may inspect without pretending to own the work.

## Organization, Area and Module

- **Department:** requested exact responsible-department assignment intersected with current Study VIEW. Department members gain inherited read through non-PRIVATE publication. PRIVATE is not released to peers.
- **Part/Team:** current explicitly managed unit plus descendants among organizational kinds PART/TEAM/DEPARTMENT. No copied per-Study leadership ACLs. Leadership and Admin VIEW never imply scientific authoring.
- **Area:** current explicit Study authorization Area plus Study VIEW. Area membership adds VIEW only when Study publication is AREA. An already-authorized responsible user/department/collaborator may aggregate their accessible Studies assigned to that Area without an extra Area membership requirement. Scientific Run/Operation Area labels are not security assignments.
- **Unassigned Area:** excluded from Area groups and specific Area totals, but retained under valid personal/department/accessible scope.
- **Module:** both an aggregation association and, when an explicit current managed MODULE binding exists, a non-PRIVATE leadership VIEW scope through `study_module_access`. Ordinary Module membership alone is not leadership. Part/Team management does not imply Module management. Shared names, equipment module/chamber and organizational parentage are not Module entitlements.
- **Type validation:** Module management joins actual MODULE units; Area/Department joins require their declared kinds. Organizational recursion does not traverse AREA/MODULE nodes. This closes malformed mapping interpretation without broadening the pilot policy.
- **PRIVATE:** the original design's leadership oversight proposal remains unapproved. The implemented narrow policy continues to deny automatic Part/Team/Module private oversight. Responsible users, explicit VIEW collaborators and the pre-existing mapped-root Admin VIEW exception remain unchanged. Broadening leadership PRIVATE access is blocked pending Product Owner approval.

A Study may belong to multiple Modules and to both a Part and a nested Team. Each group counts its distinct Studies/Runs; group totals are overlapping contexts and must not be summed as a global total. No zero-resource organization inventory is returned. Person-level participation/ranking is not currently surfaced and was not introduced.

## Query/API inventory

All operations enter the existing trusted `authorizedOperation` boundary through `/api/repository`:

| Operation | Scope and response |
| --- | --- |
| `study.list` | Same SQL root relation as detail; optional scope/Study/text restriction; backward-compatible authorized metadata array. |
| `run.summaries` | Scoped Study inheritance, name/number matching, bounded page and authorized total; lifecycle/subject count/delta projection without Run aggregate hydration. |
| `search.query` | STUDY / RUN / SAVED_ANALYSIS / ALL; case-insensitive literal matching, SQL pagination and authorized total. Small limits support autocomplete/quick-navigation queries. `%` is ordinary text, not a SQL wildcard. |
| `dashboard.query` | MY by default when no query supplied; explicit ACCESSIBLE or named dimension supported. One scoped SQL projection returns counts, bounded recent/calendar rows and organization groups. |
| `run.list` | Existing full-snapshot contract retained; its root ID query now uses the same discoverable relation. Never used as the new dashboard/summary implementation. |
| `run.created/get/planning`, Study detail | Existing exact-parent authorization remains before repository access. |
| `measurement.datasets/query` | Existing source-safe semantics retained; root filters now use a set-based discoverable relation. Explicit selected sources still fail as a whole when unavailable. |
| `analysis.list/load` | Existing Slice 4 audience AND strict all-source policy retained. |
| Configuration bootstrap/list | Existing Slice 3 scoped catalog/permissions and accessible historical-pin dependency path retained; package usage counts remain scoped. |

`run.summaries` and `search.query` accept 1–100 rows per page and offsets 0–100000; defaults are 25/0. Ordering has stable identity tie-breaks. Totals are evaluated before pagination but after authorization and matching, including on an empty/out-of-range page. Dashboard recent/calendar use the same bounded limit; calendar total and any “more” message count only authorized rows. No hidden/anonymous calendar blocks exist.

Existing Run navigator now sends search text to SQL-scoped summaries. Run list and navigator load additional authorized summary pages on demand. They no longer issue execution/measurement/evaluation/decision reads per Run solely to discover its stage. Browser-demo behavior is preserved. Existing Analysis in-memory presentation filters receive already-authorized sources; they are not an authorization boundary. No separate production Study/Saved Analysis autocomplete UI existed; the shared search query covers those resource kinds without adding a new screen.

## Dashboard meanings and UI limits

Dashboard fields are projections, not lifecycle states or scientific judgments:

- Studies/Runs: exact authorized selected roots and children.
- Active Runs: selected Runs without a current Decision.
- This Week: selected Runs whose latest available recorded activity is in the current UTC week, not a claim about the user's login/session activity.
- Need Review: Runs with Measurement/Evaluation evidence and no current Decision. This is a coarse existing workbench cue, not Target Achievement or a new review workflow.
- Measurements: number of authorized MeasurementDatasets, not raw observations or copied values.
- Saved Analyses: complete audience/source-authorized Views anchored in the requested root scope.
- Recent/Continue: Run creation and existing recorded Actual/Measurement/Evaluation/Decision timestamps; stage is projected from persisted evidence. There is no Plan edit timestamp in the frozen aggregate and no user visit/audit trail; none was invented.
- Calendar: authorized Run intervals from creation through latest recorded activity overlapping the current UTC month. It is not a scheduling/commitment system. UTC is explicit in the UI.

Home reuses the existing sections/classes, supplies truthful empty states, and replaces fixture counts/names/dates with scoped data. Study overview Run counts and latest recorded activity also use the projection; prototype target-achievement counters are not presented as production totals. No new organizational dashboard screen or policy selector was added. Inspector, scientific workspace and frozen lifecycle are untouched.

Saved Views do not appear as a new Home activity feed. Where counted/searched/listed, the entire exact source intersection is enforced before metadata/aggregation. A valid multi-Study View disappears as a whole if any required source loses access; shared audience membership alone cannot retain its title or count. Configuration summaries keep their own governance scope; no new Configuration dashboard was introduced.

## Organization changes, diagnostics and historical data

Department transfers, leadership gain/loss, Area/Module membership changes, grant expiry/revocation and disabled identity affect subsequent requests. No historical author, scientific payload, exact package pin or evidence reference is rewritten. Existing clients cannot erase information already downloaded; the Run navigator revalidates on focus and clears failed reads. Home re-queries on navigation/reload. Push invalidation and authentication-session revocation are not implemented.

`discoveryDiagnostics` and projection metadata carry trusted Principal ID, requested projection, effective intersection descriptor and the same effective policy version as detail authorization. There is no row logging, global hidden count, principal-blind cache or audit storage. A future audit sink can attach request correlation/version evidence at this existing facade. Current directory tables have no independently versioned external resolver; real directory/session integration must supply that contract.

## SQL strategy, plans and remaining scale risks

Existing indexes cover Principal identity, Principal/unit membership, organization parents, active Study/action grants, responsible department, nullable Area, Study–Module composite identity and Run's `(study_id,run_number)` uniqueness. Migration 013 adds **no speculative indexes** and changes no scientific table or row.

Native PostgreSQL18 and PGlite tests execute `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` over the authorized relation followed by department GROUP BY. A separate local read-only check used the current 3-Study/24-Run database:

- ACCESSIBLE: 0.420 ms execution; materialized authorized roots feed the joins before grouping.
- DEPARTMENT: 0.422 ms; existing `auth_access_department` index selected.
- Missing AREA/MODULE: empty result; corresponding exact unit checks precede output. Area plan includes `auth_access_area`; Module plan includes `study_module_access_pkey`.
- Identity/membership plans use existing principal/membership keys. Small base tables appropriately use sequential scans.

These are tiny pilot plans, **not load certification**. Remaining risks: broad Admin scopes, large membership/grant sets, deep organization graphs, scalar exact-detail/source checks over large saved contexts, complete legacy `study.list`/`analysis.list`/`run.list` contracts, OFFSET pagination, literal substring searches and full activity scans for authorized scopes. The full-snapshot legacy Run path still hydrates aggregates individually; it is not used for dashboard cards or summary navigation. Future measurements may justify reverse Module indexes, search indexes/keyset paging and optimized dependency checks. Do not weaken all-source policy for speed. Coarse policy-table locks also require equivalent revocation/concurrency proof before replacement.

Organization scoping is **not tenant isolation**. Multi-tenant security is neither implemented nor claimed.

## Verification

Focused deterministic SQL/API contract: `tests/postgres-dashboard-authorization-contract.ts`, run first in the requested sequence: policy/list parity → search/pagination → counts/groups → calendar/recent → organization/Area/Module changes → real Wafer/Specimen evidence.

Proofs include:

- 10 independent Study/Run roots, exactly 4 authorized for department viewer; exact list IDs, count 4, search total 8 (4 Studies + 4 Runs), calendar total 4 and correct subgroup totals.
- Responsible, department viewer, Part leader, Team leader, Module leader, Area member, explicit collaborator, unrelated user, delegated evaluator and Admin policies; current detail/list parity; spoofed identity headers ignored.
- Hidden Study rename and later hidden Run timestamp leave the entire visible dashboard/search response unchanged.
- PRIVATE exclusions; unassigned Area retained outside Area totals; dimension kind validation; explicit/expired/revoked grants; page totals and literal autocomplete-sized search; missing Principal fails closed.
- Department and leadership changes take effect without scientific snapshot/delta mutation; Module rebind changes exactly its mapped Study audience.
- Both existing persisted Wafer and Specimen evidence use the same query path. Saved View source revocation removes a valid multi-source View from count/search; audience revocation separately removes it. Missing exact sources also fail closed.
- Direct parsed HTTP handlers plus real SQL, not merely hidden React buttons. Empty Production Home rendering has no fixture titles/Run numbers/counts.

Final validation:

- Full regression run **once**: **256 passed** — 108 Domain, 127 Workspace, 21 PostgreSQL/PGlite and rendering tests, zero failures.
- Native PostgreSQL **18 passed**, including Core concurrency/restart plus authorization Slices 1–5.
- TypeScript and changed-file lint: passed.
- PostgreSQL build and browser build: **passed**. Existing vinext route-classification advisory remains.
- Changed-file lint: **passed**. Repository-wide lint: **105 pre-existing errors**, unchanged-source debt reported separately. `git diff --check`: **passed**.
- Migration 013 applied to the existing local verification DB after checksums 001–012 passed; no grants or ownership/scientific backfill was performed.
- Live HTTP dashboard/search/run summaries returned 200 and policy `organization-discovery-v5`; native browser Home displayed 3 accessible Studies/24 Runs from the current pilot scope. Multi-persona verification is API/SQL, not a real-login browser test.

## Files changed

- Application: `src/application/authorization.ts`, new `src/application/discovery.ts`.
- PostgreSQL: new `scoped-discovery.ts`, new `migrations/013_authorization_discovery.sql`; `authorization.ts`, `authorized-application.ts`, `postgres-measurement-repository.ts`.
- API/HTTP: `app/api/repository/route.ts`, `src/infrastructure/http/http-repositories.ts`.
- Home: `app/page.tsx`, new `src/features/experiment-home/production-home.tsx`.
- Existing Study pages: `app/series/{dts-improvement,cmp-stability,adhesion-material-optimization}/page.tsx`; `productized-series.tsx`, `repository-series-runs.tsx`, `series-explorer.tsx`, `use-repository-series-runs.ts`.
- Migration runner: `scripts/migrate-production-slice-1.mjs`.
- Tests: new `postgres-dashboard-authorization-contract.ts`; `postgres-adapter.test.tsx`, `postgres-native.test.ts`.
- Documentation: this report and `dxt-enterprise-authorization-v1-design.md`.

No `src/domain` changes in this slice. Pre-existing uncommitted work was preserved.

## Final review

1. **YES** — dashboard/list/search are server-scoped before delivery.
2. **YES** — counts use authorized resources only.
3. **NO** — hidden Study contributions are excluded from logical response totals.
4. **YES** — Run discovery/count inherits Study VIEW.
5. **YES** — My is explicit responsibility/collaboration, not creator equality.
6. **YES** — Department scope is generic and PRIVATE-aware.
7. **YES** — current Part/Team managed closure grants only VIEW.
8. **YES** — Area totals require Study assignment AND authorized discovery; Area publication applies the existing membership policy.
9. **YES** — unassigned Area excluded from Area totals, retained in other permitted scopes.
10. **YES** — Module mapping/leadership is independent of organizational hierarchy.
11. **YES** — search/autocomplete query results and totals exclude inaccessible resources.
12. **YES** — calendar/recent rows, timestamps and badges have no hidden contributions.
13. **YES** — Saved View count/search/list require audience AND all exact sources.
14. **YES** — organization/leadership changes affect current scope without historical rewrite.
15. **YES** — authorization and aggregation run in PostgreSQL; React has no policy copy.
16. **YES** — Wafer and Specimen use identical generic scope.
17. **NO** — frozen Core semantics were not changed.
18. **NO** — no uncovered production dashboard/list/search endpoint identified in the inspected route inventory. Privileged raw repositories and explicit browser fixtures are not public production authorization paths.
19. **YES** — Slice 5 is complete for the trusted-Principal pilot.
20. **YES, to begin integration** — the implemented authorization surface is ready to receive a real trusted identity/session/directory adapter. This is not approval for external rollout or multi-tenant deployment.
21. **Unresolved rollout policy decisions:**
   - Whether PRIVATE leadership oversight should ever be enabled, and confirmation of the current broad mapped-root Admin VIEW exception; current behavior remains narrow for leaders.
   - Which authoritative real Part/Team hierarchy, BLC/MLM Module leadership bindings, overlapping management relationships and mapping/backfill sponsor are approved.
   - Whether the pilot responsible-user scientific bundle and delegated exclude/restore separation are the final enterprise default.
   - Who may delegate/cross-publish/transfer ownership in a future self-service UI, and grant expiry/review rules; current bounded sharing and trusted administrative provisioning remain.
   - Responsibility/grant survival on transfer, departed-owner recovery, retired/split departments and whether department-less Studies may ever be supported; no automatic public release.
   - Trusted IdP/directory, immutable subject namespace, account/session revocation latency and stale-directory fail-closed rules, session/CSRF/logout behavior, and authority for legacy identity mappings.
   - Saved Analysis administrative private metadata inspection, ownership transfer and retention/archive/delete policy; current no-delete and audience/source intersection remain.

Authentication, secure sessions, directory synchronization, audit storage/retention and tenant isolation remain separate implementation gates. Existing server-development identity selection must not be exposed as production authentication.
