import { z } from 'zod';
import { ApplicationError } from './repository-ports';

const identity = z.string().min(1).max(300);
export const recipeSourceBindingSchema = z
  .object({
    id: identity,
    operationId: identity,
    groupId: identity.nullable().default(null),
    subjectId: identity.nullable().default(null),
    recipeRevisionId: identity,
    parameterRevisionId: identity,
    state: z.enum(['SELECTED', 'CLEAR']),
    sampleRevisionId: identity.nullable(),
    sampleAccessDenied: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.groupId && value.subjectId)
      ctx.addIssue({ code: 'custom', message: 'Choose one source scope.' });
    if (
      value.state === 'CLEAR' &&
      (value.sampleRevisionId || value.sampleAccessDenied)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Clear must not contain a Sample revision.',
      });
    if (
      value.state === 'SELECTED' &&
      !value.sampleRevisionId &&
      !value.sampleAccessDenied
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Choose an exact Sample revision.',
      });
  });
export type RecipeSourceBinding = z.infer<typeof recipeSourceBindingSchema>;
export type RecipeSourceDescriptor = {
  packageVersionId: string;
  recipeRevisionId: string;
  parameterRevisionId: string;
  label: string;
};
export const recipeSourceCatalogCommandSchema = z.discriminatedUnion(
  'operation',
  [
    z.object({
      operation: z.literal('list'),
      packageVersionId: identity,
      recipeRevisionId: identity.optional(),
    }),
    z.object({
      operation: z.literal('register'),
      packageVersionId: identity,
      recipeRevisionId: identity,
      parameterRevisionId: identity,
    }),
  ],
);
export function recipeSourceScopeKey(binding: RecipeSourceBinding) {
  return JSON.stringify([
    binding.operationId,
    binding.groupId,
    binding.subjectId,
    binding.recipeRevisionId,
    binding.parameterRevisionId,
  ]);
}
/** No assignment means inherit. A denied explicit selection still stops inheritance. */
export function resolveRecipeSource(
  bindings: readonly RecipeSourceBinding[],
  query: {
    operationId: string;
    subjectId: string;
    groupId?: string | null;
    recipeRevisionId: string;
    parameterRevisionId: string;
  },
) {
  const matching = bindings.filter(
    (b) =>
      b.operationId === query.operationId &&
      b.recipeRevisionId === query.recipeRevisionId &&
      b.parameterRevisionId === query.parameterRevisionId,
  );
  const selected =
    matching.find((b) => b.subjectId === query.subjectId) ??
    matching.find((b) => !!query.groupId && b.groupId === query.groupId) ??
    matching.find((b) => !b.groupId && !b.subjectId);
  return selected
    ? {
        binding: selected,
        source: selected.subjectId
          ? ('SUBJECT' as const)
          : selected.groupId
            ? ('GROUP' as const)
            : ('OPERATION' as const),
      }
    : null;
}
export function validateRecipeSourceBindings(
  bindings: readonly RecipeSourceBinding[],
) {
  const identities = new Set<string>(),
    scopes = new Set<string>();
  for (const raw of bindings) {
    const b = recipeSourceBindingSchema.parse(raw),
      key = recipeSourceScopeKey(b);
    if (identities.has(b.id) || scopes.has(key))
      throw new ApplicationError(
        'VALIDATION',
        'A Source Parameter can have only one selection per scope.',
      );
    identities.add(b.id);
    scopes.add(key);
  }
}
/** Copy exact revision selections, not material codes or latest revisions. */
export function remapRecipeSourceBindings(
  bindings: readonly RecipeSourceBinding[] | undefined,
  operationIds: ReadonlyMap<string, string>,
  createId: (binding: RecipeSourceBinding, index: number) => string,
  groupIds?: ReadonlyMap<string, string>,
): RecipeSourceBinding[] | undefined {
  return bindings?.map((binding, index) => {
    const operationId = operationIds.get(binding.operationId);
    if (!operationId)
      throw new ApplicationError(
        'VALIDATION',
        'Copied Source selection has no matching Operation instance.',
      );
    const groupId = binding.groupId
      ? (groupIds?.get(binding.groupId) ?? binding.groupId)
      : null;
    return { ...binding, id: createId(binding, index), operationId, groupId };
  });
}
