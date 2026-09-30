'use client';
import { useState } from 'react';
import type { SetupAssignment } from './planning-model';
import {
  sequenceAssignments,
  type ExperimentWorkspaceModel,
} from './workspace-model';
import {
  resolvedDefinitionForAssignment,
  resolvedVariableDefinitions,
} from './variable-model';
import type { ApplicableVariableDefinition } from './applicability';
import { definitionAssignment } from './applicability';
import {
  changeVariableRole,
  commonSubjectValues,
  matrixVariables,
  measurementInlineSummary,
  subjectValues,
} from './inline-model';

type Update = (
  item: SetupAssignment,
  values: Record<string, string>,
  definition?: ApplicableVariableDefinition,
) => void;
export function ExpansionButton({
  name,
  expanded,
  onToggle,
  disabled = false,
}: {
  name: string;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="operation-expand"
      disabled={disabled}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name}`}
      aria-expanded={expanded}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => {
        if (!disabled) e.stopPropagation();
      }}
    >
      {expanded ? '▾' : '▸'}
    </button>
  );
}
export function OperationMatrix({
  model,
  operationId,
  onUpdate,
  onAdvanced,
  onSelectSubject,
}: {
  model: ExperimentWorkspaceModel;
  operationId: string;
  onUpdate: Update;
  onAdvanced: () => void;
  onSelectSubject?: (id: string) => void;
}) {
  const items = matrixVariables(model, operationId);
  const definitions = resolvedVariableDefinitions(model, operationId);
  const available = definitions.filter(
    (definition) =>
      definition.assignmentKind !== 'RECIPE' &&
      !items.some(
        (item) =>
          item.kind === definition.assignmentKind &&
          item.referenceId === definition.assignmentReferenceId,
      ),
  );
  return (
    <section
      className="operation-matrix"
      aria-label="Experimental variable matrix"
    >
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Role</th>
            <th>Apply To</th>
            {model.subjects.map((subject) => (
              <th key={subject.id}>{subject.displayLabel}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <MatrixVariable
              key={item.id}
              model={model}
              item={item}
              onUpdate={onUpdate}
              onSelectSubject={onSelectSubject}
            />
          ))}
          {!items.length && (
            <tr>
              <td colSpan={4 + model.subjects.length}>
                No experimental variables configured for this Operation.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <footer>
        <label>
          + Add Variable{' '}
          <select
            aria-label="Add Variable"
            value=""
            disabled={!available.length}
            onChange={(e) => {
              const definition = available.find(
                (a) => a.applicabilityId === e.target.value,
              );
              if (definition) {
                const item = definitionAssignment(definition, operationId);
                onUpdate(
                  item,
                  commonSubjectValues(model, item.value),
                  definition,
                );
              }
            }}
          >
            <option value="">
              {available.length
                ? 'Select applicable definition'
                : 'All registered variables shown'}
            </option>
            {available.map((a) => (
              <option key={a.applicabilityId} value={a.applicabilityId}>
                {a.label} · {a.assignmentKind}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onAdvanced}>Advanced → Inspector</button>
      </footer>
    </section>
  );
}
function MatrixVariable({
  model,
  item,
  onUpdate,
  onSelectSubject,
}: {
  model: ExperimentWorkspaceModel;
  item: SetupAssignment;
  onUpdate: Update;
  onSelectSubject?: (id: string) => void;
}) {
  const values = subjectValues(model, item),
    current = values[model.subjects[0]?.id] ?? item.value;
  const definition = resolvedDefinitionForAssignment(model, item);
  const [helpers, setHelpers] = useState(false);
  const [start, setStart] = useState(String(parseFloat(current) || 0)),
    [step, setStep] = useState('1');
  const choices =
    definition && ['SELECT', 'REFERENCE'].includes(definition.editor)
      ? definition.options.map((option) => option.value)
      : null;
  const edit = (
    value: string,
    update: (value: string) => void,
    label: string,
  ) =>
    choices ? (
      <select
        aria-label={label}
        value={value}
        onChange={(e) => update(e.target.value)}
      >
        {choices.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    ) : (
      <input
        aria-label={label}
        inputMode={definition?.editor === 'NUMBER' ? 'decimal' : undefined}
        value={value}
        onChange={(e) => update(e.target.value)}
      />
    );
  const varied = item.intentRole === 'VARIED';
  return (
    <tr>
      <th scope="row">
        {item.label}
        <small>{item.kind}</small>
      </th>
      <td>
        <select
          aria-label={`${item.label} role`}
          value={item.intentRole}
          onChange={(e) => {
            const changed = changeVariableRole(
              model,
              item,
              e.target.value as SetupAssignment['intentRole'],
            );
            onUpdate(changed.item, changed.values, definition);
          }}
        >
          <option value="FIXED">FIXED</option>
          <option value="VARIED">◆ VARIED</option>
        </select>
      </td>
      <td>
        {definition?.defaultGrain === 'SUBJECT'
          ? (model.subjects[0]?.type ?? 'Subject')
          : (definition?.defaultGrain ?? 'Subject')}
      </td>
      {varied ? (
        model.subjects.map((w, i) => (
          <td
            key={w.id}
            onFocus={() => onSelectSubject?.(w.id)}
            className={
              i > 0 && values[w.id] === values[model.subjects[i - 1].id]
                ? 'same-adjacent'
                : ''
            }
          >
            {edit(
              values[w.id],
              (value) =>
                onUpdate(item, { ...values, [w.id]: value }, definition),
              `${item.label} ${w.displayLabel}`,
            )}
          </td>
        ))
      ) : (
        <td
          colSpan={Math.max(1, model.subjects.length)}
          className="fixed-common"
        >
          {edit(
            current,
            (value) =>
              onUpdate(
                { ...item, value },
                commonSubjectValues(model, value),
                definition,
              ),
            `${item.label} common value`,
          )}
          <small>Across {model.subjects.length} selected subjects</small>
          {new Set(Object.values(values)).size > 1 && (
            <small>
              Stored subject values differ; editing sets one common value.
            </small>
          )}
        </td>
      )}
      <td className="matrix-actions">
        {varied && (
          <>
            <button
              aria-expanded={helpers}
              aria-label={`${item.label} quick assignment`}
              onClick={() => setHelpers((v) => !v)}
            >
              ⋯
            </button>
            {helpers && (
              <div className="matrix-helpers">
                <button
                  onClick={() =>
                    onUpdate(
                      item,
                      commonSubjectValues(model, current),
                      definition,
                    )
                  }
                >
                  Set Same
                </button>
                {definition?.editor === 'NUMBER' && (
                  <>
                    <label>
                      Start
                      <input
                        type="number"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </label>
                    <label>
                      Step
                      <input
                        type="number"
                        value={step}
                        onChange={(e) => setStep(e.target.value)}
                      />
                    </label>
                    <button
                      disabled={
                        !start.trim() ||
                        !step.trim() ||
                        ![Number(start), Number(step)].every(Number.isFinite) ||
                        Number(step) === 0
                      }
                      onClick={() =>
                        onUpdate(
                          item,
                          sequenceAssignments(
                            model.subjects.map((w) => w.id),
                            Number(start),
                            Number(start) +
                              (model.subjects.length - 1) * Number(step),
                            Number(step),
                          ),
                        )
                      }
                    >
                      Sequence
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </td>
    </tr>
  );
}
export function InlineMeasurement({
  model,
  operationId,
  onAdvanced,
}: {
  model: ExperimentWorkspaceModel;
  operationId: string;
  onAdvanced: () => void;
}) {
  const summary = measurementInlineSummary(model, operationId);
  return (
    <section
      className="inline-measurement"
      aria-label="Measurement planning summary"
    >
      <dl>
        <dt>Measurement</dt>
        <dd>{summary.measurement}</dd>
        <dt>Subject</dt>
        <dd>{summary.subject}</dd>
        <dt>Resolution</dt>
        <dd>{summary.resolution}</dd>
        <dt>Acquisition</dt>
        <dd>{summary.acquisition}</dd>
      </dl>
      <button onClick={onAdvanced}>Measurement Detail → Inspector</button>
    </section>
  );
}
