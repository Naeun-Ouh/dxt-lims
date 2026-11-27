# Approved D01–D08 implementation and validation report

Date: 2026-11-27. **Implementation submitted for review; Human acceptance NOT RUN. No merge or production deployment.**

## Existing product baseline — not reset

- Integration baseline: `codex/runtime-integration`, `90d7f94d3ea8fe4e2711265dfe62da1345a7516e` (existing PR #26). Original checkout and its uncommitted Phase 0 documents are preserved.
- Existing Study/Run creation, exact configuration, scientific authorization, Actual/Measurement, criteria/Evaluation/Decision/NextAction, Analysis and Sample lifecycle are reused. Prior integration reported 367 passing tests; this is historical baseline evidence, not a new Human acceptance result.
- Existing Activation intermittency remains **unresolved/not established**. This enhancement's green regressions do not prove its root cause was fixed. CI workflows are not configured in the local repository; local validation is not GitHub CI.
- Existing UAT data, live grants and PR #26 were not changed. Disposable agent fixtures are explicitly labeled AGENT TEST ONLY. No whole-product completion percentage is asserted without a complete accepted baseline.

## Enhancement work packages

| Work package | Implementation | Automated verification | Browser observation | Commit / remaining gate |
| --- | --- | --- | --- | --- |
| WP-00 | Stable persisted Operation instance identity; reorder/update retain references | Native identity, rollback, locking/race/restart contracts PASS | Used by subsequent persisted Plan flows | `4cbaa1ecb7e2e123fafe3f0a69e3dc34b423965e` |
| WP-01 | Explicit Base/Split CRUD, Group/Subject allocation, Skip/Unassigned, scoped value+role priority, copy/Delta | Unit/UI/native Group contracts PASS, legacy interpretation retained | Specimen create, warning review, Group zero/VARIED, override/move/Skip/save/reload PASS | SQL `99294e4`; runtime `2a878b7`; full acceptance matrix pending |
| WP-02 | Exact Recipe Revision + Source Parameter Revision → Sample Revision; scoped inheritance/CLEAR/denied; usage/history | Five unit tests + native scoped authorization/identity/CAS/history contracts PASS | Wafer Reference association → R1 picker → Save Plan → Sample usage PASS | Same SQL/runtime commits; full scope/error browser permutations pending |
| WP-03 | Explicit latest-or-historical clone, R1→R2 and R1→R3, exact origin, optional reason | Three unit tests + 15 native Sample tests PASS, concurrency/receipts/immutability | R1→R2→R1-cloned-R3, property/source and past usage retained; KO/EN PASS | Same commits; Human NOT RUN |
| WP-04 | RUN_ONLY or CRITERIA_BACKED judgment; no result/Evaluation/rationale gate; existing permissions/actions | Ten workflow tests + both-domain native contracts PASS | Criteria-free Specimen judgment saved and restored on reload; no fabricated evidence | Same commits; criteria-backed and complete NextAction browser path pending |
| WP-05 | Existing Grid/Inspector, collapsed summaries, 50-row pages, view-only manual focus, scope editor, warnings/KO–EN | Nine focused UI tests; 1,200×25 projection benchmark ~176.7 ms | KO/EN Group/judgment/Sample and viewer/denied state inspected inline | Same runtime commit; exhaustive keyboard/25-column and focus network audit pending |
| WP-06 | Integrated shared consumers and disposable environments | Final full regression **396/396**, native full + focused contracts, TSC/lint/build PASS | Group→judgment and Actual→Measurement→Analysis, plus Wafer Source→Sample journeys PASS | **Partial verification**: all A01–A35 browser combinations and Human UAT are not claimed complete |

The schema commit is shared because SQL019 Group identity is a prerequisite of SQL022 exact scoped Source links. Runtime consumers are integrated together to avoid a commit that temporarily interprets Group values with old precedence. No second workspace or parallel execution model was created.

## Authoritative contracts

- `GROUPS_V2` is explicit and only new/copy authoring adopts it. Historical snapshots retain their prior interpretation. Subject > Group > Operation common selects value and FIXED/VARIED together; zero and false are values, blank override inherits, invalid nonempty text is not silently replaced. Base is not the parent of Split groups. Scope values are stored once, not expanded into Subject assignment copies.
- Operation physical IDs survive edit/reorder. Copied Runs have independent persisted physical identities even where run-scoped logical IDs are retained. Group deletion leaves affected Subjects UNASSIGNED and retains their explicit exceptions. SKIP never creates Actual evidence. Legacy absent membership remains legacy exclusion, not inferred Skip.
- UNASSIGNED/MISSING become visible nonblocking warnings for new Group-contract plans. Invalid structure/types/references, permission failure, CAS conflict and evidence locks remain authoritative errors. Final Create reuses fingerprint/revalidation and is still the durable boundary.
- Exact Source metadata is separate from numeric/string values and legacy MATERIAL assignments. No dual-write mirror is introduced. No row means inherit; CLEAR or denied selection stops inheritance. Existing exact Recipe/Parameter identities and Sample Revision table are reused. Changing Recipe never silently retargets Source links.
- Run judgment stores an explicit basis. Historical criteria-backed provenance remains. Existing explicit AUTHOR_DECISION, separate NextAction permission, receipt fingerprints, CAS, immutable history and Plan locks remain. No fake Target/Evaluation is created.
- Sample clone origin is an immutable sidecar. Latest is the default source, older sources are selectable, destination numbering follows latest+1. Old rows and Run Revision links are unchanged; historical origin is not guessed.

## Schema changes and hashes

Applied only to disposable databases. Production rollout/merge is not part of this result.

| Migration | Purpose | SHA-256 |
| --- | --- | --- |
| 019 | Group identity, explicit allocation state and scoped assignments | `64afdf6a2907299da7ccd34092a7f3bef1f6c17406a7deffb3bbbd15006cd271` |
| 020 | Sample Revision exact clone-origin sidecar | `c528cd6e01d5bce29364d806685c88c3e5b12fb0577407f43bdd48cc98eb6d14` |
| 021 | Explicit nullable criteria basis for Run judgment, related guards/history | `5e50a09bfff94342afd7ac52fc9d5a44073ad5337acc6759031ae18ac3b9a020` |
| 022 | Exact Recipe Source association catalog, scoped current binding and immutable history | `572a09de743d7bb94ee0f8344d0742ba168e31ef7d730f18aaf8ae76d733b1f0` |

New `/api/recipe-sources` reuses trusted identity and configuration visibility/authoring. Existing repository commands carry Group design/Source binding fields; Sample write accepts exact clone source and optional reason. No new scientific permission or automatic creator privilege is introduced.

## Executed validation

Application commit: **`2a878b71671035bf677c3e2a0811634822bd22ff`**. Later documentation-only commits do not change tested application files.

- `node tests/run.mjs`: **396 PASS, 0 FAIL, 0 SKIP**, complete final rerun. Five new focused files contribute 28 tests; an additional Group integration contract runs inside the existing PostgreSQL adapter suite. Existing and changed tests are not conflated with Human acceptance. Per-WP counts overlap the full total and must not be added again.
- `node tests/run-postgres-native.mjs`: full native PostgreSQL 18.7 regression PASS. Focused stable identity/Group, Recipe Source, Run judgment and Sample runtime suites also PASS. Native tests create isolated databases and verify persisted readback, rejected writes, historical preservation and restart behavior.
- TypeScript `--noEmit` PASS. A disposable config extended the project and excluded generated `tmp` browser app copies; it was removed after validation. No product tsconfig was changed.
- Changed-file oxlint: 65 files, PASS. Production `npm run build`: PASS; existing vinext dynamic-route classification warning is recorded in the log, not hidden. `git diff --check`: PASS.
- Focused performance test: 1,200 Operations × 25 Subjects projection ~176.7 ms locally; renderer shows 50 initially collapsed summaries. This is not a measured production browser end-to-end latency or a full 25-column usability acceptance.
- `evidence/integrated-readback.json`: independent **BEGIN READ ONLY / SELECT / ROLLBACK** proof of stored Group zero/VARIED, Subject 5 preserved after move, explicit Skip, RUN_ONLY judgment, Source still R1 after R3 clone, and no fabricated Actual events.
- `evidence/final-source-capture.json`: all tracked `app/` and `src/` files in writer/viewer/denied browser copies equal the committed application. Earlier browser actions retain their actual source timestamps; the manifest does not retroactively claim they ran at the final commit.
- Screenshots were examined inline in the task (Group/readonly, Source/Sample/judgment states). No stored PNG or Human acceptance is claimed.

Reproduction commands (Node >=22.13, PostgreSQL binaries installed):

```sh
node tests/run.mjs
DXT_POSTGRES_BIN=/path/to/postgres/bin node tests/run-postgres-native.mjs
# Focused native entries are bundled with esbuild as ESM, packages external,
# then run with node --test. Exact commands are in the individual WP documents.
npm run build
```

The temporary TypeScript check used:

```json
{"extends":"./tsconfig.json","compilerOptions":{"incremental":false},"exclude":["node_modules","tmp"]}
```

## Current disposable browser routes

These are **agent validation data**, not clean Human acceptance submissions. Do not substitute the old 3212 environment or modify preserved UAT records. The environment can be inspected while the local processes remain running; test instructions must use new labeled data for subsequent Human actions.

| Purpose | URL |
| --- | --- |
| Specimen saved Group Plan | http://127.0.0.1:51924/series/agent-integration-specimen/runs/3/engineering-grid?view=plan |
| Specimen criteria-free judgment | http://127.0.0.1:51924/series/agent-integration-specimen/runs/3/engineering-grid?view=evaluation |
| New transient Specimen draft | http://127.0.0.1:51924/runs/new?series=agent-integration-specimen&from=blank |
| Wafer exact Source Plan | http://127.0.0.1:51924/series/agent-integration-wafer/runs/3/engineering-grid?view=plan |
| Sample R3 cloned from R1 | http://127.0.0.1:51924/samples/agent-source-browser-sample/revisions/3 |
| Exact Source definitions | http://127.0.0.1:51924/reference |
| Viewer Plan | http://127.0.0.1:51926/series/agent-integration-specimen/runs/3/engineering-grid?view=plan |
| Denied Plan | http://127.0.0.1:51927/series/agent-integration-specimen/runs/3/engineering-grid?view=plan |

Only synthetic writer configuration permission was added inside this new disposable cluster to exercise Source registration. Existing live permissions and viewer/denied actors were not broadened. Datetime browser automation initially displayed a value without firing React's change event; two requests correctly failed validation, then real keyboard events and save succeeded. This is recorded as an automation observation, not a confirmed researcher defect.

## Five-perspective self-review

- **PI:** Explicit Base/Group decisions and optional judgment retained; incomplete design is a warning, not a fabricated completion. Manual focus remains view-only.
- **Architecture:** One scoped condition authority; existing snapshot/repository/authorization and exact reference identities reused. Additive provenance records protect historical meaning.
- **Screen:** Existing Grid/Inspector and Sample screens reused; dense collapsed rows and common control labels. Scope hierarchy and state text do not rely only on color.
- **UX:** Explicit inheritance/override/Skip/Unassigned, warning review, clone source/next number. Found and fixed misleading Plan lock explanation and V2 legacy/Skip accessibility labels. Full large-grid keyboard and combined browser coverage remains open.
- **Engineering:** Real PostgreSQL authorization/CAS/history/restart, full regression and build. During integration fixed empty Source-read authorization regression, legacy N/A rendering regression, original Delta role/absence provenance, and shared effective assignment consumers; tests were rerun.

## Remaining gates and next actions

1. No confirmed open P1 was observed in the executed automated and bounded browser scenarios. This is not a claim that unexecuted scenarios are defect-free.
2. Complete the explicitly pending combinations in `acceptance-traceability.md`: repeated-operation multi-Group browser flow, full Source inheritance/CLEAR/denial browser matrix, unexpected Actual/Measurement/Analysis/NextAction mixed-version journey, broader focus/selection combinations, and 25-Subject keyboard/scroll usability. A distinct device-experiment browser scenario is NOT RUN; shared semiconductor/Specimen contracts do not constitute that separate browser proof.
3. Human UAT: **NOT RUN**. Prepare a separate explicitly labeled Human dataset and exact reviewed head before participant acceptance; agent observations remain separate.
4. Keep existing Activation intermittency unresolved until reproducible evidence establishes its cause. No unrelated P2/P3 redesign added. Source-only Plan change counter polish is a follow-up; persisted Source history and usage are authoritative.
5. Review SQL019–022 and additive migration deployment/rollback operational planning before any production use. No additional business policy decision is currently required for implemented D01–D08.

No merge, production migration, UAT mutation or acceptance declaration was performed.

## Supplemental final-head browser verification

After the first documentation commit, the existing fresh **Agent-only** Specimen Run 3 was explicitly used for Actual/Measurement regression. SP02 Plan 5/VARIED remained unchanged while Actual 6 persisted. A write attempt for skipped SP03 was rejected with no new event. SP01 Peel Force 24 N persisted, survived reload and displayed in Analysis TABLE; non-applicable SP02/SP03 displayed N/A. This supplements, rather than overwrites, the earlier zero-Actual snapshot.

Manual focus selected Test, expanded it and restored the full Experiment scope. Before/after read-only SQL hashes for Plan, allocation, conditions, Actual, Measurement and Decision tables matched exactly. `evidence/final-lifecycle-readback.json` records the values, hashes and timestamps. A new Actual on a skipped Subject remains subject to the existing recording guard; preserved unexpected historical evidence is separately verified by unit/native tests. No policy bypass was introduced. Human acceptance remains NOT RUN.
