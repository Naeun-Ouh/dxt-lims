import { PgDatabase } from '../src/infrastructure/postgres/pg-database';
import { inventoryImplicitScientificAccess } from '../src/infrastructure/postgres/scientific-access-inventory';

// Opt-in operator tool. No schema migration, startup hook, or implicit environment fallback.
const database = PgDatabase.fromEnvironment();
try {
  const inventory = await database.transaction(async (sql) => {
    await sql.query(
      'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
    );
    return inventoryImplicitScientificAccess(sql);
  });
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
} finally {
  await database.close();
}
