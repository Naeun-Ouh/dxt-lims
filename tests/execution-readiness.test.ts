import test from 'node:test';
import assert from 'node:assert/strict';
import { executionReadiness } from '@/src/application/execution-readiness';
import { bootstrapActionError } from '@/src/features/experiment-series/study-bootstrap-feedback';
import { reasoningPrerequisites } from '@/src/application/study-readiness';
import { initialReasoningSchema } from '@/src/application/study-bootstrap';
import { configurationRepository } from '@/src/mock/configuration-packages';
import { definitions } from '@/src/mock/reference';
import { materialRunPlanningSnapshot } from '@/src/features/material-rd/material-rd-scenario';
import { translate } from '@/src/shared/i18n/messages';
import { handleRepositoryRequest } from '@/app/api/repository/route';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';

void test('Execution prerequisites never manufacture scientific values or require Target/Next Action', () => {
  const snapshot = structuredClone(materialRunPlanningSnapshot);
  snapshot.steps = snapshot.steps.filter((s) => s.role === 'PROCESS');
  snapshot.measurements = [];
  const before = JSON.stringify(snapshot);
  const ready = executionReadiness(
    snapshot,
    configurationRepository,
    definitions,
  );
  assert.equal(ready.measurement.status, 'NOT_CONFIGURED');
  assert.ok(
    !ready.execution.missing.some((s) =>
      /Target|Evaluation|Next Action/.test(s),
    ),
  );
  assert.equal(JSON.stringify(snapshot), before);
  const empty = executionReadiness(
    { ...snapshot, subjects: [], steps: [] },
    configurationRepository,
    definitions,
  );
  assert.ok(
    empty.execution.missing.includes('Add and save at least one Subject.'),
  );
  assert.ok(
    empty.execution.missing.includes('Add and save ordered Operations.'),
  );
});
void test('Optional Evaluation Criteria accept no Next Action without changing explicit Target requirements', () => {
  const profile = lifecycleAuthoringProfiles['dts-improvement'];
  const context = {
    targetBindings: [...profile.targetBindings],
    catalog: { ...profile.catalog, nextActionTypes: [] },
  };
  assert.ok(
    !reasoningPrerequisites(context, profile.catalog).includes(
      'Next Action references',
    ),
  );
  assert.equal(
    initialReasoningSchema.safeParse({
      packageVersionId: 'exact',
      evaluationIds: ['e'],
      nextActionIds: [],
      targetBindings: [...profile.targetBindings],
      confirmed: true,
    }).success,
    true,
  );
  assert.equal(
    initialReasoningSchema.safeParse({
      packageVersionId: 'exact',
      evaluationIds: ['e'],
      nextActionIds: [],
      targetBindings: [],
      confirmed: true,
    }).success,
    false,
  );
});
void test('Researcher errors are actionable and never expose raw technical failure text', async () => {
  for (const scope of ['setup', 'reasoning', 'run', 'load'] as const) {
    for (const message of [
      'Production repository request failed',
      'database unavailable',
      'API error',
      'adapter error',
      'TypeError: failed to fetch',
    ]) {
      const safe = bootstrapActionError(new Error(message), scope);
      assert.doesNotMatch(safe, /repository|database|API|adapter|TypeError/);
      assert.match(translate('ko', safe), /[가-힣]/);
    }
  }
  assert.match(
    bootstrapActionError({ code: 'FORBIDDEN' }, 'setup'),
    /permission/,
  );
  assert.match(
    bootstrapActionError({ message: 'Duplicate Subject identity.' }, 'setup'),
    /unique/,
  );
  const response = await handleRepositoryRequest(
    new Request('http://test/api/repository', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'study.bootstrap.load', slug: 'test' }),
    }),
    async () => {
      throw new Error('database secret technical detail');
    },
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(
    JSON.stringify(await response.json()),
    /repository|database|secret/,
  );
});
void test('Approved intent labels retain unchanged persisted enums and comparison definition', () => {
  assert.equal(translate('ko', 'VARIED'), '실험 변수');
  assert.equal(translate('ko', 'FIXED'), '고정 조건');
  assert.equal(
    translate(
      'ko',
      'A condition deliberately varied in this experiment for comparison',
    ),
    '비교를 위해 이번 실험에서 의도적으로 값을 달리하는 조건',
  );
});
