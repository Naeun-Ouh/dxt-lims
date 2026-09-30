'use client';
import {
  loadRunSummaries,
  loadStudyPermissions,
} from '@/src/infrastructure/http/http-repositories';
import { useEffect, useState } from 'react';
import { useOptionalDxtApplication } from '@/src/application/dxt-application-provider';
import type { SeriesWorkspaceProjection } from '@/src/mock/series-workspaces';
export function useRepositorySeriesRuns(slug: string, search = '') {
  const context = useOptionalDxtApplication();
  const app = context?.application;
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [canCreateRun, setCanCreateRun] = useState(false);
  const [rows, setRows] = useState<SeriesWorkspaceProjection['runs'] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!app?.configurationAuthoringBoundary) return;
    const reload = () => {
      setOffset(0);
      setRows(null);
      setRefresh((n) => n + 1);
    };
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [app]);
  useEffect(() => {
    if (!app) return;
    let active = true;
    void (async () => {
      const permissions = app.configurationAuthoringBoundary
        ? await loadStudyPermissions(slug)
        : { canCreateRun: true };
      if (active) setCanCreateRun(permissions.canCreateRun);
      if (app.configurationAuthoringBoundary) {
        const page = await loadRunSummaries({
          studySlug: slug,
          text: search,
          limit: 100,
          offset,
        });
        if (active) {
          setTotal(page.total);
          setError(null);
          setRows((previous) => [
            ...(offset ? (previous ?? []) : []),
            ...page.items.map((r) => ({
              number: r.number,
              name: r.name,
              date: r.createdAt,
              updated: r.updatedAt,
              wafers: r.subjects,
              delta: r.delta.items.map(
                (i) => `${i.label}: ${String(i.before)} → ${String(i.after)}`,
              ),
              unchanged: r.delta.unchangedCount,
              evaluation: '',
              nextAction: '',
              lifecycle: r.stage,
              runStatus: 'IN_PROGRESS' as const,
              workspaceHref: r.href,
            })),
          ]);
        }
        return;
      }
      const snapshots = (await app.repositories.run.listSnapshots()).filter(
        (s) => s.series.id.replace(/^series-/, '') === slug,
      );
      const saved = await Promise.all(
        snapshots.map(async (s) => {
          const [evaluation, decision, execution, measurement] =
            await Promise.all([
              app.repositories.evaluation.getStateByRun(s.id),
              app.repositories.decision.getStateByRun(s.id),
              app.repositories.execution.getStateByRun(s.id),
              app.repositories.measurement.getStateByRun(s.id),
            ]);
          const lifecycle: SeriesWorkspaceProjection['runs'][number]['lifecycle'] =
            evaluation.record.length || decision.record?.context
              ? 'EVALUATION'
              : measurement.record.datasets.length > 0
                ? 'MEASUREMENT'
                : execution.records.length
                  ? 'ACTUAL'
                  : 'PLAN';
          return {
            number: s.runNumber,
            name: s.name,
            date: s.createdAt,
            updated: s.createdAt,
            wafers: s.subjects.length,
            delta: s.delta.items.map(
              (i) => `${i.label}: ${String(i.before)} → ${String(i.after)}`,
            ),
            unchanged: s.delta.unchangedCount,
            evaluation: '',
            nextAction: '',
            lifecycle,
            runStatus: 'IN_PROGRESS' as const,
            workspaceHref: `/series/${slug}/runs/${s.runNumber}/engineering-grid?view=${lifecycle.toLowerCase()}`,
          };
        }),
      );
      const merged = [
        ...(app.studyRunSeeds[slug] ?? []).filter(
          (r) => !saved.some((s) => s.number === r.number),
        ),
        ...saved,
      ].sort((a, b) => b.number - a.number);
      if (active) setRows(merged);
    })().catch((e) => {
      if (active) {
        setRows(null);
        setTotal(null);
        setError(e instanceof Error ? e.message : 'Runs could not be loaded.');
      }
    });
    return () => {
      active = false;
    };
  }, [app, slug, search, offset, refresh]);
  return {
    rows,
    total,
    error,
    loadMore: () => setOffset((n) => n + 100),
    hasMore: total !== null && (rows?.length ?? 0) < total,
    resetSearch: () => {
      setOffset(0);
      setRows(null);
    },
    connected: Boolean(context),
    canCreateRun: app?.configurationAuthoringBoundary ? canCreateRun : true,
  };
}
