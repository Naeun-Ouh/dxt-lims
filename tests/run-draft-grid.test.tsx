import { RunDraftActions } from '@/src/features/experiment-series/run-draft-actions';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/src/shared/i18n/locale';
import { RunDraftEditor } from '@/src/features/experiment-series/run-draft-editor';
import { removeDraftSubject } from '@/src/features/experiment-series/run-draft-subjects';
import { RunDraftMeasurementGrid } from '@/src/features/experiment-series/run-draft-measurement-grid';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { referenceCatalogSchema } from '@/src/domain/reference';

const option: BootstrapOperationOption = {
  id: 'op',
  parameterIds: [],
  conditionRequirements: { required: true, optional: false },
  operation: {
    id: 'op',
    label: 'Test process',
    operationDefinitionRevisionId: 'op-r1',
    role: 'PROCESS',
    measurementPoint: null,
    measurements: [],
    items: ['required', 'optional'].map((id) => ({
      id,
      operationId: 'op',
      definitionRevisionId: id,
      label: id,
      kind: 'CONDITION',
      referenceId: id,
      value: '',
      intentRole: 'FIXED',
      editor: 'NUMBER',
      unit: '°C',
      grain: 'SUBJECT',
      options: [],
      applicabilityId: id,
    })),
  },
};
const draft = (): RunDraft => ({
  subjects: [
    { id: 'S1', displayLabel: 'S1' },
    { id: 'S2', displayLabel: 'S2' },
  ],
  operations: [
    {
      optionId: 'op',
      subjectIds: ['S1', 'S2'],
      point: null,
      parameterIds: [],
      items: [],
    },
  ],
});
const noWrite = () => {
  throw new Error('Rendering must not author scientific data');
};
const render = (value: RunDraft, locale: 'en' | 'ko' = 'en') =>
  renderToStaticMarkup(
    <LocaleProvider initialLocale={locale} persist={false}>
      <RunDraftEditor
        draft={value}
        options={[option]}
        onChange={noWrite}
        catalog={referenceCatalogSchema.parse({
          units: [],
          conditions: [],
          properties: [],
          measurements: [],
          evaluations: [],
          evaluationCriteria: [],
          components: [],
          materialCategories: [],
          experimentTypes: [],
          areas: [],
          operations: [],
          measurementOperations: [],
          parameters: [],
        })}
      />
    </LocaleProvider>,
  );
void test('required/optional metadata shows missing participation coverage without fabricating values', () => {
  const value = draft(),
    before = JSON.stringify(value),
    html = render(value);
  assert.match(html, /Required/);
  assert.match(html, /Optional/);
  assert.match(html, /Missing/);
  assert.match(html, /Not entered/);
  assert.equal(JSON.stringify(value), before);
  value.operations[0].items = [
    {
      applicabilityId: 'required',
      value: '25',
      intentRole: 'VARIED',
      subjectId: 'S1',
    },
  ];
  assert.match(render(value), /Missing/);
  value.operations[0].subjectIds = [];
  value.operations[0].items = [];
  assert.match(render(value), /Not applicable/);
  assert.doesNotMatch(render(value), />Missing</);
});
void test('KO/EN format feedback preserves literal values, units and persisted role', () => {
  const value = draft();
  value.operations[0].items = [
    {
      applicabilityId: 'required',
      value: 'bad-value',
      intentRole: 'VARIED',
      subjectId: null,
    },
  ];
  for (const locale of ['en', 'ko'] as const) {
    const html = render(value, locale);
    assert.match(html, /bad-value/);
    assert.match(html, /°C/);
    assert.match(html, /value="VARIED" selected/);
    assert.match(html, /aria-invalid="true"/);
  }
  assert.match(render(value, 'ko'), /실험 변수/);
  assert.match(render(value, 'ko'), /고정 조건/);
});
void test('Measurement grid exposes supporting prerequisites and never adds them automatically', () => {
  const catalog = referenceCatalogSchema.parse({
    units: [],
    conditions: [],
    properties: [],
    measurements: [],
    evaluations: [],
    evaluationCriteria: [],
    components: [],
    materialCategories: [],
    experimentTypes: [],
    areas: [],
    operations: [],
    measurementOperations: [],
    parameters: [],
  });
  catalog.parameters = [
    {
      code: 'p',
      version: 1,
      scope: { kind: 'GLOBAL' },
      displayOrder: 1,
      active: true,
      id: 'p',
      name: 'Observed',
      measurementOperationDefinitionId: 'm',
      description: '',
      semanticRole: 'MEASUREMENT',
      dataType: 'NUMBER',
      unitId: null,
      requiredSupportingParameterIds: ['s'],
      supportedMeasurementPoints: ['FINAL'],
    },
    {
      code: 's',
      version: 1,
      scope: { kind: 'GLOBAL' },
      displayOrder: 2,
      active: true,
      id: 's',
      name: 'Support',
      measurementOperationDefinitionId: 'm',
      description: '',
      semanticRole: 'SUPPORTING',
      dataType: 'NUMBER',
      unitId: null,
      requiredSupportingParameterIds: [],
      supportedMeasurementPoints: ['FINAL'],
    },
  ];
  const value = draft();
  value.operations[0] = {
    optionId: 'op',
    subjectIds: ['S1'],
    point: 'FINAL',
    parameterIds: ['p'],
    items: [],
  };
  const measurement = {
    ...option,
    parameterIds: ['p', 's'],
    operation: { ...option.operation, role: 'MEASUREMENT' as const, items: [] },
  };
  const before = JSON.stringify(value);
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <RunDraftMeasurementGrid
        draft={value}
        options={[measurement]}
        catalog={catalog}
        change={noWrite}
      />
    </LocaleProvider>,
  );
  assert.match(html, /Select supporting parameters/);
  assert.match(html, /Support/);
  assert.match(html, /FINAL/);
  assert.equal(JSON.stringify(value), before);
  const processOnly = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <RunDraftMeasurementGrid
        draft={draft()}
        options={[option]}
        catalog={catalog}
        change={noWrite}
      />
    </LocaleProvider>,
  );
  assert.equal(processOnly, '');
});

void test('Subject removal prunes only its participation and scoped conditions', () => {
  const value = draft();
  value.operations[0].items = [
    {
      applicabilityId: 'required',
      value: '25',
      intentRole: 'VARIED',
      subjectId: null,
    },
    {
      applicabilityId: 'required',
      value: '30',
      intentRole: 'FIXED',
      subjectId: 'S1',
    },
    {
      applicabilityId: 'required',
      value: '35',
      intentRole: 'VARIED',
      subjectId: 'S2',
    },
  ];
  const before = structuredClone(value);
  const next = removeDraftSubject(value, 'S1');
  assert.deepEqual(value, before);
  assert.deepEqual(
    next.subjects.map((s) => s.id),
    ['S2'],
  );
  assert.deepEqual(next.operations[0].subjectIds, ['S2']);
  assert.deepEqual(next.operations[0].items, [
    before.operations[0].items[0],
    before.operations[0].items[2],
  ]);
});
void test('Unified matrix renders objects and scoped assignments without changing scope or value order', () => {
  const value = draft();
  value.operations[0].items = [
    {
      applicabilityId: 'required',
      value: '30',
      intentRole: 'VARIED',
      subjectId: 'S1',
    },
    {
      applicabilityId: 'required',
      value: '25',
      intentRole: 'FIXED',
      subjectId: null,
    },
  ];
  value.operations[0].subjectIds = ['S1'];
  const before = JSON.stringify(value);
  const html = render(value);
  assert.doesNotMatch(html, /textarea/);
  assert.match(html, /Add Subject/);
  assert.match(html, /Process Flow &amp; Conditions/);
  assert.match(html, /Common planned value/);
  assert.match(
    html,
    /Subject-specific and common planned values are both configured/,
  );
  assert.match(html, /Not applicable/);
  assert.match(html, /value="30"/);
  assert.match(html, /value="25"/);
  const korean = render(value, 'ko');
  for (const label of [
    '공정 적용',
    '미적용',
    '공통 계획값',
    '대상별 계획값',
    '미적용은 결과 누락이 아니라',
  ])
    assert.ok(korean.includes(label));
  assert.doesNotMatch(korean, /미참여|참여 여부|개별값|공통값|기록되어/);
  assert.equal(JSON.stringify(value), before);
});

void test('Run Draft keeps Create visible but requires a successful READY preview in both locales', () => {
  for (const locale of ['ko', 'en'] as const) {
    const renderActions = (
      readiness?: AuthoritativeRunPreview['readiness'],
      busy = false,
      canPreview = true,
    ) =>
      renderToStaticMarkup(
        <LocaleProvider initialLocale={locale} persist={false}>
          <RunDraftActions
            busy={busy}
            canPreview={canPreview}
            readiness={readiness}
            onPreview={noWrite}
            onCreate={noWrite}
          />
        </LocaleProvider>,
      );
    const primary = (html: string) =>
      html.match(/<button[^>]*class="entry-button primary"[^>]*>/)?.[0] ?? '';
    const initial = renderActions();
    assert.match(
      initial,
      locale === 'ko' ? /실험 차수 미리보기/ : /Run Preview/,
    );
    assert.match(initial, locale === 'ko' ? /실험 차수 생성/ : /Create Run/);
    assert.match(
      initial,
      locale === 'ko'
        ? /미리보기를 먼저 확인해 주세요./
        : /Please review the preview first/,
    );
    assert.match(primary(initial), /disabled/);
    assert.match(primary(initial), /aria-describedby/);
    const blocked = renderActions({
      status: 'NOT_READY',
      missing: ['Missing'],
    });
    assert.match(primary(blocked), /disabled/);
    assert.match(blocked, locale === 'ko' ? /누락/ : /Missing/);
    const ready = { status: 'READY', missing: [] } as const;
    assert.doesNotMatch(
      primary(renderActions({ ...ready, missing: [] })),
      /disabled|aria-describedby/,
    );
    assert.match(
      primary(renderActions({ ...ready, missing: [] }, true)),
      /disabled/,
    );
    assert.match(primary(renderActions(undefined, false, false)), /disabled/);
    // Editing/source changes clear the parent's preview; Create must lock again.
    assert.match(primary(renderActions(undefined)), /disabled/);
  }
});
