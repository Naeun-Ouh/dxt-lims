import type { PlanningWorkspaceRecord } from '@/src/application/repository-ports';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';
import { createExperimentWorkspace } from './workspace-model';
import type { RunPlanningSnapshot } from './planning-model';

/** Restore the shared planning context; scope is a selection, not a new route. */
export function gridPlanningContext(record: PlanningWorkspaceRecord, configuration: ConfigurationRegistrySource) {
  const model = createExperimentWorkspace(record.snapshot, configuration);
  return { ...model, subjects: record.ranges.length ? model.subjects.filter(subject => record.ranges.some(range => range.subjectIds.includes(subject.id))) : model.subjects, scopeRanges: record.ranges.length ? record.ranges : undefined, manualFocus: record.manualFocus };
}
export function participatesInOperation(snapshot: RunPlanningSnapshot, subjectId: string, operationId: string) {
  return snapshot.subjectOperationIds[subjectId]?.includes(operationId) ?? false;
}
