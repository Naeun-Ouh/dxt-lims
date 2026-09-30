# DXT Material R&D Onboarding Proof v1

This proof onboards **Adhesion Material Optimization** through the frozen DXT grammar:

`Reference → Study Setup → Run Plan → Execution → Measurement → Evaluation`

It does not create a Material-specific application, resolver, lifecycle, or Engineering Grid.

## Identity and composition boundary

- **Raw Material** is a referenced ingredient (`Material A`, `Material B`, `Additive C`).
- **Formulation** is the exact versioned intermediate structure `F-BASE-01`.
- **Specimen** is a physical experiment subject represented by `SubjectRef(type=SPECIMEN)`.
- **Measurement** is an observation from that experiment subject or execution context.

`F-BASE-01` is represented by a stable `FormulationDefinition` and an immutable `FormulationRevision` with three structured components:

- Material A — 60 wt%
- Material B — 30 wt%
- Additive C — 10 wt%

`FormulationUsage` pins the exact revision in Run, Subject, and Operation context. Run 03 pins `formulation-f-base-01-r1`; a later Run may use Rev 2 without reinterpreting Run 03. Composition is not stored as an uncontrolled text Condition.

## Viscosity decision

Viscosity in this proof is an experimental result measured from the produced formulation/specimen. It is recorded through `MeasurementExecution → MeasurementDataset → MeasurementValue` at Subject grain.

The existing Raw Material/Sample descriptive property named Viscosity remains a separate Material Master property context. The two records are not interchangeable and no identity inference is performed.

## Execution boundary

Execution evidence uses `sourceSystem=MANUAL`, exact planned execution identity, timestamps, equipment context, and lab-note provenance. MES is not required. No wafer identity observation is fabricated for Specimens.

## Legacy compatibility boundary

Forward planning, execution, and measurement contracts use `subjectId`, `subjectIds`, and `subjectOperationIds`. Existing semiconductor records with legacy wafer-named fields are read only by named compatibility adapters and normalized once before entering shared workspace behavior. New generic writes do not produce the legacy keys.

## Change classification

### A. Configuration — 1 change set

Material R&D Reference definitions, subject type, area/profile, operations, measurement parameters, validation profiles, applicability rules, capability, projection profile, and exact Configuration Package v1.

### B. Domain adapter — 1 change set

SPECIMEN SubjectRef fixture, structured formulation projection, MANUAL execution evidence, Subject-level measurement records, target/evaluation/decision fixtures, and Material route composition.

### C. Generic framework fixes — 5 changes

1. Workspace accepts authoritative generic SubjectRefs when supplied.
2. Workspace context label comes from the scenario projection instead of a fixed semiconductor label.
3. Study Setup subject and observation-grain labels resolve from configured Subject Type metadata.
4. Subject-level Measurement presentation no longer exposes Site controls when Site evidence does not exist.
5. Planning validation and navigation fallback language use generic Subject/configuration terms.

### D. Core change — 0

No Experiment Lifecycle, Configuration Framework, SubjectRef, Material, Measurement, Evaluation, or Decision Core schema was changed.

## Genericity audit

- **Valid domain adapters:** PhysicalWafer projection, wafer identity resolver, semiconductor acquisition fixtures, Site detail for data that actually has Site observations.
- **Fixture/demo data:** PHOTO, CMP, Energy, Pressure, Slurry, Pad, Disk, Reticle, Material R&D, Specimen, Cure Temperature, Peel Force.
- **Reusable framework leaks fixed:** fixed `SEMICONDUCTOR R&D`, fixed `Wafer` in Study picker/Inspector, fixed `Subject / Site` measurement grain, unconditional Lot caption, semiconductor-specific navigation filler.
- **Contained compatibility records:** legacy wafer-named persisted/mock records remain available only through named semiconductor compatibility adapters until a future persistence migration.
