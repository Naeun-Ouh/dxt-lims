# Reference Studio

Reference Studio is the configuration layer where an organization defines how experiments are represented. It is not generic database administration. DXT LIMS remains experiment-centric, and the wafer remains the primary semiconductor experimental subject.

## Classification and areas

ExperimentTypeDefinition classifies Device, Process, and Material experiments. An experiment type contains zero or more AreaDefinitions. The mock Process Experiment contains PHOTO and CMP. Each area exposes its own operations, intentional conditions, and measurement operations without adding PHOTO- or CMP-specific fields to ExperimentRun.

## Conditions and scope

ConditionDefinition records a versioned code, name, description, scalar or structured-reference value type, optional UnitDefinition, supported RUN/LOT/WAFER/SITE/POSITION scopes, display order, and activation state. Structured reference types preserve Recipe, Equipment, SampleRevision, and resource semantics.

Lot and Wafer are subject/context identities. Operation is process-plan context. They are not generic condition definitions. Material/Sample is the structured experiment condition connected through MaterialUsage to an exact SampleRevision.

## Process operations

OperationDefinition describes an operation available in an Area. An ExperimentRun may have an OperationPlan with one or more ordered ProcessSteps referencing those definitions. This is only a planning boundary; it does not provide workflow execution.

## Measurement representation

MeasurementOperationDefinition groups ParameterDefinitions. Parameter semantic roles are MEASUREMENT, COORDINATE, CONTEXT, and SUPPORTING. Engineers choose meaningful measurements. Technical parameters can be included through requiredSupportingParameterIds without being presented as equivalent user choices.

For example, selecting BCD for CD-SEM resolves collection requirements for BCD, CHIPINDEX_X, and CHIPINDEX_Y. No DCOL or MES collection is implemented.

Supported measurement points are PRE, INTERMEDIATE, POST, FINAL, and CUSTOM. They prepare future observation context only; there is no Pre/Post calculation or physical-wafer resolution.

## Versioning

**Definitions may evolve, but the meaning of a recorded experiment must not.** Definition records are versioned, and experiment instances pin exact definition IDs. A newly activated version cannot reinterpret a historical ExperimentRun. Approval and governance workflows remain outside this slice.
