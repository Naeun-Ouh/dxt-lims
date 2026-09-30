# DXT LIMS Product Constitution

> DXT LIMS should guide the experiment, not constrain the experiment.
>
> Structure what can be common. Configure what must vary. Preserve what makes an experiment verifiable.

Reference definitions are reusable vocabulary rather than mandatory allowed-value lists. Series Defaults describe how an experimental line normally runs and may be partial. A Run materializes a complete independent snapshot and may modify, add, remove, or record ad-hoc configuration without leaving its Series. Scientific intent determines Series continuity.

Reference revisions are immutable. Historical snapshots retain the exact referenced revision even after a newer revision is registered. Create Next Run normally copies the previous Run; creating from a Series copies the Series Default; Load From Existing copies the selected configuration. These sources are never silently merged.

Ad-hoc configuration is valid research behavior. It retains a display name, value type, unit, semantic category, context, and available authorship metadata so repeated concepts can later be registered in Reference Studio. No promotion workflow is included now.

Storage preserves full snapshots while the UX emphasizes ExperimentDelta. Validation favors INFO and WARNING guidance; BLOCKING is reserved for records whose identity or revision references cannot be preserved coherently. Incomplete experiment plans may be saved with visible guidance.

Initial reuse consists of Series Defaults, Previous Runs, and Load From Existing. A separate ExperimentTemplate domain remains a future extension if stable cross-Series patterns emerge.

## Measurement preparation

Raw measurement data is immutable. An engineer exclusion is a separate decision with state, reason, actor, and time; it never deletes or overwrites a MeasurementValue. The latest decision defines one current effective prepared state for the underlying measurement data, while decision history and raw values remain inspectable across Run references.

MIN, MAX, MEAN, and MEDIAN are standard wafer representative statistics and use effective inputs by default. Source-provided summaries remain distinct from DXT-calculated summaries. Manual measurements are MeasurementValues with `MANUAL` acquisition at WAFER or SITE grain; they are not custom WaferMeasurementSummaries. Measurement preparation remains separate from future derived-data processing.

## Optional Data Preparation

Measurement Result records what was measured. Data Preparation is an optional workspace for how an engineer organizes or transforms those measurements for later analysis. Grouping creates a logical collection of references without copying, merging, or calculating source observations. Arithmetic preparation uses explicitly selected A/B datasets, matches identical Site identifiers, calculates matched sites even when counts differ, and produces a derived MeasurementDataset.

PreprocessingRecipe stores reusable structured arithmetic logic without dataset bindings. PreprocessingExecution records the selected inputs, effective/raw mode, Site matching summary, actor, time, and result dataset. Each derived MeasurementValue identifies its two source MeasurementValues. PRE/POST thickness is one use case of generic A+B, A-B, A×B, and A÷B arithmetic; it is not a special domain. Derived results may later participate in evaluation and analysis.

DXT LIMS is not a system for storing experiment results.

DXT LIMS structures and connects:

WHY
Purpose / Hypothesis

WHAT
Experiment Target

UNDER WHAT CONDITIONS
Sample / Material / Process Conditions

WHAT ACTUALLY HAPPENED
Execution

WHAT WAS OBSERVED
Measurement

HOW IT WAS INTERPRETED
Analysis

HOW IT WAS JUDGED
Evaluation Criteria / Decision

WHAT HAPPENS NEXT
Next Action

The purpose of this structure is twofold:

1. VERIFICATION
   Make past experiments reproducible, traceable, and explainable.

2. PREDICTION
   Make validated past experiments usable for comparison,
   learning, and selection of future experiments.

================================================
FOUR ARCHITECTURE PRINCIPLES
================================================

1. STRUCTURE WHAT CAN BE COMMON.

Do not standardize the scientific content of every experiment.
Standardize how experiments are represented.

Common structural concepts include:

Purpose
Hypothesis
Target
Condition
Execution
Measurement
Supporting attachments and source references
Evaluation
Decision

2. CONFIGURE WHAT MUST VARY.

Experiment domains are inherently different.

Photo, CMP, Cleaning, Device, Material, and other experiment
domains may have different:

conditions
measurements
evaluation criteria
material properties
analysis methods

Represent these differences through typed definitions and
configuration rather than hardcoded schemas.

3. PRESERVE WHAT MAKES AN EXPERIMENT VERIFIABLE.

A result is not sufficient by itself.

DXT LIMS must preserve enough context to answer:

Was the experiment performed as intended?

Where did this measurement come from?

How was this value calculated?

What was it compared against?

Why was the result judged Better, Similar, or Worse?

Could another engineer understand or reproduce the experiment?

4. CONNECT WHAT MAKES AN EXPERIMENT PREDICTABLE.

Prediction requires connected, verified experiment context.

The long-term data maturity path is:

Record
→ Structure
→ Connect
→ Verify
→ Compare
→ Analyze
→ Predict

Do not design AI features that bypass this progression.

================================================
PROJECT AND EXPERIMENT ARE DIFFERENT DOMAINS
================================================

A Project and an Experiment must not be treated as the same
management object.

Project answers:

WHY is this research activity organizationally necessary?
WHO owns it?
WHEN should it be completed?
WHAT business/research objective does it support?

Experiment answers:

WHAT are we trying to verify?
WHAT are we changing?
WHAT is controlled?
HOW was it executed?
WHAT was measured?
HOW was the result judged?

Therefore:

Project must NOT own ExperimentSeries through a mandatory projectId.

Replace the direct ownership assumption with an explicit relationship.

Conceptually:

Project
↕
ProjectExperimentRelation
↕
ExperimentSeries

This relationship should support:

- one Project referencing multiple ExperimentSeries
- one ExperimentSeries being relevant to multiple Projects
- ExperimentSeries existing without a Project

Examples of project-independent experiments:

Exploratory Experiment
Equipment Test
Reproducibility Test
Method Development
Emergency RCA
Idea Validation

Core principle:

"Projects explain why experiments matter to the organization.
Experiments provide the evidence behind project claims."

================================================
EXPERIMENT INTENT
================================================

The current ExperimentSeries model should be prepared to represent
scientific intent more explicitly.

Introduce an ExperimentIntent concept.

ExperimentIntent should support:

purpose
hypothesis
target

Do not force every field to be mandatory.

Example:

Purpose:
Improve DTS while maintaining BCD.

Hypothesis:
Increasing Energy will improve DTS without significantly degrading BCD.

Target:
DTS >= 4.4
BCD within target range

================================================
EVALUATION CRITERIA
================================================

Separate:

Target
Evaluation Criteria
Decision

Target describes the desired outcome.

Evaluation Criteria describes how success will be judged.

Decision records the engineer's actual judgment.

Example:

TARGET

DTS >= 4.4
BCD = 17 ± 0.2

EVALUATION CRITERIA

DTS >= 4.4
BCD between 16.8 and 17.2
3 Sigma <= 1.3

ACTUAL RESULT

DTS 4.5 PASS
BCD 17.1 PASS
3 Sigma 1.21 PASS

DECISION

Better

This relationship is important because DXT LIMS must eventually
be able to verify why a particular decision was made.

================================================
EXPERIMENT CONTEXT
================================================

ExperimentContext should eventually represent:

ExperimentContext

├─ Intent
│ ├─ Purpose
│ ├─ Hypothesis
│ └─ Target
│
├─ Project Context
│
├─ Conditions
│ ├─ Material / Sample
│ └─ Configurable Conditions
│
├─ Execution
│
├─ Measurement
│
├─ Supporting attachments / source references
│
├─ Evaluation Criteria
│
├─ Decision
│
└─ Next Action

ExperimentContext remains a composed integration/read model,
not a database ownership entity.

================================================
VERIFICATION AS A FUTURE PRODUCT CAPABILITY
================================================

Do not implement it yet, but preserve architecture for three
verification layers.

1. Execution Verification

INTENDED
vs
ACTUAL

Examples:

intended sample vs actual sample
intended operation vs actual operation
intended recipe vs actual recipe
intended wafer vs resolved physical wafer

2. Result Verification

Measurement provenance:

source
raw data
calculation
aggregation
outlier handling
unit
population
timestamp

3. Decision Verification

Decision
↕
Evaluation Criteria
↕
Actual Measurements and supporting references

The system should eventually be able to explain:

"Why was this experiment judged Better?"

================================================
PREDICTION IS DOWNSTREAM OF VERIFICATION
================================================

Future AI maturity should follow:

FIND
Find relevant previous experiments

↓

COMPARE
Compare experiment contexts

↓

EXPLAIN
Explain meaningful differences

↓

SUGGEST
Suggest what should be investigated next

↓

DESIGN
Support future experiment design

Do not treat generic LLM chat as the AI architecture.

================================================
CURRENT IMPLEMENTATION SCOPE
================================================

Do NOT implement these future capabilities now.

For this step:

1. Add this Product Constitution to project documentation.
2. Review the current domain model against these principles.
3. Refactor only where a current structural decision would directly
   contradict the Constitution.
4. Add ExperimentIntent if it can be introduced cleanly.
5. Decouple Project ownership from ExperimentSeries if currently mandatory.
6. Ensure EvaluationDefinition can support future criteria-based verification.
7. Update ExperimentContext accordingly.
8. Update mock data.
9. Make only minimal changes to the existing three screens.

Do NOT build new screens yet.

Do NOT implement:

- AI
- verification engine
- prediction
- Sample Master UI
- Reference Studio UI
- Wafer Resolver
- advanced statistical modeling, regression, optimization, prediction, and AI recommendation

## Analysis foundation

Analysis begins with selecting comparable wafers and composing their experimental context. Wafer is the primary comparison unit, including comparisons across Runs in the same Experiment Series. Analysis selects existing typed Conditions and wafer-level Results and retains Run, operation, recipe, equipment, material revision, acquisition, aggregation, and dataset provenance.

Saving an analysis preserves the exact wafer selection and references used at that moment. It does not duplicate raw values or expand when later Runs are created. Private and shared visibility control discovery of the saved analysis definition.

Integrated Analysis may compare wafers across Experiment Series. ExperimentSeries supplies management and provenance context but never constrains the analysis boundary. SavedAnalysis therefore has no owning Series and preserves structured Series/Run/Wafer references for every selected subject.

Series Targets/KPIs, actual wafer Results, Target Achievement, engineer Evaluation, Decision, and Next Action are separate concepts. A Series can record multiple summary results over time. Next Action uses a configured reference type and a Run-specific note rather than being embedded in Evaluation.

Operation is the primary experiment-condition context. Wafer and Position may specialize it; experiment Position and measurement Site remain distinct unless an explicit mapping exists. Assignments record whether an engineer intended a variable to be fixed or varied while Recipe, SampleRevision, Resource, and Parameter retain their explicit identities.

Measurement Plan states the intended Measurement Operation and Parameter. `MeasurementExecution` identifies each actual PRE, POST, or repeated acquisition, and acquisition provenance records INTERFACE, FILE_IMPORT, MANUAL, or DERIVED independently of planning.

The shared `FIXED/VARIED` vocabulary applies to parameter conditions, recipes, exact SampleRevision usage, and resources without merging those domain identities. Target Achievement remains a derived assessment over SeriesTarget and observed results. Saved Analysis pins dataset and representative-result references for reproducibility without copying observations. SITE is an analysis grain under a Wafer and never an independent experiment subject; Experiment Position has no automatic relationship to Measurement Site.

The Experiment Series Workspace answers what the Series seeks, its progress, its reusable default setup, what changed across Runs, and what has been learned. Overview, Targets, Default Setup, Runs, and multiple Summary Results remain sections of one Experiment Workspace. The page summarizes and links to Runs rather than duplicating their execution detail.

After completion, report:

1. Product Constitution file/location
2. changes made to ExperimentSeries
3. ExperimentIntent design
4. Project ↔ Experiment relationship design
5. Target / Evaluation Criteria / Decision distinction
6. updated ExperimentContext
7. updated Mermaid diagram
8. tests/build results

Stop after reporting.
