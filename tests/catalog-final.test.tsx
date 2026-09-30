import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/shared/i18n/locale';
import {
  DxtApplicationProvider,
  createBrowserApplication,
} from '../src/application/dxt-application-provider';
import SampleExplorer from '../src/features/sample-explorer/explorer';
import SampleDetail from '../src/features/sample-detail/detail';
import SampleRevisionDetail from '../src/features/sample-revision-detail/detail';
import ReferenceStudioHome from '../src/features/reference-studio/home';
import { catalog } from '../src/features/samples/model';
const render = (ui: React.ReactNode, locale: 'en' | 'ko' = 'en') =>
  renderToStaticMarkup(
    <LocaleProvider initialLocale={locale} persist={false}>
      {ui}
    </LocaleProvider>,
  );
void test('Sample catalog and detail localize labels without changing material identifiers or values', () => {
  const before = JSON.stringify(catalog);
  for (const locale of ['en', 'ko'] as const) {
    const html = render(<SampleExplorer />, locale);
    assert.match(html, /D031/);
    assert.match(html, /D035/);
    assert.match(html, /Photo Sample A/);
    assert.match(html, /catalog-table/);
    assert.doesNotMatch(html, /MAT-001|TEOS/);
    const detail = render(<SampleDetail code="D031" />, locale);
    assert.match(detail, /sample-revision-summary/);
    assert.match(detail, /11\.9/);
    assert.match(detail, /cP/);
    assert.match(detail, /\/samples\/D031\/revisions\/3/);
    assert.match(detail, locale === 'ko' ? /주요 속성/ : /Key Attributes/);
  }
  assert.equal(JSON.stringify(catalog), before);
});
void test('Studio views and package review are read-only on render and use repository exact versions', () => {
  const value = createBrowserApplication();
  const before = JSON.stringify(
    value.application.repositories.configuration.getConfigurationRegistry(),
  );
  let calls = 0;
  value.configurationCommands = new Proxy(value.configurationCommands, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function'
        ? () => {
            calls++;
            throw new Error('Unexpected command on render');
          }
        : v;
    },
  });
  for (const locale of ['en', 'ko'] as const) {
    for (const section of [
      'definitions',
      'applicability',
      'packages',
    ] as const) {
      const html = render(
        <DxtApplicationProvider value={value}>
          <ReferenceStudioHome
            initialSection={section}
            initialDefinitionInspector
          />
        </DxtApplicationProvider>,
        locale,
      );
      assert.match(html, /workspace-catalog-final/);
      assert.match(html, /rs-table/);
      assert.match(html, /dxt-inspector-drawer/);
    }
    const review = render(
      <DxtApplicationProvider value={value}>
        <ReferenceStudioHome initialSection="packages" initialReview />
      </DxtApplicationProvider>,
      locale,
    );
    assert.match(
      review,
      locale === 'ko' ? /포함된 정의/ : /Included Definitions/,
    );
    assert.match(review, /config-package-photo-v2/);
    assert.match(review, /disabled=""/);
    assert.doesNotMatch(review, /Activation approval pending/);
  }
  assert.equal(calls, 0);
  assert.equal(
    JSON.stringify(
      value.application.repositories.configuration.getConfigurationRegistry(),
    ),
    before,
  );
});

void test('Sample revision screens preserve exact revision data, nested composition and usage isolation in both locales', () => {
  const before = JSON.stringify(catalog);
  for (const locale of ['en', 'ko'] as const) {
    const current = render(
      <SampleRevisionDetail code="D031" revision={3} />,
      locale,
    );
    assert.match(current, /sample-revision-final/);
    assert.match(current, /11\.9 cP/);
    assert.match(current, /\+0\.1 cP/);
    assert.match(current, /-1 nm/);
    assert.match(current, /99\.5 %/);
    assert.match(current, /sample-D031-r3/);
    assert.match(current, /href="\/samples\/D031\/revisions\/2"/);
    assert.match(current, /href="\/series\/dts-improvement\/runs\/1"/);
    assert.doesNotMatch(current, /99\.95|J\. Kim|COA-2026|a4f2e8c1|QC|PASS/);
    assert.match(
      current,
      locale === 'ko' ? /리비전 변경 사항/ : /Revision Changes/,
    );
    assert.match(current, /disabled=""/); // No revision authoring command exists.
    const empty = render(
      <SampleRevisionDetail code="D031" revision={2} />,
      locale,
    );
    assert.match(
      empty,
      locale === 'ko'
        ? /아직 이 리비전을 사용한 실험이 없습니다/
        : /This revision has not been used/,
    );
    assert.doesNotMatch(empty, /href="\/series\/dts-improvement\/runs/);
    const baseline = render(
      <SampleRevisionDetail code="D031" revision={1} />,
      locale,
    );
    assert.match(
      baseline,
      locale === 'ko' ? /기준 리비전/ : /Baseline revision/,
    );
    const nested = render(
      <SampleRevisionDetail code="D035" revision={2} />,
      locale,
    );
    assert.match(nested, /Intermediate Blend A/);
    assert.match(nested, /61%/);
    assert.match(nested, /39%/);
    assert.match(nested, /Raw Material A1 ratio/);
  }
  assert.equal(JSON.stringify(catalog), before);
});
void test('Draft revision presentation uses actual status and empty usage without inventing activation or QC evidence', () => {
  const index = catalog.sampleRevisions.findIndex(
    (r) => r.id === 'sample-D031-r2',
  );
  const original = catalog.sampleRevisions[index];
  try {
    catalog.sampleRevisions[index] = { ...original, status: 'Draft' };
    for (const locale of ['en', 'ko'] as const) {
      const html = render(
        <SampleRevisionDetail code="D031" revision={2} />,
        locale,
      );
      assert.match(html, /status-draft/);
      assert.match(html, locale === 'ko' ? /초안/ : /Draft/);
      assert.match(html, /revision-empty/);
      assert.doesNotMatch(html, /PENDING|QC|PASS/);
    }
  } finally {
    catalog.sampleRevisions[index] = original;
  }
});
