import {
  savedAnalysisViewSchema,
  projectAnalysisRows,
  type AnalysisMeasurementSource,
  type AnalysisSelection,
  type SavedAnalysisView,
} from '@/src/domain/analysis';

export interface SavedAnalysisViewRepository {
  list(): SavedAnalysisView[];
  get(id: string): SavedAnalysisView | null;
  save(view: SavedAnalysisView): void;
}

export class InMemorySavedAnalysisViewRepository
  implements SavedAnalysisViewRepository
{
  constructor(private views: SavedAnalysisView[] = []) {}

  list() {
    return structuredClone(this.views);
  }

  get(id: string) {
    return structuredClone(this.views.find((view) => view.id === id) ?? null);
  }

  save(view: SavedAnalysisView) {
    const parsed = savedAnalysisViewSchema.parse(view);
    this.views = [parsed, ...this.views.filter((item) => item.id !== parsed.id)];
  }
}

export function resolveSavedAnalysisView(
  view: SavedAnalysisView,
  sources: readonly AnalysisMeasurementSource[],
) {
  const missingReferences: string[] = [];
  const selectedSources=sources.filter(source=>view.runIds.includes(source.runId));
  for(const id of view.runIds)if(!selectedSources.some(source=>source.runId===id))missingReferences.push(`Run · ${id}`);
  for(const id of view.datasetIds)if(!selectedSources.some(source=>source.measurements.datasets.some(dataset=>dataset.id===id)))missingReferences.push(`Dataset · ${id}`);
  for(const id of view.subjectIds)if(!selectedSources.some(source=>source.subjects.some(subject=>subject.id===id)))missingReferences.push(`Subject · ${id}`);
  for(const id of view.parameterIds)if(!selectedSources.some(source=>id in source.parameterLabels))missingReferences.push(`Parameter · ${id}`);
  for (const reference of view.sourceReferences) {
    const source = sources.find(
      (item) =>
        item.studyId === reference.studyId && item.runId === reference.runId,
    );
    if (!source) {
      missingReferences.push(`Run · ${reference.runId}`);
      continue;
    }
    const dataset = source.measurements.datasets.find(
      (item) => item.id === reference.datasetId,
    );
    if (!dataset) {
      missingReferences.push(`Dataset · ${reference.datasetId}`);
      continue;
    }
    if (dataset.measurementExecutionId !== reference.measurementExecutionId)
      missingReferences.push(
        `MeasurementExecution · ${reference.measurementExecutionId ?? 'missing'}`,
      );
    if (!source.subjects.some((item) => item.id === reference.subjectId))
      missingReferences.push(`Subject · ${reference.subjectId}`);
    if (!(reference.parameterId in source.parameterLabels))
      missingReferences.push(`Parameter · ${reference.parameterId}`);
    if (
      !source.measurements.values.some(
        (item) =>
          item.datasetId === reference.datasetId &&
          item.subjectId === reference.subjectId &&
          item.parameterDefinitionId === reference.parameterId,
      )
    )
      missingReferences.push(
        `Dataset observation · ${reference.datasetId} / ${reference.subjectId} / ${reference.parameterId}`,
      );
    if (
      reference.representativeResultId &&
      !source.measurements.summaries.some(
        (item) => item.id === reference.representativeResultId && item.datasetId === reference.datasetId && item.subjectId === reference.subjectId && item.parameterDefinitionId === reference.parameterId,
      )
    )
      missingReferences.push(
        `Representative Result · ${reference.representativeResultId}`,
      );
  }
  const selection: AnalysisSelection = {
    studyId: view.studyId,
    runIds: [...view.runIds],
    datasetIds: [...view.datasetIds],
    parameterIds: [...view.parameterIds],
    subjectIds: [...view.subjectIds],
    aggregation: view.preparation.aggregation,
    datasetOrigin: view.preparation.datasetOrigin,
    includeExcluded: view.preparation.includeExcluded,
  };
  return { selection, missingReferences: [...new Set(missingReferences)] };
}

/** A saved representative pin must not be replaced by another summary of the same parameter. */
export function projectSavedAnalysisRows(view: SavedAnalysisView, sources: readonly AnalysisMeasurementSource[]) {
  const restored=resolveSavedAnalysisView(view,sources);
  if(restored.missingReferences.length)return [];
  const pinnedIds=new Set(view.sourceReferences.flatMap(ref=>ref.representativeResultId?[ref.representativeResultId]:[]));
  return projectAnalysisRows(sources.map(source=>({...source,measurements:{...source.measurements,summaries:source.measurements.summaries.filter(summary=>pinnedIds.has(summary.id))}})),restored.selection);
}
