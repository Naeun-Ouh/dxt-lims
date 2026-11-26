import ProductionSampleUsage from '@/src/features/samples/production-usage';
import { notFound } from 'next/navigation';
import RevisionDetail from '@/src/features/sample-revision-detail/detail';
import { revisionView } from '@/src/features/samples/model';
export default async function Page({
  params,
}: {
  params: Promise<{ sampleCode: string; revision: string }>;
}) {
  if (process.env.DXT_REPOSITORY === 'postgres')
    return <ProductionSampleUsage unavailableDetail />;
  const { sampleCode, revision } = await params;
  const n = Number(revision);
  if (!revisionView(sampleCode, n)) notFound();
  return <RevisionDetail code={sampleCode} revision={n} />;
}
