import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import type { StudyIdentity } from '@/src/application/study-creation';
import { PersistedStudy } from '@/src/features/experiment-series/persisted-study';
import { LocalizedText } from '@/src/shared/i18n/text';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ seriesSlug: string }>;
}) {
  let study: StudyIdentity | undefined;
  try {
    study = (await productionRequest({
      operation: 'study.identity',
      slug: (await params).seriesSlug,
    })) as StudyIdentity;
  } catch {
    /* Fail closed; never load a fixture for an unavailable Study. */
  }
  return study ? (
    <PersistedStudy study={study} />
  ) : (
    <main role="alert">
      <LocalizedText>Resource unavailable or access denied.</LocalizedText>
    </main>
  );
}
