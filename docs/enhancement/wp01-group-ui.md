# WP-01 / WP-05 — Operation Group authoring UI

Scope: approved D01–D03 execution design and D08 view-only focus. Implementation stays in transient Run Draft / existing versioned Plan save boundary. No live UAT state, permissions, historical snapshots or production migrations are changed by this UI work.

## Implemented

- Draft promotes its transient contract to `GROUPS_V2` and generates stable Operation instance IDs. Reorder retains identity. An old Operation without design retains historical membership interpretation until the user explicitly selects common mode or adds a group. Absence is not converted to Skip.
- Explicit Base (zero or one) and Split Groups, names, deletion confirmation, scoped condition copy, per-Subject assignment/Skip/Unassigned. Group deletion removes only Group conditions/bindings; Subject exceptions survive and affected members become Unassigned.
- One dense Operation summary per row. A 50-row page and collapsed detail prevent initial 1,000 × 25 condition inputs. Search/manual focus affect view only.
- Scope editor selects Operation common, Group or Subject exception. Effective precedence and role travel together. Empty override inherits; `0` and `false` remain values; invalid nonempty input is not silently replaced by an inherited value. Base is not a parent of Split groups.
- Recipe Source editor uses the exact materialized transient snapshot, stable Operation ID and selected scope. Deleted Operation/Group/Subject bindings are pruned; copying group conditions copies Source selections to new binding identities. Invalid transient choices show an actionable message.
- Persisted `GROUPS_V2` Plans use the same Group editor and existing Save Plan/CAS/permissions/lock path. Existing legacy Plans are not upgraded in place. Scoped edits remain unsaved until Save Plan. Downstream Actual/Measurement views do not see unsaved Plan changes.
- Existing global role toggle opens scoped condition editing for V2 rather than rewriting every Group/Subject role. Plan displays Group names, Skip and Unassigned distinctly.
- Authoritative readiness warnings appear near Create and in review, translated in KO/EN, without disabling READY confirmation. Preview review preserves the distinction between Skip, Unassigned and legacy exclusion and shows selected Group names.
- Criteria-free Run Conclusion is no longer blocked by the outer Engineering Grid's nonempty Evaluation bindings guard (WP-04 integration).

## Files

Core UI: `src/features/experiment-series/run-draft-group-grid.tsx`, `run-draft-group-edit.ts`, `run-draft-warnings.tsx`; `src/features/run-registration/operation-group-editor.tsx`, `plan-operation-design-editor.tsx`, `group-binding-edit.ts`, `group-messages.ts`, `operation-group-editor.css`.

Integration: `run-draft-editor.tsx`, `production-run-entry.tsx`, `run-creation-review.tsx`, `engineering-grid.tsx`.

## Automated evidence

- `tests/group-authoring-ui.test.tsx`: 9 focused tests PASS. Identity and legacy preservation; precedence/blank/zero/false/invalid/role; deletion and retained overrides; group copy; read-only legacy conversion and KO/EN; 1,000 Operations × 25 Subjects with 50 collapsed summaries and fewer than 100 initial inputs; nonblocking translated warnings; exact Source revision copy and binding cleanup; V2 accessible allocation descriptions and new-Subject guidance while preserving legacy copy.
- Existing `tests/run-draft-grid.test.tsx`: 11 tests PASS.
- Changed UI files oxlint: PASS after final type narrowing fix.
- TypeScript checked with a disposable `tmp/tsconfig.wp-ui.json` extending the project configuration and excluding generated `tmp` copies. The unmodified project wildcard otherwise includes isolated browser app copies as duplicate source trees. This is test tooling isolation, not a product configuration change.
- Rendering tests perform no persistence or Human acceptance. Integrated browser verification is owned by the parent workstream and recorded separately.

## Review limits

Actual scientific status and availability remain server authoritative. Client materialization for Source lookup is not an authorization/readiness bypass. New metadata, semantic enum values, permissions and persistence endpoints are not introduced by these components. The stable native PostgreSQL contracts for group persistence, locks and historical compatibility are maintained by the parent implementation workstream.
