'use client';
import EngineeringGrid from '@/src/features/run-registration/engineering-grid';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { definitions } from '@/src/mock/reference';
import {
  materialActualExecution,
  materialDecisionContext,
  materialEngineerEvaluations,
  materialEvaluationTargetBindings,
  materialMeasurementResults,
  materialRunPlanningSnapshot,
} from './material-rd-scenario';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

export default function MaterialEngineeringGrid() {
  const { application } = useDxtApplication();
  const model = createExperimentWorkspace(materialRunPlanningSnapshot, application.repositories.configuration);
  return <EngineeringGrid
    model={model}
    seriesSlug="adhesion-material-optimization"
    returnHref="/series/adhesion-material-optimization?view=runs"
    actualEvidence={materialActualExecution}
    measurementResults={materialMeasurementResults}
    referenceCatalog={definitions}
    evaluationTargetBindings={materialEvaluationTargetBindings}
    engineerEvaluations={materialEngineerEvaluations}
    decisionContext={materialDecisionContext.context}
    nextRunPreview={materialDecisionContext.nextRunPreview}
  />;
}
