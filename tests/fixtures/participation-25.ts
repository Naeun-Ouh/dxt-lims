import {
  runPlanningScenarios,
  type RunPlanningSnapshot,
} from '../../src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '../../src/features/run-registration/workspace-model';
import { configurationRepository } from '../../src/mock/configuration-packages';

/** Isolated membership topology. Contains no acquired scientific results. */
export function participation25(): RunPlanningSnapshot {
  const source = structuredClone(runPlanningScenarios.PHOTO);
  const model = createExperimentWorkspace(source, configurationRepository);
  const subjects = source.candidateSubjects!;
  const steps = ['P', 'A', 'B', 'C', 'D'].map((id) => {
    const original = model.operations.find(
      (o) => o.id === (id === 'D' ? 'photo-cdsem' : 'photo-exposure'),
    )!;
    const step = source.steps.find((s) => s.id === original.id)!;
    return {
      ...step,
      id,
      label: id,
      operationDefinitionId: original.operationDefinitionRevisionId,
      context: {
        areaDefinitionRevisionId: original.areaDefinitionRevisionId,
        equipmentReferenceId: original.equipmentReferenceId,
        moduleReferenceId: original.moduleReferenceId,
        areaLabel: original.area,
        equipmentLabel: original.equipment,
        moduleLabel: original.module,
      },
    };
  });
  return {
    ...source,
    id: 'isolated-participation-25',
    subjects,
    steps,
    assignments: [],
    measurements: [
      {
        ...source.measurements[0],
        id: 'measurement-D',
        stepId: 'D',
        parameterDefinitionIds: ['parameter-bcd-v1'],
        parameters: ['BCD'],
      },
    ],
    subjectOperationIds: Object.fromEntries(
      subjects.map((s, i) => [
        s.id,
        i >= 15 ? [] : ['P', i >= 10 ? 'C' : i % 2 === 0 ? 'A' : 'B', 'D'],
      ]),
    ),
  };
}
