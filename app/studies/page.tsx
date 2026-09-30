import {
  StudyList,
  type StudyListRow,
} from '@/src/features/experiment-series/study-list';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import type {
  DashboardProjection,
  DiscoveryPage,
  RunSummary,
} from '@/src/application/discovery';
import type { StudySetupSnapshot } from '@/src/features/experiment-series/study-setup-model';
import {
  scenarioForSeries,
  type SeriesSlug,
} from '@/src/features/experiment-series/run-entry-model';
import { LocalizedText } from '@/src/shared/i18n/text';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (process.env.DXT_REPOSITORY !== 'postgres') {
    const slugs: SeriesSlug[] = [
      'dts-improvement',
      'cmp-stability',
      'adhesion-material-optimization',
    ];
    return (
      <StudyList
        studies={slugs.map((slug) => {
          const source = scenarioForSeries(slug);
          return {
            id: source.series.id,
            slug,
            name: source.series.name,
            area: source.area,
            latest: null,
            contextUnavailable: true,
          };
        })}
      />
    );
  }
  let studies: StudyListRow[];
  try {
    const accessible = (await productionRequest({
      operation: 'study.list',
    })) as { study_id: string; series_slug: string; display_name: string }[];
    studies = await Promise.all(
      accessible.map(async (study) => {
        // Each enrichment uses the same authorized boundary, never a fixture fallback.
        const [setup, runs, activity] = await Promise.allSettled([
          productionRequest(
            { operation: 'study.load', slug: study.series_slug },
            (app) => app.studies.load(study.series_slug as SeriesSlug),
          ) as Promise<StudySetupSnapshot | null>,
          productionRequest({
            operation: 'run.summaries',
            query: {
              scope: { kind: 'ACCESSIBLE' },
              studySlug: study.series_slug,
              limit: 1,
            },
          }) as Promise<DiscoveryPage<RunSummary>>,
          productionRequest({
            operation: 'dashboard.query',
            query: {
              scope: { kind: 'ACCESSIBLE' },
              studySlug: study.series_slug,
              limit: 1,
            },
          }) as Promise<DashboardProjection>,
        ]);
        return {
          id: study.study_id,
          slug: study.series_slug,
          name: study.display_name,
          area:
            setup.status === 'fulfilled' ? (setup.value?.area ?? null) : null,
          latest:
            runs.status === 'fulfilled' ? (runs.value.items[0] ?? null) : null,
          lastActivity:
            activity.status === 'fulfilled'
              ? (activity.value.recent[0]?.updatedAt ?? null)
              : null,
          contextUnavailable: runs.status === 'rejected',
        };
      }),
    );
  } catch {
    return (
      <main role="alert">
        <LocalizedText>
          Production identity or access context unavailable.
        </LocalizedText>
      </main>
    );
  }
  return <StudyList studies={studies} />;
}
