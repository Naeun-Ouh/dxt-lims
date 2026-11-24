import {
  DraftFeedbackContext,
  locateDraftFeedback,
  summarizeDraftFeedback,
  conditionFeedbackKey,
} from '@/src/features/experiment-series/run-draft-feedback';
import { RunCreationReview } from '@/src/features/experiment-series/run-creation-review';
import { runPlanningScenarios } from '@/src/features/run-registration/planning-model';
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

void test('Create-first actions need no preview, remain retryable after invalid input, and never render a durable confirm', () => {
  for (const locale of ['ko', 'en'] as const) {
    const actions = (
      missing: string[] = [],
      busy = false,
      reviewing = false,
      available = true,
    ) =>
      renderToStaticMarkup(
        <LocaleProvider initialLocale={locale} persist={false}>
          <RunDraftActions
            busy={busy}
            available={available}
            reviewing={reviewing}
            missing={missing}
            error=""
            onCreate={noWrite}
          />
        </LocaleProvider>,
      );
    const initial = actions();
    assert.match(initial, locale === 'ko' ? /실험 차수 생성/ : /Create Run/);
    assert.doesNotMatch(
      initial,
      /disabled|미리보기|Preview|최종 생성|Final Create/,
    );
    const blocked = actions(['Add and save at least one Subject.']);
    assert.doesNotMatch(blocked, /disabled/);
    assert.match(
      blocked,
      locale === 'ko' ? /실험 대상을 한 개 이상/ : /Add at least one Subject/,
    );
    assert.match(actions([], true), /disabled/);
    assert.match(actions([], false, true), /disabled/);
    assert.match(actions([], false, false, false), /disabled/);
  }
});

void test('authoritative errors locate exact scoped conditions without marking non-applicable Subjects missing', () => {
  const value = draft();
  value.subjects.push({ id: 'S3', displayLabel: 'S3' });
  value.operations[0].items = [
    {
      applicabilityId: 'required',
      value: 'oops',
      intentRole: 'VARIED',
      subjectId: 'S1',
    },
  ];
  const before = JSON.stringify(value);
  const missing = [
    'Check the execution condition: {0}.|1 · required',
    'Enter the required execution condition: {0}.|Test process · required',
  ];
  const feedback = locateDraftFeedback(value, [option], missing);
  assert.equal(
    summarizeDraftFeedback(
      value,
      [option],
      [
        ...missing,
        'Check the execution condition: {0}.|Test process · required',
      ],
    ).length,
    2,
  );
  assert.deepEqual(feedback[conditionFeedbackKey(0, 'required', 'S1')], [
    'Enter a numeric value.',
  ]);
  assert.deepEqual(feedback[conditionFeedbackKey(0, 'required', 'S2')], [
    'Enter a common planned value or a planned value for this Subject.',
  ]);
  assert.equal(feedback[conditionFeedbackKey(0, 'required', 'S3')], undefined);
  assert.equal(feedback[conditionFeedbackKey(0, 'optional', 'S1')], undefined);
  assert.equal(JSON.stringify(value), before);
  const empty = locateDraftFeedback(
    { subjects: [], operations: [] },
    [],
    ['Add and save at least one Subject.', 'Add and save ordered Operations.'],
  );
  assert.ok(empty.subjects.length && empty.operations.length);
  const measurement = structuredClone(option);
  measurement.operation.role = 'MEASUREMENT';
  assert.deepEqual(
    locateDraftFeedback(
      value,
      [measurement],
      ['Complete the Measurement plan for {0}.|Test process'],
    )['measurement-0'],
    ['Complete the Measurement plan for {0}.|Test process'],
  );
});

void test('common invalid values attach to their editable cell and feedback renders next to the input', () => {
  const value = draft();
  value.operations[0].items = [
    {
      applicabilityId: 'required',
      value: 'oops',
      intentRole: 'FIXED',
      subjectId: null,
    },
  ];
  const feedback = locateDraftFeedback(
    value,
    [option],
    ['Check the execution condition: {0}.|Test process · required'],
  );
  assert.deepEqual(Object.keys(feedback), [
    conditionFeedbackKey(0, 'required', null),
  ]);
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="ko" persist={false}>
      <DraftFeedbackContext.Provider value={feedback}>
        <RunDraftEditor
          draft={value}
          options={[option]}
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
          onChange={noWrite}
        />
      </DraftFeedbackContext.Provider>
    </LocaleProvider>,
  );
  assert.match(html, /data-draft-error/);
  assert.match(html, /숫자/);
  assert.match(html, /value="oops"/);
});

void test('creation review preserves snapshot and shows subjects, order, application, conditions and final-only action', () => {
  const snapshot = structuredClone(runPlanningScenarios.PHOTO);
  const preview: AuthoritativeRunPreview = {
    snapshot,
    fingerprint: 'test',
    readiness: { status: 'READY', missing: [] },
  };
  const before = JSON.stringify(preview);
  for (const locale of ['ko', 'en'] as const) {
    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale={locale} persist={false}>
        <RunCreationReview
          preview={preview}
          busy={false}
          onCancel={noWrite}
          onConfirm={noWrite}
        />
      </LocaleProvider>,
    );
    assert.match(
      html,
      locale === 'ko' ? /실험 차수 생성 확인/ : /Confirm Run creation/,
    );
    assert.match(html, locale === 'ko' ? /최종 생성/ : /Final Create/);
    assert.match(
      html,
      locale === 'ko'
        ? /아직 저장되지 않았습니다/
        : /Nothing has been saved yet/,
    );
    assert.match(html, locale === 'ko' ? /미적용/ : /Not applicable/);
    for (const subject of snapshot.subjects)
      assert.ok(html.includes(subject.id));
    for (const step of snapshot.steps) assert.ok(html.includes(step.label));
  }
  assert.equal(JSON.stringify(preview), before);
});
