import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseProvider } from './providers';
import * as schema from './schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Injection token for the Drizzle database instance
 */
export const DB_CONNECTION = 'DB_CONNECTION';

/**
 * Type alias for the database instance with full schema
 */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Global database module
 *
 * Provides a centralized, singleton database connection that can be
 * injected anywhere in the application using @Inject(DB_CONNECTION).
 *
 * The module is marked as @Global() so it doesn't need to be imported
 * in every module that uses the database.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @Inject(DB_CONNECTION)
 *     private readonly db: Database
 *   ) {}
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseProvider,
    {
      provide: DB_CONNECTION,
      useFactory: (databaseProvider: DatabaseProvider) => {
        return databaseProvider.getDatabase();
      },
      inject: [DatabaseProvider],
    },
  ],
  exports: [DB_CONNECTION, DatabaseProvider],
})
export class DbModule {}
