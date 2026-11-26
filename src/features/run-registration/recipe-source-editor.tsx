'use client';
import { useEffect, useState } from 'react';
import {
  resolveRecipeSource,
  type RecipeSourceBinding,
  type RecipeSourceDescriptor,
} from '@/src/application/recipe-source';
import type { RunPlanningSnapshot } from './planning-model';
import { SampleRevisionPicker } from '@/src/features/samples/revision-picker';
import { SampleSelectionDetail } from '@/src/features/samples/selection-detail';
import { useLocale } from '@/src/shared/i18n/locale';

const text = {
  ko: {
    title: 'Recipe Source 소재',
    empty: '선택한 Recipe에 연결된 Source Parameter가 없습니다.',
    inherit: '상위 설정 사용',
    clear: '명시적으로 연결 해제',
    current: '현재 범위 연결',
    failed: '소재 연결 기준정보를 불러오지 못했습니다. 다시 확인해 주세요.',
    pending: '소재 연결 기준정보를 불러오는 중입니다.',
    source: 'Source Parameter',
    stale: '이전 Recipe 소재 연결이 남아 있습니다.',
    removeStale: '이전 연결 해제',
  },
  en: {
    title: 'Recipe Source materials',
    empty: 'No Source Parameters are configured for the selected Recipe.',
    inherit: 'Inherit selection',
    clear: 'Explicitly clear selection',
    current: 'Selection at this scope',
    failed:
      'Source references could not be loaded. Check your selection and try again.',
    pending: 'Loading Source references…',
    source: 'Source Parameter',
    stale: 'Material selections from a previous Recipe remain.',
    removeStale: 'Remove previous selection',
  },
};
export function RecipeSourceEditor({
  snapshot,
  operationId,
  groupId = null,
  subjectId = null,
  readOnly = false,
  onChange,
}: {
  snapshot: RunPlanningSnapshot & {
    recipeSourceBindings?: RecipeSourceBinding[];
  };
  operationId: string;
  groupId?: string | null;
  subjectId?: string | null;
  readOnly?: boolean;
  onChange: (bindings: RecipeSourceBinding[]) => void;
}) {
  const { locale } = useLocale(),
    t = text[locale];
  const [descriptors, setDescriptors] = useState<RecipeSourceDescriptor[]>([]),
    [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const recipes = snapshot.assignments.filter(
    (a) =>
      a.kind === 'RECIPE' && a.processStepId === operationId && !a.positionId,
  );
  const scopeGroup = subjectId
    ? snapshot.operationDesign?.[operationId]?.allocations[subjectId]?.groupId
    : groupId;
  const effective = new Map<string, (typeof recipes)[number]>();
  for (const layer of [
    recipes.filter((a) => !a.subjectId && !a.groupId),
    recipes.filter((a) => !!scopeGroup && a.groupId === scopeGroup),
    recipes.filter((a) => !!subjectId && a.subjectId === subjectId),
  ])
    for (const a of layer) if (a.value.trim()) effective.set(a.label, a);
  const recipeIds = [...effective.values()].map((a) => a.referenceId);
  useEffect(() => {
    let active = true;
    void fetch('/api/recipe-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'list',
        packageVersionId: snapshot.configurationPackageVersionId,
      }),
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<RecipeSourceDescriptor[]>;
      })
      .then((rows) => {
        if (active) {
          setDescriptors(rows);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [snapshot.configurationPackageVersionId]);
  const bindings = snapshot.recipeSourceBindings ?? [];
  const stale = bindings.filter(
    (b) =>
      b.operationId === operationId &&
      b.groupId === groupId &&
      b.subjectId === subjectId &&
      !recipeIds.includes(b.recipeRevisionId),
  );
  const selected = descriptors.filter((d) =>
    recipeIds.includes(d.recipeRevisionId),
  );
  const update = (
    descriptor: RecipeSourceDescriptor,
    state: 'SELECTED' | 'CLEAR' | 'INHERIT',
    sampleRevisionId: string | null,
  ) => {
    const same = (b: RecipeSourceBinding) =>
      b.operationId === operationId &&
      b.groupId === groupId &&
      b.subjectId === subjectId &&
      b.recipeRevisionId === descriptor.recipeRevisionId &&
      b.parameterRevisionId === descriptor.parameterRevisionId;
    const old = bindings.find(same),
      rest = bindings.filter((b) => !same(b));
    onChange(
      state === 'INHERIT'
        ? rest
        : [
            ...rest,
            {
              id: old?.id ?? crypto.randomUUID(),
              operationId,
              groupId,
              subjectId,
              recipeRevisionId: descriptor.recipeRevisionId,
              parameterRevisionId: descriptor.parameterRevisionId,
              state,
              sampleRevisionId,
            },
          ],
    );
  };
  return (
    <section aria-label={t.title}>
      <h4>{t.title}</h4>
      {stale.map((binding) => (
        <p key={binding.id} role="alert">
          {t.stale}{' '}
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onChange(bindings.filter((b) => b.id !== binding.id))
              }
            >
              {t.removeStale}
            </button>
          )}
        </p>
      ))}
      {status === 'loading' ? (
        <p>{t.pending}</p>
      ) : status === 'error' ? (
        <p role="alert">{t.failed}</p>
      ) : !selected.length ? (
        <p>{t.empty}</p>
      ) : (
        selected.map((d) => {
          const b = bindings.find(
            (b) =>
              b.operationId === operationId &&
              b.groupId === groupId &&
              b.subjectId === subjectId &&
              b.recipeRevisionId === d.recipeRevisionId &&
              b.parameterRevisionId === d.parameterRevisionId,
          );
          const resolved = resolveRecipeSource(bindings, {
            operationId,
            subjectId: subjectId ?? '',
            groupId: scopeGroup,
            recipeRevisionId: d.recipeRevisionId,
            parameterRevisionId: d.parameterRevisionId,
          })?.binding;
          return (
            <fieldset
              key={`${d.recipeRevisionId}:${d.parameterRevisionId}`}
              disabled={readOnly}
            >
              <legend>{d.label}</legend>
              <small>
                {b?.state === 'CLEAR' ? t.clear : b ? t.current : t.inherit}
              </small>
              <SampleSelectionDetail
                revisionId={resolved?.sampleRevisionId}
                denied={resolved?.sampleAccessDenied}
              />
              {!readOnly && (
                <>
                  <SampleRevisionPicker
                    value={b?.sampleRevisionId}
                    denied={b?.sampleAccessDenied}
                    onChange={(id) => update(d, id ? 'SELECTED' : 'CLEAR', id)}
                  />
                  <button
                    type="button"
                    onClick={() => update(d, 'INHERIT', null)}
                  >
                    {t.inherit}
                  </button>
                  <button
                    type="button"
                    onClick={() => update(d, 'CLEAR', null)}
                  >
                    {t.clear}
                  </button>
                </>
              )}
            </fieldset>
          );
        })
      )}
    </section>
  );
}
