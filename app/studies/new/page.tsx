import { CreateStudy } from '@/src/features/experiment-series/create-study';
import { productionRequest } from '@/src/infrastructure/postgres/server-composition';
import type { StudyCreationOptions } from '@/src/application/study-creation';
export const dynamic = 'force-dynamic';
export default async function Page() {
  let options: StudyCreationOptions | undefined;
  let loadError = '';
  try {
    options = (await productionRequest({
      operation: 'study.creation.options',
    })) as StudyCreationOptions;
  } catch {
    loadError =
      'Study creation is unavailable. Check identity and repository access.';
  }
  return <CreateStudy options={options} loadError={loadError} />;
}
