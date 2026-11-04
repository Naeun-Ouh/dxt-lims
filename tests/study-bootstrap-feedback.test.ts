import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialTargetBlockers,
  setupInputProblems,
} from '@/src/features/experiment-series/study-bootstrap-feedback';
import type { StudyBootstrapState } from '@/src/application/study-bootstrap';
import { translate } from '@/src/shared/i18n/messages';
import { handleRepositoryRequest } from '@/app/api/repository/route';

// Only the fields used to display prerequisites are relevant to this test.
const state = () =>
  ({
    setup: {
      operations: [{ measurements: [{ parameterDefinitionIds: ['p'] }] }],
    },
    catalog: {
      parameters: [{ id: 'p', dataType: 'NUMBER' }],
      evaluations: [{ id: 'e' }],
      nextActionTypes: [{ id: 'n', active: true }],
    },
    structuralMissing: [],
    canInitializeReasoning: true,
    closed: false,
  }) as unknown as StudyBootstrapState;
const input = {
  expectedRevision: 4,
  subjects: [{ id: '1234', displayLabel: '1234' }],
  operations: [
    {
      optionId: 'exact-option',
      point: null,
      parameterIds: [],
      items: [
        {
          applicabilityId: 'reference',
          value: 'F-BASE-01',
          intentRole: 'VARIED',
        },
      ],
    },
  ],
};

void test('Setup schema preflight identifies missing fields without changing scientific payloads', () => {
  const before = JSON.stringify(input);
  assert.deepEqual(setupInputProblems(input), []);
  assert.equal(JSON.stringify(input), before);
  assert.match(
    setupInputProblems({ ...input, operations: [] })[0].key,
    /add at least one Operation/,
  );
  assert.match(
    setupInputProblems({ ...input, subjects: [] })[0].key,
    /enter at least one Subject/,
  );
  assert.deepEqual(
    setupInputProblems({
      ...input,
      subjects: [{ id: '', displayLabel: 'a' }],
    })[0].values,
    ['subjects.0.id'],
  );
});

void test('Invalid missing-Operation API request fails before application/repository dispatch', async () => {
  let dispatched = false;
  const response = await handleRepositoryRequest(
    new Request('http://test/api/repository', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'study.bootstrap.save',
        slug: 'uat-pr12-specimen-human',
        commandId: 'isolated-no-write',
        input: { ...input, operations: [] },
      }),
    }),
    async () => {
      dispatched = true;
      throw new Error('must not dispatch');
    },
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Invalid repository request.',
  });
  assert.equal(dispatched, false, 'no repository call or DB write');
});

void test('Saved process-only Setup explains the actual missing Measurement prerequisite and next action', () => {
  const s = state();
  s.structuralMissing = ['Measurement plan'];
  s.setup.operations = [];
  const reasons = initialTargetBlockers(s, false, false);
  assert.equal(reasons.length, 1);
  assert.match(reasons[0].key, /saved Setup has no Measurement plan/);
  assert.match(
    reasons[0].key,
    /select its point and parameters, then save Setup/,
  );
  assert.equal(
    s.canInitializeReasoning,
    true,
    'do not misdiagnose a structural gap as permission denial',
  );
});

void test('Busy, unsaved/failed-save state, permission and closure remain distinct blockers', () => {
  const s = state();
  assert.deepEqual(initialTargetBlockers(s, false, false), []);
  assert.match(
    initialTargetBlockers(s, true, false)[0].key,
    /request is in progress/,
  );
  assert.match(
    initialTargetBlockers(s, false, true)[0].key,
    /unsaved changes.*save error/,
  );
  s.canInitializeReasoning = false;
  assert.match(
    initialTargetBlockers(s, false, false)[0].key,
    /MANAGE_REASONING_CONTEXT/,
  );
  s.closed = true;
  assert.match(
    initialTargetBlockers(s, false, false)[0].key,
    /authoring is closed/,
  );
  assert.ok(
    !initialTargetBlockers(s, false, false).some((r) =>
      r.key.includes('MANAGE_REASONING_CONTEXT'),
    ),
  );
});

void test('Unavailable exact references block Target with remediation, without creating defaults', () => {
  const s = state();
  s.catalog.parameters = [];
  s.catalog.evaluations = [];
  s.catalog.nextActionTypes = [];
  const before = JSON.stringify(s);
  const reasons = initialTargetBlockers(s, false, false);
  assert.equal(reasons.length, 2);
  assert.match(reasons[0].key, /No numeric Target parameter/);
  assert.match(reasons[1].key, /configuration administrator/);
  assert.equal(JSON.stringify(s), before);
});

void test('All prerequisite explanations translate in KO/EN, and VARIED terminology is unchanged', () => {
  const s = state();
  s.canInitializeReasoning = false;
  s.structuralMissing = [
    'Subjects',
    'Operations',
    'Measurement plan',
    'future requirement',
  ];
  s.catalog.evaluations = [];
  s.catalog.parameters = [];
  const messages = [
    ...initialTargetBlockers(s, true, true),
    ...setupInputProblems({ ...input, subjects: [], operations: [] }),
    ...setupInputProblems({ ...input, expectedRevision: 0 }),
  ];
  s.structuralMissing = [];
  messages.push(...initialTargetBlockers(s, false, false));
  s.closed = true;
  messages.push(...initialTargetBlockers(s, false, false));
  for (const { key, values } of messages) {
    assert.match(translate('ko', key, values), /[가-힣]/);
    assert.ok(translate('en', key, values).length);
  }
  assert.equal(translate('ko', 'Intentionally Varied'), '의도적 변경');
  assert.equal(translate('ko', 'VARIED'), '의도적 변경');
});
