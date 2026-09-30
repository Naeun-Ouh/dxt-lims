import type { ExperimentSeries } from './index';

export type TargetAchievement = {seriesTargetId:string;waferSubjectId:string;measurementSummaryId:string;status:'ACHIEVED'|'NOT_ACHIEVED'|'NOT_AVAILABLE'};
export function evaluateSeriesTarget(target:ExperimentSeries['targets'][number], value:number|null, waferSubjectId:string, measurementSummaryId:string):TargetAchievement {
  if(value===null)return{seriesTargetId:target.id,waferSubjectId,measurementSummaryId,status:'NOT_AVAILABLE'};
  const achieved=target.operator==='GTE'?value>=(target.threshold??Infinity):target.operator==='LTE'?value<=(target.threshold??-Infinity):target.operator==='BETWEEN'?value>=(target.lowerBound??Infinity)&&value<=(target.upperBound??-Infinity):value===target.threshold;
  return{seriesTargetId:target.id,waferSubjectId,measurementSummaryId,status:achieved?'ACHIEVED':'NOT_ACHIEVED'};
}
