import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';
import { FsService } from './fs.service';
import { FileCleanupService } from '../db/triggers/fileCleanup.service';

/**
 * FileService
 *
 * Manages files and file pointers.
 * Files are physical S3 objects, pointers are user-facing entries.
 * Multiple pointers can reference the same file (shortcuts).
 */

export interface UploadFileDto {
  filebaseId: string;
  folderId: string;
  name: string;
  buffer: Buffer;
  mimeType: string;
  uploadedBy: string;
  validateFolder?: boolean;
}

export interface UploadResult {
  file: schema.File;
  pointer: schema.FilePointer;
}

export interface CreateShortcutDto {
  sourcePointerId: string;
  targetFolderId: string;
  name: string;
}

@Injectable()
export class FileService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly fsService: FsService,
    private readonly cleanupService: FileCleanupService
  ) {}

  /**
   * Upload a file and create a pointer
   *
   * @param dto - Upload parameters
   * @returns Created file and pointer
   * @throws NotFoundException if folder not found (when validateFolder is true)
   * @throws ConflictException if file with same name exists in folder
   */
  async upload(dto: UploadFileDto): Promise<UploadResult> {
    const { filebaseId, folderId, name, buffer, mimeType, uploadedBy, validateFolder } = dto;

    // Validate folder exists if requested (avoids S3 upload for non-existent folder)
    if (validateFolder) {
      const [folder] = await this.db
        .select()
        .from(schema.folders)
        .where(eq(schema.folders.id, folderId));

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    // Check for duplicate name in folder
    const [existing] = await this.db
      .select()
      .from(schema.filePointers)
      .where(and(eq(schema.filePointers.folderId, folderId), eq(schema.filePointers.name, name)));

    if (existing) {
      throw new ConflictException('File with this name already exists in folder');
    }

    // Upload to S3
    const { s3Key, size } = await this.fsService.upload({
      filebaseId,
      buffer,
      mimeType,
    });

    // Create file and pointer in transaction
    const result = await this.db.transaction(async (tx) => {
      // Create file record
      const [file] = await tx
        .insert(schema.files)
        .values({
          s3Key,
          mimeType,
          size: BigInt(size),
          uploadedBy,
        })
        .returning();

      // Create pointer
      const [pointer] = await tx
        .insert(schema.filePointers)
        .values({
          fileId: file.id,
          folderId,
          name,
          isShortcut: false,
        })
        .returning();

      return { file, pointer };
    });

    return result;
  }

  /**
   * Find a file pointer by ID
   *
   * @param id - Pointer ID
   * @returns File pointer with file info
   * @throws NotFoundException if not found
   */
  async findById(id: string): Promise<schema.FilePointer> {
    const [pointer] = await this.db
      .select()
      .from(schema.filePointers)
      .where(eq(schema.filePointers.id, id));

    if (!pointer) {
      throw new NotFoundException('File not found');
    }

    return pointer;
  }

  /**
   * Find all file pointers in a folder
   *
   * @param folderId - Folder ID
   * @returns Array of file pointers
   */
  async findByFolderId(folderId: string): Promise<schema.FilePointer[]> {
    const pointers = await this.db
      .select()
      .from(schema.filePointers)
      .where(eq(schema.filePointers.folderId, folderId));

    return pointers;
  }

  /**
   * Create a shortcut to an existing file
   *
   * @param dto - Shortcut parameters
   * @returns Created shortcut pointer
   * @throws NotFoundException if source pointer not found
   * @throws ConflictException if name already exists in target folder
   */
  async createShortcut(dto: CreateShortcutDto): Promise<schema.FilePointer> {
    const { sourcePointerId, targetFolderId, name } = dto;

    // Get source pointer
    const [source] = await this.db
      .select()
      .from(schema.filePointers)
      .where(eq(schema.filePointers.id, sourcePointerId));

    if (!source) {
      throw new NotFoundException('Source file not found');
    }

    // Check for name conflict
    const [existing] = await this.db
      .select()
      .from(schema.filePointers)
      .where(
        and(eq(schema.filePointers.folderId, targetFolderId), eq(schema.filePointers.name, name))
      );

    if (existing) {
      throw new ConflictException('File with this name already exists in target folder');
    }

    // Create shortcut
    const [shortcut] = await this.db
      .insert(schema.filePointers)
      .values({
        fileId: source.fileId,
        folderId: targetFolderId,
        name,
        isShortcut: true,
      })
      .returning();

    return shortcut;
  }

  /**
   * Rename a file pointer
   *
   * @param id - Pointer ID
   * @param newName - New name
   * @returns Updated pointer
   * @throws NotFoundException if pointer not found
   * @throws ConflictException if new name already exists
   */
  async rename(id: string, newName: string): Promise<schema.FilePointer> {
    // Get pointer
    const [pointer] = await this.db
      .select()
      .from(schema.filePointers)
      .where(eq(schema.filePointers.id, id));

    if (!pointer) {
      throw new NotFoundException('File not found');
    }

    // Check for name conflict
    const [existing] = await this.db
      .select()
      .from(schema.filePointers)
      .where(
        and(
          eq(schema.filePointers.folderId, pointer.folderId),
          eq(schema.filePointers.name, newName)
        )
      );

    if (existing && existing.id !== id) {
      throw new ConflictException('File with this name already exists in folder');
    }

    // Update
    const [updated] = await this.db
      .update(schema.filePointers)
      .set({ name: newName, updatedAt: new Date() })
      .where(eq(schema.filePointers.id, id))
      .returning();

    return updated;
  }

  /**
   * Move a file pointer to a different folder
   *
   * @param id - Pointer ID
   * @param newFolderId - Target folder ID
   * @returns Updated pointer
   * @throws NotFoundException if pointer not found
   * @throws ConflictException if name already exists in target folder
   */
  async move(id: string, newFolderId: string): Promise<schema.FilePointer> {
    // Get pointer
    const [pointer] = await this.db
      .select()
      .from(schema.filePointers)
      .where(eq(schema.filePointers.id, id));

    if (!pointer) {
      throw new NotFoundException('File not found');
    }

    // Check for name conflict in target folder
    const [existing] = await this.db
      .select()
      .from(schema.filePointers)
      .where(
        and(
          eq(schema.filePointers.folderId, newFolderId),
          eq(schema.filePointers.name, pointer.name)
        )
      );

    if (existing) {
      throw new ConflictException('File with this name already exists in target folder');
    }

    // Move
    const [updated] = await this.db
      .update(schema.filePointers)
      .set({ folderId: newFolderId, updatedAt: new Date() })
      .where(eq(schema.filePointers.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a file pointer
   *
   * If this is the last pointer to the file, the file will be garbage collected.
   *
   * @param id - Pointer ID
   * @throws NotFoundException if pointer not found
   */
  async delete(id: string): Promise<void> {
    // Get pointer to get fileId
    const [pointer] = await this.db
      .select()
      .from(schema.filePointers)
      .where(eq(schema.filePointers.id, id));

    if (!pointer) {
      throw new NotFoundException('File not found');
    }

    const fileId = pointer.fileId;

    // Delete pointer
    await this.db.delete(schema.filePointers).where(eq(schema.filePointers.id, id));

    // Check if file needs cleanup
    await this.cleanupService.checkAndCleanupOrphanFile(fileId);
  }

  /**
   * Get a signed download URL for a file
   *
   * @param pointerId - Pointer ID
   * @param expiresIn - URL expiration in seconds (default 3600)
   * @returns Signed URL
   * @throws NotFoundException if pointer not found
   */
  async getDownloadUrl(pointerId: string, expiresIn: number = 3600): Promise<string> {
    // Get pointer with file info
    const [pointer] = await this.db
      .select({
        id: schema.filePointers.id,
        fileId: schema.filePointers.fileId,
        s3Key: schema.files.s3Key,
      })
      .from(schema.filePointers)
      .innerJoin(schema.files, eq(schema.filePointers.fileId, schema.files.id))
      .where(eq(schema.filePointers.id, pointerId));

    if (!pointer) {
      throw new NotFoundException('File not found');
    }

    return this.fsService.getSignedUrl(pointer.s3Key, expiresIn);
  }

  /**
   * Legacy read method (deprecated, use getDownloadUrl)
   */
  async read(url: string) {
    return null;
  }

  /**
   * Duplicate a file inside its folder
   * 
   * @param pointerId - the pointer Id of the file to duplicate
   * @param targetFolderId - the folder Id of the destination folder
   * @returns The new file and pointer created by the duplication
   * @throws NotFoundException if Pointer not found
   */
  async duplicate(pointerId: string, targetFolderId?: string): Promise<UploadResult>{
    // Get file by pointer Id
    const [pointer] = await this.db
      .select({
        fileId: schema.filePointers.fileId,
        s3key: schema.files.s3Key,
        mimeType: schema.files.mimeType,
        size: schema.files.size,
        uploadedBy: schema.files.uploadedBy,
        name: schema.filePointers.name,
        folderId: schema.filePointers.folderId,
        filebaseId: schema.folders.filebaseId,
        
      })
      .from(schema.filePointers)
      .innerJoin(schema.files, eq(schema.filePointers.fileId, schema.files.id))
      .innerJoin(schema.folders, eq(schema.filePointers.folderId, schema.folders.id))
      .where(eq(schema.filePointers.id, pointerId));

      if (!pointer) {
        throw new NotFoundException('File not found');
      }

      // Duplicate in S3
      const newS3key = await this.fsService.duplicate(pointer.s3key,pointer.filebaseId);

      // Check if targetFolderId is provided, if not use the same folder as the original file
      if (!targetFolderId) {
          targetFolderId = pointer.folderId;
      }
    
      //Create file record in DB (for the duplicated file)
      const result = await this.db.transaction(async (tx) => {
        const [file] = await tx
          .insert(schema.files)
          .values({
            s3Key: newS3key,
            mimeType: pointer.mimeType,
            size: pointer.size,
            uploadedBy: pointer.uploadedBy
          })
          .returning();
        
        // Extract the name without the extention
        let nameWithoutExt = '';
        let extension = '';
        const lastDotIndex = pointer.name.lastIndexOf('.');

        if (lastDotIndex !== -1) {
          nameWithoutExt = pointer.name.substring(0, lastDotIndex);
          extension = pointer.name.substring(lastDotIndex);
        }
        let copies = '_copy';
        let newName = `${nameWithoutExt}${copies}${extension}`;

        //check for name conflict in the folder
        while(true) {
          const [existing] = await tx
            .select()
            .from(schema.filePointers)
            .where(
              and(
                eq(schema.filePointers.folderId, targetFolderId),
                eq(schema.filePointers.name, newName)
              )
            );
            if (existing) {
              newName = `${nameWithoutExt}${copies}${extension}`;
              copies += '_copy';
            } else {
              break;
            }
        }

        // Create pointer for the duplicated file
        const [newPointer] = await tx
          .insert(schema.filePointers)
          .values({
            fileId: file.id,
            folderId: targetFolderId,
            name: newName,
            isShortcut: false,
          })
          .returning();
        
        return { file, pointer: newPointer};
      })

      return result;
  }
}