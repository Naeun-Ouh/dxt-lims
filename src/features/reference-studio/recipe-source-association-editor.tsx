'use client';
import { useCallback, useEffect, useState } from 'react';
import { useDxtApplication } from '@/src/application/dxt-application-provider';
import { useLocale } from '@/src/shared/i18n/locale';
import type { RecipeSourceDescriptor } from '@/src/application/recipe-source';
import { canGovern } from './permissions';
const messages = {
  ko: {
    title: 'Recipe Source 연결 정의',
    help: '기준정보에 등록된 Recipe와 소재를 연결할 Source Parameter를 명시적으로 지정합니다. 기존 실험의 연결은 변경되지 않습니다.',
    configuration: '실험 기준정보',
    recipe: 'Recipe',
    parameter: 'Source Parameter',
    select: '선택',
    save: '연결 정의 저장',
    saved: '연결 정의를 저장했습니다.',
    error:
      '연결 정의를 저장하거나 불러오지 못했습니다. 선택 항목과 권한을 확인해 주세요.',
    empty: '등록된 연결 정의가 없습니다.',
    readonly: '기준정보 작성 권한이 필요합니다.',
    detail: '기술 식별자',
  },
  en: {
    title: 'Recipe Source associations',
    help: 'Explicitly associate a configured Recipe with the Source Parameter used to select material. Existing experiment selections remain unchanged.',
    configuration: 'Experiment references',
    recipe: 'Recipe',
    parameter: 'Source Parameter',
    select: 'Select',
    save: 'Save association',
    saved: 'Association saved.',
    error:
      'Source associations could not be loaded or saved. Check the selection and your permission.',
    empty: 'No Source associations are configured.',
    readonly: 'Reference authoring permission is required.',
    detail: 'Technical identities',
  },
};
export function RecipeSourceAssociationEditor() {
  const { application } = useDxtApplication(),
    { locale } = useLocale(),
    t = messages[locale];
  const registry =
    application.repositories.configuration.getConfigurationRegistry();
  const [packageId, setPackageId] = useState(registry.packages[0]?.id ?? ''),
    [recipeId, setRecipeId] = useState(''),
    [parameterId, setParameterId] = useState('');
  const [rows, setRows] = useState<RecipeSourceDescriptor[]>([]),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const pack = registry.packages.find((p) => p.id === packageId),
    allowed =
      !!pack && canGovern(application, 'canAuthorDefinition', pack.scope);
  const rules = registry.applicabilityRuleSets
    .filter((s) => pack?.applicabilityRuleSetVersionIds.includes(s.id))
    .flatMap((s) => s.rules)
    .filter((r) => r.assignmentKind === 'RECIPE');
  const recipes = new Map<string, string>();
  for (const r of rules) {
    recipes.set(r.assignmentReferenceRevisionId, r.defaultValue);
    for (const option of [
      ...r.contextualOptions,
      ...(registry.definitionDescriptors.find(
        (d) => d.revisionId === r.definitionRevisionId,
      )?.intrinsicOptions ?? []),
    ])
      if (option.referenceId) recipes.set(option.referenceId, option.label);
  }
  const parameters = registry.definitionDescriptors.filter(
    (d) =>
      pack?.definitionRevisionIds.includes(d.revisionId) &&
      d.editorKey === 'REFERENCE',
  );
  const request = useCallback(
    async (operation: 'list' | 'register') => {
      const response = await fetch('/api/recipe-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          packageVersionId: packageId,
          ...(operation === 'register'
            ? { recipeRevisionId: recipeId, parameterRevisionId: parameterId }
            : {}),
        }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      return response.json() as Promise<RecipeSourceDescriptor[]>;
    },
    [packageId, recipeId, parameterId],
  );
  useEffect(() => {
    if (!packageId) return;
    let active = true;
    void request('list')
      .then((value) => {
        if (active) {
          setRows(value);
          setNotice('');
        }
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setNotice(t.error);
        }
      });
    return () => {
      active = false;
    };
  }, [packageId, request, t.error]);
  const save = async () => {
    setBusy(true);
    try {
      await request('register');
      setRows(await request('list'));
      setNotice(t.saved);
    } catch {
      setNotice(t.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="sample-section">
      <summary>{t.title}</summary>
      <p>{t.help}</p>
      <div className="bootstrap-controls">
        <label>
          {t.configuration}
          <select
            value={packageId}
            onChange={(e) => {
              setPackageId(e.target.value);
              setRecipeId('');
              setParameterId('');
            }}
          >
            {registry.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.scope.kind} ·{' '}
                {p.scope.kind === 'GLOBAL' ? 'Global' : p.scope.ownerId} · v
                {p.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.recipe}
          <select
            disabled={!allowed || busy}
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
          >
            <option value="">{t.select}</option>
            {[...recipes].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.parameter}
          <select
            disabled={!allowed || busy}
            value={parameterId}
            onChange={(e) => setParameterId(e.target.value)}
          >
            <option value="">{t.select}</option>
            {parameters.map((d) => (
              <option key={d.revisionId} value={d.revisionId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="entry-button"
          disabled={!allowed || busy || !recipeId || !parameterId}
          onClick={() => void save()}
        >
          {t.save}
        </button>
      </div>
      {!allowed && <p>{t.readonly}</p>}
      {notice && <output>{notice}</output>}
      <table className="dxt-grid">
        <thead>
          <tr>
            <th>{t.recipe}</th>
            <th>{t.parameter}</th>
            <th>{t.detail}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.recipeRevisionId}:${row.parameterRevisionId}`}>
              <td aria-label={t.recipe}>
                {recipes.get(row.recipeRevisionId) ?? t.recipe}
              </td>
              <td>{row.label}</td>
              <td aria-label={t.detail}>
                <details>
                  <summary>{t.detail}</summary>
                  <code>
                    {row.recipeRevisionId}
                    <br />
                    {row.parameterRevisionId}
                  </code>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>{t.empty}</p>}
    </details>
  );
}
