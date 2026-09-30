import { z } from 'zod';
/** Query dimensions narrow discoverability; none grants access or scientific authorship. */
export const resourceScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ACCESSIBLE') }),
  z.object({ kind: z.literal('MY') }),
  z.object({
    kind: z.enum(['DEPARTMENT', 'PART', 'TEAM', 'AREA', 'MODULE']),
    id: z.string().min(1).max(200),
  }),
]);
export const discoveryQuerySchema = z.object({
  scope: resourceScopeSchema.default({ kind: 'ACCESSIBLE' }),
  studySlug: z.string().min(1).max(200).optional(),
  text: z.string().trim().max(200).default(''),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).max(100000).default(0),
});
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;
export type RunSummary = {
  id: string;
  studyId: string;
  studySlug: string;
  studyName: string;
  number: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  stage: 'PLAN' | 'ACTUAL' | 'MEASUREMENT' | 'EVALUATION';
  subjects: number;
  delta: {
    items: { label: string; before: unknown; after: unknown }[];
    unchangedCount: number;
  };
  hasDecision: boolean;
  href: string;
};
export type DashboardProjection = {
  counts: {
    studies: number;
    runs: number;
    activeRuns: number;
    thisWeek: number;
    needReview: number;
    measurements: number;
    savedAnalyses: number;
  };
  continueWorking: RunSummary | null;
  recent: RunSummary[];
  calendar: RunSummary[];
  calendarTotal: number;
  groups: {
    dimension: 'DEPARTMENT' | 'PART' | 'TEAM' | 'AREA' | 'MODULE';
    id: string;
    studies: number;
    runs: number;
  }[];
  diagnostics: {
    principalId: string;
    projection: string;
    scope: DiscoveryQuery['scope'];
    policyVersion: string;
  };
};
export type SearchResult = {
  kind: 'STUDY' | 'RUN' | 'SAVED_ANALYSIS';
  id: string;
  name: string;
  href: string;
};
export type DiscoveryPage<T> = {
  items: T[];
  total: number;
  diagnostics?: DashboardProjection['diagnostics'];
};
