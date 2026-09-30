'use client';
import type { AnalysisRow, AnalysisVisualization } from '@/src/domain/analysis';
import { useLocale } from '@/src/shared/i18n/locale';

// Display coordinates only; the underlying observations and saved references are unchanged.
export function AnalysisChart({
  rows,
  type,
  xDimension,
  groupBy,
  onSelect,
}: {
  rows: AnalysisRow[];
  type: Exclude<AnalysisVisualization, 'TABLE'>;
  xDimension: string;
  groupBy: 'SUBJECT' | 'RUN' | 'PARAMETER';
  onSelect: (row: AnalysisRow) => void;
}) {
  const { t } = useLocale();
  const panels = [
    ...new Set(
      rows
        .filter((row) => row.value !== null)
        .map((row) => `${row.parameterId}:${row.unit}`),
    ),
  ];
  if (!panels.length)
    return (
      <div className="analysis-v1-chart empty">
        {t('— No numeric Measurement results to visualize.')}
      </div>
    );
  return (
    <>
      {panels.map((panel) => {
        const panelRows = rows.filter(
          (row) => `${row.parameterId}:${row.unit}` === panel,
        );
        const eligible = rows.filter(
          (row) =>
            `${row.parameterId}:${row.unit}` === panel && row.value !== null,
        );
        const points = eligible.filter(
          (row) =>
            ['RUN', 'SUBJECT'].includes(xDimension) ||
            row.coordinates.some((item) => item.definitionId === xDimension),
        );
        const xValue = (row: AnalysisRow) =>
          xDimension === 'RUN'
            ? row.runNumber
            : xDimension === 'SUBJECT'
              ? row.subject.displayLabel
              : row.coordinates.find(
                  (item) => item.definitionId === xDimension,
                )!.value;
        const categories = [...new Set(points.map(xValue))].sort((a, b) =>
          typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b), undefined, { numeric: true }),
        );
        const values = points.map((row) => row.value!);
        const min = Math.min(...values),
          max = Math.max(...values);
        const spread = Math.max(max - min, Math.abs(max) * 0.02, 1);
        const lo = min - spread * 0.15,
          hi = max + spread * 0.15;
        const x = (row: AnalysisRow) =>
          80 +
          (categories.indexOf(xValue(row)) /
            Math.max(categories.length - 1, 1)) *
            690;
        const y = (value: number) => 185 - ((value - lo) / (hi - lo)) * 140;
        const group = (row: AnalysisRow) =>
          groupBy === 'SUBJECT'
            ? row.subject.id
            : groupBy === 'RUN'
              ? row.runId
              : row.parameterId;
        const groups = [...new Set(points.map(group))];
        const colors = ['#0284c7', '#7c3aed', '#15803d', '#b45309', '#be185d'];
        return (
          <div className="analysis-v1-chart" key={panel}>
            <header>
              <div>
                <b>
                  {eligible[0]?.parameterLabel} ·{' '}
                  {t(
                    type === 'LINE'
                      ? 'Line'
                      : type === 'BAR'
                        ? 'Bar'
                        : 'Scatter',
                  )}
                </b>
                <span>
                  {xDimension === 'RUN'
                    ? t('Run order')
                    : xDimension === 'SUBJECT'
                      ? t('Subject order')
                      : xDimension}{' '}
                  · {eligible[0]?.unit}
                </span>
              </div>
              <small>
                {points.length} {t('plotted ·')}{' '}
                {panelRows.length - points.length} {t('missing')}
              </small>
            </header>
            {!points.length ? (
              <p>{t('— No numeric Measurement results to visualize.')}</p>
            ) : (
              <svg
                viewBox="0 0 790 220"
                aria-label={t(
                  '{0} visualization of selected Measurement results',
                  [t(type)],
                )}
              >
                <line x1="42" x2="760" y1="190" y2="190" />
                <line x1="42" x2="42" y1="25" y2="190" />
                {[lo, (lo + hi) / 2, hi].map((value) => (
                  <g key={value}>
                    <line
                      x1="42"
                      x2="760"
                      y1={y(value)}
                      y2={y(value)}
                      className="chart-gridline"
                    />
                    <text x="36" y={y(value) + 3} textAnchor="end">
                      {Number(value.toPrecision(4))}
                    </text>
                  </g>
                ))}
                {categories.map((value, index) => (
                  <text
                    key={String(value)}
                    x={80 + (index / Math.max(categories.length - 1, 1)) * 630}
                    y="207"
                    textAnchor="middle"
                  >
                    {String(value)}
                  </text>
                ))}
                {type === 'LINE' &&
                  groups.map((id, index) => (
                    <polyline
                      key={id}
                      style={{ stroke: colors[index % colors.length] }}
                      points={points
                        .filter((row) => group(row) === id)
                        .sort((a, b) => x(a) - x(b))
                        .map((row) => `${x(row)},${y(row.value!)}`)
                        .join(' ')}
                    />
                  ))}
                {points.map((row) => {
                  const sameX = points.filter(
                    (point) => xValue(point) === xValue(row),
                  );
                  const barWidth = Math.min(16, 60 / Math.max(sameX.length, 1));
                  const px = x(row),
                    py = y(row.value!);
                  const color =
                    colors[groups.indexOf(group(row)) % colors.length];
                  const props = {
                    onClick: () => onSelect(row),
                    tabIndex: 0,
                    role: 'button',
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(row);
                      }
                    },
                    'aria-label': `${row.subject.displayLabel} · ${row.value} ${row.unit}`,
                    style: { fill: color },
                  };
                  return type === 'BAR' ? (
                    <rect
                      key={row.id}
                      {...props}
                      x={
                        px +
                        (sameX.indexOf(row) - (sameX.length - 1) / 2) *
                          barWidth -
                        barWidth / 2
                      }
                      y={py}
                      width={Math.max(2, barWidth - 1)}
                      height={190 - py}
                    >
                      <title>{props['aria-label']}</title>
                    </rect>
                  ) : (
                    <circle key={row.id} {...props} cx={px} cy={py} r="4">
                      <title>{props['aria-label']}</title>
                    </circle>
                  );
                })}
              </svg>
            )}
            <div className="analysis-chart-legend">
              {groups.map((id, index) => {
                const row = points.find((point) => group(point) === id)!;
                return (
                  <span
                    key={id}
                    style={{ color: colors[index % colors.length] }}
                  >
                    ●{' '}
                    {groupBy === 'SUBJECT'
                      ? row.subject.displayLabel
                      : groupBy === 'RUN'
                        ? `${t('Run')} ${row.runNumber}`
                        : row.parameterLabel}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
