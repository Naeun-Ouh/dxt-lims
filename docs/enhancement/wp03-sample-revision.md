# WP-03 — Sample Revision clone provenance

Status: implemented and focused agent validation passed; Human acceptance NOT RUN. Baseline PR #26, `90d7f94d3ea8fe4e2711265dfe62da1345a7516e`; changes are on the isolated enhancement branch. No existing UAT/live grants/data were used. No deployment or merge.

## Contract and implementation

- Existing Sample Master/Revision aggregate and explicit `REVISE_SAMPLE` permission remain authoritative. Initial registration still creates R1.
- `Revision 올리기` / `Create Revision` fetches the latest revision as the default source, including when opened from an old revision detail.
- The clone form offers the Sample's existing revision history as source choices. Selecting R1 while R2 is latest creates R3, never R2. Source composition/properties are copied without mutating them; `0` and `false` remain values.
- Source revision, next number, original data (expandable), editable new information, and optional change reason are visible in KO/EN. A changed-source confirmation protects already edited unsaved information.
- Command optional fields: `copiedFromRevisionId`, `changeReason` (trimmed, max 2000). New clone UI always supplies the selected exact source. Existing command clients without clone source remain compatible and source is explicitly unknown; no historical predecessor is inferred.
- Migration `020_sample_revision_clone_origin.sql` adds only immutable `dxt_sample.revision_clone_origin`. Composite foreign keys require source and destination in the same Sample. No backfill, grant changes, or existing revision update. New provenance is inserted atomically in the existing writer with the revision and receipt.
- Existing policy locks, explicit grants, same-Sample advisory serialization, expectedLatest CAS, receipt request matching, and trusted actor are retained. New source/reason are part of idempotency content. Legacy receipt request shapes remain unchanged when no source is sent.
- Detail/history readback shows source and reason. Existing Run assignment mappings/history are not rewritten. Recipe-source usage integration is a separate WP-02 change to the shared readback function.

## Focused tests

Executed with Node 24 runtime and PostgreSQL 18.7. Evidence: `evidence/wp03-unit.log`, `evidence/wp03-postgres.log`.

- Unit/KO-EN server rendering: 3 PASS, 0 FAIL.
- Native PostgreSQL Sample runtime suite: 15 total tests PASS, 0 FAIL (includes existing regression cases and one comprehensive WP-03 scenario).
- New DB assertions: R1→R2→R3 from R1; property 0 vs R2 property 7; exact origin/reason and retry readback; mismatched retry origin rejected; cross-Sample/nonexistent source rejected without revision; simultaneous next-number allocation gives one success/one conflict; viewer/admin/outsider write denied; revoked permission also denies retry; origin update/delete/truncate rejected; existing Run usage unchanged; absent legacy origin stays unknown.
- Focused PostgreSQL suite rerun after WP-02 usage-readback integration and migration022: 15/15 PASS (`evidence/wp03-postgres-integrated.log`). This verifies Sample regression compatibility, not the entire Recipe Source feature.
- Changed-file lint passed; TypeScript passed after local ignored hosting stub was supplied. Initial native sandbox escalation was rejected against a superseded design-only instruction, then approved after presenting the latest implementation authorization. No workaround or existing database was used.

Commands (DXT_NODE denotes the Node 24 runtime):

```sh
DXT_POSTGRES_BIN=/Volumes/Postgres-2.9.7-18/Postgres.app/Contents/Versions/18/bin "$DXT_NODE" tests/run-sample-runtime.mjs
# Focused test is bundled with esbuild (platform node, cjs), then:
"$DXT_NODE" --test tmp/sample-clone.test.cjs
```

## Actual browser verification

Agent-only environment: `tmp/enhancement-browser/agent-integration-vAXuaQ`.
Writer http://127.0.0.1:51053, viewer http://127.0.0.1:51056, denied http://127.0.0.1:51057.
The temporary harness copies tracked and nonignored untracked files, uses new local PG storage, and never reads `.env`.

Sample: `AGENT-WP03-CLONE` / `6fdf07c9-dddb-4713-8bd2-6344cb0b4986`.
Exact R3 route: `/samples/6fdf07c9-dddb-4713-8bd2-6344cb0b4986/revisions/3`.

1. Registered R1 through KO UI with numeric property `0`.
2. Cloned R1 into R2 through UI, changed property to `7`, entered optional reason, saved; history showed source R1.
3. Opened historical R1 detail; Revision action defaulted source R2. Selected R1 explicitly; new number remained R3 and copied property returned to `0`.
4. Switched KO→EN in the same form; source/value/number remained unchanged. Source selector, original-data disclosure, reason and Save button were readable and usable. Screenshot captured in tool transcript.
5. Saved R3 with reason blank. History displayed `Copied from R1`. Reload retained R3, source R1 and property 0.
6. Switched to KO and captured history screenshot: `개정 3 · 복제 원본 R1`; R2 reason and R1 initial registration remained visible. No severe overlap was observed in the captured viewport.
7. Viewer browser readback showed the same history and a disabled Revision action with an explicit read-only explanation.
8. Initial denied navigation was interrupted (`ERR_NETWORK_IO_SUSPENDED`). Follow-up on 2026-11-27 by the parent agent using root CUA browser 1 / tab 6 loaded the exact R3 route on port 51057: only `샘플이 없거나 조회 권한이 없습니다.` and Retry were rendered; no Sample code, Revision content, or form was exposed. **Denied browser screen PASS (agent accessibility-tree observation)**. No screenshot is claimed for this follow-up. Independent read-only HTTP request returned 404 `NOT_FOUND`; viewer HTTP returned `canRevise:false`.

Screenshots are in the browser tool transcript (English clone form and Korean persisted history); no file-backed image artifact is claimed. JSON readback, revision IDs, permission responses and per-file copied-source hashes: `evidence/wp03-browser-readback.json`.
Sample source-capture hash: `374de8f8d1ec43a31a91f7f58a63d302ceba64b7c68d989420f46a03a649492c`.
This snapshot predates later WP-02 usage-readback integration; it is not evidence for that integration.

## Remaining coordinated validation

- Integrated final-head regression/build and browser checks belong to WP-06.
- Full production deployment grants remain a separate environment concern. Existing runtime-role template grants SELECT on all Sample tables when explicitly provisioned; migration itself changes no live role.
- Human acceptance remains NOT RUN. Browser automation is agent evidence only.

## Five-perspective self review

| Perspective | Review and evidence | Result / limit |
| --- | --- | --- |
| PI Consultant | Researchers explicitly choose the source revision; latest is the default, historical R1 can produce R3, and a change reason is optional. Source provenance records the actual choice without inferring a predecessor. | Approved D06 behavior preserved; agent checks do not establish researcher usability acceptance. |
| Solution Architect | Existing Sample Master, immutable Revision, composition/properties and Run usage are reused. The sidecar stores only clone provenance, with same-Sample foreign keys and the existing atomic writer. Legacy revisions remain unchanged/unknown. | No duplicate scientific property storage or rewrite of historical Run links; SQL020 is additive. |
| Screen Designer | Existing Sample detail, history and revision form remain the screen structure. Source revision, new number, original-data disclosure and editable new information are clearly separated in shared KO/EN components. | KO/EN browser form/history and read-only/denied states verified; no cosmetic redesign added. |
| UI/UX Specialist | Clone copies composition/properties to avoid re-entry; changing the source of an edited form asks before discarding local edits. Default latest and explicitly selected historical source are visible. | R1→R2→R3-from-R1 completed through actual browser; Human acceptance NOT RUN. |
| Senior Developer | Focused unit/render tests and native PostgreSQL tests cover persistence/readback, zero/false, CAS, receipt retry/mismatch, cross-Sample source rejection, revoked/denied permissions, concurrent revision creation and immutable provenance. | 3 unit + 15 PostgreSQL tests PASS; integrated final-head validation remains WP-06 responsibility. |

Review found no outstanding WP-03 P1 defect. Browser availability interrupted one denial check; it was subsequently completed by the parent agent, rather than treated as passed without observation.
