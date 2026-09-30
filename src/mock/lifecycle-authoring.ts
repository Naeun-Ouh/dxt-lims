import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';
import { scenarioForSeries } from '@/src/features/experiment-series/run-entry-model';
import { materialEvaluationTargetBindings } from '@/src/features/material-rd/material-rd-scenario';
import type { LifecycleAuthoringProfile } from '@/src/features/run-registration/lifecycle-authoring';
import { engineeringGridEvaluationScenarios } from './engineering-grid-evaluations';
import { definitions } from './reference';

function profile(
  studyId: SeriesSlug,
  targetBindings: LifecycleAuthoringProfile['targetBindings'],
  actor: string,
): LifecycleAuthoringProfile {
  const snapshot = scenarioForSeries(studyId);
  return {
    studyId,
    studyLabel: snapshot.series.name,
    workspaceContextLabel: snapshot.workspaceContextLabel ?? 'R&D',
    catalog: definitions,
    targetBindings,
    actor,
  };
}

export const lifecycleAuthoringProfiles: Record<
  SeriesSlug,
  LifecycleAuthoringProfile
> = {
  'dts-improvement': profile(
    'dts-improvement',
    engineeringGridEvaluationScenarios.PHOTO.bindings,
    'Lee Seunghyun',
  ),
  'cmp-stability': profile(
    'cmp-stability',
    engineeringGridEvaluationScenarios.CMP.bindings,
    'Park Mina',
  ),
  'adhesion-material-optimization': profile(
    'adhesion-material-optimization',
    materialEvaluationTargetBindings,
    'Kim Jiwon',
  ),
};
