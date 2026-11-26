/** Direct repository contract adapter with an explicitly seeded test actor. */
import {createProductionSliceRepositories as create} from '@/src/infrastructure/postgres/postgres-repositories';
import {scientificTestPrincipal} from './postgres-reasoning-fixtures';
export const createProductionSliceRepositories = (database:Parameters<typeof create>[0], configuration:Parameters<typeof create>[1]) => create(database,configuration,scientificTestPrincipal);
