import { z } from 'zod';
import type { RunPlanningSnapshot } from './planning-model';
import {
  confirmExperimentScope,
  createExperimentWorkspace,
} from './workspace-model';
import { variableDefinitions } from './variable-model';
import { normalizeLegacyPlanningStorage } from './legacy-planning-storage-compatibility';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';

const assignment = z.object({
  id: z.string(),
  kind: z.enum(['RECIPE', 'CONDITION', 'MATERIAL', 'RESOURCE']),
  label: z.string(),
  value: z.string(),
  referenceId: z.string(),
  processStepId: z.string().nullable(),
  subjectId: z.string().nullable(),
  positionId: z.string().nullable(),
  intentRole: z.enum(['FIXED', 'VARIED']),
  provenance: z.enum([
    'SERIES_DEFAULT',
    'PREVIOUS_RUN',
    'EXISTING_CONFIGURATION',
    'AD_HOC',
  ]),
});
const currentContextSchema = z.object({
  version: z.literal(1),
  runId: z.string(),
  ranges: z
    .array(
      z.object({
        runId: z.string(),
        startOperationId: z.string(),
        endOperationId: z.string(),
        operationIds: z.array(z.string()),
        subjectIds: z.array(z.string()),
      }),
    )
    .length(1),
  assignments: z.array(assignment),
  manualFocus: z.array(z.string()),
});
const contextSchema = z.preprocess(
  normalizeLegacyPlanningStorage,
  currentContextSchema,
);
export const planningStorageKey = (runId: string) =>
  `dxt-run-planning-v1:${runId}`;
// Browser-only mock persistence of references and planning assignments, never MES history.
export function restorePlanningContext(
  snapshot: RunPlanningSnapshot,
  raw: string | null,
  configurationRepository: ConfigurationRegistrySource,
) {
  if (!raw) return null;
  try {
    const data = contextSchema.parse(JSON.parse(raw));
    if (data.runId !== snapshot.id) return null;
    const model = createExperimentWorkspace(snapshot, configurationRepository);
    const candidates = (snapshot.candidateSubjects ?? snapshot.subjects).map(
      (subject) => subject.id,
    );
    for (const range of data.ranges) {
      const expected = confirmExperimentScope(
        model,
        range.startOperationId,
        range.endOperationId,
        range.subjectIds,
        candidates,
      );
      if (
        range.runId !== snapshot.id ||
        JSON.stringify(expected.operationIds) !==
          JSON.stringify(range.operationIds)
      )
        return null;
    }
    if (
      data.manualFocus.some(
        (id) => !model.operations.some((op) => op.id === id),
      )
    )
      return null;
    const allowed = [
      ...snapshot.assignments,
      ...model.operations.flatMap((op) => variableDefinitions(model, op.id)),
    ];
    if (
      new Set(data.assignments.map((a) => a.id)).size !==
        data.assignments.length ||
      data.assignments.some(
        (a) =>
          !allowed.some(
            (source) =>
              source.processStepId === a.processStepId &&
              source.kind === a.kind &&
              source.label === a.label &&
              source.referenceId === a.referenceId,
          ) ||
          (a.subjectId && !candidates.includes(a.subjectId)) ||
          (a.positionId &&
            !snapshot.assignments.some(
              (source) =>
                source.id === a.id &&
                source.positionId === a.positionId &&
                source.subjectId === a.subjectId,
            )),
      )
    )
      return null;
    return data;
  } catch {
    return null;
  }
}
