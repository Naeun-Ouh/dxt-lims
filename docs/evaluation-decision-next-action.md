# Evaluation to Decision and Next Action

The final controlled lifecycle slice preserves three separate meanings:

1. Engineer Evaluation interprets a specific Target Achievement and Measurement Summary.
2. Decision records the scientific conclusion and rationale taken from that interpretation.
3. Next Action selects a configured `NextActionTypeDefinition` and records the experimental continuation rationale.

The implementation reuses the existing `Decision` schema and configured Next Action type catalog. `DecisionContinuationContext` is a read-model linkage that carries Engineer Evaluation references, Target Achievement references, experiment scope, and an optional destination Run reference. It adds no PMS fields such as assignee, deadline, progress, or task status.

PHOTO Run 18 selects `DESIGN_NEXT_EXPERIMENT`. Its next Run preview uses `ExperimentConfigurationResolver.fromPreviousRun` to materialize an independent full configuration snapshot. Explicit changes are then applied with the existing resolver override operation. The resulting planning snapshot retains its previous Run source, carries all Operations, measurements, subjects, and assignments, and exposes only the four changed Energy assignments in the delta presentation.

CMP Run 12 selects `ADDITIONAL_MEASUREMENT` for a targeted POST thickness follow-up. It does not create a destination Run preview. The scenarios therefore exercise different configured continuation types without adding Area-specific behavior to the reusable projection.

The Evaluation Work Surface keeps Decision and Next Action directly below the evidence and achievement grid. If a destination Run exists, the compact preview separates inherited context from explicit changes. The full snapshot remains the storage contract; the delta remains the primary review UX.

The provenance chain is preserved as explicit references:

`Next Action ← Decision ← Engineer Evaluation ← Target Achievement ← Measurement Summary / Dataset / MeasurementExecution ← Actual Execution ← Plan`.

Series Summary Results remain optional, appendable higher-level conclusions. This slice does not require one Summary Result per Run and does not implement Study closure, approval workflow, task management, or AI recommendations.
