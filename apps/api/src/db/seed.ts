import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { users, filebases, folders, files, filePointers } from './schema';

dotenv.config();

const LOG = {
  info: (msg: string) => console.log(chalk.blue(`[INFO] `) + msg),
  success: (msg: string) => console.log(chalk.green(`[SUCCESS] `) + msg),
  error: (msg: string) => console.log(chalk.red(`[ERROR] `) + msg),
  header: (msg: string) => console.log(chalk.bold.magenta(`\n--- ${msg.toUpperCase()} ---`)),
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing');

  LOG.header('Initialization');

  const client = postgres(connectionString);
  const db = drizzle(client);
  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Helpers ---

  const createAccount = async (email: string, name: string) => {
    const [user] = await db.insert(users).values({ email, password: passwordHash, name }).returning();
    return user;
  };

  const setupFilebase = async (ownerId: string, name: string) => {
    const [fb] = await db.insert(filebases).values({ ownerId, name }).returning();
    const [root] = await db.insert(folders).values({ filebaseId: fb.id, name: 'root', parentId: null }).returning();
    return { fb, root };
  };

  const addFile = async (fbId: string, folderId: string, name: string, uploaderId: string) => {
    const [file] = await db.insert(files).values({
      s3Key: `${fbId}/${randomUUID()}`,
      mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
      size: BigInt(Math.floor(Math.random() * 50000)),
      uploadedBy: uploaderId,
    }).returning();

    await db.insert(filePointers).values({
      fileId: file.id,
      folderId,
      name,
      isShortcut: false,
    });
  };

  // --- Execution ---

  try {
    LOG.header('Database Seeding');

    LOG.info('Creating user accounts...');
    const [alice, bob, charlie] = await Promise.all([
      createAccount('alice@test.com', 'Alice'),
      createAccount('bob@test.com', 'Bob'),
      createAccount('charlie@test.com', 'Charlie'),
    ]);
    LOG.success('Accounts created: Alice, Bob, Charlie');

    LOG.info('Generating filebase hierarchies...');

    // Alice's structure
    const { fb: aFb, root: aRoot } = await setupFilebase(alice.id, 'alice-vault');
    const docs = await db.insert(folders).values({ filebaseId: aFb.id, parentId: aRoot.id, name: 'Documents' }).returning().then(r => r[0]);

    await Promise.all([
      addFile(aFb.id, docs.id, 'manual.pdf', alice.id),
      addFile(aFb.id, aRoot.id, 'config.txt', alice.id),
      setupFilebase(bob.id, 'bob-storage'),
    ]);

    LOG.success('Hierarchy and files established');

    LOG.header('Summary');
    console.table([
      { user: 'Alice', email: 'alice@test.com', status: 'Seeded' },
      { user: 'Bob', email: 'bob@test.com', status: 'Seeded' },
      { user: 'Charlie', email: 'charlie@test.com', status: 'No Data' },
    ]);

    LOG.success('Seed operation finished without errors');

  } catch (error) {
    LOG.error('An error occurred during the seed process');
    console.error(error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seed();
