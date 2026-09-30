import ReferenceStudioHome from '@/src/features/reference-studio/home';
import type { StudioSection } from '@/src/features/reference-studio/authoring-model';

export default async function ReferenceStudioPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const value = (key: string) =>
    typeof params[key] === 'string' ? params[key] : undefined;
  const state = value('state')?.split(',') ?? [];
  const requested = state[0] || value('section');
  const initialSection: StudioSection =
    requested === 'applicability' || requested === 'packages'
      ? requested
      : 'definitions';
  return (
    <ReferenceStudioHome
      initialSection={initialSection}
      initialReview={value('review') === '1'}
      initialDefinition={state[1] || value('definition')}
      initialPackage={value('package') || state[1]}
      initialPreview={state[2] === 'preview' || value('preview') === '1'}
      initialValidation={
        state[2] === 'validation' || value('validation') === '1'
      }
      initialDefinitionInspector={
        state[2] === 'inspector' || value('inspector') === '1'
      }
    />
  );
}
