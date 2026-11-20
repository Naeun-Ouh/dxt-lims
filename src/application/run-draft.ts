import { z } from 'zod';
import { measurementPointSchema } from '@/src/domain/reference';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { BootstrapOperationOption } from './study-bootstrap';
import { ApplicationError } from './repository-ports';
import { validateStudySetupItem } from '@/src/features/experiment-series/study-setup-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';

const id = z.string().trim().min(1).max(200);
/** Transient authoring input, not a persistent domain entity. No scientific criteria accepted. */
export const runDraftSchema = z
  .object({
    subjects: z.array(z.object({ id, displayLabel: id }).strict()).max(500),
    operations: z
      .array(
        z
          .object({
            optionId: id,
            subjectIds: z.array(id).max(500),
            point: measurementPointSchema.nullable(),
            parameterIds: z.array(id).max(500),
            items: z
              .array(
                z
                  .object({
                    applicabilityId: id,
                    value: z.string().max(4000),
                    intentRole: z.enum(['FIXED', 'VARIED']),
                    subjectId: id.nullable(),
                  })
                  .strict(),
              )
              .max(10000),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();
export type RunDraft = z.infer<typeof runDraftSchema>;
const fail = (message: string): never => {
  throw new ApplicationError('VALIDATION', message);
};

/** Resolve all metadata from exact server choices. Never trust client labels, IDs or pins. */
export function materializeRunDraft(
  base: RunPlanningSnapshot,
  raw: RunDraft,
  options: BootstrapOperationOption[],
  catalog: ReferenceCatalog,
  subjectKind: 'WAFER' | 'SPECIMEN',
): RunPlanningSnapshot {
  const draft = runDraftSchema.parse(raw);
  const subjects = new Set(draft.subjects.map((s) => s.id));
  if (subjects.size !== draft.subjects.length)
    fail('Duplicate Subject identity.');
  const kind = subjectKind;
  const snapshot: RunPlanningSnapshot = {
    ...structuredClone(base),
    subjects: draft.subjects.map((s) => ({ ...s, type: kind })),
    candidateSubjects: undefined,
    steps: [],
    assignments: [],
    measurements: [],
    subjectOperationIds: Object.fromEntries(
      draft.subjects.map((s) => [s.id, []]),
    ),
  };
  draft.operations.forEach((selected, index) => {
    const option = options.find((o) => o.id === selected.optionId);
    if (!option)
      return fail('Operation is not eligible for this exact configuration.');
    if (
      new Set(selected.subjectIds).size !== selected.subjectIds.length ||
      selected.subjectIds.some((s) => !subjects.has(s))
    )
      fail('Check Operation participation.');
    const op = option.operation,
      stepId = `${base.id}-step-${index + 1}`;
    snapshot.steps.push({
      id: stepId,
      label: op.label,
      role: op.role,
      operationDefinitionId: op.operationDefinitionRevisionId,
      measurementPoint: selected.point,
      context: structuredClone(op.context),
    });
    for (const s of selected.subjectIds)
      snapshot.subjectOperationIds[s].push(stepId);
    const itemKeys = new Set<string>();
    for (const item of selected.items) {
      const key = JSON.stringify([item.applicabilityId, item.subjectId]);
      if (itemKeys.has(key)) fail('Duplicate assignment.');
      itemKeys.add(key);
      if (item.subjectId && !selected.subjectIds.includes(item.subjectId))
        fail('Conditions must belong to participating Subjects.');
      const def = op.items.find(
        (d) => d.applicabilityId === item.applicabilityId,
      );
      if (!def) return fail('Assignment is not applicable.');
      // Empty/invalid values remain visible in Preview readiness; Create rejects them.
      let referenceId = def.referenceId;
      if (def.editor === 'REFERENCE')
        referenceId =
          def.options.find((o) => o.value === item.value)?.referenceId ??
          def.referenceId;
      snapshot.assignments.push({
        id: `${stepId}-assignment-${snapshot.assignments.length + 1}`,
        processStepId: stepId,
        subjectId: item.subjectId,
        positionId: null,
        label: def.label,
        kind: def.kind,
        referenceId,
        value: item.value,
        intentRole: item.intentRole,
        provenance: 'AD_HOC',
      });
    }
    if (op.role === 'PROCESS') {
      if (selected.point || selected.parameterIds.length)
        fail('Process Operation cannot claim a Measurement plan.');
    } else {
      if (selected.items.length) fail('Assignment is not applicable.');
      if (
        new Set(selected.parameterIds).size !== selected.parameterIds.length ||
        selected.parameterIds.some((p) => !option.parameterIds.includes(p))
      )
        fail('Measurement parameter or point is incompatible.');
      if (selected.point && selected.parameterIds.length)
        snapshot.measurements.push({
          id: `${stepId}-measurement`,
          stepId,
          measurementOperationDefinitionId: op.operationDefinitionRevisionId,
          operation: op.label,
          parameterDefinitionIds: selected.parameterIds,
          parameters: selected.parameterIds.map(
            (id) => catalog.parameters.find((p) => p.id === id)!.name,
          ),
          point: selected.point,
        });
    }
  });
  return snapshot;
}
export function draftValueProblems(
  draft: RunDraft,
  options: BootstrapOperationOption[],
): string[] {
  const missing: string[] = [];
  draft.operations.forEach((op, index) => {
    for (const item of op.items) {
      const def = options
        .find((o) => o.id === op.optionId)
        ?.operation.items.find(
          (d) => d.applicabilityId === item.applicabilityId,
        );
      if (!def) continue;
      try {
        validateStudySetupItem(def, item.value);
      } catch {
        missing.push(
          `Check the execution condition: {0}.|${index + 1} · ${def.label}`,
        );
      }
    }
  });
  return missing;
}

/** Copy only execution content; an unrepresentable source fails rather than losing data. */
export function draftFromSnapshot(
  snapshot: RunPlanningSnapshot,
  options: BootstrapOperationOption[],
): RunDraft {
  if (snapshot.assignments.some((a) => !a.processStepId))
    fail('This source contains unscoped conditions. Choose another source.');
  return {
    subjects: snapshot.subjects.map(({ id, displayLabel }) => ({
      id,
      displayLabel,
    })),
    operations: snapshot.steps.map((step) => {
      const option = options.find(
        (o) =>
          o.operation.operationDefinitionRevisionId ===
            step.operationDefinitionId &&
          o.operation.context?.equipmentReferenceId ===
            step.context?.equipmentReferenceId &&
          o.operation.context?.moduleReferenceId ===
            step.context?.moduleReferenceId,
      );
      if (!option)
        return fail('Operation is not eligible for this exact configuration.');
      return {
        optionId: option.id,
        subjectIds: snapshot.subjects
          .filter((s) => snapshot.subjectOperationIds[s.id]?.includes(step.id))
          .map((s) => s.id),
        point: step.measurementPoint,
        parameterIds: snapshot.measurements
          .filter((m) => m.stepId === step.id)
          .flatMap((m) => m.parameterDefinitionIds),
        items: snapshot.assignments
          .filter((a) => a.processStepId === step.id)
          .map((a) => {
            if (a.positionId)
              return fail('This source contains position-specific conditions.');
            const d = option.operation.items.find(
              (d) =>
                d.kind === a.kind &&
                (d.referenceId === a.referenceId ||
                  d.options.some((o) => o.referenceId === a.referenceId)),
            );
            if (!d) return fail('Assignment is not applicable.');
            return {
              applicabilityId: d.applicabilityId,
              value: a.value,
              intentRole: a.intentRole,
              subjectId: a.subjectId,
            };
          }),
      };
    }),
  };
}
