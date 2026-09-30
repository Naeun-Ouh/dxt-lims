export type RunNavigationProjection = { number:number; title:string; summary:string; available:boolean };
export function createSeriesNavigationScale(completed:RunNavigationProjection[],count=104):RunNavigationProjection[] {
  return Array.from({length:count},(_,index)=>{
    const number=count-index, existing=completed.find((item)=>item.number===number);
    return existing ?? {
      number,
      title: `Research iteration ${number}`,
      summary: number % 2 === 0 ? 'Configuration adjusted' : 'Experimental context evaluated',
      available: false,
    };
  });
}
