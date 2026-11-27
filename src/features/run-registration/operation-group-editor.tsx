'use client';
import { useState, type ReactNode } from 'react';
import { useLocale } from '@/src/shared/i18n/locale';
import { DxtGridFrame } from '@/src/shared/ui/dxt-grid';
import {
  addOperationGroup,
  commonOperationDesign,
  removeOperationGroup,
  type Allocation,
  type OperationDesign,
} from './operation-design';
import { operationGroupTitle, operationGroupLabel, operationGroupDescription } from './operation-group-display';
import { groupText } from './group-messages';
export type ConditionScope = { groupId?: string; subjectId?: string };
export function OperationGroupEditor({
  design,
  subjects,
  appliedSubjectIds,
  readOnly = false,
  onChange,
  onDuplicate,
  renderConditions,
}: {
  design?: OperationDesign;
  subjects: readonly { id: string; displayLabel: string }[];
  appliedSubjectIds: string[];
  readOnly?: boolean;
  onChange: (design: OperationDesign, removedGroupIds?: string[]) => void;
  onDuplicate: (source: string, destination: string) => void;
  renderConditions: (scope: ConditionScope) => ReactNode;
}) {
  const { locale, t } = useLocale();
  const g = (key: Parameters<typeof groupText>[1]) => groupText(locale, key);
  const [scope, setScope] = useState<ConditionScope>({});
  const [announcement, setAnnouncement] = useState('');
  const add = (kind: 'BASE' | 'SPLIT') => {
    const group = {
      id: crypto.randomUUID(),
      kind,
      name: kind === 'BASE' ? 'Base' : 'Split',
    };
    onChange(
      addOperationGroup(
        design ?? commonOperationDesign(subjects.map((s) => s.id)),
        group,
      ),
    );
    setScope({ groupId: group.id });
  };
  const allocate = (id: string, value: string) => {
    // Explicit user action starts a design. Legacy absence is never silently Skip.
    const current = design ?? commonOperationDesign(subjects.map((s) => s.id));
    const allocation: Allocation = value.startsWith('GROUP:')
      ? { state: 'ASSIGNED', groupId: value.slice(6) }
      : { state: value as Allocation['state'] };
    onChange({
      ...current,
      allocations: { ...current.allocations, [id]: allocation },
    });
    setAnnouncement(
      `${id} · ${allocation.groupId ? operationGroupLabel(current, allocation.groupId) : g(allocation.state)}. ${g('retained')}`,
    );
  };
  return (
    <section className="operation-group-editor" aria-label={g('title')}>
      <div className="draft-flow-actions">
        <p>{g('commonHelp')}</p>
        {!readOnly && (
          <div className="draft-grid-actions">
            <button
              type="button"
              className="entry-button"
              disabled={design?.groups.some((x) => x.kind === 'BASE')}
              onClick={() => add('BASE')}
            >
              {g('addBase')}
            </button>
            <button
              type="button"
              className="entry-button"
              onClick={() => add('SPLIT')}
            >
              {g('addSplit')}
            </button>
            {design?.mode !== 'COMMON' && (
              <button
                type="button"
                className="entry-button"
                onClick={() => {
                  if (
                    design?.groups.length &&
                    !window.confirm(g('commonWarning'))
                  )
                    return;
                  onChange(
                    commonOperationDesign(subjects.map((s) => s.id)),
                    design?.groups.map((x) => x.id),
                  );
                  setScope({});
                }}
              >
                {g('commonAction')}
              </button>
            )}
          </div>
        )}
      </div>
      <p>{g('warning')}</p>
      <DxtGridFrame label={g('allocation')}>
        <table
          className="dxt-grid"
          style={{ minWidth: 340 + subjects.length * 140 }}
        >
          <thead>
            <tr>
              <th style={{ minWidth: 200 }}>{g('group')}</th>
              <th>{t('Actions')}</th>
              {subjects.map((s) => (
                <th key={s.id}>
                  {s.displayLabel}
                  <small>{s.id !== s.displayLabel ? s.id : ''}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{design?.mode === 'GROUPED' ? g('grouped') : g('common')}</th>
              <td>
                <button
                  type="button"
                  className="entry-button"
                  onClick={() => setScope({})}
                >
                  {g('conditions')}
                </button>
              </td>
              {subjects.map((s) => {
                const a = design?.allocations[s.id];
                const value = a?.groupId
                  ? `GROUP:${a.groupId}`
                  : (a?.state ??
                    (appliedSubjectIds.includes(s.id)
                      ? 'COMMON'
                      : 'LEGACY_EXCLUDED'));
                return (
                  <td key={s.id}>
                    <select
                      disabled={readOnly || !design}
                      aria-label={`${s.id} · ${g('allocation')}`}
                      value={value}
                      onChange={(e) => allocate(s.id, e.target.value)}
                    >
                      {!design && value === 'LEGACY_EXCLUDED' && (
                        <option value="LEGACY_EXCLUDED" disabled>
                          {g('LEGACY_EXCLUDED')}
                        </option>
                      )}
                      {design?.mode === 'GROUPED' ? (
                        <option value="UNASSIGNED">{g('UNASSIGNED')}</option>
                      ) : (
                        <option value="COMMON">{g('COMMON')}</option>
                      )}
                      <option value="SKIP">{g('SKIP')}</option>
                      {design?.groups.map((group) => (
                        <option key={group.id} value={`GROUP:${group.id}`}>
                          {operationGroupLabel(design, group.id)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="entry-button dxt-action-text"
                      onClick={() => setScope({ subjectId: s.id })}
                    >
                      {g('override')}
                    </button>
                  </td>
                );
              })}
            </tr>
            {design?.groups.map((group) => (
              <tr key={group.id} className="matrix-condition">
                <th>
                  <span>{operationGroupTitle(design, group.id)}</span>
                  <input
                    maxLength={200}
                    disabled={readOnly}
                    aria-label={`${operationGroupTitle(design, group.id)} · ${g('description')}`}
                    placeholder={g('description')}
                    value={operationGroupDescription(group)}
                    onChange={(e) =>
                      onChange({
                        ...design,
                        groups: design.groups.map((x) =>
                          x.id === group.id
                            ? { ...x, name: e.target.value.trim() ? e.target.value : (x.kind === 'BASE' ? 'Base' : 'Split') }
                            : x,
                        ),
                      })
                    }
                  />
                </th>
                <td>
                  <button
                    type="button"
                    className="entry-button"
                    onClick={() => setScope({ groupId: group.id })}
                  >
                    {g('edit')}
                  </button>
                  {!readOnly && (
                    <>
                      <select
                        aria-label={`${operationGroupLabel(design, group.id)} · ${g('duplicate')}`}
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            onDuplicate(e.target.value, group.id);
                        }}
                      >
                        <option value="">{g('duplicate')}</option>
                        {design.groups
                          .filter((x) => x.id !== group.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {operationGroupLabel(design, x.id)}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="entry-button dxt-action-danger"
                        onClick={() => {
                          if (window.confirm(g('deleteWarning'))) {
                            onChange(removeOperationGroup(design, group.id), [
                              group.id,
                            ]);
                            if (scope.groupId === group.id) setScope({});
                          }
                        }}
                      >
                        {g('delete')}
                      </button>
                    </>
                  )}
                </td>
                {subjects.map((s) => (
                  <td key={s.id}>
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      aria-label={`${operationGroupLabel(design, group.id)} · ${s.id}`}
                      checked={design.allocations[s.id]?.groupId === group.id}
                      onChange={(e) =>
                        allocate(
                          s.id,
                          e.target.checked ? `GROUP:${group.id}` : 'UNASSIGNED',
                        )
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </DxtGridFrame>
      <output aria-live="polite">{announcement}</output>
      <aside
        className="group-condition-inspector"
        aria-label={g('selectedScope')}
      >
        <h4>
          {scope.subjectId
            ? `${g('override')} · ${scope.subjectId}`
            : scope.groupId
              ? operationGroupLabel(design, scope.groupId)
              : g('common')}
        </h4>
        {renderConditions(scope)}
      </aside>
    </section>
  );
}
