'use client';
import { allocationUi } from '@/src/shared/i18n/allocation-messages';
import { RunDraftFeedback } from './run-draft-feedback';
import { useState } from 'react';
import type { RunDraft } from '@/src/application/run-draft';
import { useLocale } from '@/src/shared/i18n/locale';
import { DxtGridFrame } from '@/src/shared/ui/dxt-grid';

export function removeDraftSubject(draft: RunDraft, id: string): RunDraft {
  return {
    ...draft,
    subjects: draft.subjects.filter((s) => s.id !== id),
    recipeSourceBindings:draft.recipeSourceBindings?.filter(b=>b.subjectId!==id),
    operations: draft.operations.map((op) => ({
      ...op,
      subjectIds: op.subjectIds.filter((s) => s !== id),
      ...(op.design?{design:{...op.design,allocations:Object.fromEntries(Object.entries(op.design.allocations).filter(([subject])=>subject!==id))}}:{}),
      items: op.items.filter((item) => item.subjectId !== id),
    })),
  };
}

export function RunDraftSubjects({
  draft,
  onChange,
}: {
  draft: RunDraft;
  onChange: (draft: RunDraft) => void;
}) {
  const { t, locale } = useLocale();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const add = () => {
    const subjectId = id.trim();
    if (draft.subjects.length >= 500)
      return setError('A Run supports up to 500 Subjects.');
    if (!subjectId) return setError('Enter a Subject ID.');
    if (draft.subjects.some((s) => s.id === subjectId))
      return setError('This Subject ID is already added.');
    onChange({
      ...draft,
      operations:draft.operations.map(op=>op.design?{...op,subjectIds:op.design.mode==='COMMON'?[...op.subjectIds,subjectId]:op.subjectIds,design:{...op.design,allocations:{...op.design.allocations,[subjectId]:{state:op.design.mode==='COMMON'?'COMMON' as const:'UNASSIGNED' as const}}}}:op),
      subjects: [
        ...draft.subjects,
        { id: subjectId, displayLabel: name.trim() || subjectId },
      ],
    });
    setId('');
    setName('');
    setError('');
  };
  return (
    <fieldset>
      <legend>1. {t('Subjects')}</legend>
      <p>
        {t(
          'A Subject is an individual Wafer or Specimen tracked in this Run. Add each object with its ID and optional display name.',
        )}
      </p>
      <div className="draft-subject-add">
        <label>
          {t('Subject ID')}
          <input
            maxLength={200}
            value={id}
            aria-invalid={!!error}
            onChange={(e) => {
              setId(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>
        <label>
          {t('Display name (optional)')}
          <input
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="entry-button"
          disabled={draft.subjects.length >= 500}
          onClick={add}
        >
          {t('Add Subject')}
        </button>
      </div>
      <RunDraftFeedback location="subjects" />
      {error && <p role="alert">{t(error)}</p>}
      {draft.subjects.length >= 500 && (
        <p>{t('A Run supports up to 500 Subjects.')}</p>
      )}
      <p aria-live="polite">
        {t('Draft Subject count: {0}', [draft.subjects.length])}
      </p>
      <DxtGridFrame label={t('Subjects')}>
        <table className="dxt-grid draft-subject-table">
          <thead>
            <tr>
              <th scope="col">{t('Subject ID')}</th>
              <th scope="col">{t('Display name')}</th>
              <th scope="col">{t('Remove')}</th>
            </tr>
          </thead>
          <tbody>
            {draft.subjects.map((subject) => (
              <tr key={subject.id}>
                <th scope="row">{subject.id}</th>
                <td>{subject.displayLabel}</td>
                <td>
                  <button
                    type="button"
                    className="entry-button dxt-action-danger"
                    aria-label={`${subject.id} · ${t('Remove')}`}
                    onClick={() =>
                      onChange(removeDraftSubject(draft, subject.id))
                    }
                  >
                    {t('Remove')}
                  </button>
                </td>
              </tr>
            ))}
            {!draft.subjects.length && (
              <tr>
                <td colSpan={3}>
                  {t(
                    'No Subjects added. Add the individual objects for this Run above.',
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DxtGridFrame>
      <small>
        {draft.planningContract==='GROUPS_V2'?allocationUi(locale,'newSubjects'):t(
          'Existing Operations do not automatically apply to new Subjects. Choose Operation application in the grid below.',
        )}
      </small>
    </fieldset>
  );
}
