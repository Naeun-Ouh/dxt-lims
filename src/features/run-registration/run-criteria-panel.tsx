'use client';
import { useEffect, useState, useRef } from 'react';
import { subjectMeasurementSummarySchema } from '@/src/domain/measurement/subject-measurement';
import { useLocale } from '@/src/shared/i18n/locale';
import { httpRunCriteria } from '@/src/infrastructure/http/http-repositories';
import {
  criteriaSaveSchema,
  type RunCriteriaState,
} from '@/src/application/run-criteria';
import type { ReasoningState } from '@/src/application/repository-ports';
export function RunCriteriaPanel({
  runId,
  onChanged,
  history,
}: {
  runId: string;
  onChanged: () => void;
  history: NonNullable<ReasoningState<unknown>['provenance']>;
}) {
  const { t } = useLocale();
  const [state, setState] = useState<RunCriteriaState | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState(''),
    [parameter, setParameter] = useState(''),
    [point, setPoint] = useState(''),
    [method, setMethod] = useState(''),
    [operator, setOperator] = useState(''),
    [value, setValue] = useState(''),
    [upper, setUpper] = useState(''),
    [evaluation, setEvaluation] = useState(''),
    [actions, setActions] = useState<string[]>([]),
    [rationale, setRationale] = useState('');
  const [revise, setRevise] = useState(false);
  const pending = useRef<{
    key: string;
    commandId: string;
    revisionId: string;
    definitionId: string;
    targetId: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    httpRunCriteria
      .load(runId)
      .then((s) => {
        if (active) {
          setState(s);
          setSelection(s.activeContextId ?? '');
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Evaluation Criteria could not be loaded. Check access and reload.',
          );
      });
    return () => {
      active = false;
    };
  }, [runId]);
  const chooseRevision=(enabled:boolean)=>{
    setRevise(enabled);
    const selected=state?.revisions.find(r=>r.id===selection);
    if(enabled&&selected){const b=selected.context.targetBindings[0];setParameter(b.target.parameterDefinitionId);setPoint(b.measurementPoint);setMethod(b.aggregationMethod);setOperator(b.target.operator);setValue(String(b.target.threshold??b.target.lowerBound??''));setUpper(String(b.target.upperBound??''));setEvaluation(selected.context.catalog.evaluations[0]?.id??'');setActions(selected.context.catalog.nextActionTypes.map(a=>a.id));}
  };
  const perform = async (kind: 'save' | 'adopt') => {
    if (!state) return;
    setBusy(true);
    setError('');
    try {
      const key = JSON.stringify([
        kind,
        selection,
        revise,
        parameter,
        point,
        method,
        operator,
        value,
        upper,
        evaluation,
        actions,
        rationale,
      ]);
      if (pending.current?.key !== key)
        pending.current = {
          key,
          commandId: crypto.randomUUID(),
          revisionId: crypto.randomUUID(),
          definitionId: crypto.randomUUID(),
          targetId: crypto.randomUUID(),
        };
      const attempt = pending.current;
      const selected = revise
        ? state.revisions.find((r) => r.id === selection)
        : undefined;
      const input =
        kind === 'adopt'
          ? null
          : criteriaSaveSchema.safeParse({
              revisionId: attempt.revisionId,
              definitionId: selected?.definitionId ?? attempt.definitionId,
              expectedRevision: selected
                ? Math.max(
                    ...state.revisions
                      .filter((r) => r.definitionId === selected.definitionId)
                      .map((r) => r.revision),
                  )
                : 0,
              expectedSequence: state.sequence,
              rationale,
              criteria: {
                packageVersionId: state.packageVersionId,
                confirmed: true,
                evaluationIds: [evaluation,...(selected?.context.catalog.evaluations.slice(1).map(e=>e.id)??[])],
                nextActionIds: actions,
                targetBindings: [
                  {
                    target: {
                      id:
                        selected?.context.targetBindings[0]?.target.id ??
                        attempt.targetId,
                      parameterDefinitionId: parameter,
                      unitDefinitionId:
                        state.catalog.parameters.find((p) => p.id === parameter)
                          ?.unitId ?? null,
                      operator,
                      threshold:
                        operator === 'BETWEEN'
                          ? null
                          : value.trim()
                            ? Number(value)
                            : null,
                      lowerBound:
                        operator === 'BETWEEN' && value.trim()
                          ? Number(value)
                          : null,
                      upperBound:
                        operator === 'BETWEEN' && upper.trim()
                          ? Number(upper)
                          : null,
                    },
                    measurementPoint: point,
                    resultGrain: 'SUBJECT_SUMMARY',
                    aggregationMethod: method,
                  },
                  ...(selected?.context.targetBindings.slice(1)??[]),
                ],
              },
            });
      if (input && !input.success) {
        setError('Check the Target values and selected references.');
        return;
      }
      const next =
        kind === 'adopt'
          ? await httpRunCriteria.adopt(
              runId,
              {
                contextId: selection,
                expectedSequence: state.sequence,
                rationale,
              },
              attempt.commandId,
            )
          : await httpRunCriteria.save(runId, input!.data!, attempt.commandId);
      pending.current = null;
      setState(next);
      setSelection(next.activeContextId ?? '');
      onChanged();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save Evaluation Criteria. Check the Target values and selected references, then try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="study-bootstrap">
      <h3>{t('Evaluation Criteria (optional)')}</h3>
      <p>
        {t(
          'Criteria do not gate Run creation. Saving criteria preserves previous evaluations and only changes the context for new interpretation.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {state && (
        <>
          <p>
            {t(
              state.activeContextId
                ? 'Evaluation Criteria selected'
                : state.origin === 'UNKNOWN_LEGACY'
                  ? 'Creation criteria unknown (historical Run)'
                  : 'No Evaluation Criteria selected',
            )}
          </p>
          <fieldset disabled={busy || !state.canManage}>
            <legend>{t('Select saved Evaluation Criteria')}</legend>
            <div className="bootstrap-controls">
              <label>
                {t('Evaluation Criteria')}
                <select
                  value={selection}
                  onChange={(e) => setSelection(e.target.value)}
                >
                  <option value="">{t('Select')}</option>
                  {state.revisions.map((r, i) => (
                    <option key={r.id} value={r.id}>
                      {t('Criteria')} {i + 1} · {t('Revision')} {r.revision} ·{' '}
                      {r.context.targetBindings
                        .map(
                          (b) =>
                            `${state.catalog.parameters.find((p) => p.id === b.target.parameterDefinitionId)?.name ?? t('Target')} ${b.target.operator} ${b.target.threshold ?? `${b.target.lowerBound}–${b.target.upperBound}`}`,
                        )
                        .join(', ')}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Reason for criteria change')}
                <input
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              </label>
              <button
                className="entry-button"
                disabled={!selection || !rationale.trim()}
                onClick={() => void perform('adopt')}
              >
                {t('Apply Evaluation Criteria')}
              </button>
            </div>
            <details>
              <summary>{t('Create Evaluation Criteria')}</summary>
              {selection && (
                <label>
                  <input
                    type="checkbox"
                    checked={revise}
                    onChange={(e) => chooseRevision(e.target.checked)}
                  />
                  {t('Create revision of selected criteria')}
                </label>
              )}
              <div className="bootstrap-controls">
                <label>
                  {t('Parameter')}
                  <select
                    value={parameter}
                    onChange={(e) => {
                      setParameter(e.target.value);
                      setPoint('');
                    }}
                  >
                    <option value="">{t('Select')}</option>
                    {state.catalog.parameters
                      .filter(
                        (p) =>
                          p.dataType === 'NUMBER' &&
                          state.plans.some((plan) =>
                            plan.parameterIds.includes(p.id),
                          ),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {t('Measurement Point')}
                  <select
                    value={point}
                    onChange={(e) => setPoint(e.target.value)}
                  >
                    <option value="">{t('Select')}</option>
                    {[
                      ...new Set(
                        state.plans
                          .filter((p) => p.parameterIds.includes(parameter))
                          .map((p) => p.point),
                      ),
                    ].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Aggregation')}
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="">{t('Select')}</option>
                    {subjectMeasurementSummarySchema.shape.aggregationMethod.options.map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  {t('Target rule')}
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                  >
                    <option value="">{t('Select')}</option>
                    {['GTE', 'LTE', 'EQ', 'BETWEEN'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(operator === 'BETWEEN' ? 'Lower bound' : 'Threshold')}
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
                {operator === 'BETWEEN' && (
                  <label>
                    {t('Upper bound')}
                    <input
                      type="number"
                      value={upper}
                      onChange={(e) => setUpper(e.target.value)}
                    />
                  </label>
                )}
                <label>
                  {t('Evaluation reference')}
                  <select
                    value={evaluation}
                    onChange={(e) => setEvaluation(e.target.value)}
                  >
                    <option value="">{t('Select')}</option>
                    {state.catalog.evaluations.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>{t('Available Next Actions (optional)')}</legend>
                {state.catalog.nextActionTypes
                  .filter((a) => a.active)
                  .map((a) => (
                    <label key={a.id}>
                      <input
                        type="checkbox"
                        checked={actions.includes(a.id)}
                        onChange={(e) =>
                          setActions(
                            e.target.checked
                              ? [...actions, a.id]
                              : actions.filter((id) => id !== a.id),
                          )
                        }
                      />
                      {a.name}
                    </label>
                  ))}
              </fieldset>
              <div className="entry-actions">
                <button
                  className="entry-button entry-button-primary"
                  disabled={!rationale.trim()}
                  onClick={() => void perform('save')}
                >
                  {t('Save Evaluation Criteria')}
                </button>
              </div>
            </details>
          </fieldset>
          {!state.canManage && (
            <p>
              {t(
                'Evaluation Criteria are read-only. Ask the Study manager for explicit permission.',
              )}
            </p>
          )}
        </>
      )}
      {history.length > 0 && (
        <details>
          <summary>
            {t('Historical interpretation records')} ({history.length})
          </summary>
          {history.map((h) => (
            <article key={h.recordId}>
              <strong>
                {t('Revision')} {h.revision}
              </strong>
              <p>
                {h.context.targetBindings
                  .map(
                    (b) =>
                      `${b.target.operator} ${b.target.threshold ?? `${b.target.lowerBound}–${b.target.upperBound}`}`,
                  )
                  .join(', ')}
              </p>
              <HistoricalRecord record={h.record} context={h.context}/>
              <details>
                <summary>{t('Technical details')}</summary>
                <code>
                  {h.recordId} · {h.contextId}
                </code>
              </details>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}

function HistoricalRecord({record,context}:{record:unknown;context:NonNullable<ReasoningState<unknown>['provenance']>[number]['context']}){
 const {t}=useLocale();const r=record as {comment?:string;disposition?:string;evaluator?:string;evaluatedAt?:string;decisionStatement?:string;decision?:{conclusion:string;reason:string;recordedBy:string;recordedAt:string;nextAction:{nextActionTypeDefinitionId:string;note:string}|null}};
 return r.decision?<><p>{r.decisionStatement??r.decision.conclusion}</p><p>{r.decision.reason}</p><p>{r.decision.recordedBy} · {r.decision.recordedAt}</p><p>{r.decision.nextAction?`${context.catalog.nextActionTypes.find(a=>a.id===r.decision!.nextAction!.nextActionTypeDefinitionId)?.name??t('Next Action')}: ${r.decision.nextAction.note}`:t('No Next Action (optional)')}</p></>:<><p>{r.comment}</p><p>{r.disposition&&t(r.disposition)} · {r.evaluator} · {r.evaluatedAt}</p></>;
}
