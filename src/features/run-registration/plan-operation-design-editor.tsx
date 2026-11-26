'use client';
import {
  OperationGroupEditor,
  type ConditionScope,
} from './operation-group-editor';
import {
  applyOperationDesign,
  allocationFor,
  assignmentSource,
} from './operation-design';
import {
  effectiveAssignments,
  type RunPlanningSnapshot,
  type SetupAssignment,
} from './planning-model';
import type { EngineeringGridRow } from './engineering-grid-model';
import { validateVariableValue } from './applicability';
import { duplicateGroupBindings } from './group-binding-edit';
import { RecipeSourceEditor } from './recipe-source-editor';
import { groupText } from './group-messages';
import { useLocale } from '@/src/shared/i18n/locale';
import './operation-group-editor.css';
const scoped = (a: SetupAssignment, s: ConditionScope) =>
  (a.subjectId ?? null) === (s.subjectId ?? null) &&
  (a.groupId ?? null) === (s.groupId ?? null);
const matches = (a: SetupAssignment, b: SetupAssignment) =>
  a.processStepId === b.processStepId &&
  a.kind === b.kind &&
  a.label === b.label &&
  !a.positionId;
export function PlanOperationDesignEditor({
  snapshot,
  operationId,
  rows,
  readOnly,
  onChange,
  onClose,
}: {
  snapshot: RunPlanningSnapshot;
  operationId: string;
  rows: EngineeringGridRow[];
  readOnly: boolean;
  onChange: (snapshot: RunPlanningSnapshot) => void;
  onClose: () => void;
}) {
  const { locale, t } = useLocale();
  const g = (key: Parameters<typeof groupText>[1]) => groupText(locale, key);
  const update = (
    scope: ConditionScope,
    base: SetupAssignment,
    value: string,
    role = base.intentRole,
  ) => {
    const existing = snapshot.assignments.find(
      (a) => matches(a, base) && scoped(a, scope),
    );
    const remaining = snapshot.assignments.filter(
      (a) => !(matches(a, base) && scoped(a, scope)),
    );
    const definition = rows.find(
      (row) => row.assignment && matches(row.assignment, base),
    )?.definition;
    const referenceId =
      definition?.options.find((o) => o.value === value)?.referenceId ??
      existing?.referenceId ??
      base.referenceId;
    const assignment: SetupAssignment = {
      ...base,
      ...existing,
      id: existing?.id ?? crypto.randomUUID(),
      value,
      referenceId,
      intentRole: role,
      subjectId: scope.subjectId ?? null,
      groupId: scope.groupId ?? null,
      positionId: null,
    };
    if (
      assignment.kind === 'MATERIAL' &&
      referenceId !== (existing?.referenceId ?? base.referenceId)
    ) {
      assignment.sampleRevisionId = null;
      assignment.sampleAccessDenied = false;
    }
    onChange({
      ...snapshot,
      assignments: value.trim() ? [...remaining, assignment] : remaining,
    });
  };
  return (
    <section className="plan-group-panel">
      <header>
        <h3>
          {snapshot.steps.find((s) => s.id === operationId)?.label} ·{' '}
          {g('title')}
        </h3>
        <button className="entry-button" type="button" onClick={onClose}>
          {t('Close')}
        </button>
      </header>
      <OperationGroupEditor
        design={snapshot.operationDesign?.[operationId]}
        subjects={snapshot.subjects}
        appliedSubjectIds={snapshot.subjects
          .filter((s) =>
            snapshot.subjectOperationIds[s.id]?.includes(operationId),
          )
          .map((s) => s.id)}
        readOnly={readOnly}
        onChange={(design, removed = []) =>
          onChange({
            ...applyOperationDesign(snapshot, operationId, design),
            assignments: snapshot.assignments.filter(
              (a) =>
                a.processStepId !== operationId ||
                !removed.includes(a.groupId ?? ''),
            ),
            recipeSourceBindings: snapshot.recipeSourceBindings?.filter(
              (b) =>
                b.operationId !== operationId ||
                !removed.includes(b.groupId ?? ''),
            ),
          })
        }
        onDuplicate={(source, destination) => {
          const originals = snapshot.assignments.filter(
            (a) =>
              a.processStepId === operationId &&
              a.groupId === source &&
              !a.subjectId,
          );
          onChange({
            ...snapshot,
            recipeSourceBindings: duplicateGroupBindings(
              snapshot.recipeSourceBindings ?? [],
              operationId,
              source,
              destination,
            ),
            assignments: [
              ...snapshot.assignments.filter(
                (a) =>
                  !(
                    a.processStepId === operationId &&
                    a.groupId === destination &&
                    !a.subjectId
                  ),
              ),
              ...originals.map((a) => ({
                ...a,
                id: crypto.randomUUID(),
                groupId: destination,
              })),
            ],
          });
        }}
        renderConditions={(scope) => (
          <>
            <p>{g('retained')}</p>
            <div className="dxt-grid-scroll">
              <table className="dxt-grid">
                <thead>
                  <tr>
                    <th>{t('Condition name')}</th>
                    <th>{t('Value')}</th>
                    <th>{t('Role')}</th>
                    <th>{g('effective')}</th>
                    <th>{g('source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter(
                      (row) =>
                        row.kind === 'VARIABLE' &&
                        row.assignment &&
                        row.definition,
                    )
                    .map((row) => {
                      const base = row.assignment!,
                        def = row.definition!;
                      const explicit = snapshot.assignments.find(
                        (a) => matches(a, base) && scoped(a, scope),
                      );
                      const common = snapshot.assignments.find(
                        (a) => matches(a, base) && !a.groupId && !a.subjectId,
                      );
                      const group = snapshot.assignments.find(
                        (a) =>
                          matches(a, base) &&
                          a.groupId === scope.groupId &&
                          !a.subjectId,
                      );
                      const selected = scope.subjectId
                        ? effectiveAssignments(snapshot, scope.subjectId)[
                            `${operationId}:${base.kind}:${base.label}`
                          ]
                        : (group ?? common);
                      let invalid = false;
                      try {
                        if (explicit?.value.trim())
                          validateVariableValue(def, explicit.value);
                      } catch {
                        invalid = true;
                      }
                      const inactive = scope.subjectId
                        ? allocationFor(snapshot, operationId, scope.subjectId)
                        : null;
                      const inputLabel = `${def.label} · ${scope.subjectId ?? scope.groupId ?? g('common')}`;
                      return (
                        <tr key={row.id}>
                          <th>
                            {def.label}
                            {def.unit && <small>{def.unit}</small>}
                          </th>
                          <td>
                            {def.options.length ? (
                              <select
                                disabled={readOnly}
                                aria-label={inputLabel}
                                aria-invalid={invalid}
                                value={explicit?.value ?? ''}
                                onChange={(e) =>
                                  update(
                                    scope,
                                    base,
                                    e.target.value,
                                    explicit?.intentRole ??
                                      selected?.intentRole ??
                                      'FIXED',
                                  )
                                }
                              >
                                <option value="">{g('inherit')}</option>
                                {def.options.map((o) => (
                                  <option
                                    key={`${o.value}:${o.referenceId}`}
                                    value={o.value}
                                  >
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                disabled={readOnly}
                                aria-label={inputLabel}
                                aria-invalid={invalid}
                                placeholder={g('inherit')}
                                value={explicit?.value ?? ''}
                                onChange={(e) =>
                                  update(
                                    scope,
                                    base,
                                    e.target.value,
                                    explicit?.intentRole ??
                                      selected?.intentRole ??
                                      'FIXED',
                                  )
                                }
                              />
                            )}
                            {invalid && (
                              <small role="alert">{g('invalid')}</small>
                            )}
                            {explicit && (scope.groupId || scope.subjectId) && (
                              <button
                                type="button"
                                disabled={readOnly}
                                className="entry-button"
                                onClick={() => update(scope, base, '')}
                              >
                                {g('clear')}
                              </button>
                            )}
                          </td>
                          <td>
                            <select
                              disabled={readOnly || !explicit}
                              aria-label={`${inputLabel} · ${t('Role')}`}
                              value={
                                explicit?.intentRole ??
                                selected?.intentRole ??
                                'FIXED'
                              }
                              onChange={(e) =>
                                update(
                                  scope,
                                  base,
                                  explicit?.value ?? '',
                                  e.target.value as 'FIXED' | 'VARIED',
                                )
                              }
                            >
                              <option value="FIXED">{t('Fixed')}</option>
                              <option value="VARIED">
                                {t('Intentionally Varied')}
                              </option>
                            </select>
                          </td>
                          <td>
                            {inactive &&
                            ['SKIP', 'UNASSIGNED', 'LEGACY_EXCLUDED'].includes(
                              inactive.state,
                            )
                              ? g(inactive.state)
                              : (selected?.value ?? g('missing'))}
                          </td>
                          <td>
                            {selected
                              ? g(
                                  assignmentSource(selected) === 'SUBJECT'
                                    ? 'override'
                                    : assignmentSource(selected) === 'GROUP'
                                      ? 'group'
                                      : 'common',
                                )
                              : g('missing')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <RecipeSourceEditor
              snapshot={snapshot}
              operationId={operationId}
              groupId={scope.groupId ?? null}
              subjectId={scope.subjectId ?? null}
              readOnly={readOnly}
              onChange={(bindings) =>
                onChange({ ...snapshot, recipeSourceBindings: bindings })
              }
            />
          </>
        )}
      />
    </section>
  );
}
