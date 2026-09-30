import { z } from 'zod';
import { idSchema, timestampSchema } from '../reference';
export const materialPropertyValueSchema = z
  .object({
    id: idSchema,
    materialNodeId: idSchema,
    propertyDefinitionId: idSchema,
    value: z.union([z.number(), z.string(), z.boolean()]),
    unit: z.string().nullable(),
    valueType: z.enum(['NUMBER', 'TEXT', 'BOOLEAN', 'IMAGE']),
    source: z.enum([
      'SUPPLIER',
      'INTERNAL_MEASUREMENT',
      'DIRECT_ENTRY',
      'CALCULATED',
    ]),
    effectiveAt: timestampSchema.nullable(),
    evidenceId: idSchema.nullable(),
  })
  .superRefine((p, ctx) => {
    const valid =
      p.valueType === 'NUMBER'
        ? typeof p.value === 'number'
        : p.valueType === 'BOOLEAN'
          ? typeof p.value === 'boolean'
          : typeof p.value === 'string';
    if (!valid)
      ctx.addIssue({
        code: 'custom',
        message: 'Property value does not match valueType',
      });
  });
export type MaterialPropertyValue = z.infer<typeof materialPropertyValueSchema>;
