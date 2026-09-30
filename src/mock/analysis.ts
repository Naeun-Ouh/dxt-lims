import type { SavedAnalysis, WaferAnalysisContext } from '@/src/domain/analysis';

const rows = [
  ['series-dts-improvement','DTS Improvement',1,'W01',30,'Rev 01',3.9,17.0,null],
  ['series-dts-improvement','DTS Improvement',2,'W03',32,'Rev 01',4.1,17.05,null],
  ['series-dts-improvement','DTS Improvement',3,'W02',34,'Rev 01',4.3,17.08,null],
  ['series-dts-improvement','DTS Improvement',4,'W01',35,'Rev 02',4.5,17.1,5.0],
  ['series-cmp-stability','CMP Stability',2,'W05',33,'Rev 01',4.2,16.98,null],
] as const;
export const waferAnalysisContexts: WaferAnalysisContext[] = rows.map(([seriesId,seriesLabel,run,wafer,energy,revision,dts,bcd,delta]) => ({
  waferRef:`${seriesId}/run-${run}/${wafer}`, waferLabel:wafer, runId:`run-${run}`, runNumber:run,
  seriesId, seriesLabel, lotLabel:run===4?'RSA6420':'DEV-LOT-01',
  operationLabel:'M2 CU CMP', recipeLabel:'RSAcucmp_001', equipmentLabel:run===4?'CMP-03':'CMP-02',
  conditions:[
    {definitionId:'condition-energy-v1',label:'Energy',value:{dataType:'NUMBER',value:energy,unit:'mJ'},assignmentId:`energy-run-${run}`,scope:'OPERATION',sourceLabel:`${seriesLabel} · Run #${run} · M2 CU CMP assignment`},
    {definitionId:'condition-material-revision-v1',label:'Material Revision',value:{dataType:'REFERENCE',referenceType:'SAMPLE_REVISION',referenceId:revision==='Rev 02'?'sample-D035-r2':'sample-D035-r1',label:`D035 ${revision}`},assignmentId:`material-run-${run}`,scope:'RUN',sourceLabel:`Run #${run} MaterialUsage`},
  ],
  results:[
    {id:`summary-dts-${seriesId}-${run}-${wafer}`,parameterId:'parameter-dts-v1',label:'DTS',value:dts,unit:'nm',acquisitionMethod:'INTERFACE',aggregationMethod:'MEAN',datasetId:`dts-${seriesId}-run-${run}`,sourceMeasurementIds:[`dts-${run}-${wafer}`],sourceLabel:'Metrology interface · wafer representative'},
    {id:`summary-bcd-${seriesId}-${run}-${wafer}`,parameterId:'parameter-bcd-v1',label:'BCD',value:bcd,unit:'nm',acquisitionMethod:'INTERFACE',aggregationMethod:'MEAN',datasetId:`bcd-${seriesId}-run-${run}`,sourceMeasurementIds:[`bcd-${run}-${wafer}`],sourceLabel:'CD-SEM interface · effective site mean'},
    ...(run===4?[{id:'manual-adhesion-run-4-w01',parameterId:'adhesion-score',label:'Adhesion Score',value:4,unit:null,acquisitionMethod:'MANUAL' as const,aggregationMethod:'SOURCE' as const,datasetId:'manual-run-4',sourceMeasurementIds:['manual-adhesion-run-4-w01'],sourceLabel:'Manual entry · Lee Seunghyun'}]:[]),
    ...(delta===null?[]:[{id:'summary-delta-thk-run-4-w01',parameterId:'parameter-delta-thk-v1',label:'DELTA_THK',value:delta,unit:'nm',acquisitionMethod:'DERIVED' as const,aggregationMethod:'MEAN' as const,datasetId:'dataset-delta-thk-run-4',sourceMeasurementIds:['pre-thk-run-4-w01','post-thk-run-4-w01'],sourceLabel:'Derived dataset · POST − PRE'}]),
  ],
}));

const pinnedResults=(contexts:WaferAnalysisContext[],parameterIds:string[])=>contexts.flatMap(context=>context.results.filter(result=>parameterIds.includes(result.parameterId)).map(result=>({seriesId:context.seriesId,runId:context.runId,waferSubjectId:context.waferLabel,parameterId:result.parameterId,datasetId:result.datasetId,representativeResultId:result.id,acquisitionMethod:result.acquisitionMethod})));

export const savedAnalyses: SavedAnalysis[] = [
  {id:'analysis-energy-dts',name:'Cross-Series Energy vs DTS',owner:'Lee Seunghyun',visibility:'PRIVATE',grain:'WAFER',waferRefs:rows.map(([seriesId,,r,w])=>({seriesId,runId:`run-${r}`,waferSubjectId:w,physicalWaferId:null})),siteRefs:[],conditionDefinitionIds:['condition-energy-v1'],resultParameterIds:['parameter-dts-v1'],sourceReferenceRevisionIds:['condition-energy-v1','parameter-dts-v1'],resultReferences:pinnedResults(waferAnalysisContexts,['parameter-dts-v1']),view:{type:'SCATTER',xRef:'condition-energy-v1',yRef:'parameter-dts-v1',groupRef:null},savedAt:'2026-09-05T10:30:00+09:00'},
  {id:'analysis-material-bcd',name:'Material revision / BCD review',owner:'Park Mina',visibility:'SHARED',grain:'WAFER',waferRefs:rows.slice(0,3).map(([seriesId,,r,w])=>({seriesId,runId:`run-${r}`,waferSubjectId:w,physicalWaferId:null})),siteRefs:[],conditionDefinitionIds:['condition-material-revision-v1'],resultParameterIds:['parameter-bcd-v1'],sourceReferenceRevisionIds:['condition-material-revision-v1','parameter-bcd-v1'],resultReferences:pinnedResults(waferAnalysisContexts.slice(0,3),['parameter-bcd-v1']),view:{type:'BAR',xRef:'condition-material-revision-v1',yRef:'parameter-bcd-v1',groupRef:null},savedAt:'2026-09-04T14:10:00+09:00'},
];
