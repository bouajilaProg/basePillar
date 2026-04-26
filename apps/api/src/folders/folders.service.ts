import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';

/**
 * FoldersService
 *
 * Manages folder CRUD operations and hierarchy.
 * Folders form a tree structure within a filebase.
 * Root folder (parentId=null, name="root") has special constraints.
 */

export interface CreateFolderDto {
  filebaseId: string;
  parentId: string | null;
  name: string;
}

export interface UpdateFolderDto {
  name?: string;
}

@Injectable()
export class FoldersService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database
  ) {}

  /**
   * Create a new folder
   *
   * @param dto - Creation parameters
   * @returns Created folder
   * @throws NotFoundException if parent folder not found
   * @throws ConflictException if folder with same name exists in parent
   * @throws BadRequestException if parent belongs to different filebase
   */
  async create(dto: CreateFolderDto): Promise<schema.Folder> {
    const { filebaseId, parentId, name } = dto;

    // If parentId is provided, validate it exists and belongs to same filebase
    if (parentId !== null) {
      const [parent] = await this.db
        .select()
        .from(schema.folders)
        .where(eq(schema.folders.id, parentId));

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }

      if (parent.filebaseId !== filebaseId) {
        throw new BadRequestException('Parent folder belongs to a different filebase');
      }
    }

    // Check for duplicate name in same parent
    const existingCondition =
      parentId === null
        ? and(
            eq(schema.folders.filebaseId, filebaseId),
            eq(schema.folders.name, name),
            isNull(schema.folders.parentId)
          )
        : and(
            eq(schema.folders.filebaseId, filebaseId),
            eq(schema.folders.name, name),
            eq(schema.folders.parentId, parentId)
          );

    const [existing] = await this.db.select().from(schema.folders).where(existingCondition);

    if (existing) {
      throw new ConflictException('Folder with this name already exists in parent');
    }

    // Create folder
    const [folder] = await this.db
      .insert(schema.folders)
      .values({ filebaseId, parentId, name })
      .returning();

    return folder;
  }

  /**
   * Find a folder by ID
   *
   * @param id - Folder ID
   * @returns Folder
   * @throws NotFoundException if not found
   */
  async findById(id: string): Promise<schema.Folder> {
    const [folder] = await this.db.select().from(schema.folders).where(eq(schema.folders.id, id));

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  /**
   * Find folders by parent ID
   *
   * @param filebaseId - Filebase ID
   * @param parentId - Parent folder ID (null for root's children)
   * @returns Array of child folders
   */
  async findByParentId(filebaseId: string, parentId: string | null): Promise<schema.Folder[]> {
    const condition =
      parentId === null
        ? and(eq(schema.folders.filebaseId, filebaseId), isNull(schema.folders.parentId))
        : and(eq(schema.folders.filebaseId, filebaseId), eq(schema.folders.parentId, parentId));

    const folders = await this.db.select().from(schema.folders).where(condition);

    return folders;
  }

  /**
   * Update a folder
   *
   * @param id - Folder ID
   * @param dto - Update parameters
   * @returns Updated folder
   * @throws NotFoundException if not found
   * @throws BadRequestException if trying to rename root folder
   */
  async update(id: string, dto: UpdateFolderDto): Promise<schema.Folder> {
    // Check if folder exists and if it's root
    const [existing] = await this.db.select().from(schema.folders).where(eq(schema.folders.id, id));

    if (!existing) {
      throw new NotFoundException('Folder not found');
    }

    // Cannot rename root folder to anything other than "root"
    if (existing.parentId === null && existing.name === 'root' && dto.name && dto.name !== 'root') {
      throw new BadRequestException('Cannot rename root folder');
    }

    const [updated] = await this.db
      .update(schema.folders)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.folders.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a folder
   *
   * All children (folders, files) will be cascade deleted.
   *
   * @param id - Folder ID
   * @throws NotFoundException if not found
   * @throws BadRequestException if trying to delete root folder
   */
  async delete(id: string): Promise<void> {
    const [folder] = await this.db.select().from(schema.folders).where(eq(schema.folders.id, id));

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Cannot delete root folder
    if (folder.parentId === null) {
      throw new BadRequestException('Cannot delete root folder');
    }

    await this.db.delete(schema.folders).where(eq(schema.folders.id, id));
  }

  /**
   * Move a folder to a new parent
   *
   * @param id - Folder ID to move
   * @param newParentId - New parent folder ID
   * @returns Updated folder
   * @throws NotFoundException if folder or new parent not found
   * @throws BadRequestException if trying to move root folder or move into itself
   */
  async move(id: string, newParentId: string): Promise<schema.Folder> {
    // Check folder exists
    const [folder] = await this.db.select().from(schema.folders).where(eq(schema.folders.id, id));

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Cannot move root folder
    if (folder.parentId === null) {
      throw new BadRequestException('Cannot move root folder');
    }

    // Cannot move folder into itself
    if (id === newParentId) {
      throw new BadRequestException('Cannot move folder into itself');
    }

    // Check new parent exists and belongs to same filebase
    const [newParent] = await this.db
      .select()
      .from(schema.folders)
      .where(eq(schema.folders.id, newParentId));

    if (!newParent) {
      throw new NotFoundException('New parent folder not found');
    }

    if (newParent.filebaseId !== folder.filebaseId) {
      throw new BadRequestException('Cannot move folder to a different filebase');
    }

    // TODO: Check for cycles (moving folder into its own descendant)
    // This would require traversing up from newParentId to ensure folder.id is not an ancestor

    // Check for duplicate name in new parent
    const [existing] = await this.db
      .select()
      .from(schema.folders)
      .where(and(eq(schema.folders.parentId, newParentId), eq(schema.folders.name, folder.name)));

    if (existing) {
      throw new ConflictException('Folder with this name already exists in target');
    }

    // Move folder
    const [updated] = await this.db
      .update(schema.folders)
      .set({
        parentId: newParentId,
        updatedAt: new Date(),
      })
      .where(eq(schema.folders.id, id))
      .returning();

    return updated;
  }

  /**
   * Get the path from root to a folder (for breadcrumbs)
   *
   * @param id - Folder ID
   * @returns Array of folders from root to the target folder
   */
  async getPath(id: string): Promise<schema.Folder[]> {
    const path: schema.Folder[] = [];
    let currentId: string | null = id;

    // Traverse up the tree
    while (currentId) {
      const [folder] = await this.db
        .select()
        .from(schema.folders)
        .where(eq(schema.folders.id, currentId));

      if (!folder) {
        break;
      }

      path.unshift(folder); // Add to beginning
      currentId = folder.parentId;
    }

    return path;
  }
}
