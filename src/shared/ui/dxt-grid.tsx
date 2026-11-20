import type { ReactNode } from 'react';

/** Shared presentation only: table semantics and controls remain owned by each workflow. */
export function DxtGridFrame({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dxt-grid-scroll ${className}`} aria-label={label}>
      {children}
    </section>
  );
}
export function DxtStatus({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}) {
  return <span className={`dxt-status dxt-status-${tone}`}>{children}</span>;
}
export function DxtCellText({ children }: { children: string }) {
  return (
    <span className="dxt-cell-text" title={children}>
      {children}
    </span>
  );
}
