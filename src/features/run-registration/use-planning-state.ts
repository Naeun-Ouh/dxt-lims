'use client';
import { useEffect, useSyncExternalStore } from 'react';
import type { RunPlanningSnapshot } from './planning-model';
import type { PlanningWorkspaceScenario } from '@/src/mock/planning-workspace-scenarios';
import {
  confirmExperimentScope,
  createExperimentWorkspace,
  type ExperimentScopeRange,
} from './workspace-model';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';

type State = {
  snapshot: RunPlanningSnapshot;
  ranges: ExperimentScopeRange[];
  manualFocus: string[];
  storageError: boolean;
};
function initialState(seed: PlanningWorkspaceScenario, configuration: ConfigurationRegistrySource): State {
  const snapshot = seed.snapshot;
  const ids = snapshot.subjects.map((subject) => subject.id);
  return {
    snapshot,
    manualFocus: [],
    storageError: false,
    ranges: [
      confirmExperimentScope(
        createExperimentWorkspace(snapshot, configuration),
        seed.scopeStartOperationId,
        seed.scopeEndOperationId,
        ids,
        ids,
      ),
    ],
  };
}
const stores = new Map<string, State>();
const defaults = new Map<string, State>();
const listeners = new Set<() => void>();
function read(seed: PlanningWorkspaceScenario, configuration: ConfigurationRegistrySource) {
  if (!defaults.has(seed.snapshot.id))
    defaults.set(seed.snapshot.id, initialState(seed, configuration));
  const fallback = defaults.get(seed.snapshot.id)!,
    id = fallback.snapshot.id;
  if (!stores.has(id)) stores.set(id, fallback);
  return stores.get(id)!;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function usePlanningState(seed: PlanningWorkspaceScenario) {
  const { application } = useDxtApplication();
  const configuration = application.repositories.configuration;
  const fallback = defaults.get(seed.snapshot.id) ?? initialState(seed, configuration);
  defaults.set(seed.snapshot.id, fallback);
  const state = useSyncExternalStore(
    subscribe,
    () => read(seed, configuration),
    () => fallback,
  );
  useEffect(() => {
    let active = true;
    void application.runs.loadPlanning(seed.snapshot.id).then((restored) => {
      if (!active || !restored) return;
      stores.set(seed.snapshot.id, { ...restored, storageError: false });
      listeners.forEach((listener) => listener());
    }).catch(() => {
      if (!active) return;
      stores.set(seed.snapshot.id, { ...read(seed, configuration), storageError: true });
      listeners.forEach((listener) => listener());
    });
    return () => { active = false; };
  }, [application, configuration, seed]);
  function update(change: (current: State) => State) {
    const next = change(read(seed, configuration));
    stores.set(next.snapshot.id, next);
    listeners.forEach((listener) => listener());
    void application.runs.savePlanning(next, `plan-${next.snapshot.id}-${Date.now()}`).catch(() => {
      stores.set(next.snapshot.id, { ...next, storageError: true });
      listeners.forEach((listener) => listener());
    });
  }
  return {
    ...state,
    setSnapshot: (
      change: (current: RunPlanningSnapshot) => RunPlanningSnapshot,
    ) =>
      update((current) => ({ ...current, snapshot: change(current.snapshot) })),
    setRanges: (ranges: ExperimentScopeRange[]) =>
      update((current) => ({ ...current, ranges })),
    setManualFocus: (change: (ids: string[]) => string[]) =>
      update((current) => ({
        ...current,
        manualFocus: change(current.manualFocus),
      })),
  };
}
