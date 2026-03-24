import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
import { users, organizations, memberships } from './schema';

/**
 * Database Seed Script
 *
 * Creates initial data for development and testing.
 * Usage: pnpm db:seed
 *
 * Default credentials:
 * - Admin: admin@example.com / password123
 * - User 1: user1@example.com / password123
 * - User 2: user2@example.com / password123
 */
async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('🌱 Seeding database...');

  const client = postgres(connectionString);
  const db = drizzle(client);

  // Hash the default password
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Acme Corp',
      slug: 'acme-corp',
    })
    .returning();

  console.log('✅ Created organization:', org.name);

  // Create admin user
  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@example.com',
      password: passwordHash,
      name: 'Admin User',
    })
    .returning();

  console.log('✅ Created admin user:', admin.email);

  // Create regular users
  const [user1] = await db
    .insert(users)
    .values({
      email: 'user1@example.com',
      password: passwordHash,
      name: 'User One',
    })
    .returning();

  const [user2] = await db
    .insert(users)
    .values({
      email: 'user2@example.com',
      password: passwordHash,
      name: 'User Two',
    })
    .returning();

  console.log('✅ Created users:', user1.email, user2.email);

  // Create memberships
  await db.insert(memberships).values([
    { userId: admin.id, organizationId: org.id, role: 'admin' },
    { userId: user1.id, organizationId: org.id, role: 'member' },
    { userId: user2.id, organizationId: org.id, role: 'member' },
  ]);

  console.log('✅ Created memberships');

  console.log('\n🎉 Seed complete!');
  console.log('\nDefault credentials:');
  console.log('  Admin: admin@example.com / password123');
  console.log('  User 1: user1@example.com / password123');
  console.log('  User 2: user2@example.com / password123');

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
