import { z } from 'zod';
import { idSchema, timestampSchema } from '../reference';
import { materialStatusSchema } from './material';
export const registrationSourceSchema = z.enum([
  'SUPPLIER_REQUEST',
  'INTERNAL_REQUEST',
  'DIRECT_REGISTRATION',
]);
export const sampleSchema = z.object({
  id: idSchema,
  sampleCode: idSchema,
  name: idSchema,
  materialId: idSchema.nullable(),
  supplierId: idSchema.nullable(),
  description: z.string().nullable(),
  status: materialStatusSchema,
  createdAt: timestampSchema,
});
export const sampleRevisionSchema = z.object({
  id: idSchema,
  sampleId: idSchema,
  revision: z.number().int().positive(),
  requestNumber: z.string().nullable(),
  developmentItemNumber: z.string().nullable(),
  registrationSource: registrationSourceSchema,
  effectiveAt: timestampSchema,
  status: materialStatusSchema,
  createdAt: timestampSchema,
});
export type Sample = z.infer<typeof sampleSchema>;
export type SampleRevision = z.infer<typeof sampleRevisionSchema>;
