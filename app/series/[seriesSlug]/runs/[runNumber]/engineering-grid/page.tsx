import CreatedRunGrid from '@/src/features/experiment-series/created-run-grid';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';

const supported = new Set<SeriesSlug>([
  'dts-improvement',
  'cmp-stability',
  'adhesion-material-optimization',
]);

export default async function Page({
  params,
}: {
  params: Promise<{ seriesSlug: string; runNumber: string }>;
}) {
  const { seriesSlug, runNumber } = await params;
  if (!supported.has(seriesSlug as SeriesSlug)) return null;
  return (
    <CreatedRunGrid
      seriesSlug={seriesSlug as SeriesSlug}
      runNumber={Number(runNumber)}
    />
  );
}
