import { z } from 'zod';
import { evidenceSchema } from '../evidence';
import { idSchema } from '../reference';
import {
  materialRevisionSchema,
  materialSchema,
  supplierSchema,
} from './material';
import { sampleRevisionSchema, sampleSchema } from './sample';
import { materialCompositionEdgeSchema, materialNodeSchema } from './structure';
import { materialPropertyValueSchema } from './property';
import { experimentalVariableRoleSchema } from '../experiment/experimental-intent';
export const materialUsageSchema = z.object({
  id: idSchema,
  sampleRevisionId: idSchema,
  experimentRunId: idSchema,
  waferSubjectId: idSchema.nullable().default(null),
  processStepId: idSchema.nullable().default(null),
  intentRole: experimentalVariableRoleSchema.default('FIXED'),
  projectId: idSchema.nullable(),
  role: z.enum(['Candidate', 'Reference', 'Baseline', 'Control']),
});
export const materialCatalogSchema = z.object({
  suppliers: z.array(supplierSchema),
  materials: z.array(materialSchema),
  materialRevisions: z.array(materialRevisionSchema),
  samples: z.array(sampleSchema),
  sampleRevisions: z.array(sampleRevisionSchema),
  nodes: z.array(materialNodeSchema),
  compositionEdges: z.array(materialCompositionEdgeSchema),
  propertyValues: z.array(materialPropertyValueSchema),
  evidence: z.array(evidenceSchema).default([]),
});
export type MaterialUsage = z.infer<typeof materialUsageSchema>;
export type MaterialCatalog = z.infer<typeof materialCatalogSchema>;
