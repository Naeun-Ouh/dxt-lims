import { z } from 'zod';
import { idSchema, timestampSchema } from '../reference';
export const projectSchema = z.object({
  id: idSchema,
  title: idSchema,
  purpose: z.string().nullable(),
  businessObjective: z.string().nullable(),
  owner: idSchema,
  status: z.enum(['Planned', 'Active', 'Completed', 'Paused']),
  targetDate: timestampSchema.nullable(),
  createdAt: timestampSchema,
});
export const projectExperimentRelationSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  experimentSeriesId: idSchema,
  relationType: z.enum(['Originating', 'Supporting', 'Related']),
  createdAt: timestampSchema,
});
export type Project = z.infer<typeof projectSchema>;
export type ProjectExperimentRelation = z.infer<
  typeof projectExperimentRelationSchema
>;
export type ProjectContext = {
  project: Project;
  relation: ProjectExperimentRelation;
};
