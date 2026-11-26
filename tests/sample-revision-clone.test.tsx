import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { cloneSampleRevision } from '@/src/application/sample-revision-clone';
import {
  sampleCommandSchema,
  type SampleDetail,
} from '@/src/application/sample-lifecycle';
import { LocaleProvider } from '@/src/shared/i18n/locale';
import { SampleRevisionForm } from '@/src/features/samples/revision-form';
const source = (): SampleDetail => ({
  sample: {
    id: 'sample-1',
    sampleCode: 'SAMPLE-001',
    name: 'Sample',
    materialId: null,
    supplierId: null,
    description: null,
    status: 'Draft',
    createdAt: '2026-01-01T00:00:00Z',
  },
  owningOrgId: 'org-1',
  revision: {
    id: 'revision-1',
    sampleId: 'sample-1',
    revision: 1,
    requestNumber: null,
    developmentItemNumber: null,
    registrationSource: 'DIRECT_REGISTRATION',
    effectiveAt: '2026-01-01T00:00:00Z',
    status: 'Draft',
    createdAt: '2026-01-01T00:00:00Z',
  },
  composition: {
    nodes: [
      {
        id: 'root',
        nodeType: 'SAMPLE_REVISION',
        referenceId: 'revision-1',
        label: 'Sample',
      },
    ],
    edges: [],
  },
  properties: [
    {
      id: 'p1',
      materialNodeId: 'root',
      propertyDefinitionId: 'property-1',
      value: false,
      valueType: 'BOOLEAN',
      unit: null,
      source: 'DIRECT_ENTRY',
      effectiveAt: null,
      evidenceId: null,
    },
  ],
  latestRevision: 2,
  canRevise: true,
  cloneOrigin: null,
  history: [
    {
      id: 'revision-2',
      revision: 2,
      copiedFromRevisionId: 'revision-1',
      copiedFromRevision: 1,
      changeReason: null,
    },
    {
      id: 'revision-1',
      revision: 1,
      copiedFromRevisionId: null,
      copiedFromRevision: null,
      changeReason: null,
    },
  ],
  usage: [],
});
void test('old revision copies full data independently and allocates latest + 1, retaining false and zero', () => {
  const original = source();
  const baseline = structuredClone(original);
  const next = cloneSampleRevision(
    original,
    'revision-3',
    '2026-01-02T00:00:00Z',
  );
  assert.equal(next.revision.revision, 3);
  assert.equal(next.sample.id, original.sample.id);
  assert.equal(next.composition.nodes[0].referenceId, 'revision-3');
  assert.equal(next.properties[0].value, false);
  next.properties[0].value = true;
  next.composition.nodes[0].label = 'Changed';
  next.sample.name = 'Changed locally';
  assert.deepEqual(original, baseline);
  original.properties[0] = {
    ...original.properties[0],
    valueType: 'NUMBER',
    value: 0,
  };
  assert.equal(
    cloneSampleRevision(original, 'revision-3', '2026-01-02T00:00:00Z')
      .properties[0].value,
    0,
  );
});
void test('clone source and optional change reason are validated without requiring a reason', () => {
  const aggregate = cloneSampleRevision(
    source(),
    'revision-3',
    '2026-01-02T00:00:00Z',
  );
  aggregate.revision.effectiveAt = '2026-01-02T00:00:00Z';
  const command = {
    operation: 'write',
    aggregate,
    expectedLatest: 2,
    commandId: 'cmd-1',
    copiedFromRevisionId: 'revision-1',
  };
  assert.equal(sampleCommandSchema.safeParse(command).success, true);
  assert.equal(
    sampleCommandSchema.safeParse({ ...command, changeReason: '' }).success,
    true,
  );
  assert.equal(
    sampleCommandSchema.safeParse({ ...command, copiedFromRevisionId: '' })
      .success,
    false,
  );
  assert.equal(
    sampleCommandSchema.safeParse({
      ...command,
      changeReason: 'x'.repeat(2001),
    }).success,
    false,
  );
});
void test('KO and EN revision form expose source, next number, original data and optional reason', () => {
  for (const locale of ['ko', 'en'] as const) {
    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale={locale} persist={false}>
        <SampleRevisionForm
          orgs={[]}
          detail={source()}
          onCancel={() => {}}
          onSaved={() => {}}
        />
      </LocaleProvider>,
    );
    assert.match(
      html,
      locale === 'ko' ? /복제 원본 Revision/ : /Clone source revision/,
    );
    assert.match(
      html,
      locale === 'ko'
        ? /변경 사유 \(선택 사항\)/
        : /Change reason \(optional\)/,
    );
    assert.match(html, /R3/);
    assert.match(html, /R1/);
    assert.match(html, /R2/);
    assert.match(html, /sample-1/);
    assert.match(html, /SAMPLE-001/);
    assert.match(html, /false/);
    assert.doesNotMatch(html, /readonly=""/);
  }
});
