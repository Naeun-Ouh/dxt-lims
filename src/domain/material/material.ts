import { z } from 'zod';
import { idSchema, timestampSchema } from '../reference';
export const materialStatusSchema = z.enum(['Draft', 'Active', 'Retired']);
export const supplierSchema = z.object({ id: idSchema, name: idSchema });
export const materialSchema = z.object({
  id: idSchema,
  materialCode: idSchema,
  name: idSchema,
  categoryId: idSchema.nullable(),
  supplierId: idSchema.nullable(),
  description: z.string().nullable(),
  status: materialStatusSchema,
  createdAt: timestampSchema,
});
export const materialRevisionSchema = z.object({
  id: idSchema,
  materialId: idSchema,
  revision: z.number().int().positive(),
  effectiveAt: timestampSchema,
  status: materialStatusSchema,
  createdAt: timestampSchema,
});
export type Material = z.infer<typeof materialSchema>;
export type MaterialRevision = z.infer<typeof materialRevisionSchema>;
