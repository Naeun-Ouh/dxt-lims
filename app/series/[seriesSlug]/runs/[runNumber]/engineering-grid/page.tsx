import CreatedRunGrid from '@/src/features/experiment-series/created-run-grid';
import type { SeriesSlug } from '@/src/features/experiment-series/run-entry-model';

export default async function Page({
  params,
}: {
  params: Promise<{ seriesSlug: string; runNumber: string }>;
}) {
  const { seriesSlug, runNumber } = await params;
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seriesSlug) ||
    !/^[1-9][0-9]*$/.test(runNumber)
  )
    return null;
  return (
    <CreatedRunGrid
      seriesSlug={seriesSlug as SeriesSlug}
      runNumber={Number(runNumber)}
      explicitAssignments={!['dts-improvement','cmp-stability','adhesion-material-optimization'].includes(seriesSlug)}
    />
  );
}
