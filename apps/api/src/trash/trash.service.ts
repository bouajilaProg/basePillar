import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as schema from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import { TrashedFilePointerDto } from './dto/trashed-file-pointer.dto';

@Injectable()
export class TrashService {
    constructor(
        @Inject(DB_CONNECTION) 
        private readonly db: Database
    ) {}
    
    /**
    *  Get the file pointer by ID
    * 
    * @Throws NotFoundException if the file pointer does not exist
    * @Param filePointerId The ID of the file pointer to move to trash
    */ 
    async moveToTrash(filePointerId: string): Promise<void> {
    
      const [pointer] = await this.db
        .select()
        .from(schema.filePointers)
        .where(eq(schema.filePointers.id, filePointerId));

        // If the file pointer does not exist, throw a NotFoundException
        if (!pointer) {
            throw new NotFoundException('File pointer not found');
        }
        // If the file pointer is a shortcut, don't allow moving to trash (enforce that shortcuts must be deleted/restored via their original pointer)
        if (pointer.isShortcut) {
            throw new NotFoundException('Shortcuts cannot be moved to trash directly');
        }
        // Mark the file pointer as archived (soft delete)
        await this.db
            .update(schema.filePointers)
            .set({ isArchived: true })
            .where(eq(schema.filePointers.id, filePointerId));
    }

    /**
     * 
     * Restore a file pointer from the trash
     * 
     * @Throws NotFoundException if the file pointer does not exist or is not archived
     */
    async restoreFromTrash(filePointerId: string): Promise<void> {
        const [pointer] = await this.db
        .select()
        .from(schema.filePointers)
        .where(and(
            eq(schema.filePointers.id, filePointerId),
            eq(schema.filePointers.isArchived, true)
        ));
        
        if (!pointer) {
            throw new NotFoundException('File pointer not found or not in trash');
        }

        await this.db
            .update(schema.filePointers)
            .set({ isArchived: false })
            .where(eq(schema.filePointers.id, filePointerId));
    }

    /**
     * List all file pointers in the trash for a given filebase
     * 
     * @param filebaseId The ID of the filebase to list trashed items for
     * @return An array of file pointers that are in the trash for the specified filebase
     */
    async listTrashedItems(filebaseId: string): Promise<TrashedFilePointerDto[]> {

        // subquery to get all folder IDs in the filebase
        const folderIdsSubquery = this.db
          .select({ id: schema.folders.id })
          .from(schema.folders)
          .where(eq(schema.folders.filebaseId, filebaseId));
        
        // main query to get all archived file pointers in those folders
                const trashedItems = await this.db
          .select()
          .from(schema.filePointers)
            .where(and(
              eq(schema.filePointers.isArchived, true),
              inArray(schema.filePointers.folderId, folderIdsSubquery)
            ));

                return trashedItems.map((pointer) => ({
                    id: pointer.id,
                    fileId: pointer.fileId,
                    folderId: pointer.folderId,
                    name: pointer.name,
                    isShortcut: pointer.isShortcut,
                    isArchived: pointer.isArchived,
                    createdAt: pointer.createdAt,
                    updatedAt: pointer.updatedAt,
                }));
    }
}
