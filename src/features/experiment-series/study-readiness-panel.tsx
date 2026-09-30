'use client';
/* oxlint-disable next/no-img-element -- Exact local Figma readiness indicator. */
import { useLocale } from '@/src/shared/i18n/locale';

import { useEffect, useState } from 'react';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import type { StudyReadiness } from '@/src/application/study-readiness';
import type { SeriesSlug } from './run-entry-model';

export function StudyReadinessPanel({
  slug,
  pin,
  compact = false,
}: {
  slug: SeriesSlug;
  pin: string;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const { application } = useDxtApplication();
  const repository = application.repositories.study;
  const [state, setState] = useState<StudyReadiness | null>(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void repository
      .getLifecycleReadiness?.(slug, pin)
      .then((value) => {
        if (active) setState(value);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Readiness unavailable.');
      });
    return () => {
      active = false;
    };
  }, [repository, slug, pin]);
  if (!repository.getLifecycleReadiness) return null;
  const proposal = state?.proposals.find((p) => p.id === source);
  async function confirm() {
    if (!proposal || !repository.confirmReasoningContext) return;
    setSaving(true);
    setError(null);
    try {
      await repository.confirmReasoningContext(
        slug,
        {
          packageVersionId: pin,
          sourceContextId: proposal.id,
          targetBindings: proposal.context.targetBindings,
          confirmed: true,
        },
        { commandId: `reasoning:${slug}:${pin}:${proposal.id}` },
      );
      setState(await repository.getLifecycleReadiness!(slug, pin));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Confirmation failed.');
    } finally {
      setSaving(false);
    }
  }
  if (compact && state?.status === 'READY')
    return (
      <details className="study-readiness-compact">
        <summary>
          <img src="/figma/study/2ea7c.svg" alt="" />
          <strong>
            {t('Lifecycle readiness ·')} {t('Ready')}
          </strong>
          <span>
            {t('Source Package:')} {pin}
          </span>
        </summary>
        <p>
          {t('Exact immutable context:')} {state.contextId}
        </p>
        <p>
          {t(
            '. Package activation is independent of this Study’s reasoning readiness.',
          )}
        </p>
      </details>
    );
  return (
    <section
      aria-label={t('Study lifecycle readiness')}
      className="study-setup-notice"
    >
      <div>
        <strong>
          {t('Lifecycle readiness ·')}{' '}
          {state?.status === 'READY' ? t('Ready') : t('Needs configuration')}
        </strong>
        <p>
          {t('Selected Package:')} {pin}
          {t(
            '. Package activation is independent of this Study’s reasoning readiness.',
          )}
        </p>
        {error && <p role="alert">{t(error)}</p>}
        {!state && !error && <p>{t('Checking exact reasoning context…')}</p>}
        {state?.status === 'NOT_READY' && (
          <>
            <p>
              {state.missing.map((item) => t(item)).join(' · ')}
              {t('. Run creation is blocked until confirmed.')}
            </p>
            <label>
              {t('Review previous reasoning as a proposal')}{' '}
              <select
                aria-label={t('Reasoning proposal')}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">{t('Choose an exact context…')}</option>
                {state.proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.packageVersionId} · {p.id}
                  </option>
                ))}
              </select>
            </label>
            {proposal && (
              <div>
                <p>
                  {t(
                    'Proposal only. Confirming creates a separate immutable context for',
                  )}{' '}
                  {pin}
                  {t('; it does not alter the source.')}
                </p>
                <ul>
                  {proposal.context.targetBindings.map((b) => (
                    <li key={b.target.id}>
                      {b.target.id} · {b.target.parameterDefinitionId} ·{' '}
                      {b.target.operator}{' '}
                      {b.target.operator === 'BETWEEN'
                        ? `${b.target.lowerBound}–${b.target.upperBound}`
                        : b.target.threshold}{' '}
                      · {b.target.unitDefinitionId ?? t('unitless')} ·{' '}
                      {b.measurementPoint} · {b.aggregationMethod}
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>
                    {t('Exact Evaluation and Next Action references')}
                  </summary>
                  <ul>
                    {[
                      ...proposal.context.catalog.evaluations,
                      ...proposal.context.catalog.evaluationCriteria,
                      ...proposal.context.catalog.nextActionTypes,
                    ].map((d) => (
                      <li key={d.id}>
                        {d.name} · {d.id}
                      </li>
                    ))}
                  </ul>
                </details>
                <button
                  className="primary-button"
                  disabled={
                    saving ||
                    (!!application.configurationAuthoringBoundary &&
                      state?.canManageReasoningContext !== true)
                  }
                  onClick={() => void confirm()}
                >
                  {t('Confirm reasoning for selected Package')}
                </button>
              </div>
            )}
            {!state.proposals.length && (
              <p role="alert">
                {t(
                  'No registered reasoning proposal exists for this Study. Explicit scientific configuration is required.',
                )}
              </p>
            )}
          </>
        )}
        {state?.status === 'READY' && (
          <p>
            {t('Exact immutable context:')} {state.contextId}
          </p>
        )}
      </div>
    </section>
  );
}
