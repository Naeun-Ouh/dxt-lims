import { LocalizedText } from '@/src/shared/i18n/text';
import ExperimentHome from '@/src/features/experiment-home/home';
import { ProductionHome } from '@/src/features/experiment-home/production-home';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import type { DashboardProjection } from '@/src/application/discovery';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (process.env.DXT_REPOSITORY !== 'postgres') return <ExperimentHome />;
  let dashboard: DashboardProjection,
    studies: { series_slug: string; display_name: string }[];
  try {
    [dashboard, studies] = await Promise.all([
      productionRequest({
        operation: 'dashboard.query',
        query: { scope: { kind: 'MY' }, limit: 10 },
      }) as Promise<DashboardProjection>,
      productionRequest({ operation: 'study.list' }) as Promise<
        { series_slug: string; display_name: string }[]
      >,
    ]);
  } catch {
    return (
      <main role="alert">
        <LocalizedText>Production identity or access context unavailable.</LocalizedText>
      </main>
    );
  }
  return <ProductionHome dashboard={dashboard} studies={studies} />;
}
