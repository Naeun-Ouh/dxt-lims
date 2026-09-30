import AnalysisWorkspace from '@/src/features/analysis/workspace';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  return <AnalysisWorkspace initialContext={{
    studyId: query.study,
    runNumbers: query.runs?.split(',').map(Number).filter(Number.isFinite),
    parameterIds: query.parameters?.split(',').filter(Boolean),
    subjectIds: query.subjects?.split(',').filter(Boolean),
    view: query.view,
    savedViewId: query.savedView,
  }} />;
}
