import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';

export interface StarFolderDto {
  filebaseId: string;
  folderId: string;
  userId: string;
}

export interface StarredFolderListItem {
  id: string;
  filebaseId: string;
  folderId: string;
  userId: string;
  createdAt: Date;
  folderName: string;
  parentId: string | null;
}

@Injectable()
export class StarsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database
  ) {}

  async star(dto: StarFolderDto): Promise<schema.Star> {
    const { filebaseId, folderId, userId } = dto;

    const [folder] = await this.db
      .select()
      .from(schema.folders)
      .where(eq(schema.folders.id, folderId));

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.filebaseId !== filebaseId) {
      throw new BadRequestException('Folder does not belong to this filebase');
    }

    const [existing] = await this.db
      .select()
      .from(schema.stars)
      .where(
        and(
          eq(schema.stars.filebaseId, filebaseId),
          eq(schema.stars.folderId, folderId),
          eq(schema.stars.userId, userId)
        )
      );

    if (existing) {
      throw new ConflictException('Folder is already starred');
    }

    const [star] = await this.db
      .insert(schema.stars)
      .values({ filebaseId, folderId, userId })
      .returning();

    return star;
  }

  async unstar(dto: StarFolderDto): Promise<void> {
    const { filebaseId, folderId, userId } = dto;

    const [removed] = await this.db
      .delete(schema.stars)
      .where(
        and(
          eq(schema.stars.filebaseId, filebaseId),
          eq(schema.stars.folderId, folderId),
          eq(schema.stars.userId, userId)
        )
      )
      .returning();

    if (!removed) {
      throw new NotFoundException('Star not found');
    }
  }

  async listStars(filebaseId: string, userId: string): Promise<StarredFolderListItem[]> {
    return this.db
      .select({
        id: schema.stars.id,
        filebaseId: schema.stars.filebaseId,
        folderId: schema.stars.folderId,
        userId: schema.stars.userId,
        createdAt: schema.stars.createdAt,
        folderName: schema.folders.name,
        parentId: schema.folders.parentId,
      })
      .from(schema.stars)
      .innerJoin(schema.folders, eq(schema.stars.folderId, schema.folders.id))
      .where(and(eq(schema.stars.filebaseId, filebaseId), eq(schema.stars.userId, userId)))
      .orderBy(desc(schema.stars.createdAt));
  }
}
