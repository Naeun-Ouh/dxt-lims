import CreatedRunGrid from '@/src/features/experiment-series/created-run-grid';
import EngineeringGridScenario from '@/src/features/run-registration/engineering-grid-scenario';

export default function Page() {
  if (process.env.DXT_REPOSITORY === 'postgres') return <CreatedRunGrid seriesSlug="dts-improvement" runNumber={18} />;

  return <EngineeringGridScenario scenario="PHOTO" />;
}
