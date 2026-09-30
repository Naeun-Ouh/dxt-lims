# Experiment Run planning

The Run Planner proves that Reference Studio definitions can drive practical semiconductor experiment registration without area-specific Run schemas.

The six-step information architecture is Classification, Subject, Process plan, Conditions, Measurements, and Review. CMP and PHOTO use the same screen and derive their fields from the selected AreaDefinition.

## Subject and process

Lot and Wafer are explicit subject/context fields. Wafer is presented as the primary experimental subject. Operations are ordered ProcessSteps inside one OperationPlan, allowing a single-operation CMP plan or a multi-operation PHOTO plan without defining a workflow engine.

## Conditions

Available conditions come from ConditionDefinition.areaDefinitionIds. Assignments pin exact definition IDs and support RUN, LOT, WAFER, SITE, and POSITION when permitted by the definition. The UI includes a small Site example for Energy without implementing a DOE or wafer-map editor. Material selection pins an exact SampleRevision.

## Measurements

Engineers select a MeasurementOperation and business measurement parameters. Coordinate, context, and supporting parameters are not selectable in the normal flow. Their required IDs are resolved from ParameterDefinition.requiredSupportingParameterIds and shown as automatic collection requirements. Measurement points are planning context only.

## Inheritance and versioning

Create Next Run starts from the previous Run's complete intended ConditionSet, material bindings, and ordered operation definitions. New instance IDs must be assigned when persistence exists. Explicit edits appear as a planning delta.

Every area, operation, condition, measurement operation, parameter, and SampleRevision selection stores an exact ID. Definitions are immutable versioned records by contract: definitions may evolve, but the meaning of a recorded experiment must not.

## Productized planning workspace

The planning workspace is a UI/read-model projection over the frozen Domain Architecture v1.0. A Run stores a complete configuration snapshot; the default review surface shows its semantic delta from the Series Default, previous Run, existing configuration, or ad-hoc origin.

The workspace shows compact Run context and intent, multiple wafer subjects, common/default setup, explicit wafer overrides, and two views over the same snapshot. Process Flow presents the Wafer × ProcessStep sequence. Matrix Assignment compares explicit RecipeAssignment, ConditionAssignment, MaterialUsage, and ResourceUsage values without creating a generic matrix persistence model.

FIXED and VARIED remain explicit engineer intent. A different value is never inferred to be VARIED. Recipe remains an exact recipe revision reference, Sample remains an exact SampleRevision reference, and resources remain ResourceUsage records at operation default or wafer-operation override scope. Position-level conditions are displayed through a small disclosure and have no relationship to Measurement Site.

Measurement Plan contains only the intended Measurement Operation, Parameter, and PRE/INTERMEDIATE/POST/FINAL/CUSTOM point. Acquisition method and actual MeasurementExecution remain outside planning. PRE and POST values are not calculated here.

The product fixtures are PHOTO DTS Improvement Run 18 and CMP Stability Run 12. They are presentation read models and add no domain entity.

This slice has browser-local mock planning persistence only. It does not perform lookup, collection, execution, plan-versus-actual comparison, physical-wafer resolution, Position-to-Site mapping, Pre/Post calculation, evaluation, analysis, prediction, or AI.

## Table-first Run Workspace

The Run Workspace now derives Table, Flow, Variation, Equipment, and Inspector projections from one `ExperimentWorkspaceModel`. Shared UI state retains the selected Operation, Subject, scope, resolution, and flow density while views change. Table is the default working surface and keeps Operations as rows.

The Operation Inspector combines equipment capability context with explicit Recipe, Condition, MaterialUsage, ResourceUsage, and Measurement Plan projections. The expanded Operation Variable × Subject Matrix supports explicit FIXED/VARIED intent, immediate wafer edits, Set Same and numeric Sequence while preserving each assignment's original domain kind and reference. It does not introduce generic assignment persistence.

Experiment Focus filters the read model to intentionally relevant Operations. Experiment shows all confirmed scope Operations; Full History includes surrounding mock manufacturing context. Lot, Wafer, and Site are projection-grain state; Site does not create main-table columns and remains separate from experiment Position.

The compact Equipment view is a reference-driven schematic, not a Digital Twin. Operation remains the process axis, with equipment/module, recipe, material application, and resource application shown as contextual capability information.

## Experiment scope selection

The existing Operation history remains the source list. A browser-local Run planning context relationship stores a collection of ranges, each containing Run ID, start/end Operation IDs, included Operation references, and selected wafer references. No Operation is copied, mutated, or removed by scope confirmation. This phase edits one range; the collection allows future multiple ranges without another persistence model.

Define Experiment Scope keeps Table visible in Full History. Pointer drag (either direction) previews a continuous range. Shift-click can refine the end. Confirmation requires at least one of the 25 mock wafer candidates; only W01–W04 are initially selected. Cancel discards the provisional range and subject changes. Experiment Focus resolves intentionally VARIED assignments and measurement Operations strictly inside confirmed Scope; it is not an Area filter. Experiment Scope, Full History, Flow rails, and variation projections use the same Operation identities. Selection remains available to the Inspector even when a projection hides its row.

Confirmed Scope, variable assignments and Manual Focus survive reload in browser localStorage under a versioned Run-specific key. Provisional drag and subject edits are not persisted. Invalid or mismatched stored contexts fall back to fixtures; blocked storage retains session state and shows a notice. MES integration, durable storage, automatic wafer identity resolution, complex multi-range editing, and virtualization remain outside this phase.


## Continuous scope-to-variable planning

Define Experiment Scope enters Table range selection: only the operation count, start/end, Continue and Cancel are shown. Continue opens the existing Inspector column as a compact Subject confirmation panel. The current subject list is summarized by default; Change Subjects expands the 25 mock candidates inside that panel. Back returns to the same provisional range; Cancel discards it. Confirmation requires a nonempty valid subject list, preserves source Operation IDs and current selection where possible, and returns to Experiment view without remounting the Table.

The projection control is presented as **Operation View: Focus / Experiment / Full History**. Underlying `WorkspaceScope` names remain unchanged. A narrow scope rail, ◆ varied variable, ◎ measurement and ● manual focus replace repeated row status badges. Manual Focus supplements automatic VARIED/measurement focus within the confirmed scope; unmarking Manual Focus never removes automatic focus.

The expanded Operation matrix edits the same Run snapshot used by Inspector, Table, Flow, Variation and Equipment. FIXED offers one value for the scope's wafers; VARIED exposes each actual selected wafer, including candidates beyond W04. Values do not infer intent. Identical wafer values collapse into a Common value in Table; other condition summaries remain visible. Set Same uses the first selected wafer value and retains explicit role; Sequence uses Start/Step in wafer order with finite nonzero steps. Existing position overrides and unselected wafer values are retained. Recipe/material/resource controls use registered fixture choices and keep their assignment kind/reference; this is not a new generic domain entity. Add Variable resolves registered templates for the selected Operation, including existing CMP platen speed and slurry-flow definitions. Operations without editable definitions say so.

Measurement Operations expose the existing measurement plan and Wafer/Execution subject context, without the process-variable editor. Resolution and acquisition are reported as unspecified/not recorded because these fields are not present in this planning fixture. No actual results, Site mapping, or acquisition source is invented. Equipment/base recipe selectors display read-only context; actual experimental Recipe overrides appear in the matrix; base Recipe remains Operation context.

Only Wafer variable editing is implemented. Existing Lot/Site projection state does not enable Lot/Site assignment editing. Position is still distinct from Measurement Site. No group assignment, DOE, production persistence, MES calls, or cross-tab conflict resolution is added. Browser storage is a mock convenience, not authoritative enterprise storage. Fixture delta history remains the previous-run comparison seed; it is not recomputed as a live revision audit. Source operation/equipment context remains read-only.

Review routes: `/series/dts-improvement/runs/18/workspace` (PHOTO) and `/series/cmp-stability/runs/12/workspace` (CMP). No Run-level area switch exists.

No DXT LIMS core domain changes were required.


## Operation-centered inline experiment editor

Chevron expansion and row selection are separate: chevron toggles a single inline editor, the row selects the Inspector Operation, and Advanced selects/focuses that Inspector. All Operations start collapsed; expansion IDs live in Workspace presentation state and survive view changes. Collapsed Operations do not mount matrix controls. During scope dragging expanded content is temporarily hidden so range selection stays on Operation rows. Full virtualization is deferred.

Collapsed process rows count distinct experimental variables, excluding unchanged base Recipe. CMP M2 CU CMP shows `3 Varied · 2 Fixed`; PHOTO EXPOSURE shows `1 Varied · 3 Fixed`. Measurement Operations advertise `◎ Measurement`; Manual Focus uses a subtle `●`. The expanded matrix uses variables as rows and actual scope wafers as columns. FIXED uses a merged common-value editor; VARIED exposes per-wafer editors with subtle adjacent-equality separators. Type is secondary metadata. A compact per-variable action button reveals Set Same and numeric Sequence. No grouping domain objects are introduced.

Changing VARIED to FIXED explicitly uses the first selected wafer value as the common value. Changing FIXED to VARIED exposes the existing wafer values without inferring intent from numeric differences. Editing preserves expansion and the existing typed assignment/reference and browser persistence paths. References are restricted to the existing scenario choices; matrix presentation does not create EAV persistence. Base Recipe is excluded unless its role or effective values represent an experimental override.

Inspector now provides equipment/module, base reference context, applicability, per-definition reference IDs, current selected-wafer values and provenance. Frequent edits happen in the matrix. Measurement expansion shows the existing planned measurement, Wafer subject, unspecified resolution and planning-only acquisition context; no actual execution data is generated.

Experiment Scope primary identity is operation/wafer count; sequence-coded boundaries and names are secondary, so CLEAN → CLEAN is unambiguous. PHOTO/CMP routes and models remain separate fixtures using shared components. Expansion is not persisted; confirmed scope/assignments/manual focus remain browser-persisted.

Validation includes server-rendered accessible expansion controls, matrix column and merged-cell assertions, role transitions, shared projection updates, measurement rendering, persistence and source immutability. These are automated rendering/model tests, not a claim of browser pointer/keyboard end-to-end testing.


## Final backbone cleanup

The parent Operation table now contains only Seq, Operation, Area, Equipment, Recipe and Experiment. Lot context is shown once in the caption. Parent rows retain compact intent counts and Manual Focus; wafer values and normal editing occur exclusively in the expanded matrix. Base Recipe remains manufacturing context. Focusing a wafer editor also selects its wafer/Operation for Inspector depth.

The table uses natural document height with no internal vertical scroll or sticky header, frozen columns or footer. Expansion cells stay in normal table flow, span six columns, and never inherit sticky positioning. Only a wide wafer matrix has horizontal overflow; no fixed/max height constrains its vertical content. Full virtualization remains deferred.
