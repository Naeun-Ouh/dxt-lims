# Issue #9 — Sample lifecycle: independent read-only slice and blocked write boundary

## Decision and scope

Issue #1 / #14 / #9 and #7's Pilot scope decision require persistent Sample creation, revision authoring and exact usage. These remain **P1, not complete**. This slice makes production browsing truthful and reusable while the missing storage/authorization boundary is reviewed. No live UAT data, schema, grants, scientific values or revisions are changed.

### Implemented independently

- Production `/samples` reads actual `run_assignment` + `run_material_usage` rows through the existing authenticated request boundary.
- The existing `dxt_discoverable_studies` scope is applied before search, totals and pagination; inaccessible rows contribute neither details nor counts.
- Rows retain the exact recorded assignment reference, scope, value, operation and Run route. They are **Plan assignments**, not evidence of actual consumption.
- Technical reference IDs appear only in expandable detail. No inference from `D035 Rev.2`, naming conventions or fixture IDs creates a Sample Revision relationship.
- Production Sample/Revision detail routes explicitly state that identity/history cannot yet be verified; they never replace missing persistence with fixture identity/usage. Browser/demo mode remains unchanged.
- KO/EN loading, empty, error/retry, search and pagination reuse existing Grid/controls. No nonfunctional Create control is presented as operational.

## Discovery evidence

| Existing surface | Finding | Reuse / required review |
|---|---|---|
| `src/domain/material/sample.ts` | Sample identity and revision schemas exist | Reuse their supported fields; no fabricated author/QC/signature metadata |
| `src/domain/material/structure.ts`, `property.ts` | Composition nodes/edges and property values already have domain schemas | Preserve these schemas and exact immutable snapshots, not a new genealogy model |
| `src/features/samples/model.ts` | Every identity/revision/property/usage read imports mock catalog or mock experiment contexts | Not a production repository |
| `ApplicationRepositories` | No Sample repository port or create/revision command | New bounded repository/application contract required |
| Migrations 001–015 | No Sample identity, Sample Revision or composition/property persistence tables | Schema approval required before writes |
| `run_material_usage.material_revision_id` | Writer stores `SetupAssignment.referenceId`, backed by configuration external references | Column name does not prove a registered Sample Revision; exact mapping is absent |
| `studyActions`, scientific/configuration grants | No Sample authoring capabilities or Sample ownership scope | Must not borrow Plan/Study/Reference writes or infer rights from ADMIN |
| material status | `Draft`, `Active`, `Retired`; no `Inactive` transition command | Active/Inactive action remains explicitly deferred pending authoritative transition policy |

## Smallest proposal for Product/Architecture review — not implemented

1. **Sample identity**: persistent stable ID and unique sample code, existing name/material/supplier/description/status/createdAt fields. Material/supplier references remain nullable; do not backfill fixture values or introduce supplier redesign. Confirm the authoritative resolution contract before allowing non-null external references.
2. **Append-only Sample Revision**: unique `(sample_id, revision_number)`, immutable revision ID, supported registration/effective/status metadata and an immutable composition/property snapshot validated against the existing material schemas. New revision creates new rows; no update-in-place of used/published content. A concrete SQL proposal should choose normalized child rows versus a validated immutable aggregate only after review; neither choice is silently made here.
3. **Exact usage capture**: add an explicit typed mapping from a selected configured material reference to a registered Sample Revision, then capture that exact revision on the Run assignment at creation. Keep the configuration reference too. Never resolve historical usage by latest revision, display label or a subsequently added mapping. Existing unlinked historical assignments remain explicitly unresolved; any evidence-based historical linkage requires separate provenance policy, not automatic backfill.
4. **Explicit authorization**: separate Sample register and Sample revision-author capabilities with organization/resource scope and explicit grants, default deny. Sample discoverability and supplier/material-reference access need a reviewed policy. Study creator, Plan editor, Reference editor and administrator roles do not automatically gain Sample write capabilities. Use the existing principal/organization infrastructure; do not create a second identity system.
5. **Command boundary**: transactional create identity + first revision, append revision with expected version/number and idempotency key, authoritative read-back. Creation never changes historical Run references. Revision deletion/content mutation has no public command. Retire/reactivate is deferred until transition and audit rules are approved.

The primary blocker is **schema plus authorization policy**, not a missing button. User instruction to start independent work does not authorize inventing these irreversible boundaries.

### Alternatives rejected

- Store Samples as configuration revisions: conflates reference governance with operational material identity and bypasses Sample authorization decisions.
- Store in localStorage/mock catalog: does not satisfy production persistence or multi-user exact provenance.
- Interpret every MATERIAL external reference as a Sample Revision: not all materials are Samples; matching IDs/labels are not authoritative evidence.
- Join current/latest Sample Revision at read time: retroactively reinterprets historical Runs.

## Reference pattern

Benchling separates registry/schema/inventory permissions rather than deriving them from unrelated experiment edit rights ([official permissions overview](https://help.benchling.com/hc/en-us/articles/9684210957581-Permissions-overview)). The relevant DXT pattern is explicit operational-object authorization; Benchling's exact roles and model are not copied.

## Validation and acceptance

- Focused tests: **6 PASS** — bilingual production/demo separation and exact-reference detail; persisted assignment readback; access-scoped counts/search/paging; revoked principal denial; no assignment mutation.
- Final follow-up full repository tests: **343 PASS / 0 FAIL**. Native PostgreSQL 18 full contract suite: **PASS** (including the material usage contract, 20.32 seconds; disposable database). TypeScript, changed-file lint, production build and `git diff --check`: **PASS**.
- Browser-discovered integration defect: the first draft registered the authorized query but omitted its HTTP request-schema discriminant, causing `400` and an actionable error state. The follow-up registers `material.usage` and changes the contract to exercise the actual HTTP parser, status and no-store header before authorization/SQL (including invalid query `400` and revoked principal `403`). Missing KO Search/Material labels and catalog control borders were corrected in the same bounded fix.
- Agent browser review at 1440px on isolated port 3247: `/samples` returned four real Plan assignments; searching `AGENT` returned two with the scoped count. KO/EN controls and explanatory boundaries were readable. `/samples/D035/revisions/2` showed the unverified-identity/history notice without fixture substitution. The browser used the disposable Issue #15 test database; old UAT was not touched. This is agent evidence only, not Human acceptance.
- React checklist: scoped server data, stale-request/unmount guard, no render-time writes, semantic dense table, KO/EN error/retry and secondary technical detail. Browser review is recorded separately from these automated checks.
- Agent automation is not Human acceptance. Human UAT for Sample creation/revision remains **NOT READY** until the write boundary is approved and implemented.
- Read-only review routes: `/samples`; `/samples/D035`; `/samples/D035/revisions/2` in production. The latter two explicitly avoid claiming fixture data as persisted identity/history.
- PR #12 and all other acceptance gates remain unmerged.

## Remaining

P1: approve Sample schema + explicit capability/scope model; implement create/revision/readback; capture exact SampleRevision linkage for future Run usage; verify immutable history and denied writes. P2/P3: richer lookup filters, sample-specific counts, optional status polish. No certificate/QC/approval/supplier/genealogy expansion.

Next executable task: Product/Architecture review of the five bounded write-boundary decisions above, followed by exact migration/contract design before application to UAT.
