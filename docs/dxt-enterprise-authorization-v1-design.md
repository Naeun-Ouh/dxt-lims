# DXT Enterprise Authorization v1 — Policy Design

Status: **PROPOSED POLICY — NOT ENFORCED**. Date: 2026-09-19 KST.

DXT Production Core v1 remains FROZEN. This document designs an application/security boundary around the existing scientific lifecycle. It adds no authentication, middleware, migrations, approval workflow, organization-management UI or scientific concepts. Proposed defaults below require Product Owner confirmation where explicitly identified in §23. Current PostgreSQL persistence is not an authorization implementation.

## 1. Objectives and recommendation

Answer: **May Principal U perform Action A on Resource R within the resolved organizational/ownership context?** Preserve separate identity, organization, ownership, scope, capability and resource dimensions. Do not encode them in a single role column.

Recommend a **policy-based hybrid: capability bindings + resource relationships + current organization scopes + exceptional explicit grants**. Use a versioned, finite policy registry and typed predicates, not an arbitrary policy scripting language.

| Option | Fit and limitation | Decision |
| --- | --- | --- |
| Pure RBAC | Simple roles cannot express responsible Study, department, unassigned Area or cross-department collaboration without role explosion. | Reject as sole model. |
| RBAC + scope | Good foundation for configuration managers and department leadership; insufficient for Saved Analysis source intersection and per-Study exceptions alone. | Use as a component. |
| Unrestricted ABAC | Can express relationships but unconstrained attributes/rules are hard to test, explain and translate into queries. | Use only named, typed attributes/predicates. |
| Policy hybrid | Small capability vocabulary, explicit roots and reusable organizational resolution cover both Wafer and Specimen. | Recommended. |

Post-freeze classification: application policy/context resolution and access-controlled query projections. No Core Domain semantic change is required.

## 2. Identity versus authorization

Authentication establishes a trusted immutable principal ID and its issuer/organization namespace. Authorization resolves what that identity may do now. Display name, email, browser-selected role, `recordedBy`, `evaluator`, Saved Analysis `owner`, request headers supplied by the client and fixture actor strings are **not trusted identity**.

Conceptual Principal: `{ principalId, organizationId, status, membershipVersion, entitlementVersion }`. Roles and capabilities come from a server-owned resolver; never from command JSON. Disabled, departed or unresolved principals cannot act. A future service principal must have explicit narrowly scoped bindings, not impersonate a human by setting an author field.

Phase A may inject a server-side test principal in an isolated development/test composition. Missing trusted identity defaults to deny; no anonymous production ADMIN or browser-selectable impersonation. OIDC/SSO/login and external directory implementation remain deferred. An externally exposed authorized product cannot be enabled until trusted authentication is connected.

## 3. Resource model and policy roots

Resource references identify type + exact ID; a server resolver derives the parent/root. Never trust a submitted `studyId`, department or Area to determine access to a child ID.

| Resource | Policy root / relationship | Rules |
| --- | --- | --- |
| Configuration definition, applicability, package, activation | Configuration security scope | Scoped read, configure and activation bindings; scientific applicability is separate from security scope. |
| Study metadata and Study Setup | Study | Persist current access stewardship at this root. Setup versions inherit it. |
| Run and Run Plan | Run → Study | Normally no copied owner/department/Area/visibility columns. Creator is provenance, not blanket access. |
| Actual / Measurement / raw observations / validity decisions | Exact Run → Study | Use separate execution/measurement capabilities; no parameter-level confidentiality in v1. |
| Evaluation / Decision / NextAction | Run → Study; NextAction through Decision | Separate authoring actions; immutable evidence remains immutable. |
| Reasoning context / Target bindings | Study plus referenced Configuration scope | Read with Study; configure with scoped Study reasoning authority and ability to use the exact referenced definitions. |
| Transient Analysis | All selected source Runs/Studies | No independent authority over scientific values. Every source must be authorized. |
| Saved Analysis | Saved Analysis plus ALL source roots | Own metadata stewardship; viewing/sharing cannot bypass underlying evidence access. |
| Evidence/file metadata (future) | Attached Run/Measurement parent | Inherited access; no separate ACL or standalone sharing in v1. |
| Organization dashboard | Requested organizational scope intersect accessible Studies | Permission to use dashboard is not permission to see all rows/counts in its scope. |

Read historical exact package references through an authorized Run's dependency projection even if the package is now inactive. This does not grant browsing other packages or editing Configuration. Historic activity status and current access permission are distinct.

## 4. Compact action taxonomy and operation mapping

Capabilities are **resource-type + action** pairs, optionally scope-bound. The finite verbs are `VIEW`, `CREATE`, `EDIT`, `EXECUTE`, `MEASURE`, `EVALUATE`, `DECIDE`, `CONFIGURE`, `ACTIVATE`, `SHARE`, `MANAGE_ACCESS`, `DELETE`. Avoid a second synonymous AUTHOR verb: AUTHOR in the persona matrix means the relevant write verb(s).

- VIEW: metadata, contents, source evidence and authorized projections. Read permission never implies write permission.
- CREATE: create Study where supported, Run under Study, or Saved Analysis. Creating a Run from another Run requires VIEW of source and CREATE in destination; current product cloning remains same-Study.
- EDIT: mutable Study metadata/Setup, unlocked Run Plan and Saved Analysis configuration. No generic update to scientific evidence tables.
- EXECUTE: record Actual through existing command semantics.
- MEASURE: record Measurement and its supported exclude/restore validity commands. v1 proposes the same scoped capability for both; distinct steward delegation is a PO decision (§23), not a new action per button.
- EVALUATE: author a new/revised Engineer Evaluation through existing evidence semantics.
- DECIDE: author Decision and its NextAction atomically; no standalone NextAction permission that bypasses Decision checks.
- CONFIGURE: author definition revisions, applicability versions, assemble/validate packages; separately bind this action on Study reasoning context. An engineer's Study responsibility is not automatic configuration activation authority.
- ACTIVATE: activate or deactivate package version in the exact authorized Configuration scope. Does not mean approve a scientific result.
- SHARE: change read publication audience. Does not delegate write capabilities.
- MANAGE_ACCESS: assign collaboration capabilities, reassign current responsibility and manage scoped access. Separate from scientific content authoring.
- DELETE: unsupported for immutable Runs, evidence, reasoning, revisions/packages. Deny unless an explicit mutable-resource operation exists. Saved Analysis removal/archive is a future metadata operation; no delete endpoint is introduced here and no source data is deleted.

Exact API mapping: `study.load`, `run.get/created/planning/list` → VIEW; `study.save` → StudySetup.EDIT; `run.preview/create/create.preview` → Study.CREATE(Run), plus VIEW source; `run.plan.save` → RunPlan.EDIT; `execution.save` → Actual.EXECUTE; `measurement.save` → Measurement.MEASURE; `evaluation.save` → Evaluation.EVALUATE; `decision.save` → Decision.DECIDE; `run.next` → VIEW exact source/Decision + CREATE destination Run; `study.reasoning.confirm` → ReasoningContext.CONFIGURE; `configuration.execute` dispatches CONFIGURE or ACTIVATE by concrete command; `analysis.save` → SavedAnalysis.CREATE/EDIT and source VIEW, with SHARE also required if audience changes. Do not authorize the entire configuration command union with one broad EDIT check.

## 5. Ownership and access stewardship

Propose a one-to-one **StudyAccessContext** keyed by existing Study ID: immutable creator principal reference, current owner principal, optional current responsible principal, durable responsible department ID, nullable authorization Area ID, current visibility grants and access version. Module links are a separate many-to-many association. This security sidecar avoids changing frozen scientific snapshots.

- Owner: current stewardship, normally can manage metadata/Setup and share/delegate within their ceiling.
- Responsible user: scientific authority for Setup, Run creation, Plan and scientific authoring according to scoped bindings; not automatically allowed to reassign owner or grant administration.
- Responsible department: durable access responsibility when people move/leave. Same-department membership ordinarily grants scoped read, not write.
- Creator/operator/author: preserved provenance. Creator alone acquires no permanent entitlement after responsibility transfer unless an explicit surviving grant is retained.
- Saved Analysis has its own current owner and audience sidecar; historical `owner` text remains untouched.
- Children inherit access via Study. Do not copy six authorization columns to every Measurement, Evaluation, Decision or file row.

Every shared Study should have a verified durable responsible department before general access rollout. Existing records without verified stewardship are quarantined for authorized administrative assignment, not inferred from labels or made public. Personal Study without a department is an optional business policy, not silently assumed (§23).

## 6. Organization, Area, Module and publication scopes

Organizational units use stable IDs, configurable unit kinds, membership relationships and effective-dated management relationships. Part/Team are labels and policy relations, not a universal fixed-depth tree. Resolve managed descendants through a configured acyclic hierarchy; do not duplicate every employee into resource ACLs. Area memberships and Module management are separate associations, not organizational parenthood.

Area is a nullable **authorization/aggregation association** on current Study access context. The Run's process `area` and Operation applicability do not confer security permissions. Multi-Area operations do not automatically share a Study with every Area. Unassigned Area Studies remain available to owner/responsible user and authorized department; exclude them from Area aggregation. Assignment to an Area does not itself publish the Study to that Area. Broadening audience requires SHARE.

Module is a configured management/aggregation scope and optionally a read-authorization scope. A Module Leader sees a Study only through an explicit scoped leadership VIEW binding and Study–Module association; a title alone is insufficient. Part/Team leaders receive scoped VIEW over responsible departments within their managed units, with no inferred authoring. Aggregation still intersects per-Study access. Proposed leader oversight applies to Study PRIVATE as a disclosed administrative/oversight exception; confirm this sensitive default (§23).

Publication is authenticated audience membership, never anonymous Internet “public.” Generic scope types avoid PHOTO_PUBLIC/MATERIAL_PUBLIC.

| Publication mode | Audience added, subject to VIEW entitlement and active identity | What it does NOT grant |
| --- | --- | --- |
| PRIVATE | Current owner; Study responsible user plus explicitly configured leadership/admin oversight | Peer department read, Area read, writes. Saved Analysis PRIVATE is owner/admin only by default. |
| RESPONSIBLE | Study owner/responsible user and current responsible-department members | Other departments or default editing. Proposed default for shared Studies. |
| DEPARTMENT(id) | Members of explicit target department; managed leaders per policy | Other departments, leadership authoring. Supports material department publication generically. |
| AREA(id) | Explicit current members of target Area | Anyone whose Run merely contains a process in that Area. Null Area never means all Areas. |
| STUDY(id), Saved Analysis only | Principals who may view that Study, intersect every saved source | New access to the source Study or other Studies. |
| ORGANIZATION | Deferred until a real requirement is confirmed | No automatic whole-company publication. |

Existing Saved Analysis `PRIVATE/SHARED` is not redefined to include new enum values in the scientific model. Proposed visibility sidecar stores exact typed audience targets; PRIVATE stays owner-only, SHARED requires explicit approved targets. Legacy SHARED with unknown audience gets no broad entitlement until stewardship migration assigns it.

SHARE is permitted for current owner or explicit share manager within authorized audience scopes. Cross-department publication requires a permitted target scope, not arbitrary client-supplied department IDs. SHARE does not move ownership, rewrite author fields or grant MANAGE_ACCESS.

## 7. Roles and scoped capability bindings

Keep LIMS roles GENERAL_USER and ADMIN as understandable bundles. A binding is `{principal/group, capabilitySet, scope, validity, version}`; scope may be organization, managed department/Area/Module or explicit Study. Leadership comes from organization relationships plus policy bindings, not extra universal roles.

GENERAL_USER supplies eligibility for normal operations; resource relations constrain actual rights. Recommended owner/responsible bundle permits Study/Setup/Plan editing, Run creation, execution, measurement, evaluation and decision within that Study. Department peers and leadership receive VIEW only until delegated a narrow authoring bundle. PO may require specialist evaluator/decision-maker assignment; see §23.

Designated Configuration Manager is a capability set, not a hardcoded identity. CONFIGURE and ACTIVATE are independently assignable to the same or different principals; separation does not introduce an approval workflow. Study reasoning CONFIGURE is separately assigned to a designated scientific steward (may be the responsible user after explicit assignment), not inherited from package ACTIVE.

ADMIN receives organization-scoped VIEW, Configuration management and access/reassignment powers. It does **not** automatically record scientific Actual, Measurement, Evaluation or Decision in another engineer's name. Grant the relevant scientific capability separately if needed. No administrator bypasses locks, immutability, evidence validity, concurrency or exact-pin validation.

## 8. Policy algorithm and business validation

Conceptual interface, not implemented code:

`authorize({principal, action, resourceRef, trustedContext}) -> {effect, reasonCode, policyVersion, principalId, resourceRef, resolvedRoot, matchedBindingIds, accessVersion, membershipVersion, decisionId}`.

Evaluation order:

1. Validate trusted active identity, configured organization namespace and supported resource/action pair. Unknown or incomplete essential context → DENY.
2. Resolve the exact root and current stewardship/membership/bindings server-side. Distinguish deliberately null Area from failed context resolution. Use no browser ownership claims.
3. Apply hard security boundaries: disabled principal, revoked/expired binding, organization boundary, unresolved parent → DENY; these override grants and ADMIN. No custom negative ACL language in v1.
4. Require a matching scoped capability AND an eligible relationship/audience. A scoped explicit grant is an allow binding, limited by grantor's delegable ceiling. VIEW is required before write/source use but never sufficient for write.
5. For composite resources/commands, require every protected dependency and destination permission. Saved Analysis sources use intersection, not union. An authorized Run permits only its exact historical Configuration dependency projection.
6. Return ALLOW or DENY with stable internal reason(s): RESPONSIBLE_USER, OWNER_SCOPE, DEPARTMENT_SCOPE, LEADERSHIP_SCOPE, EXPLICIT_GRANT, ADMIN_SCOPE; NOT_IN_SCOPE, MISSING_CAPABILITY, CONTEXT_UNAVAILABLE, INACTIVE_PRINCIPAL, SOURCE_ACCESS_DENIED, UNSUPPORTED_ACTION.
7. **Separately** run existing scientific/business validation and transaction/concurrency checks. Final execution = authorization ALLOW AND business valid AND expected version valid.

Example: RunPlan.EDIT ALLOW / business `LOCKED_AFTER_EVIDENCE` → command rejected as locked, not “permission denied.” Admin receives the same result. Re-evaluate authority inside the write transaction against a stable access version/lock; concurrent transfer/revocation and writes must have a defined serial order. Membership/binding resolution must carry a version/expiry; stale or unavailable resolver state cannot authorize protected writes.

Idempotency does not bypass security. Check current read/write permission before returning a stored receipt. Bind future receipt identity to trusted actor + action + resource + request; a different principal must not obtain another actor's result by guessing `commandId`. Existing immutable receipts stay historical and do not get retroactively invented actors.

## 9. Study and Run policies

VIEW Study grants inherited VIEW of its Runs, Plan, Actual, Measurement and reasoning records; explicit dependency handling still applies. Creator identity alone does not decide access. Owner/responsible users retain access before Area assignment; responsible department persists through personal departures.

Study metadata/Setup changes require scoped EDIT, with authorization-sensitive fields handled by MANAGE_ACCESS/SHARE, not ordinary scientific Setup editing. CREATE Run requires destination Study scope, VIEW chosen exact package/dependencies and existing readiness validation. Previous/Existing sources require their own VIEW; a template cannot launder inaccessible evidence or references.

Run normally inherits Study access. Run creator/operator identity is retained for provenance but does not imply unrestricted Plan/Evaluation editing. Exceptional collaborator bindings may target a specific Run for execution/measurement, resolved under its Study; no arbitrary child ACL tree. Changing Study responsibility changes current inherited access, not old scientific payloads.

## 10. Measurement policy

Measurement VIEW, raw/source rows and provenance normally inherit Run visibility. MEASURE allows recording and currently supported validity exclusion/restoration; validity is a scientific operation with reason/traceability, never physical deletion. VIEW-only users cannot exclude or restore. No parameter-level confidentiality is introduced.

Measurement dataset list/query must filter by authorized Run IDs in SQL, including when callers supply dataset/subject IDs directly. Validate every explicit source before calculating summaries. Do not return excluded observations, filenames, counts or derived-result lineage from inaccessible parents through side channels. Evidence download later reauthorizes its parent, not merely an old URL possession.

## 11. Evaluation, Decision and NextAction policy

VIEW inherits Run. EVALUATE permits authored interpretation with actual trusted actor provenance; editing means the existing supported version/evidence command, not mutating immutable history. DECIDE separately permits scientific conclusions and their NextAction. Department membership or leadership VIEW does not imply either.

Recommended responsible-user scientific bundle includes both; cross-department evaluators may receive only EVALUATE. Decision references require VIEW of all selected Evaluations and exact target/result evidence. Creating Next Run remains a separate explicit CREATE command even when DECIDE succeeded. No approval queue or managerial sign-off workflow is added.

## 12. Configuration and reasoning governance

VIEW authorized usable definitions is distinct from global authoring catalog visibility. CONFIGURE covers immutable new definition/applicability/package versions and validation; ACTIVATE governs activate/deactivate in exact scope. The existing one-active-version-per-stable-package/scope invariant remains unchanged.

Reasoning context is exact Study/package scientific configuration, not a security policy cache. Its explicit confirmation requires ReasoningContext.CONFIGURE at the Study and access to the exact proposed references. Owning a Study or seeing an ACTIVE package is insufficient alone. Permission to manage access cannot silently carry forward Targets. Immutable contexts and historical runs remain unchanged even after permission transfer.

Security scope membership must not be inferred from existing Configuration `scope_owner_id` values; map these to verified organization references before enforcement. Configuration applicability describes valid scientific use, not who may view a resource.

## 13. Analysis and Saved Analysis policy

Transient Analysis requires VIEW on every requested source. Saved Analysis has separate owner/audience access plus **VIEW on every source Study/Run/Dataset/representative-result reference**. Preserve cross-Study/cross-Series support. The home `saved_analysis.study_id` is not sufficient to authorize all sources.

Proposed strict behavior: if any exact source is unauthorized, opening the saved view fails as a whole with a generic unavailable result. Do not silently drop rows, switch sources, render partial aggregates, or leak restricted Study names/counts. Authorized source deletion/unavailability continues to use the frozen explicit missing-reference behavior; permission loss adds an access boundary without rewriting the saved scientific context.

Owner may edit configuration while authorized for its sources. A shared reader cannot edit or re-share unless explicitly granted the corresponding capability; recipient source access is checked at every open, not just when sharing. List visibility requires metadata audience AND all-source access to avoid revealing private source existence. View-level private metadata can remain private even if all source Runs are public within the organization. Owner transfer is an access-management action. Delete/archive is deferred unless its product operation is implemented; it must never remove underlying observations.

## 14. Organization changes and responsibility transfer

Use **current organization and current stewardship for current access**, including access to historical records. Preserve the author's original principal ID, display snapshot and organization-at-event reference for scientific provenance. Historical affiliation is not a perpetual access grant.

- User transfers department: old membership-derived access ends; new membership access begins. Explicit Study responsibility/grant remains only if still active and organizationally eligible; review grants on transfer.
- Part/team reorganization: recompute managed-department closure from effective current graph; invalidate related decisions/query caches. No bulk scientific record edits.
- Rename: stable department ID retained; display label changes. Merge/split: new stable IDs plus explicit successor mapping and reviewed access-context transfer. Never infer all old resources visible to all successors.
- Responsible user leaves: principal disabled immediately; responsible department remains. Authorized department access manager or ADMIN reassigns current stewardship transactionally. Preserve creator/operator/evaluator and every historical author record.
- Owner/responsible both unavailable: department manager retains recovery scope, or organization ADMIN handles unresolved stewardship. No automatic public release and no deletion of the principal identity.

Reassignment checks authority over the current Study and validity of target responsible department/user, increments access version and revokes incompatible current grants as a deliberate policy operation. Do not rewrite scientific snapshot or old authors to the replacement person.

## 15. Exceptional collaboration grants

Normal department/leader policy uses relationships, not ACL rows per employee. Add ResourceAccessGrant only for exceptions: exact Study (optionally Run-limited operational assignment), grantee principal or verified group, allowed capability set, grantor, validity/expiry, revocation state and version. Grants do not include raw SQL predicates or domain names.

Examples: external department engineer VIEW + EXECUTE on StudyS; specialist VIEW + EVALUATE without DECIDE. Cross-organization/external guests are deferred. Only MANAGE_ACCESS with a delegable capability ceiling may create write grants; a collaborator cannot grant more than delegated or promote themself to ADMIN. SHARE only adds read audience. Ordinary leadership is not materialized as thousands of employee grants.

## 16. Permission matrix — proposed defaults

Legend: **V** = VIEW within stated scope; **A** = relevant AUTHOR/write capability, still subject to business validation; **M** = scoped management/share/reassignment. **—** = no automatic permission. All entries require active trusted identity; every downstream V entry is conditional on the parent Study visibility policy, not an unconditional department or title grant. Personas combine by explicit bindings; title alone is not a grant. GU means an unrelated general user; “department” means member of this resource's responsible department.

| Resource | General User | Responsible User / Owner | Department Member | Part Leader | Team Leader | Module Leader | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Configuration | V usable references | V; A only designated | V usable references | V scoped | V scoped | V scoped | V/A/M in assigned configuration scope |
| Study / Setup | V if published/granted; CREATE in permitted department | V/A; owner M sharing; responsibility transfer needs M | V under RESPONSIBLE/department publication; A delegated only | V managed part; M only delegated | V managed team; M only delegated | V assigned module when configured | V/M; scientific A separately assigned |
| Run Plan / Run creation | — unless explicit scope | V/A, Plan state gates edit | V; A delegated | V only | V only | V only | V; A separately assigned |
| Actual | — unless explicit scope | V/A EXECUTE | V; A delegated operator | V only | V only | V only | V; A separately assigned |
| Measurement | — unless explicit scope | V/A MEASURE incl. validity | V; A delegated measurer | V only | V only | V only | V; A separately assigned |
| Evaluation | — unless explicit scope | V/A EVALUATE | V; A delegated evaluator | V; A delegated only | V; A delegated only | V only | V; A separately assigned |
| Decision / NextAction | — unless explicit scope | V/A DECIDE | V; A delegated decision-maker | V; A delegated only | V; A delegated only | V only | V; A separately assigned |
| Saved Analysis | Own V/A/M subject to source access | Study-shared V, not edit unless owner/granted | V if audience AND all-source access | V only if audience AND all sources | Same | Same | V/M in scope AND sources; cannot rewrite scientific evidence |
| Evidence / metadata | Parent V | Parent V; future attach only authorized parent action | Parent V | Parent V | Parent V | Parent V | Parent V; no immutable deletion bypass |
| Dashboard | Own/responsible authorized subset | Authorized Study subset | Published/granted department subset | Managed part intersect Study VIEW | Managed team intersect Study VIEW | Configured module intersect Study VIEW | Assigned organization scope; never unauthorized totals |

This is not a claim that each user may perform every listed action today. It is the recommended policy baseline for approval. Configuration Manager and delegated specialists are capability bindings layered onto these personas, not additional one-size-fits-all roles.

## 17. Publication matrix and read/write separation

The audience matrix in §6 is normative for proposed visibility. Study publication and Saved Analysis sharing add **readers only**. Ordinary EDIT cannot change audience. MANAGE_ACCESS can delegate bounded authoring; SHARE can broaden read audience only within its granted publication ceiling. New grant/reassignment/visibility updates are concurrency-controlled access commands separate from Study scientific Setup updates.

A Material department-wide Study and a semiconductor Area-wide Study use the same DEPARTMENT/AREA audience representation. An unassigned Study can use RESPONSIBLE/DEPARTMENT and explicit collaborators; it must never match an Area-wide query through NULL-as-wildcard logic.

## 18. Physical schema readiness — inspected implementation

Inspection sources: migrations 001–008, `src/application/repository-ports.ts`, `app/api/repository/route.ts`, production server composition, Saved Analysis schemas. These are executable implementation facts, not assumptions based on earlier conceptual documentation.

| Attribute/boundary | Status today | Required next step |
| --- | --- | --- |
| Study technical/domain IDs, Run→Study FK | Exists in migration001 | Reuse as policy root keys. |
| Execution/Measurement/Evaluation/Decision→Run; NextAction→Decision | Exists in migrations002–004 | Derive inheritance server-side, no child ACL columns. |
| Exact Study/package reasoning context | Exists in004; adoption receipt in008 | Add scoped authorization around commands; do not mutate context payload for security. |
| Config scope_kind/scope_owner_id and activation scope | Exists, free text / non-directory IDs | Verified mapping to security scopes required; not automatically organizational authority. |
| StudySetup/Run `area text NOT NULL` | Exists as frozen scientific/context label | Not an authorization Area ID. Add nullable current Study access association; leave historical area snapshots intact. |
| Principal directory/status and trusted actor IDs | Missing | Stable principal references, status and identity-provider mapping; legacy actor labels remain unverified history. |
| Department/Part/Team graph, memberships, leadership | Missing | Effective-dated stable org IDs and versioned resolver/store or trusted directory contract. |
| Study current owner/responsible user/department | Missing in physical `study` | StudyAccessContext sidecar with FK/validation, access version and explicit backfill. |
| Area membership and Study–Module/leader associations | Missing | Separate scoped relations; module not equipment module/chamber. |
| Capability bindings and versioned policy | Missing | Scoped principal/group bindings, delegable ceiling, policy/access revisions. |
| Visibility/audience targets, exceptional grants | Missing | Root-level publication/grant records with integrity, revocation/version and indexes. |
| SavedAnalysis owner/PRIVATE-SHARED | Exists only in configuration JSON as strings | Trusted owner reference and exact audience sidecar; do not reinterpret SHARED as global. |
| SavedAnalysis source roots | Derivable from saved_analysis_source_ref; domain IDs intentionally not all FKs | Resolve exact underlying Run/Study, fail closed when unresolvable; all-source authorization. |
| Event authors/creation attribution | Some payload display strings exist; no trusted principal linkage | Future command attribution companion metadata; immutable legacy authors untouched. |
| Repository query/command authorization context | Missing | Trusted scoped execution context, SQL accessible-root predicates, actor-scoped receipts. |
| Authorization-denied application error | Missing: current error union NOT_FOUND/CONFLICT/VALIDATION/PERSISTENCE | Future internal FORBIDDEN/UNAUTHENTICATED mapping without resource-existence leakage. |
| Evidence/file access root | No production file implementation | Derive from parent when implemented; no speculative file ACL table. |

Required persistence gaps are identity + organization context, root stewardship/audiences, scoped capability bindings/grants, access revisions, trusted new-event attribution and safe receipt scoping. No authorization migration is executed now. Do not infer missing ownership from latest editor, labels, Area names or fixture actor values. Backfill needs a reviewed mapping; unmapped roots are denied to normal principals while scoped administrators can resolve them.

## 19. Query, command and cache enforcement

Current `run.list`, `measurement.datasets`, `analysis.list`, repository GET configuration bootstrap and related ports are unscoped. The route directly dispatches to several repositories, so adding checks only to DxtApplication convenience methods would leave bypasses. Future composition must expose an **authorized application facade** to HTTP; raw SQL adapters remain server-internal. All dispatch cases, direct-ID reads and bootstrap routes enter that boundary.

Use one policy predicate specification for `authorize` and `queryAccessibleStudies`; compile trusted typed scope constraints into SQL EXISTS/join predicates. Enforce before sorting, pagination, counts, facets and aggregation. Do not load all to the browser and filter there. Authorization filtering must occur before existing bounded Measurement retrieval to avoid leaks/false limit errors from inaccessible rows.

- Lists: return only accessible Study/Run/Dataset/View entries. Dashboard totals, autocomplete and recently-used data use the same predicates.
- Explicit-ID requests: if any requested source is inaccessible, reject the protected request generically; do not silently reinterpret selection as the visible subset.
- Saved Analysis: NOT EXISTS inaccessible source root plus authorized view metadata. Avoid leaking hidden source names in errors.
- Composite mutation: resolve all IDs, authorize destination and sources, validate business state, and persist atomically. Study ownership/visibility changes and write races serialize on access versions/locks. Policy tests must compare object decisions with list results.
- Future caching: scope keys include organization/principal or equivalent entitlement-set identity, membership/access/policy versions, exact scientific pins and query. Revoke/invalidate on membership/grant/responsibility changes. Scientific caches may be shared internally but responses are reauthorized; no principal-blind result cache. No caching is implemented now.

Externally distinguish access denied from unavailable only where existence is already authorized. Keep detailed internal reason codes private. Signed file links later require parent authorization at issuance and bounded lifetime/revocation policy.

## 20. Audit interface readiness

Return decision metadata for a later audit sink: decision/correlation ID, trusted actor, action, resource and resolved root, effect/reason, policy version, matching binding IDs, organization/access versions and server timestamp. Command outcome is recorded separately: authorization ALLOW may still lead to scientific LOCKED, validation error, version conflict or persistence failure.

No audit database, signature or approval event model is implemented. Avoid logging measurement values, sensitive graph membership or full request payloads merely to explain a permission decision. Author attribution for future scientific commands comes from trusted identity; never overwrite old author strings to pretend historical authentication existed.

## 21. Phased implementation proposal

A. Approve policy defaults; define PrincipalResolver, AuthorizationService, PolicyContextResolver and trusted access constraints. Add policy unit/contract tests in the implementation phase, not in frozen Core.

B. Study/Run visibility: exact reads + SQL-scoped lists, inheritance and safe error behavior. Until all alternate evidence/configuration/list routes are protected or denied, this is an isolated pilot, not system-wide authorization readiness.

C. Study Setup/Run Plan/Create commands; actor-scoped idempotency and access-version races. Then EXECUTE/MEASURE/EVALUATE/DECIDE through the same facade; retain all scientific lock checks.

D. Configuration authoring/activation and exact dependency projection; Study reasoning CONFIGURE. Separate CONFIGURE from ACTIVATE capability bindings.

E. Saved Analysis metadata/audience plus all-source checks, including cross-Study, revocation and missing-source cases.

F. Organization dashboard, list/search/aggregation predicate parity and leakage tests.

G. Exceptional collaboration grants if required by rollout; normal department/leadership policy remains relationship-based.

No phase may expose an unprotected alternate endpoint as a workaround. Production rollout must deny endpoints not yet covered, not silently invoke the old unrestricted application. No login or organization-management UI is implied by these phases.

## 22. Smallest first production authorization slice

Recommend **one Study/Run access boundary**, using existing PostgreSQL adapters, with a server-owned test PrincipalResolver during closed validation and a trusted identity integration prerequisite for external deployment.

Minimum persistence: principal/status references; verified department membership/management resolver; StudyAccessContext (owner, responsible user/department, nullable Area, access version); minimal scoped capability bindings and private/responsible visibility. Explicit collaboration can initially be fixture-bound policy input in tests, then persisted when rollout requires it. Do not migrate every child table.

Cover: Study load, exact Run load/Plan load, SQL accessible Study/Run list, Study Setup save, Study Default Run creation and Plan save. Readiness/Configuration dependencies return only authorized exact dependencies. Other production entry modes and scientific endpoints must remain denied in this pilot until their equivalent checks are wired—do not claim whole-product rollout from this subset. No UI redesign; existing errors/disabled actions consume service results. Actual-based Plan-lock race is exercised by trusted test setup, not an unprotected public execution endpoint.

Acceptance tests for the first slice:

- Owner/responsible can see an unassigned-Area Study; unrelated principal cannot find it by ID, list, count or guesswork.
- Responsible-department member sees it under RESPONSIBLE but cannot save Setup/Plan without authoring assignment.
- Scoped leader can view managed roots but not edit merely by title; Module membership does not imply team membership.
- Authorized editor on scientifically locked Plan gets a business-lock rejection. ADMIN does too.
- Source/destination spoofing, forged actor/department, unknown action, missing context and disabled principal deny.
- Access revocation/transfer racing with command has deterministic ordering; idempotent retry under revoked rights does not leak the receipt.
- Organization change affects current access; author history and exact scientific snapshots remain byte-for-byte stable.
- Both Wafer and Specimen use identical authorization/repository code; no domain-name branches.
- Restart reconstructs policy and stewardship from authoritative sources; no process-memory or localStorage grant.

This is a precise first vertical slice proposal, not implemented authorization. Add source-clone modes, downstream surfaces and Configuration governance before broad deployment.

## 23. Product Owner decisions still required

Only genuinely ambiguous business choices:

1. **Default publication and private oversight:** use RESPONSIBLE for shared Studies and owner-only PRIVATE Saved Analysis? May Part/Team/Module leadership inspect PRIVATE Studies, and is ADMIN broad private read acceptable? Proposed defaults above are not yet approved.
2. **Scientific delegation:** should responsible users automatically receive EXECUTE/MEASURE/EVALUATE/DECIDE, or require named operator/evaluator/decision-maker bindings? Should exclude/restore be narrower than recording Measurement?
3. **Leadership boundaries:** which real org units form managed-part/team closure, can relationships overlap, and which BLC/MLM Module leadership bindings give VIEW? No assumed fixed-depth hierarchy.
4. **Sharing ceiling:** who may publish to another department/Area, delegate write access and transfer ownership? Should cross-department grants expire or require periodic review? This is not an approval workflow requirement.
5. **Transfers and personal Studies:** may explicit responsibility persist after department transfer; are Studies without a responsible department allowed; who owns recovery when a department is retired/split? Proposed default requires a durable department for shared Studies.
6. **Identity and backfill authority:** which trusted identity/directory will provide stable IDs/status and authoritative org mappings, who approves mapping existing Studies/actor labels, and what revocation-latency requirement must implementation meet?
7. **Saved Analysis management:** is admin private metadata inspection permitted, and is owner delete/archive required in the first rollout? Proposed v1 grants no new deletion operation and denies opening when any source is inaccessible.

Area-unassigned access, no silent scientific copying, read/write separation, no admin immutability bypass and source-access intersection are design invariants, not open votes. Authentication, audit persistence, enterprise file/integration features and Analysis v2 remain deferred.

## Final review answers

1. **YES** — authorization and lifecycle validity are separate.
2. **YES** — VIEW never implies write.
3. **YES** — generic ownership/department/Area/org relations, no domain-name policies.
4. **YES** — children normally inherit Study access.
5. **YES** — bounded explicit collaboration grants, not blanket publication.
6. **YES** — leadership represented through scoped current relationships.
7. **YES** — current access versus immutable historical attribution defined.
8. **YES** — ADMIN obeys scientific locks/immutability.
9. **YES** — Saved Analysis audience intersects all underlying source access.
10. **YES** — server/SQL list/search/count/dashboard authorization by design.
11. **YES** — identical model for Wafer and Specimen.
12. **NO** — no Core semantic change required.
13. **Gaps:** trusted Principal/status; org/membership/leadership references; root stewardship/Area/Module associations; visibility/capability/grant storage and versions; Saved Analysis trusted ownership/audiences; trusted future attribution and actor-scoped receipts; scoped query/application enforcement and denial errors. Details in §18.
14. **PO decisions:** the seven narrowly defined items in §23; they must be confirmed before coding affected policy defaults.
15. **First slice:** trusted Principal → authorized Study/Run facade → scoped SQL reads and Setup/Create/Plan commands, with root stewardship and actor-safe receipts; isolated pilot, deny uncovered endpoints, no authentication UI or Core redesign (§22).

**Design is coherent and ready for policy review, not production enforcement. No authorization implementation has been performed.**

## Implementation update — Authorization Slice 1 (2026-09-19)

The earlier design-only status above describes the original design milestone. The limited Principal/Study/Run enforcement slice is now implemented; see [Slice 1 implementation and pilot boundary](dxt-enterprise-authorization-slice-1-study-run.md). Scientific Core remains unchanged. This does not implement the full design.

Pilot choices: server-only development identity resolved from persisted active principal; Study-root SQL visibility and authoring capability checks; recursive current managed scope; explicit principal/unit grants; no Admin science-write default. PRIVATE leadership oversight remains unconfirmed and therefore does **not** grant access in the pilot. The proposed PRIVATE exception in §23 is not activated. Unassigned Area preserves responsible-user/department access. Unsupported routes/writes fail closed. No real authentication, external tenancy, audit persistence or specialized downstream authorization is claimed.

Policy identity is `study-run-v1`; Study policy has a context version, while current memberships/grants are queried without caching. Coarse authorization-table locks and one repeatable-read transaction prevent a command from racing policy mutation within the pilot. Replace this deliberately limited strategy only with equivalent revocation/isolation proof. Raw adapters are privileged internal infrastructure; production requests exclusively use the authorized composition.

## Implementation update — Authorization Slice 2 (2026-09-20)

See [Scientific authoring implementation](dxt-enterprise-authorization-slice-2-scientific-authoring.md). The existing Study-root policy now enforces six explicit scientific authoring capabilities and inherited read aliases. Responsible-user pilot defaults include validity management per §16; department/leader VIEW and ADMIN alone do not confer scientific authorship. Authorization and frozen scientific validation remain independent.

Measurement SQL query/discovery now applies the trusted scope before bounds. Saved Analysis reads require a trusted owner mapping AND strict access to all declared/exact sources. No legacy SHARED string creates an audience. Unmapped views fail closed; explicit trusted administrative owner backfill is available, while sharing management and configuration governance remain deferred. Policy identity is `scientific-authoring-v2`. New records use trusted identity in existing author fields, without rewriting legacy authors or adding scientific fields. Slice 1's historical list of denied downstream operations is superseded only by the explicitly covered Slice 2 operations.

## Implementation update — Authorization Slice 3 (2026-09-20)

See [Configuration governance implementation](dxt-enterprise-authorization-slice-3-configuration-governance.md). Configuration VIEW, definition authoring, applicability management, package assembly, activation/deactivation and Study reasoning-context confirmation now have separate server-enforced capabilities. Policy identity is `configuration-governance-v3`. Exact historical Study/Run dependencies remain readable independently of governance scope discovery. Frozen Configuration scopes are mapped explicitly to current organizational or Principal context; no domain-name roles or implicit organization ID equivalence are used.

ADMIN and leadership provide scoped viewing, not scientific configuration mutation. Study ownership does not grant governance. The trusted provisioning CLI requires an active ADMIN sponsor for governance grants; ordinary application users cannot delegate rights through a grant endpoint. This is the first implementation's explicit Admin delegation exception, not a generic IAM language. DEPARTMENT can be a grantee organization; no new Core scope kind was added.

ACTIVE uniqueness, immutable revisions, exact Run pins, ACTIVE versus READY and independent scientific validation remain unchanged. Saved Analysis sharing, real authentication and comprehensive audit remain deferred. The earlier Slice 2 deferral of configuration governance is superseded only by these implemented boundaries.

## Implementation update — Authorization Slice 4 (2026-09-20)

See [Saved Analysis ownership and sharing](dxt-enterprise-authorization-slice-4-saved-analysis-sharing.md). Production saves now bind new ownership/creation provenance to the server Principal. Legacy display names never backfill trust; explicit administrative mappings remain required. PRIVATE/STUDY/DEPARTMENT/AREA audiences and explicit principal/unit readers are application access metadata, separate from frozen Analysis configuration.

Open/list/detail and Saved Analysis result queries require both audience access and the complete exact scientific source intersection. Owners and metadata administrators have no exemption. View, Edit and Share are distinct; sharing requires MANAGE_ACCESS on all contributing Studies and publication targets within those Studies' configured ceiling. Sharing does not create scientific grants. Content/access changes share the aggregate version, row lock and actor-scoped receipt boundary. Revocation and current memberships are re-evaluated on every request.

The original §23.7 no-deletion policy is preserved: DELETE remains denied, and no new archival or public ownership-transfer command is introduced. Explicit trusted administrator correction/backfill preserves immutable creator provenance. Saved Analysis Admin audience bypass from the earlier limited pilot is removed; existing independently defined Study ADMIN VIEW policy is unchanged. Dashboard scope and real authentication remain deferred.

## Implementation update — Authorization Slice 5 (2026-09-20)

See [Dashboard, organization aggregation and search scope](dxt-enterprise-authorization-slice-5-dashboard-scope.md). One PostgreSQL `dxt_discoverable_studies` relation now drives existing Study detail policy and scoped projections. Policy identity is `organization-discovery-v5`. Authorized rows precede counts, grouping, search, pagination, calendar and recent activity; no dashboard-owned policy exists. Current Department, managed Part/Team, explicit Area and independent Module relations are evaluated on each request. PRIVATE leadership oversight remains disabled pending the original Product Owner decision; existing mapped-root Admin VIEW never grants scientific authorship.

My means currently discoverable responsibility or explicit collaboration/authoring, excluding pure MANAGE_ACCESS administration; it is not createdBy equality or all departmental/leadership visibility. Area-null Studies remain available outside Area aggregates. Saved Analysis discovery/count/search preserves audience AND strict all-source access. Existing Configuration governance/dependency projection is unchanged. New bounded Run summaries remove per-Run scientific hydration from normal navigation; production Home/Study totals consume scoped projections, with browser demo behavior retained.

Slice 5 closes the planned dashboard/list/search authorization surface in the trusted-development pilot. It supports beginning real Authentication/session/directory integration, not external deployment. The linked report records deterministic 10-total/4-visible leakage proof, generic Wafer/Specimen tests, Native PostgreSQL plans, scale limitations, precise remaining Product Owner decisions and deferred audit/tenant work. No scientific Core semantics or historical attribution changed.
