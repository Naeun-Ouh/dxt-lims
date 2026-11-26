import ProductionSampleUsage from '@/src/features/samples/production-usage';
import { notFound } from 'next/navigation';
import SampleDetail from '@/src/features/sample-detail/detail';
import { sampleView } from '@/src/features/samples/model';
export default async function Page({
  params,
}: {
  params: Promise<{ sampleCode: string }>;
}) {
  if (process.env.DXT_REPOSITORY === 'postgres')
    return <ProductionSampleUsage unavailableDetail />;
  const { sampleCode } = await params;
  if (!sampleView(sampleCode)) notFound();
  return <SampleDetail code={sampleCode} />;
}
