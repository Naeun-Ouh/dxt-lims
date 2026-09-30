'use client';
import Link from 'next/link';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';
import { useLocale } from '@/src/shared/i18n/locale';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import { EntryHeading, StudyIcon, EntryShell } from './entry-shell';
import {
  runCreationSources,
  type RunCreationSource,
  type SeriesSlug,
} from './run-entry-model';

// Units come only from definition revisions in this exact pinned package.
export function previewUnits(
  snapshot: RunPlanningSnapshot | null,
  source: ConfigurationRegistrySource,
): Record<string, string> {
  if (!snapshot) return {};
  const registry = source.getConfigurationRegistry();
  const pin = registry.packages.find(
    (item) => item.id === snapshot.configurationPackageVersionId,
  );
  if (!pin) return {};
  return Object.fromEntries(
    snapshot.assignments.map((item) => [
      item.id,
      pin.definitionRevisionIds.includes(item.referenceId)
        ? (registry.definitionDescriptors.find(
            (definition) => definition.revisionId === item.referenceId,
          )?.unit ?? '')
        : '',
    ]),
  );
}

export type RunEntryViewProps = {
  seriesSlug: SeriesSlug;
  context: RunPlanningSnapshot;
  source: RunCreationSource;
  sourceId?: string;
  units?: Record<string, string>;
  runs?: RunPlanningSnapshot[];
  preview: RunPlanningSnapshot | null;
  readiness?: { status: string; missing: string[] };
  busy: boolean;
  error: string | null;
  onSource: (value: RunCreationSource) => void;
  onSourceId?: (value: string) => void;
  onReview: () => void;
  onBack: () => void;
  onCreate: () => void;
};

/** Presentation only: preview and creation remain owned by the existing adapter. */
export function RunEntryView(props: RunEntryViewProps) {
  const { t } = useLocale();
  const { context, seriesSlug, source, preview, readiness, busy, error } =
    props;
  const selected = runCreationSources.find((item) => item.id === source)!;
  const unavailable =
    busy ||
    (source === 'EXISTING_RUN' &&
      props.onSourceId !== undefined &&
      !props.sourceId);
  return (
    <EntryShell
      standard
      study={{ name: context.series.name, slug: seriesSlug }}
      current="New Run"
    >
      <main className="entry-page run-entry-final">
        <EntryHeading
          eyebrow="NEW EXPERIMENT ITERATION"
          title="Create Next Run"
          description="Choose the starting context for this Run. The Run number is assigned when saved."
        >
          <div className="entry-study-context">
            <span className="entry-eyebrow">{t('Study')}</span>
            <b>{context.series.name}</b>
            <small>
              {context.area} · {context.experimentType}
            </small>
          </div>
        </EntryHeading>
        {error && (
          <p className="entry-alert" role="alert">
            {t(error)}
          </p>
        )}
        <div className="entry-run-split">
          <section
            className="entry-source"
            aria-label={t('Choose creation source')}
          >
            <header>
              <h2>{t('Choose creation source')}</h2>
              <p>
                {t('Persisted setup becomes a new independent Run snapshot.')}
              </p>
            </header>
            {preview ? (
              <>
                <div className="entry-source-resolved">
                  <b>
                    {t('Source')}: {t(selected.label)}
                  </b>
                  <span>✓</span>
                </div>
                <button
                  className="entry-change-source"
                  disabled={busy}
                  onClick={props.onBack}
                >
                  <StudyIcon name="45516" />
                  {t('Change creation source…')}
                </button>
              </>
            ) : (
              <>
                <div className="entry-source-options">
                  {runCreationSources.map((option) => (
                    <label
                      key={option.id}
                      className={source === option.id ? 'selected' : ''}
                    >
                      <input
                        type="radio"
                        name="run-source"
                        value={option.id}
                        checked={source === option.id}
                        disabled={busy}
                        onChange={() => props.onSource(option.id)}
                        aria-label={`${t(option.label)}. ${t(option.description)}`}
                      />
                      <span className="entry-radio-art">
                        <StudyIcon
                          name={source === option.id ? 'ee231' : '5f733'}
                        />
                      </span>
                      <span>
                        <b>{t(option.label)}</b>
                        <small>{t(option.description)}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {source === 'EXISTING_RUN' && (
                  <label className="entry-field">
                    {t('Existing Run')}
                    <select
                      aria-label={t('Existing Run')}
                      value={props.sourceId ?? context.id}
                      disabled={busy}
                      onChange={(event) =>
                        props.onSourceId?.(event.target.value)
                      }
                    >
                      {props.onSourceId && (
                        <option value="">{t('Select a persisted Run…')}</option>
                      )}
                      {(props.runs ?? [context]).map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.series.name} · {t('Run')} {run.runNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="entry-actions">
                  <Link className="entry-button" href={`/series/${seriesSlug}`}>
                    {t('Cancel')}
                  </Link>
                  <button
                    className="entry-button primary"
                    disabled={unavailable}
                    onClick={props.onReview}
                  >
                    {t(busy ? 'Loading…' : 'Review Inheritance')}
                  </button>
                </div>
              </>
            )}
          </section>
          <aside
            className={`entry-preview ${preview ? 'ready' : 'empty'}`}
            aria-label={t('Run preview')}
            aria-live="polite"
          >
            <header>
              <span className="entry-eyebrow">{t('Inheritance preview')}</span>
            </header>
            {preview ? (
              <>
                <div className="entry-preview-title">
                  <h2>{t('What am I about to inherit?')}</h2>
                  <p>
                    {t('Source context')}: {t(preview.provenance.label)}
                  </p>
                </div>
                <dl className="entry-context-list">
                  <div>
                    <dt>{t('Exact Package')}</dt>
                    <dd>{preview.configurationPackageVersionId}</dd>
                  </div>
                  <div>
                    <dt>{t('Subjects')}</dt>
                    <dd>
                      {preview.subjects
                        .map((item) => item.displayLabel ?? item.id)
                        .join(' · ')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Operations')}</dt>
                    <dd>
                      {preview.steps.map((item) => item.label).join(' → ') ||
                        t('None — Blank Plan')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Assignments')}</dt>
                    <dd>{preview.assignments.length}</dd>
                  </div>
                </dl>
                <h3>{t('Inherited values')}</h3>
                <div className="entry-values-wrap">
                  <table className="entry-values">
                    <thead>
                      <tr>
                        <th>{t('Item')}</th>
                        <th>{t('Value')}</th>
                        <th>{t('Intent')}</th>
                        <th>{t('Source')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.assignments.map((item) => (
                        <tr key={item.id}>
                          <td
                            title={
                              preview.steps.find(
                                (step) => step.id === item.processStepId,
                              )?.label
                            }
                          >
                            {item.label}
                            {(item.subjectId ||
                              item.positionId ||
                              preview.assignments.some(
                                (other) =>
                                  other.id !== item.id &&
                                  other.label === item.label,
                              )) && (
                              <small>
                                {[
                                  preview.steps.find(
                                    (step) => step.id === item.processStepId,
                                  )?.label,
                                  item.subjectId,
                                  item.positionId,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </small>
                            )}
                          </td>
                          <td>
                            {item.value}
                            {props.units?.[item.id]
                              ? ` ${props.units[item.id]}`
                              : ''}
                          </td>
                          <td>
                            <span
                              className={`entry-intent ${item.intentRole === 'VARIED' ? 'varied' : ''}`}
                              title={t(
                                item.intentRole === 'VARIED'
                                  ? 'Intentionally Varied'
                                  : 'Fixed',
                              )}
                            >
                              {t(
                                item.intentRole === 'VARIED'
                                  ? 'VARIED'
                                  : 'FIXED',
                              )}
                            </span>
                          </td>
                          <td>{t(item.kind)}</td>
                        </tr>
                      ))}
                      {!preview.assignments.length && (
                        <tr>
                          <td colSpan={4}>
                            {t(
                              'No experimental setup will be inherited. Configuration context remains pinned for valid editing.',
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {source === 'BLANK' && (
                  <p>
                    {t(
                      'No Operations, variables or Measurement plan are inherited. Study identity, Subjects and exact configuration remain pinned.',
                    )}
                  </p>
                )}
                {readiness && (
                  <p
                    className={`entry-readiness ${readiness.status === 'READY' ? 'ready' : ''}`}
                  >
                    {readiness.status === 'READY' && <StudyIcon name="16529" />}
                    {t('Lifecycle readiness:')} {t(readiness.status)}
                  </p>
                )}
                {readiness && readiness.status !== 'READY' && (
                  <p role="alert">
                    {readiness.missing.map((item) => t(item)).join('; ')}.{' '}
                    <Link href={`/series/${seriesSlug}?view=setup`}>
                      {t('Confirm reasoning in Study Setup')}
                    </Link>
                  </p>
                )}
                <div className="entry-actions">
                  <button
                    className="entry-button"
                    disabled={busy}
                    onClick={props.onBack}
                  >
                    {t('Back')}
                  </button>
                  <button
                    className="entry-button primary"
                    disabled={
                      busy || (!!readiness && readiness.status !== 'READY')
                    }
                    onClick={props.onCreate}
                  >
                    {t(busy ? 'Saving…' : 'Create Run & Open Plan')}
                  </button>
                </div>
              </>
            ) : (
              <p className="entry-preview-hint">
                {t(
                  'Select a source and click Review Inheritance to see what will be inherited.',
                )}
              </p>
            )}
          </aside>
        </div>
      </main>
    </EntryShell>
  );
}
