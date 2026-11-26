import type { RecipeSourceBinding } from '@/src/application/recipe-source';
/** Explicit group condition copy includes its exact Source selections, with new identities. */
export function duplicateGroupBindings(
  bindings: RecipeSourceBinding[],
  operationId: string,
  source: string,
  destination: string,
  id: () => string = () => crypto.randomUUID(),
) {
  return [
    ...bindings.filter(
      (b) =>
        !(
          b.operationId === operationId &&
          b.groupId === destination &&
          !b.subjectId
        ),
    ),
    ...bindings
      .filter(
        (b) =>
          b.operationId === operationId && b.groupId === source && !b.subjectId,
      )
      .map((b) => ({ ...b, id: id(), groupId: destination })),
  ];
}
