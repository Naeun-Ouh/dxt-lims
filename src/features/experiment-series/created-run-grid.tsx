'use client';
import { useLocale } from '@/src/shared/i18n/locale';


import { useEffect, useMemo, useState } from 'react';
import EngineeringGrid from '@/src/features/run-registration/engineering-grid';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import type { SeriesSlug } from './run-entry-model';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export default function CreatedRunGrid({
  seriesSlug,
  runNumber,
  explicitAssignments = false,
}: {
  seriesSlug: SeriesSlug;
  runNumber?: number;
  explicitAssignments?: boolean;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const configuration = application.repositories.configuration;
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<RunPlanningSnapshot | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void application.runs.loadCreated(seriesSlug, runNumber).then((stored) => {
      if (!stored) throw new Error('Run not found');
      if (active) setSnapshot(stored);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, [application, runNumber, seriesSlug]);
  const model = useMemo(() => {
    if (!snapshot) return null;
    const workspace = createExperimentWorkspace(snapshot, configuration);
    return {
      ...workspace,
      explicitAssignments,
      subjects: snapshot.subjects,
    };
  }, [configuration, snapshot, explicitAssignments]);
  if (!hydrated) return <main className="loading-state">{t("Loading Run…")}</main>;
  if (error || !model) return <main role="alert">{t("Saved Run could not be loaded.")}</main>;
  return (
    <EngineeringGrid
      model={model}
      seriesSlug={seriesSlug}
      returnHref={`/series/${seriesSlug}`}
      authoringProfile={lifecycleAuthoringProfiles[seriesSlug]}
    />
  );
}
