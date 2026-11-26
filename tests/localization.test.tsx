import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider, LocaleSwitch } from '../src/shared/i18n/locale';
import { defaultLocale, translate, translateMessage } from '../src/shared/i18n/messages';
import ko from '../src/shared/i18n/ko.json';
import { DxtApplicationProvider } from '../src/application/dxt-application-provider';
import EngineeringGridView from '../src/features/run-registration/engineering-grid';
import { runPlanningScenarios } from '../src/features/run-registration/planning-model';
import { createExperimentWorkspace } from '../src/features/run-registration/workspace-model';
import { configurationRepository } from '../src/mock/configuration-packages';

const slots = (value: string) => [...value.matchAll(/\{\d+\}/g)].map(item => item[0]).sort();
void test('Korean is default and each translation preserves interpolation slots', () => {
  assert.equal(defaultLocale, 'ko');
  for (const [key, value] of Object.entries(ko)) assert.deepEqual(slots(value), slots(key), key);
  assert.match(renderToStaticMarkup(<LocaleSwitch />), /lang="ko" aria-pressed="true"/);
});
void test('canonical terminology and scientific interpolation remain separate', () => {
  assert.equal(translate('ko', 'Intentionally Varied'), '실험 변수');
  assert.equal(translate('ko', 'Save Plan'), '계획 저장');
  assert.equal(translate('en', 'Save Plan'), 'Save Plan');
  for (const value of ['W01', 'PHO7814.01', 'EXP-03', '37.5 mJ/cm²', 'condition-energy-v1']) {
    assert.equal(translateMessage('ko', value), value);
    assert.equal(translate('ko', '{0} default', [value]), `${value} 기본값`);
  }
  assert.equal(translateMessage('ko', 'Energy default saved for future Runs.'), '향후 실험 차수를 위한 Energy 기본값을 저장했습니다.');
  assert.equal(translateMessage('ko', 'Energy requires a numeric value'), 'Energy: 숫자 값을 입력하세요');
  assert.equal(translateMessage('ko', 'Unregistered server diagnostic'), 'Unregistered server diagnostic');
});
void test('English and Korean Plan preserve identical control values, grid identity and scientific snapshot', () => {
  const snapshot = structuredClone(runPlanningScenarios.PHOTO);
  const before = JSON.stringify(snapshot);
  const model = createExperimentWorkspace(snapshot, configurationRepository);
  const render = (locale: 'ko' | 'en') => renderToStaticMarkup(<LocaleProvider initialLocale={locale} persist={false}><DxtApplicationProvider><EngineeringGridView model={model} seriesSlug="dts-improvement" returnHref="/series/dts-improvement" /></DxtApplicationProvider></LocaleProvider>);
  const korean = render('ko'), english = render('en');
  const values = (html: string) => [...html.matchAll(/\bvalue="([^"]*)"/g)].map(item => item[1]);
  assert.deepEqual(values(korean), values(english));
  const cells = (html: string) => [...html.matchAll(/data-cell="([^"]*)"/g)].map(item => item[1]);
  assert.deepEqual(cells(korean), cells(english));
  for (const html of [korean, english]) for (const text of ['EXP-03','W01','mJ/cm²','Energy','Focus']) assert.ok(html.includes(text), text);
  assert.match(korean, /계획 엔지니어링 그리드/);
  assert.match(english, /PLAN engineering grid/);
  assert.equal(JSON.stringify(snapshot), before);
});
void test('translated option labels always retain explicit untranslated values', () => {
  const files = ['src/features/analysis/workspace.tsx','src/features/experiment-series/production-run-entry.tsx','src/features/run-registration/evaluation-execution-grid.tsx','src/features/run-registration/engineering-grid.tsx','src/features/run-registration/actual-execution-grid.tsx','src/features/run-registration/measurement-execution-grid.tsx','src/features/experiment-series/study-setup-workspace.tsx'];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:value|defaultValue|checked|key|id|href)=\{t\(/, `${file}: locale cannot change control values or identity`);
    for (const option of source.matchAll(/<option(?=\s|>)([^>]*?)>\s*\{t\(/g)) assert.match(option[1], /\bvalue=/, `${file}: translated options must not use display text as their value`);
  }
});

void test('Sample validation identifies visible fields without exposing technical paths', async () => {
  const { sampleValidationLabel } = await import('../src/shared/i18n/sample-messages');
  assert.equal(sampleValidationLabel('ko', 'aggregate.revision.effectiveAt'), '적용일');
  assert.equal(sampleValidationLabel('en', 'aggregate.revision.effectiveAt'), 'Effective date');
  assert.equal(sampleValidationLabel('ko', 'aggregate.composition.nodes.1.referenceId'), '조성 노드 2 · 정확한 참조');
  assert.equal(sampleValidationLabel('en', 'aggregate.properties.0.value'), 'Properties 1 · Value');
  for (const locale of ['ko', 'en'] as const) {
    assert.doesNotMatch(sampleValidationLabel(locale, 'internal.database.secret'), /internal|database|secret/);
  }
});

void test('persisted Run Evaluation entry is reachable before criteria and evidence load in KO/EN', async () => {
  const { createBrowserApplication } = await import('../src/application/dxt-application-provider');
  const { DxtApplication } = await import('../src/application/dxt-application');
  const { httpConfigurationAuthoring } = await import('../src/infrastructure/http/http-repositories');
  const base = createBrowserApplication();
  const application = new DxtApplication(base.application.repositories, [], [], {}, httpConfigurationAuthoring);
  const model = createExperimentWorkspace(structuredClone(runPlanningScenarios.PHOTO), configurationRepository);
  for (const locale of ['ko', 'en'] as const) {
    const html = renderToStaticMarkup(<LocaleProvider initialLocale={locale} persist={false}>
      <DxtApplicationProvider value={{...base, application}}><EngineeringGridView model={model} seriesSlug="test" returnHref="/studies" /></DxtApplicationProvider>
    </LocaleProvider>);
    const label = locale === 'ko' ? '평가' : 'Evaluation';
    const button = [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].find((match) => match[2] === label);
    assert.ok(button, label);
    assert.doesNotMatch(button[1], /disabled/, 'criteria authoring must be accessible without pre-existing criteria');
  }
});
