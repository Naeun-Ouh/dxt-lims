/** Explicit bootstrap for existing exact Reference definitions, never a runtime fallback. */
import { PgDatabase } from '../src/infrastructure/postgres/pg-database';
import { provisionConfigurationCatalog } from '../src/infrastructure/postgres/postgres-configuration-authoring';
import { definitions } from '../src/mock/reference';
const db=PgDatabase.fromEnvironment();
try {await db.transaction(sql=>provisionConfigurationCatalog(sql,definitions));} finally {await db.close();}
