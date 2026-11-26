'use client';
import { SampleSelectionDetail } from './selection-detail';
import { useEffect, useState } from 'react';
import type { SampleRevisionChoice } from '@/src/application/sample-lifecycle';
import { sampleRequest } from '@/src/infrastructure/http/sample-client';
import { useLocale } from '@/src/shared/i18n/locale';
import { sampleText } from '@/src/shared/i18n/sample-messages';
export function SampleRevisionPicker({
  value,
  denied,
  onChange,
  compact = false,
}: {
  compact?: boolean;
  value?: string | null;
  denied?: boolean;
  onChange: (id: string | null) => void;
}) {
  const { locale } = useLocale(),
    t = (k: Parameters<typeof sampleText>[1]) => sampleText(locale, k);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [rows, setRows] = useState<SampleRevisionChoice[]>([]),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void sampleRequest<SampleRevisionChoice[]>({
      operation: 'revisions',
      search,
    })
      .then((r) => {
        if (active) {
          setRows(r);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [open, search]);
  return (
    <div>
      {!compact && (
        <>
          <small>{t('selectRevision')}</small>
          <SampleSelectionDetail revisionId={value} denied={denied} />
        </>
      )}
      <button
        type="button"
        className="entry-button"
        title={t('selectRevision')}
        style={
          compact
            ? { minHeight: 24, height: 24, padding: '2px 5px', fontSize: 11 }
            : undefined
        }
        onClick={() => setOpen(true)}
      >
        {t(compact ? 'revision' : 'lookup')}
      </button>
      {!compact && (value || denied) && (
        <button
          type="button"
          className="entry-button"
          onClick={() => onChange(null)}
        >
          {t('clear')}
        </button>
      )}
      {open && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setOpen(false)}
          aria-modal="true"
          aria-label={t('lookup')}
          className="sample-section"
          style={{
            position: 'fixed',
            inset: '15% 10%',
            zIndex: 70,
            background: 'white',
            padding: 24,
            overflow: 'auto',
            boxShadow: '0 0 0 100vmax #0006',
          }}
        >
          <h2>{t('lookup')}</h2>
          <SampleSelectionDetail revisionId={value} denied={denied} />
          {(value || denied) && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {t('clear')}
            </button>
          )}
          <label>
            {t('search')}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </label>
          <button type="button" onClick={() => setOpen(false)}>
            {t('close')}
          </button>
          {error && <p role="alert">{t('error')}</p>}
          <table className="dxt-grid">
            <thead>
              <tr>
                <th>{t('code')}</th>
                <th>{t('name')}</th>
                <th>{t('revision')}</th>
                <th>{t('apply')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.sampleCode}</td>
                  <td>{r.name}</td>
                  <td>{r.revision}</td>
                  <td>
                    <button
                      type="button"
                      className="entry-button"
                      onClick={() => {
                        onChange(r.id);
                        setOpen(false);
                      }}
                    >
                      {t('apply')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error && <p>{t('empty')}</p>}
        </dialog>
      )}
    </div>
  );
}
