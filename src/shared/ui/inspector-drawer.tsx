/* oxlint-disable next/no-img-element -- Figma SVG uses intrinsic geometry. */
'use client';
import { useLocale } from '@/src/shared/i18n/locale';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export function InspectorDrawer({
  open,
  title,
  onClose,
  children,
  className = '',
  closeIconSrc,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeIconSrc?: string;
}) {
  const { t } = useLocale();
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dxt-inspector-layer">
      <button
        className="dxt-inspector-backdrop"
        aria-label={t('Close {0}', [title])}
        onClick={onClose}
      />
      <aside className={`dxt-inspector-drawer ${className}`} aria-label={title}>
        <button
          className="dxt-inspector-close"
          aria-label={t('Close {0}', [title])}
          onClick={onClose}
        >
          {closeIconSrc ? <img src={closeIconSrc} alt="" /> : <X size={17} />}
        </button>
        {children}
      </aside>
    </div>
  );
}
