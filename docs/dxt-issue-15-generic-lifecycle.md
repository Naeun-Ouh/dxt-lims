# Issue #15 — Generic persisted Actual / Measurement lifecycle

## Boundary and retained implementation

Generic persisted Study slugs already reach `CreatedRunGrid` and authoritative PlanningWorkspaceRecord loading. The blocker was `useLifecycleAuthoring` requiring a fixture lifecycle profile; generic Studies have none, so Actual lacked a record callback and Measurement remained disabled.

The production Actual/Measurement path now loads the saved Run, execution state, Measurement state and exact package catalog directly. It does not initialize a missing Run on read, load Target/Evaluation context, or synthesize a fixture profile. Existing known fixture Evaluation behavior remains separate. The shared Engineering Grid, repository ports, version checks, command receipts and authorization boundary are retained.

Saving Actual/Measurement still queries authoritative persisted state before success. Manual input uses the exact Run step's Measurement parameters and point; catalog availability alone does not add a parameter to the entry form. Execution times, Site and coordinates start blank rather than with demonstration values. User-facing failures are actionable KO/EN messages.

Scientific permissions continue to control record callbacks. Read-only users receive an explicit explanation. A process-only Run opens Measurement with a no-plan explanation. Nonparticipants remain N/A rather than Pending/Missing; no participation or condition-resolution semantics changed. No Target or Next Action is required.

## Validation

- Focused generic lifecycle tests: profile-free load, missing Run does not initialize, no reasoning reads, process-only no-catalog path, safe errors, exact step parameter/point selection.
- Existing participation and localization tests retained.
- PostgreSQL contract runs for generic Wafer and Specimen Studies: denied scientific write before explicit grant, Actual save/reload, Measurement save/reload, no Target context, exact pins, immutable raw observations, separately denied validity decisions, unchanged Plan snapshots.
- Native PostgreSQL 18 full contract suite passed on an isolated temporary cluster.
- Full repository suite: 344 tests passed before the final route-only correction; final focused lifecycle/participation/localization checks: 17 passed.
- Final native PostgreSQL 18 contract suite passed, including canonical persisted Study slug roundtrip metadata.
- Final TypeScript and changed-file lint passed. Production build passed.
- Browser agent checks at 1440px: both Specimen and Wafer Actual save/reload; Specimen SUBJECT and Wafer SITE Measurement save/reload; missing timestamps/coordinates have actionable feedback; process-only no-plan explanation; explicit-grant writer and denied read-only KO/EN states. No severe clipping/overflow observed.
- Analysis entry uses exact persisted Study identity rather than route slug. Canonical Study/lifecycle backlinks carry the authorized persisted `series_slug`, without changing saved Analysis identities or permission checks. Browser roundtrip confirmed correct Wafer BCD sources and return to the same Measurement grid.

Agent verification is not Human acceptance. No PR is merged by this task.

## Isolated browser verification

These are AGENT TEST ONLY fixtures, not the preserved PR #12 Human UAT environment. Values are explicit test inputs, not scientific endorsement.

- Writer: `http://127.0.0.1:3245`, principal `bootstrap-reader`, explicit RECORD_ACTUAL and RECORD_MEASUREMENT grants for these Studies.
- Read-only: `http://127.0.0.1:3246`, principal `bootstrap-reasoner`, no scientific write grant for these Studies.
- Specimen process-only: `/series/draft-specimen-draft/runs/1/engineering-grid?view=actual`.
- Specimen Measurement: `/series/draft-specimen-draft/runs/2/engineering-grid?view=measurement`.
- Wafer: replace `draft-specimen-draft` with `draft-wafer-draft`.
- DRAFT-01 applies; DRAFT-02 does not apply. Run 2 contains an explicit Measurement plan and test-only value 12. Run 1 has no Measurement plan. Neither generic Run has Target/Evaluation context.
- Test Actual with explicit timestamps; test Measurement with an explicit test-only value, then reload. Confirm no Plan changes, immutable previous raw observation, no pending count for DRAFT-02, and no record action on the read-only server. Repeat KO/EN.

## Remaining boundaries / P1 dependencies

1. PR #12 remains unmerged pending its required Human UAT. This PR stacks on `codex/issue-11-study-bootstrap` and must be rebased onto main after that gate passes.
2. The pre-existing `effectiveAssignments` last-array-item precedence can cause a later common assignment to supersede an earlier Subject assignment. This task does not change historical Plan/Actual interpretation. Product/Architecture review is required independently.
3. The existing scientific authorization function grants writes to the responsible user, and Study creation assigns the creator as responsible user. This differs from the stated explicit-grants-only direction. A contract assertion documents the existing behavior; this PR does not weaken, expand or repair authorization. Its positive browser principal is a nonowner with explicit grants.
4. Later Target/Evaluation provenance is Issue #16; Sample lifecycle is Issue #9. Neither is implemented here.
5. No validity-editing workflow was added. Existing raw acquisition and validity decision permissions remain separate; record permission alone cannot exclude raw evidence.

## Additional findings

- Analysis previously chose a different Study when passed a generic route slug. This bounded navigation defect is fixed in this PR, including canonical return links.
- Analysis still does not transport/project Operation × Subject applicability; it can label non-applicable Subjects Missing. This is a separate P1 Analysis projection workstream, not a change to acquisition or raw evidence in this PR. End-to-end scientific acceptance is not claimed until that follow-up is verified.
- P2 follow-up: the existing Wafer Measurement overview may show unplanned catalog parameters (for example Chipindex X/Y) as Pending. Entry choices in this PR are restricted to the exact persisted Measurement plan; the broader overview projection remains unchanged.
