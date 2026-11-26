'use client';
import { createContext, useContext } from 'react';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { useLocale } from '@/src/shared/i18n/locale';
import { validateStudySetupItem } from './study-setup-model';

export type DraftFeedback = Record<string, string[]>;
export const DraftFeedbackContext = createContext<DraftFeedback>({});
export const conditionFeedbackKey = (
  operation: number,
  applicability: string,
  subject: string | null,
) => JSON.stringify([operation, applicability, subject]);

/** Locate authoritative errors for presentation only; this never determines readiness. */
export function locateDraftFeedback(
  draft: RunDraft,
  options: BootstrapOperationOption[],
  missing: string[],
): DraftFeedback {
  const feedback: DraftFeedback = {};
  const add = (location: string, message: string) => {
    feedback[location] ??= [];
    if (!feedback[location].includes(message)) feedback[location].push(message);
  };
  for (const message of missing) {
    const [key, detail] = message.split('|');
    if (key === 'Add and save at least one Subject.')
      add('subjects', 'Add at least one Subject to this draft.');
    if (key === 'Add and save ordered Operations.')
      add('operations', 'Add at least one Operation to this draft.');
    draft.operations.forEach((op, index) => {
      const option = options.find((o) => o.id === op.optionId);
      if (!option) return;
      if (
        (key === 'Complete the Measurement plan for {0}.' ||
          key ===
            'Select compatible parameters and a Measurement point for {0}.') &&
        detail === option.operation.label
      ) {
        add(`measurement-${index}`, message);
      }
      for (const def of option.operation.items) {
        if (
          ![
            'Enter the required execution condition: {0}.',
            'Check the execution condition: {0}.',
          ].includes(key) ||
          (detail !== `${option.operation.label} · ${def.label}` &&
            detail !== `${index + 1} · ${def.label}`)
        )
          continue;
        const items = op.items.filter(
          (item) => item.applicabilityId === def.applicabilityId,
        );
        for (const item of items) {
          if (item.subjectId !== null && !item.value.trim()) continue;
          let reason = '';
          if (!item.value.trim())
            reason = 'Enter a value or remove an optional assignment.';
          else {
            try {
              validateStudySetupItem(def, item.value);
            } catch {
              reason =
                def.editor === 'NUMBER'
                  ? 'Enter a numeric value.'
                  : 'Choose a supported value.';
            }
          }
          if (reason)
            add(
              conditionFeedbackKey(index, def.applicabilityId, item.subjectId),
              reason,
            );
        }
        if (key === 'Enter the required execution condition: {0}.') {
          for (const subject of op.subjectIds) {
            if (
              !items.some(
                (item) => !!item.value.trim() && (item.subjectId === null || item.subjectId === subject),
              )
            )
              add(
                conditionFeedbackKey(index, def.applicabilityId, subject),
                'Enter a common planned value or a planned value for this Subject.',
              );
          }
        }
      }
    });
  }
  return feedback;
}

export function draftMessage(message: string) {
  return message === 'Add and save at least one Subject.'
    ? 'Add at least one Subject to this draft.'
    : message === 'Add and save ordered Operations.'
      ? 'Add at least one Operation to this draft.'
      : message;
}

export function RunDraftFeedback({ location }: { location: string }) {
  const feedback = useContext(DraftFeedbackContext);
  const { t } = useLocale();
  if (!feedback[location]?.length) return null;
  return (
    <div className="draft-inline-errors" data-draft-error tabIndex={-1}>
      {feedback[location].map((message) => {
        const [key, ...args] = message.split('|');
        return <p key={message}>{t(draftMessage(key), args)}</p>;
      })}
    </div>
  );
}

/** Collapse duplicate messages emitted by the two existing server checks. */
export function summarizeDraftFeedback(
  draft: RunDraft | null,
  options: BootstrapOperationOption[],
  missing: string[],
) {
  return [...new Set(missing)].filter((message) => {
    const [key, detail] = message.split('|');
    if (key !== 'Check the execution condition: {0}.' || !draft) return true;
    const match = detail?.match(/^(\d+) · (.+)$/);
    if (!match) return true;
    const op = draft.operations[Number(match[1]) - 1];
    const label = options.find((option) => option.id === op?.optionId)
      ?.operation.label;
    return !label || !missing.includes(`${key}|${label} · ${match[2]}`);
  });
}
