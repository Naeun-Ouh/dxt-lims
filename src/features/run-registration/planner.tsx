'use client';
import Link from 'next/link';
import { useMemo, useState, useRef } from 'react';
import { ArrowLeft, GitBranch, Grid3X3, MonitorCog, Route } from 'lucide-react';
import { Workspace } from '@/src/shared/ui/workspace';
import { assignmentSummary, effectiveAssignments } from './planning-model';
import {
  confirmExperimentScope,
  scopeContains,
  applicableReferences,
  createExperimentWorkspace,
  initialSelection,
  operationAssignments,
  visibleOperations,
  type DataResolution,
  type ExperimentWorkspaceModel,
  type FlowDensity,
  type WorkspaceScope,
  type WorkspaceSelection,
  type WorkspaceView,
} from './workspace-model';

import { OperationTable } from './operation-table';
import { ScopeSelectionPanel } from './scope-selection-panel';
import { toggleOperationExpansion } from './inline-model';
import {
  resolvedDefinitionForAssignment,
  saveVariable,
} from './variable-model';
import { usePlanningState } from './use-planning-state';
import type { PlanningWorkspaceScenario } from '@/src/mock/planning-workspace-scenarios';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

const views: { id: WorkspaceView; label: string; icon: typeof Grid3X3 }[] = [
  { id: 'TABLE', label: 'Table', icon: Grid3X3 },
  { id: 'FLOW', label: 'Flow', icon: Route },
  { id: 'VARIATION', label: 'Variation', icon: GitBranch },
  { id: 'EQUIPMENT', label: 'Equipment', icon: MonitorCog },
];
export default function RunPlanner({
  scenario,
}: {
  scenario: PlanningWorkspaceScenario;
  fromRun?: number;
}) {
  const { application } = useDxtApplication();
  const configuration = application.repositories.configuration;
  const {
    snapshot,
    setSnapshot,
    ranges,
    setRanges,
    manualFocus,
    setManualFocus,
    storageError,
  } = usePlanningState(scenario);
  const baseModel = useMemo(
    () => createExperimentWorkspace(snapshot, configuration),
    [configuration, snapshot],
  );
  const model = {
    manualFocus,
    ...baseModel,
    scopeRanges: ranges,
    subjects: (snapshot.candidateSubjects ?? snapshot.subjects).filter((subject) =>
      ranges.some((range) => range.subjectIds.includes(subject.id)),
    ),
  };
  const [scopeStage, setScopeStage] = useState<'RANGE' | 'SUBJECTS' | null>(
    null,
  );
  const defining = scopeStage === 'RANGE';
  const [expanded, setExpanded] = useState<string[]>([]);
  const [changeSubjects, setChangeSubjects] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState(
    snapshot.subjects.map((subject) => subject.id),
  );
  const candidates = snapshot.candidateSubjects ?? snapshot.subjects;
  const previousScope = useRef<WorkspaceScope>('EXPERIMENT_FOCUS');
  const cancelScope = () => {
    setScopeStage(null);
    setDraft([]);
    setSubjectIds(ranges.flatMap((r) => r.subjectIds));
    select({ scope: previousScope.current });
  };
  const confirmScope = () => {
    setRanges([
      confirmExperimentScope(
        model,
        draft[0],
        draft.at(-1)!,
        subjectIds,
        candidates.map((w) => w.id),
      ),
    ]);
    setScopeStage(null);
    setDraft([]);
    select({
      scope: 'EXPERIMENT_SCOPE',
      subjectId: subjectIds.includes(selection.subjectId ?? '')
        ? selection.subjectId
        : subjectIds[0],
    });
  };
  const [rawSelection, setSelection] = useState<WorkspaceSelection>(() =>
    initialSelection(createExperimentWorkspace(scenario.snapshot, configuration)),
  );
  const selection = {
    ...rawSelection,
    subjectId: model.subjects.some((w) => w.id === rawSelection.subjectId)
      ? rawSelection.subjectId
      : (model.subjects[0]?.id ?? null),
  };
  const select = (patch: Partial<WorkspaceSelection>) =>
    setSelection((current) => ({ ...current, ...patch }));
  return (
    <Workspace page="Registration">
      <div className="ew-shell">
        <header className="ew-head">
          <div>
            <Link className="back-link" href={scenario.seriesHref}>
              <ArrowLeft size={13} />
              {snapshot.series.name}
            </Link>
            <span className="eyebrow">EXPERIMENT RUN WORKSPACE</span>
            <h1>
              Run {snapshot.runNumber} <span>/ {snapshot.series.name}</span>
            </h1>
            <p>{snapshot.intent}</p>
          </div>
          <div className="operation-area-context">
            <span>RUN SCENARIO</span>
            <b>
              {snapshot.series.name} · Run {snapshot.runNumber}
            </b>
            <small>
              Selected Operation Area:{' '}
              {
                model.operations.find((op) => op.id === selection.operationId)
                  ?.area
              }
            </small>
          </div>
        </header>
        <nav className="ew-controls" inert={!!scopeStage}>
          <Control label="Operation View">
            <select
              value={selection.scope}
              onChange={(e) =>
                select({ scope: e.target.value as WorkspaceScope })
              }
            >
              <option value="EXPERIMENT_FOCUS">Focus</option>
              <option value="EXPERIMENT_SCOPE">Experiment</option>
              <option value="FULL_HISTORY">Full History</option>
            </select>
          </Control>
          <Control label="Data Resolution">
            <div className="segmented">
              {(['LOT', 'SUBJECT', 'SITE'] as DataResolution[]).map((id) => (
                <button
                  className={selection.resolution === id ? 'active' : ''}
                  onClick={() => select({ resolution: id })}
                  key={id}
                >
                  {id === 'SUBJECT' &&
                  model.subjects.every((subject) => subject.type === 'WAFER')
                    ? 'Wafer'
                    : id[0] + id.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </Control>
          <Control label="View">
            <div className="segmented view-tabs">
              {views.map((item) => (
                <button
                  className={selection.view === item.id ? 'active' : ''}
                  onClick={() => select({ view: item.id })}
                  key={item.id}
                >
                  <item.icon size={12} />
                  {item.label}
                </button>
              ))}
            </div>
          </Control>
          <span className="ew-selection">
            Selected:{' '}
            <b>
              {
                model.operations.find((op) => op.id === selection.operationId)
                  ?.name
              }
            </b>
            {selection.subjectId && (
              <>
                {' '}
                ·{' '}
                <b>
                  {model.subjects.find(
                    (subject) => subject.id === selection.subjectId,
                  )?.displayLabel ?? selection.subjectId}
                </b>
              </>
            )}
          </span>
        </nav>
        <section
          className="scope-toolbar"
          aria-label="Experiment scope configuration"
        >
          <span>
            Manufacturing History → Experiment Scope → Subjects → Variables
          </span>
          {!scopeStage ? (
            <>
              <b>
                Experiment Scope ·{' '}
                {new Set(ranges.flatMap((r) => r.operationIds)).size} Operations
                · {model.subjects.length} Subjects
                <small>
                  {ranges
                    .map((r) => {
                      const start = model.operations.find(
                        (o) => o.id === r.startOperationId,
                      )!;
                      const end = model.operations.find(
                        (o) => o.id === r.endOperationId,
                      )!;
                      return `OP${String(start.sequence).padStart(3, '0')}–OP${String(end.sequence).padStart(3, '0')} · ${start.name} → ${end.name}`;
                    })
                    .join(' / ')}
                </small>
              </b>
              <button
                onClick={() => {
                  previousScope.current = selection.scope;
                  setScopeStage('RANGE');
                  setChangeSubjects(false);
                  setSubjectIds(ranges.flatMap((r) => r.subjectIds));
                  setDraft([]);
                  select({ view: 'TABLE', scope: 'FULL_HISTORY' });
                }}
              >
                Define Experiment Scope
              </button>
            </>
          ) : (
            <b>
              Scope Selection Mode ·{' '}
              {scopeStage === 'RANGE'
                ? 'Select Operation range'
                : 'Confirm subjects in the side panel'}
            </b>
          )}
        </section>
        <section className="ew-body">
          <div className="ew-main">
            {selection.view === 'TABLE' && (
              <OperationTable
                expanded={expanded}
                onToggle={(id) =>
                  setExpanded((ids) => toggleOperationExpansion(ids, id))
                }
                onUpdate={(item, values, definition) =>
                  setSnapshot((current) =>
                    saveVariable(current, item, values, definition),
                  )
                }
                onAdvanced={(id) => {
                  select({ operationId: id });
                  document
                    .getElementById('operation-inspector')
                    ?.focus({ preventScroll: true });
                }}
                defining={defining}
                scopeSelecting={!!scopeStage}
                draft={draft}
                onRange={setDraft}
                model={model}
                selection={selection}
                select={select}
              />
            )}{' '}
            {selection.view === 'FLOW' && (
              <FlowView model={model} selection={selection} select={select} />
            )}{' '}
            {selection.view === 'VARIATION' && (
              <VariationView
                model={model}
                selection={selection}
                select={select}
              />
            )}{' '}
            {selection.view === 'EQUIPMENT' && (
              <EquipmentView
                model={model}
                selection={selection}
                select={select}
              />
            )}
          </div>
          {scopeStage ? (
            <ScopeSelectionPanel
              stage={scopeStage}
              operations={model.operations}
              draft={draft}
              subjectIds={subjectIds}
              candidates={candidates}
              changeSubjects={changeSubjects}
              onChangeSubjects={() => setChangeSubjects((v) => !v)}
              onSubjects={setSubjectIds}
              onContinue={() => setScopeStage('SUBJECTS')}
              onConfirm={confirmScope}
              onBack={() => setScopeStage('RANGE')}
              onCancel={cancelScope}
            />
          ) : (
            <Inspector
              model={model}
              selection={selection}
              onManualFocus={() =>
                setManualFocus((ids) =>
                  ids.includes(selection.operationId)
                    ? ids.filter((id) => id !== selection.operationId)
                    : [...ids, selection.operationId],
                )
              }
            />
          )}
        </section>
        <small className="semantic-note">
          {storageError
            ? 'Browser storage unavailable. Planning changes remain in this session only.'
            : 'Planning changes saved in this browser for this Run.'}
        </small>
      </div>
    </Workspace>
  );
}
function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ew-control">
      <span>{label}</span>
      {children}
    </label>
  );
}
function FlowView({
  model,
  selection,
  select,
}: {
  model: ExperimentWorkspaceModel;
  selection: WorkspaceSelection;
  select: (p: Partial<WorkspaceSelection>) => void;
}) {
  const ops = visibleOperations(model, selection.scope);
  return (
    <div className="ew-flow">
      <header>
        <div>
          <b>Compact Operation Flow</b>
          <small>Visual navigator over the same Run snapshot</small>
        </div>
        <div className="segmented">
          {(['COMPACT', 'NORMAL', 'DETAIL'] as FlowDensity[]).map((d) => (
            <button
              className={selection.density === d ? 'active' : ''}
              onClick={() => select({ density: d })}
              key={d}
            >
              {d[0] + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </header>
      <div className={`flow-track ${selection.density.toLowerCase()}`}>
        {ops.map((op, i) => {
          const point = model.variationPoints.find(
            (p) => p.operationId === op.id,
          );
          return (
            <button
              className={[
                selection.operationId === op.id ? 'selected' : '',
                scopeContains(model, op.id) ? 'flow-in-scope' : '',
              ].join(' ')}
              onClick={() => select({ operationId: op.id })}
              key={op.id}
            >
              {i > 0 && <span className="flow-line" />}
              <em>
                {op.role === 'MEASUREMENT'
                  ? '◎'
                  : point?.labels.length
                    ? '◆'
                    : '●'}
              </em>
              <b>
                {model.scopeRanges?.some((r) => r.startOperationId === op.id)
                  ? '┃ '
                  : ''}
                {String(op.sequence).padStart(3, '0')}
                {model.scopeRanges?.some((r) => r.endOperationId === op.id)
                  ? ' ┃'
                  : ''}
              </b>
              <strong>{op.shortName}</strong>
              {selection.density !== 'COMPACT' && (
                <small>
                  {op.equipment} · {op.recipe}
                </small>
              )}
              {selection.density === 'DETAIL' && (
                <p>
                  {point?.labels.join(' · ') ||
                    `${op.inheritedCount} inherited`}
                </p>
              )}
            </button>
          );
        })}
      </div>
      <SubjectBranches model={model} selection={selection} />
    </div>
  );
}
function SubjectBranches({
  model,
  selection,
}: {
  model: ExperimentWorkspaceModel;
  selection: WorkspaceSelection;
}) {
  const op = model.operations.find((x) => x.id === selection.operationId)!;
  const varied = model.snapshot.assignments.find(
    (a) =>
      a.processStepId === op.id && a.intentRole === 'VARIED' && !a.subjectId,
  );
  if (!varied) return null;
  return (
    <div className="subject-branches">
      <span>{op.name}</span>
      <div>
        {model.subjects.map((w) => (
          <p key={w.id}>
            <b>{w.displayLabel}</b>
            <strong>
              {
                effectiveAssignments(model.snapshot, w.id)[
                  `${op.id}:${varied.kind}:${varied.label}`
                ]?.value
              }
            </strong>
          </p>
        ))}
      </div>
      <small>
        Subjects split at the varied assignment and continue through the same
        process context.
      </small>
    </div>
  );
}
function VariationView({
  model,
  selection,
  select,
}: {
  model: ExperimentWorkspaceModel;
  selection: WorkspaceSelection;
  select: (p: Partial<WorkspaceSelection>) => void;
}) {
  return (
    <div className="variation-view">
      <header>
        <b>Where did this experiment vary?</b>
        <small>
          Normal manufacturing context is compressed. VARIED remains separate
          from CHANGED.
        </small>
      </header>
      {model.variationPoints
        .filter((point) =>
          visibleOperations(model, selection.scope).some(
            (op) => op.id === point.operationId,
          ),
        )
        .map((point, index) => {
          const op = model.operations.find((x) => x.id === point.operationId)!;
          return (
            <button
              className={selection.operationId === op.id ? 'selected' : ''}
              onClick={() => select({ operationId: op.id })}
              key={op.id}
            >
              <span>{String(op.sequence).padStart(3, '0')}</span>
              <em>{op.role === 'MEASUREMENT' ? '◎' : '◆'}</em>
              <b>{op.name}</b>
              <strong>
                {point.labels.length
                  ? point.labels
                      .map((label) => {
                        const base = model.snapshot.assignments.find(
                          (a) =>
                            a.processStepId === op.id &&
                            a.label === label &&
                            !a.subjectId,
                        )!;
                        return `${label} ${
                          assignmentSummary(
                            model.snapshot,
                            base,
                            resolvedDefinitionForAssignment(model, base)?.unit,
                          ).value
                        }`;
                      })
                      .join(' · ')
                  : 'Measurement point'}
              </strong>
              <small>
                {index
                  ? `${op.sequence - model.operations[0].sequence} sequence distance from start`
                  : 'Experiment focus'}
              </small>
            </button>
          );
        })}
      <div className="delta-separation">
        <b>CHANGED vs {model.snapshot.delta.sourceLabel}</b>
        {model.snapshot.delta.items.map((d) => (
          <span key={d.id}>
            {d.label}: {d.before} → {d.after}
          </span>
        ))}
      </div>
    </div>
  );
}
function EquipmentView({
  model,
  selection,
  select,
}: {
  model: ExperimentWorkspaceModel;
  selection: WorkspaceSelection;
  select: (p: Partial<WorkspaceSelection>) => void;
}) {
  const operation = model.operations.find(
    (op) => op.id === selection.operationId,
  )!;
  const assignments = operationAssignments(model, operation.id, null);
  return (
    <div className="equipment-view">
      <aside>
        {visibleOperations(model, selection.scope).map((op) => (
          <button
            className={selection.operationId === op.id ? 'selected' : ''}
            onClick={() => select({ operationId: op.id })}
            key={op.id}
          >
            <span>{op.equipment}</span>
            <b>{op.name}</b>
            <small>{op.module}</small>
          </button>
        ))}
      </aside>
      <section>
        <header>
          <MonitorCog size={18} />
          <div>
            <span>EQUIPMENT CONTEXT</span>
            <h2>
              {operation.equipment} / {operation.module}
            </h2>
            <p>
              Supports {operation.name}. Equipment provides physical capability
              context for this Operation.
            </p>
          </div>
        </header>
        <div className="equipment-schematic">
          <span>
            {model.subjects.find(
              (subject) => subject.id === selection.subjectId,
            )?.type ?? 'SUBJECT'}
          </span>
          <i>↓</i>
          <b>[ {operation.module.toUpperCase()} ]</b>
          {operation.applicationPoints.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <dl>
          <dt>Operation</dt>
          <dd>{operation.name}</dd>
          <dt>Reference Recipe</dt>
          <dd>{operation.recipe}</dd>
          {assignments.map((a) => (
            <>
              <dt key={`${a.id}-dt`}>{a.label}</dt>
              <dd key={`${a.id}-dd`}>
                {a.intentRole === 'VARIED'
                  ? assignmentSummary(
                      model.snapshot,
                      a,
                      resolvedDefinitionForAssignment(model, a)?.unit,
                    ).value
                  : a.value}{' '}
                <small>{a.intentRole}</small>
              </dd>
            </>
          ))}
        </dl>
      </section>
    </div>
  );
}
function Inspector({
  model,
  selection,
  onManualFocus,
}: {
  model: ExperimentWorkspaceModel;
  selection: WorkspaceSelection;
  onManualFocus: () => void;
}) {
  const operation = model.operations.find(
    (op) => op.id === selection.operationId,
  )!;
  const assignments = operationAssignments(model, operation.id, null).filter(
    (a) => !a.positionId,
  );
  const measurement = model.snapshot.measurements.find(
    (m) => m.stepId === operation.id,
  );
  const references = applicableReferences(model, operation);
  return (
    <aside
      className="operation-inspector"
      id="operation-inspector"
      tabIndex={-1}
    >
      <header>
        <span>OPERATION INSPECTOR</span>
        <h2>{operation.name}</h2>
        <p>
          {String(operation.sequence).padStart(3, '0')} ·{' '}
          {selection.subjectId
            ? (model.subjects.find(
                (subject) => subject.id === selection.subjectId,
              )?.displayLabel ?? selection.subjectId)
            : 'Common context'}
        </p>
      </header>
      <InspectorSection title="Equipment Context">
        <SelectRow
          label="Equipment"
          value={operation.equipment}
          options={references.equipment}
        />
        <Row label="Module / Chamber" value={operation.module} />
      </InspectorSection>
      <InspectorSection title="Reference Recipe">
        <SelectRow
          label="Base Recipe"
          value={
            assignments.find((a) => a.kind === 'RECIPE')?.value ??
            operation.recipe
          }
          options={references.recipes}
        />
        <small className="semantic-note">
          Run overrides do not modify Recipe Master.
        </small>
      </InspectorSection>
      <button
        onClick={onManualFocus}
        aria-pressed={model.manualFocus?.includes(operation.id) ?? false}
      >
        {model.manualFocus?.includes(operation.id)
          ? '● Remove Manual Focus'
          : 'Mark as Focus'}
      </button>
      {operation.role !== 'MEASUREMENT' && (
        <InspectorSection title="Experimental Context">
          {!!references.parameters.length && (
            <Row
              label="Applicable Parameters"
              value={references.parameters.join(' · ')}
            />
          )}
          {!!references.materials.length && (
            <Row
              label="Applicable Materials"
              value={references.materials.join(' · ')}
            />
          )}
          {!!references.resources.length && (
            <Row
              label="Applicable Resources"
              value={references.resources.join(' · ')}
            />
          )}
          <h4>Definition & Provenance</h4>
          {operationAssignments(model, operation.id, selection.subjectId).map(
            (a) => (
              <details key={a.id}>
                <summary>
                  {a.label} · {a.kind}
                </summary>
                <Row label="Selected subject value" value={a.value} />
                <Row label="Role" value={a.intentRole} />
                <Row label="Reference" value={a.referenceId} />
                <Row label="Source" value={a.provenance} />
                {a.kind === 'MATERIAL' && (
                  <small>
                    Exact Sample revision used as the experiment condition.
                  </small>
                )}
              </details>
            ),
          )}
        </InspectorSection>
      )}
      {measurement && (
        <InspectorSection title="Measurement Context">
          <Row
            label={`${measurement.operation} · ${measurement.point}`}
            value={measurement.parameters.join(' · ')}
          />
          <Row
            label="Resolution"
            value="Not specified in this measurement plan"
          />
          <Row
            label="Subject"
            value={`${model.subjects[0]?.type ?? 'Subject'} / Execution`}
          />
          <Row
            label="Acquisition"
            value="Not recorded · planning context only"
          />
        </InspectorSection>
      )}
      <details>
        <summary>Advanced Settings</summary>
        <p>
          {operation.inheritedCount} inherited settings{' '}
          <button>Show All</button>
        </p>
        <small>Definition: {operation.id}</small>
      </details>
    </aside>
  );
}
function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="inspector-row">
      <span>{label}</span>
      <b>{value}</b>
    </p>
  );
}
function SelectRow({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="inspector-select">
      <span>{label}</span>
      <select
        value={value}
        disabled
        title="Reference context; use Experimental Variables for planned overrides"
      >
        {[...new Set([value, ...options])].map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
