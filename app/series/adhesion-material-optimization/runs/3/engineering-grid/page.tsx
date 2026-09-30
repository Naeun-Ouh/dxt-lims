import CreatedRunGrid from '@/src/features/experiment-series/created-run-grid';
import MaterialEngineeringGrid from '@/src/features/material-rd/material-engineering-grid';
export default function Page() {
  if (process.env.DXT_REPOSITORY === 'postgres') return <CreatedRunGrid seriesSlug="adhesion-material-optimization" runNumber={3} />;
 return <MaterialEngineeringGrid />; }
