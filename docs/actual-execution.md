# PLAN → Actual Execution vertical slice

DXT uses immutable manufacturing and equipment records as execution evidence. It does not replace MES history. The Actual workspace is a read projection that connects a Run, `SubjectRef`, planned Operation configuration, `ExecutionEvent`, wafer identity observation, and a derived execution delta.

## Existing domain reused

- `ExecutionEvent` supplies actual operation, equipment, recipe, time, status, source system, source record identity, and the explicit `plannedExecutionItemId` link.
- `WaferIdentityObservation` supplies observed Lot/Wafer labels and the resolved `PhysicalWafer` link.
- `PhysicalWafer` remains the continuity abstraction when the observed Lot label changes.
- `RunPlanningSnapshot`, Operation projection, `SubjectRef`, resolved definitions, assignment metadata, and experimental intent supply the PLAN side.

`ActualExecutionEvidence` is an adapter contract over those existing records. `OperationExecutionProjection` and `ExecutionComparison` are read models. They are not stored scientific or manufacturing truth.

## Matching rule

This mock slice uses an explicit planned execution identity at the grain `Run + SubjectRef + Operation`. The source fixture's `ExecutionEvent.plannedExecutionItemId` must equal that identity, and Run, resolved Subject, and process-step/Operation references must also agree. No equipment-name, recipe-name, sequence, or timestamp heuristic is used.

The production boundary should consume the durable `PlannedExecutionItem.id` recorded when a plan is released. The deterministic identity used here is a mock adapter convention because `RunPlanningSnapshot` does not yet expose persisted `PlannedExecutionItem` records. Ambiguous or absent links remain missing/unknown; this slice does not silently guess a match.

## Delta semantics

- `MATCH`: normalized planned and actual values agree.
- `CHANGED`: both exist and differ.
- `MISSING_ACTUAL`: a planned value exists but no comparable actual value was observed.
- `UNPLANNED_ACTUAL`: an actual value exists without a planned counterpart.
- `NOT_COMPARABLE`: neither side provides a comparable value.

Delta is calculated from PLAN and immutable execution evidence. It is not persisted. `VARIED` remains experimental intent and never changes because of execution delta.

## Identity assumption

Observed Lot labels may change. Continuity is accepted only when the execution event and confirmed wafer identity observation resolve to the same `PhysicalWafer`. This vertical slice uses explicit mock resolution and does not implement an enterprise wafer identity resolver.

