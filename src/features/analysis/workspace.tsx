'use client';
/* oxlint-disable next/no-img-element -- Exact local Figma SVG assets. */
import { AnalysisChart } from './result-chart';
import { useLocale } from '@/src/shared/i18n/locale';

import { SavedAnalysisSharingControl } from './sharing-control';
import type { SavedAnalysisAccess } from '@/src/application/saved-analysis-access';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BarChart3, ChartLine, CircleDot, Save, Table2, X } from 'lucide-react';
import {
  projectAnalysisRows,
  saveAnalysisView,
  type AnalysisAggregation,
  type AnalysisRow,
  type AnalysisSelection,
  type AnalysisVisualization,
  type SavedAnalysisView,
} from '@/src/domain/analysis';
import type { AnalysisMeasurementSource } from '@/src/domain/analysis';
import {
  resolveSavedAnalysisView,
  projectSavedAnalysisRows,
} from './saved-view-repository';
import { Badge, Workspace } from '@/src/shared/ui/workspace';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

type InitialAnalysisContext = {
  studyId?: string;
  runNumbers?: number[];
  parameterIds?: string[];
  subjectIds?: string[];
  view?: string;
  savedViewId?: string;
};
const viewOptions: Array<{
  id: AnalysisVisualization;
  label: string;
  icon: typeof Table2;
}> = [
  { id: 'TABLE', label: 'Table', icon: Table2 },
  { id: 'LINE', label: 'Line', icon: ChartLine },
  { id: 'BAR', label: 'Bar', icon: BarChart3 },
  { id: 'SCATTER', label: 'Scatter', icon: CircleDot },
];

export default function AnalysisWorkspace({
  initialContext = {},
}: {
  initialContext?: InitialAnalysisContext;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const [sources, setSources] = useState<AnalysisMeasurementSource[]>(
    application.analysisSeeds,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void application
      .analysisSourceCatalog()
      .then((next) => {
        if (active) {
          setSources(next);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : 'Analysis sources unavailable.',
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [application]);
  if (error) return <main role="alert">{t(error)}</main>;
  if (loading && !sources.length)
    return <main>{t('Loading Measurement sources…')}</main>;
  const sourceKey = sources
    .map((item) => `${item.runId}:${item.measurements.datasets.length}`)
    .join('|');
  return (
    <AnalysisWorkspaceContent
      key={sourceKey}
      initialContext={initialContext}
      allSources={sources}
    />
  );
}

function AnalysisWorkspaceContent({
  initialContext,
  allSources,
}: {
  initialContext: InitialAnalysisContext;
  allSources: AnalysisMeasurementSource[];
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const studies = [
    ...new Map(allSources.map((source) => [source.studyId, source.studyLabel])),
  ];
  const initialStudy = studies.some(([id]) => id === initialContext.studyId)
    ? initialContext.studyId!
    : (studies[0]?.[0] ?? initialContext.studyId ?? '');
  const initialSources = allSources.filter(
    (source) => source.studyId === initialStudy,
  );
  const queryRuns = initialSources.filter((source) =>
    initialContext.runNumbers?.includes(source.runNumber),
  );
  const startingSources = queryRuns.length ? queryRuns : initialSources;
  const initialParameters = initialContext.parameterIds?.filter((id) =>
    initialSources.some((source) => id in source.parameterLabels),
  );
  const requestedSubjectIds = initialContext.subjectIds?.filter((id) =>
    startingSources.some((source) =>
      source.subjects.some((subject) => subject.id === id),
    ),
  );
  const startingSubjectIds = unique(
    startingSources.flatMap((source) =>
      source.subjects.map((subject) => subject.id),
    ),
  );
  const [selection, setSelection] = useState<AnalysisSelection>(() => ({
    studyId: initialStudy,
    runIds: startingSources.map((source) => source.runId),
    datasetIds: startingSources.flatMap((source) =>
      source.measurements.datasets.map((dataset) => dataset.id),
    ),
    parameterIds: initialParameters?.length
      ? initialParameters
      : Object.keys(initialSources[0]?.parameterLabels ?? {}).slice(0, 1),
    subjectIds: requestedSubjectIds?.length
      ? unique(requestedSubjectIds)
      : startingSubjectIds,
    aggregation: 'MEAN',
    datasetOrigin: 'ALL',
    includeExcluded: true,
  }));
  const [view, setView] = useState<AnalysisVisualization>(() =>
    viewOptions.some((option) => option.id === initialContext.view)
      ? (initialContext.view as AnalysisVisualization)
      : 'TABLE',
  );
  const [xDimension, setXDimension] = useState('RUN');
  const [groupBy, setGroupBy] = useState<'SUBJECT' | 'RUN' | 'PARAMETER'>(
    'SUBJECT',
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'RUN' | 'SUBJECT' | 'VALUE'>('RUN');
  const [selectedRow, setSelectedRow] = useState<AnalysisRow | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [savedAccess, setSavedAccess] = useState<SavedAnalysisAccess | null>(
    null,
  );
  const [updatingSaved, setUpdatingSaved] = useState(false);
  const [refreshAccess, setRefreshAccess] = useState(0);
  const pendingSaveCommand = useRef<{
    commandId: string;
    expectedVersion: number;
  } | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'SHARED'>('PRIVATE');
  const [saved, setSaved] = useState<SavedAnalysisView[]>(
    application.savedViewSeeds,
  );
  const [pinnedView, setPinnedView] = useState<SavedAnalysisView | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingSave = useRef<SavedAnalysisView | null>(null);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(
    null,
  );
  const [initialSavedViewOpened, setInitialSavedViewOpened] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  const sources = allSources.filter(
    (source) => source.studyId === selection.studyId,
  );
  const selectedSources = sources.filter((source) =>
    selection.runIds.includes(source.runId),
  );
  const parameters = [
    ...new Map(
      sources.flatMap((source) => Object.entries(source.parameterLabels)),
    ),
  ];
  const subjects = selectedSources.flatMap((source) => source.subjects);
  const datasets = selectedSources.flatMap(
    (source) => source.measurements.datasets,
  );
  const [queriedSources, setQueriedSources] = useState(allSources);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querying, setQuerying] = useState(true);
  const queryKey = JSON.stringify(selection);
  const [settledQuery, setSettledQuery] = useState('');
  useEffect(() => {
    let active = true;
    void application
      .queryAnalysisSources(
        allSources,
        selection,
        application.repositories.savedAnalysis.getAccess
          ? (activeSavedViewId ?? undefined)
          : undefined,
      )
      .then((next) => {
        if (active) {
          setQueriedSources(next);
          setQueryError(null);
          setQuerying(false);
          setSettledQuery(queryKey);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const message =
            error instanceof Error
              ? error.message
              : 'Measurement query failed.';
          setQueryError(message);
          setSelectedRow(null);
          setQueriedSources([]);
          if (activeSavedViewId) setOpenError(message);
          setQuerying(false);
          setSettledQuery(queryKey);
        }
      });
    return () => {
      active = false;
    };
  }, [
    application,
    allSources,
    selection,
    queryKey,
    activeSavedViewId,
    refreshAccess,
  ]);
  useEffect(() => {
    if (!activeSavedViewId || !application.repositories.savedAnalysis.getAccess)
      return;
    const revalidate = () => {
      setQuerying(true);
      setSelectedRow(null);
      setRefreshAccess((n) => n + 1);
    };
    window.addEventListener('focus', revalidate);
    return () => window.removeEventListener('focus', revalidate);
  }, [application, activeSavedViewId]);
  const pinApplies =
    pinnedView &&
    JSON.stringify(resolveSavedAnalysisView(pinnedView, []).selection) ===
      queryKey;
  const unresolved =
    pinApplies && settledQuery === queryKey && !queryError
      ? resolveSavedAnalysisView(pinnedView, queriedSources).missingReferences
      : [];
  const rows = useMemo(
    () =>
      querying || queryError || settledQuery !== queryKey || unresolved.length
        ? []
        : pinApplies
          ? projectSavedAnalysisRows(pinnedView, queriedSources)
          : projectAnalysisRows(queriedSources, selection),
    [
      queriedSources,
      selection,
      querying,
      queryError,
      settledQuery,
      queryKey,
      unresolved.length,
      pinApplies,
      pinnedView,
    ],
  );
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter(
        (row) =>
          !needle ||
          [
            row.studyLabel,
            row.runNumber,
            row.subject.displayLabel,
            row.parameterLabel,
            row.datasetId,
          ].some((value) =>
            String(value ?? '')
              .toLowerCase()
              .includes(needle),
          ),
      )
      .toSorted((a, b) =>
        sort === 'SUBJECT'
          ? a.subject.displayLabel.localeCompare(b.subject.displayLabel)
          : sort === 'VALUE'
            ? (a.value ?? Number.POSITIVE_INFINITY) -
              (b.value ?? Number.POSITIVE_INFINITY)
            : a.runNumber - b.runNumber,
      );
  }, [query, rows, sort]);
  const coordinateOptions = [
    ...new Set(
      rows.flatMap((row) =>
        row.coordinates.map((coordinate) => coordinate.definitionId),
      ),
    ),
  ];
  const [scopeOpen, setScopeOpen] = useState(true);
  const contextLabel = sources[0]?.workspaceContextLabel ?? 'R&D';
  const studyHref = `/series/${selection.studyId}`;
  const singleRun = selectedSources.length === 1 ? selectedSources[0] : null;

  const openSavedView = useCallback(
    async (listedView: SavedAnalysisView) => {
      setOpenError(null);
      try {
        const savedView =
          (await application.savedAnalyses.get(listedView.id)) ??
          application.savedViewSeeds.find((v) => v.id === listedView.id);
        if (!savedView)
          throw new Error(`Saved Analysis unavailable: ${listedView.id}`);
        const access = await application.repositories.savedAnalysis.getAccess?.(
          savedView.id,
        );
        setSavedAccess(access ?? null);
        const restored = resolveSavedAnalysisView(savedView, []);
        setSelection(restored.selection);
        setView(savedView.visualization.type);
        setXDimension(savedView.visualization.xDimension);
        setGroupBy(savedView.visualization.groupBy);
        setQuery(savedView.filters.text);
        setSort(savedView.filters.sort);
        setPinnedView(savedView);
        setActiveSavedViewId(savedView.id);
        setSelectedRow(null);
        setSaveError(null);
      } catch (error: unknown) {
        setPinnedView(null);
        setSelectedRow(null);
        setQueriedSources([]);
        setSavedAccess(null);
        setOpenError(
          error instanceof Error
            ? error.message
            : 'Saved Analysis unavailable.',
        );
      }
    },
    [application],
  );

  useEffect(() => {
    let active = true;
    void application.savedAnalyses
      .list()
      .then((persisted) => {
        if (!active) return;
        setSavedLoaded(true);
        const persistedIds = new Set(persisted.map((item) => item.id));
        setSaved([
          ...persisted,
          ...application.savedViewSeeds.filter(
            (item) => !persistedIds.has(item.id),
          ),
        ]);
      })
      .catch((error: unknown) => {
        if (active) {
          setSaved([]);
          const message =
            error instanceof Error
              ? error.message
              : 'Saved Analysis list unavailable.';
          setSaveError(message);
          if (initialContext.savedViewId) setOpenError(message);
        }
      });
    return () => {
      active = false;
    };
  }, [application, initialContext.savedViewId]);

  useEffect(() => {
    if (!initialContext.savedViewId || initialSavedViewOpened) return;
    const requested = saved.find(
      (item) => item.id === initialContext.savedViewId,
    );
    if (!requested) {
      if (savedLoaded) {
        const frame = window.requestAnimationFrame(() =>
          setOpenError(
            `Saved Analysis unavailable: ${initialContext.savedViewId}`,
          ),
        );
        return () => window.cancelAnimationFrame(frame);
      }
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      void openSavedView(requested);
      setInitialSavedViewOpened(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    initialContext.savedViewId,
    initialSavedViewOpened,
    openSavedView,
    saved,
    savedLoaded,
  ]);

  useEffect(() => {
    if (openError || (initialContext.savedViewId && !activeSavedViewId)) return;
    const params = new URLSearchParams();
    params.set('study', selection.studyId);
    if (selectedSources.length)
      params.set(
        'runs',
        selectedSources.map((source) => source.runNumber).join(','),
      );
    if (selection.parameterIds.length)
      params.set('parameters', selection.parameterIds.join(','));
    if (selection.subjectIds.length)
      params.set('subjects', selection.subjectIds.join(','));
    params.set('view', view);
    if (activeSavedViewId) params.set('savedView', activeSavedViewId);
    window.history.replaceState(null, '', `/analysis?${params.toString()}`);
  }, [
    activeSavedViewId,
    initialContext.savedViewId,
    openError,
    selectedSources,
    selection.parameterIds,
    selection.studyId,
    selection.subjectIds,
    view,
  ]);

  const replaceStudy = (studyId: string) => {
    const nextSources = allSources.filter(
      (source) => source.studyId === studyId,
    );
    setSelection({
      studyId,
      runIds: nextSources.map((source) => source.runId),
      datasetIds: nextSources.flatMap((source) =>
        source.measurements.datasets.map((dataset) => dataset.id),
      ),
      parameterIds: [Object.keys(nextSources[0].parameterLabels)[0]],
      subjectIds: unique(
        nextSources.flatMap((source) =>
          source.subjects.map((subject) => subject.id),
        ),
      ),
      aggregation: 'MEAN',
      datasetOrigin: 'ALL',
      includeExcluded: true,
    });
    setSelectedRow(null);
    setXDimension('RUN');
  };
  const toggleRun = (runId: string) => {
    const source = sources.find((item) => item.runId === runId)!;
    const active = selection.runIds.includes(runId);
    setSelection((current) => ({
      ...current,
      runIds: active
        ? current.runIds.filter((id) => id !== runId)
        : [...current.runIds, runId],
      datasetIds: active
        ? current.datasetIds.filter(
            (id) =>
              !source.measurements.datasets.some(
                (dataset) => dataset.id === id,
              ),
          )
        : [
            ...current.datasetIds,
            ...source.measurements.datasets.map((dataset) => dataset.id),
          ],
      subjectIds: active
        ? current.subjectIds.filter(
            (id) => !source.subjects.some((subject) => subject.id === id),
          )
        : unique([
            ...current.subjectIds,
            ...source.subjects.map((subject) => subject.id),
          ]),
    }));
  };
  const toggle = (
    key: 'datasetIds' | 'parameterIds' | 'subjectIds',
    id: string,
  ) =>
    setSelection((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((value) => value !== id)
        : [...current[key], id],
    }));
  const save = async () => {
    if (updatingSaved && !savedAccess?.canEditSavedAnalysis) return;
    if (saving || !name.trim() || !visibleRows.some((row) => row.datasetId))
      return;
    setSaving(true);
    setSaveError(null);
    const savedView =
      pendingSave.current ??
      saveAnalysisView(
        {
          id:
            updatingSaved && activeSavedViewId
              ? activeSavedViewId
              : `analysis-view-${crypto.randomUUID()}`,
          name: name.trim(),
          owner: application.repositories.savedAnalysis.getAccess
            ? ''
            : 'Lee Seunghyun',
          visibility: application.repositories.savedAnalysis.getAccess
            ? 'PRIVATE'
            : visibility,
          studyId: selection.studyId,
          runIds: [...selection.runIds],
          subjectIds: [...selection.subjectIds],
          parameterIds: [...selection.parameterIds],
          datasetIds: [...selection.datasetIds],
          visualization: { type: view, xDimension, groupBy },
          preparation: {
            aggregation: selection.aggregation,
            datasetOrigin: selection.datasetOrigin,
            includeExcluded: selection.includeExcluded,
          },
          filters: { text: query, sort },
          savedAt: new Date().toISOString(),
        },
        rows,
      );
    pendingSave.current = savedView;
    pendingSaveCommand.current ??= {
      commandId: crypto.randomUUID(),
      expectedVersion: updatingSaved ? savedAccess!.version : 0,
    };
    try {
      await application.savedAnalyses.save(
        savedView,
        pendingSaveCommand.current.commandId,
        pendingSaveCommand.current.expectedVersion,
      );
      const persisted = await application.savedAnalyses.get(savedView.id);
      if (!persisted)
        throw new Error(
          'Saved Analysis read-back unavailable. Retry the save.',
        );
      setSaved(await application.savedAnalyses.list());
      await openSavedView(persisted);
      pendingSave.current = null;
      pendingSaveCommand.current = null;
      setUpdatingSaved(false);
      setName('');
      setSaveOpen(false);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Saved Analysis is unavailable.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (openError)
    return (
      <Workspace page="Analysis" contextLabel={contextLabel}>
        <main role="alert">{t(openError)}</main>
      </Workspace>
    );
  if (initialContext.savedViewId && !activeSavedViewId)
    return <main>{t('Loading exact Saved Analysis…')}</main>;
  return (
    <Workspace
      page="Analysis"
      planShell
      lifecyclePhase="Analysis"
      seriesSlug={selection.studyId}
      seriesTitle={sources[0]?.studyLabel}
      run={singleRun?.runNumber}
      returnHref={studyHref}
      contextLabel={contextLabel}
    >
      <main className="analysis-v1-page analysis-final-page">
        {queryError && <p role="alert">{t(queryError)}</p>}
        {saveError && <p role="alert">{t(saveError)}</p>}
        <h1 className="plan-screen-title">{t('Analysis Workspace')}</h1>
        <nav
          className="engineering-grid-modes"
          aria-label={t('Experiment lifecycle')}
        >
          {['Plan', 'Actual', 'Measurement', 'Evaluation'].map((phase) =>
            singleRun ? (
              <a
                key={phase}
                href={`/series/${selection.studyId}/runs/${singleRun.runNumber}/engineering-grid?view=${phase.toLowerCase()}`}
              >
                {t(phase)}
              </a>
            ) : (
              <button
                key={phase}
                disabled
                title={t('Select one Run to open its workspace')}
              >
                {t(phase)}
              </button>
            ),
          )}
          <button className="active" aria-current="page">
            {t('Analysis')}
          </button>
        </nav>
        <section className="engineering-grid-toolbar analysis-final-toolbar">
          <button
            aria-expanded={scopeOpen}
            onClick={() => setScopeOpen((open) => !open)}
          >
            {t('Analysis scope')}
            <span className="figma-small-chevron">
              <img src="/figma/lifecycle/b6aa6.svg" alt="" />
            </span>
          </button>
          <span>
            {rows.length} {t('resolved rows')}
          </span>
          <div className="lifecycle-primary-actions">
            {activeSavedViewId && savedAccess && (
              <button
                disabled={!savedAccess.canEditSavedAnalysis}
                onClick={() => {
                  setUpdatingSaved(true);
                  setName(pinnedView?.name ?? '');
                  pendingSave.current = null;
                  pendingSaveCommand.current = null;
                  setSaveOpen(true);
                }}
              >
                {t('Update saved analysis')}
              </button>
            )}
            <button
              className="primary plan-save"
              aria-expanded={saveOpen}
              onClick={() => {
                setUpdatingSaved(false);
                setName('');
                pendingSave.current = null;
                pendingSaveCommand.current = null;
                setSaveOpen((open) => !open);
              }}
            >
              {t('Save Analysis')}
            </button>
          </div>
        </section>
        {activeSavedViewId && savedAccess && (
          <SavedAnalysisSharingControl
            key={`${activeSavedViewId}:${savedAccess.version}`}
            id={activeSavedViewId}
            access={savedAccess}
            repository={application.repositories.savedAnalysis}
            onChanged={setSavedAccess}
          />
        )}
        <section
          hidden={!scopeOpen}
          className="analysis-filter-strip"
          aria-label={t('Analysis context and filters')}
        >
          <label>
            <span>{t('STUDY')}</span>
            <select
              value={selection.studyId}
              onChange={(event) => replaceStudy(event.target.value)}
            >
              {studies.map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <FilterGroup
            label={t('RUNS')}
            summary={
              selectedSources.map((source) => source.runNumber).join(' / ') ||
              t('None')
            }
          >
            {sources.map((source) => (
              <Check
                key={source.runId}
                label={t('Run {0}', [source.runNumber])}
                checked={selection.runIds.includes(source.runId)}
                onChange={() => toggleRun(source.runId)}
              />
            ))}
          </FilterGroup>
          <FilterGroup
            label={t('DATASETS')}
            summary={t('{0} selected', [selection.datasetIds.length])}
          >
            {datasets.map((dataset) => (
              <Check
                key={dataset.id}
                label={`${dataset.measurementPoint} · ${dataset.datasetOrigin}`}
                checked={selection.datasetIds.includes(dataset.id)}
                onChange={() => toggle('datasetIds', dataset.id)}
              />
            ))}
          </FilterGroup>
          <FilterGroup
            label={t('PARAMETERS')}
            summary={
              parameters
                .filter(([id]) => selection.parameterIds.includes(id))
                .map(([, label]) => label)
                .join(' / ') || t('None')
            }
          >
            {parameters.map(([id, label]) => (
              <Check
                key={id}
                label={label}
                checked={selection.parameterIds.includes(id)}
                onChange={() => toggle('parameterIds', id)}
              />
            ))}
          </FilterGroup>
          <FilterGroup
            label={t('SUBJECTS')}
            summary={t('{0} selected', [selection.subjectIds.length])}
          >
            {subjects.map((subject) => (
              <Check
                key={subject.id}
                label={subject.displayLabel}
                checked={selection.subjectIds.includes(subject.id)}
                onChange={() => toggle('subjectIds', subject.id)}
              />
            ))}
          </FilterGroup>
          <label>
            <span>{t('REPRESENTATIVE')}</span>
            <select
              value={selection.aggregation}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  aggregation: event.target.value as AnalysisAggregation,
                }))
              }
            >
              {['RAW', 'MEAN', 'MEDIAN', 'MIN', 'MAX'].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('DATASET TYPE')}</span>
            <select
              value={selection.datasetOrigin}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  datasetOrigin: event.target
                    .value as AnalysisSelection['datasetOrigin'],
                }))
              }
            >
              <option value={'ALL'}>{t('ALL')}</option>
              <option value={'SOURCE'}>{t('SOURCE')}</option>
              <option value={'DERIVED'}>{t('DERIVED')}</option>
            </select>
          </label>
        </section>
        <section className="analysis-selection-summary">
          <b>{sources[0]?.studyLabel}</b>
          <span>
            {t('Runs')}{' '}
            {selectedSources.map((source) => source.runNumber).join(' / ') ||
              '—'}
          </span>
          <span>
            {parameters
              .filter(([id]) => selection.parameterIds.includes(id))
              .map(([, label]) => label)
              .join(' / ') || t('No parameter')}
          </span>
          <span>
            {selection.subjectIds.length} {t('Subjects')}
          </span>
          <span>
            {t(selection.datasetOrigin)} · {t(selection.aggregation)}
          </span>
          <label>
            <input
              type="checkbox"
              checked={selection.includeExcluded}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  includeExcluded: event.target.checked,
                }))
              }
            />{' '}
            {t('Keep excluded traceable')}
          </label>
        </section>
        {saveOpen && (
          <section className="analysis-save-bar">
            <div>
              <b>
                {updatingSaved
                  ? t('UPDATE SAVED ANALYSIS')
                  : t('SAVE ANALYSIS VIEW')}
              </b>
              <small>
                {t(
                  'Stores exact source references and view configuration. Measurement values are not copied.',
                )}
              </small>
            </div>
            <input
              aria-label={t('Analysis view name')}
              placeholder={t('e.g. BCD Comparison')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {application.repositories.savedAnalysis.getAccess ? (
              <small>{t('Private until shared')}</small>
            ) : (
              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as 'PRIVATE' | 'SHARED')
                }
              >
                <option value={'PRIVATE'}>{t('PRIVATE')}</option>
                <option value={'SHARED'}>{t('SHARED')}</option>
              </select>
            )}
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => {
                void save();
              }}
            >
              <Save size={13} /> {t('Save Analysis')}
            </button>
            <button
              aria-label={t('Close save view')}
              onClick={() => setSaveOpen(false)}
            >
              <X size={15} />
            </button>
          </section>
        )}
        {!!unresolved.length && (
          <output className="analysis-unresolved">
            <b>{t('Some saved sources are unavailable.')}</b>
            <span>
              {t(
                'DXT preserved their exact identities and did not substitute other datasets.',
              )}
            </span>
            {unresolved.map((reference) => (
              <code key={reference}>{reference}</code>
            ))}
          </output>
        )}
        <section
          className={`analysis-work-surface ${selectedRow ? 'with-inspector' : ''}`}
        >
          <div className="analysis-center">
            <div className="analysis-viz-toolbar">
              <div className="analysis-view-toggle">
                {viewOptions.map((option) => (
                  <button
                    key={option.id}
                    className={view === option.id ? 'active' : ''}
                    onClick={() => setView(option.id)}
                  >
                    {t(option.label)}
                  </button>
                ))}
              </div>
              <label>
                X{' '}
                <select
                  value={xDimension}
                  onChange={(event) => setXDimension(event.target.value)}
                >
                  <option value="RUN">{t('Run order')}</option>
                  <option value="SUBJECT">{t('Subject order')}</option>
                  {coordinateOptions.map((id) => (
                    <option value={id} key={id}>
                      {t('Coordinate ·')} {id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Group')}{' '}
                <select
                  value={groupBy}
                  onChange={(event) =>
                    setGroupBy(event.target.value as typeof groupBy)
                  }
                >
                  <option value="SUBJECT">{t('Subject')}</option>
                  <option value="RUN">{t('Run')}</option>
                  <option value="PARAMETER">{t('Parameter')}</option>
                </select>
              </label>
            </div>
            {view !== 'TABLE' && (
              <AnalysisChart
                rows={visibleRows}
                type={view}
                xDimension={xDimension}
                groupBy={groupBy}
                onSelect={setSelectedRow}
              />
            )}
            <div className="analysis-result-toolbar">
              <b>{t('RESULT TABLE')}</b>
              <div>
                <img src="/figma/lifecycle/9e380.svg" alt="" />
                <input
                  aria-label={t('Filter analysis results')}
                  placeholder={t('Filter results…')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <select
                  aria-label={t('Sort analysis results')}
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as typeof sort)
                  }
                >
                  <option value="RUN">{t('Sort · Run')}</option>
                  <option value="SUBJECT">{t('Sort · Subject')}</option>
                  <option value="VALUE">{t('Sort · Value')}</option>
                </select>
              </div>
            </div>
            <AnalysisResultTable
              rows={visibleRows}
              selectedId={selectedRow?.id}
              onSelect={setSelectedRow}
            />
          </div>
          {selectedRow && (
            <AnalysisInspector
              row={selectedRow}
              onClose={() => setSelectedRow(null)}
            />
          )}
        </section>
        {!!saved.length && (
          <section className="analysis-saved-views">
            <span>{t('Saved Analyses')}</span>
            {saved.map((item) => (
              <article
                key={item.id}
                className={activeSavedViewId === item.id ? 'active' : ''}
              >
                <b>{item.name}</b>
                <small>
                  {item.runIds.length} {t('Runs ·')} {item.subjectIds.length}{' '}
                  {t('Subjects ·')} {t(item.visualization.type)}
                </small>
                <Badge
                  tone={item.visibility === 'SHARED' ? 'green' : 'neutral'}
                >
                  {t(item.visibility)}
                </Badge>
                <button
                  className="secondary-button"
                  onClick={() => {
                    void openSavedView(item);
                  }}
                >
                  {t('Open')}
                </button>
              </article>
            ))}
          </section>
        )}
      </main>
    </Workspace>
  );
}

function FilterGroup({
  label,
  summary,
  children,
}: {
  label: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="analysis-filter-group">
      <summary>
        <span>{label}</span>
        <b>{summary}</b>
        <span className="figma-small-chevron">
          <img src="/figma/lifecycle/b6aa6.svg" alt="" />
        </span>
      </summary>
      <div>{children}</div>
    </details>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
function AnalysisResultTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: AnalysisRow[];
  selectedId?: string;
  onSelect: (row: AnalysisRow) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="analysis-v1-table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('Study')}</th>
            <th>{t('Run')}</th>
            <th>{t('Subject')}</th>
            <th>{t('Parameter')}</th>
            <th>{t('Value')}</th>
            <th>{t('Unit')}</th>
            <th>{t('Dataset')}</th>
            <th>{t('Representative')}</th>
            <th>{t('Validity')}</th>
            <th>{t('Source')}</th>
            <th>
              <span className="sr-only">{t('Inspect')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={row.id}
                className={
                  selectedId === row.id
                    ? 'selected'
                    : row.validity.toLowerCase()
                }
              >
                <td>{row.studyLabel}</td>
                <td>
                  {t('Run')} {row.runNumber}
                </td>
                <td>
                  <b>{row.subject.displayLabel}</b>
                </td>
                <td>{row.parameterLabel}</td>
                <td className="mono">{row.value ?? '—'}</td>
                <td>{row.unit || '—'}</td>
                <td title={row.datasetId ?? undefined}>
                  {row.datasetId
                    ? `${t(row.datasetOrigin)} · ${short(row.datasetId)}`
                    : '—'}
                </td>
                <td>{t(row.representativeType)}</td>
                <td>
                  <span
                    className={`analysis-validity ${row.validity.toLowerCase()}`}
                  >
                    {t(row.validity)}
                  </span>
                  {row.exclusionReason && (
                    <small>{t(row.exclusionReason)}</small>
                  )}
                </td>
                <td>{row.sourceSystem ?? '—'}</td>
                <td>
                  <button
                    aria-label={t('Inspect {0} {1}', [
                      row.subject.displayLabel,
                      row.parameterLabel,
                    ])}
                    onClick={() => onSelect(row)}
                  >
                    <img src="/figma/lifecycle/c8ec5.svg" alt="" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={11} className="analysis-empty">
                <b>{t('— No Measurement results match this selection.')}</b>
                <small>
                  {t('Adjust the Run, Dataset, Parameter, or Subject filters.')}
                </small>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function AnalysisInspector({
  row,
  onClose,
}: {
  row: AnalysisRow;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <aside className="analysis-v1-inspector">
      <header>
        <div>
          <span>{t('PROVENANCE INSPECTOR')}</span>
          <h2>{row.parameterLabel}</h2>
          <p>
            {row.subject.displayLabel} {t('· Run')} {row.runNumber}
          </p>
        </div>
        <button aria-label={t('Close provenance inspector')} onClick={onClose}>
          <img src="/figma/lifecycle/184ec.svg" alt="" />
        </button>
      </header>
      <dl>
        <dt>{t('Value')}</dt>
        <dd>
          {row.value ?? '—'} {row.unit}
        </dd>
        <dt>{t('Subject')}</dt>
        <dd>
          {row.subject.displayLabel}
          <small>
            {row.subject.id} · {t(row.subject.type)}
          </small>
        </dd>
        <dt>{t('MeasurementExecution')}</dt>
        <dd>{row.measurementExecutionId ?? '—'}</dd>
        <dt>{t('MeasurementDataset')}</dt>
        <dd>
          {row.datasetId ?? '—'}
          <small>{row.datasetOrigin ? t(row.datasetOrigin) : ''}</small>
        </dd>
        <dt>{t('MeasurementValue')}</dt>
        <dd>{row.measurementValueId ?? t('Representative projection')}</dd>
        <dt>{t('Representative Result')}</dt>
        <dd>
          {row.representativeResultId ?? t('Calculated in this view')}
          <small>
            {t(row.representativeType)} · {row.sourceMeasurementIds.length}{' '}
            {t('source value(s)')}
          </small>
        </dd>
        <dt>{t('Parameter Definition')}</dt>
        <dd>{row.parameterId}</dd>
        <dt>{t('Validity')}</dt>
        <dd>
          {t(row.validity)}
          <small>
            {row.exclusionReason
              ? t(row.exclusionReason)
              : t('No exclusion reason')}
          </small>
        </dd>
        <dt>{t('Source')}</dt>
        <dd>{row.sourceSystem ?? '—'}</dd>
        <dt>{t('Collected')}</dt>
        <dd>{row.collectedAt ?? '—'}</dd>
      </dl>
      <p className="analysis-inspector-note">
        {t(
          'This panel resolves existing Measurement provenance. It does not create or alter scientific observations.',
        )}
      </p>
    </aside>
  );
}
const short = (value: string) =>
  value.length > 24 ? `${value.slice(0, 21)}…` : value;
const unique = (values: string[]) => [...new Set(values)];
