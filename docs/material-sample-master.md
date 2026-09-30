# Native Material / Sample Master

Material / Sample is a structured experiment condition in DXT LIMS.

The Sample Master exists to define, version, reuse, and trace the material condition used in ExperimentRuns.

The primary experimental subject and measurement context in the semiconductor domain remains the wafer.

The governing relationship is:

`Sample → SampleRevision → Material Structure → Material Properties → Experiment Usage`

## Identity and revision

`Material` is a reusable material family or raw-material identity. `MaterialRevision` versions that master when required. `Sample` is the stable material-condition identity. `SampleRevision` is the registered version selected for use in an experiment. Request number, development item number, supplier, registration source, and Project context do not define Sample identity.

Composition, formulation, ratio, or managed descriptive attributes may lead users or future business rules to register a new SampleRevision. DXT LIMS does not currently determine revisions automatically. Its responsibility in this slice is to preserve the exact revision selected by an ExperimentRun.

## Structure and properties

Every SampleRevision has a `SAMPLE_REVISION` root node. `MaterialCompositionEdge` connects that root to `INTERMEDIATE` and `RAW_MATERIAL` nodes and connects intermediate nodes to their children. Ratios live on the relationship because they describe a component's amount in one parent. Raw nodes may be reused by more than one revision structure.

`MaterialPropertyValue` attaches to a node, so a raw material, intermediate blend, and final sample can each carry descriptive or characteristic attributes. Each value pins a `PropertyDefinition`; applicable node types validate broad compatibility and recommended node types guide entry without closing other configured uses. These properties do not imply observation lineage, scientific verification, or automatic material identity inference.

## Internal comparison utility

`MaterialFingerprintService` recursively normalizes structural level, semantic label, child order, ratios, and property definition identity/value/unit. Instance IDs and edge IDs are excluded. The deterministic FNV-1a value remains an internal mock comparison and testing utility. It is not a scientific identity mechanism and does not enforce revision creation.

`SampleRevisionComparisonService.compareSampleRevisions(previousRevisionId, currentRevisionId)` traverses both registered graphs and returns composition, property, and structural changes, an unchanged count, and deterministic comparison equality. Its UX purpose is to show what changed between registered Sample revisions. It does not scientifically determine whether two materials are identical.

## Wafer measurement boundary

Material properties are separate from the primary experiment `Measurement` domain. DTS, BCD, CD, thickness, defect results, and similar experiment results belong to the measured experimental subject, typically the wafer and its execution context. They remain attached to ExperimentRun in the current slice and are not moved into Sample Master.

## Experiment usage

`MaterialUsage` references an exact SampleRevision and one ExperimentRun. It answers which registered material condition was used when the wafer/process experiment was executed. Project is nullable usage context. In the mock slice D035 Rev.01 is used by DTS Improvement Run #3 and D035 Rev.02 by Run #4.

## Current UI boundary

The slice contains Sample Explorer, Sample Detail, Sample Revision Detail, and a non-persistent five-step Create Sample demonstration. It does not include governance, revision approval, Reference Studio, external request flows, recommendations, AI, Wafer Resolver, or Analysis Workspace.
