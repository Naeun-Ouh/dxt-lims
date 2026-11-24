import SampleExplorer from '@/src/features/sample-explorer/explorer';
import ProductionSampleUsage from '@/src/features/samples/production-usage';
export default function Page() {
  return process.env.DXT_REPOSITORY === 'postgres' ? (
    <ProductionSampleUsage />
  ) : (
    <SampleExplorer />
  );
}
