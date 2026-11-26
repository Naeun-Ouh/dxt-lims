import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/src/shared/i18n/locale';
import { runPlanningScenarios, effectiveAssignments } from '@/src/features/run-registration/planning-model';
import { prospectiveConditions, conditionInterpretationChanges, legacyConditionAmbiguities } from '@/src/application/condition-resolution';
import { RunCreationReview } from '@/src/features/experiment-series/run-creation-review';

function source() {
  const snapshot = structuredClone(runPlanningScenarios.PHOTO);
  const common = snapshot.assignments.find(a => a.label === 'Energy' && !a.subjectId)!;
  snapshot.assignments = [...snapshot.assignments.filter(a => a.label !== 'Energy'),
    {...common, id:'scoped-zero', subjectId:snapshot.subjects[0].id, value:'0', intentRole:'VARIED'},
    {...common, value:'37', intentRole:'FIXED'}];
  return snapshot;
}
void test('copy policy is prospective, discloses legacy effective value and role changes without rewriting source', () => {
  const old = source(); const saved = structuredClone(old);
  const next = prospectiveConditions(old);
  assert.equal(legacyConditionAmbiguities(old), true);
  assert.equal(legacyConditionAmbiguities(next), false);
  assert.equal(effectiveAssignments(old,old.subjects[0].id)[`${old.assignments.at(-1)!.processStepId}:CONDITION:Energy`].value,'37');
  const changes = conditionInterpretationChanges(old,next);
  assert.equal(changes.length,1);
  assert.deepEqual([changes[0].before,changes[0].after,changes[0].beforeRole,changes[0].afterRole],['37','0','FIXED','VARIED']);
  assert.deepEqual(old,saved);
  assert.throws(()=>prospectiveConditions({...old,assignments:[...old.assignments,old.assignments.at(-1)!]}),/Duplicate assignment/);
});
void test('copy confirmation shows changed values and final effective values in KO/EN without authoring', () => {
  const old = source(); const snapshot = prospectiveConditions(old);
  const preview = {snapshot, sourceChanges:conditionInterpretationChanges(old,snapshot), legacySourceAmbiguous:true, sourceFingerprint:'source',fingerprint:'review',readiness:{status:'READY' as const,missing:[]}};
  const neverWrite=()=>{throw Error('Rendering must not write');};
  for(const locale of ['ko','en'] as const){
    const html=renderToStaticMarkup(<LocaleProvider initialLocale={locale} persist={false}><RunCreationReview preview={preview} busy={false} onCancel={neverWrite} onConfirm={neverWrite}/></LocaleProvider>);
    assert.match(html,locale==='ko'?/복사 후 적용값/:/Copied value/);
    assert.match(html,locale==='ko'?/실험 변수/:/Intentionally Varied/);
    assert.match(html,/>37/);assert.match(html,/>0/);
    assert.match(html,locale==='ko'?/최종 생성/:/Final Create/);
  }
});
