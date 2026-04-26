import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadEnvFiles } from './load-env';

/**
 * Database Migration Script
 *
 * Run this script to apply all pending migrations.
 * Usage: pnpm db:migrate
 */
async function runMigrations() {
  loadEnvFiles();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('🔄 Running migrations...');

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: './drizzle' });

  console.log('✅ Migrations complete');

  await client.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
