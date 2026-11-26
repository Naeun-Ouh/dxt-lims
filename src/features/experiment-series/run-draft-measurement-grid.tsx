'use client';
import { RunDraftFeedback } from './run-draft-feedback';
import type { RunDraft } from '@/src/application/run-draft';
import type { BootstrapOperationOption } from '@/src/application/study-bootstrap';
import { unitSymbol, type ReferenceCatalog } from '@/src/domain/reference';
import { useLocale } from '@/src/shared/i18n/locale';
import { DxtGridFrame, DxtStatus, DxtCellText } from '@/src/shared/ui/dxt-grid';

export function RunDraftMeasurementGrid({
  draft,
  options,
  catalog,
  change,
}: {
  draft: RunDraft;
  options: BootstrapOperationOption[];
  catalog: ReferenceCatalog;
  change: (
    index: number,
    patch: Partial<RunDraft['operations'][number]>,
  ) => void;
}) {
  const { t } = useLocale();
  const rows = draft.operations.flatMap((op, index) => {
    const option = options.find((o) => o.id === op.optionId)!;
    if (option.operation.role !== 'MEASUREMENT') return [];
    const parameters = catalog.parameters.filter(
      (p) =>
        option.parameterIds.includes(p.id) &&
        (!op.point ||
          p.supportedMeasurementPoints.includes(op.point) ||
          op.parameterIds.includes(p.id)),
    );
    return [{ op, index, option, parameters }];
  });
  if (!rows.length) return null;
  return (
    <fieldset className="draft-grid-section">
      <legend>3. {t('Measurement Plan')}</legend>
      <p>
        {t(
          'Select a point and parameters for each Measurement Operation. Process-only Runs need no Measurement plan.',
        )}
      </p>
      <DxtGridFrame label={t('Measurement Plan')}>
        <table className="dxt-grid draft-measurement-table">
          <thead>
            <tr>
              {[
                'Measurement Operation',
                'Measurement point',
                'Parameter',
                'Unit',
                'Required supporting parameters',
                'Validation status',
              ].map((k) => (
                <th scope="col" key={k}>
                  {t(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.flatMap(({ op, index, option, parameters }) =>
              (parameters.length ? parameters : [null]).map((p, pi) => {
                const selected = !!p && op.parameterIds.includes(p.id);
                const missing =
                  selected && p
                    ? p.requiredSupportingParameterIds.filter(
                        (id) => !op.parameterIds.includes(id),
                      )
                    : [];
                const compatible =
                  !p ||
                  !op.point ||
                  p.supportedMeasurementPoints.includes(op.point);
                const status = !op.point
                  ? 'Choose a Measurement point'
                  : !op.parameterIds.length
                    ? 'Select at least one parameter'
                    : !compatible
                      ? 'Parameter is incompatible with this point'
                      : missing.length
                        ? 'Select supporting parameters'
                        : selected
                          ? 'Selection complete'
                          : 'Not selected';
                return (
                  <tr key={`${index}-${p?.id ?? 'empty'}`}>
                    {pi === 0 && (
                      <>
                        <th
                          scope="rowgroup"
                          rowSpan={Math.max(1, parameters.length)}
                        >
                          <DxtCellText>{`${index + 1}. ${option.operation.label}`}</DxtCellText>
                          <RunDraftFeedback location={`measurement-${index}`} />
                          <small>
                            {t('{0} applicable · {1} not applicable', [
                              op.subjectIds.length,
                              draft.subjects.length - op.subjectIds.length,
                            ])}
                          </small>
                        </th>
                        <td rowSpan={Math.max(1, parameters.length)}>
                          <select
                            aria-label={`${index + 1}. ${option.operation.label} · ${t('Measurement point')}`}
                            aria-invalid={!op.point}
                            value={op.point ?? ''}
                            onChange={(e) =>
                              change(index, {
                                point: (e.target.value ||
                                  null) as typeof op.point,
                                parameterIds: [],
                              })
                            }
                          >
                            <option value="">{t('Select')}</option>
                            {[
                              'PRE',
                              'INTERMEDIATE',
                              'POST',
                              'FINAL',
                              'CUSTOM',
                            ].map((point) => (
                              <option key={point}>{point}</option>
                            ))}
                          </select>
                        </td>
                      </>
                    )}
                    <td>
                      {p ? (
                        <label>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              change(index, {
                                parameterIds: e.target.checked
                                  ? [...op.parameterIds, p.id]
                                  : op.parameterIds.filter((id) => id !== p.id),
                              })
                            }
                          />
                          <DxtCellText>{p.name}</DxtCellText>
                        </label>
                      ) : (
                        t(
                          'No compatible parameters. Choose another Measurement point or Operation.',
                        )
                      )}
                    </td>
                    <td>{p ? unitSymbol(catalog, p.unitId) || '—' : '—'}</td>
                    <td>
                      {p?.requiredSupportingParameterIds.length ? (
                        <>
                          <DxtCellText>
                            {p.requiredSupportingParameterIds
                              .map(
                                (id) =>
                                  catalog.parameters.find((p) => p.id === id)
                                    ?.name ?? t('Display name unavailable'),
                              )
                              .join(', ')}
                          </DxtCellText>
                          {selected && (
                            <DxtStatus
                              tone={missing.length ? 'warning' : 'success'}
                            >
                              {t(
                                missing.length
                                  ? 'Select supporting parameters'
                                  : 'Selection complete',
                              )}
                            </DxtStatus>
                          )}
                        </>
                      ) : (
                        t('Not required')
                      )}
                    </td>
                    <td>
                      <DxtStatus
                        tone={
                          status === 'Selection complete'
                            ? 'success'
                            : status === 'Not selected'
                              ? 'neutral'
                              : 'warning'
                        }
                      >
                        {t(status)}
                      </DxtStatus>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </DxtGridFrame>
    </fieldset>
  );
}
