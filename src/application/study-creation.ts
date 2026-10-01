import { z } from 'zod';
import { ApplicationError } from './repository-ports';

export const studySlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const studyCreateSchema = z
  .object({
    slug: studySlugSchema.refine(
      (value) =>
        ![
          'dts-improvement',
          'cmp-stability',
          'adhesion-material-optimization',
        ].includes(value),
      'Study ID is unavailable. Choose another ID.',
    ),
    name: z.string().trim().min(1).max(200),
    intent: z.string().trim().max(4000),
    departmentId: z.string().min(1).max(200),
    packageVersionId: z.string().min(1),
    experimentTypeProfileVersionId: z.string().min(1),
    subjectTypeRevisionId: z.string().min(1),
    areaDefinitionRevisionId: z.string().min(1),
  })
  .strict();
export type StudyCreateInput = z.infer<typeof studyCreateSchema>;
export type StudyCreationContext = Pick<
  StudyCreateInput,
  | 'packageVersionId'
  | 'experimentTypeProfileVersionId'
  | 'subjectTypeRevisionId'
  | 'areaDefinitionRevisionId'
> & {
  label: string;
  experimentType: string;
  area: string;
};
export type StudyCreationOptions = {
  departments: string[];
  contexts: StudyCreationContext[];
};
export type StudyIdentity = StudyCreateInput & {
  id: string;
  seriesId: string;
  responsibleUserId: string;
  visibility: 'RESPONSIBLE_DEPARTMENT';
  experimentType: string;
  area: string;
  setupRevision: number;
};
export interface StudyCreationRepository {
  options(): Promise<StudyCreationOptions>;
  create(input: StudyCreateInput, commandId: string): Promise<StudyIdentity>;
  get(slug: string): Promise<StudyIdentity>;
}
/** A transport acknowledgement alone is not success. Always re-read the resource. */
export async function createStudyAndReadBack(
  repository: StudyCreationRepository,
  raw: StudyCreateInput,
  commandId: string,
) {
  const input = studyCreateSchema.parse(raw);
  const created = await repository.create(input, commandId);
  if (!created?.id || created.slug !== input.slug)
    throw new ApplicationError(
      'PERSISTENCE',
      'Study read-back did not match. Retry the same request.',
    );
  const saved = await repository.get(created.slug);
  if (
    saved.id !== created.id ||
    !Object.entries(input).every(
      ([key, value]) => saved[key as keyof StudyCreateInput] === value,
    )
  )
    throw new ApplicationError(
      'PERSISTENCE',
      'Study read-back did not match. Retry the same request.',
    );
  return saved;
}
