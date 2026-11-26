'use client';

import { useEffect, useRef, useState } from 'react';
import type { RunPlanningSnapshot } from './planning-model';
import {
  authoringId,
  createEmptyLifecycleState,
  nowLocalIso,
  type ActualExecutionCommand,
  type DecisionCommand,
  type EvaluationCommand,
  type LifecycleAuthoringProfile,
  type ManualMeasurementCommand,
} from './lifecycle-authoring';
import type { ExperimentWorkspaceModel } from './workspace-model';
import { lifecycleErrorMessage } from './lifecycle-feedback';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export function useLifecycleAuthoring(
  model: ExperimentWorkspaceModel,
  profile: LifecycleAuthoringProfile | undefined,
  enabled = true,
  stage: 'ACTUAL' | 'MEASUREMENT' | 'ALL' = 'ALL',
  refresh = 0,
) {
  const { application } = useDxtApplication();
  const production = !!application.configurationAuthoringBoundary;
  const [state, setState] = useState(() =>
    profile || production
      ? createEmptyLifecycleState(model.snapshot, profile)
      : null,
  );

  const [load, setLoad] = useState<{
    key: string;
    error: string | null;
  } | null>(null);
  const loadKey = `${model.snapshot.id}:${stage}:${refresh}`;
  const pendingMeasurement = useRef<{
    request: string;
    command: ManualMeasurementCommand;
  } | null>(null);
  const pendingEvaluation = useRef<{
    request: string;
    command: EvaluationCommand;
  } | null>(null);
  const pendingDecision = useRef<{
    request: string;
    command: DecisionCommand;
  } | null>(null);
  const pendingNextRun = useRef<string | null>(null);
  const pendingActual = useRef<{ request: string; id: string } | null>(null);
  useEffect(() => {
    if ((!profile && !production) || !enabled) return;
    let active = true;
    void (
      production
        ? application.loadPersistedLifecycle(model.snapshot.id, stage)
        : application.loadLifecycle(model.snapshot, profile!, stage)
    )
      .then((next) => {
        if (active) {
          setState(next);
          setLoad({ key: loadKey, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active)
          setLoad({
            key: loadKey,
            error: lifecycleErrorMessage(error, 'load'),
          });
      });
    return () => {
      active = false;
    };
  }, [
    application,
    model.snapshot,
    profile,
    enabled,
    stage,
    loadKey,
    production,
  ]);

  if ((!profile && !production) || !state) return null;
  const commit = (next: typeof state) => {
    setState(next);
    return next;
  };
  return {
    state,
    profile,
    loading: enabled && load?.key !== loadKey,
    error: load?.key === loadKey ? load.error : null,
    async recordActual(command: Omit<ActualExecutionCommand, 'id'>) {
      if (load?.key !== loadKey || load.error)
        throw new Error('Load Actual before recording execution.');
      const request = JSON.stringify(command);
      if (pendingActual.current?.request !== request)
        pendingActual.current = { request, id: authoringId('actual') };
      const next = await application.recordActual(state, model, {
        ...command,
        id: pendingActual.current.id,
      });
      pendingActual.current = null;
      return commit(next);
    },
    async recordMeasurement(command: Omit<ManualMeasurementCommand, 'id'>) {
      if (load?.key !== loadKey || load.error)
        throw new Error('Load Measurement before recording results.');
      const catalog = state.measurementCatalog ?? profile?.catalog;
      if (!catalog) throw new Error('No Measurement plan exists for this Run.');
      const request = JSON.stringify({ ...command, recordedAt: undefined });
      if (pendingMeasurement.current?.request !== request)
        pendingMeasurement.current = {
          request,
          command: { ...command, id: authoringId('measurement') },
        };
      const next = await application.recordMeasurement(
        state,
        model,
        catalog,
        pendingMeasurement.current.command,
      );
      pendingMeasurement.current = null;
      return commit(next);
    },
    async recordEvaluation(command: Omit<EvaluationCommand, 'id'>) {
      const request = JSON.stringify({ ...command, evaluatedAt: undefined });
      if (pendingEvaluation.current?.request !== request)
        pendingEvaluation.current = {
          request,
          command: { ...command, id: authoringId('evaluation') },
        };
      const next = await application.recordEvaluation(
        state,
        pendingEvaluation.current.command,
      );
      pendingEvaluation.current = null;
      return commit(next);
    },
    async recordDecision(command: Omit<DecisionCommand, 'id'>) {
      if (!state.measurementCatalog && !profile)
        throw new Error('Evaluation criteria are not configured for this Run.');
      const request = JSON.stringify({ ...command, recordedAt: undefined });
      if (pendingDecision.current?.request !== request)
        pendingDecision.current = {
          request,
          command: { ...command, id: authoringId('decision') },
        };
      const next = await application.recordDecision(
        state,
        state.measurementCatalog ?? profile!.catalog,
        pendingDecision.current.command,
      );
      pendingDecision.current = null;
      return commit(next);
    },
    createNextRun() {
      pendingNextRun.current ??= authoringId('next-run');
      return application.createNextRun(
        state.studyId,
        state,
        pendingNextRun.current,
      );
    },
    now: nowLocalIso,
  };
}

export function nextRunSnapshotSeed(
  source: RunPlanningSnapshot,
  runNumber: number,
) {
  return { ...source, runNumber };
}
