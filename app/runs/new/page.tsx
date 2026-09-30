import CreateRunEntry from '@/src/features/experiment-series/create-run-entry';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    area?: string;
    series?: string;
    from?: string;
    preview?: string;
  }>;
}) {
  const query = await searchParams;
  if (query.series && !['dts-improvement','cmp-stability','adhesion-material-optimization'].includes(query.series)) return <main role="alert">Study could not be resolved.</main>;
  const seriesSlug =
    query.series === 'adhesion-material-optimization'
      ? 'adhesion-material-optimization'
      : query.series === 'cmp-stability' || query.area?.toUpperCase() === 'CMP'
      ? 'cmp-stability'
      : 'dts-improvement';
  const initialSource =
    query.from === 'study-default' ? 'STUDY_DEFAULT' : 'PREVIOUS_RUN';
  return (
    <CreateRunEntry
      seriesSlug={seriesSlug}
      initialPreview={query.preview === '1'}
      initialSource={initialSource}
    />
  );
}
