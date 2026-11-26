import { discoveryQuerySchema } from './discovery';

/** Material reference usage is not proof of a registered Sample Revision. */
export const materialUsageQuerySchema = discoveryQuerySchema.extend({});
export type MaterialAssignmentUsage = {
  assignmentId: string;
  runId: string;
  study: string;
  studySlug: string;
  runNumber: number;
  operation: string;
  subject: string | null;
  label: string;
  value: string;
  referenceId: string;
  intentRole: 'FIXED' | 'VARIED';
};
