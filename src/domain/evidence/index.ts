import { z } from 'zod';
export const evidenceSchema = z
  .object({
    id: z.string(),
    experimentRunId: z.string().min(1).nullable(),
    sampleRevisionId: z.string().min(1).nullable().default(null),
    type: z.enum(['Chart', 'Image', 'Wafer Map', 'Report', 'Engineer Note']),
    title: z.string(),
    sourceSystem: z.string(),
    snapshotPath: z.string(),
    description: z.string(),
  })
  .refine(
    (e) => e.experimentRunId !== null || e.sampleRevisionId !== null,
    'Evidence needs a run or sample revision owner',
  );
export type Evidence = z.infer<typeof evidenceSchema>;
