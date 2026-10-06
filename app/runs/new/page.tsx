import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import { PersistedStudy } from '@/src/features/experiment-series/persisted-study';
import { LocalizedText } from '@/src/shared/i18n/text';
import type { StudyIdentity } from '@/src/application/study-creation';
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
  if (
    query.series &&
    ![
      'dts-improvement',
      'cmp-stability',
      'adhesion-material-optimization',
    ].includes(query.series)
  ) {
    let study: StudyIdentity | undefined;
    try { study = await productionRequest({ operation: 'study.identity', slug: query.series }) as StudyIdentity; }
    catch { /* The resource boundary fails closed. */ }
    return study ? <PersistedStudy study={study} /> : <main role="alert"><LocalizedText>Resource unavailable or access denied.</LocalizedText></main>;
  }
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
