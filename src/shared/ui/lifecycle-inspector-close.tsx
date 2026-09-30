'use client';
/* oxlint-disable next/no-img-element -- Intrinsic Figma SVG. */
import { useLocale } from '@/src/shared/i18n/locale';
export function LifecycleInspectorClose({
  onClose,
  evaluation = false,
}: {
  onClose: () => void;
  evaluation?: boolean;
}) {
  const { t } = useLocale();
  return (
    <button
      className="lifecycle-inspector-close"
      aria-label={t('Close Inspector')}
      onClick={onClose}
    >
      <img
        src={
          evaluation
            ? '/figma/lifecycle/97b29.svg'
            : '/figma/run-plan/close.svg'
        }
        alt=""
      />
    </button>
  );
}
