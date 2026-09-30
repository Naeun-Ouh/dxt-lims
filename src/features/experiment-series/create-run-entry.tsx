'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import { ProductionRunEntry } from './production-run-entry';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RunEntryView, previewUnits } from './run-entry-view';
import {
  createRunFromEntry,
  createdRunPath,
  scenarioForSeries,
  type RunCreationSource,
  type SeriesSlug,
} from './run-entry-model';
import { createInitialStudySetup } from './study-setup-model';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export default function CreateRunEntry(
  props: Parameters<typeof DemoRunEntry>[0],
) {
  const { application } = useDxtApplication();
  return application.configurationAuthoringBoundary ? (
    <ProductionRunEntry
      seriesSlug={props.seriesSlug}
      initialSource={props.initialSource ?? 'PREVIOUS_RUN'}
    />
  ) : (
    <DemoRunEntry {...props} />
  );
}

function DemoRunEntry({
  seriesSlug,
  initialPreview = false,
  initialSource = 'PREVIOUS_RUN',
}: {
  seriesSlug: SeriesSlug;
  initialPreview?: boolean;
  initialSource?: RunCreationSource;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { application } = useDxtApplication();
  const configuration = application.repositories.configuration;
  const sourceSnapshot = scenarioForSeries(seriesSlug);
  const [studySetup, setStudySetup] = useState(() =>
    createInitialStudySetup(seriesSlug, configuration),
  );
  const [setupLoaded, setSetupLoaded] = useState(false);
  const [setupError, setSetupError] = useState(false);
  const [source, setSource] = useState<RunCreationSource>(initialSource);
  const [showPreview, setShowPreview] = useState(initialPreview);
  useEffect(() => {
    let active = true;
    void application.studies
      .load(seriesSlug)
      .then((stored) => {
        if (active) {
          if (stored) setStudySetup(stored);
          setSetupLoaded(true);
        }
      })
      .catch(() => {
        if (active) setSetupError(true);
      });
    return () => {
      active = false;
    };
  }, [application, seriesSlug]);
  const commandId = useRef<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const createRun = async () => {
    commandId.current ??= crypto.randomUUID();
    setCreating(true);
    setCreationError(null);
    try {
      const run =
        source === 'STUDY_DEFAULT'
          ? await application.createRunFromStudy(
              seriesSlug,
              source,
              commandId.current,
            )
          : await application.runs.saveSnapshot(
              createRunFromEntry(seriesSlug, source, studySetup),
              commandId.current,
            );
      router.push(createdRunPath(seriesSlug, run.runNumber));
    } catch {
      setCreationError(
        'Run could not be created. Retry uses the same request identity.',
      );
    } finally {
      setCreating(false);
    }
  };
  if (setupError)
    return <main role="alert">{t('Study Setup could not be loaded.')}</main>;
  if (!setupLoaded) return <main>{t('Loading Study Setup…')}</main>;
  const previewSnapshot = showPreview
    ? createRunFromEntry(seriesSlug, source, studySetup)
    : null;
  return (
    <RunEntryView
      seriesSlug={seriesSlug}
      context={sourceSnapshot}
      source={source}
      preview={previewSnapshot}
      units={previewUnits(previewSnapshot, configuration)}
      busy={creating}
      error={creationError}
      onSource={(value) => {
        setSource(value);
        setShowPreview(false);
      }}
      onReview={() => setShowPreview(true)}
      onBack={() => setShowPreview(false)}
      onCreate={() => void createRun()}
    />
  );
}
