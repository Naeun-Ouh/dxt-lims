import test from 'node:test';
import assert from 'node:assert/strict';
import {
  withPlanDelta,
  validatePlanEdit,
} from '@/src/application/plan-authoring';
import { materialRunPlanningSnapshot } from '@/src/features/material-rd/material-rd-scenario';
import { configurationRepository } from '@/src/mock/configuration-packages';
import {
  addOperationGroup,
  applyOperationDesign,
  commonOperationDesign,
} from '@/src/features/run-registration/operation-design';
function setup() {
  let plan = structuredClone(materialRunPlanningSnapshot);
  plan.conditionResolution = 'GROUPS_V2';
  plan.delta.items = [];
  const condition = plan.assignments.find((a) => a.kind === 'CONDITION')!,
    op = condition.processStepId!,
    subject = plan.subjects[0].id;
  const design = addOperationGroup(
    commonOperationDesign(plan.subjects.map((s) => s.id)),
    { id: 'split', kind: 'SPLIT', name: 'Split' },
  );
  design.allocations[subject] = { state: 'ASSIGNED', groupId: 'split' };
  plan = applyOperationDesign(plan, op, design);
  plan.assignments = [
    {
      ...condition,
      id: 'common',
      subjectId: null,
      groupId: null,
      value: '10',
      intentRole: 'FIXED',
    },
    {
      ...condition,
      id: 'group',
      subjectId: null,
      groupId: 'split',
      value: '20',
      intentRole: 'VARIED',
    },
  ];
  return { plan, op, subject };
}
void test('Group Delta: subject override records inherited Group value and role, never unrelated common value', () => {
  const { plan, subject } = setup();
  const group = plan.assignments[1];
  const changed = withPlanDelta(plan, {
    ...plan,
    assignments: [
      ...plan.assignments,
      {
        ...group,
        id: 'override',
        groupId: null,
        subjectId: subject,
        value: '0',
      },
    ],
  });
  const delta = changed.delta.items.find((d) => d.id === 'plan-edit-override')!;
  assert.equal(delta.before, '20');
  assert.equal(delta.after, '0');
  assert.equal(delta.beforeRole, 'VARIED');
  assert.equal(delta.afterRole, 'VARIED');
});
void test('Group Delta: repeated edits preserve original value and original role together', () => {
  const { plan } = setup();
  const first = withPlanDelta(plan, {
    ...plan,
    assignments: plan.assignments.map((a) =>
      a.id === 'common' ? { ...a, value: '11', intentRole: 'VARIED' } : a,
    ),
  });
  const second = withPlanDelta(first, {
    ...first,
    assignments: first.assignments.map((a) =>
      a.id === 'common' ? { ...a, value: '12', intentRole: 'FIXED' } : a,
    ),
  });
  const delta = second.delta.items.find((d) => d.id === 'plan-edit-common')!;
  assert.equal(delta.before, '10');
  assert.equal(delta.after, '12');
  assert.equal(delta.beforeRole, 'FIXED');
  assert.equal(delta.afterRole, 'FIXED');
});
void test('Group Delta: rename and Skip are separate explicit changes; old writers cannot discard design', () => {
  const { plan, op, subject } = setup();
  const design = structuredClone(plan.operationDesign![op]);
  design.groups[0].name = 'Split B';
  design.allocations[subject] = { state: 'SKIP' };
  const changed = withPlanDelta(plan, applyOperationDesign(plan, op, design));
  const group = changed.delta.items.find((d) => d.kind === 'OPERATION_GROUP')!,
    allocation = changed.delta.items.find((d) => d.kind === 'ALLOCATION')!;
  assert.match(group.before!, /Split/);
  assert.match(group.after!, /Split B/);
  assert.equal(allocation.before, 'ASSIGNED · Split 1');
  assert.equal(allocation.after, 'SKIP');
  assert.throws(
    () =>
      validatePlanEdit(
        plan,
        {
          ...plan,
          operationDesign: undefined,
          assignments: plan.assignments.filter((a) => !a.groupId),
        },
        configurationRepository,
      ),
    /cannot be discarded/,
  );
  assert.throws(
    () =>
      validatePlanEdit(
        plan,
        { ...plan, conditionResolution: 'SUBJECT_FIRST_V1' },
        configurationRepository,
      ),
    /must remain unchanged/,
  );
});
void test('Group Delta: removing an edited assignment preserves the original role provenance', () => {
  const { plan } = setup();
  const changed = withPlanDelta(plan, {
    ...plan,
    assignments: plan.assignments.map((a) =>
      a.id === 'common' ? { ...a, value: '11', intentRole: 'VARIED' } : a,
    ),
  });
  const removed = withPlanDelta(changed, {
    ...changed,
    assignments: changed.assignments.filter((a) => a.id !== 'common'),
  });
  const delta = removed.delta.items.find((d) => d.id === 'plan-edit-common')!;
  assert.equal(delta.change, 'REMOVED');
  assert.equal(delta.before, '10');
  assert.equal(delta.beforeRole, 'FIXED');
  assert.equal(delta.afterRole, null);
});
void test('Group Delta: new scope repeated edits retain original absence, not invented prior values', () => {
  const { plan } = setup();
  const added = {
    ...plan.assignments[1],
    id: 'second-group',
    groupId: 'new-group',
    value: '30',
    intentRole: 'FIXED' as const,
  };
  const first = withPlanDelta(plan, {
    ...plan,
    operationDesign: {...plan.operationDesign,[added.processStepId!]:addOperationGroup(plan.operationDesign![added.processStepId!],{id:'new-group',kind:'SPLIT',name:'New Group'})},
    assignments: [...plan.assignments, added],
  });
  const second = withPlanDelta(first, {
    ...first,
    assignments: first.assignments.map((a) =>
      a.id === added.id ? { ...a, value: '31', intentRole: 'VARIED' } : a,
    ),
  });
  const delta = second.delta.items.find(
    (d) => d.id === 'plan-edit-second-group',
  )!;
  assert.equal(delta.before, null);
  assert.equal(delta.beforeRole, null);
  assert.equal(delta.after, '31');
  assert.equal(delta.afterRole, 'VARIED');
});

void test('QA-01 display renumbering preserves recorded history and does not hide Group identity changes', () => {
  const {plan,op} = setup();
  plan.delta.items.push({id:'historical-label',kind:'ALLOCATION',label:'Historic allocation',change:'CHANGED',before:'ASSIGNED · Split 3',after:'SKIP'});
  const before = structuredClone(plan);
  const next = structuredClone(plan);
  next.operationDesign![op].groups[0].id = 'replacement';
  const changed = withPlanDelta(plan,next);
  assert.ok(changed.delta.items.some(d=>d.id===`plan-groups-${op}`),'same visible ordinal does not erase a different internal identity');
  assert.deepEqual(changed.delta.items.find(d=>d.id==='historical-label'),before.delta.items[0]);
  assert.deepEqual(plan,before,'old snapshot and historical label remain intact');
});
