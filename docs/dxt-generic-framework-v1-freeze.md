# DXT Generic Experiment Framework v1 Freeze

## 1. Frozen generic experiment grammar

DXT v1 uses one lifecycle grammar across configured R&D domains:

`Reference -> Study Setup -> Run Plan -> Execution -> Measurement -> Evaluation -> Decision -> Next Action`

The generic axis is `SubjectRef -> Operation`. FIXED and VARIED remain explicit experimental intent. Measurement observations, target assessment, human judgment, and decision remain separate facts or projections.

## 2. Configuration boundary

Versioned Configuration Packages define available Subject types, Operations, definitions, validation, applicability, default intent, and presentation metadata. A Run pins one exact package version. Resolution never substitutes a newer package for a historical Run.

## 3. Subject specialization

Reusable workspace contracts use `subjectId`, `subjectIds`, and `subjectOperationIds`. `SPECIMEN` and `WAFER` are Subject specializations. A Specimen is not represented as a renamed Wafer. Site remains optional observation grain under a Subject and never becomes a top-level experimental Subject.

## 4. Material domain boundary

Material concepts specialize DXT outside generic Core:

- `RawMaterial`: stable ingredient/reference identity.
- `FormulationDefinition`: stable formulation concept.
- `FormulationRevision`: immutable structured composition version.
- `FormulationUsage`: exact revision used by a Run, optional Subject, and optional Operation.
- `Specimen`: physical experimental Subject produced, treated, or measured.

Raw Material, Formulation, Specimen, and Measurement are distinct identities.

## 5. Formulation model

A FormulationRevision contains ordered components. Each component records `rawMaterialRef`, numeric `amount`, `unit`, sequence, and an optional role. Composition is never stored as one uncontrolled text condition.

`MaterialUsage` remains the existing SampleRevision-oriented usage model. Reusing it for a FormulationRevision would distort its contract, so v1 adds the minimum explicit `FormulationUsage` type rather than creating an ambiguous union. Both usages share experiment context and explicit intent, but reference different immutable material identities.

## 6. Historical revision and pinning

A released FormulationRevision is deeply immutable. Any ingredient, amount, unit, or ordering change creates the next revision under the same FormulationDefinition. Run 03 can pin F-BASE-01 Rev 1 while a later Study default and Run 04 use Rev 2. The later revision cannot reinterpret Run 03.

## 7. Legacy wafer-field containment

Forward planning and measurement contracts contain only Subject terminology. Legacy `waferStepIds`, `waferSubjectId`, and `waferSubjectIds` are read only by named compatibility adapters, normalized once, and never written by the generic workspace. There is no dual authoritative truth.

The compatibility boundary consists of:

- `legacy-semiconductor-planning-adapter.ts`
- `legacy-planning-storage-compatibility.ts`
- `legacy-semiconductor-execution-adapter.ts`
- `legacy-wafer-compatibility.ts`

## 8. Valid semiconductor-specific adapters

`PhysicalWafer`, `WaferIdentityObservation`, MES evidence, Lot/Slot identity, wafer-specific fixtures, and Site observations remain valid semiconductor-domain concepts. They may exist inside semiconductor adapters and fixtures. The adapters project them into generic Subject, execution identity context, and measurement contracts.

The final terminology audit classifies the remaining hits as follows:

- **Domain/adapter:** `PhysicalWafer`, `WaferIdentityObservation`, MES execution evidence, and `Site` measurement grain.
- **Fixture/demo:** PHOTO/CMP scenario identifiers and their Lot, Slot, and wafer-shaped mock records.
- **Generic framework leak:** none in the forward planning, execution, measurement, or shared workspace contracts. Legacy wafer-shaped reads are confined to the four compatibility files listed above.

## 9. Prohibited future generic leaks

New reusable contracts must not introduce `waferSubjectId`, `waferSubjectIds`, `waferStepIds`, required Lot/Slot fields, scenario-name branching, or mandatory Site grain. New writes use Subject contracts. Domain-specific identities enter shared surfaces only through explicit adapters or configuration projections.

## 10. Deferred items

The following remain outside v1: enterprise formulation authoring UI, formulation approval workflow, reaction chemistry, stoichiometry, formulation optimization, full persistence migration of legacy wafer fields, advanced Material Master governance, enterprise physical-wafer resolution, and Analysis.

## Freeze assessment

Core experiment lifecycle semantics did not change. Formulation is now a first-class Material-domain concept, historical formulation usage is revision-pinned, and reusable workspace behavior consumes Subject-oriented planning, execution, and measurement contracts. Existing legacy record schemas remain available only through compatibility boundaries until a future persistence migration.
