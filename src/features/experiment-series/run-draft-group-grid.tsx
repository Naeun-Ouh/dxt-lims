'use client';
import { operationGroupLabel } from '../run-registration/operation-group-display';
import '@/src/features/run-registration/operation-group-editor.css';
import { Fragment, useMemo, useState } from 'react';
import {
  materializeRunDraft,
  type RunDraft,
} from '@/src/application/run-draft';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { duplicateGroupBindings } from '@/src/features/run-registration/group-binding-edit';
import { RecipeSourceEditor } from '@/src/features/run-registration/recipe-source-editor';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import type { ReferenceCatalog } from '@/src/domain/reference';
import { DxtGridFrame } from '@/src/shared/ui/dxt-grid';
import { useLocale } from '@/src/shared/i18n/locale';
import { OperationMasterPicker } from './operation-master-picker';
import { RunDraftSubjects } from './run-draft-subjects';
import { RunDraftMeasurementGrid } from './run-draft-measurement-grid';
import { RunDraftConditionCell } from './run-draft-condition-cell';
import { RunDraftFeedback, conditionFeedbackKey } from './run-draft-feedback';
import {
  OperationGroupEditor,
  type ConditionScope,
} from '@/src/features/run-registration/operation-group-editor';
import { commonOperationDesign } from '@/src/features/run-registration/operation-design';
import { groupText } from '@/src/features/run-registration/group-messages';
import {
  duplicateDraftGroupConditions,
  effectiveDraftItem,
  inScope,
  prepareGroupDraft,
  replaceDraftScope,
  updateDraftDesign,
} from './run-draft-group-edit';
const PAGE_SIZE = 50;
export function RunDraftGroupGrid({
  draft,
  options,
  catalog,
  baseSnapshot,
  onChange: emit,
}: {
  baseSnapshot?: RunPlanningSnapshot;
  draft: RunDraft;
  options: BootstrapOperationOption[];
  catalog: ReferenceCatalog;
  onChange: (draft: RunDraft) => void;
}) {
  const onChange = (next: RunDraft) => emit(prepareGroupDraft(next));
  const { locale, t } = useLocale();
  const g = (key: Parameters<typeof groupText>[1]) => groupText(locale, key);
  const [picker, setPicker] = useState(false),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set()),
    [focused, setFocused] = useState<Set<string>>(new Set()),
    [focusOnly, setFocusOnly] = useState(false);
  const sourceSnapshot = useMemo(() => {
    if (!baseSnapshot) return null;
    try {
      return materializeRunDraft(
        baseSnapshot,
        draft,
        options,
        catalog,
        baseSnapshot.subjects[0]?.type === 'WAFER' ? 'WAFER' : 'SPECIMEN',
      );
    } catch {
      return null;
    }
  }, [baseSnapshot, draft, options, catalog]);
  const optionById = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options],
  );
  const update = (
    index: number,
    patch: Partial<RunDraft['operations'][number]>,
  ) =>
    onChange({
      ...draft,
      operations: draft.operations.map((op, i) =>
        i === index ? { ...op, ...patch } : op,
      ),
    });
  const selected = draft.operations
    .map((op, index) => ({ op, index, option: optionById.get(op.optionId) }))
    .filter(
      ({ op, option }) =>
        (!focusOnly || focused.has(op.instanceId!)) &&
        (!search ||
          option?.operation.label.toLowerCase().includes(search.toLowerCase())),
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(selected.length / PAGE_SIZE) - 1),
  );
  const shown = selected.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const move = (index: number, offset: number) => {
    const operations = [...draft.operations];
    [operations[index], operations[index + offset]] = [
      operations[index + offset],
      operations[index],
    ];
    onChange({ ...draft, operations });
  };
  return (
    <>
      <RunDraftSubjects
        draft={draft}
        onChange={(next) => onChange(prepareGroupDraft(next))}
      />
      <fieldset className="draft-grid-section">
        <legend>2. {t('Process Flow & Conditions')}</legend>
        <div className="draft-flow-actions">
          <label>
            {g('search')}
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={focusOnly}
              onChange={(e) => {
                setFocusOnly(e.target.checked);
                setPage(0);
              }}
            />
            {g('focusOnly')}
          </label>
          <button
            type="button"
            className="entry-button"
            onClick={() => setPicker(true)}
          >
            {t('Operation master lookup')}
          </button>
        </div>
        <p>{g('focusHelp')}</p>
        <RunDraftFeedback location="operations" />
        {picker && (
          <OperationMasterPicker
            catalog={catalog}
            options={options}
            onClose={() => setPicker(false)}
            onAdd={(ids) =>
              onChange({
                ...draft,
                operations: [
                  ...draft.operations,
                  ...ids.map((optionId) => ({
                    optionId,
                    instanceId: crypto.randomUUID(),
                    design: commonOperationDesign(
                      draft.subjects.map((s) => s.id),
                    ),
                    subjectIds: draft.subjects.map((s) => s.id),
                    items: [],
                    parameterIds: [],
                    point: null,
                  })),
                ],
              })
            }
          />
        )}
        <DxtGridFrame
          label={t('Operation and Subject matrix')}
          className="draft-matrix-scroll"
        >
          <table
            className="dxt-grid draft-matrix with-attributes"
            style={{ minWidth: 850 + draft.subjects.length * 120 }}
          >
            <thead>
              <tr>
                <th>{g('focus')}</th>
                <th>#</th>
                <th>{t('Operation')}</th>
                <th>{t('Operation type')}</th>
                <th>{t('Area')}</th>
                <th>{t('Equipment')}</th>
                <th>{t('Module')}</th>
                <th>{t('Actions')}</th>
                {draft.subjects.map((s) => (
                  <th key={s.id}>{s.displayLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(({ op, index, option }) => {
                const id = op.instanceId!;
                const open = expanded.has(id);
                const context = option?.operation.context;
                return (
                  <Fragment key={id}>
                    <tr className="matrix-operation">
                      <td>
                        <input
                          type="checkbox"
                          checked={focused.has(id)}
                          aria-label={`${index + 1} · ${g('focus')}`}
                          onChange={(e) =>
                            setFocused((previous) => {
                              const next = new Set(previous);
                              if (e.target.checked) next.add(id);
                              else next.delete(id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td>{index + 1}</td>
                      <th scope="row">
                        <button
                          type="button"
                          className="entry-button dxt-action-text"
                          aria-expanded={open}
                          aria-label={`${index + 1}. ${option?.operation.label ?? op.optionId} · ${g(open ? 'collapse' : 'expand')}`}
                          onClick={() =>
                            setExpanded((previous) => {
                              const next = new Set(previous);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return next;
                            })
                          }
                        >
                          {open ? '▾' : '▸'}{' '}
                          {option?.operation.label ??
                            t('Display name unavailable')}
                        </button>
                        <small>
                          {op.design?.mode === 'GROUPED'
                            ? g('grouped')
                            : op.design
                              ? g('common')
                              : g('legacy')}{' '}
                          · {op.design?.groups.length ?? 0} {g('group')}
                        </small>
                      </th>
                      <td>
                        {t(
                          option?.operation.role === 'MEASUREMENT'
                            ? 'Measurement'
                            : 'Process Operation',
                        )}
                      </td>
                      <td>{context?.areaLabel ?? '—'}</td>
                      <td>{context?.equipmentLabel ?? '—'}</td>
                      <td>{context?.moduleLabel ?? '—'}</td>
                      <td>
                        <div className="draft-grid-actions">
                          {[-1, 1].map((offset) => (
                            <button
                              type="button"
                              className="entry-button"
                              key={offset}
                              disabled={
                                index + offset < 0 ||
                                index + offset >= draft.operations.length
                              }
                              aria-label={`${index + 1} · ${t(offset < 0 ? 'Move up' : 'Move down')}`}
                              onClick={() => move(index, offset)}
                            >
                              {offset < 0 ? '↑' : '↓'}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="entry-button dxt-action-danger"
                            onClick={() =>
                              onChange({
                                ...draft,
                                operations: draft.operations.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          >
                            {t('Remove')}
                          </button>
                        </div>
                      </td>
                      {draft.subjects.map((s) => {
                        const a = op.design?.allocations[s.id];
                        return (
                          <td key={s.id}>
                            {a?.groupId
                              ? operationGroupLabel(op.design, a.groupId)
                              : g(
                                  a?.state ??
                                    (op.subjectIds.includes(s.id)
                                      ? 'COMMON'
                                      : 'LEGACY_EXCLUDED'),
                                )}
                          </td>
                        );
                      })}
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={8 + draft.subjects.length}>
                          <OperationGroupEditor
                            design={op.design}
                            subjects={draft.subjects}
                            appliedSubjectIds={op.subjectIds}
                            onChange={(design, removed) =>
                              update(
                                index,
                                updateDraftDesign(op, design, removed),
                              )
                            }
                            onDuplicate={(source, destination) =>
                              onChange({
                                ...draft,
                                operations: draft.operations.map(
                                  (operation, i) =>
                                    i === index
                                      ? {
                                          ...operation,
                                          items: duplicateDraftGroupConditions(
                                            op.items,
                                            source,
                                            destination,
                                          ),
                                        }
                                      : operation,
                                ),
                                recipeSourceBindings: duplicateGroupBindings(
                                  draft.recipeSourceBindings ?? [],
                                  id,
                                  source,
                                  destination,
                                ),
                              })
                            }
                            renderConditions={(scope) => (
                              <>
                                {option?.operation.role === 'PROCESS' ? (
                                  <DraftScopedConditions
                                    index={index}
                                    op={op}
                                    option={option}
                                    scope={scope}
                                    onChange={(items) =>
                                      update(index, { items })
                                    }
                                  />
                                ) : (
                                  <p>{t('Measurement Plan')}</p>
                                )}
                                {baseSnapshot && !sourceSnapshot && (
                                  <output>{g('sourceUnavailable')}</output>
                                )}
                                {sourceSnapshot && (
                                  <RecipeSourceEditor
                                    snapshot={sourceSnapshot}
                                    operationId={id}
                                    groupId={scope.groupId ?? null}
                                    subjectId={scope.subjectId ?? null}
                                    onChange={(recipeSourceBindings) =>
                                      onChange({
                                        ...draft,
                                        recipeSourceBindings,
                                      })
                                    }
                                  />
                                )}
                              </>
                            )}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={8 + draft.subjects.length}>
                    {g('noOperations')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DxtGridFrame>
        <nav className="draft-flow-actions" aria-label={t('Pagination')}>
          <button
            type="button"
            className="entry-button"
            disabled={!currentPage}
            onClick={() => setPage(currentPage - 1)}
          >
            {g('previous')}
          </button>
          <span>
            {selected.length ? currentPage * PAGE_SIZE + 1 : 0}–
            {Math.min((currentPage + 1) * PAGE_SIZE, selected.length)} /{' '}
            {selected.length}
          </span>
          <button
            type="button"
            className="entry-button"
            disabled={(currentPage + 1) * PAGE_SIZE >= selected.length}
            onClick={() => setPage(currentPage + 1)}
          >
            {g('next')}
          </button>
        </nav>
      </fieldset>
      <RunDraftMeasurementGrid
        draft={draft}
        options={options}
        catalog={catalog}
        change={update}
      />
    </>
  );
}
function DraftScopedConditions({
  index,
  op,
  option,
  scope,
  onChange,
}: {
  index: number;
  op: RunDraft['operations'][number];
  option: BootstrapOperationOption;
  scope: ConditionScope;
  onChange: (items: RunDraft['operations'][number]['items']) => void;
}) {
  const { locale, t } = useLocale();
  const g = (key: Parameters<typeof groupText>[1]) => groupText(locale, key);
  const scoped = op.items
    .filter((item) => inScope(item, scope))
    .map((item) => ({ ...item, subjectId: null, groupId: null }));
  return (
    <>
      <p>{g('retained')}</p>
      <table className="dxt-grid">
        <thead>
          <tr>
            <th>{t('Condition name')}</th>
            <th>
              {t('Value')} / {t('Role')}
            </th>
            <th>{t('Unit')}</th>
            <th>{g('effective')}</th>
            <th>{g('source')}</th>
          </tr>
        </thead>
        <tbody>
          {option.operation.items.map((def) => {
            const effective = effectiveDraftItem(
              op.items,
              def.applicabilityId,
              scope,
              op.design,
            );
            const explicit = op.items.find(
              (item) =>
                item.applicabilityId === def.applicabilityId &&
                inScope(item, scope),
            );
            return (
              <tr key={def.applicabilityId}>
                <th>{def.label}</th>
                <td>
                  <RunDraftConditionCell
                    feedbackKey={conditionFeedbackKey(
                      index,
                      def.applicabilityId,
                      scope.subjectId ?? null,
                    )}
                    def={def}
                    items={scoped}
                    subjectId={null}
                    required={
                      option.conditionRequirements?.[def.applicabilityId]
                    }
                    participating
                    label={`${option.operation.label} · ${def.label}`}
                    onChange={(edited) =>
                      onChange(replaceDraftScope(op.items, scope, edited))
                    }
                  />
                  {(scope.groupId || scope.subjectId) && explicit && (
                    <button
                      type="button"
                      className="entry-button dxt-action-text"
                      onClick={() =>
                        onChange(op.items.filter((item) => item !== explicit))
                      }
                    >
                      {g('clear')}
                    </button>
                  )}
                </td>
                <td>{def.unit ?? '—'}</td>
                <td>
                  {scope.subjectId &&
                  op.design?.allocations[scope.subjectId] &&
                  ['SKIP', 'UNASSIGNED'].includes(
                    op.design.allocations[scope.subjectId].state,
                  )
                    ? g(op.design.allocations[scope.subjectId].state)
                    : (effective?.value ?? g('missing'))}{' '}
                  {effective
                    ? `· ${t(effective.intentRole === 'VARIED' ? 'Intentionally Varied' : 'Fixed')}`
                    : ''}
                </td>
                <td>
                  {effective?.subjectId
                    ? g('override')
                    : effective?.groupId
                      ? operationGroupLabel(op.design, effective.groupId)
                      : effective
                        ? g('common')
                        : g('missing')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
