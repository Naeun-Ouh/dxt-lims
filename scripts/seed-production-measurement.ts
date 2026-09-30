/** Explicit local/test bootstrap. Never called by runtime composition. */
import { PgDatabase } from '../src/infrastructure/postgres/pg-database';
import { provisionMeasurementReferences } from '../src/infrastructure/postgres/measurement-references';
import { definitions } from '../src/mock/reference';
const database = PgDatabase.fromEnvironment();
try {
  await database.transaction((session) =>
    provisionMeasurementReferences(session, definitions),
  );
} finally {
  await database.close();
}
