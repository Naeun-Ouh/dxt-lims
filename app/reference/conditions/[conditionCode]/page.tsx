import { notFound } from 'next/navigation';
import ConditionDetail from '@/src/features/reference-studio/condition-detail';
import { conditionBySlug } from '@/src/features/reference-studio/model';
export default async function Page({
  params,
}: {
  params: Promise<{ conditionCode: string }>;
}) {
  const { conditionCode } = await params,
    condition = conditionBySlug(conditionCode);
  if (!condition) notFound();
  return <ConditionDetail condition={condition} />;
}
