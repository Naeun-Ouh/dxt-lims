# Actual Execution → Measurement vertical slice

DXT treats measurement as immutable experimental evidence. A result remains traceable through `ExperimentRun → SubjectRef → measurement Operation → MeasurementExecution → MeasurementDataset → MeasurementValue → ParameterDefinition / UnitDefinition`, with optional linkage from the dataset to the relevant process `ExecutionEvent`.

## Reused domain

The slice reuses `MeasurementExecution`, `MeasurementDataset`, `MeasurementValue`, `WaferMeasurementSummary`, `MeasurementValidityDecision`, `SubjectRef`, `PhysicalWafer`, Site identity, coordinate definitions, parameter definitions, measurement operation definitions, and execution evidence. No duplicate measurement entity was added.

`MeasurementEvidenceProjection` and `SiteMeasurementProjection` are read models. They resolve the existing domain records into the Engineering Grid and do not persist new scientific facts.

## Grain and Site

The projection currently supports WAFER and SITE observation grains. Subject columns contain representative wafer-level values. Selecting one value reveals its immutable Site observations and coordinates. Site remains the observation location. Experiment Position remains the condition-application location; no automatic Position-to-Site mapping exists.

## Execution boundaries

MeasurementExecution is distinct from process ExecutionEvent. A PHOTO CD-SEM execution follows an EXPOSURE execution, while CMP PRE and POST thickness acquisitions remain separate MeasurementExecutions and datasets. A dataset may link to relevant process execution evidence when the source provides that identity. Absence of that link remains explicit.

## Validity and provenance

Raw MeasurementValues are never deleted by projection. The latest `MeasurementValidityDecision` marks a value INCLUDED or EXCLUDED. Representative summaries retain raw and effective counts plus source value identities.

The Inspector exposes dataset identity, MeasurementExecution identity, measurement and parameter definitions, unit, acquisition mode, source record, collection time, dataset origin, process execution link, and exclusion counts.

SOURCE and DERIVED datasets remain distinguishable through `datasetOrigin`. Derived values retain `sourceMeasurementValueIds`; this slice displays their provenance but does not implement Data Preparation.
