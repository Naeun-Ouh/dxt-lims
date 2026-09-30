import { notFound } from 'next/navigation';
import Detail from '@/src/features/reference-studio/measurement-operation-detail';
import { measurementOperationBySlug } from '@/src/features/reference-studio/model';
export default async function Page({
  params,
}: {
  params: Promise<{ operationCode: string }>;
}) {
  const { operationCode } = await params,
    operation = measurementOperationBySlug(operationCode);
  if (!operation) notFound();
  return <Detail operation={operation} />;
}
