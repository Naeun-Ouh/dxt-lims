# Production Adapter Slice 3 — Measurement

Date: 2026-09-16
Status: complete for the bounded Slice 3 acceptance scope, including native PostgreSQL and real browser authoring/restart proof. This is not a claim of enterprise deployment readiness.

## Ownership and preserved model

The production composition now owns Configuration, Study, Run Plan, Actual Execution and Measurement. The existing frozen `MeasurementExecution → MeasurementDataset → MeasurementValue` model is unchanged. MeasurementRepository owns observations; RunRepository owns the pinned plan; ExecutionRepository owns actual evidence. Analysis v1 is a read projection and has no observation store. Evaluation, Decision, NextAction and SavedAnalysis production adapters remain explicitly unsupported.

The same application service, repository port, PostgreSQL adapter and existing Measurement UI serve Wafer and Specimen. No subject-type or Area-name branch was added to persistence. Manual acquisition requires neither MES nor equipment integration. No Core Domain or frozen UI grammar changes were required.

## Physical implementation

Migration `003_measurement.sql` follows checksum-locked migrations 001 and 002. The explicit migration runner verifies and applies all three in order; re-running is safe.

- `measurement_reference`: immutable exact catalog revision payloads bound to an exact package. Slice 1's descriptor-only configuration hydration did not contain the full Parameter/Unit/Coordinate catalog needed by the frozen authoring service. An explicit provisioning script registers those payloads; production reads never import fixtures or resolve latest.
- `measurement_state`: independent Run-scoped Measurement aggregate version; does not mutate the Run Plan version.
- `measurement_execution` and `measurement_execution_subject`: immutable acquisition metadata and exact RunSubject membership.
- `measurement_dataset`: independently addressable Dataset linked to its MeasurementExecution, Run, exact package/operation and optional existing Actual event. SOURCE/DERIVED origin is retained.
- `measurement_site`: optional subordinate RunSubject site identity. SUBJECT observations create no Site row.
- `measurement_value`: immutable observation with technical UUID keys, stable domain identity, Dataset/RunSubject/package/Parameter/unit references, grain and typed scalar columns. Scalar values are not duplicated in metadata JSON.
- `measurement_coordinate_value`: exact coordinate definition references and coordinate values.
- `measurement_value_lineage`: exact source Value references for existing derived semantics.
- `measurement_summary` and `measurement_summary_source`: existing representative-result identity and exact input references, owned by Measurement rather than Analysis.
- `measurement_validity_decision`: append-only exclusion/restoration history with reason/provenance in the frozen payload.
- `measurement_command_receipt`: unique Run/command identity, request hash, successful version and original result IDs. Receipts store references, not copied scientific values.

UUIDs are relational identities. Wafer IDs, Specimen codes, Site names and UI labels do not become universal PKs. Composite FKs prevent cross-Run Dataset/Subject/Execution membership and cross-Subject Site membership. Application validation additionally checks configuration applicability, exact planned Measurement identity, Actual provenance, value type and coordinate-set membership.

## Grain, units and history

SUBJECT has a null `site_id` and no coordinates. SITE references a Site subordinate to the existing RunSubject and configured coordinate definitions. Position remains separate; no Position/Site mapping or wafer identity resolver exists.

The exact Parameter definition supplies its unit identity; arbitrary UI text cannot change the unit. The package, Parameter, unit and coordinate revisions remain historically addressable. Catalog display order is restored from its stored definition metadata, not revision-ID sorting.

RAW observations use the frozen SOURCE Dataset semantics. DERIVED has distinct Dataset origin and source lineage; it cannot overwrite RAW. Existing derived contracts can be stored, but no calculation/preprocessing workflow was added. Raw corrections require another observation/Dataset or an appended validity decision. Immutable evidence/reference/receipt triggers reject UPDATE/DELETE; the adapter rejects different content under an existing identity. Missing remains missing, including in Analysis; zero is an ordinary observed value.

Validity is projected from ordered decisions (timestamp plus stable insertion order). Exclusion does not delete an observation. Existing summaries remain stored; the Analysis projection does not reuse a summary whose inputs no longer belong to the effective selected set.

## Command transaction and concurrency

`RecordMeasurement` obtains the exact repository catalog, invokes the existing domain authoring service, then saves through the port. The UI awaits completion and preserves its command identity/timestamp for a retry. A separate repository read supplies the displayed result.

One transaction locks the owning Run, checks a persisted receipt first, checks the Measurement expected version, validates existing references and immutable identities, inserts execution/membership, Dataset, optional Sites, batched Values/coordinates/lineage/summaries/validity, advances Measurement state, and commits the receipt. Any failure rolls back every part, including new Site rows and state/receipt changes. Plan and Actual are not rewritten.

An identical retry resolves the original successful version and exact result identities, even after subsequent writes or process restart. Reusing a command ID for a different payload conflicts. Stale writes surface `ApplicationError(CONFLICT)`, not SQL text. The conservative Run-scoped version protects full-record compatibility and validity edits; it is not a mutable version field on each RAW value. Bulk inserts are bounded to 500 rows per statement, not one transaction per cell.

## Reads, Analysis and scale boundary

The port adds exact `getCatalog`, metadata-only `listDatasets` and versioned `getStateByRun` alongside independent `query`. HTTP transport calls DxtApplication; UI components do not access PostgreSQL.

`query` pushes Run, Dataset, Parameter, Subject, Site, coordinate-definition, current validity and Dataset origin filters into parameterized SQL. It uses a repeatable-read transaction and batch hydration of matching parents/coordinates/lineage/summaries, avoiding a per-cell graph fetch. The indexes serve actual access patterns:

- Dataset Run index: discovery by Run.
- Value Dataset/Parameter/RunSubject composite: selected Analysis working context.
- Value Run, Parameter, RunSubject/Parameter: independent repository filters.
- Partial Site index: configured Site observations only.
- Coordinate-definition/Value index: coordinate filter existence checks.
- Validity Value/timestamp/insertion-order index: latest effective decision.

Study, Plan and Actual opening do not load MeasurementValues. Measurement-stage loading is explicit and does not invoke unsupported Evaluation/Decision repositories. Analysis first discovers Dataset metadata and exact catalog context, then queries only the selected observation context through MeasurementRepository. It never receives the command response as scientific data and never copies Values into SavedAnalysis.

Current hard limits: 10,000 Values per command or explicit read, and 1,000 Dataset metadata entries per catalog discovery. Reads request limit+1 and fail explicitly when exceeded, rather than silently truncate. Callers can narrow filters and supply a smaller limit. Cursor pagination, streaming ingestion, per-Dataset mutation commands and large-catalog paging remain future work. The compatibility authoring path still reads its Run's bounded Measurement set; this is not yet a large-ingestion API.

## Automated proof

`tests/postgres-measurement-contract.ts` runs shared behavior against Browser, InMemory and PostgreSQL implementations and verifies immutable values, original-result retries after later validity changes, exclusion/restoration, stale conflicts and exact references. The production contract covers both Subject kinds, configured SITE coordinates, SUBJECT without Site, invalid unit/fake Site rejection, derived lineage, zero versus missing, independent SQL filters and Analysis v1 consumption.

An injected database failure during Value insertion proves zero partial Execution/Dataset/Value/state/receipt commit. A deterministic 1,200-Site Dataset exercises bounded bulk writes (fewer than 40 INSERT calls) and a Site-filtered query that returns one matching Value across the SQL boundary. Over-limit retrieval fails explicitly. This is a design smoke test, not an SLA benchmark.

The native PostgreSQL 18 harness uses node-postgres, restarts PostgreSQL, recreates application/adapters, replays the persisted receipt, and compares Measurement and Analysis output after restart. PGlite integration is additional coverage, not a substitute for this native proof.

Final validation: 237 existing/updated tests (108 domain, 122 workspace, 7 database-compatible integration), native PostgreSQL integration, TypeScript, changed-file lint, both PostgreSQL and browser production builds, and diff whitespace validation. Changed-file lint passes. Repository-wide lint still reports 105 pre-existing errors (84 in domain tests, 21 in existing UI components); these are outside this slice.

## Real UI authoring and restart proof

On 2026-09-16, the existing frozen UI ran at port 3100 with `DXT_REPOSITORY=postgres` against native PostgreSQL 18 (`dxt_slice_verified`, loopback port 55437). Existing production Run Plan and Actual records from Slice 2 were reused. Only exact reference definitions were explicitly provisioned; these observations were not seeded.

1. DTS Improvement Run 19: user-interface manual BCD **17.1 nm**, W01 / PHO7814.01, SITE S01, Chip X=0/Y=0. Command `measurement-1789565346595-bb0umt`; exact execution, Dataset and Value IDs use `:execution`, `:dataset`, `:value` suffixes. Package `config-package-photo-v1`, Parameter `parameter-bcd-v1`, unit `unit-nm`.
2. Adhesion Material Optimization Run 4: user-interface manual Peel Force **5.8 N**, SP-01, SUBJECT, no Site/coordinate. Command `measurement-1789565453341-o9esbj`, the same ID suffix convention. Package `config-package-material-rd-v1`, Parameter `parameter-peel-force-v1`, unit `unit-n`.

Both saves were awaited in Measurement UI. Analyze Measurement opened the existing Analysis Workspace, selected the persisted Dataset/Parameter/Subject, displayed chart/table values and inspected exact source IDs (DXT Manual). The app process was stopped and restarted, creating a new composition/pool/adapters; both Measurement routes and both Analysis routes reopened with the same values and exact provenance. Read-only native SQL independently confirmed two Values, Wafer Site S01 and Specimen null Site. No browser storage, fixture Dataset or InMemory fallback participated. Existing shell mock-environment wording is not the adapter selector.

Review routes (while the local verification server is running):

- `http://localhost:3100/series/dts-improvement/runs/19/engineering-grid?view=measurement`
- `http://localhost:3100/series/adhesion-material-optimization/runs/4/engineering-grid?view=measurement`
- `http://localhost:3100/analysis?study=dts-improvement&runs=19&parameters=parameter-bcd-v1&subjects=PHO7814.01&view=TABLE`
- `http://localhost:3100/analysis?study=adhesion-material-optimization&runs=4&parameters=parameter-peel-force-v1&subjects=SP-01&view=TABLE`

## Implementation file inventory

- PostgreSQL: `migrations/003_measurement.sql`, `postgres-measurement-repository.ts`, `measurement-references.ts`, production repository composition and unsupported-repository guard.
- Application: `repository-ports.ts`, `measurement-record.ts`, `measurement-query.ts`, `dxt-application.ts`, `dxt-application-provider.tsx`; HTTP repository and `app/api/repository/route.ts`; Browser/InMemory contract parity.
- UI integration only: lifecycle authoring state/hook, engineering grid Measurement-stage loading, awaited Measurement save, Analysis repository discovery/query/error handling. Core Domain files were not changed by this slice.
- Operations: `scripts/seed-production-measurement.ts`, ordered migration runner and `db:migrate` package script.
- Tests: Measurement contract, PostgreSQL/native harnesses and downstream unsupported assertion in Run contract.
- Documentation: this report, transition report and physical schema addendum.

## Deferred / known limitations

Configuration reference payload provisioning is explicit bootstrap, not a new Reference Studio authoring flow. No external acquisition integrations or advanced derived pipeline. Historical source preprocessing references are preserved; preprocessing execution itself is not migrated. No SavedAnalysis production persistence; attempting unsupported downstream writes fails explicitly. No Evaluation/Decision/NextAction persistence, evidence binary storage, authentication/authorization, enterprise audit, MES/TAS/RMS/YES, AI or DOE.

Analysis Workspace v2 (grid-first working sets, join/merge/pivot, formulas and chart mapping redesign) remains deferred. Existing Analysis v1 only consumes authoritative persisted Measurement.
