import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createStudyAndReadBack,
  type StudyCreationRepository,
  type StudyIdentity,
} from '@/src/application/study-creation';
import { CreateStudy } from '@/src/features/experiment-series/create-study';
import { PersistedStudy } from '@/src/features/experiment-series/persisted-study';
import { LocaleProvider } from '@/src/shared/i18n/locale';
const input = {
  slug: 'test-study',
  name: '연구 objective',
  intent: 'Entered by researcher',
  departmentId: 'dept',
  packageVersionId: 'package-exact-v1',
  experimentTypeProfileVersionId: 'profile-v1',
  subjectTypeRevisionId: 'subject-specimen-r1',
  areaDefinitionRevisionId: 'area-v1',
};
const saved: StudyIdentity = {
  ...input,
  id: 'persisted-id',
  seriesId: 'study-persisted-id',
  responsibleUserId: 'trusted-id',
  visibility: 'RESPONSIBLE_DEPARTMENT',
  experimentType: 'MATERIAL',
  area: 'RND',
  setupRevision: 1,
};
const options = {
  departments: ['dept'],
  contexts: [
    {
      ...input,
      label: 'Exact package',
      experimentType: 'MATERIAL',
      area: 'RND',
    },
  ],
};
void test('Study creation only succeeds after a matching authoritative identity read', async () => {
  const calls: string[] = [];
  const repo: StudyCreationRepository = {
    options: async () => options,
    create: async () => {
      calls.push('create');
      return saved;
    },
    get: async () => {
      calls.push('read');
      return saved;
    },
  };
  assert.deepEqual(await createStudyAndReadBack(repo, input, 'command'), saved);
  assert.deepEqual(calls, ['create', 'read']);
  for (const get of [
    async () => ({ ...saved, packageVersionId: 'wrong' }),
    async () => {
      throw new Error('read failed');
    },
  ])
    await assert.rejects(
      createStudyAndReadBack({ ...repo, get }, input, 'command'),
    );
  await assert.rejects(
    createStudyAndReadBack(
      {
        ...repo,
        create: async () => {
          throw new Error('Forbidden');
        },
      },
      input,
      'command',
    ),
    /Forbidden/,
  );
  await assert.rejects(
    createStudyAndReadBack(
      { ...repo, create: async () => undefined as unknown as StudyIdentity },
      input,
      'command',
    ),
    /read-back/,
  );
});
void test('Study creation and persisted identity use KO/EN labels without invented ownership or scientific defaults', () => {
  for (const locale of ['ko', 'en'] as const) {
    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale={locale} persist={false}>
        <CreateStudy options={options} />
        <PersistedStudy study={saved} />
      </LocaleProvider>,
    );
    assert.match(html, /test-study/);
    assert.match(html, /trusted-id/);
    assert.match(html, /package-exact-v1/);
    assert.match(html, locale === 'ko' ? /스터디 생성/ : /Create Study/);
    assert.doesNotMatch(html, /Lee Seunghyun|DTS Improvement|W01|F-BASE-01/);
    const denied = renderToStaticMarkup(
      <LocaleProvider initialLocale={locale} persist={false}>
        <CreateStudy />
      </LocaleProvider>,
    );
    assert.match(denied, /disabled=""/);
    assert.match(
      denied,
      locale === 'ko'
        ? /명시적인 부서별 생성 권한/
        : /explicit department grant/,
    );
  }
});
