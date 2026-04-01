import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, count } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db.module';
import * as schema from '../schema';

/**
 * File Cleanup Service
 *
 * Handles orphan file cleanup when file pointers are deleted.
 *
 * Why a service instead of DB trigger?
 * 1. Need to call S3 to delete physical file
 * 2. Better error handling and logging
 * 3. Can be tested independently
 * 4. Drizzle doesn't natively support triggers
 *
 * Usage:
 * - Call checkAndCleanupOrphanFile(fileId) after deleting a pointer
 * - If file has no remaining pointers, deletes from DB and S3
 */
@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database
    // Note: FsService will be injected when implemented
  ) {}

  /**
   * Check if a file has any remaining pointers.
   * If not, delete the file from DB and S3.
   *
   * @param fileId - The file ID to check
   * @returns true if file was deleted, false if still has pointers
   */
  async checkAndCleanupOrphanFile(fileId: string): Promise<boolean> {
    // Count remaining pointers to this file
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.filePointers)
      .where(eq(schema.filePointers.fileId, fileId));

    const pointerCount = result?.count ?? 0;

    if (pointerCount === 0) {
      this.logger.log(`File ${fileId} has no pointers, cleaning up...`);

      // Get file info for S3 deletion
      const [file] = await this.db
        .select({ s3Key: schema.files.s3Key })
        .from(schema.files)
        .where(eq(schema.files.id, fileId));

      if (file) {
        // Delete from DB first
        await this.db.delete(schema.files).where(eq(schema.files.id, fileId));

        // TODO: Delete from S3 via FsService
        // await this.fsService.delete(file.s3Key);

        this.logger.log(`File ${fileId} cleaned up (S3 key: ${file.s3Key})`);
        return true;
      }
    }

    return false;
  }

  /**
   * Batch cleanup of orphan files.
   * Useful for maintenance/garbage collection.
   *
   * Iterates through all files and checks if each has any pointers.
   * Files without pointers are deleted from both DB and S3.
   *
   * @returns Number of files cleaned up
   */
  async cleanupAllOrphanFiles(): Promise<number> {
    this.logger.log('Starting batch orphan file cleanup...');

    // Get all files and check each for orphan status
    // Note: For large datasets, consider using NOT EXISTS subquery or batching
    const allFiles = await this.db.select().from(schema.files);
    let cleanedCount = 0;

    for (const file of allFiles) {
      const deleted = await this.checkAndCleanupOrphanFile(file.id);
      if (deleted) cleanedCount++;
    }

    this.logger.log(`Batch cleanup complete. Cleaned up ${cleanedCount} orphan files.`);
    return cleanedCount;
  }
}
