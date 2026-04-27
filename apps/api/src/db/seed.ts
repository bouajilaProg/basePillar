import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
<<<<<<< HEAD
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

=======
import { users, filebases, folders, files, filePointers } from './schema';
import { loadEnvFiles } from './load-env';

const LOG = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  error: (msg: string) => console.log(`[ERROR] ${msg}`),
  header: (msg: string) => console.log(`\n--- ${msg.toUpperCase()} ---`),
};

async function seed() {
  loadEnvFiles();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing');

>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9
  LOG.header('Initialization');

  const client = postgres(connectionString);
  const db = drizzle(client);
  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Helpers ---

  const createAccount = async (email: string, name: string) => {
<<<<<<< HEAD
    const [user] = await db.insert(users).values({ email, password: passwordHash, name }).returning();
=======
    const [user] = await db
      .insert(users)
      .values({ email, password: passwordHash, name })
      .returning();
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9
    return user;
  };

  const setupFilebase = async (ownerId: string, name: string) => {
    const [fb] = await db.insert(filebases).values({ ownerId, name }).returning();
<<<<<<< HEAD
    const [root] = await db.insert(folders).values({ filebaseId: fb.id, name: 'root', parentId: null }).returning();
=======
    const [root] = await db
      .insert(folders)
      .values({ filebaseId: fb.id, name: 'root', parentId: null })
      .returning();
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9
    return { fb, root };
  };

  const addFile = async (fbId: string, folderId: string, name: string, uploaderId: string) => {
<<<<<<< HEAD
    const [file] = await db.insert(files).values({
      s3Key: `${fbId}/${randomUUID()}`,
      mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
      size: BigInt(Math.floor(Math.random() * 50000)),
      uploadedBy: uploaderId,
    }).returning();
=======
    const [file] = await db
      .insert(files)
      .values({
        s3Key: `${fbId}/${randomUUID()}`,
        mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
        size: BigInt(Math.floor(Math.random() * 50000)),
        uploadedBy: uploaderId,
      })
      .returning();
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9

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
<<<<<<< HEAD
    const docs = await db.insert(folders).values({ filebaseId: aFb.id, parentId: aRoot.id, name: 'Documents' }).returning().then(r => r[0]);
=======
    const docs = await db
      .insert(folders)
      .values({ filebaseId: aFb.id, parentId: aRoot.id, name: 'Documents' })
      .returning()
      .then((r) => r[0]);
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9

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
<<<<<<< HEAD

=======
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9
  } catch (error) {
    LOG.error('An error occurred during the seed process');
    console.error(error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seed();
