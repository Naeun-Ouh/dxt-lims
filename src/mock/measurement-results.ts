import { measurementResultSetSchema } from '@/src/domain/measurement';

const sites = [
  ['S01', -2, -2],
  ['S02', -2, 2],
  ['S03', 0, 0],
  ['S04', 2, -2],
  ['S05', 2, 2],
] as const;
const bcdSites = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1;
  return [`S${String(number).padStart(2, '0')}`, (index % 10) - 4.5, Math.floor(index / 10) - 4.5] as const;
});
const wafers = [
  'RSA6420.01',
  'RSA6420.02',
  'RSA6420.03',
  'RSA6420.04',
  'RSA6420.05',
];
const cdParameters = [
  ['parameter-bcd-v1', 'unit-nm', 17.0, 'BCD_AVG'],
  ['parameter-3sig-v1', 'unit-nm', 1.2, 'CD_3SIG'],
  ['parameter-ler-v1', 'unit-nm', 2.1, 'LER_MEAN'],
  ['parameter-lwr-v1', 'unit-nm', 2.7, 'LWR_MEAN'],
] as const;

export const measurementResults = measurementResultSetSchema.parse({
  executions: [
    {id:'measurement-execution-thk-pre-1',experimentRunId:'run-4',waferSubjectIds:['RSA6420.01'],measurementOperationDefinitionId:'measurement-operation-cmp-metro-v1',measurementPoint:'PRE',sequence:1,startedAt:'2026-09-02T09:00:00+09:00',completedAt:'2026-09-02T09:15:00+09:00',acquisitionMethod:'FILE_IMPORT',sourceSystem:'Thickness file import',sourceRecordReference:'THK-PRE-0900.xlsx'},
    {id:'measurement-execution-thk-post-1',experimentRunId:'run-4',waferSubjectIds:['RSA6420.01'],measurementOperationDefinitionId:'measurement-operation-cmp-metro-v1',measurementPoint:'POST',sequence:2,startedAt:'2026-09-02T11:00:00+09:00',completedAt:'2026-09-02T11:15:00+09:00',acquisitionMethod:'INTERFACE',sourceSystem:'Mock Thickness Metrology',sourceRecordReference:'THK-POST-1100'},
    {id:'measurement-execution-thk-post-repeat',experimentRunId:'run-4',waferSubjectIds:['RSA6420.01'],measurementOperationDefinitionId:'measurement-operation-cmp-metro-v1',measurementPoint:'POST',sequence:3,startedAt:'2026-09-02T11:45:00+09:00',completedAt:'2026-09-02T12:00:00+09:00',acquisitionMethod:'INTERFACE',sourceSystem:'Mock Thickness Metrology',sourceRecordReference:'THK-REPEAT-1145'},
  ],
  datasets: [
    {
      id: 'dataset-run-4-cdsem-post',
      experimentRunId: 'run-4',
      plannedExecutionItemId: 'planned-4-1-measurement',
      executionEventId: null,
      measurementOperationDefinitionId: 'measurement-operation-cdsem-v1',
      equipmentReference: 'CDSEM-04',
      measurementPoint: 'POST',
      sourceSystem: 'Mock CD-SEM',
      collectedAt: '2026-09-02T15:40:00+09:00',
      status: 'COLLECTED',
    },
    {
      id: 'dataset-run-4-thickness-post',
      experimentRunId: 'run-4',
      plannedExecutionItemId: 'planned-4-1-measurement',
      executionEventId: null,
      measurementExecutionId: 'measurement-execution-thk-post-1',
      measurementOperationDefinitionId: 'measurement-operation-cmp-metro-v1',
      equipmentReference: 'THK-02',
      measurementPoint: 'POST',
      sourceSystem: 'Mock Thickness Metrology',
      collectedAt: '2026-09-02T15:48:00+09:00',
      status: 'COLLECTED',
    },
  ],
  values: [
    ...wafers.flatMap((wafer, wi) =>
      cdParameters.flatMap(
        ([parameterDefinitionId, unitDefinitionId, base, source], pi) =>
          (wi === 0 && pi === 0 ? bcdSites : sites).map(([siteIdentity, x, y], si) => ({
            id: `value-cd-${wi}-${pi}-${si}`,
            datasetId: 'dataset-run-4-cdsem-post',
            waferSubjectId: wafer,
            physicalWaferId: `pw-4-${wi + 1}`,
            parameterDefinitionId,
            value: {
              dataType: 'NUMBER',
              value: Number(
                (wi === 0 && pi === 0
                  ? ([11, 37, 76].includes(si)
                      ? [24.71, 9.42, 23.86][[11, 37, 76].indexOf(si)]
                      : base + ((si % 10) - 4.5) * 0.012)
                  : base + wi * 0.04 + (si - 2) * (pi === 1 ? 0.015 : 0.05)
                ).toFixed(3),
              ),
            },
            unitDefinitionId,
            granularity: 'SITE',
            siteIdentity,
            coordinateValues: [
              { coordinateDefinitionId: 'coordinate-chip-x-v1', value: x },
              { coordinateDefinitionId: 'coordinate-chip-y-v1', value: y },
            ],
            observedAt: new Date(Date.parse('2026-09-02T15:40:00+09:00') + si * 1000).toISOString(),
            sourceParameterReference: source,
          })),
      ),
    ),
    ...wafers.flatMap((wafer, wi) =>
      sites.map(([siteIdentity, x, y], si) => ({
        id: `value-thickness-${wi}-${si}`,
        datasetId: 'dataset-run-4-thickness-post',
        waferSubjectId: wafer,
        physicalWaferId: `pw-4-${wi + 1}`,
        parameterDefinitionId: 'parameter-thickness-result-v1',
        value: {
          dataType: 'NUMBER',
          value: Number((498 + wi * 1.2 + (si - 2) * 0.7).toFixed(2)),
        },
        unitDefinitionId: 'unit-nm',
        granularity: 'SITE',
        siteIdentity,
        coordinateValues: [
          { coordinateDefinitionId: 'coordinate-position-x-v1', value: x * 25 },
          { coordinateDefinitionId: 'coordinate-position-y-v1', value: y * 25 },
        ],
        observedAt: `2026-09-02T15:${String(48 + si).padStart(2, '0')}:00+09:00`,
        sourceParameterReference: 'FILM_THK',
      })),
    ),
    {
      id: 'manual-adhesion-wafer-1', datasetId: 'dataset-run-4-cdsem-post', waferSubjectId: 'RSA6420.01', physicalWaferId: 'pw-4-1', parameterDefinitionId: null,
      value: { dataType: 'NUMBER', value: 4.5 }, unitDefinitionId: null, granularity: 'WAFER', siteIdentity: null, coordinateValues: [], observedAt: '2026-09-02T16:10:00+09:00', sourceParameterReference: null, acquisitionMethod: 'MANUAL', adHocParameter: { displayName: 'Adhesion Score', unit: 'score' },
    },
    {
      id: 'manual-visual-site-1', datasetId: 'dataset-run-4-cdsem-post', waferSubjectId: 'RSA6420.01', physicalWaferId: 'pw-4-1', parameterDefinitionId: null,
      value: { dataType: 'NUMBER', value: 4 }, unitDefinitionId: null, granularity: 'SITE', siteIdentity: 'S03', coordinateValues: [{ coordinateDefinitionId: 'coordinate-chip-x-v1', value: 0 }, { coordinateDefinitionId: 'coordinate-chip-y-v1', value: 0 }], observedAt: '2026-09-02T16:12:00+09:00', sourceParameterReference: null, acquisitionMethod: 'MANUAL', adHocParameter: { displayName: 'Visual Score', unit: 'score' },
    },
  ],
  summaries: [
    ...wafers.flatMap((wafer, wi) =>
      cdParameters.map(
        ([parameterDefinitionId, unitDefinitionId, base], pi) => {
          const summarySites = wi === 0 && pi === 0 ? bcdSites : sites;
          const sourceMeasurementIds = summarySites.map(
            (_, si) => `value-cd-${wi}-${pi}-${si}`,
          );
          return {
            id: `summary-cd-${wi}-${pi}`,
            datasetId: 'dataset-run-4-cdsem-post',
            waferSubjectId: wafer,
            parameterDefinitionId,
            aggregationMethod: pi === 1 ? 'THREE_SIGMA' : 'MEAN',
            value: {
              dataType: 'NUMBER',
              value: Number((base + wi * 0.04).toFixed(3)),
            },
            unitDefinitionId,
            sourceMeasurementIds,
            summaryOrigin: pi === 1 ? 'SOURCE' : 'DXT_CALCULATED',
            rawInputCount: sourceMeasurementIds.length,
            effectiveInputCount: wi === 0 && pi === 0 ? 97 : sourceMeasurementIds.length,
          };
        },
      ),
    ),
    ...wafers.map((wafer, wi) => ({
      id: `summary-thickness-${wi}`,
      datasetId: 'dataset-run-4-thickness-post',
      waferSubjectId: wafer,
      parameterDefinitionId: 'parameter-thickness-result-v1',
      aggregationMethod: 'MEAN',
      value: { dataType: 'NUMBER', value: Number((498 + wi * 1.2).toFixed(2)) },
      unitDefinitionId: 'unit-nm',
      sourceMeasurementIds: sites.map((_, si) => `value-thickness-${wi}-${si}`),
      summaryOrigin: 'DXT_CALCULATED',
      rawInputCount: sites.length,
      effectiveInputCount: sites.length,
    })),
  ],
  validityDecisions: [12, 38, 77].map((site, index) => ({
    id: `validity-bcd-s${site}`, measurementValueId: `value-cd-0-0-${site - 1}`, state: 'EXCLUDED',
    reason: ['Measurement error', 'Focus failure during capture', 'Contaminated site'][index], actor: 'Lee Seunghyun', decidedAt: `2026-09-02T16:${20 + index}:00+09:00`,
  })),
});
