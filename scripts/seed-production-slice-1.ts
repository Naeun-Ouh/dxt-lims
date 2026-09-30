// Explicit TEST DATA bootstrap only; never invoked by application composition.
import { PgDatabase } from '../src/infrastructure/postgres/pg-database';
import { seedProductionSlice } from '../src/infrastructure/postgres/slice-seed';
import { configurationRepository } from '../src/mock/configuration-packages';
const database = PgDatabase.fromEnvironment();
try { await seedProductionSlice(database, configurationRepository, ['dts-improvement', 'cmp-stability', 'adhesion-material-optimization']); }
finally { await database.close(); }
