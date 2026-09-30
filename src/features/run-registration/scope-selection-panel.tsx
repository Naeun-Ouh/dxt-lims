'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import type { WorkspaceOperation } from './workspace-model';
import type { SubjectRef } from '@/src/domain/experiment/subject';
export function ScopeSelectionPanel({
  stage,
  operations,
  draft,
  subjectIds,
  candidates,
  changeSubjects,
  onChangeSubjects,
  onSubjects,
  onContinue,
  onConfirm,
  onBack,
  onCancel,
}: {
  stage: 'RANGE' | 'SUBJECTS';
  operations: WorkspaceOperation[];
  draft: string[];
  subjectIds: string[];
  candidates: SubjectRef[];
  changeSubjects: boolean;
  onChangeSubjects: () => void;
  onSubjects: (ids: string[]) => void;
  onContinue: () => void;
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const start = operations.find((op) => op.id === draft[0]),
    end = operations.find((op) => op.id === draft.at(-1));
  return (
    <aside
      className="operation-inspector scope-selection-panel"
      aria-label={t("Experiment Scope selection")}
    >
      <header>
        <span>{t("EXPERIMENT SCOPE")}</span>
        <h2>
          {draft.length}{" "}{t("Operations")}{stage === 'RANGE' ? t("selected") : ''}
        </h2>
        {start && end ? (
          <>
            <p>
              OP{String(start.sequence).padStart(3, '0')}{" "}{t("→ OP")}{String(end.sequence).padStart(3, '0')}
            </p>
            <p>
              {start.name} → {end.name}
            </p>
          </>
        ) : (
          <p>{t("Drag Operation rows · Shift-click also supported")}</p>
        )}
      </header>
      <section className="scope-selection-content">
        {stage === 'SUBJECTS' ? (
          <>
            <h3>{t("Subjects")}</h3>
            <p>
              {subjectIds
                .map(
                  (id) =>
                    candidates.find((item) => item.id === id)?.displayLabel ??
                    id,
                )
                .join(' · ') || t("No subjects selected")}
            </p>
            <p>{subjectIds.length}{" "}{t("selected")}</p>
            <button onClick={onChangeSubjects}>
              {changeSubjects ? t("Done") : t("Change")}
            </button>
            {changeSubjects && (
              <fieldset className="scope-subject-grid">
                <legend>{t("Available subjects")}</legend>
                {candidates.map((w) => (
                  <label key={w.id}>
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(w.id)}
                      onChange={(e) =>
                        onSubjects(
                          e.target.checked
                            ? [...subjectIds, w.id].sort()
                            : subjectIds.filter((id) => id !== w.id),
                        )
                      }
                    />
                    {w.displayLabel}
                  </label>
                ))}
              </fieldset>
            )}
          </>
        ) : (
          <p>{t("Which Operations belong to my experiment?")}</p>
        )}
      </section>
      <section className="scope-panel-actions">
        {stage === 'RANGE' ? (
          <button disabled={!draft.length} onClick={onContinue}>{t("Continue")}</button>
        ) : (
          <>
            <button
              className="primary-button"
              disabled={!draft.length || !subjectIds.length}
              onClick={onConfirm}
            >{t("Confirm Experiment Scope")}</button>
            <button onClick={onBack}>{t("Back")}</button>
          </>
        )}
        <button onClick={onCancel}>{t("Cancel")}</button>
      </section>
    </aside>
  );
}
