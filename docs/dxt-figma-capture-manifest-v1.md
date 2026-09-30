# DXT Figma Capture Manifest v1

Authoritative As-Is route/state inventory · inspected 2026-09-26 · localhost:3200.

**Inventory only. No product code, scientific data, configuration, permissions, screenshots or Figma files were changed/created by this task.**

## Scope and counts

- **totalRoutes**: 13
- **normalizedRouteFamilies**: 11
- **productionAndMasterRoutes**: 11
- **visibleLegacyRoutes**: 2
- **totalCaptureFrames**: 152
- **priority**: {"P1": 61, "P3": 39, "P2": 52}
- **domainVariant**: {"GENERIC": 125, "SEMICONDUCTOR VARIANT": 19, "MATERIAL VARIANT": 8}
- **availability**: {"READY": 100, "ROLE_REQUIRED": 14, "FAULT_REQUIRED": 8, "WRITE_REQUIRED": 14, "STATE_REQUIRED": 14, "TRANSIENT": 2}

- Routes count canonical path patterns; three registered static Study routes count separately. Static Run specializations share the dynamic engineering-grid canonical pattern.
- Query tabs, forms, drawers, confirmations, permissions and transient states count as frames, not routes.
- Two still-linked legacy route patterns are included in totalRoutes and clearly labeled.
- Conditional frames remain in totalCaptureFrames; READY is a source/data-backed candidate, not a screenshot or browser-render certification.

The JSON is the machine-readable source; this document is generated from the same inventory. One entry is one proposed Figma frame, including scroll-to-section captures for long screens. The default viewport is 1440 × 1000; use 920 × 789 for the explicitly marked narrow state. Do not duplicate every screen at every width.

## Availability and capture discipline

- **READY**: existing route/data and read-only UI steps support capture. No current screenshot was taken; recheck layout at capture time.
- **ROLE_REQUIRED**: an approved existing role/principal must be supplied. No permission grants or principal switches were performed.
- **STATE_REQUIRED**: implemented visual branch lacks verified current data/state; wait for legitimate data or an approved isolated scenario.
- **WRITE_REQUIRED**: capture only alongside separately authorized real work; never save invented scientific data to obtain a success message.
- **FAULT_REQUIRED**: naturally occurring or approved isolated failure; do not interrupt the shared UAT server.
- **TRANSIENT**: loading state during a read-only preview request.

All conditional frames are explicitly reserved, not claimed ready. Cancel local forms after inspection. Study Setup edits auto-save; opening the picker is safe, selecting/removing items is a write. Scope confirmation may save other pending Plan edits; stop before Confirm. Reference Create Revision/Create Draft/Assemble and sharing Save/Revoke are commands, not preview controls.

## Current data and access

Read-only repository verification was performed against the existing UAT. No browser capture, Figma import or server mutation was performed.

- Verified read-only repository calls: run.list, execution.load, measurement.load, decision.load, analysis.list, measurement.datasets, configuration.load, study.permissions, run.preview.
- All three Study Default previews READY. The current principal can edit setup/Plan and create Runs, but has no configuration author/activation rights.
- PHOTO v1 package is INACTIVE; CMP v1 and Material v1 ACTIVE. There are no draft packages or authored definitions in current configuration response.
- All six existing UAT snapshots list all four subjects in every registered operation; no production split/rejoin capture data is available.
- Five source measurement datasets and one private Saved Analysis were returned. No production derived or excluded-result example was verified.
- `{"study": "dts-improvement", "runs": [19, 20], "runIds": ["run-ea41ef82-bf47-4eb8-8c70-a8888b97d7ff-19", "run-55bbfaa3-5060-4d9e-ada4-e08c9753038a-20"], "subjects": ["PHO7814.01", "PHO7814.02", "PHO7814.03", "PHO7814.04"], "notes": "19 has one execution and BCD SITE evidence; 20 has no execution/evaluation/Decision."}`
- `{"study": "cmp-stability", "runs": [13, 14], "runIds": ["run-09c8cddc-0ee5-406a-af4a-cab5e7e86852-13", "run-7c86bb87-2f1e-447b-bbd2-ebed18a03e19-14"], "subjects": ["RSA6420.01", "RSA6420.02", "RSA6420.03", "RSA6420.04"], "notes": "13 has one execution and PRE/POST thickness datasets; 14 has no execution/Decision."}`
- `{"study": "adhesion-material-optimization", "runs": [4, 5], "runIds": ["run-559045fa-fd86-4222-bab5-39fb0022e91c-4", "run-97666cd1-1229-4f5d-a73f-d0cf364955a4-5"], "subjects": ["SP-01", "SP-02", "SP-03", "SP-04"], "notes": "4 has one execution, Peel Force and Viscosity datasets, evaluation/Decision; 5 has no execution/Decision."}`
- `{"savedAnalysisId": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8", "name": "UAT v1 PHOTO BCD 17.05", "study": "dts-improvement", "run": 19, "datasetIds": ["measurement-1789997153371-6d42jc:dataset"], "visibility": "PRIVATE"}`
- `{"sample": "D031", "revisions": [1, 2, 3], "source": "src/mock/materials.ts", "productionPersistence": false}`

## Canonical route inventory

### home — `/`

Home dashboard · **CANONICAL**

- Entry: Brand/Home
- Source: `app/page.tsx`
- Query contract: `{}`

### study-dts-improvement — `/series/dts-improvement`

Overview / Experiment Setup / Runs · **CANONICAL**

- Entry: Home accessible Studies / Run Study link
- Source: `app/series/dts-improvement/page.tsx`
- Query contract: `{"view": ["overview", "setup", "runs"], "picker": "1; Material also accepts an operation ID", "inspector": "1", "item": "existing selected setup item"}`

### study-cmp-stability — `/series/cmp-stability`

Overview / Experiment Setup / Runs · **CANONICAL**

- Entry: Home accessible Studies / Run Study link
- Source: `app/series/cmp-stability/page.tsx`
- Query contract: `{"view": ["overview", "setup", "runs"], "picker": "1; Material also accepts an operation ID", "inspector": "1", "item": "existing selected setup item"}`

### study-adhesion-material-optimization — `/series/adhesion-material-optimization`

Overview / Experiment Setup / Runs · **CANONICAL**

- Entry: Home accessible Studies / Run Study link
- Source: `app/series/adhesion-material-optimization/page.tsx`
- Query contract: `{"view": ["overview", "setup", "runs"], "picker": "1; Material also accepts an operation ID", "inspector": "1", "item": "existing selected setup item"}`

### creation — `/runs/new`

Source choice and review · **CANONICAL**

- Entry: Study Create Run
- Source: `app/runs/new/page.tsx`
- Query contract: `{"series": ["dts-improvement", "cmp-stability", "adhesion-material-optimization"], "from": "study-default selects STUDY_DEFAULT; other values select PREVIOUS_RUN. Existing/Blank and selected Run ID are local state."}`

### run — `/series/[seriesSlug]/runs/[runNumber]/engineering-grid`

Plan / Actual / Measurement / Evaluation · **CANONICAL**

- Entry: Home Continue / Study Runs
- Source: `app/series/[seriesSlug]/runs/[runNumber]/engineering-grid/page.tsx`
- Query contract: `{"view": ["plan", "actual", "measurement", "evaluation"], "subject": "existing Subject ID (Plan jump)", "action": "preview (Evaluation next action)"}`

### analysis — `/analysis`

Source selection, chart/table, saved context and sharing · **CANONICAL**

- Entry: Run Analyze / Analyze Measurement
- Source: `app/analysis/page.tsx`
- Query contract: `{"study": "registered slug", "runs": "comma-separated Run numbers, not Run IDs", "parameters": "comma-separated exact parameter IDs", "subjects": "comma-separated Subject IDs", "view": ["LINE", "BAR", "SCATTER", "TABLE"], "savedView": "exact existing Saved Analysis ID"}`

### reference — `/reference`

Definitions / Applicability / Package Versions · **CANONICAL**

- Entry: Global Reference Studio navigation
- Source: `app/reference/page.tsx`
- Query contract: `{"section": ["definitions", "applicability", "packages"], "definition": "exact revision ID", "package": "exact package version ID", "preview": "1", "validation": "1", "inspector": "1"}`

### samples — `/samples`

Catalog and local creation wizard · **CANONICAL**

- Entry: Global Samples navigation
- Source: `app/samples/page.tsx`
- Query contract: `{}`

### sample — `/samples/[sampleCode]`

Identity, revision history, usage · **CANONICAL**

- Entry: Samples catalog
- Source: `app/samples/[sampleCode]/page.tsx`
- Query contract: `{}`

### revision — `/samples/[sampleCode]/revisions/[revision]`

Exact material revision and delta · **CANONICAL**

- Entry: Sample revision history
- Source: `app/samples/[sampleCode]/revisions/[revision]/page.tsx`
- Query contract: `{}`

### legacy-run — `/series/dts-improvement/runs/[runId]`

Historical mock detail, only Runs 1–4 · **VISIBLE_LEGACY**

- Entry: Sample detail → Used in experiments
- Source: `app/series/dts-improvement/runs/[runId]/page.tsx`
- Query contract: `{}`

### legacy-prep — `/series/dts-improvement/runs/[runId]/data-preparation`

Local Group / Calculate prototype · **VISIBLE_LEGACY**

- Entry: Historical Run → Prepare Data
- Source: `app/series/dts-improvement/runs/[runId]/data-preparation/page.tsx`
- Query contract: `{}`

## Excluded aliases and obsolete routes

- `/api/repository`: API endpoint, not a user-facing screen.
- `/series/dts-improvement/analysis`: Same Analysis Workspace with initial Study context; canonical capture /analysis?study=dts-improvement.
- `/series/dts-improvement/runs/18/workspace`: PostgreSQL mode redirects to engineering-grid; no separate production screen.
- `/series/cmp-stability/runs/12/workspace`: PostgreSQL mode redirects to engineering-grid; no separate production screen.
- `/reference/conditions/[conditionCode]`: Legacy detail family has no incoming link from current Reference Studio/navigation; only linked within orphan legacy reference pages.
- `/reference/measurement-operations/[operationCode]`: Orphan legacy detail family; no current navigation entry.
- `/reference/experiment-types/[typeCode]/areas/[areaCode]`: Orphan legacy reference family; no current navigation entry.
- `Static engineering-grid files for DTS18/19, CMP12/13, Material3/4`: Same canonical engineering-grid route family; mock 18/12/3 are not populated production UAT candidates.

## No fictional screens

- SSO/login/logout/account switch or enterprise identity administration
- Standalone Authorization administration or Study sharing UI
- Standalone Reference Reasoning Readiness route (readiness belongs to Study Setup)
- Standalone Decision route or Run Review route (inline/local state)
- Compare workspace (disabled tab)
- Analysis cross-Study selection authoring (current UI selects one Study)
- New Study creation or Study title/intent editing screen; only three registered Study entry routes (study.edit API is not an exposed authoring screen)
- Separate equipment/recipe master routes or automatic Position-to-Site mapping

## Domain deduplication

Home, creation-source controls, access errors, generic inspectors, saved-view/sharing and configuration lifecycle layouts are captured once. Wafer versus Specimen Plan/Setup/Actual/Measurement/Evaluation and result contexts are kept where headings, grain, fields, operation types or units materially differ. CMP adds one Plan and one PRE/POST Measurement view; it is not an Area switch in a Run. Sample Master is generic material-condition infrastructure, not the Material experiment subject.

## Figma organization

Use the exact `frameName` from each entry: `[Area] / [Screen] / [State]`. Put linked mock/history frames on a separate **Legacy — still visible** page. Keep the capture ID in the frame description so later renames remain traceable. Labels containing Wafer, Specimen, CMP or PHOTO distinguish only meaningful variants. Do not beautify defects before recording As-Is.

## Capture entries

### home-populated — Home / Dashboard / Populated

- **Group / Screen:** Home / Dashboard
- **Route:** `/`
- **Query parameters:** `{}`
- **Open:** [Dashboard](http://localhost:3200/)
- **Domain / State / Priority:** GENERIC / POPULATED / P1
- **Study / Run:** — / —
- **Purpose:** Continue Working, compact metrics, September activity Gantt, recent Runs and accessible Studies in one generic capture.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/experiment-home/production-home.tsx`

### home-empty — Home / Dashboard / Empty

- **Group / Screen:** Home / Dashboard
- **Route:** `/`
- **Query parameters:** `{}`
- **Open:** [Dashboard](http://localhost:3200/)
- **Domain / State / Priority:** GENERIC / EMPTY / P3
- **Study / Run:** — / —
- **Purpose:** No personal work and permission-filtered empty discovery.
- **Preparation:** Use an existing approved principal with no personal/accessible work; no fabricated Studies.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/experiment-home/production-home.tsx`

### home-error — Home / Dashboard / Error

- **Group / Screen:** Home / Dashboard
- **Route:** `/`
- **Query parameters:** `{}`
- **Open:** [Dashboard](http://localhost:3200/)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** — / —
- **Purpose:** Repository or access-unavailable landing message.
- **Preparation:** Requires a naturally occurring or approved isolated failure; do not stop the shared server.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `app/page.tsx`

### study-overview — Study / Overview / Populated

- **Group / Screen:** Study / Overview
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "overview"}`
- **Open:** [Overview](http://localhost:3200/series/dts-improvement?view=overview)
- **Domain / State / Priority:** GENERIC / POPULATED / P1
- **Study / Run:** dts-improvement / —
- **Purpose:** Study intent, targets and Run entry navigation.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### study-runs — Study / Runs / Populated

- **Group / Screen:** Study / Runs
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "runs"}`
- **Open:** [Runs](http://localhost:3200/series/dts-improvement?view=runs)
- **Domain / State / Priority:** GENERIC / POPULATED / P1
- **Study / Run:** dts-improvement / —
- **Purpose:** Persisted Run list, lifecycle stages and continuation links.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-wafer — Study / Setup Wafer / Editable

- **Group / Screen:** Study / Setup Wafer
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Setup Wafer](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / EDITABLE / P1
- **Study / Run:** dts-improvement / —
- **Purpose:** Operation-based default conditions and wafer vocabulary.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-specimen — Study / Setup Specimen / Editable

- **Group / Screen:** Study / Setup Specimen
- **Route:** `/series/adhesion-material-optimization`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Setup Specimen](http://localhost:3200/series/adhesion-material-optimization?view=setup)
- **Domain / State / Priority:** MATERIAL VARIANT / EDITABLE / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Specimen defaults: MIX, COAT, CURE, TEST and formulation.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-picker — Study / Setup Picker / Open

- **Group / Screen:** Study / Setup Picker
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup", "picker": "1"}`
- **Open:** [Setup Picker](http://localhost:3200/series/dts-improvement?view=setup&picker=1)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / —
- **Purpose:** Applicable Reference items with already-added indicators.
- **Preparation:** Open Add Item for EXPOSURE; do not select an item.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-inspector — Study / Setup Inspector / Open

- **Group / Screen:** Study / Setup Inspector
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup", "inspector": "1"}`
- **Open:** [Setup Inspector](http://localhost:3200/series/dts-improvement?view=setup&inspector=1)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / —
- **Purpose:** Default item definition, applicability and exact provenance.
- **Preparation:** Select an existing item and open Details.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-readonly — Study / Setup / Read Only

- **Group / Screen:** Study / Setup
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Setup](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P3
- **Study / Run:** dts-improvement / —
- **Purpose:** Study reader cannot change defaults.
- **Preparation:** Use an approved existing Study reader. Disabled fieldset also affects inspection in current UI.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-saving — Study / Setup / Saving

- **Group / Screen:** Study / Setup
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Setup](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / SAVING / P3
- **Study / Run:** dts-improvement / —
- **Purpose:** Autosave progress for default changes.
- **Preparation:** Only during a separately approved real setup edit; capture in-flight state.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-saved — Study / Setup / Saved

- **Group / Screen:** Study / Setup
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Setup](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / SAVED / P2
- **Study / Run:** dts-improvement / —
- **Purpose:** Autosave completion notice.
- **Preparation:** Only following a separately approved real setup edit.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### setup-error — Study / Setup / Error

- **Group / Screen:** Study / Setup
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Setup](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** dts-improvement / —
- **Purpose:** Setup load or save error notice.
- **Preparation:** Use a naturally occurring or approved isolated failure; never corrupt the UAT setup.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### readiness-ready — Study / Reasoning Readiness / Ready

- **Group / Screen:** Study / Reasoning Readiness
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Reasoning Readiness](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / READY / P1
- **Study / Run:** dts-improvement / —
- **Purpose:** Confirmed exact evaluation and next-action context for the selected package.
- **Preparation:** Scroll to Lifecycle readiness and show the exact immutable context ID.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/study-readiness-panel.tsx`

### readiness-proposal — Study / Reasoning Readiness / Proposal

- **Group / Screen:** Study / Reasoning Readiness
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Reasoning Readiness](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / PROPOSAL / P2
- **Study / Run:** dts-improvement / —
- **Purpose:** Existing proposal source and exact reasoning references before confirmation.
- **Preparation:** Open the source/proposal section and expand its exact references. Do not Confirm.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/experiment-series/study-readiness-panel.tsx`
- **As-Is note:** All three current Study Default previews are READY; no missing-readiness state was created.

### readiness-missing — Study / Reasoning Readiness / Not Ready

- **Group / Screen:** Study / Reasoning Readiness
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "setup"}`
- **Open:** [Reasoning Readiness](http://localhost:3200/series/dts-improvement?view=setup)
- **Domain / State / Priority:** GENERIC / NOT_READY / P3
- **Study / Run:** dts-improvement / —
- **Purpose:** Missing reasoning and blocked Run creation.
- **Preparation:** Requires an existing legitimate unready setup/package; none verified in this UAT.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/experiment-series/study-readiness-panel.tsx`

### create-study-default — Creation / Source / Study Default

- **Group / Screen:** Creation / Source
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Source](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / STUDY_DEFAULT / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Distinct inheritance source and source-specific controls.
- **Preparation:** Open the route; leave Study Default selected.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-previous — Creation / Source / Previous Run

- **Group / Screen:** Creation / Source
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Source](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / PREVIOUS_RUN / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Distinct inheritance source and source-specific controls.
- **Preparation:** Select Previous Run. It resolves the latest persisted Run (currently Material 5), not an invented URL from=4 pin.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-existing — Creation / Source / Existing Run

- **Group / Screen:** Creation / Source
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Source](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / EXISTING_RUN / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Distinct inheritance source and source-specific controls.
- **Preparation:** Select Existing Run and choose Material Run 4.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-blank — Creation / Source / Blank

- **Group / Screen:** Creation / Source
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Source](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / BLANK / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Distinct inheritance source and source-specific controls.
- **Preparation:** Select Blank; do not create a Run.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-review — Creation / Review / Preview

- **Group / Screen:** Creation / Review
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Review](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / PREVIEW / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Server-resolved exact package, subjects, operations, assignments and readiness.
- **Preparation:** Choose Existing Run 4, click Review Inheritance and expand Review exact inherited values. Stop before Create Run.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-blank-review — Creation / Blank Review / Empty

- **Group / Screen:** Creation / Blank Review
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Blank Review](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / EMPTY / P1
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Blank inheritance preview with no Operations/variables/Measurement plan.
- **Preparation:** Select Blank then Review Inheritance. Do not create an unusable empty Run for a screenshot.
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-invalid — Creation / Source / Invalid

- **Group / Screen:** Creation / Source
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Source](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / INVALID / P3
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Missing existing-source selection error.
- **Preparation:** Select Existing Run with no selection, then Review Inheritance (read-only preview).
- **Availability:** READY
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-not-ready — Creation / Review / Not Ready

- **Group / Screen:** Creation / Review
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Review](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / NOT_READY / P3
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Creation disabled and link back to Setup when reasoning is missing.
- **Preparation:** Use an existing legitimate unready setup; none currently verified.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### create-busy — Creation / Review / Loading

- **Group / Screen:** Creation / Review
- **Route:** `/runs/new`
- **Query parameters:** `{"series": "adhesion-material-optimization", "from": "study-default"}`
- **Open:** [Review](http://localhost:3200/runs/new?series=adhesion-material-optimization&from=study-default)
- **Domain / State / Priority:** GENERIC / LOADING / P3
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Disabled source/review controls while server preview resolves.
- **Preparation:** Capture during read-only Review Inheritance request using browser network throttling if needed.
- **Availability:** TRANSIENT
- **Evidence:** `src/features/experiment-series/production-run-entry.tsx`

### plan-wafer — Run / Plan Wafer / Editable

- **Group / Screen:** Run / Plan Wafer
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan Wafer](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / EDITABLE / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Existing independent Plan; domain-specific Operations, references, units and Subject headings.
- **Preparation:** Expand a configured Operation; show FIXED / VARIED rows.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-specimen — Run / Plan Specimen / Editable

- **Group / Screen:** Run / Plan Specimen
- **Route:** `/series/adhesion-material-optimization/runs/5/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan Specimen](http://localhost:3200/series/adhesion-material-optimization/runs/5/engineering-grid?view=plan)
- **Domain / State / Priority:** MATERIAL VARIANT / EDITABLE / P1
- **Study / Run:** adhesion-material-optimization / 5
- **Purpose:** Existing independent Plan; domain-specific Operations, references, units and Subject headings.
- **Preparation:** Expand a configured Operation; show FIXED / VARIED rows.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-cmp — Run / Plan Cmp / Editable

- **Group / Screen:** Run / Plan Cmp
- **Route:** `/series/cmp-stability/runs/14/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan Cmp](http://localhost:3200/series/cmp-stability/runs/14/engineering-grid?view=plan)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / EDITABLE / P1
- **Study / Run:** cmp-stability / 14
- **Purpose:** Existing independent Plan; domain-specific Operations, references, units and Subject headings.
- **Preparation:** Expand a configured Operation; show FIXED / VARIED rows.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-locked — Run / Plan / Locked

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / LOCKED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Original Plan protected once execution evidence exists; Focus remains view-only.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-collapsed — Run / Plan / Collapsed

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / COLLAPSED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Compact Operation backbone.
- **Preparation:** Collapse Operation rows.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-key-columns — Run / Plan / Compact Keys

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / COMPACT_KEYS / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** More horizontal room for subject values.
- **Preparation:** Click Collapse key columns.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-details — Run / Plan Inspector / Open

- **Group / Screen:** Run / Plan Inspector
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan Inspector](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Definition, provenance and deeper context.
- **Preparation:** Select an existing variable cell, then Details.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-focus — Run / Focus Range / Selecting

- **Group / Screen:** Run / Focus Range
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Focus Range](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / SELECTING / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** View-only focus range, separate from saved experiment scope.
- **Preparation:** Click Select focus range and select existing Operations. Do not alter participation.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-focus-applied — Run / Plan / Focused

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / FOCUSED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Only the chosen view-focus Operations.
- **Preparation:** Apply a focus range over existing Operations. This is view state only.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-full — Run / Plan / Full History

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / FULL_HISTORY / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** All registered Operations rather than focused/experiment-only projection.
- **Preparation:** Choose the Full History/all-registered option in Projection.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-varied — Run / Plan / Varied

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / VARIED / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Varied-only filter and experimental intent markers.
- **Preparation:** Choose the Varied filter.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-changed — Run / Plan / Changed

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / CHANGED / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Changed-only filter against inherited Plan.
- **Preparation:** Choose Changed; if no inherited delta is visible, leave this conditional rather than inventing changes.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-selection — Run / Plan / Range Selected

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / RANGE_SELECTED / P2
- **Study / Run:** dts-improvement / 20
- **Purpose:** Spreadsheet multi-cell highlight and keyboard interaction.
- **Preparation:** Select existing variable cells using Shift selection without typing.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-dirty — Run / Plan / Unsaved

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / UNSAVED / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Pending Plan edit and enabled Save Plan.
- **Preparation:** Capture only during a separately authorized real Plan edit; do not invent experimental values.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-invalid — Run / Plan / Invalid

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / INVALID / P3
- **Study / Run:** dts-improvement / 20
- **Purpose:** Cell validation and disabled save.
- **Preparation:** Only in an approved disposable editing session clear a required cell; never save invalid values.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-saving — Run / Plan / Saving

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / SAVING / P3
- **Study / Run:** dts-improvement / 20
- **Purpose:** Plan persistence progress.
- **Preparation:** Capture during a separately authorized real Save Plan.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-saved — Run / Plan / Saved

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / SAVED / P2
- **Study / Run:** dts-improvement / 20
- **Purpose:** Saved Plan feedback.
- **Preparation:** Capture after a separately authorized real Save Plan.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### scope-backbone — Run / Scope / Selecting

- **Group / Screen:** Run / Scope
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Scope](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / SELECTING / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Strict compact scope mode without variable editors or Inspector.
- **Preparation:** Click Define experiment scope. Stop before confirmation.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### scope-range — Run / Scope / Range Selected

- **Group / Screen:** Run / Scope
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Scope](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / RANGE_SELECTED / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Selected range count and Continue/Cancel.
- **Preparation:** Drag across existing Operations; leave Continue visible.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### scope-subjects — Run / Scope / Confirmation

- **Group / Screen:** Run / Scope
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Scope](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / CONFIRMATION / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Reachable contextual confirmation with Operation range and selected Subjects.
- **Preparation:** Continue after selecting an existing range. Do not Confirm Experiment Scope.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### scope-change-subjects — Run / Scope / Subject Picker

- **Group / Screen:** Run / Scope
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Scope](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / SUBJECT_PICKER / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Subject assignment controls inside scope confirmation.
- **Preparation:** In confirmation click Change; retain original selections. Cancel afterwards.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### plan-participation — Run / Plan / Non Participant

- **Group / Screen:** Run / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / NON_PARTICIPANT / P2
- **Study / Run:** dts-improvement / 20
- **Purpose:** N/A differs from missing values; split/rejoin participation matrix.
- **Preparation:** No partial-participation UAT Run currently exists. Wait for real data; do not change participation for capture.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/run-registration/engineering-grid.tsx`

### actual-wafer — Actual / Execution Wafer / Populated

- **Group / Screen:** Actual / Execution Wafer
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Execution Wafer](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / POPULATED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Actual record entry and stored execution alongside unrecorded subjects.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-specimen — Actual / Execution Specimen / Populated

- **Group / Screen:** Actual / Execution Specimen
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Execution Specimen](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=actual)
- **Domain / State / Priority:** MATERIAL VARIANT / POPULATED / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Actual record entry and stored execution alongside unrecorded subjects.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-empty — Actual / Execution / Empty

- **Group / Screen:** Actual / Execution
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Execution](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / EMPTY / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Existing next Run with no recorded execution; no synthetic evidence.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-override — Actual / Entry / Override Selected

- **Group / Screen:** Actual / Entry
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Entry](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / OVERRIDE_SELECTED / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Difference-from-plan entry field for an existing planned variable.
- **Preparation:** Choose an existing override variable; leave value unchanged and do not Save Actual.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-deviations — Actual / Execution / Deviation Filter

- **Group / Screen:** Actual / Execution
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Execution](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / DEVIATION_FILTER / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Only values differing from Plan; an empty result is valid if no deviations exist.
- **Preparation:** Choose Differs from plan/Deviations filter.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-missing — Actual / Execution / Missing

- **Group / Screen:** Actual / Execution
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Execution](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / MISSING / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Not recorded filter and missing evidence cells.
- **Preparation:** Choose Not recorded/Missing filter.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-details — Actual / Inspector / Open

- **Group / Screen:** Actual / Inspector
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Inspector](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Exact execution evidence and Plan comparison for selected Operation/Subject.
- **Preparation:** Select a recorded cell, then Details.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-saving — Actual / Entry / Saving

- **Group / Screen:** Actual / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / SAVING / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Save Actual busy state.
- **Preparation:** Capture only during separately authorized actual evidence entry.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-saved — Actual / Entry / Saved

- **Group / Screen:** Actual / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / SAVED / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Actual save confirmation and record visible in grid.
- **Preparation:** Capture after separately authorized actual evidence entry.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### actual-invalid — Actual / Entry / Error

- **Group / Screen:** Actual / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Rejected execution input or save failure notice.
- **Preparation:** Use a naturally occurring validation failure or approved isolated error; do not record fabricated execution.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/run-registration/actual-execution-grid.tsx`

### measurement-wafer — Measurement / Results Wafer / Populated

- **Group / Screen:** Measurement / Results Wafer
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Results Wafer](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / POPULATED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Wafer/site, specimen/subject, or CMP PRE/POST evidence; includes existing Analyze entry.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-specimen — Measurement / Results Specimen / Populated

- **Group / Screen:** Measurement / Results Specimen
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Results Specimen](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=measurement)
- **Domain / State / Priority:** MATERIAL VARIANT / POPULATED / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Wafer/site, specimen/subject, or CMP PRE/POST evidence; includes existing Analyze entry.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-cmp — Measurement / Results Cmp / Populated

- **Group / Screen:** Measurement / Results Cmp
- **Route:** `/series/cmp-stability/runs/13/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Results Cmp](http://localhost:3200/series/cmp-stability/runs/13/engineering-grid?view=measurement)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / POPULATED / P1
- **Study / Run:** cmp-stability / 13
- **Purpose:** Wafer/site, specimen/subject, or CMP PRE/POST evidence; includes existing Analyze entry.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-site-entry — Measurement / Entry / Site

- **Group / Screen:** Measurement / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SITE / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Wafer SITE input with site identity and coordinate controls.
- **Preparation:** Choose SITE grain in entry form; do not save.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-subject-entry — Measurement / Entry / Subject

- **Group / Screen:** Measurement / Entry
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Entry](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=measurement)
- **Domain / State / Priority:** MATERIAL VARIANT / SUBJECT / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Material SUBJECT-only measurement form, distinct from Sample properties.
- **Preparation:** Inspect entry fields with existing Specimen context; do not save.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-sites — Measurement / Site Detail / Selected

- **Group / Screen:** Measurement / Site Detail
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Site Detail](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SELECTED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Raw site result, coordinates and validity beneath selected representative result.
- **Preparation:** Select PHO7814.01 BCD and reveal Site Detail.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-inspector — Measurement / Inspector / Open

- **Group / Screen:** Measurement / Inspector
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Inspector](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Exact dataset, measurement execution and representative lineage.
- **Preparation:** Select populated result and click Details.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-empty — Measurement / Results / Empty

- **Group / Screen:** Measurement / Results
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Results](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / EMPTY / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Existing next Run without observations or Analyze entry.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-excluded — Measurement / Site Detail / Excluded

- **Group / Screen:** Measurement / Site Detail
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Site Detail](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / EXCLUDED / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Excluded raw observation with reason remains traceable.
- **Preparation:** Requires an existing excluded observation. None verified in production UAT; do not exclude one for a screenshot.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-saving — Measurement / Entry / Saving

- **Group / Screen:** Measurement / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / SAVING / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Measurement save progress.
- **Preparation:** Capture only during separately authorized real measurement entry.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-saved — Measurement / Entry / Saved

- **Group / Screen:** Measurement / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / SAVED / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Saved measurement feedback.
- **Preparation:** Capture only after separately authorized real measurement entry.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### measurement-invalid — Measurement / Entry / Error

- **Group / Screen:** Measurement / Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Missing/invalid value or persistence error feedback.
- **Preparation:** Use approved non-committing validation/fault session; do not create observations.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/run-registration/measurement-execution-grid.tsx`

### evaluation-wafer — Evaluation / Assessment Wafer / Populated

- **Group / Screen:** Evaluation / Assessment Wafer
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Assessment Wafer](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / POPULATED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Computed achievement, engineer judgment, Decision and Next Action on existing results.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-specimen — Evaluation / Assessment Specimen / Populated

- **Group / Screen:** Evaluation / Assessment Specimen
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Assessment Specimen](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=evaluation)
- **Domain / State / Priority:** MATERIAL VARIANT / POPULATED / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Computed achievement, engineer judgment, Decision and Next Action on existing results.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-missing — Evaluation / Assessment / Missing

- **Group / Screen:** Evaluation / Assessment
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Assessment](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / MISSING / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Select a subject with no result; missing achievement is not a judgment.
- **Preparation:** Select PHO7814.02.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-unreviewed — Evaluation / Assessment / Not Reviewed

- **Group / Screen:** Evaluation / Assessment
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Assessment](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / NOT_REVIEWED / P1
- **Study / Run:** dts-improvement / 20
- **Purpose:** Existing next Run without engineer evaluation or Decision.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-details — Evaluation / Inspector / Open

- **Group / Screen:** Evaluation / Inspector
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Inspector](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Exact target/result references and independent engineer reasoning.
- **Preparation:** Select an assessment then Details.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-authoring — Evaluation / Decision Entry / Editable

- **Group / Screen:** Evaluation / Decision Entry
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Decision Entry](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / EDITABLE / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Judgment, rationale, Decision and Next Action entry including save buttons.
- **Preparation:** Show authoring panels; do not change or save values.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-action-type — Evaluation / Decision Entry / Action Changed

- **Group / Screen:** Evaluation / Decision Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Decision Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / ACTION_CHANGED / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Conditional fields for next-experiment versus another available next-action type.
- **Preparation:** Select an existing alternative Next Action type locally; do not save.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-preview — Evaluation / Next Run / Preview

- **Group / Screen:** Evaluation / Next Run
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation", "action": "preview"}`
- **Open:** [Next Run](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation&action=preview)
- **Domain / State / Priority:** GENERIC / PREVIEW / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Inherited setup and intended changes from the existing Decision.
- **Preparation:** Click Preview Next Run; stop before Create.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-created — Evaluation / Next Run / Created

- **Group / Screen:** Evaluation / Next Run
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Next Run](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / CREATED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Successful next-run continuation link.
- **Preparation:** Capture only after a separately authorized real next-run creation; existing Run 20 is evidence, not replay permission.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-saving — Evaluation / Decision Entry / Saving

- **Group / Screen:** Evaluation / Decision Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Decision Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / SAVING / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Independent evaluation/decision persistence feedback.
- **Preparation:** Capture during a separately authorized real save.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-error — Evaluation / Decision Entry / Error

- **Group / Screen:** Evaluation / Decision Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Decision Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Evaluation/Decision or next-run creation failure notice.
- **Preparation:** Use naturally occurring or approved isolated fault.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### evaluation-narrow — Evaluation / Decision Entry / Narrow Layout

- **Group / Screen:** Evaluation / Decision Entry
- **Route:** `/series/adhesion-material-optimization/runs/4/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Decision Entry](http://localhost:3200/series/adhesion-material-optimization/runs/4/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / NARROW_LAYOUT / P2
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** 920px wrapping and Save Decision action from reported UX issue.
- **Preparation:** Use 920 × 789 viewport and scroll to Decision entry; preserve As-Is appearance.
- **Availability:** READY
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### analysis-default — Analysis / Workspace / Default

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{}`
- **Open:** [Workspace](http://localhost:3200/analysis)
- **Domain / State / Priority:** GENERIC / DEFAULT / P1
- **Study / Run:** — / —
- **Purpose:** Actual default selection and available saved cards; do not assume default is a separate route.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-wafer — Analysis / Workspace Wafer / Selected Data

- **Group / Screen:** Analysis / Workspace Wafer
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19"}`
- **Open:** [Workspace Wafer](http://localhost:3200/analysis?study=dts-improvement&runs=19)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SELECTED_DATA / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Existing BCD source and wafer/site-aware result context.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-specimen — Analysis / Workspace Specimen / Selected Data

- **Group / Screen:** Analysis / Workspace Specimen
- **Route:** `/analysis`
- **Query parameters:** `{"study": "adhesion-material-optimization", "runs": "4"}`
- **Open:** [Workspace Specimen](http://localhost:3200/analysis?study=adhesion-material-optimization&runs=4)
- **Domain / State / Priority:** MATERIAL VARIANT / SELECTED_DATA / P1
- **Study / Run:** adhesion-material-optimization / 4
- **Purpose:** Existing Peel Force/Viscosity subject results with material units.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-filters — Analysis / Selection / Open

- **Group / Screen:** Analysis / Selection
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19"}`
- **Open:** [Selection](http://localhost:3200/analysis?study=dts-improvement&runs=19)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Expanded Dataset/Parameter/Subject checkbox panel.
- **Preparation:** Open one filter popover with existing selections.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-table — Analysis / Workspace / Table

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "view": "TABLE"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19&view=TABLE)
- **Domain / State / Priority:** GENERIC / TABLE / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Table-only result presentation.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-bar — Analysis / Workspace / Bar

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "view": "BAR"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19&view=BAR)
- **Domain / State / Priority:** GENERIC / BAR / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Bar visualization over the same existing results.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-scatter — Analysis / Workspace / Scatter

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "view": "SCATTER"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19&view=SCATTER)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SCATTER / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Coordinate-aware scatter for existing SITE observation.
- **Preparation:** Select RAW aggregation and an available coordinate axis.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-details — Analysis / Inspector / Open

- **Group / Screen:** Analysis / Inspector
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19"}`
- **Open:** [Inspector](http://localhost:3200/analysis?study=dts-improvement&runs=19)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Read-only exact result/source provenance.
- **Preparation:** Inspect the existing PHO7814.01 BCD row.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-empty — Analysis / Workspace / Empty

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19)
- **Domain / State / Priority:** GENERIC / EMPTY / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** No matching results without adding data.
- **Preparation:** Uncheck all datasets or use a nonmatching local text filter.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-save — Analysis / Save View / Open

- **Group / Screen:** Analysis / Save View
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19"}`
- **Open:** [Save View](http://localhost:3200/analysis?study=dts-improvement&runs=19)
- **Domain / State / Priority:** GENERIC / OPEN / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Name entry and exact-reference save contract.
- **Preparation:** Click Save View; leave name blank; close without saving.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-saved — Analysis / Workspace / Saved

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19&savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / SAVED / P1
- **Study / Run:** dts-improvement / 19
- **Purpose:** Reopened existing exact saved context.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-update — Analysis / Save View / Update

- **Group / Screen:** Analysis / Save View
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Save View](http://localhost:3200/analysis?study=dts-improvement&runs=19&savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / UPDATE / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Edit existing saved view configuration without duplicating measurements.
- **Preparation:** Open existing saved view then Update Saved View; cancel.
- **Availability:** READY
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-sharing — Analysis / Sharing / Open

- **Group / Screen:** Analysis / Sharing
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Sharing](http://localhost:3200/analysis?study=dts-improvement&runs=19&savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Visibility, recipient-type and explicit audience controls.
- **Preparation:** Open existing saved view then Manage sharing; do not add/save/revoke recipients.
- **Availability:** READY
- **Evidence:** `src/features/analysis/sharing-control.tsx`

### analysis-shared-reader — Analysis / Sharing / Read Only

- **Group / Screen:** Analysis / Sharing
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Sharing](http://localhost:3200/analysis?study=dts-improvement&runs=19&savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Audience reader can inspect but cannot update/share.
- **Preparation:** Use an existing approved audience reader with access to all underlying sources.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-unresolved — Analysis / Workspace / Unresolved

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19&savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / UNRESOLVED / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Exact saved source missing; no substitution.
- **Preparation:** Requires an existing unresolved saved context. Do not delete or revoke sources to fabricate it.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-saving — Analysis / Save View / Saving

- **Group / Screen:** Analysis / Save View
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19"}`
- **Open:** [Save View](http://localhost:3200/analysis?study=dts-improvement&runs=19)
- **Domain / State / Priority:** GENERIC / SAVING / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Saving exact context progress.
- **Preparation:** Capture only during separately authorized real save/update.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/analysis/workspace.tsx`

### analysis-error — Analysis / Workspace / Error

- **Group / Screen:** Analysis / Workspace
- **Route:** `/analysis`
- **Query parameters:** `{"study": "dts-improvement", "runs": "19", "savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Workspace](http://localhost:3200/analysis?study=dts-improvement&runs=19&savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Source query or saved-open error.
- **Preparation:** Use a naturally occurring or approved isolated failure.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/analysis/workspace.tsx`

### reference-definitions — Reference / Definitions / Read Only

- **Group / Screen:** Reference / Definitions
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Definitions](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P2
- **Study / Run:** — / —
- **Purpose:** Definitions list with authoring unavailable to the current UAT principal.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-filtered — Reference / Definitions / Filtered

- **Group / Screen:** Reference / Definitions
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Definitions](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / FILTERED / P2
- **Study / Run:** — / —
- **Purpose:** Search/type filtering and result density.
- **Preparation:** Search for an existing definition, e.g. Energy.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-empty — Reference / Definitions / Empty

- **Group / Screen:** Reference / Definitions
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Definitions](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / EMPTY / P3
- **Study / Run:** — / —
- **Purpose:** No matching definitions.
- **Preparation:** Use a nonmatching local search query.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-definition — Reference / Definition Inspector / Open

- **Group / Screen:** Reference / Definition Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions", "definition": "condition-energy-v1", "inspector": "1"}`
- **Open:** [Definition Inspector](http://localhost:3200/reference?section=definitions&definition=condition-energy-v1&inspector=1)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Core Definition, applicability, usage, revision history and technical details.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-create — Reference / Definition Entry / Editable

- **Group / Screen:** Reference / Definition Entry
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Definition Entry](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / EDITABLE / P2
- **Study / Run:** — / —
- **Purpose:** New immutable definition form before submission.
- **Preparation:** Requires approved configuration author role; open Create Definition without submit.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-revision — Reference / Definition Inspector / New Revision

- **Group / Screen:** Reference / Definition Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Definition Inspector](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / NEW_REVISION / P2
- **Study / Run:** — / —
- **Purpose:** Revision-created notice and exact prior/current versions.
- **Preparation:** Requires approved author and a legitimate existing new revision; do not Create Revision for a screenshot.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-applicability — Reference / Applicability / Read Only

- **Group / Screen:** Reference / Applicability
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability"}`
- **Open:** [Applicability](http://localhost:3200/reference?section=applicability)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P2
- **Study / Run:** — / —
- **Purpose:** Existing applicability rules and scope conditions.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-rule-detail — Reference / Applicability Inspector / Open

- **Group / Screen:** Reference / Applicability Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability"}`
- **Open:** [Applicability Inspector](http://localhost:3200/reference?section=applicability)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Detailed selected rule and authoring boundary.
- **Preparation:** Select existing rule and open its inspector.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-rule-form — Reference / Applicability Entry / Editable

- **Group / Screen:** Reference / Applicability Entry
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability"}`
- **Open:** [Applicability Entry](http://localhost:3200/reference?section=applicability)
- **Domain / State / Priority:** GENERIC / EDITABLE / P2
- **Study / Run:** — / —
- **Purpose:** Add rule inputs with selected version and context.
- **Preparation:** Requires approved applicability manager; open Add; do not submit.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-rule-invalid — Reference / Applicability Entry / Invalid

- **Group / Screen:** Reference / Applicability Entry
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability"}`
- **Open:** [Applicability Entry](http://localhost:3200/reference?section=applicability)
- **Domain / State / Priority:** GENERIC / INVALID / P3
- **Study / Run:** — / —
- **Purpose:** Rule validation feedback before persistence.
- **Preparation:** Requires approved applicability manager; validate incomplete form without Add.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-resolver-photo — Reference / Resolver PHOTO / Resolved

- **Group / Screen:** Reference / Resolver PHOTO
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability", "definition": "condition-energy-v1", "preview": "1", "package": "config-package-photo-v1"}`
- **Open:** [Resolver PHOTO](http://localhost:3200/reference?section=applicability&definition=condition-energy-v1&preview=1&package=config-package-photo-v1)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / RESOLVED / P2
- **Study / Run:** — / —
- **Purpose:** PHOTO context restricts equipment/recipe/parameters.
- **Preparation:** Open Test/Preview; choose existing PHOTO EXPOSURE context and EXP-03.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-resolver-material — Reference / Resolver Material / Resolved

- **Group / Screen:** Reference / Resolver Material
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability", "definition": "condition-cure-temperature-v1", "preview": "1", "package": "config-package-material-rd-v1"}`
- **Open:** [Resolver Material](http://localhost:3200/reference?section=applicability&definition=condition-cure-temperature-v1&preview=1&package=config-package-material-rd-v1)
- **Domain / State / Priority:** MATERIAL VARIANT / RESOLVED / P2
- **Study / Run:** — / —
- **Purpose:** Material operation context and specimen references.
- **Preparation:** Open Test/Preview and choose material package and existing CURE context.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-packages — Reference / Package Versions / Populated

- **Group / Screen:** Reference / Package Versions
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages"}`
- **Open:** [Package Versions](http://localhost:3200/reference?section=packages)
- **Domain / State / Priority:** GENERIC / POPULATED / P2
- **Study / Run:** — / —
- **Purpose:** All exact package versions, statuses and pinned Run usage.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-package-active — Reference / Package Inspector / Active

- **Group / Screen:** Reference / Package Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages", "package": "config-package-cmp-v1"}`
- **Open:** [Package Inspector](http://localhost:3200/reference?section=packages&package=config-package-cmp-v1)
- **Domain / State / Priority:** GENERIC / ACTIVE / P2
- **Study / Run:** — / —
- **Purpose:** Active exact manifest and activation safety.
- **Preparation:** Select CMP v1; expand exact manifest sections.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-package-inactive — Reference / Package Inspector / Inactive

- **Group / Screen:** Reference / Package Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages", "package": "config-package-photo-v1"}`
- **Open:** [Package Inspector](http://localhost:3200/reference?section=packages&package=config-package-photo-v1)
- **Domain / State / Priority:** GENERIC / INACTIVE / P2
- **Study / Run:** — / —
- **Purpose:** Inactive PHOTO package remains historically pinned; not missing.
- **Preparation:** Select PHOTO v1; inspect status and Run usage.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-package-validation — Reference / Package Validation / Validated

- **Group / Screen:** Reference / Package Validation
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages", "package": "config-package-cmp-v1", "validation": "1"}`
- **Open:** [Package Validation](http://localhost:3200/reference?section=packages&package=config-package-cmp-v1&validation=1)
- **Domain / State / Priority:** GENERIC / VALIDATED / P2
- **Study / Run:** — / —
- **Purpose:** Validation result for exact selected package.
- **Preparation:** Click Validate exact version; validation is read-only.
- **Availability:** READY
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-package-draft — Reference / Package Versions / Draft

- **Group / Screen:** Reference / Package Versions
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages"}`
- **Open:** [Package Versions](http://localhost:3200/reference?section=packages)
- **Domain / State / Priority:** GENERIC / DRAFT / P2
- **Study / Run:** — / —
- **Purpose:** Draft package shell and assembly affordance.
- **Preparation:** Requires approved manager and a legitimate draft; current drafts list is empty.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-package-invalid — Reference / Package Validation / Invalid

- **Group / Screen:** Reference / Package Validation
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages"}`
- **Open:** [Package Validation](http://localhost:3200/reference?section=packages)
- **Domain / State / Priority:** GENERIC / INVALID / P3
- **Study / Run:** — / —
- **Purpose:** Validation errors preventing activation.
- **Preparation:** Requires a legitimate existing invalid draft/version; do not damage active configuration.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-package-authorized — Reference / Package Inspector / Activation Available

- **Group / Screen:** Reference / Package Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages"}`
- **Open:** [Package Inspector](http://localhost:3200/reference?section=packages)
- **Domain / State / Priority:** GENERIC / ACTIVATION_AVAILABLE / P2
- **Study / Run:** — / —
- **Purpose:** Enabled manager controls and validation prerequisite.
- **Preparation:** Use an approved configuration manager and existing eligible package; do not activate/deactivate.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### reference-error — Reference / Studio / Error

- **Group / Screen:** Reference / Studio
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Studio](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** — / —
- **Purpose:** Configuration load/command failure notice.
- **Preparation:** Use naturally occurring or approved isolated failure.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/reference-studio/home.tsx`

### samples-list — Samples / Master / Populated

- **Group / Screen:** Samples / Master
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Master](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / POPULATED / P2
- **Study / Run:** — / —
- **Purpose:** Existing material-condition catalog; do not confuse with Specimen experimental subject.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/sample-explorer/explorer.tsx`

### samples-empty — Samples / Master / Empty

- **Group / Screen:** Samples / Master
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Master](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / EMPTY / P3
- **Study / Run:** — / —
- **Purpose:** Empty local filter results.
- **Preparation:** Enter a nonmatching search; clear afterwards.
- **Availability:** READY
- **Evidence:** `src/features/sample-explorer/explorer.tsx`

### sample-detail — Samples / Sample / Populated

- **Group / Screen:** Samples / Sample
- **Route:** `/samples/D031`
- **Query parameters:** `{}`
- **Open:** [Sample](http://localhost:3200/samples/D031)
- **Domain / State / Priority:** GENERIC / POPULATED / P2
- **Study / Run:** — / —
- **Purpose:** Identity, revisions, latest structure/properties and linked historical experiment usage.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/sample-detail/detail.tsx`

### sample-revision — Samples / Revision / Delta

- **Group / Screen:** Samples / Revision
- **Route:** `/samples/D031/revisions/3`
- **Query parameters:** `{}`
- **Open:** [Revision](http://localhost:3200/samples/D031/revisions/3)
- **Domain / State / Priority:** GENERIC / DELTA / P2
- **Study / Run:** — / —
- **Purpose:** Exact revision, structure, properties, registered delta and provenance.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/sample-revision-detail/detail.tsx`

### sample-first-revision — Samples / Revision / Initial

- **Group / Screen:** Samples / Revision
- **Route:** `/samples/D031/revisions/1`
- **Query parameters:** `{}`
- **Open:** [Revision](http://localhost:3200/samples/D031/revisions/1)
- **Domain / State / Priority:** GENERIC / INITIAL / P2
- **Study / Run:** — / —
- **Purpose:** Initial revision with no predecessor delta.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/sample-revision-detail/detail.tsx`

### sample-create-1 — Samples / Create Identity / Open

- **Group / Screen:** Samples / Create Identity
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Create Identity](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Existing five-step local review prototype, still reachable from Samples.
- **Preparation:** Open Create sample and advance to Identity using built-in defaults only; do not claim registration or create scientific data.
- **Availability:** READY
- **Evidence:** `src/features/sample-create/create-sample.tsx`
- **As-Is note:** Defaults are shipped mock UI values, not a new persisted Sample. Finish review only closes modal.

### sample-create-2 — Samples / Create Revision Information / Open

- **Group / Screen:** Samples / Create Revision Information
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Create Revision Information](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Existing five-step local review prototype, still reachable from Samples.
- **Preparation:** Open Create sample and advance to Revision Information using built-in defaults only; do not claim registration or create scientific data.
- **Availability:** READY
- **Evidence:** `src/features/sample-create/create-sample.tsx`
- **As-Is note:** Defaults are shipped mock UI values, not a new persisted Sample. Finish review only closes modal.

### sample-create-3 — Samples / Create Material Structure / Open

- **Group / Screen:** Samples / Create Material Structure
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Create Material Structure](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Existing five-step local review prototype, still reachable from Samples.
- **Preparation:** Open Create sample and advance to Material Structure using built-in defaults only; do not claim registration or create scientific data.
- **Availability:** READY
- **Evidence:** `src/features/sample-create/create-sample.tsx`
- **As-Is note:** Defaults are shipped mock UI values, not a new persisted Sample. Finish review only closes modal.

### sample-create-4 — Samples / Create Properties / Open

- **Group / Screen:** Samples / Create Properties
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Create Properties](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Existing five-step local review prototype, still reachable from Samples.
- **Preparation:** Open Create sample and advance to Properties using built-in defaults only; do not claim registration or create scientific data.
- **Availability:** READY
- **Evidence:** `src/features/sample-create/create-sample.tsx`
- **As-Is note:** Defaults are shipped mock UI values, not a new persisted Sample. Finish review only closes modal.

### sample-create-5 — Samples / Create Review / Open

- **Group / Screen:** Samples / Create Review
- **Route:** `/samples`
- **Query parameters:** `{}`
- **Open:** [Create Review](http://localhost:3200/samples)
- **Domain / State / Priority:** GENERIC / OPEN / P2
- **Study / Run:** — / —
- **Purpose:** Existing five-step local review prototype, still reachable from Samples.
- **Preparation:** Open Create sample and advance to Review using built-in defaults only; do not claim registration or create scientific data.
- **Availability:** READY
- **Evidence:** `src/features/sample-create/create-sample.tsx`
- **As-Is note:** Defaults are shipped mock UI values, not a new persisted Sample. Finish review only closes modal.

### legacy-run — Legacy / Run Detail / Populated

- **Group / Screen:** Legacy / Run Detail
- **Route:** `/series/dts-improvement/runs/1`
- **Query parameters:** `{}`
- **Open:** [Run Detail](http://localhost:3200/series/dts-improvement/runs/1)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / POPULATED / P2
- **Study / Run:** dts-improvement / 1
- **Purpose:** Still linked by Sample usage; original mock Run detail remains part of As-Is.
- **Preparation:** Open the route and wait for repository data to settle.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/run.tsx`
- **As-Is note:** Mock fixture route, not PostgreSQL Run 19. Keep in a separate Figma Legacy page.

### legacy-wafer — Legacy / Identity Detail / Selected

- **Group / Screen:** Legacy / Identity Detail
- **Route:** `/series/dts-improvement/runs/4`
- **Query parameters:** `{}`
- **Open:** [Identity Detail](http://localhost:3200/series/dts-improvement/runs/4)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SELECTED / P2
- **Study / Run:** dts-improvement / 4
- **Purpose:** Historical wafer identity observation and candidate detail.
- **Preparation:** In Execution, click Needs identity review for an existing candidate; do not Confirm identity.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/execution-context.tsx`

### legacy-measurement — Legacy / Measurement Detail / Site Table

- **Group / Screen:** Legacy / Measurement Detail
- **Route:** `/series/dts-improvement/runs/4`
- **Query parameters:** `{}`
- **Open:** [Measurement Detail](http://localhost:3200/series/dts-improvement/runs/4)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SITE_TABLE / P2
- **Study / Run:** dts-improvement / 4
- **Purpose:** Legacy measurement drawer, site table and source validity display.
- **Preparation:** Scroll to Measurement results and select existing wafer/dataset. Do not exclude or edit observations.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/measurement-results.tsx`

### legacy-scatter — Legacy / Measurement Detail / Scatter

- **Group / Screen:** Legacy / Measurement Detail
- **Route:** `/series/dts-improvement/runs/4`
- **Query parameters:** `{}`
- **Open:** [Measurement Detail](http://localhost:3200/series/dts-improvement/runs/4)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / SCATTER / P2
- **Study / Run:** dts-improvement / 4
- **Purpose:** Legacy coordinate visualization separate from production Analysis.
- **Preparation:** In the existing measurement drawer choose Scatter.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/measurement-results.tsx`

### legacy-prep-group — Legacy / Data Preparation / Group

- **Group / Screen:** Legacy / Data Preparation
- **Route:** `/series/dts-improvement/runs/4/data-preparation`
- **Query parameters:** `{}`
- **Open:** [Data Preparation](http://localhost:3200/series/dts-improvement/runs/4/data-preparation)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / GROUP / P2
- **Study / Run:** dts-improvement / 4
- **Purpose:** Existing logical-group UI reachable via historical Run Prepare Data.
- **Preparation:** Open Group tab; inspect shipped group only; do not create groups.
- **Availability:** READY
- **Evidence:** `src/features/data-preparation/workspace.tsx`

### legacy-prep-calc — Legacy / Data Preparation / Calculate

- **Group / Screen:** Legacy / Data Preparation
- **Route:** `/series/dts-improvement/runs/4/data-preparation`
- **Query parameters:** `{}`
- **Open:** [Data Preparation](http://localhost:3200/series/dts-improvement/runs/4/data-preparation)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / CALCULATE / P2
- **Study / Run:** dts-improvement / 4
- **Purpose:** Existing arithmetic, derived result lineage and unmatched-site warning.
- **Preparation:** Choose Calculate; display shipped result, do not run a new calculation or save recipe.
- **Availability:** READY
- **Evidence:** `src/features/data-preparation/workspace.tsx`

### access-plan — Access / Plan / Read Only

- **Group / Screen:** Access / Plan
- **Route:** `/series/dts-improvement/runs/20/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Plan](http://localhost:3200/series/dts-improvement/runs/20/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P3
- **Study / Run:** dts-improvement / 20
- **Purpose:** Same visible scientific data with unauthorized authoring actions absent/disabled.
- **Preparation:** Use an approved existing read-only principal; do not modify grants for screenshots.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/experiment-series/created-run-grid.tsx`

### access-actual — Access / Actual / Read Only

- **Group / Screen:** Access / Actual
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "actual"}`
- **Open:** [Actual](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=actual)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Same visible scientific data with unauthorized authoring actions absent/disabled.
- **Preparation:** Use an approved existing read-only principal; do not modify grants for screenshots.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/experiment-series/created-run-grid.tsx`

### access-measurement — Access / Measurement / Read Only

- **Group / Screen:** Access / Measurement
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "measurement"}`
- **Open:** [Measurement](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=measurement)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Same visible scientific data with unauthorized authoring actions absent/disabled.
- **Preparation:** Use an approved existing read-only principal; do not modify grants for screenshots.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/experiment-series/created-run-grid.tsx`

### access-evaluation — Access / Evaluation / Read Only

- **Group / Screen:** Access / Evaluation
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Evaluation](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / READ_ONLY / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Same visible scientific data with unauthorized authoring actions absent/disabled.
- **Preparation:** Use an approved existing read-only principal; do not modify grants for screenshots.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/experiment-series/created-run-grid.tsx`

### access-forbidden — Access / Study / Forbidden

- **Group / Screen:** Access / Study
- **Route:** `/series/adhesion-material-optimization`
- **Query parameters:** `{}`
- **Open:** [Study](http://localhost:3200/series/adhesion-material-optimization)
- **Domain / State / Priority:** GENERIC / FORBIDDEN / P3
- **Study / Run:** adhesion-material-optimization / —
- **Purpose:** Fail-closed unavailable/access-denied message.
- **Preparation:** Use an approved existing principal without access to this real Study.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `app/series/adhesion-material-optimization/page.tsx`

### access-saved — Access / Saved Analysis / Unauthorized

- **Group / Screen:** Access / Saved Analysis
- **Route:** `/analysis`
- **Query parameters:** `{"savedView": "analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8"}`
- **Open:** [Saved Analysis](http://localhost:3200/analysis?savedView=analysis-view-d7bd3bc8-97cf-4646-aa85-2cf85072ebe8)
- **Domain / State / Priority:** GENERIC / UNAUTHORIZED / P3
- **Study / Run:** — / —
- **Purpose:** Saved audience AND every source authorization denial.
- **Preparation:** Use an existing approved principal lacking one required permission. Do not change sharing or source ACLs.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/analysis/workspace.tsx`

### access-run-unavailable — Access / Run / Error

- **Group / Screen:** Access / Run
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{}`
- **Open:** [Run](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid)
- **Domain / State / Priority:** GENERIC / ERROR / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Run load failure/unavailable boundary.
- **Preparation:** Use naturally occurring or approved isolated failure on this existing Run; do not delete it.
- **Availability:** FAULT_REQUIRED
- **Evidence:** `src/features/experiment-series/created-run-grid.tsx`

### not-found — Access / Not Found / Not Found

- **Group / Screen:** Access / Not Found
- **Route:** `/samples/__not_found__`
- **Query parameters:** `{}`
- **Open:** [Not Found](http://localhost:3200/samples/__not_found__)
- **Domain / State / Priority:** GENERIC / NOT_FOUND / P3
- **Study / Run:** — / —
- **Purpose:** Global Next Not Found screen through validated missing Sample code.
- **Preparation:** Diagnostic nonexistent code, not invented scientific data; this path instantiates the canonical Sample route.
- **Availability:** READY
- **Evidence:** `app/not-found.tsx`
- **As-Is note:** __not_found__ is deliberately absent from src/mock/materials.ts. No resource is created.

### study-runs-empty — Study / Runs / Empty

- **Group / Screen:** Study / Runs
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "runs"}`
- **Open:** [Runs](http://localhost:3200/series/dts-improvement?view=runs)
- **Domain / State / Priority:** GENERIC / EMPTY / P3
- **Study / Run:** dts-improvement / —
- **Purpose:** Run list without entries and available creation action.
- **Preparation:** Requires an existing legitimate empty Study; all current Studies have two Runs.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/experiment-series/productized-series.tsx`

### study-runs-more — Study / Runs / Paginated

- **Group / Screen:** Study / Runs
- **Route:** `/series/dts-improvement`
- **Query parameters:** `{"view": "runs"}`
- **Open:** [Runs](http://localhost:3200/series/dts-improvement?view=runs)
- **Domain / State / Priority:** GENERIC / PAGINATED / P2
- **Study / Run:** dts-improvement / —
- **Purpose:** Load more Runs affordance in server-scoped list.
- **Preparation:** Requires more existing visible Runs than one page; do not generate Runs for pagination.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/experiment-series/repository-series-runs.tsx`

### run-loading — Run / Workspace / Loading

- **Group / Screen:** Run / Workspace
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "plan"}`
- **Open:** [Workspace](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=plan)
- **Domain / State / Priority:** GENERIC / LOADING / P3
- **Study / Run:** dts-improvement / 19
- **Purpose:** Initial Loading Run boundary before grid hydration.
- **Preparation:** Observe normal navigation with optional read-only network throttling.
- **Availability:** TRANSIENT
- **Evidence:** `src/features/experiment-series/created-run-grid.tsx`

### evaluation-saved — Evaluation / Decision Entry / Saved

- **Group / Screen:** Evaluation / Decision Entry
- **Route:** `/series/dts-improvement/runs/19/engineering-grid`
- **Query parameters:** `{"view": "evaluation"}`
- **Open:** [Decision Entry](http://localhost:3200/series/dts-improvement/runs/19/engineering-grid?view=evaluation)
- **Domain / State / Priority:** GENERIC / SAVED / P2
- **Study / Run:** dts-improvement / 19
- **Purpose:** Engineer Evaluation saved or Decision and Next Action saved notice.
- **Preparation:** Capture only after separately authorized real reasoning save.
- **Availability:** WRITE_REQUIRED
- **Evidence:** `src/features/run-registration/evaluation-execution-grid.tsx`

### reference-definition-invalid — Reference / Definition Entry / Invalid

- **Group / Screen:** Reference / Definition Entry
- **Route:** `/reference`
- **Query parameters:** `{"section": "definitions"}`
- **Open:** [Definition Entry](http://localhost:3200/reference?section=definitions)
- **Domain / State / Priority:** GENERIC / INVALID / P3
- **Study / Run:** — / —
- **Purpose:** Required field validation in definition form.
- **Preparation:** Requires approved author role; submit an incomplete form only if validation prevents command dispatch; otherwise defer.
- **Availability:** ROLE_REQUIRED
- **Evidence:** `src/features/reference-studio/definitions-view.tsx`

### reference-resolver-empty — Reference / Resolver / No Match

- **Group / Screen:** Reference / Resolver
- **Route:** `/reference`
- **Query parameters:** `{"section": "applicability", "preview": "1"}`
- **Open:** [Resolver](http://localhost:3200/reference?section=applicability&preview=1)
- **Domain / State / Priority:** GENERIC / NO_MATCH / P3
- **Study / Run:** — / —
- **Purpose:** Empty applicability result without adding or changing rules.
- **Preparation:** Use an existing incompatible combination in preview only; do not modify applicability.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/reference-studio/resolver-preview.tsx`

### reference-package-assembled — Reference / Package Inspector / Assembled

- **Group / Screen:** Reference / Package Inspector
- **Route:** `/reference`
- **Query parameters:** `{"section": "packages"}`
- **Open:** [Package Inspector](http://localhost:3200/reference?section=packages)
- **Domain / State / Priority:** GENERIC / ASSEMBLED / P2
- **Study / Run:** — / —
- **Purpose:** Immutable assembled DRAFT manifest distinct from draft shell.
- **Preparation:** Requires an existing legitimately assembled draft; no current draft exists.
- **Availability:** STATE_REQUIRED
- **Evidence:** `src/features/reference-studio/package-view.tsx`

### legacy-evidence — Legacy / Evidence Viewer / Open

- **Group / Screen:** Legacy / Evidence Viewer
- **Route:** `/series/dts-improvement/runs/1`
- **Query parameters:** `{}`
- **Open:** [Evidence Viewer](http://localhost:3200/series/dts-improvement/runs/1)
- **Domain / State / Priority:** SEMICONDUCTOR VARIANT / OPEN / P2
- **Study / Run:** dts-improvement / 1
- **Purpose:** Evidence image/report dialog and measurement context.
- **Preparation:** Click an existing Evidence card and inspect; close without changes.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/interactions.tsx`

### legacy-next — Legacy / Next Run / Preview

- **Group / Screen:** Legacy / Next Run
- **Route:** `/series/dts-improvement/runs/1`
- **Query parameters:** `{}`
- **Open:** [Next Run](http://localhost:3200/series/dts-improvement/runs/1)
- **Domain / State / Priority:** GENERIC / PREVIEW / P2
- **Study / Run:** dts-improvement / 1
- **Purpose:** Legacy inheritance modal before linking to planner.
- **Preparation:** Click Create Next Run in historical Run; stop in preview and close.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/interactions.tsx`

### legacy-conditions — Legacy / Conditions / Expanded

- **Group / Screen:** Legacy / Conditions
- **Route:** `/series/dts-improvement/runs/4`
- **Query parameters:** `{}`
- **Open:** [Conditions](http://localhost:3200/series/dts-improvement/runs/4)
- **Domain / State / Priority:** GENERIC / EXPANDED / P2
- **Study / Run:** dts-improvement / 4
- **Purpose:** Expanded unchanged conditions and Sample details.
- **Preparation:** Expand existing conditions/Sample details; no editing.
- **Availability:** READY
- **Evidence:** `src/features/experiment-run/conditions.tsx`

## Known capture limits

This is a source-and-existing-data inventory, not a claim that every conditional state was reproduced. Existing audit defects remain As-Is (see `docs/dxt-product-logic-audit-v1.md`). In particular, do not present Group as an implemented scientific grouping engine, generic read-only controls as SSO, the Sample wizard as persisted registration, or local Data Preparation as production persistence. A Next Run success frame must follow an actual authorized successful command, not an optimistic local preview flag.

Before the capture pass, recheck principal permissions and exact UAT IDs. Dynamic September calendar dates and loading/error messages may vary with time/network. Do not reset browser or database state to manufacture emptiness. The three next Runs already provide genuine empty evidence states.

The manifest now provides one traceable inventory for the DXT As-Is Figma import before redesign; conditional prerequisites must be resolved before those frames can be captured.
