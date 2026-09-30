'use client';
import EngineeringGrid from './engineering-grid';
import { actualExecutionScenarios } from '@/src/mock/actual-execution';
import { engineeringGridMeasurementScenarios } from '@/src/mock/engineering-grid-measurements';
import { engineeringGridEvaluationScenarios } from '@/src/mock/engineering-grid-evaluations';
import { engineeringGridDecisionScenarios } from '@/src/mock/engineering-grid-decisions';
import { definitions } from '@/src/mock/reference';
import { runPlanningScenarios } from './planning-model';
import { createExperimentWorkspace } from './workspace-model';
import { normalizeLegacyWaferMeasurements } from '@/src/domain/measurement/legacy-wafer-compatibility';
import { normalizeLegacySemiconductorExecution } from './legacy-semiconductor-execution-adapter';
import { useDxtApplication } from '@/src/application/dxt-application-provider';

// Demo adapter only. The reusable grid receives resolved context and SubjectRef values.
export default function EngineeringGridScenario({
  scenario,
}: {
  scenario: 'PHOTO' | 'CMP';
}) {
  const { application } = useDxtApplication();
  const snapshot = runPlanningScenarios[scenario];
  const model = {
    ...createExperimentWorkspace(snapshot, application.repositories.configuration),
    subjects: snapshot.candidateSubjects ?? snapshot.subjects,
  };
  return (
    <EngineeringGrid
      model={model}
      seriesSlug={scenario === 'CMP' ? 'cmp-stability' : 'dts-improvement'}
      returnHref={
        scenario === 'CMP'
          ? '/series/cmp-stability/runs/12/workspace'
          : '/series/dts-improvement/runs/18/workspace'
      }
      actualEvidence={normalizeLegacySemiconductorExecution(
        actualExecutionScenarios[scenario],
      )}
      measurementResults={normalizeLegacyWaferMeasurements(
        engineeringGridMeasurementScenarios[scenario],
      )}
      referenceCatalog={definitions}
      evaluationTargetBindings={
        engineeringGridEvaluationScenarios[scenario].bindings
      }
      engineerEvaluations={
        engineeringGridEvaluationScenarios[scenario].engineerEvaluations
      }
      decisionContext={engineeringGridDecisionScenarios[scenario].context}
      nextRunPreview={engineeringGridDecisionScenarios[scenario].nextRunPreview}
    />
  );
}
