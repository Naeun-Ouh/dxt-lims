'use client';
import { useState } from 'react';
import { effectiveAssignments, type SetupAssignment } from './planning-model';
import {
  sequenceAssignments,
  type ExperimentWorkspaceModel,
} from './workspace-model';
import { resolvedDefinitionForAssignment } from './variable-model';

export function VariableEditor({
  model,
  item,
  onUpdate,
}: {
  model: ExperimentWorkspaceModel;
  item: SetupAssignment;
  onUpdate: (item: SetupAssignment, values: Record<string, string>) => void;
}) {
  const [start, setStart] = useState('34');
  const [step, setStep] = useState('1');
  const values = Object.fromEntries(
    model.subjects.map((w) => [
      w.id,
      effectiveAssignments(model.snapshot, w.id)[
        `${item.processStepId}:${item.kind}:${item.label}`
      ]?.value ?? item.value,
    ]),
  );
  const same = (value: string) =>
    Object.fromEntries(model.subjects.map((w) => [w.id, value]));
  const definition = resolvedDefinitionForAssignment(model, item);
  const unit = definition?.unit;
  const referenceValues =
    item.kind === 'CONDITION'
      ? null
      : [
          ...new Set([
            item.value,
            ...(definition?.options ?? []).map((option) => option.value),
          ]),
        ];
  const control = (
    value: string,
    change: (value: string) => void,
    label: string,
  ) =>
    referenceValues ? (
      <select
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        {referenceValues.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    ) : (
      <input
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    );
  return (
    <details className="inline-variable" open={item.intentRole === 'VARIED'}>
      <summary>
        {item.label}{' '}
        <small>
          {item.intentRole} · {item.kind}
        </small>
      </summary>
      <label>
        Role
        <select
          value={item.intentRole}
          onChange={(e) => {
            const role = e.target.value as SetupAssignment['intentRole'];
            onUpdate(
              { ...item, intentRole: role },
              role === 'FIXED' ? same(item.value) : values,
            );
          }}
        >
          <option>FIXED</option>
          <option>VARIED</option>
        </select>
      </label>
      <p>
        Apply To: {model.subjects[0]?.type ?? 'Subject'}
        {unit ? ` · ${unit}` : ''}
      </p>
      {item.intentRole === 'FIXED' ? (
        <label>
          Value
          {control(
            item.value,
            (value) => onUpdate({ ...item, value }, same(value)),
            `${item.label} fixed value`,
          )}
        </label>
      ) : (
        <>
          {model.subjects.map((w) => (
            <label key={w.id}>
              {w.displayLabel}
              {control(
                values[w.id],
                (value) => onUpdate(item, { ...values, [w.id]: value }),
                `${item.label} ${w.displayLabel}`,
              )}
            </label>
          ))}
          <button
            onClick={() =>
              onUpdate(item, same(values[model.subjects[0]?.id] ?? item.value))
            }
          >
            Set Same
          </button>
          {item.kind === 'CONDITION' && (
            <div className="inline-sequence">
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
                  start.trim() === '' ||
                  step.trim() === '' ||
                  !Number.isFinite(Number(start)) ||
                  !Number.isFinite(Number(step)) ||
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
            </div>
          )}
        </>
      )}
    </details>
  );
}
