import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from '../schema';

/**
 * Database singleton provider
 *
 * This class manages the PostgreSQL connection lifecycle and provides
 * a single shared instance of the Drizzle database client across the
 * entire application.
 *
 * Benefits of singleton pattern:
 * - Connection pooling is managed efficiently
 * - Only one connection is established to the database
 * - Proper cleanup on application shutdown
 * - Thread-safe access to the database
 */
@Injectable()
export class DatabaseProvider implements OnModuleDestroy {
  private static instance: DatabaseProvider | null = null;
  private readonly client: Sql;
  private readonly database: PostgresJsDatabase<typeof schema>;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    // Create postgres client with connection pooling
    this.client = postgres(connectionString, {
      max: 10, // Maximum pool connections
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Connection timeout in seconds
    });

    // Create Drizzle ORM instance with schema
    this.database = drizzle(this.client, { schema });

    DatabaseProvider.instance = this;
  }

  /**
   * Get the Drizzle database instance
   */
  getDatabase(): PostgresJsDatabase<typeof schema> {
    return this.database;
  }

  /**
   * Get the raw postgres client (for advanced use cases)
   */
  getClient(): Sql {
    return this.client;
  }

  /**
   * Get the singleton instance (for use outside NestJS DI)
   */
  static getInstance(): DatabaseProvider | null {
    return DatabaseProvider.instance;
  }

  /**
   * Clean up database connection on module destroy
   * This is called automatically by NestJS when the application shuts down
   */
  async onModuleDestroy(): Promise<void> {
    await this.client.end();
    DatabaseProvider.instance = null;
  }
}
