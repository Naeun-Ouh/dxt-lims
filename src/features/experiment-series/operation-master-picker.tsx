'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { useLocale } from '@/src/shared/i18n/locale';

/** Selection only: values and participation are authored in the Run Draft. */
export function OperationMasterPicker({
  options,
  onAdd,
  onClose,
}: {
  options: BootstrapOperationOption[];
  onAdd: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const helpId = useId();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    searchInput.current?.focus();
    return () => element.close();
  }, []);
  const search = query.trim().toLocaleLowerCase();
  const matches = options.filter(
    ({ operation }) =>
      (role === 'ALL' || operation.role === role) &&
      [
        operation.label,
        operation.id,
        operation.context?.equipmentLabel,
        operation.context?.moduleLabel,
        ...operation.items.map((item) => item.label),
      ].some((value) => value?.toLocaleLowerCase().includes(search)),
  );
  return (
    <dialog
      ref={dialog}
      className="operation-master-dialog"
      aria-labelledby={titleId}
      aria-describedby={helpId}
      onCancel={onClose}
      onClose={onClose}
    >
      <header className="operation-master-header">
        <div>
          <h2 id={titleId}>{t('Operation master lookup')}</h2>
          <p id={helpId}>
            {t(
              'Search Operations available in this Study’s reference version. Select in the order you want to add them.',
            )}
          </p>
        </div>
        <button type="button" className="entry-button" onClick={onClose}>
          {t('Close')}
        </button>
      </header>
      <div className="operation-master-filters">
        <label>
          {t('Search Operations')}
          <input
            ref={searchInput}
            type="search"
            value={query}
            placeholder={t('Operation name, ID, equipment or condition')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          {t('Operation type')}
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="ALL">{t('All Operation types')}</option>
            <option value="PROCESS">{t('Process Operation')}</option>
            <option value="MEASUREMENT">{t('Measurement')}</option>
          </select>
        </label>
      </div>
      <p className="operation-master-count" aria-live="polite">
        {t('{0} Operations found · {1} selected', [
          matches.length,
          selected.length,
        ])}
      </p>
      <div className="operation-master-results">
        {matches.length ? (
          matches.map(({ id, operation }) => {
            const position = selected.indexOf(id);
            return (
              <label
                key={id}
                className={`operation-master-result ${position >= 0 ? 'is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={position >= 0}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, id]
                        : current.filter((value) => value !== id),
                    );
                  }}
                />
                <span className="operation-master-description">
                  <strong>{operation.label}</strong>
                  <small>
                    {t(
                      operation.role === 'MEASUREMENT'
                        ? 'Measurement'
                        : 'Process Operation',
                    )}{' '}
                    · {operation.id}
                  </small>
                  <small>
                    {t('Equipment')}: {operation.context?.equipmentLabel || '—'}
                  </small>
                  {operation.items.length > 0 && (
                    <small>
                      {t('Conditions')}:{' '}
                      {operation.items.map((item) => item.label).join(' · ')}
                    </small>
                  )}
                </span>
                {position >= 0 && (
                  <span
                    className="operation-master-order"
                    aria-label={t('Selection order {0}', [position + 1])}
                  >
                    {position + 1}
                  </span>
                )}
              </label>
            );
          })
        ) : (
          <p className="operation-master-empty">
            {t(
              options.length
                ? 'No Operations match. Try another search or type.'
                : 'No Operations are available in this reference version.',
            )}
          </p>
        )}
      </div>
      <footer className="operation-master-footer">
        <p>
          {t(
            'Added Operations can be reordered in the draft. Condition values are entered there.',
          )}
        </p>
        <button type="button" className="entry-button" onClick={onClose}>
          {t('Cancel')}
        </button>
        <button
          type="button"
          className="entry-button primary"
          disabled={!selected.length}
          onClick={() => {
            onAdd(selected);
            onClose();
          }}
        >
          {t('Add {0} Operations', [selected.length])}
        </button>
      </footer>
    </dialog>
  );
}
