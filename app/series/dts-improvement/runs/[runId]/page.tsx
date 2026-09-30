import { notFound } from 'next/navigation';
import { getContext } from '@/src/mock/experiments';
import ExperimentRun from '@/src/features/experiment-run/run';
export default async function Page({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const context = /^[1-4]$/.test(runId) ? getContext(Number(runId)) : undefined;
  if (!context) notFound();
  return <ExperimentRun context={context} />;
}
