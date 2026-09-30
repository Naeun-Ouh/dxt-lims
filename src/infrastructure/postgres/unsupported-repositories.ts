import { ApplicationError, type ApplicationRepositories } from '@/src/application/repository-ports';

/** No in-memory success path is permitted for an unimplemented production port. */
export function unsupportedRepositories(): Pick<ApplicationRepositories, 'execution' | 'measurement' | 'evaluation' | 'decision' | 'savedAnalysis'> {
  const unsupported = async (): Promise<never> => { throw new ApplicationError('PERSISTENCE', 'This repository is outside Production Adapter Slices 1–4.'); };
  return {
    execution: { getStateByRun: unsupported, getByRun: unsupported, saveByRun: unsupported },
    measurement: { getCatalog: unsupported, listDatasets: unsupported, getStateByRun: unsupported, getByRun: unsupported, saveByRun: unsupported, query: unsupported },
    evaluation: { getStateByRun: unsupported, getByRun: unsupported, saveByRun: unsupported },
    decision: { getStateByRun: unsupported, getByRun: unsupported, saveByRun: unsupported },
    savedAnalysis: { getState: unsupported, list: unsupported, get: unsupported, save: unsupported },
  };
}
