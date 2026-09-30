import type { SubjectRef } from '@/src/domain/experiment/subject';
import {
  currentSubjectMeasurementValidity,
  effectiveSubjectMeasurementValues,
  type SubjectMeasurementDataset,
  type SubjectMeasurementExecution,
  type SubjectMeasurementResultSet,
  type SubjectMeasurementSummary,
  type SubjectMeasurementValue,
} from '@/src/domain/measurement/subject-measurement';
import {
  resolveById,
  unitSymbol,
  type MeasurementOperationDefinition,
  type ParameterDefinition,
  type ReferenceCatalog,
} from '@/src/domain/reference';
import type { ActualExecutionEvidence } from './actual-execution-model';
import type {
  ExperimentWorkspaceModel,
  WorkspaceOperation,
} from './workspace-model';

export type MeasurementValidity = 'INCLUDED' | 'EXCLUDED';

export type SiteMeasurementProjection = {
  measurementValue: SubjectMeasurementValue;
  siteIdentity: string;
  coordinates: Array<{ definitionId: string; value: number }>;
  value: string;
  validity: MeasurementValidity;
  exclusionReason: string | null;
};

export type MeasurementEvidenceProjection = {
  runId: string;
  subject: SubjectRef;
  operation: WorkspaceOperation;
  measurementExecution: SubjectMeasurementExecution;
  dataset: SubjectMeasurementDataset;
  measurementDefinition: MeasurementOperationDefinition;
  parameter: ParameterDefinition;
  unit: string;
  grain: 'SUBJECT' | 'SITE';
  representative: SubjectMeasurementSummary | null;
  representativeValue: string | null;
  sites: SiteMeasurementProjection[];
  linkedProcessExecutionEventId: string | null;
  provenance: {
    sourceSystem: string;
    sourceRecordReference: string | null;
    acquisitionMethod: SubjectMeasurementValue['acquisitionMethod'];
    collectedAt: string;
    datasetOrigin: SubjectMeasurementDataset['datasetOrigin'];
  };
};

export function plannedMeasurementIdentity(
  runId: string,
  subjectId: string,
  operationId: string,
) {
  return `planned-measurement:${runId}:${subjectId}:${operationId}`;
}

function displayValue(value: SubjectMeasurementValue['value']) {
  return String(value.value);
}

function operationForDataset(
  model: ExperimentWorkspaceModel,
  dataset: SubjectMeasurementDataset,
  subjectId: string,
) {
  return model.operations.find(
    (operation) =>
      operation.role === 'MEASUREMENT' &&
      dataset.plannedExecutionItemId ===
        plannedMeasurementIdentity(model.snapshot.id, subjectId, operation.id),
  );
}

function representativeValue(
  summary: SubjectMeasurementSummary | undefined,
  values: readonly SubjectMeasurementValue[],
  results: SubjectMeasurementResultSet,
) {
  if (summary) return String(summary.value.value);
  const effective = effectiveSubjectMeasurementValues(
    values,
    results.validityDecisions,
  )
    .map((value) => value.value)
    .filter(
      (value): value is { dataType: 'NUMBER'; value: number } =>
        value.dataType === 'NUMBER',
    );
  if (!effective.length) return null;
  return String(
    Number(
      (
        effective.reduce((total, value) => total + value.value, 0) /
        effective.length
      ).toFixed(4),
    ),
  );
}

export function projectMeasurementEvidence(
  model: ExperimentWorkspaceModel,
  results: SubjectMeasurementResultSet,
  catalog: ReferenceCatalog,
  executionEvidence: readonly ActualExecutionEvidence[],
): MeasurementEvidenceProjection[] {
  const validity = currentSubjectMeasurementValidity(results.validityDecisions);
  return results.datasets.flatMap((dataset) => {
    if (dataset.experimentRunId !== model.snapshot.id) return [];
    const execution = results.executions.find(
      (candidate) => candidate.id === dataset.measurementExecutionId,
    );
    if (!execution) return [];
    const datasetValues = results.values.filter(
      (value) => value.datasetId === dataset.id,
    );
    const subjects = [
      ...new Set([
        ...execution.subjectIds,
        ...datasetValues.map((value) => value.subjectId),
      ]),
    ];
    return subjects.flatMap((subjectId) => {
      const subject = model.subjects.find(
        (candidate) => candidate.id === subjectId,
      );
      const operation = operationForDataset(model, dataset, subjectId);
      if (!subject || !operation) return [];
      const subjectValues = datasetValues.filter(
        (value) => value.subjectId === subjectId,
      );
      const parameterIds = [
        ...new Set(
          subjectValues
            .map((value) => value.parameterDefinitionId)
            .filter((id): id is string => !!id),
        ),
      ];
      return parameterIds.map((parameterId) => {
        const parameter = resolveById(catalog.parameters, parameterId);
        const measurementDefinition = resolveById(
          catalog.measurementOperations,
          execution.measurementOperationDefinitionId,
        );
        const values = subjectValues.filter(
          (value) => value.parameterDefinitionId === parameterId,
        );
        const representative = results.summaries.find(
          (summary) =>
            summary.datasetId === dataset.id &&
            summary.subjectId === subjectId &&
            summary.parameterDefinitionId === parameterId,
        );
        const first = values[0];
        const sites = values
          .filter(
            (
              value,
            ): value is SubjectMeasurementValue & { siteIdentity: string } =>
              value.granularity === 'SITE' && !!value.siteIdentity,
          )
          .map((value) => {
            const decision = validity.get(value.id);
            return {
              measurementValue: value,
              siteIdentity: value.siteIdentity,
              coordinates: value.coordinateValues.map((coordinate) => ({
                definitionId: coordinate.coordinateDefinitionId,
                value: coordinate.value,
              })),
              value: displayValue(value.value),
              validity: decision?.state ?? 'INCLUDED',
              exclusionReason: decision?.reason ?? null,
            };
          });
        return {
          runId: model.snapshot.id,
          subject,
          operation,
          measurementExecution: execution,
          dataset,
          measurementDefinition,
          parameter,
          unit: unitSymbol(
            catalog,
            first?.unitDefinitionId ?? parameter.unitId,
          ),
          grain: sites.length ? ('SITE' as const) : ('SUBJECT' as const),
          representative: representative ?? null,
          representativeValue: representativeValue(
            representative,
            values,
            results,
          ),
          sites,
          linkedProcessExecutionEventId:
            dataset.executionEventId &&
            executionEvidence.some(
              (record) => record.event.id === dataset.executionEventId,
            )
              ? dataset.executionEventId
              : null,
          provenance: {
            sourceSystem: dataset.sourceSystem,
            sourceRecordReference: execution.sourceRecordReference,
            acquisitionMethod:
              first?.acquisitionMethod ?? execution.acquisitionMethod,
            collectedAt: dataset.collectedAt,
            datasetOrigin: dataset.datasetOrigin,
          },
        };
      });
    });
  });
}

/** Expected cells are projected from the existing measurement plan, never fabricated datasets. */
export function measurementRowsForOperation(
  model: ExperimentWorkspaceModel,
  operationId: string,
  catalog: ReferenceCatalog,
  projections: readonly MeasurementEvidenceProjection[],
) {
  const rows = new Map<
    string,
    {
      key: string;
      point: string;
      parameterId: string;
      label: string;
      unit: string;
    }
  >();
  for (const plan of model.snapshot.measurements.filter(
    (plan) => plan.stepId === operationId,
  )) {
    plan.parameterDefinitionIds.forEach((id, index) => {
      const parameter = catalog.parameters.find((p) => p.id === id);
      const key = `${plan.point}:${id}`;
      rows.set(key, {
        key,
        point: plan.point,
        parameterId: id,
        label: parameter?.name ?? plan.parameters[index] ?? id,
        unit: parameter ? unitSymbol(catalog, parameter.unitId) : '',
      });
    });
  }
  for (const p of projections.filter((p) => p.operation.id === operationId)) {
    const key = `${p.measurementExecution.measurementPoint}:${p.parameter.id}`;
    rows.set(key, {
      key,
      point: p.measurementExecution.measurementPoint,
      parameterId: p.parameter.id,
      label: p.parameter.name,
      unit: p.unit,
    });
  }
  return [...rows.values()];
}

export function measurementParticipationState(
  participates: boolean,
  projection?: MeasurementEvidenceProjection,
) {
  if (projection)
    return projection.representativeValue !== null
      ? 'COLLECTED'
      : participates
        ? 'PENDING'
        : 'OUT_OF_PLAN';
  return participates ? 'PENDING' : 'NOT_PARTICIPATING';
}
