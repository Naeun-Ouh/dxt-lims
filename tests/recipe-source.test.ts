import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRecipeSource,
  validateRecipeSourceBindings,
  remapRecipeSourceBindings,
  type RecipeSourceBinding,
} from '@/src/application/recipe-source';
const common: RecipeSourceBinding = {
  id: 'common',
  operationId: 'op',
  groupId: null,
  subjectId: null,
  recipeRevisionId: 'recipe-r1',
  parameterRevisionId: 'source-r1',
  state: 'SELECTED',
  sampleRevisionId: 'sample-r1',
};
const query = {
  operationId: 'op',
  subjectId: 'W01',
  groupId: 'split1',
  recipeRevisionId: 'recipe-r1',
  parameterRevisionId: 'source-r1',
};
void test('Recipe Source: Subject > Group > Operation and order-independent inheritance', () => {
  const group = {
      ...common,
      id: 'group',
      groupId: 'split1',
      sampleRevisionId: 'sample-r2',
    },
    subject = {
      ...common,
      id: 'subject',
      subjectId: 'W01',
      sampleRevisionId: 'sample-r3',
    };
  for (const values of [
    [common, group, subject],
    [subject, common, group],
  ])
    assert.equal(
      resolveRecipeSource(values, query)?.binding.sampleRevisionId,
      'sample-r3',
    );
  assert.equal(resolveRecipeSource([common, group], query)?.source, 'GROUP');
  assert.equal(resolveRecipeSource([common], query)?.source, 'OPERATION');
});
void test('Recipe Source: CLEAR and permission denial stop inheritance without pretending Missing', () => {
  const clear = {
    ...common,
    id: 'clear',
    groupId: 'split1',
    state: 'CLEAR' as const,
    sampleRevisionId: null,
  };
  assert.equal(
    resolveRecipeSource([common, clear], query)?.binding.state,
    'CLEAR',
  );
  const denied = {
    ...common,
    id: 'denied',
    groupId: 'split1',
    sampleRevisionId: null,
    sampleAccessDenied: true,
  };
  assert.equal(
    resolveRecipeSource([common, denied], query)?.binding.sampleAccessDenied,
    true,
  );
  validateRecipeSourceBindings([common, denied]);
});
void test('Recipe Source: exact Recipe/Parameter identity and distinct Source slots', () => {
  assert.equal(
    resolveRecipeSource([common], { ...query, recipeRevisionId: 'recipe-r2' }),
    null,
  );
  const second = {
    ...common,
    id: 'second',
    parameterRevisionId: 'source-r2',
    sampleRevisionId: 'sample-r2',
  };
  validateRecipeSourceBindings([common, second]);
  assert.equal(
    resolveRecipeSource([common, second], query)?.binding.sampleRevisionId,
    'sample-r1',
  );
  assert.equal(
    resolveRecipeSource([common, second], {
      ...query,
      parameterRevisionId: 'source-r2',
    })?.binding.sampleRevisionId,
    'sample-r2',
  );
});
void test('Recipe Source: rejects duplicate scope, invalid empty selection and mixed scope', () => {
  assert.throws(
    () =>
      validateRecipeSourceBindings([common, { ...common, id: 'different' }]),
    /only one/,
  );
  assert.throws(() =>
    validateRecipeSourceBindings([{ ...common, sampleRevisionId: null }]),
  );
  assert.throws(() =>
    validateRecipeSourceBindings([
      { ...common, groupId: 'g', subjectId: 'W01' },
    ]),
  );
});

void test('Recipe Source: copies independent binding and Operation identities with exact revisions unchanged', () => {
  const group = { ...common, id: 'group', groupId: 'g' };
  const copied = remapRecipeSourceBindings(
    [common, group],
    new Map([['op', 'new-op']]),
    (_, i) => `copy-${i}`,
    new Map([['g', 'new-g']]),
  )!;
  assert.equal(copied[0].id, 'copy-0');
  assert.equal(copied[0].operationId, 'new-op');
  assert.equal(copied[1].groupId, 'new-g');
  assert.equal(copied[0].sampleRevisionId, common.sampleRevisionId);
  assert.equal(copied[0].recipeRevisionId, common.recipeRevisionId);
  assert.equal(common.operationId, 'op');
  assert.throws(
    () => remapRecipeSourceBindings([common], new Map(), () => 'copy'),
    /matching Operation/,
  );
});
