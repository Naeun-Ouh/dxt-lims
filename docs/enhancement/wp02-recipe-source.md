# WP02 — Recipe Source exact Sample Revision binding

## Implementation

Recipe Source is a distinct typed association, not a legacy MATERIAL assignment. `src/application/recipe-source.ts` defines exact Recipe revision + Source Parameter revision + Operation/Group/Subject scope, SELECTED/CLEAR, and copy identity mapping. Missing association inherits; explicit CLEAR and denied selections stop inheritance. Subject overrides Group, which overrides Operation.

Reference Studio Definitions contains a collapsed association editor using existing configuration VIEW/AUTHOR_DEFINITION permissions. Registration requires an exact package member, reference-type parameter and Recipe identity explicitly allowed by pinned RECIPE applicability metadata. Arbitrary external references are rejected; labels never infer an association.

`src/infrastructure/postgres/postgres-recipe-sources.ts` reconciles bindings inside the existing authoritative Plan transaction. Explicit removals are audited before Group deletion. Remaining selections synchronize after Group upsert. Run EDIT/CREATE permissions, Plan locks and existing CAS remain authoritative. A hidden Sample selection is redacted and can be preserved unchanged; it is never treated as inheritance or clear. Recipe changes require explicit removal/reselection of incompatible Sources.

Source selections are available in the shared Plan/Run Draft Inspector. Primary condition editing stays in the grid. Selection uses the existing Sample Revision picker; the exact selected revision is persisted. Source usage is included in Sample Detail, with current/historical status and exact Sample revision. Copy creates independent binding identities and preserves exact selected revisions. Existing MATERIAL records are not rewritten or dual-written.

## Schema

Migration `022_recipe_source_bindings.sql` adds an immutable exact association catalog, current scoped selection and append-only history. It depends on migration 019 Group identities and existing Sample Revision persistence. Composite scope foreign keys prevent cross-Run Operation/Subject/Group links; exact descriptor foreign keys pin package/Recipe/Parameter. History survives current selection and Group removal.

SHA-256: `572a09de743d7bb94ee0f8344d0742ba168e31ef7d730f18aaf8ae76d733b1f0`.

## Automated evidence

- `tests/recipe-source.test.ts`: 5/5 PASS — scope precedence/order independence; CLEAR/denied semantics; distinct exact Source slots; invalid duplicates; independent copy identities with exact revisions retained.
- `tests/recipe-source-native.test.ts` → `tests/postgres-recipe-source-contract.ts`: PASS on disposable PostgreSQL 18.7, migrations 001–022, restart persistence.
- PostgreSQL contract covers explicit configuration authorization, rejection of non-Recipe references, two Source Parameters, exact R1/R2 selections, Group override and Subject CLEAR, unchanged-save history deduplication, incompatible Recipe rejection/rollback, denied Sample redaction/preservation, unauthorized changed selection rejection, copy independence, explicit Group removal history, immutable descriptor/history rejection, revoked scientific permission, denied Run visibility, and Plan lock after Actual evidence.
- TypeScript PASS with generated `tmp` browser-copy trees excluded; changed-file lint PASS.
- Evidence logs: `tmp/wp02-validation/unit.log`, `native.log`, `lint.log`, `typecheck.log`.

## Boundaries

All writes in automated validation used newly created disposable PostgreSQL clusters. Existing UAT data and live permissions were not accessed or modified. No production migration, commit, push or merge by this workstream. Browser/Human acceptance is separate and is not established by these contracts. Parent integration owns final browser verification of Definitions → Run Draft/Plan Source picker → Save/Create → reload → Sample usage.

## Integrated browser and independent readback

The parent agent completed the actual Definitions registration → exact Sample R1 picker → Save Plan → reload → Sample usage flow in fresh `agent-integration-SYTWTq` on writer port 51924. A later Sample R2 and explicit R1 → R3 clone did not rewrite the Run's Source R1 selection. Independent `BEGIN READ ONLY` database verification confirms these exact persisted identities and zero Actual events for the tested Runs. Evidence: `docs/enhancement/evidence/integrated-readback.json`. Human acceptance remains NOT RUN.

The evidence retains the original browser source capture time/hashes and explicitly lists eight files differing from the current worktree at readback. These browser observations are not represented as exact-final-head validation. Source API/editor/service files themselves were unchanged relative to that snapshot.

Final application source copies now match commit `2a878b71671035bf677c3e2a0811634822bd22ff` in all three browser servers; see `evidence/final-source-capture.json`. Earlier observation timestamps remain unchanged.
