# WP-04 — Run judgment, approved D05

Implementation baseline: runtime integration `90d7f94d3ea8fe4e2711265dfe62da1345a7516e`.
Working tree: `codex/phase1-enhancement` (shared isolated enhancement checkout; final commit recorded by parent integration task).

## Runtime changes

- A Run Conclusion is editable/savable without Criteria, an individual Evaluation, a complete Measurement result set, or a rationale. The existing conclusion and configured Next Action model is retained; no new scientific judgment enum is introduced.
- `021_run_judgment_optional_basis.sql` adds storage provenance `CRITERIA_BACKED` / `RUN_ONLY`. Existing rows remain criteria-backed. An explicit CHECK ties the basis to presence/absence of the exact context; historical payloads and their immutability triggers are untouched.
- A separate Run-decision authoring guard checks the same explicit scientific permission resolver, Run lock and interpretation sequence/context. Evaluation's original strict context guard is not relaxed. Decision version CAS, request fingerprint/retry receipts, trusted HTTP attribution, exact evidence references and append-only history remain.
- Criteria-free decisions have no fictitious Evaluation or Target references. New references to a context-free decision are rejected by database triggers. Exact Evaluation references still have to match the same Run and Criteria revision.
- Existing Next Action authoring permission is required both for a proposed action and for replacing a decision that already has an action. Existing configured choices are reused: when no Criteria are adopted, the runtime reads existing same-Study/exact-package catalog choices without adopting any Criteria. If none are configured, no options are fabricated and plain judgment remains available.
- Readback includes null-context judgment history through LEFT JOIN, and current Run-only judgment remains visible. The result selection does not hide the saved Run judgment. Reason is optional in both locales.

## Files

- `src/infrastructure/postgres/postgres-reasoning-repositories.ts`
- `src/infrastructure/postgres/migrations/021_run_judgment_optional_basis.sql`
- `src/application/repository-ports.ts` (nullable provenance basis)
- `src/application/dxt-application.ts` (no-context lifecycle readback/catalog)
- `src/features/run-registration/lifecycle-authoring.ts`
- `src/features/run-registration/evaluation-workflow.ts`
- `src/features/run-registration/evaluation-execution-grid.tsx`
- `src/features/run-registration/judgment-messages.ts`
- `src/features/run-registration/run-criteria-panel.tsx`
- `tests/evaluation-workflow.test.tsx`
- `tests/postgres-run-judgment-contract.ts`
- `tests/run-judgment-native.test.ts`

Parent integration also removes the outer `resolvedBindings.length` rendering gate from `engineering-grid.tsx` and registers migration 021 in shared runners.

## Executed verification

- Focused Evaluation workflow/UI/application regression: **10/10 PASS**, covering no Criteria/results/Evaluation/reason, KO/EN helper text, independent permissions, saved readback, existing Complete/Next Run flows, failure acknowledgments.
- Disposable native **PostgreSQL 18** contract: **1/1 PASS**, with both Wafer and Specimen scenarios. Fresh cluster initialized in a random temporary directory and removed after the test. Existing UAT/live grants and databases were never connected.
- Native assertions: no Criteria/result/Evaluation/rationale persistence; null-context history; exact readback; immutable historical rows; CAS/retry; denial without trusted principal; revoked grant (including retry) denial; forged evidence rejection; stale interpretation conflict; criteria-backed judgment with no individual Evaluation; criteria-free and criteria-backed existing Next Action persistence; denial of unauthorized replacement/removal of prior Next Action.
- Changed-file lint: PASS. TypeScript `--noEmit`: PASS. `git diff --check`: PASS at verification time.
- Browser E2E/layout: **NOT RUN by this work package**, pending integrated application verification. SSR render assertions are not browser acceptance. Human acceptance remains NOT RUN.
- Earlier native attempt failed only because the test used nonexistent grant column `revoked_at`; corrected to the existing `active` grant state, then rerun successfully.

Commands (Node executable must be >=22.13):

```sh
node --input-type=module -e 'import {build} from "esbuild"; await build({entryPoints:["tests/evaluation-workflow.test.tsx"],bundle:true,platform:"node",format:"cjs",outfile:"tmp/wp04/evaluation.test.cjs",alias:{"next/link":"./tests/stubs/next-link.tsx","next/navigation":"./node_modules/vinext/dist/shims/navigation.js"}});'
node --test tmp/wp04/evaluation.test.cjs
node --input-type=module -e 'import {build} from "esbuild"; await build({entryPoints:["tests/run-judgment-native.test.ts"],bundle:true,platform:"node",format:"esm",packages:"external",outfile:"tmp/wp04/native.test.mjs"});'
DXT_TEST_POSTGRES_BIN='/Volumes/Postgres-2.9.7-18/Postgres.app/Contents/Versions/18/bin' node --test tmp/wp04/native.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Node used: `/Users/naeunouh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` v24.22.3.
Logs: `tmp/wp04/evaluation.log`, `tmp/wp04/native.log`, `tmp/wp04/lint.log`, `tmp/wp04/tsc.log` (local generated evidence, not product data).
Migration SHA256: `5e50a09bfff94342afd7ac52fc9d5a44073ad5337acc6759031ae18ac3b9a020`.

## Five-perspective checks

PI: optional criteria/results/rationale no longer impose procedural gates. Architect: same Decision/history model with explicit nullable provenance, not a second Decision entity. Screen: existing workspace/panel/actions reused. UX: KO/EN explains optionality and current saved judgment is independent of result selection. Engineering: native transaction, permission, retry, provenance and negative assertions executed. Integrated browser verification remains a completion gate.

No production migration, merge, existing UAT data mutation or Human acceptance was performed.

## Integrated browser update

Parent browser verification saved and reloaded a criteria-free Specimen Run judgment with no results, Evaluation or rationale in the fresh writer environment. Read-only SQL independently confirmed RUN_ONLY with null criteria context. KO/EN were inspected. See `acceptance-traceability.md` and `evidence/integrated-readback.json`. Human acceptance remains NOT RUN.
