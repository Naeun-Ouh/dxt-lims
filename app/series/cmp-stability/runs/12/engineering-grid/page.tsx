import CreatedRunGrid from '@/src/features/experiment-series/created-run-grid';
import EngineeringGridScenario from '@/src/features/run-registration/engineering-grid-scenario';

export default function Page() {
  if (process.env.DXT_REPOSITORY === 'postgres') return <CreatedRunGrid seriesSlug="cmp-stability" runNumber={12} />;

  return <EngineeringGridScenario scenario="CMP" />;
}
