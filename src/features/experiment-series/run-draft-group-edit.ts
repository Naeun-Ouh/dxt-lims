import type { RunDraft } from '@/src/application/run-draft';
import type { ConditionScope } from '@/src/features/run-registration/operation-group-editor';
import type { OperationDesign } from '@/src/features/run-registration/operation-design';
type Item = RunDraft['operations'][number]['items'][number];
export function prepareGroupDraft(
  draft: RunDraft,
  id: () => string = () => crypto.randomUUID(),
): RunDraft {
  return {
    ...draft,
    recipeSourceBindings: draft.recipeSourceBindings?.filter((binding) => {
      const op = draft.operations.find(
        (o) => o.instanceId === binding.operationId,
      );
      return (
        !!op &&
        (!binding.subjectId ||
          draft.subjects.some((s) => s.id === binding.subjectId)) &&
        (!binding.groupId ||
          op.design?.groups.some((g) => g.id === binding.groupId))
      );
    }),
    planningContract: 'GROUPS_V2',
    operations: draft.operations.map((op) => ({
      ...op,
      instanceId: op.instanceId ?? id(),
      ...(op.design
        ? {
            design: {
              ...op.design,
              allocations: Object.fromEntries(
                draft.subjects.map((s) => [
                  s.id,
                  op.design!.allocations[s.id] ?? {
                    state:
                      op.design!.mode === 'COMMON' ? 'COMMON' : 'UNASSIGNED',
                  },
                ]),
              ),
            },
          }
        : {}),
    })),
  };
}
export const inScope = (item: Item, scope: ConditionScope) =>
  (item.groupId ?? null) === (scope.groupId ?? null) &&
  item.subjectId === (scope.subjectId ?? null);
export function replaceDraftScope(
  items: Item[],
  scope: ConditionScope,
  edited: Item[],
): Item[] {
  return [
    ...items.filter((item) => !inScope(item, scope)),
    ...edited
      .filter((item) => item.value.trim())
      .map((item) => ({
        ...item,
        groupId: scope.groupId ?? null,
        subjectId: scope.subjectId ?? null,
      })),
  ];
}
export function effectiveDraftItem(
  items: Item[],
  applicabilityId: string,
  scope: ConditionScope,
  design?: OperationDesign,
) {
  const groupId =
    scope.groupId ??
    (scope.subjectId
      ? design?.allocations[scope.subjectId]?.groupId
      : undefined);
  const matching = items.filter(
    (item) => item.applicabilityId === applicabilityId && item.value.trim(),
  );
  return (
    (scope.subjectId
      ? matching.find(
          (item) => item.subjectId === scope.subjectId && !item.groupId,
        )
      : undefined) ??
    (groupId
      ? matching.find((item) => item.groupId === groupId && !item.subjectId)
      : undefined) ??
    matching.find((item) => !item.subjectId && !item.groupId)
  );
}
export function updateDraftDesign(
  op: RunDraft['operations'][number],
  design: OperationDesign,
  removed: string[] = [],
) {
  return {
    ...op,
    design,
    subjectIds: Object.entries(design.allocations)
      .filter(([, a]) => a.state === 'ASSIGNED' || a.state === 'COMMON')
      .map(([id]) => id),
    items: op.items.filter((i) => !i.groupId || !removed.includes(i.groupId)),
  };
}
export function duplicateDraftGroupConditions(
  items: Item[],
  source: string,
  destination: string,
): Item[] {
  return [
    ...items.filter((i) => i.groupId !== destination),
    ...items
      .filter((i) => i.groupId === source)
      .map((i) => ({ ...i, groupId: destination })),
  ];
}
