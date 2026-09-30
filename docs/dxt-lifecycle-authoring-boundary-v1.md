# DXT lifecycle authoring boundary v1

## Boundary

The fresh-Run write path is implemented as commands over the existing lifecycle contracts. The UI calls `LifecycleAuthoringRepository`; it does not own committed lifecycle state. The current repository is browser-backed and is intentionally an infrastructure placeholder.

No DXT Core entity or lifecycle meaning changed. The boundary creates existing Actual execution evidence, `MeasurementExecution`, `MeasurementDataset`, `MeasurementValue`, Engineer Evaluation, Decision, NextAction, and Next Run snapshot records.

## Fresh Run evidence

The acceptance path was exercised in the running product with a newly created DTS Improvement Run #20 that had no downstream records:

1. **Plan — INHERITED / SYSTEM RESOLVED:** Run #20 opened with its complete planning snapshot.
2. **Actual — USER AUTHORED:** CLEAN / W01 was recorded as completed. The Plan snapshot remained byte-for-byte unchanged.
3. **Measurement — USER AUTHORED:** CD-SEM / W01 / BCD = 17.0 nm was recorded manually at `SUBJECT` grain.
4. **Analysis — SYSTEM RESOLVED:** the authored dataset became an Analysis source through its exact dataset and summary references; no values were copied.
5. **Evaluation — USER AUTHORED:** the engineer accepted the W01 result with rationale. Target Achievement remained a calculated projection.
6. **Decision / NextAction — USER AUTHORED:** a concise continuation decision and `Design Next Experiment` action were recorded.
7. **Next Run preview — SYSTEM RESOLVED:** Run #21 preview showed four inherited assignments and one explicit Recipe change.
8. **Next Run — INHERITED + USER CHANGED:** Run #21 was persisted as an independent full Plan snapshot and opened through its dynamic route.

The same command path is covered for Adhesion Material Optimization: Specimen → Mix/Coat/Cure/Test → manual Subject-grain Peel Force/Viscosity result → Evaluation → Decision/NextAction → Next Run. It requires neither Site nor MES/wafer identity. Semiconductor coverage additionally proves optional SITE grain with explicit coordinates.

## Persistence and remaining infrastructure debt

Committed lifecycle state and continuation snapshots survive navigation and refresh through `BrowserLifecycleAuthoringRepository` and the existing Run snapshot storage convention. Replacing browser storage with a production repository, authentication, concurrency control, and durable transactions remains infrastructure work. It does not require another lifecycle semantic.
