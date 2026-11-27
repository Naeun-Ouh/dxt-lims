import { operationGroupTitle, operationGroupLabel, operationGroupDescription } from '@/src/features/run-registration/operation-group-display';
import { duplicateGroupBindings } from '@/src/features/run-registration/group-binding-edit';
import {RunDraftSubjects} from '@/src/features/experiment-series/run-draft-subjects';
import {allocationDescription,allocationUi} from '@/src/shared/i18n/allocation-messages';
import {participation25} from './fixtures/participation-25';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/src/shared/i18n/locale';
import { OperationGroupEditor } from '@/src/features/run-registration/operation-group-editor';
import { RunDraftGroupGrid } from '@/src/features/experiment-series/run-draft-group-grid';
import { RunDraftWarnings } from '@/src/features/experiment-series/run-draft-warnings';
import {
  prepareGroupDraft,
  replaceDraftScope,
  effectiveDraftItem,
  updateDraftDesign,
  duplicateDraftGroupConditions,
} from '@/src/features/experiment-series/run-draft-group-edit';
import {
  addOperationGroup,
  commonOperationDesign,
  removeOperationGroup,
} from '@/src/features/run-registration/operation-design';
import { referenceCatalogSchema } from '@/src/domain/reference';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
const make = (): RunDraft => ({
  subjects: [
    { id: 'W01', displayLabel: 'W01' },
    { id: 'W02', displayLabel: 'W02' },
  ],
  operations: [
    {
      optionId: 'o',
      subjectIds: ['W01'],
      point: null,
      parameterIds: [],
      items: [],
    },
  ],
});
const noWrite = () => {
  throw Error('Rendering must not write');
};
const option: BootstrapOperationOption = {
  id: 'o',
  parameterIds: [],
  operation: {
    id: 'o',
    label: 'Cure',
    operationDefinitionRevisionId: 'o-r1',
    role: 'PROCESS',
    measurementPoint: null,
    measurements: [],
    items: [],
  },
};
const render = (children: React.ReactNode, locale: 'en' | 'ko' = 'en') =>
  renderToStaticMarkup(
    <LocaleProvider initialLocale={locale} persist={false}>
      {children}
    </LocaleProvider>,
  );
void test('upgrade preserves legacy excluded interpretation and stable operation identities', () => {
  const old = make();
  const upgraded = prepareGroupDraft(old, () => 'stable');
  assert.equal(upgraded.operations[0].design, undefined);
  assert.deepEqual(upgraded.operations[0].subjectIds, ['W01']);
  assert.equal(upgraded.operations[0].instanceId, 'stable');
  assert.equal(old.planningContract, undefined);
  assert.equal(
    prepareGroupDraft(upgraded, () => {
      throw Error('Must retain identity');
    }).operations[0].instanceId,
    'stable',
  );
});
void test('subject > group > common inherits empty values and preserves 0, invalid, false and role', () => {
  const common = {
    applicabilityId: 'temp',
    value: '25',
    intentRole: 'FIXED' as const,
    subjectId: null,
  };
  const group = {
    ...common,
    value: '30',
    intentRole: 'VARIED' as const,
    groupId: 'g',
  };
  const specific = { ...common, value: '0', subjectId: 'W01' };
  const design = {
    ...addOperationGroup(commonOperationDesign(['W01']), {
      id: 'g',
      kind: 'SPLIT' as const,
      name: 'Split 1',
    }),
    allocations: { W01: { state: 'ASSIGNED' as const, groupId: 'g' } },
  };
  const items = [group, specific, common];
  assert.equal(
    effectiveDraftItem(items, 'temp', { subjectId: 'W01' }, design)?.value,
    '0',
  );
  const cleared = replaceDraftScope(items, { subjectId: 'W01' }, [
    { ...specific, value: '' },
  ]);
  assert.equal(
    effectiveDraftItem(cleared, 'temp', { subjectId: 'W01' }, design)?.value,
    '30',
  );
  assert.equal(
    effectiveDraftItem(cleared, 'temp', { subjectId: 'W01' }, design)
      ?.intentRole,
    'VARIED',
  );
  for (const value of ['false', 'invalid-number'])
    assert.equal(
      effectiveDraftItem(
        replaceDraftScope(items, { subjectId: 'W01' }, [
          { ...specific, value },
        ]),
        'temp',
        { subjectId: 'W01' },
        design,
      )?.value,
      value,
    );
  assert.equal(
    effectiveDraftItem(
      [common, group, specific],
      'temp',
      { subjectId: 'W01' },
      design,
    )?.value,
    '0',
  );
});
void test('explicit grouping and removal never turn unassigned into Skip; overrides survive', () => {
  const draft = make(),
    op = draft.operations[0];
  const design = addOperationGroup(commonOperationDesign(['W01', 'W02']), {
    id: 'base',
    kind: 'BASE',
    name: 'Base',
  });
  assert.equal(design.allocations.W01.state, 'UNASSIGNED');
  design.allocations.W01 = { state: 'ASSIGNED', groupId: 'base' };
  op.items = [
    {
      applicabilityId: 'x',
      subjectId: 'W01',
      value: '7',
      intentRole: 'VARIED',
    },
    {
      applicabilityId: 'x',
      subjectId: null,
      groupId: 'base',
      value: '4',
      intentRole: 'FIXED',
    },
  ];
  const removed = updateDraftDesign(op, removeOperationGroup(design, 'base'), [
    'base',
  ]);
  assert.equal(removed.design.allocations.W01.state, 'UNASSIGNED');
  assert.deepEqual(removed.subjectIds, []);
  assert.deepEqual(removed.items, [op.items[0]]);
  assert.throws(() =>
    addOperationGroup(design, {
      id: 'another',
      kind: 'BASE',
      name: 'Second Base',
    }),
  );
});
void test('group duplication copies conditions without sharing identity or changing original', () => {
  const item = {
    applicabilityId: 'x',
    subjectId: null,
    groupId: 'a',
    value: '0',
    intentRole: 'VARIED' as const,
  };
  const copied = duplicateDraftGroupConditions([item], 'a', 'b');
  assert.equal(copied.length, 2);
  assert.equal(copied[1].groupId, 'b');
  assert.equal(copied[1].value, '0');
  assert.equal(item.groupId, 'a');
});
void test('rendering legacy groups is read-only until explicit conversion and KO/EN distinguish states', () => {
  const ui = (
    <OperationGroupEditor
      subjects={make().subjects}
      appliedSubjectIds={['W01']}
      onChange={noWrite}
      onDuplicate={noWrite}
      renderConditions={() => null}
    />
  );
  const en = render(ui),
    ko = render(ui, 'ko');
  assert.match(en, /Legacy excluded/);
  assert.match(en, /disabled=""/);
  assert.match(ko, /사유 미기록/);
  assert.match(ko, /Base 추가/);
  assert.match(en, /Add Split Group/);
});
void test('1000 Operations × 25 Subjects begins with 50 collapsed summaries and no condition inputs', () => {
  const draft = prepareGroupDraft(make(), () => 'first');
  draft.subjects = Array.from({ length: 25 }, (_, i) => ({
    id: `W${i + 1}`,
    displayLabel: `W${i + 1}`,
  }));
  draft.operations = Array.from({ length: 1000 }, (_, i) => ({
    ...draft.operations[0],
    instanceId: `op-${i}`,
    design: commonOperationDesign(draft.subjects.map((s) => s.id)),
  }));
  const html = render(
    <RunDraftGroupGrid
      draft={draft}
      options={[option]}
      catalog={referenceCatalogSchema.parse(
        Object.fromEntries(
          [
            'units',
            'conditions',
            'properties',
            'measurements',
            'evaluations',
            'evaluationCriteria',
            'components',
            'materialCategories',
            'experimentTypes',
            'areas',
            'operations',
            'measurementOperations',
            'parameters',
          ].map((k) => [k, []]),
        ),
      )}
      onChange={noWrite}
    />,
  );
  assert.equal((html.match(/class="matrix-operation"/g) ?? []).length, 50);
  assert.equal((html.match(/class="operation-group-editor"/g) ?? []).length, 0);
  assert.ok((html.match(/<input/g) ?? []).length < 100);
  assert.match(html, /1–50 \/ 1000/);
});
void test('warning text is explicitly non-blocking and translated without changing identifiers', () => {
  const html = render(
    <RunDraftWarnings
      warnings={[
        'Unassigned Subject: {0}.|Cure · W01',
        'Enter the required execution condition: {0}.|Cure · Temperature',
      ]}
    />,
    'ko',
  );
  assert.match(html, /미할당 실험 대상: Cure · W01/);
  assert.match(html, /필수 실행 조건이 누락/);
  assert.match(html, /차단하지 않습니다/);
  assert.doesNotMatch(html, /disabled/);
});

void test('Source condition copy retains exact revisions and explicit CLEAR but uses fresh identity', () => {
  const source = {
    id: 'b1',
    operationId: 'op',
    groupId: 'g1',
    subjectId: null,
    recipeRevisionId: 'recipe-r3',
    parameterRevisionId: 'source-r2',
    sampleRevisionId: 'sample-r4',
    state: 'SELECTED' as const,
  };
  const copied = duplicateGroupBindings(
    [source],
    'op',
    'g1',
    'g2',
    () => 'new-binding',
  );
  assert.equal(copied[1].id, 'new-binding');
  assert.equal(copied[1].sampleRevisionId, 'sample-r4');
  assert.equal(copied[1].groupId, 'g2');
  assert.equal(source.id, 'b1');
  const cleared=duplicateGroupBindings([{...source,state:'CLEAR',sampleRevisionId:null}],'op','g1','g2',()=> 'clear-copy');
  assert.equal(cleared[1].state,'CLEAR');assert.equal(cleared[1].sampleRevisionId,null);
  const draft = prepareGroupDraft(make(), () => 'op');
  draft.recipeSourceBindings = copied;
  assert.deepEqual(prepareGroupDraft(draft).recipeSourceBindings, []);
});

void test('V2 accessible descriptions and Subject guidance distinguish allocation, Skip and missing',()=>{
 const plan=participation25();plan.conditionResolution='GROUPS_V2';plan.operationDesign={A:{mode:'GROUPED',groups:[],allocations:{[plan.subjects[0].id]:{state:'UNASSIGNED'},[plan.subjects[1].id]:{state:'SKIP'}}}};
 const unassigned=allocationDescription('ko',plan,'A',plan.subjects[0].id),skip=allocationDescription('en',plan,'A',plan.subjects[1].id);
 assert.match(unassigned,/아직 Group이 배정되지 않았습니다/);assert.doesNotMatch(unassigned,/공정 미참여/);assert.match(skip,/Explicitly planned not to execute/);assert.match(allocationUi('ko','legend'),/Group 미할당: 배정 대기/);
 const draft=prepareGroupDraft(make(),()=> 'stable');const ko=render(<RunDraftSubjects draft={draft} onChange={noWrite}/>,'ko');assert.match(ko,/일반 공정에 공통 적용/);assert.match(ko,/Group 공정에서는 미할당/);assert.match(ko,/기존 방식의 공정은 적용 상태를 그대로 유지/);
 const en=render(<RunDraftSubjects draft={draft} onChange={noWrite}/>);assert.match(en,/New Subjects apply to common Operations/);
 const legacy=render(<RunDraftSubjects draft={make()} onChange={noWrite}/>);assert.match(legacy,/Existing Operations do not automatically apply/);
});

void test('QA-01 consecutive Split display excludes Base and preserves identity, custom description and input snapshot', () => {
  let design = commonOperationDesign(['W01']);
  for (const group of [
    {id:'base',kind:'BASE' as const,name:'Base'},
    {id:'s1',kind:'SPLIT' as const,name:'Split 1'},
    {id:'s2',kind:'SPLIT' as const,name:'Split 2'},
    {id:'s3',kind:'SPLIT' as const,name:'Split 3'},
  ]) design = addOperationGroup(design,group);
  design.allocations.W01 = {state:'ASSIGNED',groupId:'s3'};
  const original = structuredClone(design);
  const labels = (d:typeof design) => d.groups.map(group => operationGroupLabel(d,group.id));
  assert.deepEqual(labels(design),['Base','Split 1','Split 2','Split 3']);
  const removed = removeOperationGroup(design,'s2');
  assert.deepEqual(labels(removed),['Base','Split 1','Split 2']);
  assert.equal(removed.groups[2].id,'s3');
  assert.equal(removed.groups[2].name,'Split 3','do not rewrite historical/generated names');
  assert.deepEqual(removed.allocations,original.allocations);
  const added = addOperationGroup(removed,{id:'s4',kind:'SPLIT',name:'Split'});
  assert.deepEqual(labels(added),['Base','Split 1','Split 2','Split 3']);
  assert.deepEqual(design,original,'display projection and removal never mutate the source');
  const named = {...removed,groups:removed.groups.map(g=>g.id==='s3'?{...g,name:'High temperature'}:g)};
  assert.equal(operationGroupLabel(named,'s3'),'Split 2 · High temperature');
  assert.equal(operationGroupDescription(named.groups[2]),'High temperature');
  assert.equal(operationGroupDescription({...named.groups[2],name:'High '}),'High ','typing a multiword description preserves the trailing space');
  assert.equal(operationGroupTitle(named,'unknown'),undefined);
  assert.equal(operationGroupLabel(named,'unknown'),undefined);
  assert.equal(operationGroupTitle({...added,groups:[added.groups[1],added.groups[0],...added.groups.slice(2)]},'s3'),'Split 2');
});

void test('QA-01 shared editor renders derived sequence and separate optional descriptions in KO/EN',()=>{
 const design = {mode:'GROUPED' as const,groups:[{id:'base',kind:'BASE' as const,name:'Base'},{id:'s1',kind:'SPLIT' as const,name:'Split 1'},{id:'s3',kind:'SPLIT' as const,name:'Split 3'}],allocations:{W01:{state:'ASSIGNED' as const,groupId:'s3'}}};
 for(const locale of ['ko','en'] as const){
  const html=render(<OperationGroupEditor design={design} subjects={[{id:'W01',displayLabel:'W01'}]} appliedSubjectIds={['W01']} onChange={noWrite} onDuplicate={noWrite} renderConditions={()=>null}/>,locale);
  assert.match(html,/value="GROUP:s3"[^>]*>Split 2/);
  assert.match(html,/aria-label="Split 2 · W01"/);
  assert.match(html,locale==='ko'?/Split 2 · 설명 \(선택 사항\)/:/Split 2 · Description \(optional\)/);
  assert.doesNotMatch(html,/Split 3/);
 }
});
