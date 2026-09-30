# DXT Production Core v1 — Freeze blocker closure

2026-09-19 KST. Scope: P0-01, P1-01, P1-02 only. **Ready to rerun the final Freeze Review; not a declaration of FROZEN.**

## P0-01 — exact Study/package reasoning adoption

**Before:** package activation and Study selection succeeded, but newly adopted PHOTO v3 and Material v2 had no exact reasoning context. Evaluation correctly failed after Measurement/Analysis. Only a bootstrap script could supply the missing context.

**After:** Study Setup displays selected package separately from lifecycle readiness. `StudyRepository.getLifecycleReadiness` resolves the exact Study/package pair. The user explicitly chooses an existing persisted same-Study context as a proposal, reviews Target bindings and Evaluation/Next Action references, then confirms it. `confirmReasoningContext` creates a NEW immutable context identity for the new package, plus a durable adoption receipt. There is no automatic proposal selection, copying, aliasing, target inference, or bootstrap invocation.

**Why:** ACTIVE means available configuration; Study package selection means intended future configuration; READY means the exact downstream scientific prerequisites are valid. Activation never requires Study-specific reasoning. Study Setup can save an incomplete selection, clearly marked NOT_READY; every Run creation command enforces readiness before allocating/inserting the Run. No frozen full-lifecycle Run is exempt.

Validation checks exact numeric Measurement parameter/point, matching Evaluation parameter definition, units, target bounds, Evaluation references and active Next Action references. This is prerequisite validation, not a new achievement engine. Target Achievement still derives from Target plus exact Measurement summary. Existing contexts, historical pins, Evaluations and Decisions are untouched.

The small UI supports explicit confirmation of registered scientific definitions for an existing Study. If no same-Study proposal exists, it explicitly requires scientific configuration and blocks creation. A general blank-slate Target/catalog authoring editor is outside this blocker closure. The command accepts explicit Target bindings; the reference catalog is loaded server-side from the selected immutable proposal, never trusted from a browser dump. Bootstrap remains a seed/migration utility only.

## P1-01 — all four production creation sources

**Before:** only Study Default used a supported production command. Previous/Existing/Blank relied on fixture previews and unsupported HTTP `saveSnapshot`; a static Run number and stale initial Study context could mislead users.

**After:** `DxtApplication.runs.previewCreation` and `createFromPreview` call the Run repository over HTTP and PostgreSQL. Preview reads persisted context, returns a fingerprint and readiness, and reserves no Run number. The heading says **Create Next Run**. Create re-resolves and compares the source under the Study transaction lock; a changed source requires a fresh preview. Durable receipts make retries return the original Run. Number allocation, full snapshot, normalized children and successful receipt commit together.

- Study Default: materialize exact persisted Study Setup and package.
- Previous Run: most recent persisted Run in the Study; shared `createNextRunPreview` full-snapshot path, applying persisted Decision proposal changes when available. No fixture Previous Run.
- Existing Run: frozen semantics are **clone as a new independent Run**, not navigate to or mutate the source. Select a real same-Study Run; preserve its exact package/context and complete intended Plan, without copying Actual/Measurement/Evaluation/Decision evidence.
- Blank: frozen semantics preserve Study identity, exact package and selected Subjects/manufacturing context, with zero inherited Operations, assignments and Measurement plan. This is a valid empty Plan, not a fake experimental execution. The projection no longer substitutes fixture Operations for zero steps. No new Operation-authoring capability was added.

**Why:** advertised options must share authoritative identity, transaction, retry and read-back semantics. Missing Study, source or exact package fails explicitly; no initial fixture is retained. Source Runs remain unchanged. Previous Run concurrent preview can become stale after another creation; it fails explicitly rather than silently inheriting a different Run.

## P1-02 — legacy route isolation

**Before:** PHOTO Run 18 and CMP Run 12 `/workspace` mounted `RunPlanner` / the legacy planning hook, initialized fixture state, used optimistic module storage and claimed browser-save success even in production.

**After:** PostgreSQL composition redirects both routes to their exact canonical `/engineering-grid` URLs. Fixed prototype canonical pages PHOTO 18, CMP 12 and Material 3 mount `CreatedRunGrid` with exact Run numbers in production. A nonexistent persisted Run renders unavailable, not its fixture. Demo composition retains its explicit fixture surface. Production links resolve canonical persisted Run paths; legacy links are confined to demo components. The previous exact-route corrections for PHOTO 19, CMP 13 and Material 4 remain covered.

**Why:** obsolete authoring screens do not justify a second production persistence owner. Failed production persistence cannot be represented by the legacy optimistic module store because that store is not mounted on these production routes.

## Fresh product walkthrough evidence

Production app: `http://localhost:3100`, real PostgreSQL 18, database `dxt_slice_verified`. No reasoning bootstrap was run after package adoption. New-package contexts were confirmed through Study Setup.

- **Wafer:** PHOTO v3 → new Run **24** from normal Previous Run UI → Plan W01 Energy **37** → Actual **38** → BCD **17.0 nm**, SITE measurement → Analysis BAR saved as `analysis-view-19876032-4e58-467a-9b66-ef49238afe2b` → application restart → exact Saved View reopened → ACHIEVED / engineer ACCEPT → persisted Decision and Design Next Experiment → explicit preview/create **Run 25** → independent Plan W01 Energy edited to **39** and saved.
- **Specimen:** Material v2 → new Run **9** from Study Default UI → Plan SP-01 Cure Temperature **121** → Actual **122** → Peel Force **23 N**, SUBJECT measurement with no fake Site/MES → Analysis BAR saved as `analysis-view-b5db3aee-bfef-4cdc-a94b-0b7ed820d1ef` → application restart → exact Saved View reopened → ACHIEVED / engineer ACCEPT → persisted Decision and Design Next Experiment → explicit preview/create **Run 10** → independent Plan SP-01 Cure Temperature edited to **124** and saved.
- Normal entry UI also reviewed/created Existing source Run 24 as independent **Run 26**, and Blank as **Run 27** with zero Operations/assignments. No predicted static number was displayed.
- A second application restart restored Next Run 25 Energy **39** and Next Run 10 Cure Temperature **124**, with Save Plan disabled until a new edit. Manual PHOTO18/CMP12 legacy URLs redirected to the exact canonical routes and showed `Saved Run could not be loaded.` because those fixture IDs are absent from this database. `/runs/new?series=missing-study` displayed `Study could not be resolved.`

Read-only SQL evidence: [production-core-blocker-closure-sql.json](evidence/production-core-blocker-closure-sql.json). It records exact pins, contexts, execution/dataset/evaluation/decision counts and Saved Analysis source references; it is supplementary to the browser walkthrough, not a replacement.

## Verification

- `npm test`: **247 passed** (108 domain, 126 workspace, 13 PostgreSQL integration).
- Native PostgreSQL 18: passed, including newly authored package adoption, both full lifecycles, all four sources, durable retries, source immutability, injected rollback for every creation source, numbering races, stale preview rejection, Plan/evidence lock and database restart/read-back.
- Readiness tests: fail early before confirmation; invalid target rejected; receipt-write failure rolls back context; idempotent confirmation; old context unchanged; immutable replacement rejected.
- Route tests: production redirects/canonical exact numbers, prototype fixture prohibition, historical exact Run identity.
- TypeScript, changed-file lint, PostgreSQL build, browser build, `git diff --check`: passed.
- Existing repository-wide lint debt: **105 diagnostics**, separately reported; no unrelated cleanup.

## Changed files in this closure

- Application: `src/application/study-readiness.ts`, `run-creation.ts`, `repository-ports.ts`, `dxt-application.ts`.
- Infrastructure/API: `src/infrastructure/postgres/reasoning-context.ts`, `postgres-repositories.ts`, `migrations/008_study_reasoning_adoption.sql`, `src/infrastructure/http/http-repositories.ts`, `app/api/repository/route.ts`, `scripts/migrate-production-slice-1.mjs`.
- UI: `src/features/experiment-series/study-readiness-panel.tsx`, `study-setup-workspace.tsx`, `production-run-entry.tsx`, `create-run-entry.tsx`, `src/features/run-registration/workspace-model.ts`, `app/runs/new/page.tsx`; PHOTO18/CMP12 workspace and Engineering Grid pages; Material3 Engineering Grid page.
- Tests: `tests/postgres-freeze-closure-contract.ts`, `postgres-configuration-study-contract.ts`, `postgres-native.test.ts`, `postgres-adapter.test.tsx`, `workspace-inline.test.tsx`, `run.mjs`.
- Documentation: this report, production Freeze review, repository transition, persistence schema, SQL evidence.

This list describes this closure, not all pre-existing uncommitted project work.

## Explicit final answers

1. **YES** — exact context is validated/reused or explicitly confirmed; selection alone is not READY; creation enforces readiness.
2. **YES** — ACTIVE and Study lifecycle readiness remain distinct.
3. **YES** — no silent scientific copying; proposal confirmation creates a new identity.
4. **YES** — fresh PHOTO v3 Run 24 completed through Next Run 25.
5. **YES** — fresh Material v2 Run 9 completed through Next Run 10.
6. **YES** — Study Default remains production-backed.
7. **YES** — normal Previous Run UI is production-backed.
8. **YES** — Existing Run creates an independent persisted clone.
9. **YES** — Blank uses the frozen empty-Plan semantics.
10. **YES** — every visible creation option has a supported command.
11. **YES** — normal entry says Next Run; transaction assigns the final number.
12. **YES** — missing Study/configuration fails explicitly.
13. **YES** — legacy fixture workspaces redirect or remain demo-only.
14. **NO** — production failure does not promote fixture/module state to saved truth.
15. **YES** — historical exact URLs retain requested Run identity.
16. **NO** — no Browser/InMemory/localStorage/mock fallback in the fresh authoritative lifecycle.
17. **NO** — Core, Generic Framework and scientific semantics were not redesigned.
18. **NO** — no remaining P0 blocker in the reviewed closure scope.
19. **NONE** — both identified P1 blockers closed.
20. **YES** — fresh Wafer and Specimen flows continued after application restart; native tests also prove database restart durability.
21. **YES** — ready to rerun FINAL Production Core v1 Freeze Review. Final Freeze approval is still a separate review.

Deferred enterprise work remains unchanged: auth, permissions, enterprise audit/signatures, object storage, live integrations, Analysis v2, preprocessing, DOE, AI and high-volume UI redesign.
