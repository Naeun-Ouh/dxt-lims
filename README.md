# DXT LIMS

**A configuration-driven semiconductor R&D experiment intelligence platform.**

DXT LIMS reconstructs experimental work from intended conditions, native Material/Sample records, execution, measurements, evidence, and engineer decisions. It is a reusable platform architecture, not a frontend dependent on an external MLA system.

## Product principles

1. **Stable Core, Flexible Definitions.** Projects, Series, intent, Runs, Materials, Samples, ConditionSets, execution, measurements, evidence, and decisions remain stable. Variable fields are versioned definitions and typed instance values.
2. **Material/Sample as a native structured condition.** DXT LIMS defines, versions, reuses, and traces the material condition selected for ExperimentRuns. The primary semiconductor experimental subject and measurement context remains the wafer.
3. **Full State storage, Delta-based UX.** Each Run has complete intended state. An ExperimentDelta service produces changes for display; historical values are not reconstructed by following a chain of patches.
4. **Configuration over hardcoding.** Labels, units, data types, options, ordering, measurement interpretation, and evaluation choices and criteria belong to reference definitions. Adding a condition does not add a column to ExperimentRun.
5. **Experiment Context as the integration boundary.** A validated, composed context connects native records and actual execution. Future source adapters feed this boundary rather than defining the product's core.
6. **Future AI consumes structured Experiment Context.** AI can eventually consume these explicit identities and values. No AI behavior is implemented.

Humans provide context. DXT LIMS resolves identity. Identity resolution remains a future capability; this slice resolves explicit native IDs and supplied mock execution links.

DXT LIMS remembers how the engineer works. Run inheritance preserves both typed condition values and exact sample revisions.

## Current scope

Only **Experiment Home**, **Experiment Series**, and **Experiment Run** are implemented.

Home → DTS Improvement → Run #4 → Create Next Run demonstrates the experiment vertical slice. The Run canvas shows intent and targets, changed and inherited experiment conditions, execution, curated measurements, evidence, engineer decision, and an inheritance preview. Its optional Sample details disclosure resolves the exact native SampleRevision used as a condition.

Create Next Run is conceptual: it copies the intended condition state and exact SampleRevision references, but saves no Run or usage records. The supporting Sample workspace browses registered material conditions and demonstrates non-persistent registration. Reference Data administration remains deferred.

## Architecture

The system separates three layers:

- **Stable core:** Project, ProjectExperimentRelation, ExperimentSeries, ExperimentIntent, ExperimentRun, Material, MaterialRevision, Sample, SampleRevision, ConditionSet, MaterialUsage, ExecutionEvent, MeasurementSummary, Evidence, and Decision.
- **Reference definitions:** ExperimentTypeDefinition, ConditionDefinition, PropertyDefinition, MeasurementDefinition, EvaluationDefinition, ComponentDefinition, MaterialCategoryDefinition, and UnitDefinition.
- **Instance state:** typed ConditionValue and MaterialCondition records, sample composition/properties, run measurements, decision evaluation values, and explicit usage links.

See [the domain architecture and Mermaid ER diagrams](docs/domain-architecture.md) for attributes, cardinalities, storage assumptions, delta semantics, and boundaries.

### Native Material/Sample

Material is a reusable material-family identity. Sample is the stable identity of a material condition and has no Project or request ownership. SampleRevision is the registered version selected for an experiment. A MaterialNode graph represents raw materials, intermediate blends, and the sample-revision root; MaterialCompositionEdge supplies nested ratios. MaterialPropertyValue attaches descriptive attributes to any node. MaterialUsage pins an exact SampleRevision to a Run, with optional Project context and a Candidate, Reference, Baseline, or Control role.

MaterialCondition is a structured binding inside ConditionSet, referencing MaterialUsage. It never stores a sample code in a scalar condition value. Multiple samples per Run are supported through explicit stable binding keys. Reusing a sample creates additional usage records; it does not change sample identity.

The mock repository supports native sample search, revision history and usage history. Schemas establish the native registration shape. Persistent registration, edits, immutable-write policies, supplier management UI, and history screens are deferred.

### Definitions and values

Every definition has an ID, logical code, version, name, scope, active state, and display order. Scope supports GLOBAL, AREA, TEAM, and USER; non-global scopes carry an owner ID. No authorization or governance workflow is implemented.

Condition definitions add category, data type, unit reference, required/selectable flags, options, and source type. Scalar values are a discriminated union of NUMBER, TEXT, BOOLEAN, and SELECT. Material definitions use SAMPLE_REVISION and NATIVE_SAMPLE, and bind structurally to sample usage.

Instances pin a definition revision by ID. MaterialPropertyValue records a descriptive value, unit, and value type for its material node. It is separate from wafer/process Measurement results. PropertyDefinition declares broad applicable and recommended structural levels. The deterministic material fingerprint remains an internal mock comparison utility; it does not establish scientific identity or enforce revisions.

The native Sample workspace is available at `/samples`, with Sample Detail, Sample Revision Detail, exact experiment usage, and a five-step mock registration flow. The flow demonstrates the domain contract without persisting a record.

The read-only Reference Studio at `/reference` demonstrates how Device, Process, and Material experiment types are represented. Process Experiment includes PHOTO and CMP area configurations, explicit condition scopes and reference value types, operation definitions, and measurement-operation parameter dependencies. See [Reference Studio](docs/reference-studio.md).

The non-persistent Run Planner at `/runs/new` turns those definitions into a six-step engineer workflow for classification, wafer subject, ordered process steps, scoped conditions, measurement planning, and review. It supports both new Runs and inherited next-Run planning. See [Run registration](docs/run-registration.md).

Definition revisions are modeled as immutable records by convention; a future persistence layer must enforce immutability. Definitions may be inactive while remaining resolvable for historical Runs. `required` and recommendation flags are authoring guidance in this read-only slice, not retroactive restrictions on historical data.

### Experiment types

ExperimentSeries references a versioned ExperimentTypeDefinition. A type recommends conditions, measurements, evaluation fields, and evidence types. Definitions determine field ordering; recommended measurement/evaluation fields are prioritized. Additional registered definitions remain valid even if the experiment type does not recommend them. Evidence recommendations are modeled for future authoring; existing evidence is not hidden by a recommendation list.

The existing mixed DTS/CMP seed is categorized as **Process Experiment**. It is not asserted to be a physically validated Photo or CMP specification. Energy and DTS units remain unspecified because the original seed did not establish them; the illustrative mJ example is not retroactively applied to this mixed process seed. A definition can specify a unit when the experiment area establishes it.

### Full state and delta service

`createExperimentDelta(current, previous)` produces `changed`, `unchanged`, `unchangedCount`, `totalCurrentCount`, and `isBaseline`. Each entry carries its MATERIAL or CONDITION kind, label, before/after display values, unit information, revision details, and ADDED/CHANGED/REMOVED/UNCHANGED classification.

Scalar comparison uses scoped definition identity for matching, then pinned definition ID and typed value for equality. Material comparison uses scoped condition definition identity plus binding key, then pinned SampleRevision ID and usage role. Two uses of D035 with different sample revisions are different conditions. Changed definitions/units and removed fields are not silently ignored. No unit conversions, numeric tolerances, or scientific equivalence are inferred.

The three screens consume domain projections. The UI no longer compares raw conditions or treats a material code as identity. Presentation helpers resolve measurement names/units, configured trend interpretation, and configured evaluation labels. Zero-denominator or incompatible measurement comparisons display Not comparable instead of misleading percentages.

## Seed and validation

The original four Runs and curated DTS/BCD/3σ values are preserved. D031 has three registered revisions and D035 has two. D035 Revision 1 is selected by Run #3 and Revision 2 by Run #4. Composition, viscosity, supplier, and request data are explicitly mock additions. Sample revisions are stored once and shared by reference.

Each Run has 14 typed scalar conditions plus one structured material condition. Run #4 changes Energy from 32 to 35 and selects D035 Revision 2 after Run #3 used D035 Revision 1. Measurement and evidence values are mock data; DTS, BCD, and 3σ remain Run-level wafer/process results rather than Sample properties, and the wafer map is explicitly illustrative.

Zod validates entities and discriminated values. The context assembler checks reference resolution, native sample/material relationships, unique concepts and bindings, typed values/options, record ownership, earlier same-series lineage, and unique measurement summaries per layer. Tests cover configuration extension, scoped definitions, revision changes, inheritance isolation, native sample reuse across projects/series, and original deltas/trends.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
npm test
npx tsc --noEmit
npm run build
```

Use the Local URL printed by the server. The app uses TypeScript, React 19, Tailwind 4, shadcn/ui, Zod, and Vinext's Next.js App Router-compatible runtime. The production build targets Cloudflare Workers. No database is configured; stable entity IDs and explicit relation fields are ready for a future persistence adapter, not an implemented Prisma schema.

## Structure

- `src/domain/reference/`: typed reference definitions, scopes, resolution, validation
- `src/domain/material/`: native material/sample identities, revisions, composition, property and usage schemas
- `src/domain/experiment/`: Series/Run, full ConditionSet, context assembly, inheritance and normalized delta
- `src/domain/measurement/`: definition-backed summaries and metric projections
- `src/domain/decision/`: definition-backed evaluation values and presentation
- `src/domain/execution/`, `src/domain/evidence/`: execution context and evidence references
- `src/mock/`: native material data, definitions, instance state and mock repositories
- `src/features/`: the existing three screens, including compact sample disclosure
- `app/`: small route/layout files
- `tests/`: domain regression and configuration-extension checks

## Project, intent and decision verification structure

Project and Experiment are separate domains. ExperimentSeries has no mandatory Project field; ProjectExperimentRelation supplies an optional many-to-many association. The assembled ExperimentContext includes all related Project contexts and remains valid with none.

ExperimentIntent records optional purpose and hypothesis plus zero or more target statements. Targets describe desired outcomes. EvaluationCriterionDefinitions separately configure operational rules against MeasurementDefinitions. Decisions record CriterionAssessments linking each configured rule to the actual MeasurementSummary and supporting Evidence used for a PASS, FAIL or NOT_EVALUATED judgment. Current assessment statuses are mock records; no verification engine calculates them.

The governing principles and maturity path are recorded in the [Product Constitution](docs/product-constitution.md). The detailed distinctions and current ER model are in [Domain Architecture](docs/domain-architecture.md).

## Deferred capabilities

Reference Data administration, Sample Master, native persistent registration/editing, scope governance, full recipe/equipment/operation catalogs, units conversion, a full next-run editor, integrations, wafer resolution, formula building, analysis workspace, defect/admin screens, permissions and AI remain deferred.

Execution identifiers are still supplied mock strings. A shared Run ID connects intended state to execution, but the system does not yet prove that the executed recipe, wafer, material, and measurement match the intended conditions. Measurement summaries are associated with the Run, not an individual wafer or execution event. External synchronization will be optional integration work, never the owner of native Material/Sample identity.

## Authorization pilot

The PostgreSQL server now fails closed without a provisioned development Principal. Apply migrations through 010, explicitly provision the local pilot's Study responsibility/memberships/grants, and start with `DXT_AUTH_PROVIDER=server-development` plus `DXT_DEV_PRINCIPAL=<principal id>` alongside `DXT_REPOSITORY=postgres` and `DATABASE_URL`. Bind to loopback. This is a server-selected development identity, not real login or multi-user authentication. Slice 2 enables capability-checked Actual, Measurement, validity, Evaluation and Decision/NextAction authoring. Configuration and Saved Analysis writes remain disabled.

See [pilot setup](docs/dxt-enterprise-authorization-slice-1-study-run.md) and [scientific authoring policy and limitations](docs/dxt-enterprise-authorization-slice-2-scientific-authoring.md). Browser/demo mode remains separate from protected PostgreSQL resources.
