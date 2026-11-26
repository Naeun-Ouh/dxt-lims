import SampleExplorer from '@/src/features/sample-explorer/explorer';
import ProductionSamples from '@/src/features/samples/production-samples';
export default function Page() {
  return process.env.DXT_REPOSITORY === 'postgres' ? (
    <ProductionSamples />
  ) : (
    <SampleExplorer />
  );
}
