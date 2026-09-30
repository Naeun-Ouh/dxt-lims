import { z } from 'zod';
import { idSchema } from '../reference';
export const materialNodeTypeSchema = z.enum([
  'RAW_MATERIAL',
  'INTERMEDIATE',
  'SAMPLE_REVISION',
]);
export const materialNodeSchema = z.object({
  id: idSchema,
  nodeType: materialNodeTypeSchema,
  referenceId: idSchema,
  label: idSchema,
});
export const materialCompositionEdgeSchema = z.object({
  id: idSchema,
  parentNodeId: idSchema,
  childNodeId: idSchema,
  ratioValue: z.number().nullable(),
  ratioUnit: z.string().nullable(),
  order: z.number().int().nonnegative(),
});
export type MaterialNodeType = z.infer<typeof materialNodeTypeSchema>;
export type MaterialNode = z.infer<typeof materialNodeSchema>;
export type MaterialCompositionEdge = z.infer<
  typeof materialCompositionEdgeSchema
>;
