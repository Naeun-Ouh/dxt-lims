import { notFound } from 'next/navigation';
import AreaDetail from '@/src/features/reference-studio/area-detail';
import {
  areaByCode,
  experimentTypeBySlug,
} from '@/src/features/reference-studio/model';
export default async function Page({
  params,
}: {
  params: Promise<{ typeCode: string; areaCode: string }>;
}) {
  const { typeCode, areaCode } = await params,
    type = experimentTypeBySlug(typeCode),
    area = areaByCode(areaCode);
  if (!type || !area || area.experimentTypeDefinitionId !== type.id) notFound();
  return <AreaDetail type={type} area={area} />;
}
