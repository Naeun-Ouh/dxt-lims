# Analysis Operation applicability follow-up to Issue #15

## Problem and bounded change

During isolated agent verification of the generic persisted lifecycle, Measurement correctly showed a non-applied Subject as N/A while Analysis synthesized a Missing row for the same Subject. Analysis received the Subject list but discarded the exact Run's Operation applicability. This was a pre-existing projection gap, not a missing Measurement acquisition.

The Analysis source now carries read-only applicability metadata derived from the exact persisted Run planning snapshot. A selected Dataset is linked to one planned Measurement Operation using all of its planned execution identity, Measurement Operation definition and Measurement Point. Only an unambiguous match can classify an absent observation as N/A. An applicable Subject without evidence remains Missing. The persisted validity model and scientific records are unchanged; a synthetic N/A expectation has no official validity decision.

The table and Inspector show the Operation and Measurement Point. Actual evidence on a non-applied Subject remains visible with its original IDs and official inclusion/exclusion decision, plus the existing out-of-plan annotation. Chart Missing counts exclude N/A expectations. Query-time Subject filtering retains authorized Dataset context even when it returns no values, so selecting only the non-applied Subject does not erase the applicability information.

Repeated parameters are projected separately for their exact selected Operation/Point. Disjoint parameters do not create expectations at unrelated Operations. Unexpected real parameter evidence is preserved. Unknown-scope evidence remains visible; a redundant unscoped synthetic Missing row is suppressed when scoped expectations are already present.

## Preserved boundaries

- No schema, authorization, repository write, readiness, acquisition, official validity or Saved Analysis schema change.
- No new scientific defaults, inferred zeroes, backfill or automatic Target creation.
- Existing Saved Analysis evidence references remain exact; synthetic N/A rows do not invent Dataset/value references.
- Legacy, unplanned, mismatched or ambiguous metadata retains the previous projection behavior. The application does not guess applicability from a parameter name or parse technical IDs.
- If there is no selected Dataset with an exact planned execution identity, this change cannot establish an Operation-specific expectation. It intentionally does not fabricate N/A for that case.
- `Not Participating != Missing` is preserved. Plan and raw evidence remain unchanged.
- The branch is stacked on PR #19, retaining canonical persisted Study slug navigation. It must not be merged ahead of its base or unresolved required acceptance gates.

## Automated evidence

Nine focused regression tests cover both Wafer and Specimen, zero versus Missing versus N/A, split/merge membership, repeated/disjoint parameters and points, unexpected/excluded evidence, Subject-only filtered reads, unknown legacy contexts, Saved Analysis exact references/restoration, and KO/EN table plus chart Missing counts.

Validation on the stacked branch:

- Focused tests: 9/9 PASS.
- Changed-file typed lint: PASS.
- TypeScript: PASS.
- Full repository suite: 354/354 PASS, including all PostgreSQL adapter contracts.
- Production build: PASS. The worktree required the existing ignored local hosting configuration; no tracked configuration change was made.
- `git diff --check`: PASS.
- Browser verification by the coordinating agent: PASS on isolated server 3248 / disposable database 55465. Both generic Wafer (BCD) and Specimen (Peel Force) Runs preserve two D01 observations at value 12, show D02 as N/A / 미적용 in KO and N/A / Not applicable in EN, and show two plotted observations with zero Missing in Bar. Inspector has no fabricated Dataset/result/source references. Canonical Measurement backlinks return the correct Study and parameter context. At 1440 × 1000, document scroll width is 1440 and screenshots show no major table/chart overflow. Browser checks were read-only; screenshots are local agent evidence, not committed scientific data.

These are agent checks, not Human acceptance. Human acceptance remains NOT RUN for this follow-up. No existing UAT data was modified by implementation or tests; no PR was merged.
