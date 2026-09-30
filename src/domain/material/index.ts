export * from './material';
export * from './sample';
export * from './structure';
export * from './property';
export * from './catalog';
export * from './fingerprint';
export * from './revision-delta';
export * from './formulation';

import type { Material } from './material';
import type { Sample, SampleRevision } from './sample';
import type { MaterialUsage } from './catalog';
export interface MaterialRepository {
  getMaterial(id: string): Promise<Material | null>;
  findSamples(query: string): Promise<Sample[]>;
  listSampleRevisions(sampleId: string): Promise<SampleRevision[]>;
  listUsage(sampleId: string): Promise<MaterialUsage[]>;
}
