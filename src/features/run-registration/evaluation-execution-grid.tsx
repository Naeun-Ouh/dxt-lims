'use client';
/* oxlint-disable next/no-img-element -- Exact Figma status indicators. */
import { LifecycleInspectorClose } from '@/src/shared/ui/lifecycle-inspector-close';
import { useLocale } from '@/src/shared/i18n/locale';

import { useEffect, useMemo, useState } from 'react';
import type { SubjectMeasurementResultSet } from '@/src/domain/measurement/subject-measurement';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { ActualExecutionEvidence } from './actual-execution-model';
import {
  formatTargetRule,
  projectEvaluations,
  type EngineerEvaluationRecord,
  type EvaluationProjection,
  type EvaluationTargetBinding,
} from './evaluation-grid-model';
import { projectMeasurementEvidence } from './measurement-grid-model';
import type { ExperimentWorkspaceModel } from './workspace-model';
import {
  projectDecisionContinuation,
  resolveNextActionPresentation,
  type DecisionContinuationContext,
  type DecisionContinuationProjection,
  type NextRunPreview,
} from './decision-continuation-model';
import type { DecisionCommand, EvaluationCommand } from './lifecycle-authoring';

export function EvaluationExecutionGrid({
  model,
  results,
  catalog,
  executionEvidence,
  targetBindings,
  engineerEvaluations,
  decisionContext,
  nextRunPreview,
  nextRunHref,
  onRecordEvaluation,
  onRecordDecision,
  onCreateNextRun,
  actor,
  now,
}: {
  model: ExperimentWorkspaceModel;
  results: SubjectMeasurementResultSet;
  catalog: ReferenceCatalog;
  executionEvidence: readonly ActualExecutionEvidence[];
  targetBindings: readonly EvaluationTargetBinding[];
  engineerEvaluations: readonly EngineerEvaluationRecord[];
  decisionContext: DecisionContinuationContext | null;
  nextRunPreview: NextRunPreview | null;
  nextRunHref?: string;
  onRecordEvaluation?: (command: Omit<EvaluationCommand, 'id'>) => unknown;
  onRecordDecision?: (command: Omit<DecisionCommand, 'id'>) => unknown;
  onCreateNextRun?: () => unknown;
  actor?: string;
  now?: () => string;
}) {
  const { t } = useLocale();
  const measurements = useMemo(
    () =>
      projectMeasurementEvidence(model, results, catalog, executionEvidence),
    [model, results, catalog, executionEvidence],
  );
  const projections = useMemo(
    () =>
      projectEvaluations(
        model.snapshot.id,
        model.subjects,
        measurements,
        targetBindings,
        engineerEvaluations,
      ),
    [model, measurements, targetBindings, engineerEvaluations],
  );
  const [selected, setSelected] = useState<EvaluationProjection | null>(
    () =>
      projections.find((projection) =>
        decisionContext?.engineerEvaluationIds.includes(
          projection.engineerEvaluation?.id ?? '',
        ),
      ) ??
      projections[0] ??
      null,
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const achieved = projections.filter(
    (projection) => projection.achievement.status === 'ACHIEVED',
  ).length;
  const continuation = decisionContext
    ? projectDecisionContinuation(decisionContext, catalog, nextRunPreview)
    : null;

  const selectedContinuation =
    selected?.engineerEvaluation &&
    decisionContext?.engineerEvaluationIds.includes(
      selected.engineerEvaluation.id,
    )
      ? continuation
      : null;
  return (
    <>
      <section className="engineering-grid-toolbar evaluation-grid-toolbar">
        <span className="evaluation-source-summary">
          {t('Target assessment ·')} {targetBindings.length}{' '}
          {t('configured target')}
          {targetBindings.length === 1 ? '' : 's'} · {projections.length}{' '}
          {t('subject assessments')}
        </span>
        <button
          className={!inspectorOpen ? 'active' : ''}
          onClick={() => setInspectorOpen(false)}
        >
          {t('Subject Evaluation')}
        </button>
        <button
          className={inspectorOpen ? 'active' : ''}
          disabled={!selected}
          onClick={() => setInspectorOpen((open) => !open)}
        >
          {t('Details')}
        </button>
        <span>
          {achieved} {t('achieved ·')} {projections.length - achieved}{' '}
          {t('require context')}
        </span>
        <button
          className="primary plan-save lifecycle-primary-actions"
          type="submit"
          form="engineer-evaluation-form"
          disabled={
            !onRecordEvaluation ||
            !onRecordDecision ||
            !selected?.achievement.measurementSummaryId
          }
        >
          {t('Save Evaluation')}
        </button>
      </section>
      <div
        className={`engineering-grid-layout ${inspectorOpen ? 'with-inspector' : ''}`}
      >
        <div className="engineering-grid-shell">
          <section
            className="evaluation-result-summary"
            aria-label={t('Result Summary')}
          >
            <header>
              <h2>{t('Result Summary')}</h2>
              <span>
                {selected?.subject.displayLabel} · {t('Target assessment')}
              </span>
            </header>
            <table>
              <thead>
                <tr>
                  {['Parameter', 'Result', 'Target', 'Status'].map((label) => (
                    <th key={label}>{t(label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targetBindings.map((binding) => {
                  const projection = projections.find(
                    (item) =>
                      item.binding.target.id === binding.target.id &&
                      item.subject.id === selected?.subject.id,
                  );
                  return (
                    <tr
                      key={binding.target.id}
                      className={
                        selected?.binding.target.id === binding.target.id
                          ? 'selected'
                          : ''
                      }
                    >
                      <td>
                        <button
                          onClick={() => {
                            if (projection) {
                              setSelected(projection);
                              setInspectorOpen(true);
                            }
                          }}
                        >
                          {projection?.measurement?.parameter.name ??
                            catalog.parameters.find(
                              (item) =>
                                item.id ===
                                binding.target.parameterDefinitionId,
                            )?.name ??
                            binding.target.parameterDefinitionId}
                        </button>
                      </td>
                      <td>
                        {projection?.resultValue ?? '—'}{' '}
                        {projection?.resultUnit ?? ''}
                      </td>
                      <td>
                        {formatTargetRule(binding)}{' '}
                        {projection?.resultUnit ?? ''}
                      </td>
                      <td
                        className={`result-status ${projection?.achievement.status.toLowerCase()}`}
                      >
                        <span>
                          <img
                            src={`/figma/lifecycle/${projection?.achievement.status === 'ACHIEVED' ? '2ea7c' : projection?.achievement.status === 'NOT_ACHIEVED' ? '6ac09' : '5bb41'}.svg`}
                            alt=""
                          />
                          {projection
                            ? t(labelStatus(projection.achievement.status))
                            : t('Result Missing')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p>
              {t(
                'Achievement is calculated from the configured Target and exact representative result. Engineer Evaluation remains independent.',
              )}
            </p>
          </section>
          <div
            className="evaluation-subject-strip"
            aria-label={t('Subject Evaluation')}
          >
            <b>{t('Subject')}</b>
            {model.subjects.map((subject) => {
              const projection = projections.find(
                (item) =>
                  item.subject.id === subject.id &&
                  item.binding.target.id === selected?.binding.target.id,
              );
              return (
                <button
                  key={subject.id}
                  aria-pressed={selected?.subject.id === subject.id}
                  onClick={() => setSelected(projection ?? null)}
                >
                  {subject.displayLabel}{' '}
                  <span>{projection?.resultValue ?? '—'}</span>
                </button>
              );
            })}
          </div>
          {onRecordEvaluation && onRecordDecision && actor && now && (
            <EvaluationAuthoringPanel
              key={`${selected?.subject.id}:${selected?.binding.target.id}`}
              model={model}
              catalog={catalog}
              selected={selected}
              onRecordEvaluation={onRecordEvaluation}
              onRecordDecision={onRecordDecision}
              initialNextActionTypeId={
                selected?.engineerEvaluation &&
                decisionContext?.engineerEvaluationIds.includes(
                  selected.engineerEvaluation.id,
                )
                  ? continuation?.actionType?.id
                  : undefined
              }
              actor={actor}
              now={now}
            />
          )}
          {!(onRecordEvaluation && onRecordDecision && actor && now) && (
            <section className="evaluation-readonly-comment">
              <h2>{t('Engineer Comment')}</h2>
              <p>
                {selected?.engineerEvaluation?.comment ?? t('Not reviewed')}
              </p>
            </section>
          )}
          {selectedContinuation && (
            <DecisionContinuationPanel
              continuation={selectedContinuation}
              selected={selected}
              nextRunHref={nextRunHref}
              onCreateNextRun={onCreateNextRun}
            />
          )}
        </div>
        {inspectorOpen && (
          <EvaluationInspector
            projection={selected}
            continuation={selectedContinuation}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>
    </>
  );
}

function DecisionContinuationPanel({
  continuation,
  selected,
  nextRunHref,
  onCreateNextRun,
}: {
  continuation: DecisionContinuationProjection;
  selected: EvaluationProjection | null;
  nextRunHref?: string;
  onCreateNextRun?: () => unknown;
}) {
  const { t } = useLocale();
  const { decision } = continuation.context;
  const action = resolveNextActionPresentation(continuation);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [staged, setStaged] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdNumber, setCreatedNumber] = useState<number | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('action') !== 'preview')
      return;
    const timer = window.setTimeout(() => setPreviewOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const evaluation = selected?.engineerEvaluation;
  const measurementContext = selected
    ? [selected.binding.measurementPoint, selected.measurement?.parameter.name]
        .filter(Boolean)
        .join(' ')
    : null;
  const actionTarget = selected
    ? [
        selected.subject.displayLabel,
        measurementContext,
        continuation.context.siteScopeLabel,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'No selected evaluation context';
  return (
    <section className="decision-continuation-panel">
      <header className="reasoning-flow-head">
        <span>{t('SELECTED REASONING CONTEXT')}</span>
        <strong>{actionTarget}</strong>
      </header>
      <div className="evaluation-recorded-summary">
        <div>
          <span>{t('Engineer Comment')}</span>
          <p>{evaluation?.comment ?? t('Not reviewed')}</p>
        </div>
        <div>
          <span>{t('Run Conclusion')}</span>
          <b>{continuation.context.decisionStatement}</b>
          <p>{decision.reason}</p>
        </div>
        <div>
          <span>{t('Next Action')}</span>
          <b>
            {continuation.actionType?.name
              ? t(continuation.actionType.name)
              : t('No action selected')}
          </b>
          {((action.kind === 'NEXT_RUN' && continuation.nextRunPreview) ||
            action.kind === 'MEASUREMENT_PLAN') && (
            <button onClick={() => setPreviewOpen(true)}>
              {t(action.ctaLabel)}
            </button>
          )}
        </div>
      </div>
      {previewOpen && action.kind === 'MEASUREMENT_PLAN' && selected && (
        <AdditionalMeasurementPreview
          continuation={continuation}
          selected={selected}
          staged={staged}
          onCreate={() => setStaged(true)}
          onCancel={() => setPreviewOpen(false)}
        />
      )}
      {previewOpen &&
        action.kind === 'NEXT_RUN' &&
        continuation.nextRunPreview && (
          <NextRunActionPreview
            preview={continuation.nextRunPreview}
            staged={staged}
            onCreate={() => {
              void (async () => {
                setCreating(true);
                setCreateError('');
                try {
                  const result = await onCreateNextRun?.();
                  if (
                    result &&
                    typeof result === 'object' &&
                    'runNumber' in result &&
                    typeof result.runNumber === 'number'
                  )
                    setCreatedNumber(result.runNumber);
                  setStaged(true);
                } catch (e) {
                  setCreateError(
                    e instanceof Error
                      ? e.message
                      : 'Next Run could not be created.',
                  );
                } finally {
                  setCreating(false);
                }
              })();
            }}
            creating={creating}
            canCreate={!!onCreateNextRun}
            error={createError}
            createdNumber={createdNumber ?? undefined}
            onCancel={() => setPreviewOpen(false)}
            openHref={
              createdNumber
                ? nextRunHref?.replace(/\/runs\/\d+/, `/runs/${createdNumber}`)
                : nextRunHref
            }
          />
        )}
    </section>
  );
}

function EvaluationAuthoringPanel({
  model,
  catalog,
  selected,
  onRecordEvaluation,
  onRecordDecision,
  actor,
  now,
  initialNextActionTypeId,
}: {
  model: ExperimentWorkspaceModel;
  catalog: ReferenceCatalog;
  selected: EvaluationProjection | null;
  onRecordEvaluation: (command: Omit<EvaluationCommand, 'id'>) => unknown;
  onRecordDecision: (command: Omit<DecisionCommand, 'id'>) => unknown;
  actor: string;
  now: () => string;
  initialNextActionTypeId?: string;
}) {
  const { t } = useLocale();
  const [disposition, setDisposition] = useState<
    EngineerEvaluationRecord['disposition']
  >(selected?.engineerEvaluation?.disposition ?? 'ACCEPT');
  const [comment, setComment] = useState(
    selected?.engineerEvaluation?.comment ?? '',
  );
  const [conclusion, setConclusion] = useState('');
  const [reason, setReason] = useState('');
  const nextRunType = catalog.nextActionTypes.find(
    (item) => item.code === 'DESIGN_NEXT_EXPERIMENT',
  );
  const [nextActionType, setNextActionType] = useState(
    initialNextActionTypeId ?? '',
  );
  const [nextAction, setNextAction] = useState('');
  const changeOptions = model.snapshot.assignments;
  const [changeId, setChangeId] = useState(changeOptions[0]?.id ?? '');
  const [changeValue, setChangeValue] = useState(changeOptions[0]?.value ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const saveEvaluation = async () => {
    if (!selected?.achievement.measurementSummaryId) {
      setMessage(
        'Select a measured Subject result before recording Evaluation.',
      );
      return;
    }
    try {
      setSaving(true);
      await onRecordEvaluation({
        subjectId: selected.subject.id,
        seriesTargetId: selected.binding.target.id,
        measurementSummaryId: selected.achievement.measurementSummaryId,
        disposition,
        comment,
        evaluator: actor,
        evaluatedAt: now(),
      });
      setMessage('Engineer Evaluation saved.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save Evaluation.',
      );
    } finally {
      setSaving(false);
    }
  };
  const saveDecision = async () => {
    if (!selected?.engineerEvaluation) {
      setMessage('Record Engineer Evaluation before Decision.');
      return;
    }
    try {
      const summaryId = selected.achievement.measurementSummaryId;
      setSaving(true);
      await onRecordDecision({
        decisionStatement: conclusion,
        conclusion,
        reason,
        nextActionTypeDefinitionId: nextActionType,
        nextActionNote: nextAction,
        evaluationIds: [selected.engineerEvaluation.id],
        targetReferences: summaryId
          ? [
              {
                seriesTargetId: selected.binding.target.id,
                measurementSummaryId: summaryId,
                status: selected.achievement.status,
              },
            ]
          : [],
        targetSubjectIds: [selected.subject.id],
        targetOperationIds: selected.measurement
          ? [selected.measurement.operation.id]
          : [],
        recordedBy: actor,
        recordedAt: now(),
        nextRunChange:
          nextActionType === nextRunType?.id && changeId && changeValue.trim()
            ? { assignmentId: changeId, after: changeValue.trim() }
            : null,
      });
      setMessage('Decision and Next Action saved.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save Decision.',
      );
    } finally {
      setSaving(false);
    }
  };
  const changeAssignment = (id: string) => {
    setChangeId(id);
    setChangeValue(changeOptions.find((item) => item.id === id)?.value ?? '');
  };
  return (
    <section
      className="evaluation-authoring-panel"
      aria-label={t('Author Evaluation and Decision')}
    >
      <header>
        <b>{t('Engineer Comment')}</b>
        <small>
          {selected?.subject.displayLabel} ·{' '}
          {selected?.measurement?.parameter.name}
        </small>
      </header>
      <form
        id="engineer-evaluation-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving) void saveEvaluation();
        }}
      >
        <div className="evaluation-authoring-row">
          <label>
            {t('Judgment')}
            <select
              value={disposition}
              onChange={(event) =>
                setDisposition(
                  event.target.value as EngineerEvaluationRecord['disposition'],
                )
              }
            >
              <option value="ACCEPT">{t('ACCEPT')}</option>
              <option value="NEEDS_REVIEW">{t('NEEDS REVIEW')}</option>
              <option value="UNSUITABLE">{t('UNSUITABLE')}</option>
              <option value="INFORMATIVE">{t('INFORMATIVE')}</option>
            </select>
          </label>
          <label className="authoring-grow">
            {t('Engineer Comment')}
            <textarea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t('Engineering interpretation')}
            />
          </label>
          {saving && <output>{t('Saving…')}</output>}
        </div>
      </form>
      <header>
        <b>{t('Run Conclusion')}</b>
        <small>
          {t('Conclusion is recorded separately after saving Evaluation.')}
        </small>
      </header>
      <fieldset className="conclusion-options">
        <legend className="sr-only">{t('Next Action')}</legend>
        {catalog.nextActionTypes
          .filter(
            (item) =>
              item.active &&
              ['EXPERIMENT_COMPLETE', 'DESIGN_NEXT_EXPERIMENT'].includes(
                item.code,
              ),
          )
          .map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="run-conclusion"
                checked={nextActionType === item.id}
                onChange={() => setNextActionType(item.id)}
              />
              {t(
                item.code === 'EXPERIMENT_COMPLETE'
                  ? 'Complete Run'
                  : 'Create Next Run',
              )}
            </label>
          ))}
      </fieldset>
      <details className="conclusion-record-form">
        <summary>{t('Record conclusion details')}</summary>
        <div className="evaluation-authoring-row">
          <label className="authoring-grow">
            {t('Decision')}
            <input
              value={conclusion}
              onChange={(event) => setConclusion(event.target.value)}
              placeholder={t('Concise scientific decision')}
            />
          </label>
          <label className="authoring-grow">
            {t('Rationale')}
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('Why continue this way?')}
            />
          </label>
          <label>
            {t('Next Action')}
            <select
              value={nextActionType}
              onChange={(event) => setNextActionType(event.target.value)}
            >
              <option value="">{t('Choose Next Action')}</option>
              {catalog.nextActionTypes
                .filter((item) => item.active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(item.name)}
                  </option>
                ))}
            </select>
          </label>
          <label className="authoring-grow">
            {t('Action note')}
            <input
              value={nextAction}
              onChange={(event) => setNextAction(event.target.value)}
              placeholder={t('What should the next experiment do?')}
            />
          </label>
        </div>
        {nextActionType === nextRunType?.id && (
          <div className="evaluation-authoring-row">
            <label>
              {t('Change')}
              <select
                value={changeId}
                onChange={(event) => changeAssignment(event.target.value)}
              >
                {changeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ·{' '}
                    {item.subjectId ?? item.positionId ?? t('Run')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Next value')}
              <input
                value={changeValue}
                onChange={(event) => setChangeValue(event.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={
                saving ||
                !selected?.engineerEvaluation ||
                !nextActionType ||
                !conclusion.trim() ||
                !reason.trim() ||
                !nextAction.trim()
              }
              onClick={() => {
                void saveDecision();
              }}
            >
              {t('Save Decision & Next Action')}
            </button>
          </div>
        )}
        {nextActionType !== nextRunType?.id && (
          <button
            className="primary"
            disabled={
              saving ||
              !selected?.engineerEvaluation ||
              !nextActionType ||
              !conclusion.trim() ||
              !reason.trim() ||
              !nextAction.trim()
            }
            onClick={() => {
              void saveDecision();
            }}
          >
            {t('Save Decision & Next Action')}
          </button>
        )}
      </details>
      {message && <output>{t(message)}</output>}
    </section>
  );
}

export function AdditionalMeasurementPreview({
  continuation,
  selected,
  staged,
  onCreate,
  onCancel,
}: {
  continuation: DecisionContinuationProjection;
  selected: EvaluationProjection;
  staged: boolean;
  onCreate: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const evaluation = selected.engineerEvaluation;
  return (
    <section className="action-preview measurement-plan-preview">
      <header>
        <span>{t('ADDITIONAL MEASUREMENT PREVIEW')}</span>
        <h3>{t(continuation.actionType?.name)}</h3>
      </header>
      <dl>
        <dt>{t('Source Run')}</dt>
        <dd>
          {t('Run #')}
          {selected.runId.split('-').at(-1)}
        </dd>
        <dt>{t('Referenced Evaluation')}</dt>
        <dd>
          {evaluation
            ? `${labelDisposition(evaluation.disposition).replace(
                'Engineer · ',
                '',
              )} · ${evaluation.id}`
            : t('Not reviewed')}
        </dd>
        <dt>{t('Measurement')}</dt>
        <dd>{selected.measurement?.measurementDefinition.name ?? '—'}</dd>
        <dt>{t('Parameter')}</dt>
        <dd>{selected.measurement?.parameter.name ?? '—'}</dd>
        <dt>{t('Subject')}</dt>
        <dd>{selected.subject.displayLabel}</dd>
        <dt>{t('Site scope')}</dt>
        <dd>{continuation.context.siteScopeLabel ?? t('Subject scope')}</dd>
        <dt>{t('Reason')}</dt>
        <dd>{continuation.rationale}</dd>
      </dl>
      <footer>
        {staged ? (
          <strong>{t('Prototype measurement plan staged locally.')}</strong>
        ) : (
          <>
            <button className="primary" onClick={onCreate}>
              {t('Create Measurement Plan')}
            </button>
            <button onClick={onCancel}>{t('Cancel')}</button>
          </>
        )}
      </footer>
    </section>
  );
}

export function NextRunActionPreview({
  creating = false,
  error,
  createdNumber,
  preview,
  staged,
  onCreate,
  onCancel,
  openHref,
  canCreate = true,
}: {
  preview: NextRunPreview;
  creating?: boolean;
  canCreate?: boolean;
  error?: string;
  createdNumber?: number;
  staged: boolean;
  onCreate: () => void;
  onCancel: () => void;
  openHref?: string;
}) {
  const { t } = useLocale();
  return (
    <section className="action-preview next-run-preview">
      <header>
        <div>
          <span>{t('NEXT RUN PREVIEW')}</span>
          <h3>
            {t('Run #')}
            {preview.snapshot.runNumber} {t('· from Run #')}
            {preview.snapshot.runNumber - 1}
          </h3>
        </div>
        <strong>{t('Full snapshot · Delta view')}</strong>
      </header>
      <div>
        <section>
          <h4>{t('Inherited')}</h4>
          <p>
            {preview.inherited.length}{' '}
            {t('complete assignments carried forward')}
          </p>
          <ul>
            {preview.inherited.slice(0, 5).map((item) => (
              <li key={item.assignmentId}>
                <b>{item.label}</b> {item.value}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4>{t('Changed')}</h4>
          <p>
            {preview.changed.length} {t('explicit changes')}
          </p>
          <ul>
            {preview.changed.map((item) => (
              <li key={item.assignmentId}>
                <b>{item.subjectId ?? item.label}</b> {item.before} →{' '}
                {item.after}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <footer>
        {error && <output role="alert">{t(error)}</output>}
        {staged ? (
          <div className="next-run-created">
            <strong>
              {t('Run #')}
              {createdNumber ?? preview.snapshot.runNumber} {t('is ready.')}
            </strong>
            {openHref && (
              <a className="primary" href={openHref}>
                {t('Open Run #')}
                {createdNumber ?? preview.snapshot.runNumber} {t('Plan')}
              </a>
            )}
          </div>
        ) : (
          <>
            <button
              className="primary"
              disabled={creating || !canCreate}
              onClick={onCreate}
            >
              {t('Create Next Run')}
            </button>
            <button onClick={onCancel}>{t('Cancel')}</button>
          </>
        )}
        <small>
          {t('Provenance ·')} {t(preview.snapshot.provenance.label)}{' '}
          {t('· source')} {preview.previousRunId}
        </small>
      </footer>
    </section>
  );
}

function labelStatus(status: EvaluationProjection['achievement']['status']) {
  return {
    ACHIEVED: 'ACHIEVED',
    NOT_ACHIEVED: 'NOT ACHIEVED',
    MISSING_RESULT: 'MISSING RESULT',
    NOT_EVALUABLE: 'NOT EVALUABLE',
  }[status];
}

function labelDisposition(
  disposition: EngineerEvaluationRecord['disposition'],
) {
  return {
    ACCEPT: 'Engineer · Accept',
    NEEDS_REVIEW: 'Engineer · Needs review',
    UNSUITABLE: 'Engineer · Unsuitable',
    INFORMATIVE: 'Engineer · Informative',
  }[disposition];
}

export function EvaluationInspector({
  projection,
  continuation,
  onClose,
}: {
  projection: EvaluationProjection | null;
  continuation: DecisionContinuationProjection | null;
  onClose?: () => void;
}) {
  const { t } = useLocale();
  if (!projection)
    return (
      <aside className="engineering-grid-inspector evaluation-grid-inspector" />
    );
  const measurement = projection.measurement;
  const evaluation = projection.engineerEvaluation;
  return (
    <aside className="engineering-grid-inspector evaluation-grid-inspector">
      <header>
        {onClose && <LifecycleInspectorClose onClose={onClose} evaluation />}
        <span>{t('EVALUATION PROVENANCE')}</span>
        <h2>{measurement?.parameter.name ?? t('Target assessment')}</h2>
        <p>{projection.subject.displayLabel}</p>
      </header>
      <section>
        <h3>{t('Target Achievement · computational')}</h3>
        <dl>
          <dt>{t('Target')}</dt>
          <dd>{projection.binding.target.id}</dd>
          <dt>{t('Rule')}</dt>
          <dd>{formatTargetRule(projection.binding)}</dd>
          <dt>{t('Result')}</dt>
          <dd>
            {projection.resultValue ?? t('Missing')}{' '}
            {projection.resultUnit ?? ''}
          </dd>
          <dt>{t('Achievement')}</dt>
          <dd>{t(labelStatus(projection.achievement.status))}</dd>
          <dt>{t('Grain')}</dt>
          <dd>
            {t(projection.binding.resultGrain)} ·{' '}
            {t(projection.binding.aggregationMethod)}
          </dd>
          <dt>{t('Summary')}</dt>
          <dd>{projection.achievement.measurementSummaryId ?? '—'}</dd>
          <dt>{t('Dataset')}</dt>
          <dd>{projection.achievement.measurementDatasetId ?? '—'}</dd>
          <dt>{t('Measurement execution')}</dt>
          <dd>{projection.achievement.measurementExecutionId ?? '—'}</dd>
          <dt>{t('Measurement point')}</dt>
          <dd>{projection.binding.measurementPoint}</dd>
        </dl>
      </section>
      {continuation && (
        <section>
          <h3>{t('Decision / Action provenance')}</h3>
          <dl>
            <dt>{t('Decision')}</dt>
            <dd>{continuation.context.decision.id}</dd>
            <dt>{t('Evaluation refs')}</dt>
            <dd>{continuation.context.engineerEvaluationIds.join(', ')}</dd>
            <dt>{t('Target refs')}</dt>
            <dd>
              {continuation.context.targetAchievementReferences
                .map(
                  (item) =>
                    `${item.seriesTargetId} · ${item.measurementSummaryId}`,
                )
                .join(', ')}
            </dd>
            <dt>{t('Action definition')}</dt>
            <dd>{continuation.actionType?.id ?? '—'}</dd>
            <dt>{t('Recorded by')}</dt>
            <dd>{continuation.context.decision.recordedBy}</dd>
            <dt>{t('Timestamp')}</dt>
            <dd>{continuation.context.decision.recordedAt}</dd>
          </dl>
        </section>
      )}
      <section>
        <h3>{t('Engineer Evaluation · interpretive')}</h3>
        <dl>
          <dt>{t('Disposition')}</dt>
          <dd>
            {evaluation
              ? t(labelDisposition(evaluation.disposition))
              : t('Not reviewed')}
          </dd>
          <dt>{t('Rationale')}</dt>
          <dd>{evaluation?.comment ?? '—'}</dd>
          <dt>{t('Evaluator')}</dt>
          <dd>{evaluation?.evaluator ?? '—'}</dd>
          <dt>{t('Timestamp')}</dt>
          <dd>{evaluation?.evaluatedAt ?? '—'}</dd>
          <dt>{t('Record')}</dt>
          <dd>{evaluation?.id ?? '—'}</dd>
        </dl>
      </section>
      <footer>
        {t(
          'Mathematical achievement does not assign experiment success or failure.',
        )}
      </footer>
    </aside>
  );
}
