'use client';
import { useState } from 'react';
import type { RunPlanningSnapshot } from './planning-model';
import { useLocale } from '@/src/shared/i18n/locale';

export function ParticipationEditor({
  snapshot,
  operationId,
  readOnly,
  onApply,
  onCancel,
}: {
  snapshot: RunPlanningSnapshot;
  operationId: string;
  readOnly: boolean;
  onApply: (subjectIds: string[]) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [participants, setParticipants] = useState(() =>
    snapshot.subjects
      .filter((s) => snapshot.subjectOperationIds[s.id]?.includes(operationId))
      .map((s) => s.id),
  );
  return (
    <section
      className="participation-editor"
      aria-label={t('Operation participation')}
    >
      <header>
        <strong>
          {snapshot.steps.find((s) => s.id === operationId)?.label} ·{' '}
          {t('Operation participation')}
        </strong>
        <span>
          {participants.length} / {snapshot.subjects.length} {t('participants')}
        </span>
      </header>
      <p>
        {t(
          'Choose the subjects that participate in this operation. Apply stages the change; Save Plan persists it.',
        )}
      </p>
      <fieldset disabled={readOnly}>
        <legend>{t('Subjects')}</legend>
        <label>
          <input
            type="checkbox"
            checked={participants.length === snapshot.subjects.length}
            onChange={(e) =>
              setParticipants(
                e.target.checked ? snapshot.subjects.map((s) => s.id) : [],
              )
            }
          />
          {t('Select all subjects')}
        </label>
        <div className="participation-subjects">
          {snapshot.subjects.map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={participants.includes(s.id)}
                onChange={(e) =>
                  setParticipants((ids) =>
                    e.target.checked
                      ? [...ids, s.id]
                      : ids.filter((id) => id !== s.id),
                  )
                }
              />
              {s.displayLabel}
            </label>
          ))}
        </div>
      </fieldset>
      <footer>
        <button onClick={onCancel}>{t('Cancel')}</button>
        <button
          className="plan-save"
          disabled={readOnly}
          onClick={() => onApply(participants)}
        >
          {t('Apply')}
        </button>
      </footer>
    </section>
  );
}
