import { InMemoryConfigurationRepository, type ConfigurationRegistry } from '@/src/domain/reference';

/** An immutable, database-hydrated runtime source; never a fixture fallback. */
export class HydratedConfiguration extends InMemoryConfigurationRepository {
  constructor(registry: ConfigurationRegistry) { super(registry); }
  override transact<T>(): T { throw new Error('Hydrated configuration is read-only. Use the server Configuration command boundary.'); }
}
