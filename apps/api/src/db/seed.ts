import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
import { users, filebases, folders, files, filePointers } from './schema';

/**
 * Database Seed Script
 *
 * Creates initial data for development and testing.
 * Usage: pnpm db:seed
 *
 * Default credentials:
 * - Alice: alice@test.com / password123
 * - Bob: bob@test.com / password123
 * - Charlie: charlie@test.com / password123
 *
 * Alice gets a full sample filebase structure.
 * Bob gets a minimal filebase (root only).
 * Charlie has no filebase.
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

  const createUser = async (email: string, name: string) => {
    const [user] = await db
      .insert(users)
      .values({
        email,
        password: passwordHash,
        name,
      })
      .returning();
    return user;
  };

  const createFilebaseWithRoot = async (ownerId: string, name: string) => {
    const [filebase] = await db
      .insert(filebases)
      .values({
        ownerId,
        name,
      })
      .returning();

    const [rootFolder] = await db
      .insert(folders)
      .values({
        filebaseId: filebase.id,
        name: 'root',
        parentId: null,
      })
      .returning();

    return { filebase, rootFolder };
  };

  const createFolder = async (filebaseId: string, parentId: string | null, name: string) => {
    const [folder] = await db
      .insert(folders)
      .values({
        filebaseId,
        parentId,
        name,
      })
      .returning();
    return folder;
  };

  const createFileWithPointer = async (params: {
    filebaseId: string;
    folderId: string;
    name: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
  }) => {
    const [file] = await db
      .insert(files)
      .values({
        s3Key: `${params.filebaseId}/${randomUUID()}`,
        mimeType: params.mimeType,
        size: BigInt(params.size),
        uploadedBy: params.uploadedBy,
      })
      .returning();

    const [pointer] = await db
      .insert(filePointers)
      .values({
        fileId: file.id,
        folderId: params.folderId,
        name: params.name,
        isShortcut: false,
      })
      .returning();

    return { file, pointer };
  };

  const alice = await createUser('alice@test.com', 'Alice');
  const bob = await createUser('bob@test.com', 'Bob');
  const charlie = await createUser('charlie@test.com', 'Charlie');

  console.log('✅ Created users:', alice.email, bob.email, charlie.email);

  const { filebase: aliceFilebase, rootFolder: aliceRoot } = await createFilebaseWithRoot(
    alice.id,
    'alice-files'
  );
  const { filebase: bobFilebase } = await createFilebaseWithRoot(bob.id, 'bob-files');

  console.log('✅ Created filebases:', aliceFilebase.name, bobFilebase.name);

  const documents = await createFolder(aliceFilebase.id, aliceRoot.id, 'Documents');
  const images = await createFolder(aliceFilebase.id, aliceRoot.id, 'Images');
  const screenshots = await createFolder(aliceFilebase.id, images.id, 'Screenshots');

  await createFileWithPointer({
    filebaseId: aliceFilebase.id,
    folderId: documents.id,
    name: 'report.pdf',
    mimeType: 'application/pdf',
    size: 245_760,
    uploadedBy: alice.id,
  });
  await createFileWithPointer({
    filebaseId: aliceFilebase.id,
    folderId: documents.id,
    name: 'notes.txt',
    mimeType: 'text/plain',
    size: 4_096,
    uploadedBy: alice.id,
  });
  await createFileWithPointer({
    filebaseId: aliceFilebase.id,
    folderId: images.id,
    name: 'photo1.jpg',
    mimeType: 'image/jpeg',
    size: 512_000,
    uploadedBy: alice.id,
  });
  await createFileWithPointer({
    filebaseId: aliceFilebase.id,
    folderId: screenshots.id,
    name: 'screen1.png',
    mimeType: 'image/png',
    size: 128_000,
    uploadedBy: alice.id,
  });
  await createFileWithPointer({
    filebaseId: aliceFilebase.id,
    folderId: aliceRoot.id,
    name: 'README.txt',
    mimeType: 'text/plain',
    size: 2_048,
    uploadedBy: alice.id,
  });

  console.log('✅ Seeded sample filebase structure for Alice');

  console.log('\n🎉 Seed complete!');
  console.log('\nDefault credentials:');
  console.log('  Alice: alice@test.com / password123');
  console.log('  Bob: bob@test.com / password123');
  console.log('  Charlie: charlie@test.com / password123');
  console.log('\nNOTE: Alice and Bob have pre-created filebases.');

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
