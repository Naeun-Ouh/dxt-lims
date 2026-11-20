'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ReferenceCatalog } from '@/src/domain/reference';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { useLocale } from '@/src/shared/i18n/locale';

/** Selection only: values and participation are authored in the Run Draft. */
export function OperationMasterPicker({
  options,
  catalog,
  onAdd,
  onClose,
}: {
  options: BootstrapOperationOption[];
  catalog: ReferenceCatalog;
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
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailPanelId = useId();
  const detail = options.find((option) => option.id === detailId);
  const displayName = (id?: string | null, label?: string) => {
    const resource = catalog.resources.find((item) => item.id === id);
    return (
      resource?.name ||
      (label && label !== id ? label : id ? t('Display name unavailable') : '—')
    );
  };
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
      <section
        className="operation-master-results"
        aria-label={t('Operation search results')}
      >
        <table className="operation-master-table">
          <caption className="operation-master-caption">
            {t(
              'Open an Operation name for reference details. Selection numbers show the order of addition.',
            )}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('Selection')}</th>
              <th scope="col">{t('Operation name')}</th>
              <th scope="col">{t('Operation type')}</th>
              <th scope="col">{t('Area')}</th>
              <th scope="col">{t('Equipment')}</th>
              <th scope="col">{t('Module')}</th>
              <th scope="col">{t('Major conditions')}</th>
              <th scope="col">{t('Measurement capability')}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(({ id, operation, parameterIds }, rowIndex) => {
              const position = selected.indexOf(id);
              const context = operation.context;
              const parameterNames = parameterIds.map(
                (parameterId) =>
                  catalog.parameters.find(
                    (parameter) => parameter.id === parameterId,
                  )?.name || t('Display name unavailable'),
              );
              const areaName = catalog.areas.find(
                (area) => area.id === context?.areaDefinitionRevisionId,
              )?.name;
              return (
                <tr
                  key={id}
                  className={position >= 0 ? 'is-selected' : undefined}
                >
                  <td>
                    <div className="operation-master-selection">
                      <input
                        type="checkbox"
                        aria-label={t('Select {0}, result {1}', [
                          operation.label,
                          rowIndex + 1,
                        ])}
                        checked={position >= 0}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelected((current) =>
                            checked
                              ? [...current, id]
                              : current.filter((value) => value !== id),
                          );
                        }}
                      />
                      {position >= 0 && (
                        <span
                          className="operation-master-order"
                          aria-label={t('Selection order {0}', [position + 1])}
                        >
                          {position + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <th scope="row">
                    <button
                      type="button"
                      className="operation-master-detail-trigger"
                      aria-expanded={detailId === id}
                      aria-controls={detailPanelId}
                      onClick={() => setDetailId(detailId === id ? null : id)}
                    >
                      {operation.label}
                    </button>
                  </th>
                  <td>
                    {t(
                      operation.role === 'MEASUREMENT'
                        ? 'Measurement'
                        : 'Process Operation',
                    )}
                  </td>
                  <td>
                    {areaName ||
                      displayName(
                        context?.areaDefinitionRevisionId,
                        context?.areaLabel,
                      )}
                  </td>
                  <td>
                    {displayName(
                      context?.equipmentReferenceId,
                      context?.equipmentLabel,
                    )}
                  </td>
                  <td>
                    {displayName(
                      context?.moduleReferenceId,
                      context?.moduleLabel,
                    )}
                  </td>
                  <td>
                    {operation.items.map((item) => item.label).join(' · ') ||
                      '—'}
                  </td>
                  <td>
                    {parameterNames.length
                      ? parameterNames.join(' · ')
                      : t('No configured measurement items')}
                  </td>
                </tr>
              );
            })}
            {!matches.length && (
              <tr>
                <td colSpan={8} className="operation-master-empty">
                  {t(
                    options.length
                      ? 'No Operations match. Try another search or type.'
                      : 'No Operations are available in this reference version.',
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {detail && (
        <section
          id={detailPanelId}
          className="operation-master-detail"
          aria-label={t('Operation reference details')}
        >
          <header>
            <h3>
              {detail.operation.label} · {t('Technical details')}
            </h3>
            <button
              type="button"
              className="entry-button"
              onClick={() => setDetailId(null)}
            >
              {t('Close details')}
            </button>
          </header>
          <dl>
            <dt>{t('Operation option ID')}</dt>
            <dd>{detail.id}</dd>
            <dt>{t('Operation revision ID')}</dt>
            <dd>{detail.operation.operationDefinitionRevisionId}</dd>
            <dt>{t('Area reference ID')}</dt>
            <dd>{detail.operation.context?.areaDefinitionRevisionId || '—'}</dd>
            <dt>{t('Equipment reference ID')}</dt>
            <dd>{detail.operation.context?.equipmentReferenceId || '—'}</dd>
            <dt>{t('Module reference ID')}</dt>
            <dd>{detail.operation.context?.moduleReferenceId || '—'}</dd>
            <dt>{t('Measurement parameter IDs')}</dt>
            <dd>{detail.parameterIds.join(' · ') || '—'}</dd>
          </dl>
        </section>
      )}
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
