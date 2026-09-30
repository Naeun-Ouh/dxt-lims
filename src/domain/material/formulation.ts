import { z } from 'zod';
import { experimentalVariableRoleSchema } from '../experiment/experimental-intent';
import { idSchema, timestampSchema } from '../reference';

export const rawMaterialSchema = z.object({
  id: idSchema,
  code: idSchema,
  name: z.string().min(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']),
});

export const formulationDefinitionSchema = z.object({
  id: idSchema,
  code: idSchema,
  name: z.string().min(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']),
});

export const formulationComponentSchema = z.object({
  rawMaterialRef: idSchema,
  amount: z.number().nonnegative(),
  unit: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  role: z.string().min(1).nullable().default(null),
});

export const formulationRevisionSchema = z
  .object({
    id: idSchema,
    formulationDefinitionId: idSchema,
    revision: z.number().int().positive(),
    components: z.array(formulationComponentSchema).min(1),
    status: z.enum(['DRAFT', 'RELEASED', 'RETIRED']),
    createdAt: timestampSchema,
  })
  .superRefine((revision, context) => {
    const componentRefs = new Set<string>();
    const sequences = new Set<number>();
    for (const component of revision.components) {
      if (componentRefs.has(component.rawMaterialRef))
        context.addIssue({
          code: 'custom',
          message: `Duplicate formulation component ${component.rawMaterialRef}`,
        });
      if (sequences.has(component.sequence))
        context.addIssue({
          code: 'custom',
          message: `Duplicate formulation sequence ${component.sequence}`,
        });
      componentRefs.add(component.rawMaterialRef);
      sequences.add(component.sequence);
    }
  });

export const formulationUsageSchema = z.object({
  id: idSchema,
  formulationRevisionId: idSchema,
  experimentRunId: idSchema,
  subjectId: idSchema.nullable().default(null),
  operationId: idSchema.nullable().default(null),
  intentRole: experimentalVariableRoleSchema.default('FIXED'),
  role: z.enum(['Candidate', 'Reference', 'Baseline', 'Control']),
});

export type RawMaterial = z.infer<typeof rawMaterialSchema>;
export type FormulationDefinition = z.infer<
  typeof formulationDefinitionSchema
>;
export type FormulationComponent = z.infer<typeof formulationComponentSchema>;
export type FormulationRevision = z.infer<typeof formulationRevisionSchema>;
export type FormulationUsage = z.infer<typeof formulationUsageSchema>;

function immutable<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) immutable(child);
  }
  return value;
}

/** Released revisions are immutable values; a composition change creates a new revision. */
export function releaseFormulationRevision(
  input: z.input<typeof formulationRevisionSchema>,
): Readonly<FormulationRevision> {
  const revision = formulationRevisionSchema.parse({
    ...input,
    status: 'RELEASED',
  });
  return immutable(revision);
}

export function createNextFormulationRevision(
  previous: FormulationRevision,
  input: {
    id: string;
    components: FormulationComponent[];
    createdAt: string;
  },
): Readonly<FormulationRevision> {
  return releaseFormulationRevision({
    id: input.id,
    formulationDefinitionId: previous.formulationDefinitionId,
    revision: previous.revision + 1,
    components: input.components,
    status: 'RELEASED',
    createdAt: input.createdAt,
  });
}
