import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/src/shared/i18n/locale';
import { RunDraftConditionsGrid } from '@/src/features/experiment-series/run-draft-conditions-grid';
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
      <RunDraftConditionsGrid
        draft={value}
        options={[option]}
        change={noWrite}
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
  assert.match(
    render(value),
    /Required value missing for some participating Subjects/,
  );
  value.operations[0].subjectIds = [];
  value.operations[0].items = [];
  assert.match(render(value), /Not Participating/);
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
