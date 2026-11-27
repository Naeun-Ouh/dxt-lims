import { effectiveAssignments } from '@/src/features/run-registration/planning-model';
import type { RunPlanningSnapshot } from '@/src/features/run-registration/planning-model';
import {
  validateVariableValue,
  type VariableEditor,
} from '@/src/features/run-registration/applicability';
import {
  resolveConfigurationApplicability,
  type ConfigurationRegistrySource,
  type ReferenceCatalog,
} from '@/src/domain/reference';

export type ReadinessLayer = {
  status: 'READY' | 'NOT_READY' | 'NOT_CONFIGURED';
  missing: string[];
};
const layer = (
  missing: string[],
): { status: 'READY' | 'NOT_READY'; missing: string[] } => ({
  status: missing.length ? 'NOT_READY' : 'READY',
  missing: [...new Set(missing)],
});

/** Only execution structure gates creation. Never invent assignments, Targets or evidence. */
export function executionReadiness(
  snapshot: RunPlanningSnapshot,
  configuration: ConfigurationRegistrySource,
  catalog: ReferenceCatalog,
) {
  const warnings:string[]=[];
  const flexible=snapshot.conditionResolution==='GROUPS_V2';
  for(const [op,design] of Object.entries(snapshot.operationDesign??{}))for(const [subject,a] of Object.entries(design.allocations))if(a.state==='UNASSIGNED')warnings.push(`Unassigned Subject: {0}.|${snapshot.steps.find(s=>s.id===op)?.label??op} · ${subject}`);
  const missing: string[] = [],
    measurementMissing: string[] = [];
  if (!snapshot.subjects.length)
    missing.push('Add and save at least one Subject.');
  if (!snapshot.steps.length) missing.push('Add and save ordered Operations.');
  const registry = configuration.getConfigurationRegistry();
  const pkg = registry.packages.find(
    (p) => p.id === snapshot.configurationPackageVersionId,
  );
  const profile = registry.experimentTypeProfiles.find(
    (p) => p.id === snapshot.experimentTypeProfileVersionId,
  );
  if (
    !pkg ||
    !profile ||
    !pkg.experimentTypeProfileVersionIds.includes(profile.id) ||
    !pkg.subjectTypeRevisionIds.includes(snapshot.subjectTypeRevisionId) ||
    !profile.subjectTypeRevisionIds.includes(snapshot.subjectTypeRevisionId)
  )
    missing.push('Select an eligible exact configuration for this Study.');
  for (const op of snapshot.steps) {
    if (op.role === 'MEASUREMENT') {
      const plans = snapshot.measurements.filter((m) => m.stepId === op.id);
      if (!plans.length)
        (flexible?warnings:measurementMissing).push(
          `Complete the Measurement plan for {0}.|${op.label}`,
        );
      for (const plan of plans) {
        if (
          !plan.parameterDefinitionIds.length ||
          plan.measurementOperationDefinitionId !== op.operationDefinitionId ||
          plan.point !== op.measurementPoint ||
          plan.parameterDefinitionIds.some((id) => {
            const p = catalog.parameters.find((p) => p.id === id);
            return (
              !p ||
              p.measurementOperationDefinitionId !== op.operationDefinitionId ||
              !p.supportedMeasurementPoints.includes(plan.point) ||
              p.requiredSupportingParameterIds.some(
                (s) => !plan.parameterDefinitionIds.includes(s),
              )
            );
          })
        )
          measurementMissing.push(
            `Select compatible parameters and a Measurement point for {0}.|${op.label}`,
          );
      }
      continue;
    }
    if (!op.context) {
      missing.push(`Select an eligible exact configuration for this Study.`);
      continue;
    }
    try {
      const definitions = resolveConfigurationApplicability(configuration, {
        configurationPackageVersionId: snapshot.configurationPackageVersionId,
        operationDefinitionRevisionId: op.operationDefinitionId,
        areaDefinitionRevisionId: op.context.areaDefinitionRevisionId,
        subjectTypeRevisionId: snapshot.subjectTypeRevisionId,
        requestedGrainRevisionId: 'grain-subject-r1',
        equipmentReferenceId: op.context.equipmentReferenceId,
        moduleReferenceId: op.context.moduleReferenceId ?? undefined,
        experimentTypeProfileVersionId: snapshot.experimentTypeProfileVersionId,
      });
      for (const d of definitions) {
        for (const subject of snapshot.subjects.filter((s) =>
          snapshot.subjectOperationIds[s.id]?.includes(op.id),
        )) {
          const values = (flexible?Object.values(effectiveAssignments(snapshot,subject.id)):snapshot.assignments).filter(
            (a) =>
              a.processStepId === op.id &&
              (!a.subjectId || a.subjectId === subject.id) &&
              a.kind === d.assignmentKind &&
              (a.referenceId === d.assignmentReferenceRevisionId ||
                d.allowedOptions.some((o) => o.referenceId === a.referenceId)),
          );
          if (d.validationProfile?.required && !values.length)
            (flexible?warnings:missing).push(
              `Enter the required execution condition: {0}.|${op.label} · ${d.label}`,
            );
          for (const a of values) {
            try {
              if (!a.value.trim() && flexible) { if(d.validationProfile?.required)warnings.push(`Enter the required execution condition: {0}.|${op.label} · ${d.label}`); continue; }
              if (d.validationProfile?.required && !a.value.trim())throw new Error('empty');
              validateVariableValue(
                {
                  id: d.revisionId,
                  label: d.label,
                  editor: d.editorKey as VariableEditor,
                  options: d.allowedOptions,
                  allowedGrains: ['SUBJECT'],
                  applicabilityId: d.applicabilityRuleId,
                  assignmentKind: d.assignmentKind,
                  assignmentReferenceId: d.assignmentReferenceRevisionId,
                  defaultValue: '',
                  defaultGrain: 'SUBJECT',
                  defaultRole: d.defaultRole,
                },
                a.value,
              );
            } catch {
              missing.push(
                `Check the execution condition: {0}.|${op.label} · ${d.label}`,
              );
            }
          }
        }
      }
    } catch {
      missing.push('Select an eligible exact configuration for this Study.');
    }
  }
  return {
    execution: {...layer([...missing, ...measurementMissing]),warnings},
    measurement: snapshot.steps.some((o) => o.role === 'MEASUREMENT')
      ? layer(measurementMissing)
      : { status: 'NOT_CONFIGURED' as const, missing: [] },
  };
}
