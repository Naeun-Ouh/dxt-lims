import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/shared/i18n/locale';
import {
  RunEntryView,
  previewUnits,
  type RunEntryViewProps,
} from '../src/features/experiment-series/run-entry-view';
import { CreateStudy } from '../src/features/experiment-series/create-study';
import {
  filterStudies,
  StudyList,
  type StudyListRow,
} from '../src/features/experiment-series/study-list';
import { runPlanningScenarios } from '../src/features/run-registration/planning-model';
const render = (ui: React.ReactNode, locale: 'ko' | 'en' = 'en') =>
  renderToStaticMarkup(
    <LocaleProvider initialLocale={locale} persist={false}>
      {ui}
    </LocaleProvider>,
  );
import { configurationRepository } from '../src/mock/configuration-packages';
const noop = () => {};
const props: RunEntryViewProps = {
  seriesSlug: 'dts-improvement',
  context: runPlanningScenarios.PHOTO,
  source: 'STUDY_DEFAULT',
  preview: null,
  busy: false,
  error: null,
  onSource: noop,
  onReview: noop,
  onBack: noop,
  onCreate: noop,
};
void test('Run source and resolved preview have distinct actions without changing the snapshot', () => {
  const before = JSON.stringify(props.context);
  const source = render(<RunEntryView {...props} />);
  assert.match(source, /Review Inheritance/);
  assert.equal((source.match(/type="radio"/g) || []).length, 4);
  assert.doesNotMatch(source, /Create Run &amp; Open Plan/);
  const preview = render(
    <RunEntryView
      {...props}
      preview={props.context}
      readiness={{ status: 'READY', missing: [] }}
    />,
  );
  assert.match(preview, /Change creation source/);
  assert.doesNotMatch(preview, /type="radio"/);
  assert.match(preview, /Create Run &amp; Open Plan/);
  for (const assignment of props.context.assignments)
    assert.ok(preview.includes(assignment.value));
  assert.equal(JSON.stringify(props.context), before);
});
void test('Readiness and missing Existing Run selection still block creation/review', () => {
  const blocked = render(
    <RunEntryView
      {...props}
      preview={props.context}
      readiness={{ status: 'MISSING', missing: ['Target not defined'] }}
    />,
  );
  assert.match(
    blocked,
    /<button[^>]*disabled=""[^>]*>Create Run &amp; Open Plan/,
  );
  const existing = render(
    <RunEntryView
      {...props}
      source="EXISTING_RUN"
      sourceId=""
      runs={[]}
      onSourceId={noop}
    />,
  );
  assert.match(existing, /<button[^>]*disabled=""[^>]*>Review Inheritance/);
});
void test('Study creation does not pretend a missing authoring boundary exists', () => {
  const html = render(<CreateStudy />);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Create Study/);
  assert.match(html, /This form is not saved/);
  assert.doesNotMatch(html, /DTS Improvement|D035|4\.4/);
});
void test('Study filters only narrow the provided authorized list and never manufacture metadata', () => {
  const studies: StudyListRow[] = [
    {
      id: 's1',
      name: 'DTS Improvement',
      slug: 'dts-improvement',
      area: 'PHOTO',
      latest: null,
    },
    {
      id: 's2',
      name: 'Material',
      slug: 'adhesion-material-optimization',
      area: 'MATERIAL',
      latest: null,
    },
  ];
  assert.deepEqual(
    filterStudies(studies, 'DTS', 'PHOTO').map((row) => row.id),
    ['s1'],
  );
  assert.equal(filterStudies(studies, 'DTS', 'CMP').length, 0);
  assert.match(render(<StudyList studies={studies} />), /No Runs/);
  assert.match(render(<StudyList studies={[]} />), /No accessible studies/);
});
void test('English and Korean use the same preview values and source identifiers', () => {
  for (const locale of ['en', 'ko'] as const) {
    const html = render(<RunEntryView {...props} />, locale);
    for (const id of ['STUDY_DEFAULT', 'PREVIOUS_RUN', 'EXISTING_RUN', 'BLANK'])
      assert.ok(html.includes(`value="${id}"`));
    const preview = render(
      <RunEntryView {...props} preview={props.context} />,
      locale,
    );
    assert.ok(preview.includes(props.context.configurationPackageVersionId));
  }
});

void test('Preview units are presentation metadata from the exact package, with no latest fallback', () => {
  const source = structuredClone(runPlanningScenarios.PHOTO);
  const before = JSON.stringify(source);
  const units = previewUnits(source, configurationRepository);
  const energy = source.assignments.find((item) => item.label === 'Energy');
  assert.ok(energy);
  assert.equal(units[energy.id], 'mJ/cm²');
  assert.deepEqual(
    previewUnits(
      { ...source, configurationPackageVersionId: 'missing-pin' },
      configurationRepository,
    ),
    {},
  );
  assert.equal(JSON.stringify(source), before);
});

import ProductizedSeries, {
  SeriesRunList,
} from '../src/features/experiment-series/productized-series';
import { seriesWorkspaceScenarios } from '../src/mock/series-workspaces';
void test('Study FINAL shell shares navigation and uses repository counts in both locales', () => {
  for (const locale of ['en', 'ko'] as const) {
    const html = render(
      <ProductizedSeries
        seriesSlug="dts-improvement"
        productionSummary={{ runCount: 2, updatedAt: null }}
      />,
      locale,
    );
    assert.match(html, /workspace-study-final/);
    assert.match(html, /study-final-sidebar/);
    for (const view of ['overview', 'setup', 'runs'])
      assert.ok(html.includes(`?view=${view}`));
    assert.match(html, /<dd>2<\/dd>/);
    assert.ok(html.includes('/analysis?study=dts-improvement'));
  }
});
void test('Run list retains exact destinations and lifecycle state; review retains assignment kinds', () => {
  const series = seriesWorkspaceScenarios['dts-improvement'];
  const before = JSON.stringify(series);
  const html = render(<SeriesRunList series={series} />);
  for (const run of series.runs)
    if (run.workspaceHref)
      assert.ok(html.includes(run.workspaceHref.replaceAll('&', '&amp;')));
  assert.equal(JSON.stringify(series), before);
  const preview = render(<RunEntryView {...props} preview={props.context} />);
  assert.match(preview, /<th>Source<\/th>/);
  for (const assignment of props.context.assignments)
    assert.ok(preview.includes(assignment.kind));
  assert.match(preview, /workspace-entry-standard/);
});

import { ProductionHome } from '../src/features/experiment-home/production-home';
import type {
  DashboardProjection,
  RunSummary,
} from '../src/application/discovery';
const emptyHome: DashboardProjection = {
  counts: {
    studies: 0,
    runs: 0,
    activeRuns: 0,
    thisWeek: 0,
    needReview: 0,
    measurements: 0,
    savedAnalyses: 0,
  },
  continueWorking: null,
  recent: [],
  calendar: [],
  calendarTotal: 0,
  groups: [],
  diagnostics: {
    principalId: 'reader',
    projection: 'dashboard.query',
    scope: { kind: 'MY' },
    policyVersion: 'test',
  },
};
void test('Home FINAL empty projection retains navigation and empty calendar structure in both locales', () => {
  for (const locale of ['en', 'ko'] as const) {
    const html = render(
      <ProductionHome dashboard={emptyHome} studies={[]} />,
      locale,
    );
    assert.match(html, /href="\/studies"/);
    assert.match(html, /home-calendar-empty/);
    assert.match(html, /home-final-studies-empty/);
    assert.doesNotMatch(
      html,
      /DTS Improvement|CMP Stability|home-gantt-bar|reservations/,
    );
    assert.match(
      html,
      locale === 'en'
        ? /No accessible Studies/
        : /접근 가능한 스터디가 없습니다/,
    );
  }
});
void test('Home FINAL preserves server counts, exact links and recorded periods rather than design sample data', () => {
  const run: RunSummary = {
    id: 'allowed-run',
    studyId: 'allowed-study',
    studySlug: 'allowed-study',
    studyName: 'Authorized study',
    number: 42,
    name: 'Authorized run',
    createdAt: '2026-09-21T00:00:00Z',
    updatedAt: '2026-09-21T01:00:00Z',
    stage: 'ACTUAL',
    subjects: 4,
    delta: { items: [], unchangedCount: 0 },
    hasDecision: false,
    href: '/series/allowed-study/runs/42/engineering-grid?view=actual',
  };
  const dashboard = {
    ...emptyHome,
    counts: {
      ...emptyHome.counts,
      runs: 17,
      studies: 3,
      activeRuns: 7,
      thisWeek: 2,
    },
    continueWorking: run,
    recent: [run],
    calendar: [run],
    calendarTotal: 6,
  };
  const before = JSON.stringify(dashboard);
  const html = render(
    <ProductionHome
      dashboard={dashboard}
      studies={[
        { series_slug: 'allowed-study', display_name: 'Authorized study' },
      ]}
    />,
  );
  assert.match(html, /17 Runs · 3 Studies/);
  assert.match(html, /<strong>7<\/strong>/);
  assert.match(html, /view=actual/);
  assert.match(html, /5 more authorized Runs this month/);
  assert.doesNotMatch(html, /ETCH|UTIL-1|stalled record|deadline|reservations/);
  assert.equal(JSON.stringify(dashboard), before);
});
