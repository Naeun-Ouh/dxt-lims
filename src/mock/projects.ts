import {
  projectSchema,
  projectExperimentRelationSchema,
} from '@/src/domain/project';
export const projects = [
  projectSchema.parse({
    id: 'cu-cmp-development',
    title: 'Cu CMP Development',
    purpose: 'Improve process capability for the Cu CMP research program.',
    businessObjective: 'Support the next process-development milestone.',
    owner: 'Lee Seunghyun',
    status: 'Active',
    targetDate: '2026-10-30T18:00:00+09:00',
    createdAt: '2026-08-20T09:00:00+09:00',
  }),
];
export const projectRelations = [
  projectExperimentRelationSchema.parse({
    id: 'project-experiment-dts',
    projectId: projects[0].id,
    experimentSeriesId: 'dts-improvement',
    relationType: 'Supporting',
    createdAt: '2026-08-24T09:00:00+09:00',
  }),
];
