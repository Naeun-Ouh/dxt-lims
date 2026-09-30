import { currentSubjectMeasurementValidity, subjectMeasurementResultSetSchema, type SubjectMeasurementResultSet } from '@/src/domain/measurement/subject-measurement';
import type { MeasurementQuery } from './repository-ports';

export function filterMeasurements(records: SubjectMeasurementResultSet[], query: MeasurementQuery) {
  const all = {
    executions: records.flatMap((item) => item.executions),
    datasets: records.flatMap((item) => item.datasets),
    values: records.flatMap((item) => item.values),
    summaries: records.flatMap((item) => item.summaries),
    validityDecisions: records.flatMap((item) => item.validityDecisions),
  };
  const datasetIds = new Set(all.datasets.filter((item) => !query.runIds || query.runIds.includes(item.experimentRunId)).map((item) => item.id));
  const latestValidity = currentSubjectMeasurementValidity(all.validityDecisions);
  const values = all.values.filter((item) =>
    datasetIds.has(item.datasetId) && (!query.datasetIds || query.datasetIds.includes(item.datasetId)) &&
    (!query.parameterDefinitionIds || (!!item.parameterDefinitionId && query.parameterDefinitionIds.includes(item.parameterDefinitionId))) &&
    (!query.subjectIds || query.subjectIds.includes(item.subjectId)) &&
    (!query.siteIdentities || (!!item.siteIdentity && query.siteIdentities.includes(item.siteIdentity))) &&
    (!query.coordinateDefinitionIds || query.coordinateDefinitionIds.every((id) => item.coordinateValues.some((coordinate) => coordinate.coordinateDefinitionId === id))) &&
    (!query.validity || (latestValidity.get(item.id)?.state ?? 'INCLUDED') === query.validity));
  const selectedDatasets = new Set(values.map((item) => item.datasetId));
  const selectedValues = new Set(values.map((item) => item.id));
  return subjectMeasurementResultSetSchema.parse({
    datasets: all.datasets.filter((item) => selectedDatasets.has(item.id)),
    values,
    executions: all.executions.filter((item) => !query.runIds || query.runIds.includes(item.experimentRunId)),
    summaries: all.summaries.filter((item) => selectedDatasets.has(item.datasetId) && item.sourceMeasurementIds.every(id=>selectedValues.has(id)) && (!query.subjectIds || query.subjectIds.includes(item.subjectId)) && (!query.parameterDefinitionIds || query.parameterDefinitionIds.includes(item.parameterDefinitionId))),
    validityDecisions: all.validityDecisions.filter((item) => selectedValues.has(item.measurementValueId)),
  });
}
