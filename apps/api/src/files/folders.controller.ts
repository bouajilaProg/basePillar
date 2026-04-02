import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FoldersService } from './folders.service';
import { FilebaseAccessGuard, FilebaseRoles } from './guards/filebaseAccess.guard';
import { FileAccessGuard, RequirePermission } from './guards/fileAccess.guard';

/**
 * FoldersController
 *
 * Handles folder CRUD and navigation.
 */
@Controller('filebases/:filebaseId/folders')
@UseGuards(JwtAuthGuard, FilebaseAccessGuard)
@FilebaseRoles('viewer')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * List all folders in a parent folder
   */
  @Get(':folderId/children')
  async listChildren(@Param('filebaseId') filebaseId: string, @Param('folderId') folderId: string) {
    return this.foldersService.findByParentId(filebaseId, folderId);
  }

  /**
   * Get a specific folder
   */
  @Get(':folderId')
  async findOne(@Param('folderId') folderId: string) {
    return this.foldersService.findById(folderId);
  }

  /**
   * Create a new folder
   */
  @Post()
  @FilebaseRoles('editor')
  async create(
    @Param('filebaseId') filebaseId: string,
    @Body() body: { name: string; parentId: string }
  ) {
    return this.foldersService.create({
      filebaseId,
      name: body.name,
      parentId: body.parentId,
    });
  }

  /**
   * Update a folder (rename)
   */
  @Patch(':folderId')
  @FilebaseRoles('editor')
  async update(@Param('folderId') folderId: string, @Body('name') name: string) {
    return this.foldersService.update(folderId, { name });
  }

  /**
   * Move a folder
   */
  @Patch(':folderId/move')
  @FilebaseRoles('editor')
  async move(@Param('folderId') folderId: string, @Body('parentId') parentId: string) {
    return this.foldersService.move(folderId, parentId);
  }

  /**
   * Delete a folder
   */
  @Delete(':folderId')
  @FilebaseRoles('editor')
  async delete(@Param('folderId') folderId: string) {
    return this.foldersService.delete(folderId);
  }

  /**
   * Get folder path (breadcrumb)
   */
  @Get(':folderId/path')
  async getPath(@Param('folderId') folderId: string) {
    return this.foldersService.getPath(folderId);
  }
}
