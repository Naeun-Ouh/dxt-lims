import { runPlanningScenarios } from '@/src/features/run-registration/planning-model';

export type PlanningWorkspaceScenario = {
  snapshot: (typeof runPlanningScenarios)[keyof typeof runPlanningScenarios];
  scopeStartOperationId: string;
  scopeEndOperationId: string;
  seriesHref: string;
};

export const planningWorkspaceScenarios: Record<
  keyof typeof runPlanningScenarios,
  PlanningWorkspaceScenario
> = {
  PHOTO: {
    snapshot: runPlanningScenarios.PHOTO,
    scopeStartOperationId: 'photo-coat',
    scopeEndOperationId: 'photo-cdsem',
    seriesHref: '/series/dts-improvement',
  },
  CMP: {
    snapshot: runPlanningScenarios.CMP,
    scopeStartOperationId: 'cmp-thk-pre',
    scopeEndOperationId: 'cmp-thk-post',
    seriesHref: '/series/cmp-stability',
  },
};
