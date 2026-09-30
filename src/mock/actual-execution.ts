import {
  executionEventSchema,
  waferIdentityObservationSchema,
} from '@/src/domain/execution';
import type { LegacySemiconductorExecutionEvidence } from '@/src/features/run-registration/legacy-semiconductor-execution-adapter';
import { plannedExecutionIdentity } from '@/src/features/run-registration/actual-execution-model';

type Scenario = 'PHOTO' | 'CMP';

function evidence(input: {
  scenario: Scenario;
  runId: string;
  subjectId: string;
  operationId: string;
  operation: string;
  equipment: string;
  recipe: string;
  slot: number;
  observedLotId: string;
  status?: 'OBSERVED' | 'COMPLETED' | 'INTERRUPTED';
  observedValues: Array<{ definitionId: string; value: string }>;
}): LegacySemiconductorExecutionEvidence {
  const code = `${input.scenario.toLowerCase()}-${input.slot}`;
  const physicalWaferId = `PW-${input.scenario}-${String(input.slot).padStart(2, '0')}`;
  const observedAt = `2026-09-10T${String(8 + input.slot).padStart(2, '0')}:00:00+09:00`;
  const sourceRecordReference = `MES-${input.scenario}-${input.operationId}-${String(input.slot).padStart(2, '0')}`;
  const identityObservation = waferIdentityObservationSchema.parse({
    id: `identity-${code}`,
    physicalWaferId,
    observedLotId: input.observedLotId,
    observedWaferId: `W${String(input.slot).padStart(2, '0')}`,
    slotPosition: String(input.slot),
    operationDefinitionId: null,
    observedOperationCode: input.operation,
    observedAt,
    sourceSystem: 'Mock MES Historian',
    sourceRecordReference,
    identityStatus: 'CONFIRMED',
  });
  const event = executionEventSchema.parse({
    id: `execution-${code}`,
    experimentRunId: input.runId,
    processStepId: input.operationId,
    plannedExecutionItemId: plannedExecutionIdentity(
      input.runId,
      input.subjectId,
      input.operationId,
    ),
    physicalWaferId,
    waferIdentityObservationId: identityObservation.id,
    observedOperation: input.operation,
    observedRecipe: input.recipe,
    equipment: input.equipment,
    startedAt: observedAt,
    endedAt: `2026-09-10T${String(8 + input.slot).padStart(2, '0')}:12:00+09:00`,
    executionStatus: input.status ?? 'COMPLETED',
    sourceSystem: 'Mock MES Historian',
    sourceRecordReference,
  });
  return {
    event,
    identityObservation,
    resolvedSubjectId: input.subjectId,
    observedValues: input.observedValues,
    retrievedAt: '2026-09-10T18:00:00+09:00',
  };
}

const photoValues = [34, 35, 35.8, 37];
const photoEquipment = ['EXP-03', 'EXP-02', 'EXP-03', 'EXP-03'];
const photoRecipe = ['EXP-R01', 'EXP-R01', 'EXP-R01', 'EXP-R02'];

const photo = photoValues.map((energy, index) =>
  evidence({
    scenario: 'PHOTO',
    runId: 'run-photo-18',
    subjectId: `PHO7814.${String(index + 1).padStart(2, '0')}`,
    operationId: 'photo-exposure',
    operation: 'EXPOSURE',
    equipment: photoEquipment[index],
    recipe: photoRecipe[index],
    slot: index + 1,
    observedLotId: index === 3 ? 'PHO7814-R' : 'PHO7814',
    observedValues: [
      { definitionId: 'condition-focus-v1', value: '0' },
      { definitionId: 'condition-reticle-v1', value: 'RET-01' },
      { definitionId: 'condition-material-v1', value: 'D035 Rev.2' },
      { definitionId: 'condition-energy-v1', value: String(energy) },
    ],
  }),
);

const cmpPressure = ['3.0 psi', '3.0 psi', '3.4 psi', '3.5 psi'];
const cmpEquipment = ['CMP-01', 'CMP-01', 'CMP-01', 'CMP-02'];

const cmp = cmpPressure.map((pressure, index) =>
  evidence({
    scenario: 'CMP',
    runId: 'run-cmp-12',
    subjectId: `RSA6420.${String(index + 1).padStart(2, '0')}`,
    operationId: 'cmp-process',
    operation: 'M2 CU CMP',
    equipment: cmpEquipment[index],
    recipe: 'CU-R07',
    slot: index + 1,
    observedLotId: index === 1 ? 'RSA6420-HOLD' : 'RSA6420',
    status: index === 3 ? 'INTERRUPTED' : 'COMPLETED',
    observedValues: [
      { definitionId: 'condition-pressure-v1', value: pressure },
      { definitionId: 'condition-slurry-v1', value: index < 2 ? 'A' : 'B' },
      { definitionId: 'condition-disk-v1', value: 'D1' },
      {
        definitionId: 'resource-pad-ic1000-r1',
        value: String.fromCharCode(65 + index),
      },
      { definitionId: 'condition-material-v1', value: 'D035 Rev.2' },
      { definitionId: 'condition-platen-v1', value: '90' },
      { definitionId: 'condition-flow-v1', value: '200' },
    ],
  }),
);

export const actualExecutionScenarios: Record<
  Scenario,
  LegacySemiconductorExecutionEvidence[]
> = { PHOTO: photo, CMP: cmp };
