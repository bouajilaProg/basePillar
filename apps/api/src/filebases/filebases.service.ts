import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';

/**
 * FilebasesService
 *
 * Manages filebase CRUD operations.
 * Each user can have at most ONE filebase.
 * When a filebase is created, a root folder is automatically created.
 */

export interface CreateFilebaseDto {
  ownerId: string;
  name: string;
}

export interface UpdateFilebaseDto {
  name?: string;
}

export interface FilebaseWithRoot {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  rootFolderId?: string;
}

@Injectable()
export class FilebasesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database
  ) {}

  /**
   * Create a new filebase for a user
   *
   * @param dto - Creation parameters
   * @returns Created filebase with root folder ID
   * @throws ConflictException if user already has a filebase
   */
  async create(dto: CreateFilebaseDto): Promise<FilebaseWithRoot> {
    const { ownerId, name } = dto;

    // Check if user already has a filebase
    const [existing] = await this.db
      .select()
      .from(schema.filebases)
      .where(eq(schema.filebases.ownerId, ownerId));

    if (existing) {
      throw new ConflictException('User already has a filebase');
    }

    // Create filebase and root folder in a transaction
    const result = await this.db.transaction(async (tx) => {
      // Create filebase
      const [filebase] = await tx.insert(schema.filebases).values({ ownerId, name }).returning();

      // Create root folder
      const [rootFolder] = await tx
        .insert(schema.folders)
        .values({
          filebaseId: filebase.id,
          name: 'root',
          parentId: null,
        })
        .returning();

      return {
        ...filebase,
        rootFolderId: rootFolder.id,
      };
    });

    return result;
  }

  /**
   * Find a filebase by ID
   *
   * @param id - Filebase ID
   * @returns Filebase
   * @throws NotFoundException if not found
   */
  async findById(id: string): Promise<schema.Filebase> {
    const [filebase] = await this.db
      .select()
      .from(schema.filebases)
      .where(eq(schema.filebases.id, id));

    if (!filebase) {
      throw new NotFoundException('Filebase not found');
    }

    return filebase;
  }

  /**
   * Find a filebase by owner ID
   *
   * @param ownerId - Owner user ID
   * @returns Filebase or null if user has no filebase
   */
  async findByOwnerId(ownerId: string): Promise<schema.Filebase | null> {
    const [filebase] = await this.db
      .select()
      .from(schema.filebases)
      .where(eq(schema.filebases.ownerId, ownerId));

    return filebase || null;
  }

  /**
   * Update a filebase
   *
   * @param id - Filebase ID
   * @param dto - Update parameters
   * @returns Updated filebase
   * @throws NotFoundException if not found
   */
  async update(id: string, dto: UpdateFilebaseDto): Promise<schema.Filebase> {
    const [updated] = await this.db
      .update(schema.filebases)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.filebases.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Filebase not found');
    }

    return updated;
  }

  /**
   * Delete a filebase
   *
   * All associated data (folders, files, members, etc.) will be cascade deleted.
   *
   * @param id - Filebase ID
   * @throws NotFoundException if not found
   */
  async delete(id: string): Promise<void> {
    // Check if filebase exists
    const [existing] = await this.db
      .select({ id: schema.filebases.id })
      .from(schema.filebases)
      .where(eq(schema.filebases.id, id));

    if (!existing) {
      throw new NotFoundException('Filebase not found');
    }

    // Delete (cascade will handle related data)
    await this.db.delete(schema.filebases).where(eq(schema.filebases.id, id));
  }

  /**
   * Get the root folder of a filebase
   *
   * @param filebaseId - Filebase ID
   * @returns Root folder
   * @throws Error if root folder not found (data corruption)
   */
  async getRootFolder(filebaseId: string): Promise<schema.Folder> {
    const [rootFolder] = await this.db
      .select()
      .from(schema.folders)
      .where(and(eq(schema.folders.filebaseId, filebaseId), isNull(schema.folders.parentId)));

    if (!rootFolder) {
      throw new Error(`Root folder not found for filebase ${filebaseId} - data corruption`);
    }

    return rootFolder;
  }
}
