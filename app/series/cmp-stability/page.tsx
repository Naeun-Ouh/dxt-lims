import { LocalizedText } from '@/src/shared/i18n/text';
import type {DashboardProjection} from '@/src/application/discovery';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import type { StudyPermissions } from '@/src/application/authorization';
import ProductizedSeries from '@/src/features/experiment-series/productized-series';
import type { StudyView } from '@/src/features/experiment-series/productized-series';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  let canCreateRun=true;
  let productionSummary:{runCount:number;updatedAt:string|null}|undefined;
  if(process.env.DXT_REPOSITORY==='postgres'){try{canCreateRun=(await productionRequest({operation:'study.permissions',slug:'cmp-stability'}) as StudyPermissions).canCreateRun;const dashboard=await productionRequest({operation:'dashboard.query',query:{studySlug:'cmp-stability',scope:{kind:'ACCESSIBLE'},limit:1}}) as DashboardProjection;productionSummary={runCount:dashboard.counts.runs,updatedAt:dashboard.continueWorking?.updatedAt??null};}catch{return <main role="alert"><LocalizedText>Resource unavailable or access denied.</LocalizedText></main>;}}
  const view: StudyView = query.view === 'setup' || query.view === 'runs' ? query.view : 'overview';
  return <ProductizedSeries productionSummary={productionSummary} canCreateRun={canCreateRun} seriesSlug="cmp-stability" initialView={view} initialPickerOpen={query.picker === '1'} initialInspectorOpen={query.inspector === '1'} initialItemRevisionId={query.item} />;
}
