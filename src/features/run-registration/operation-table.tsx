'use client';
import { Fragment, useRef } from 'react';
import type { SetupAssignment } from './planning-model';
import type { ApplicableVariableDefinition } from './applicability';
import {
  visibleOperations,
  scopeContains,
  selectOperationRange,
  type ExperimentWorkspaceModel,
  type WorkspaceSelection,
} from './workspace-model';
import { operationExperimentSummary } from './inline-model';
import {
  ExpansionButton,
  OperationMatrix,
  InlineMeasurement,
} from './operation-matrix';
export function OperationTable({
  expanded,
  onToggle,
  onUpdate,
  onAdvanced,
  defining,
  scopeSelecting = defining,
  draft,
  onRange,
  model,
  selection,
  select,
}: {
  expanded: string[];
  onToggle: (id: string) => void;
  onUpdate: (
    item: SetupAssignment,
    values: Record<string, string>,
    definition?: ApplicableVariableDefinition,
  ) => void;
  onAdvanced: (id: string) => void;
  defining: boolean;
  scopeSelecting?: boolean;
  draft: string[];
  onRange: (ids: string[]) => void;
  model: ExperimentWorkspaceModel;
  selection: WorkspaceSelection;
  select: (p: Partial<WorkspaceSelection>) => void;
}) {
  const anchor = useRef<string | null>(null),
    dragging = useRef(false);
  const operations = visibleOperations(model, selection.scope);
  return (
    <div
      className={`ew-table-wrap ${defining ? 'range-mode' : ''}`}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onPointerLeave={() => {
        dragging.current = false;
      }}
    >
      <table className="ew-table">
        {model.snapshot.manufacturingContext?.map((context) => (
          <caption key={context.label}>
            {context.label} {context.value}
          </caption>
        ))}
        <thead>
          <tr>
            <th>Seq</th>
            <th>Operation</th>
            <th>Area</th>
            <th>Equipment</th>
            <th>Recipe</th>
            <th>Experiment</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => {
            const expandable =
              scopeContains(model, op.id) || op.role === 'MEASUREMENT';
            const isExpanded = expanded.includes(op.id) && !scopeSelecting;
            return (
              <Fragment key={op.id}>
                <tr
                  className={[
                    selection.operationId === op.id ? 'selected' : '',
                    scopeContains(model, op.id) ? 'in-scope' : '',
                    draft.includes(op.id) ? 'range-preview' : '',
                  ].join(' ')}
                  onPointerDown={(e) => {
                    if (!defining || e.button !== 0) return;
                    e.preventDefault();
                    dragging.current = true;
                    anchor.current =
                      e.shiftKey && anchor.current ? anchor.current : op.id;
                    onRange(
                      selectOperationRange(
                        model.operations,
                        anchor.current,
                        op.id,
                      ),
                    );
                  }}
                  onPointerEnter={(e) => {
                    if (
                      defining &&
                      dragging.current &&
                      e.buttons === 1 &&
                      anchor.current
                    )
                      onRange(
                        selectOperationRange(
                          model.operations,
                          anchor.current,
                          op.id,
                        ),
                      );
                  }}
                  onClick={() => {
                    if (!scopeSelecting) select({ operationId: op.id });
                  }}
                  key={op.id}
                >
                  <td className="scope-rail">
                    {String(op.sequence).padStart(3, '0')}
                  </td>
                  <td>
                    <div className="operation-name">
                      {expandable && !scopeSelecting && (
                        <ExpansionButton
                          name={op.name}
                          expanded={isExpanded}
                          disabled={defining}
                          onToggle={() => onToggle(op.id)}
                        />
                      )}
                      <b>{op.name}</b>
                    </div>
                  </td>
                  <td>{op.area}</td>
                  <td>
                    {op.equipment}
                    <small>{op.module}</small>
                  </td>
                  <td>{op.recipe}</td>
                  <td>
                    {' '}
                    <small className="operation-meaning">
                      {operationExperimentSummary(model, op.id)}{' '}
                      {model.manualFocus?.includes(op.id) && (
                        <span title="Manual Focus">●</span>
                      )}
                    </small>
                  </td>
                </tr>
                {isExpanded && expandable && (
                  <tr className="operation-expansion">
                    <td colSpan={6}>
                      {op.role === 'MEASUREMENT' ? (
                        <InlineMeasurement
                          model={model}
                          operationId={op.id}
                          onAdvanced={() => onAdvanced(op.id)}
                        />
                      ) : (
                        <OperationMatrix
                          model={model}
                          operationId={op.id}
                          onUpdate={onUpdate}
                          onSelectSubject={(id) =>
                            select({ operationId: op.id, subjectId: id })
                          }
                          onAdvanced={() => onAdvanced(op.id)}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <footer>
        {operations.length} operations shown ·{' '}
        {
          {
            EXPERIMENT_FOCUS: 'Focus',
            EXPERIMENT_SCOPE: 'Experiment',
            FULL_HISTORY: 'Full History',
          }[selection.scope]
        }
      </footer>
    </div>
  );
}
