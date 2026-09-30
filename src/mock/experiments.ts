import {
  experimentSeriesSchema,
  experimentIntentSchema,
  type ExperimentRepository,
} from '@/src/domain/experiment';
import {
  assembleContexts,
  runStateSchema,
} from '@/src/domain/experiment/context';
import { definitions, conditionSeeds } from './reference';
import { materialCatalog, createMockMaterialRepository } from './materials';
import { projects, projectRelations } from './projects';
import { ExperimentConfigurationResolver } from '@/src/domain/experiment/configuration';
export const series = experimentSeriesSchema.parse({
  id: 'dts-improvement',
  title: 'DTS Improvement',

  experimentTypeDefinitionId: 'type-process-v1',
  owner: 'Lee Seunghyun',
  status: 'Active',
  createdAt: '2026-08-24T09:00:00+09:00',
  targets: [
    {
      id: 'target-dts',
      parameterDefinitionId: 'parameter-dts-v1',
      operator: 'GTE',
      threshold: 4.4,
      lowerBound: null,
      upperBound: null,
      unitDefinitionId: null,
    },
    {
      id: 'target-bcd',
      parameterDefinitionId: 'parameter-bcd-v1',
      operator: 'BETWEEN',
      threshold: null,
      lowerBound: 16.8,
      upperBound: 17.2,
      unitDefinitionId: 'unit-nm',
    },
    {
      id: 'target-3sig',
      parameterDefinitionId: 'parameter-3sig-v1',
      operator: 'LTE',
      threshold: 1.3,
      lowerBound: null,
      upperBound: null,
      unitDefinitionId: 'unit-nm',
    },
  ],
  summaryResults: [
    {
      id: 'summary-result-1',
      title: 'Baseline finding',
      statement: 'Baseline DTS remained below target.',
      relatedRunIds: ['run-1'],
      relatedWaferRefs: ['RSA6417.06'],
      recordedAt: '2026-08-24T18:00:00+09:00',
    },
    {
      id: 'summary-result-2',
      title: 'Current finding',
      statement: 'D035 Rev.2 and Energy 35 achieved the configured KPIs.',
      relatedRunIds: ['run-4'],
      relatedWaferRefs: ['RSA6420.01'],
      recordedAt: '2026-09-02T18:00:00+09:00',
    },
  ],
  defaultConfiguration: {
    id: 'series-default-dts-r1',
    sourceId: null,
    sourceKind: null,
    areaDefinitionRevisionId: 'area-cmp-v1',
    items: [
      [
        'default-operation',
        'OPERATION',
        'M2 CU CMP',
        'operation-m2-cu-cmp-v1',
        null,
        null,
        'PROCESS',
      ],
      [
        'default-pressure',
        'CONDITION',
        'Pressure',
        'condition-pressure-v1',
        { dataType: 'NUMBER', value: 3 },
        'psi',
        'PROCESS',
      ],
      [
        'default-material',
        'MATERIAL',
        'Material / Sample',
        'condition-material-v1',
        { dataType: 'TEXT', value: 'D035 Rev01' },
        null,
        'MATERIAL',
      ],
      [
        'default-bcd',
        'MEASUREMENT',
        'BCD',
        'parameter-bcd-v1',
        null,
        'nm',
        'MEASUREMENT',
      ],
      [
        'default-dts',
        'MEASUREMENT',
        'DTS',
        'parameter-dts-v1',
        null,
        null,
        'MEASUREMENT',
      ],
      [
        'default-sigma',
        'MEASUREMENT',
        '3SIG',
        'parameter-sigma-v1',
        null,
        'nm',
        'MEASUREMENT',
      ],
      [
        'default-criterion',
        'EVALUATION_CRITERION',
        'DTS ≥ 4.4',
        'criterion-dts-min-v1',
        null,
        null,
        'EVALUATION',
      ],
    ].map(
      ([
        id,
        kind,
        label,
        referenceRevisionId,
        value,
        unit,
        semanticCategory,
      ]) => ({
        id,
        kind,
        label,
        referenceRevisionId,
        value,
        unit,
        semanticCategory,
        provenance: 'SERIES_DEFAULT',
        state: 'INHERITED',
        createdBy: null,
        createdAt: null,
      }),
    ),
  },
});
export const run4Configuration = ExperimentConfigurationResolver.addAdHoc(
  ExperimentConfigurationResolver.override(
    ExperimentConfigurationResolver.fromSeriesDefault(
      series.defaultConfiguration!,
      'run-4-configuration',
    ),
    'default-pressure',
    { dataType: 'NUMBER', value: 3.2 },
  ),
  {
    id: 'run-4-edge-purge-offset',
    kind: 'CONDITION',
    label: 'Edge Purge Offset',
    value: { dataType: 'NUMBER', value: 2.5 },
    unit: 'mm',
    semanticCategory: 'PROCESS',
    createdBy: 'Lee Seunghyun',
    createdAt: '2026-09-02T09:00:00+09:00',
  },
);
run4Configuration.items.push({
  id: 'run-4-ler',
  kind: 'MEASUREMENT',
  label: 'LER',
  referenceRevisionId: 'parameter-ler-v1',
  value: null,
  unit: 'nm',
  provenance: 'RUN_OVERRIDE',
  state: 'ADDED',
  semanticCategory: 'MEASUREMENT',
  createdBy: null,
  createdAt: null,
});
export const run5Configuration =
  ExperimentConfigurationResolver.fromPreviousRun(
    run4Configuration,
    'run-5-configuration',
  );
run5Configuration.items.push({
  id: 'run-5-clean',
  kind: 'OPERATION',
  label: 'Clean',
  referenceRevisionId: 'operation-clean-v1',
  value: null,
  unit: null,
  provenance: 'RUN_OVERRIDE',
  state: 'ADDED',
  semanticCategory: 'PROCESS',
  createdBy: null,
  createdAt: null,
});
export const intents = [
  experimentIntentSchema.parse({
    id: 'intent-dts-improvement',
    experimentSeriesId: series.id,
    purpose: 'Improve DTS while maintaining BCD.',
    hypothesis:
      'Increasing Energy will improve DTS without significantly degrading BCD.',
    targets: [
      {
        id: 'target-dts',
        statement: 'DTS ≥ 4.4',
        measurementDefinitionId: 'metric-dts-v1',
      },
      {
        id: 'target-bcd',
        statement: 'BCD within the target range',
        measurementDefinitionId: 'metric-bcd-v1',
      },
    ],
    createdAt: series.createdAt,
  }),
];
const values = [
  [30, 'D031', 3.9, 17.4, 1.52],
  [32, 'D031', 4.1, 17.3, 1.42],
  [32, 'D035', 4.3, 17.2, 1.31],
  [35, 'D035', 4.5, 17.1, 1.21],
] as const;
const conclusions = [
  'Baseline DTS is below the improvement target.',
  'Higher energy produced a modest DTS improvement.',
  'Material D035 improved DTS and reduced variation.',
  'Higher energy improved DTS without significant BCD degradation.',
];
const reasons = [
  'BCD is elevated and 3σ remains high.',
  'BCD moved toward target, but the DTS gain is limited.',
  '3σ decreased while BCD moved closer to 17 nm.',
  '3σ improved and BCD stayed within target range.',
];
const nextActions = [
  'Increase Energy to 32.',
  'Evaluate Sample D035 Revision 2 at Energy 32.',
  'Increase Energy to 35 with Sample D035 Revision 2.',
  'Test Energy 36–38 range.',
];
function executionIdentity(n: number, date: string, runId: string) {
  const waferNumbers = n === 4 ? [1, 2, 3, 4, 5] : [1];
  const physicalWafers = waferNumbers.map((wafer) => ({
    id: `pw-${n}-${wafer}`,
    canonicalLabel:
      n === 4 ? `PW-${String(wafer).padStart(3, '0')}` : `PW-${n}01`,
    status: 'ACTIVE' as const,
  }));
  const waferIdentityObservations = waferNumbers.flatMap((wafer) => {
    const physicalWaferId = `pw-${n}-${wafer}`;
    const changed = n === 4 && wafer === 1;
    return [
      {
        id: `observation-${n}-${wafer}-pre`,
        physicalWaferId,
        observedLotId: n === 4 ? 'RSA6420' : `RSA64${16 + n}`,
        observedWaferId:
          n === 4
            ? `RSA6420.${String(wafer).padStart(2, '0')}`
            : `RSA64${16 + n}.06`,
        slotPosition: n === 4 ? String(10 + wafer).padStart(2, '0') : '06',
        operationDefinitionId: 'operation-m2-cu-cmp-v1',
        observedOperationCode: 'PRE_METROLOGY',
        observedAt: `${date}T11:05:00+09:00`,
        sourceSystem: 'Mock MES',
        sourceRecordReference: `MES-${n}-${wafer}-PRE`,
        identityStatus: 'CONFIRMED' as const,
      },
      {
        id: `observation-${n}-${wafer}-process`,
        physicalWaferId,
        observedLotId: n === 4 ? 'RSA6420' : `RSA64${16 + n}`,
        observedWaferId:
          n === 4
            ? `RSA6420.${String(wafer).padStart(2, '0')}`
            : `RSA64${16 + n}.06`,
        slotPosition: n === 4 ? String(10 + wafer).padStart(2, '0') : '06',
        operationDefinitionId: 'operation-m2-cu-cmp-v1',
        observedOperationCode: 'M2_CU_CMP',
        observedAt: `${date}T14:21:00+09:00`,
        sourceSystem: 'Mock MES',
        sourceRecordReference: `MES-${n}-${wafer}-CMP`,
        identityStatus: 'CONFIRMED' as const,
      },
      {
        id: `observation-${n}-${wafer}-post`,
        physicalWaferId: changed ? null : physicalWaferId,
        observedLotId: changed
          ? 'TT3312914'
          : n === 4
            ? 'RSA6420'
            : `RSA64${16 + n}`,
        observedWaferId: changed
          ? 'TT3312914.01'
          : n === 4
            ? `RSA6420.${String(wafer).padStart(2, '0')}`
            : `RSA64${16 + n}.06`,
        slotPosition: changed
          ? '01'
          : n === 4
            ? String(10 + wafer).padStart(2, '0')
            : '06',
        operationDefinitionId: 'operation-m2-cu-cmp-v1',
        observedOperationCode: 'POST_METROLOGY',
        observedAt: `${date}T15:40:00+09:00`,
        sourceSystem: 'Mock Metrology',
        sourceRecordReference: `MET-${n}-${wafer}-POST`,
        identityStatus: changed
          ? ('CANDIDATE' as const)
          : ('CONFIRMED' as const),
      },
    ];
  });
  return {
    physicalWafers,
    plannedExecutionItems: waferNumbers.flatMap((wafer) => [
      {
        id: `planned-${n}-${wafer}-process`,
        experimentRunId: runId,
        waferSubjectId:
          n === 4
            ? `RSA6420.${String(wafer).padStart(2, '0')}`
            : `RSA64${16 + n}.06`,
        processStepId: `process-step-${n}-1`,
        operationRole: 'PROCESS' as const,
        operationDefinitionId: 'operation-m2-cu-cmp-v1',
        measurementOperationDefinitionId: null,
        plannedEquipment: wafer === 3 ? 'CMP-05' : 'CMP-03',
        plannedRecipe: wafer === 2 ? 'RSAcucmp_002' : 'RSAcucmp_001',
        conditionAssignmentIds: [`value-${n}-pressure`],
        sequence: 0,
        measurementPoint: null,
      },
      {
        id: `planned-${n}-${wafer}-measurement`,
        experimentRunId: runId,
        waferSubjectId:
          n === 4
            ? `RSA6420.${String(wafer).padStart(2, '0')}`
            : `RSA64${16 + n}.06`,
        processStepId: `process-step-${n}-1`,
        operationRole: 'MEASUREMENT' as const,
        operationDefinitionId: null,
        measurementOperationDefinitionId: 'measurement-operation-cmp-metro-v1',
        plannedEquipment: 'MET-07',
        plannedRecipe: 'CMP_METRO_POST',
        conditionAssignmentIds: [],
        sequence: 1,
        measurementPoint: 'POST' as const,
      },
    ]),
    waferIdentityObservations,
    waferIdentityCandidates:
      n === 4
        ? [
            {
              observationId: 'observation-4-1-post',
              candidatePhysicalWaferId: 'pw-4-1',
              confidence: 0.86,
              reason:
                'Historical wafer lineage, operation order, and elapsed-time relationship.',
            },
          ]
        : [],
    execution: waferNumbers.map((wafer) => ({
      id: `execution-${n}-${wafer}`,
      experimentRunId: runId,
      processStepId: `process-step-${n}-1`,
      plannedExecutionItemId: `planned-${n}-${wafer}-process`,
      physicalWaferId: `pw-${n}-${wafer}`,
      waferIdentityObservationId: `observation-${n}-${wafer}-process`,
      observedOperation: 'M2 CU CMP',
      observedRecipe: 'RSAcucmp_001',
      equipment: 'CMP-03',
      startedAt: `${date}T14:21:00+09:00`,
      endedAt: `${date}T14:37:00+09:00`,
      executionStatus: 'COMPLETED' as const,
      sourceSystem: 'Mock MES',
      sourceRecordReference: `MES-${n}-${wafer}-EXEC`,
    })),
  };
}
export const runStates = values.map((v, i) => {
  const n = i + 1,
    id = `run-${n}`,
    date = ['2026-08-24', '2026-08-27', '2026-08-31', '2026-09-02'][i];
  return runStateSchema.parse({
    run: {
      id,
      seriesId: series.id,
      configurationPackageVersionId: 'config-package-cmp-v1',
      runNumber: n,
      title: `${i === 0 ? 'Baseline' : 'Iteration'} · Energy ${v[0]} / ${v[1]}`,
      status: 'Completed',
      startedAt: `${date}T09:10:00+09:00`,
      completedAt: `${date}T16:45:00+09:00`,
      previousRunId: i ? `run-${i}` : null,
    },
    operationPlan: {
      id: `operation-plan-${n}`,
      experimentRunId: id,
      steps: [
        {
          id: `process-step-${n}-1`,
          operationDefinitionId: 'operation-m2-cu-cmp-v1',
          order: 0,
          label: 'M2 CU CMP',
        },
      ],
    },
    conditionSet: {
      id: `conditions-${n}`,
      experimentRunId: id,
      inheritedFromRunId: i ? `run-${i}` : null,
      conditions: conditionSeeds.map(([code, , dataType, , defaultValue]) => ({
        id: `value-${n}-${code}`,
        conditionDefinitionId: `condition-${code}-v1`,
        value: { dataType, value: code === 'energy' ? v[0] : defaultValue },
        intentRole: code === 'energy' ? 'VARIED' : 'FIXED',
        operationStepId: `process-step-${n}-1`,
        waferSubjectId: null,
        positionId: null,
      })),
      materialConditions: [
        {
          id: `material-condition-${n}`,
          conditionDefinitionId: 'condition-material-v1',
          bindingKey: 'primary',
          materialUsageId: `usage-${n}`,
        },
      ],
    },
    materialUsages: [
      {
        id: `usage-${n}`,
        sampleRevisionId: `sample-${v[1]}-r${v[1] === 'D031' ? 3 : i === 2 ? 1 : 2}`,
        experimentRunId: id,
        waferSubjectId: n === 4 ? 'RSA6420.01' : `RSA64${16 + n}.06`,
        processStepId: null,
        projectId: projects[0].id,
        role: 'Candidate',
        intentRole: i >= 2 ? 'VARIED' : 'FIXED',
      },
    ],
    resourceUsages: [
      {
        id: `resource-usage-${n}-pad-default`,
        experimentRunId: id,
        processStepId: `process-step-${n}-1`,
        resourceDefinitionId: 'resource-pad-ic1000-r1',
        waferSubjectId: null,
        intentRole: 'FIXED',
        provenance: 'SERIES_DEFAULT',
      },
      ...(n === 4
        ? [
            {
              id: 'resource-usage-4-pad-wafer-1',
              experimentRunId: id,
              processStepId: 'process-step-4-1',
              resourceDefinitionId: 'resource-pad-ic1000-r1',
              waferSubjectId: 'RSA6420.01',
              intentRole: 'VARIED' as const,
              provenance: 'WAFER_OVERRIDE' as const,
            },
          ]
        : []),
    ],
    recipeAssignments: [
      {
        id: `recipe-assignment-${n}`,
        experimentRunId: id,
        processStepId: `process-step-${n}-1`,
        recipeRevisionId: 'recipe-rsacucmp-001-r1',
        waferSubjectId: null,
        intentRole: n === 4 ? 'VARIED' : 'FIXED',
        provenance: n === 4 ? 'RUN_SNAPSHOT' : 'SERIES_DEFAULT',
      },
    ],
    ...executionIdentity(n, date, id),
    measurements: ['metric-dts-v1', 'metric-bcd-v1', 'metric-sigma-v1'].map(
      (measurementDefinitionId, j) => ({
        id: `measurement-${n}-${j}`,
        experimentRunId: id,
        measurementDefinitionId,
        value: { dataType: 'NUMBER', value: v[j + 2] },
        layer: 'CURATED',
      }),
    ),
    evidence: (
      [
        {
          type: 'Chart',
          title: 'DTS progression',
          snapshotPath: `/evidence/run-${n}-chart.svg`,
          description: 'Curated DTS values across experiment runs.',
        },
        {
          type: 'Wafer Map',
          title: 'Within-wafer uniformity',
          snapshotPath: `/evidence/run-${n}-wafer.svg`,
          description:
            'Illustrative wafer map. Spatial values are mock visualization data, not measured site values.',
        },
        {
          type: 'Report',
          title: `Run ${n} measurement summary`,
          snapshotPath: `/evidence/run-${n}-report.txt`,
          description: 'Frozen mock measurement summary and execution context.',
        },
      ] as const
    ).map((e, j) => ({
      ...e,
      id: `evidence-${n}-${j}`,
      experimentRunId: id,
      sourceSystem: 'Native DXT LIMS mock metrology',
    })),
    decision: {
      id: `decision-${n}`,
      experimentRunId: id,
      evaluations: [
        {
          evaluationDefinitionId: 'evaluation-relative-v1',
          value: {
            dataType: 'SELECT',
            value: ['WORSE', 'SIMILAR', 'BETTER', 'BETTER'][i],
          },
        },
      ],
      criterionAssessments: ['dts-min', 'bcd-range', 'sigma-max'].map(
        (key, j) => ({
          evaluationCriterionDefinitionId: `criterion-${key}-v1`,
          measurementSummaryId: `measurement-${n}-${j}`,
          status: (
            [
              ['FAIL', 'FAIL', 'FAIL'],
              ['FAIL', 'FAIL', 'FAIL'],
              ['FAIL', 'PASS', 'FAIL'],
              ['PASS', 'PASS', 'PASS'],
            ] as const
          )[i][j],
          evidenceIds: [`evidence-${n}-2`],
        }),
      ),
      conclusion: conclusions[i],
      reason: reasons[i],
      nextAction: {
        nextActionTypeDefinitionId:
          i === 3 ? 'next-action-design-next' : 'next-action-retry',
        note: nextActions[i],
      },
      recordedBy: series.owner,
      recordedAt: `${date}T17:00:00+09:00`,
    },
  });
});
export const contexts = assembleContexts({
  series: [series],
  intents,
  projects,
  projectRelations,
  definitions,
  materials: materialCatalog,
  runs: runStates,
});
export const selectedContext = contexts[contexts.length - 1];
export const getContext = (n: number) =>
  contexts.find((c) => c.run.runNumber === n);
export const previousContext = (c: typeof selectedContext) =>
  contexts.find((p) => p.run.id === c.run.previousRunId);
export const mockRepository: ExperimentRepository = {
  async getSeries(id) {
    return id === series.id ? series : null;
  },
  async getContext(id) {
    return contexts.find((c) => c.run.id === id) ?? null;
  },
  async listRuns(id) {
    return contexts.filter((c) => c.run.seriesId === id).map((c) => c.run);
  },
};
export const mockMaterialRepository = createMockMaterialRepository(
  runStates.flatMap((s) => s.materialUsages),
);
