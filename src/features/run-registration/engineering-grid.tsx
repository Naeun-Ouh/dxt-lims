'use client';
import { ParticipationEditor } from './participation-editor';
import { editOperationParticipation } from './participation';
import { useLocale } from '@/src/shared/i18n/locale';

/* oxlint-disable next/no-img-element -- Tiny local Figma SVGs retain their intrinsic geometry; no raster image optimization is needed. */
import Link from 'next/link';
import type { PlanningWorkspaceRecord } from '@/src/application/repository-ports';
import { applyGridPlanEdits } from './engineering-grid-plan-edit';
import {
  gridPlanningContext,
  participatesInOperation,
} from './grid-plan-context';
import { ScopeSelectionPanel } from './scope-selection-panel';
import {
  confirmExperimentScope,
  selectOperationRange,
} from './workspace-model';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { Workspace } from '@/src/shared/ui/workspace';
import type { SubjectMeasurementResultSet } from '@/src/domain/measurement/subject-measurement';
import type { ReferenceCatalog } from '@/src/domain/reference';
import { validateVariableValue } from './applicability';
import { ActualExecutionGrid } from './actual-execution-grid';
import type { ActualExecutionEvidence } from './actual-execution-model';
import { MeasurementExecutionGrid } from './measurement-execution-grid';
import { EvaluationExecutionGrid } from './evaluation-execution-grid';
import type {
  EngineerEvaluationRecord,
  EvaluationTargetBinding,
} from './evaluation-grid-model';
import type {
  DecisionContinuationContext,
  NextRunPreview,
} from './decision-continuation-model';
import type { ExperimentWorkspaceModel } from './workspace-model';
import type { LifecycleAuthoringProfile } from './lifecycle-authoring';
import { useLifecycleAuthoring } from './use-lifecycle-authoring';
import { isFocusOperation, scopeContains } from './workspace-model';
import {
  gridCellKey,
  projectEngineeringGridRows,
  planEngineeringGridSchema,
  type EngineeringGridRow,
} from './engineering-grid-model';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

const ROW_HEIGHT = 26;
const VIEWPORT_HEIGHT = 580;
const OVERSCAN = 8;
type Filter = 'ALL' | 'VARIED' | 'CHANGED';
type Projection = 'FOCUS' | 'EXPERIMENT' | 'FULL_HISTORY';
type Cell = { rowId: string; subjectId: string };

export default function EngineeringGrid({
  model: inputModel,
  seriesSlug,
  returnHref,
  actualEvidence = [],
  measurementResults,
  referenceCatalog,
  evaluationTargetBindings = [],
  engineerEvaluations = [],
  decisionContext = null,
  nextRunPreview = null,
  authoringProfile,
}: {
  model: ExperimentWorkspaceModel;
  seriesSlug: string;
  returnHref: string;
  actualEvidence?: readonly ActualExecutionEvidence[];
  measurementResults?: SubjectMeasurementResultSet;
  referenceCatalog?: ReferenceCatalog;
  evaluationTargetBindings?: readonly EvaluationTargetBinding[];
  engineerEvaluations?: readonly EngineerEvaluationRecord[];
  decisionContext?: DecisionContinuationContext | null;
  nextRunPreview?: NextRunPreview | null;
  authoringProfile?: LifecycleAuthoringProfile;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const [persistedPlan, setPersistedPlan] =
    useState<PlanningWorkspaceRecord | null>(null);
  const [planMessage, setPlanMessage] = useState('');
  const [planSaving, setPlanSaving] = useState(false);
  const production = !!application.configurationAuthoringBoundary;
  const [participationDraft, setParticipationDraft] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [participationOperation, setParticipationOperation] = useState<
    string | null
  >(null);
  const baseModel = useMemo(
    () =>
      persistedPlan
        ? gridPlanningContext(
            persistedPlan,
            application.repositories.configuration,
          )
        : {
            ...inputModel,
            configurationRepository: application.repositories.configuration,
          },
    [application, inputModel, persistedPlan],
  );
  const [modeOverride, setModeOverride] = useState<
    'PLAN' | 'ACTUAL' | 'MEASUREMENT' | 'EVALUATION' | null
  >(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const syncLocation = () => {
      setSearch(window.location.search);
      setModeOverride(null);
    };
    syncLocation();
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, []);
  const requestedMode = new URLSearchParams(search).get('view');
  const workspaceMode =
    modeOverride ??
    (requestedMode === 'actual'
      ? 'ACTUAL'
      : requestedMode === 'measurement'
        ? 'MEASUREMENT'
        : requestedMode === 'evaluation'
          ? 'EVALUATION'
          : 'PLAN');
  // Unsaved Plan membership must never reinterpret recorded downstream evidence.
  const model = useMemo(
    () =>
      workspaceMode === 'PLAN' && participationDraft
        ? {
            ...baseModel,
            snapshot: {
              ...baseModel.snapshot,
              subjectOperationIds: participationDraft,
            },
          }
        : baseModel,
    [baseModel, participationDraft, workspaceMode],
  );
  const changeMode = (
    mode: 'PLAN' | 'ACTUAL' | 'MEASUREMENT' | 'EVALUATION',
  ) => {
    setScopeMode(null);
    setModeOverride(mode);
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode.toLowerCase());
    window.history.pushState(null, '', url);
    setSearch(url.search);
  };
  useEffect(() => {
    if (!production) return;
    let active = true;
    void application.runs
      .loadPlanning(inputModel.snapshot.id)
      .then((record) => {
        if (!record) throw new Error('Persisted Plan is unavailable.');
        if (active) {
          setPersistedPlan(record);
          if (record.lockReason || record.canEditPlan === false) {
            setParticipationDraft(null);
            setParticipationOperation(null);
          }
        }
      })
      .catch((error: unknown) => {
        if (active)
          setPlanMessage(
            error instanceof Error ? error.message : 'Plan unavailable.',
          );
      });
    return () => {
      active = false;
    };
  }, [application, inputModel.snapshot.id, production, workspaceMode]);
  const scientific = persistedPlan?.scientificPermissions;
  const planReadOnly =
    actualEvidence.length > 0 ||
    !!measurementResults?.datasets.length ||
    (production &&
      (!persistedPlan ||
        persistedPlan.canEditPlan === false ||
        !!persistedPlan.lockReason ||
        planSaving));
  const [projection, setProjection] = useState<Projection>('EXPERIMENT');
  const [compactContext, setCompactContext] = useState(false);
  const [viewFocus, setViewFocus] = useState<string[] | null>(null);
  const [scopeMode, setScopeMode] = useState<'FOCUS' | 'SCOPE' | null>(null);
  const [scopeStage, setScopeStage] = useState<'RANGE' | 'SUBJECTS'>('RANGE');
  const [scopeDraft, setScopeDraft] = useState<string[]>([]);
  const [scopeSubjects, setScopeSubjects] = useState<string[]>([]);
  const [changeScopeSubjects, setChangeScopeSubjects] = useState(false);
  const scopeAnchor = useRef<string | null>(null);
  const scopeDragging = useRef(false);
  const chooseScopeRow = (id: string, extend: boolean) => {
    const from = extend && scopeAnchor.current ? scopeAnchor.current : id;
    scopeAnchor.current = from;
    setScopeDraft(selectOperationRange(model.operations, from, id));
  };
  const beginScope = (kind: 'FOCUS' | 'SCOPE') => {
    setScopeMode(kind);
    setScopeStage('RANGE');
    setChangeScopeSubjects(false);
    setScopeDraft(
      kind === 'FOCUS'
        ? (viewFocus ??
            model.operations
              .filter((o) => isFocusOperation(model, o.id))
              .map((o) => o.id))
        : model.operations
            .filter((o) => scopeContains(model, o.id))
            .map((o) => o.id),
    );
    setScopeSubjects([
      ...new Set(
        model.scopeRanges?.flatMap((r) => r.subjectIds) ??
          model.subjects.map((s) => s.id),
      ),
    ]);
    scopeAnchor.current = null;
  };
  const operations = useMemo(() => {
    return model.operations
      .filter(
        (operation) =>
          projection === 'FULL_HISTORY' ||
          (projection === 'FOCUS'
            ? viewFocus
              ? viewFocus.includes(operation.id)
              : isFocusOperation(model, operation.id)
            : scopeContains(model, operation.id)),
      )
      .map((operation) => ({ ...operation, sourceOperationId: operation.id }));
  }, [model, projection, viewFocus]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const expanded = useMemo(
    () =>
      new Set(
        operations
          .filter((operation) => !collapsed.has(operation.id))
          .map((operation) => operation.id),
      ),
    [operations, collapsed],
  );
  const projected = useMemo(
    () => projectEngineeringGridRows(model, operations, expanded),
    [model, operations, expanded],
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [scrollTop, setScrollTop] = useState(0);
  const requestedSubjectId = new URLSearchParams(search).get('subject');
  const initialSubjectId = model.subjects.some(
    (subject) => subject.id === requestedSubjectId,
  )
    ? requestedSubjectId
    : null;
  const [selected, setSelected] = useState<Cell | null>(null);
  const activeSubjectId = selected?.subjectId ?? initialSubjectId;
  const [anchor, setAnchor] = useState<Cell | null>(null);
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Record<string, 'FIXED' | 'VARIED'>>({});
  const [inspected, setInspected] = useState<EngineeringGridRow | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  useEffect(() => {
    if (!inspectorOpen) return;
    const closeInspector = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setInspectorOpen(false);
    };
    window.addEventListener('keydown', closeInspector);
    return () => window.removeEventListener('keydown', closeInspector);
  }, [inspectorOpen]);
  const viewport = useRef<HTMLDivElement>(null);
  const keyWidth = compactContext ? 340 : 540;
  const subjectWidth = 80;

  const authoring = useLifecycleAuthoring(
    model,
    authoringProfile,
    workspaceMode !== 'PLAN',
    workspaceMode === 'ACTUAL'
      ? 'ACTUAL'
      : workspaceMode === 'MEASUREMENT'
        ? 'MEASUREMENT'
        : 'ALL',
  );
  const savePlan = async (
    patch: Partial<
      Pick<PlanningWorkspaceRecord, 'ranges' | 'manualFocus'>
    > = {},
  ) => {
    if (!persistedPlan || planReadOnly) return false;
    setPlanSaving(true);
    setPlanMessage('Saving Plan…');
    const record = {
      ...persistedPlan,
      ...patch,
      snapshot: applyGridPlanEdits(
        {
          ...persistedPlan.snapshot,
          subjectOperationIds:
            participationDraft ?? persistedPlan.snapshot.subjectOperationIds,
        },
        projectEngineeringGridRows(
          model,
          model.operations.map((o) => ({ ...o, sourceOperationId: o.id })),
          new Set(model.operations.map((o) => o.id)),
        ),
        dirty,
        roles,
      ),
    };
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(record)),
    );
    const commandId =
      'plan-' +
      Array.from(new Uint8Array(digest))
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
    try {
      await application.runs.savePlanning(record, commandId);
      const stored = await application.runs.loadPlanning(record.snapshot.id);
      if (!stored) throw new Error('Plan read-back unavailable.');
      setPersistedPlan(stored);
      setDirty({});
      setRoles({});
      setParticipationDraft(null);
      setPlanMessage('Plan saved.');
      return true;
    } catch (error: unknown) {
      setPlanMessage(
        error instanceof Error ? error.message : 'Plan save failed.',
      );
      const stored = await application.runs
        .loadPlanning(record.snapshot.id)
        .catch(() => null);
      if (stored?.lockReason) {
        setPersistedPlan(stored);
        setParticipationDraft(null);
        setParticipationOperation(null);
        setDirty({});
        setRoles({});
      }
    } finally {
      setPlanSaving(false);
    }
    return false;
  };
  const resolvedActualEvidence =
    authoring?.state.actualEvidence ?? actualEvidence;
  const resolvedMeasurements =
    authoring?.state.measurementResults ?? measurementResults;
  const resolvedCatalog =
    authoring?.state.measurementCatalog ??
    authoring?.profile.catalog ??
    referenceCatalog;
  const resolvedBindings =
    authoring?.state.targetBindings ??
    authoring?.profile.targetBindings ??
    evaluationTargetBindings;
  const resolvedEvaluations =
    authoring?.state.engineerEvaluations ?? engineerEvaluations;
  const resolvedDecision = authoring?.state.decisionContext ?? decisionContext;
  const resolvedNextRun = authoring?.state.nextRunPreview ?? nextRunPreview;
  const analysisParameterId = resolvedMeasurements?.values.find(
    (value) => value.parameterDefinitionId,
  )?.parameterDefinitionId;
  const analysisHref = `/analysis?study=${seriesSlug}&runs=${model.snapshot.runNumber}${
    analysisParameterId ? `&parameters=${analysisParameterId}` : ''
  }`;
  const nextRunHref = resolvedNextRun
    ? `/series/${seriesSlug}/runs/${resolvedNextRun.snapshot.runNumber}/engineering-grid?view=plan`
    : undefined;

  const jumpToSubject = (subjectId: string) => {
    const subject = model.subjects.find(
      (candidate) => candidate.id === subjectId,
    );
    if (!subject) return;
    setSelected((cell) => ({
      rowId: cell?.rowId ?? '',
      subjectId,
    }));
    requestAnimationFrame(() =>
      viewport.current
        ?.querySelector<HTMLElement>(`[data-subject-header="${subjectId}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'center' }),
    );
  };
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matchesSearch = (row: EngineeringGridRow) =>
      !needle ||
      [
        row.operation.name,
        row.operation.area,
        row.operation.equipment,
        row.definition?.label,
        row.assignment?.kind,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    const matchesFilter = (row: EngineeringGridRow) => {
      const role = roles[row.id] ?? row.role;
      return filter === 'VARIED'
        ? role === 'VARIED'
        : filter === 'CHANGED'
          ? Object.keys(dirty).some((key) => key.startsWith(`${row.id}:`)) ||
            model.snapshot.delta.items.some(
              (d) =>
                d.change === 'CHANGED' && d.label === row.definition?.label,
            )
          : true;
    };
    if (filter === 'ALL') return projected.filter(matchesSearch);
    const qualifyingOperations = new Set(
      projected
        .filter(
          (row) =>
            row.kind === 'VARIABLE' && matchesFilter(row) && matchesSearch(row),
        )
        .map((row) => row.operation.id),
    );
    return projected.filter(
      (row) =>
        qualifyingOperations.has(row.operation.id) &&
        (row.kind === 'OPERATION' ||
          (row.kind === 'VARIABLE' &&
            matchesFilter(row) &&
            matchesSearch(row))),
    );
  }, [projected, query, filter, dirty, roles, model.snapshot.delta.items]);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const visible = rows.slice(start, start + visibleCount);
  const variableRows = rows.filter((row) => row.kind === 'VARIABLE');
  const selectedKeys = useMemo(() => {
    if (!anchor || !selected) return new Set<string>();
    const rowA = variableRows.findIndex((row) => row.id === anchor.rowId);
    const rowB = variableRows.findIndex((row) => row.id === selected.rowId);
    const columnA = model.subjects.findIndex(
      (subject) => subject.id === anchor.subjectId,
    );
    const columnB = model.subjects.findIndex(
      (subject) => subject.id === selected.subjectId,
    );
    if ([rowA, rowB, columnA, columnB].some((index) => index < 0))
      return new Set<string>();
    const keys = new Set<string>();
    for (let row = Math.min(rowA, rowB); row <= Math.max(rowA, rowB); row++)
      for (
        let column = Math.min(columnA, columnB);
        column <= Math.max(columnA, columnB);
        column++
      )
        keys.add(`${variableRows[row].id}:${model.subjects[column].id}`);
    return keys;
  }, [anchor, selected, variableRows, model.subjects]);

  const setValue = (
    row: EngineeringGridRow,
    subjectId: string,
    value: string,
  ) => {
    if (
      !row.definition ||
      planReadOnly ||
      !participatesInOperation(
        model.snapshot,
        subjectId,
        row.operation.sourceOperationId,
      )
    )
      return;
    const key = gridCellKey(row.id, {
      id: subjectId,
      type: '',
      displayLabel: '',
    });
    try {
      validateVariableValue(row.definition, value);
      setDirty((state) => ({ ...state, [key]: value }));
      setErrors((state) => {
        const next = { ...state };
        delete next[key];
        return next;
      });
    } catch (error) {
      setDirty((state) => ({ ...state, [key]: value }));
      setErrors((state) => ({
        ...state,
        [key]: error instanceof Error ? error.message : 'Invalid value',
      }));
    }
  };
  const move = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: EngineeringGridRow,
    subjectIndex: number,
  ) => {
    const rowIndex = variableRows.findIndex(
      (candidate) => candidate.id === row.id,
    );
    let nextRow = rowIndex;
    let nextColumn = subjectIndex;
    if (event.key === 'ArrowDown' || event.key === 'Enter') nextRow++;
    else if (event.key === 'ArrowUp') nextRow--;
    else if (
      event.key === 'ArrowRight' ||
      (event.key === 'Tab' && !event.shiftKey)
    )
      nextColumn++;
    else if (
      event.key === 'ArrowLeft' ||
      (event.key === 'Tab' && event.shiftKey)
    )
      nextColumn--;
    else return;
    if (nextColumn < 0) {
      nextColumn = model.subjects.length - 1;
      nextRow--;
    }
    if (nextColumn >= model.subjects.length) {
      nextColumn = 0;
      nextRow++;
    }
    const vertical = ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key);
    const direction =
      ['ArrowUp', 'ArrowLeft'].includes(event.key) ||
      (event.key === 'Tab' && event.shiftKey)
        ? -1
        : 1;
    while (
      nextRow >= 0 &&
      nextRow < variableRows.length &&
      !participatesInOperation(
        model.snapshot,
        model.subjects[nextColumn].id,
        variableRows[nextRow].operation.sourceOperationId,
      )
    ) {
      if (vertical) nextRow += direction;
      else {
        nextColumn += direction;
        if (nextColumn >= model.subjects.length) {
          nextColumn = 0;
          nextRow++;
        }
        if (nextColumn < 0) {
          nextColumn = model.subjects.length - 1;
          nextRow--;
        }
      }
    }
    const targetRow = variableRows[nextRow];
    const targetSubject = model.subjects[nextColumn];
    if (!targetRow || !targetSubject) return;
    event.preventDefault();
    setSelected({ rowId: targetRow.id, subjectId: targetSubject.id });
    const projectedIndex = rows.findIndex(
      (candidate) => candidate.id === targetRow.id,
    );
    if (viewport.current && projectedIndex >= 0)
      viewport.current.scrollTop = projectedIndex * ROW_HEIGHT;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        viewport.current
          ?.querySelector<HTMLElement>(
            `[data-cell="${targetRow.id}:${targetSubject.id}"]`,
          )
          ?.focus(),
      ),
    );
  };
  const paste = (
    event: ClipboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: EngineeringGridRow,
    subjectIndex: number,
  ) => {
    if (!row.definition || planReadOnly) return;
    const matrix = event.clipboardData
      .getData('text')
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split('\t'));
    if (!matrix.length) return;
    event.preventDefault();
    const rowStart = variableRows.findIndex(
      (candidate) => candidate.id === row.id,
    );
    matrix.forEach((values, rowOffset) => {
      const target = variableRows[rowStart + rowOffset];
      if (!target?.definition) return;
      values.forEach((value, columnOffset) => {
        const subject = model.subjects[subjectIndex + columnOffset];
        if (
          subject &&
          participatesInOperation(
            model.snapshot,
            subject.id,
            target.operation.sourceOperationId,
          )
        )
          setValue(target, subject.id, value);
      });
    });
  };
  const copySelection = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!selectedKeys.size || !anchor || !selected) return;
    const selectedRows = variableRows.filter((row) =>
      model.subjects.some((subject) =>
        selectedKeys.has(`${row.id}:${subject.id}`),
      ),
    );
    const selectedSubjects = model.subjects.filter((subject) =>
      selectedRows.some((row) => selectedKeys.has(`${row.id}:${subject.id}`)),
    );
    const text = selectedRows
      .map((row) =>
        selectedSubjects
          .map((subject) => {
            const key = `${row.id}:${subject.id}`;
            return participatesInOperation(
              model.snapshot,
              subject.id,
              row.operation.sourceOperationId,
            )
              ? (dirty[key] ?? row.values?.[subject.id] ?? '')
              : 'N/A';
          })
          .join('\t'),
      )
      .join('\n');
    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
  };

  return (
    <Workspace
      page="Engineering Grid"
      planShell
      lifecyclePhase={
        {
          PLAN: 'Plan',
          ACTUAL: 'Actual',
          MEASUREMENT: 'Measurement',
          EVALUATION: 'Evaluation',
        }[workspaceMode]
      }
      returnHref={returnHref}
      run={model.snapshot.runNumber}
      seriesSlug={seriesSlug}
      seriesTitle={model.snapshot.series.name}
      contextLabel={model.snapshot.workspaceContextLabel}
    >
      <main
        className={`engineering-grid-page plan-final-page lifecycle-final-page mode-${workspaceMode.toLowerCase()}`}
      >
        <h1 className="plan-screen-title">{t('Engineering Grid')}</h1>
        <nav
          className="engineering-grid-modes"
          aria-label={t('Experiment lifecycle')}
        >
          <button
            className={workspaceMode === 'PLAN' ? 'active' : ''}
            onClick={() => changeMode('PLAN')}
          >
            {t('Plan')}
          </button>
          <button
            className={workspaceMode === 'ACTUAL' ? 'active' : ''}
            onClick={() => changeMode('ACTUAL')}
          >
            {t('Actual')}
          </button>
          <button
            className={workspaceMode === 'MEASUREMENT' ? 'active' : ''}
            disabled={!resolvedMeasurements || !resolvedCatalog}
            onClick={() => changeMode('MEASUREMENT')}
          >
            {t('Measurement')}
          </button>
          <button
            className={workspaceMode === 'EVALUATION' ? 'active' : ''}
            disabled={
              !resolvedMeasurements ||
              !resolvedCatalog ||
              resolvedBindings.length === 0
            }
            onClick={() => changeMode('EVALUATION')}
          >
            {t('Evaluation')}
          </button>
          <Link href={analysisHref}>{t('Analysis')}</Link>
        </nav>
        {workspaceMode !== 'PLAN' && authoring?.error ? (
          <p role="alert">{t(authoring.error)}</p>
        ) : workspaceMode !== 'PLAN' && authoring?.loading ? (
          <output>{t('Loading lifecycle evidence…')}</output>
        ) : workspaceMode === 'ACTUAL' ? (
          <ActualExecutionGrid
            model={model}
            evidence={resolvedActualEvidence}
            onComparePlan={() => changeMode('PLAN')}
            onRecord={
              authoring && (!production || scientific?.canRecordActual)
                ? (command) => authoring.recordActual(command)
                : undefined
            }
            onContinue={authoring ? () => changeMode('MEASUREMENT') : undefined}
            now={authoring?.now}
          />
        ) : workspaceMode === 'MEASUREMENT' &&
          resolvedMeasurements &&
          resolvedCatalog ? (
          <MeasurementExecutionGrid
            model={model}
            results={resolvedMeasurements}
            catalog={resolvedCatalog}
            executionEvidence={resolvedActualEvidence}
            onRecord={
              authoring && (!production || scientific?.canRecordMeasurement)
                ? (command) => authoring.recordMeasurement(command)
                : undefined
            }
            analysisHref={authoring ? analysisHref : undefined}
            now={authoring?.now}
          />
        ) : workspaceMode === 'EVALUATION' &&
          resolvedMeasurements &&
          resolvedCatalog &&
          resolvedBindings.length ? (
          <EvaluationExecutionGrid
            key={`evaluation-${model.snapshot.id}`}
            model={model}
            results={resolvedMeasurements}
            catalog={resolvedCatalog}
            executionEvidence={resolvedActualEvidence}
            targetBindings={resolvedBindings}
            engineerEvaluations={resolvedEvaluations}
            decisionContext={resolvedDecision}
            nextRunPreview={resolvedNextRun}
            nextRunHref={nextRunHref}
            onRecordEvaluation={
              authoring && (!production || scientific?.canEvaluate)
                ? (command) => authoring.recordEvaluation(command)
                : undefined
            }
            onRecordDecision={
              authoring &&
              (!production ||
                (scientific?.canDecide && scientific?.canAuthorNextAction))
                ? (command) => authoring.recordDecision(command)
                : undefined
            }
            onCreateNextRun={
              authoring && (!production || persistedPlan?.canCreateRun)
                ? () => authoring.createNextRun()
                : undefined
            }
            actor={authoring?.profile.actor}
            now={authoring?.now}
          />
        ) : (
          <>
            {scopeMode ? (
              <section
                className="grid-scope-selection"
                aria-label={t('Choose operation range')}
              >
                <div
                  className="grid-scope-backbone"
                  onPointerUp={() => {
                    scopeDragging.current = false;
                  }}
                  onPointerLeave={() => {
                    scopeDragging.current = false;
                  }}
                >
                  <header>
                    <strong>
                      {scopeMode === 'FOCUS'
                        ? t('Focus range · viewing only')
                        : t('Experiment scope')}
                    </strong>
                    <p>
                      {scopeMode === 'FOCUS'
                        ? t(
                            'Choose operations to inspect. This does not change the saved Plan or participation.',
                          )
                        : t(
                            'Choose which operations and Subjects belong to the experiment.',
                          )}
                    </p>
                  </header>
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Seq')}</th>
                        <th>{t('Operation')}</th>
                        <th>{t('Area')}</th>
                        <th>{t('Equipment')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.operations.map((op) => (
                        <tr
                          key={op.id}
                          className={
                            scopeDraft.includes(op.id) ? 'selected' : ''
                          }
                          onPointerEnter={() => {
                            if (scopeDragging.current && scopeStage === 'RANGE')
                              chooseScopeRow(op.id, true);
                          }}
                        >
                          <td>{op.sequence}</td>
                          <td>
                            <button
                              disabled={scopeStage !== 'RANGE'}
                              aria-pressed={scopeDraft.includes(op.id)}
                              onPointerDown={(event) => {
                                scopeDragging.current = true;
                                chooseScopeRow(op.id, event.shiftKey);
                              }}
                              onClick={(event) => {
                                if (event.detail === 0)
                                  chooseScopeRow(op.id, event.shiftKey);
                              }}
                            >
                              {op.name}
                            </button>
                          </td>
                          <td>{op.area}</td>
                          <td>{op.equipment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {scopeMode === 'FOCUS' ? (
                  <aside className="grid-focus-confirm">
                    <strong>
                      {scopeDraft.length} {t('Operations selected')}
                    </strong>
                    <p>
                      {
                        model.operations.find((o) => o.id === scopeDraft[0])
                          ?.name
                      }{' '}
                      →{' '}
                      {
                        model.operations.find((o) => o.id === scopeDraft.at(-1))
                          ?.name
                      }
                    </p>
                    <p>{t('Click or drag a range. Shift-click extends it.')}</p>
                    <button
                      disabled={!scopeDraft.length}
                      onClick={() => {
                        setViewFocus(scopeDraft);
                        setProjection('FOCUS');
                        setScopeMode(null);
                        setScrollTop(0);
                      }}
                    >
                      {t('Apply focus')}
                    </button>
                    <button onClick={() => setScopeMode(null)}>
                      {t('Cancel')}
                    </button>
                  </aside>
                ) : (
                  <ScopeSelectionPanel
                    stage={scopeStage}
                    operations={model.operations}
                    draft={scopeDraft}
                    subjectIds={scopeSubjects}
                    candidates={model.snapshot.subjects}
                    changeSubjects={changeScopeSubjects}
                    onChangeSubjects={() => setChangeScopeSubjects((v) => !v)}
                    onSubjects={setScopeSubjects}
                    onContinue={() => {
                      scopeDragging.current = false;
                      setScopeStage('SUBJECTS');
                    }}
                    onConfirm={() => {
                      if (planReadOnly) return;
                      const range = confirmExperimentScope(
                        model,
                        scopeDraft[0],
                        scopeDraft.at(-1)!,
                        scopeSubjects,
                        model.snapshot.subjects.map((s) => s.id),
                      );
                      void savePlan({ ranges: [range] }).then((saved) => {
                        if (saved) {
                          setScopeMode(null);
                          setProjection('EXPERIMENT');
                          setScrollTop(0);
                        }
                      });
                    }}
                    onBack={() => setScopeStage('RANGE')}
                    onCancel={() => setScopeMode(null)}
                  />
                )}
              </section>
            ) : (
              <>
                <section
                  className="engineering-grid-toolbar"
                  aria-label={t('Grid controls')}
                >
                  <details className="plan-grid-tools">
                    <summary aria-label={t('More grid tools')}>⋯</summary>
                    <div>
                      <input
                        aria-label={t('Search grid')}
                        placeholder={t('Find operation, variable, equipment…')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <button
                        aria-pressed={compactContext}
                        onClick={() => setCompactContext((value) => !value)}
                      >
                        {compactContext
                          ? t('Expand key columns')
                          : t('Collapse key columns')}
                      </button>
                      <button
                        disabled={!inspected}
                        onClick={() => setInspectorOpen((open) => !open)}
                      >
                        {t('Details')}
                      </button>
                    </div>
                  </details>
                  <label className="plan-projection">
                    <select
                      aria-label={t('Operation projection')}
                      value={projection}
                      onChange={(event) => (
                        setProjection(event.target.value as Projection),
                        setScrollTop(0),
                        viewport.current?.scrollTo({ top: 0 })
                      )}
                    >
                      <option value="FOCUS">{t('Focus')}</option>
                      <option value="EXPERIMENT">
                        {t('Experiment scope')}
                      </option>
                      <option value="FULL_HISTORY">
                        {t('All registered operations')}
                      </option>
                    </select>
                  </label>
                  {(['ALL', 'VARIED', 'CHANGED'] as const).map((value) => (
                    <button
                      key={value}
                      className={filter === value ? 'active' : ''}
                      onClick={() => setFilter(value)}
                    >
                      {value === 'ALL'
                        ? t('All variables')
                        : value === 'VARIED'
                          ? t('◆ Varied')
                          : t('● Changed')}
                    </button>
                  ))}
                  <label className="subject-jump">
                    {t('Subject')}
                    <button
                      aria-label={t('Previous Subject')}
                      disabled={
                        !activeSubjectId ||
                        model.subjects[0]?.id === activeSubjectId
                      }
                      onClick={() => {
                        const index = model.subjects.findIndex(
                          (subject) => subject.id === activeSubjectId,
                        );
                        jumpToSubject(
                          model.subjects[Math.max(0, index - 1)]?.id ??
                            model.subjects[0].id,
                        );
                      }}
                    >
                      ‹
                    </button>
                    <select
                      aria-label={t('Jump to Subject')}
                      value={activeSubjectId ?? ''}
                      onChange={(event) => jumpToSubject(event.target.value)}
                    >
                      <option value="">{t('Jump…')}</option>
                      {model.subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.displayLabel}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label={t('Next Subject')}
                      disabled={model.subjects.at(-1)?.id === activeSubjectId}
                      onClick={() => {
                        const index = model.subjects.findIndex(
                          (subject) => subject.id === activeSubjectId,
                        );
                        jumpToSubject(
                          model.subjects[
                            Math.min(
                              model.subjects.length - 1,
                              Math.max(0, index + 1),
                            )
                          ].id,
                        );
                      }}
                    >
                      ›
                    </button>
                  </label>
                  <div className="plan-toolbar-actions">
                    <button
                      className="plan-ghost"
                      aria-label={t('Select focus range')}
                      onClick={() => beginScope('FOCUS')}
                      disabled={!model.operations.length}
                    >
                      {t('Focus Range')}
                    </button>
                    {production && (
                      <button
                        className="plan-ghost"
                        aria-label={t('Define experiment scope')}
                        onClick={() => beginScope('SCOPE')}
                        disabled={planReadOnly || !model.operations.length}
                      >
                        {t('Define Scope')}
                      </button>
                    )}
                    {production && (
                      <button
                        className="plan-save"
                        disabled={
                          planReadOnly ||
                          Object.keys(errors).length > 0 ||
                          (!Object.keys(dirty).length &&
                            !Object.keys(roles).length &&
                            !participationDraft)
                        }
                        onClick={() => {
                          void savePlan();
                        }}
                      >
                        {planSaving ? t('Saving Plan…') : t('Save Plan')}
                      </button>
                    )}
                  </div>
                </section>
                {participationOperation && !scopeMode && (
                  <ParticipationEditor
                    key={participationOperation}
                    snapshot={model.snapshot}
                    operationId={participationOperation}
                    readOnly={planReadOnly}
                    onCancel={() => setParticipationOperation(null)}
                    onApply={(ids) => {
                      if (planReadOnly) return;
                      const excluded = model.snapshot.subjects
                        .filter((s) => !ids.includes(s.id))
                        .map((s) => s.id);
                      const next = editOperationParticipation(
                        editOperationParticipation(
                          model.snapshot,
                          participationOperation,
                          ids,
                          true,
                        ),
                        participationOperation,
                        excluded,
                        false,
                      );
                      const excludedKeys = projected
                        .filter(
                          (row) =>
                            row.operation.sourceOperationId ===
                            participationOperation,
                        )
                        .flatMap((row) =>
                          excluded.map((id) => `${row.id}:${id}`),
                        );
                      setErrors((current) =>
                        Object.fromEntries(
                          Object.entries(current).filter(
                            ([key]) => !excludedKeys.includes(key),
                          ),
                        ),
                      );
                      setDirty((current) =>
                        Object.fromEntries(
                          Object.entries(current).filter(
                            ([key]) => !excludedKeys.includes(key),
                          ),
                        ),
                      );
                      setParticipationDraft(
                        JSON.stringify(next.subjectOperationIds) ===
                          JSON.stringify(baseModel.snapshot.subjectOperationIds)
                          ? null
                          : next.subjectOperationIds,
                      );
                      setParticipationOperation(null);
                    }}
                  />
                )}
                {participationDraft && (
                  <output className="participation-unsaved">
                    {t('Participation changes are not saved yet.')}
                  </output>
                )}
                <div
                  className={`plan-info-line ${persistedPlan?.lockReason ? 'is-locked' : ''}`}
                  aria-live="polite"
                >
                  <span>
                    {
                      model.operations.filter((o) => scopeContains(model, o.id))
                        .length
                    }{' '}
                    {t('scope operations ·')} {model.subjects.length}{' '}
                    {model.subjects.every((s) => s.type === 'WAFER')
                      ? t('Wafers')
                      : t('Subjects')}{' '}
                    ·{' '}
                    {planReadOnly ? t('Plan is read-only') : t('Plan editing')}{' '}
                    ·{' '}
                    {persistedPlan?.lockReason
                      ? t(
                          'Execution evidence recorded. Original Plan protected.',
                        )
                      : t(planMessage) ||
                        (production
                          ? t('Save Plan to keep changes')
                          : 'Prototype only · changes stay local')}
                  </span>
                  <span>
                    {rows.length} {t('rows ·')}{' '}
                    {Math.max(
                      Object.keys(dirty).length,
                      model.snapshot.delta.items.filter(
                        (d) => d.change === 'CHANGED',
                      ).length,
                    )}{' '}
                    {t('changed ·')} {Object.keys(errors).length} {t('invalid')}
                  </span>
                </div>
                <div
                  className={`engineering-grid-layout ${inspectorOpen ? 'with-inspector' : ''}`}
                >
                  <div className="engineering-grid-shell">
                    <div
                      className="engineering-grid-viewport"
                      ref={viewport}
                      style={{
                        height: Math.min(
                          VIEWPORT_HEIGHT,
                          Math.max(150, rows.length * ROW_HEIGHT + 24),
                        ),
                      }}
                      onCopy={copySelection}
                      onScroll={(event) =>
                        setScrollTop(event.currentTarget.scrollTop)
                      }
                    >
                      <table
                        className={`engineering-grid-table grid-plan-table ${compactContext ? 'compact-context' : ''}`}
                        aria-label={t('PLAN engineering grid')}
                        data-grid-schema={planEngineeringGridSchema.projection}
                        style={{
                          width:
                            keyWidth + model.subjects.length * subjectWidth,
                          minWidth:
                            keyWidth + model.subjects.length * subjectWidth,
                        }}
                      >
                        <colgroup>
                          <col
                            style={{
                              width: 40,
                              display: compactContext ? 'none' : undefined,
                            }}
                          />
                          <col style={{ width: 140 }} />
                          <col
                            style={{
                              width: 100,
                              display: compactContext ? 'none' : undefined,
                            }}
                          />
                          <col style={{ width: 160 }} />
                          <col
                            style={{
                              width: 60,
                              display: compactContext ? 'none' : undefined,
                            }}
                          />
                          <col style={{ width: 40 }} />
                          {model.subjects.map((subject) => (
                            <col
                              key={subject.id}
                              style={{ width: subjectWidth }}
                            />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            <th>{t('Seq')}</th>
                            <th>{t('Operation')}</th>
                            <th>{t('Equipment')}</th>
                            <th>{t('Item / Details')}</th>
                            <th>{t('Unit')}</th>
                            <th title={t('Experimental intent')}>{t('Int')}</th>
                            {model.subjects.map((subject) => (
                              <th
                                key={subject.id}
                                ref={(node) => {
                                  if (node && initialSubjectId === subject.id)
                                    node.scrollIntoView({
                                      block: 'nearest',
                                      inline: 'center',
                                    });
                                }}
                                data-subject-header={subject.id}
                                className={
                                  activeSubjectId === subject.id
                                    ? 'active-subject'
                                    : ''
                                }
                                title={`${subject.type} · ${subject.id}`}
                              >
                                {subject.displayLabel}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {start > 0 && (
                            <tr className="grid-spacer">
                              <td
                                aria-label={t('Virtualized rows above')}
                                colSpan={
                                  (compactContext ? 3 : 6) +
                                  model.subjects.length
                                }
                                style={{ height: start * ROW_HEIGHT }}
                              />
                            </tr>
                          )}
                          {visible.map((row) => (
                            <GridRow
                              key={row.id}
                              row={row}
                              model={model}
                              collapsed={collapsed.has(row.operation.id)}
                              selectedKeys={selectedKeys}
                              activeSubjectId={activeSubjectId}
                              dirty={persistedPlan?.lockReason ? {} : dirty}
                              errors={errors}
                              role={roles[row.id] ?? row.role}
                              onInspect={(row) => {
                                setInspected(row);
                                setInspectorOpen(true);
                              }}
                              onToggle={() =>
                                setCollapsed((state) => {
                                  const next = new Set(state);
                                  if (next.has(row.operation.id))
                                    next.delete(row.operation.id);
                                  else next.add(row.operation.id);
                                  return next;
                                })
                              }
                              onParticipation={() =>
                                setParticipationOperation(
                                  row.operation.sourceOperationId,
                                )
                              }
                              readOnly={planReadOnly}
                              onRole={(role) =>
                                !planReadOnly &&
                                setRoles((state) => ({
                                  ...state,
                                  [row.id]: role,
                                }))
                              }
                              onSelect={(cell, extend) => {
                                setSelected(cell);
                                const row = rows.find(
                                  (candidate) => candidate.id === cell.rowId,
                                );
                                if (row) {
                                  setInspected(row);
                                  setInspectorOpen(true);
                                }
                                if (!extend || !anchor) setAnchor(cell);
                              }}
                              onValue={setValue}
                              onMove={move}
                              onPaste={paste}
                            />
                          ))}
                          {start + visible.length < rows.length && (
                            <tr className="grid-spacer">
                              <td
                                aria-label={t('Virtualized rows below')}
                                colSpan={
                                  (compactContext ? 3 : 6) +
                                  model.subjects.length
                                }
                                style={{
                                  height:
                                    (rows.length - start - visible.length) *
                                    ROW_HEIGHT,
                                }}
                              />
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <footer>
                      {t(
                        '● Planned participant · N/A Not participating · — Value not entered. Arrow keys / Enter / Tab move cells · Shift-click extends selection · ⌘C and tab/newline paste supported',
                      )}
                    </footer>
                  </div>
                  {inspectorOpen && (
                    <GridInspector
                      row={inspected}
                      errors={errors}
                      role={
                        inspected
                          ? (roles[inspected.id] ?? inspected.role)
                          : undefined
                      }
                      onClose={() => setInspectorOpen(false)}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </Workspace>
  );
}

function GridRow(props: {
  onParticipation: () => void;
  readOnly?: boolean;
  row: EngineeringGridRow;
  model: ExperimentWorkspaceModel;
  collapsed: boolean;
  selectedKeys: ReadonlySet<string>;
  activeSubjectId: string | null;
  dirty: Record<string, string>;
  errors: Record<string, string>;
  role?: 'FIXED' | 'VARIED';
  onInspect: (row: EngineeringGridRow) => void;
  onToggle: () => void;
  onRole: (role: 'FIXED' | 'VARIED') => void;
  onSelect: (cell: Cell, extend: boolean) => void;
  onValue: (row: EngineeringGridRow, subjectId: string, value: string) => void;
  onMove: (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: EngineeringGridRow,
    subjectIndex: number,
  ) => void;
  onPaste: (
    event: ClipboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: EngineeringGridRow,
    subjectIndex: number,
  ) => void;
}) {
  const { t } = useLocale();
  const { row, model } = props;
  if (row.kind === 'OPERATION')
    return (
      <tr
        className="grid-operation-row"
        aria-label={t('{0} operation', [row.operation.name])}
        onClick={() => props.onInspect(row)}
      >
        <td>{String(row.operation.sequence).padStart(3, '0')}</td>
        <td>
          <button
            aria-label={t(props.collapsed ? 'Expand {0}' : 'Collapse {0}', [
              row.operation.name,
            ])}
            onClick={(event) => {
              event.stopPropagation();
              props.onToggle();
            }}
          >
            {props.collapsed ? '▸' : '▾'}
          </button>
          <b>{row.operation.name}</b>
        </td>
        <td>
          {row.operation.equipment}
          <small>{row.operation.module}</small>
        </td>
        <td>
          {row.operation.role === 'MEASUREMENT' ? t('◎ Measurement ·') : ''}
          <button
            className="participation-count"
            disabled={props.readOnly}
            aria-label={t('Edit participation for {0}', [row.operation.name])}
            onClick={(event) => {
              event.stopPropagation();
              props.onParticipation();
            }}
          >
            {
              model.subjects.filter((subject) =>
                participatesInOperation(
                  model.snapshot,
                  subject.id,
                  row.operation.sourceOperationId,
                ),
              ).length
            }
            /{model.subjects.length} {t('participants')}
          </button>
        </td>
        <td aria-label={t('No operation unit value')}>—</td>
        <td aria-label={t('No operation intent')}>—</td>
        {model.subjects.map((subject) => (
          <td
            key={subject.id}
            className={
              props.activeSubjectId === subject.id ? 'active-subject' : ''
            }
            aria-label={t('{0}: {1} in {2}', [
              subject.displayLabel,
              participatesInOperation(
                model.snapshot,
                subject.id,
                row.operation.sourceOperationId,
              )
                ? t('Participates')
                : t('Not participating'),
              row.operation.name,
            ])}
            title={
              participatesInOperation(
                model.snapshot,
                subject.id,
                row.operation.sourceOperationId,
              )
                ? t('Planned participant · not execution status')
                : t('Not participating in this operation')
            }
          >
            {participatesInOperation(
              model.snapshot,
              subject.id,
              row.operation.sourceOperationId,
            ) ? (
              <img src="/figma/run-plan/participant.svg" alt="" />
            ) : (
              'N/A'
            )}
          </td>
        ))}
      </tr>
    );
  if (row.kind === 'MEASUREMENT')
    return (
      <tr
        className="grid-measurement-row"
        aria-label={t('{0} measurement summary', [row.operation.name])}
        onClick={() => props.onInspect(row)}
      >
        <td aria-label={t('Inherited sequence')} />
        <td aria-label={t('Inherited operation')} />
        <td aria-label={t('Inherited equipment')} />
        <td>◎ {t(row.summary)}</td>
        <td aria-label={t('No measurement unit value')} />
        <td aria-label={t('No measurement intent')} />
        {model.subjects.map((subject) => (
          <td
            key={subject.id}
            className={
              props.activeSubjectId === subject.id ? 'active-subject' : ''
            }
          >
            {participatesInOperation(
              model.snapshot,
              subject.id,
              row.operation.sourceOperationId,
            )
              ? '—'
              : 'N/A'}
          </td>
        ))}
      </tr>
    );
  const editor = row.definition?.editor;
  return (
    <tr
      className={`grid-variable-row ${props.selectedKeys.size && [...props.selectedKeys].some((key) => key.startsWith(`${row.id}:`)) ? 'active-row' : ''}`}
      aria-label={t('{0} variable', [row.definition?.label])}
      onClick={() => props.onInspect(row)}
    >
      <td aria-label={t('Inherited sequence')}>
        <span className="grid-tree">└</span>
      </td>
      <td title={`${t(row.assignment?.kind)} · ${row.definition?.id}`}>
        <span>
          {row.definition?.label}
          <span className="grid-compact-unit"> {row.definition?.unit}</span>
        </span>
      </td>
      <td aria-label={t('Inherited equipment')}>—</td>
      <td>
        <span
          className={`plan-intent-label ${props.role === 'VARIED' ? 'varied' : ''}`}
        >
          {props.role === 'VARIED' ? 'V' : 'F'}
        </span>{' '}
        {props.role === 'VARIED' ? t('Intentionally Varied') : t('Fixed')} ·{' '}
        {t(row.assignment?.kind)}
      </td>
      <td>{row.definition?.unit || '—'}</td>
      <td>
        <button
          className={`grid-role ${props.role?.toLowerCase()}`}
          aria-label={t('Toggle {0} role, currently {1}', [
            row.definition?.label,
            t(props.role),
          ])}
          disabled={props.readOnly}
          title={t('{0} · Toggle scientific intent', [t(props.role)])}
          onClick={(event) => {
            event.stopPropagation();
            props.onRole(props.role === 'VARIED' ? 'FIXED' : 'VARIED');
          }}
        >
          {props.role === 'VARIED' ? '◆' : '◇'}
        </button>
      </td>
      {model.subjects.map((subject, subjectIndex) => {
        if (
          !participatesInOperation(
            model.snapshot,
            subject.id,
            row.operation.sourceOperationId,
          )
        )
          return (
            <td
              key={subject.id}
              className="grid-not-participating"
              aria-label={t('{0} {1}: Not participating', [
                row.definition?.label,
                subject.displayLabel,
              ])}
              title={t(
                'This Subject does not participate in this operation. This is not a missing value.',
              )}
            >
              N/A
            </td>
          );
        const key = gridCellKey(row.id, subject);
        const value =
          props.dirty[key] ??
          row.values?.[subject.id] ??
          row.definition?.defaultValue ??
          '';
        const selected = props.selectedKeys.has(key);
        const className = [
          selected ? 'selected' : '',
          props.dirty[key] !== undefined ||
          model.snapshot.delta.items.some(
            (d) => d.change === 'CHANGED' && d.label === row.definition?.label,
          )
            ? 'dirty'
            : '',
          props.errors[key] ? 'invalid' : '',
          props.activeSubjectId === subject.id ? 'active-subject' : '',
        ].join(' ');
        const label = `${row.definition?.label} ${subject.displayLabel}`;
        return (
          <td key={subject.id} className={className}>
            <span className="grid-cell-state" aria-hidden="true">
              {props.errors[key]
                ? '!'
                : props.dirty[key] !== undefined
                  ? '●'
                  : !value
                    ? '—'
                    : ''}
            </span>
            {editor === 'REFERENCE' || editor === 'SELECT' ? (
              <select
                data-cell={`${row.id}:${subject.id}`}
                aria-label={label}
                value={value}
                className={className}
                title={t(props.errors[key])}
                disabled={
                  props.readOnly || row.definition?.options.length === 0
                }
                onFocus={() =>
                  props.onSelect(
                    { rowId: row.id, subjectId: subject.id },
                    false,
                  )
                }
                onPointerDown={(event) => {
                  if (!event.shiftKey) return;
                  event.preventDefault();
                  props.onSelect(
                    { rowId: row.id, subjectId: subject.id },
                    true,
                  );
                  event.currentTarget.focus();
                }}
                onKeyDown={(event) => props.onMove(event, row, subjectIndex)}
                onPaste={(event) => props.onPaste(event, row, subjectIndex)}
                onChange={(event) =>
                  props.onValue(row, subject.id, event.target.value)
                }
              >
                {row.definition?.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            ) : (
              <input
                data-cell={`${row.id}:${subject.id}`}
                aria-label={label}
                value={value}
                className={className}
                title={t(props.errors[key])}
                readOnly={props.readOnly}
                inputMode={editor === 'NUMBER' ? 'decimal' : undefined}
                placeholder="—"
                onFocus={() =>
                  props.onSelect(
                    { rowId: row.id, subjectId: subject.id },
                    false,
                  )
                }
                onPointerDown={(event) => {
                  if (!event.shiftKey) return;
                  event.preventDefault();
                  props.onSelect(
                    { rowId: row.id, subjectId: subject.id },
                    true,
                  );
                  event.currentTarget.focus();
                }}
                onKeyDown={(event) => props.onMove(event, row, subjectIndex)}
                onPaste={(event) => props.onPaste(event, row, subjectIndex)}
                onChange={(event) =>
                  props.onValue(row, subject.id, event.target.value)
                }
              />
            )}
          </td>
        );
      })}
    </tr>
  );
}

function GridInspector({
  row,
  errors,
  role,
  onClose,
}: {
  role?: 'FIXED' | 'VARIED';
  onClose: () => void;
  row: EngineeringGridRow | null;
  errors: Record<string, string>;
}) {
  const { t } = useLocale();
  const invalid = row
    ? Object.entries(errors).filter(([key]) => key.startsWith(`${row.id}:`))
    : [];
  return (
    <aside
      className="engineering-grid-inspector"
      aria-label={t('Plan Inspector')}
    >
      <header>
        <span>{t('INSPECTOR · DETAIL')}</span>
        <button
          className="plan-inspector-close"
          onClick={onClose}
          aria-label={t('Close Inspector')}
        >
          <img src="/figma/run-plan/close.svg" alt="" />
        </button>
        <h2>
          {row?.definition?.label ??
            row?.operation.name ??
            t('Select a row or cell')}
        </h2>
        <p>
          {row
            ? `${row.operation.area} · ${row.operation.equipment}`
            : t(
                'Definition, applicability and validation context appears here.',
              )}
        </p>
      </header>
      {row?.definition && (
        <>
          <dl>
            <dt>{t('Definition')}</dt>
            <dd>{row.definition.id}</dd>
            <dt>{t('Type')}</dt>
            <dd>{t(row.definition.editor)}</dd>
            <dt>{t('Unit')}</dt>
            <dd>{row.definition.unit || t('None')}</dd>
            <dt>{t('Source')}</dt>
            <dd>{t(row.assignment?.provenance)}</dd>
            <dt>{t('Variation')}</dt>
            <dd>{role ? t(role) : '—'}</dd>
          </dl>
          <details className="plan-technical-context">
            <summary>{t('Technical context')}</summary>
            <dl>
              <dt>{t('Allowed Grain')}</dt>
              <dd>
                {row.definition.allowedGrains
                  .map((value) => t(value))
                  .join(' · ')}
              </dd>
              <dt>{t('Applicability')}</dt>
              <dd>{row.definition.applicabilityId}</dd>
              <dt>{t('Reference')}</dt>
              <dd>{row.assignment?.referenceId}</dd>
              <dt>{t('Validation')}</dt>
              <dd className={invalid.length ? 'invalid-text' : ''}>
                {invalid.length
                  ? t('{0} invalid cell(s)', [invalid.length])
                  : t('Valid')}
              </dd>
            </dl>
          </details>
        </>
      )}
      <footer>
        {t(
          'Basic values remain in the grid. This panel exposes definition and provenance only.',
        )}
      </footer>
    </aside>
  );
}
