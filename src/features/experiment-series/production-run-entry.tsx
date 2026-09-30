'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RunEntryView, previewUnits } from './run-entry-view';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import type {
  AuthoritativeRunPreview,
  RunCreationRequest,
} from '@/src/application/run-creation';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import {
  createdRunPath,
  type SeriesSlug,
  type RunCreationSource,
} from './run-entry-model';

export function ProductionRunEntry({
  seriesSlug,
  initialSource,
}: {
  seriesSlug: SeriesSlug;
  initialSource: RunCreationSource;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const router = useRouter();
  const [context, setContext] = useState<AuthoritativeRunPreview | null>(null);
  const [runs, setRuns] = useState<RunPlanningSnapshot[]>([]);
  const [source, setSource] = useState(initialSource);
  const [sourceId, setSourceId] = useState('');
  const [preview, setPreview] = useState<AuthoritativeRunPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const command = useRef<string | null>(null);
  const request: RunCreationRequest = {
    seriesSlug,
    source,
    ...(source === 'EXISTING_RUN' ? { sourceRunId: sourceId } : {}),
  };
  useEffect(() => {
    let active = true;
    void Promise.all([
      application.runs.previewCreation({ seriesSlug, source: 'STUDY_DEFAULT' }),
      application.repositories.run.listSnapshots(),
    ])
      .then(([base, all]) => {
        if (active) {
          setContext(base);
          setRuns(
            all
              .filter((r) => r.series.id === base.snapshot.series.id)
              .sort((a, b) => b.runNumber - a.runNumber),
          );
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setLoadError(true);
          setError(e instanceof Error ? e.message : 'Study unavailable.');
        }
      });
    return () => {
      active = false;
    };
  }, [application, seriesSlug]);
  function reset() {
    setPreview(null);
    setError(null);
    command.current = null;
  }
  async function review() {
    setBusy(true);
    setError(null);
    try {
      setPreview(await application.runs.previewCreation(request));
      command.current = null;
    } catch (e: unknown) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Preview unavailable.');
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!preview) return;
    command.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const saved = await application.runs.createFromPreview(
        request,
        preview.fingerprint,
        command.current,
      );
      router.push(createdRunPath(seriesSlug, saved.runNumber));
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Creation failed. Retry retains command identity.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (loadError) return <main role="alert">{t(error)}</main>;
  if (!context) return <main>{t('Loading persisted Study context…')}</main>;
  return (
    <RunEntryView
      seriesSlug={seriesSlug}
      context={context.snapshot}
      source={source}
      sourceId={sourceId}
      runs={runs}
      preview={preview?.snapshot ?? null}
      readiness={preview?.readiness}
      units={previewUnits(
        preview?.snapshot ?? null,
        application.repositories.configuration,
      )}
      busy={busy}
      error={error}
      onSource={(value) => {
        setSource(value);
        reset();
      }}
      onSourceId={(value) => {
        setSourceId(value);
        reset();
      }}
      onReview={() => void review()}
      onBack={reset}
      onCreate={() => void create()}
    />
  );
}
