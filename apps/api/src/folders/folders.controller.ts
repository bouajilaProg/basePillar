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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FoldersService } from './folders.service';
import { FilebaseAccessGuard, FilebaseRoles } from './guards/filebaseAccess.guard';
import { FileAccessGuard, RequirePermission } from './guards/fileAccess.guard';
import { CreateFolderDto, UpdateFolderDto, MoveFolderDto } from './dto/folder.dto';

/**
 * FoldersController
 *
 * Handles folder CRUD and navigation.
 */
@Controller('filebases/:filebaseId/folders')
@UseGuards(JwtAuthGuard, FilebaseAccessGuard)
@FilebaseRoles('viewer')
@ApiTags('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * List all folders in a parent folder
   */
  @Get(':folderId/children')
  @ApiOperation({ summary: 'List child folders' })
  @ApiResponse({ status: 200, description: 'Child folders returned' })
  async listChildren(@Param('filebaseId') filebaseId: string, @Param('folderId') folderId: string) {
    return this.foldersService.findByParentId(filebaseId, folderId);
  }

  /**
   * Get a specific folder
   */
  @Get(':folderId')
  @ApiOperation({ summary: 'Get a folder by id' })
  @ApiResponse({ status: 200, description: 'Folder returned' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async findOne(@Param('folderId') folderId: string) {
    return this.foldersService.findById(folderId);
  }

  /**
   * Create a new folder
   */
  @Post()
  @FilebaseRoles('editor')
  @ApiOperation({ summary: 'Create a folder' })
  @ApiResponse({ status: 201, description: 'Folder created' })
  @ApiResponse({ status: 404, description: 'Parent folder not found' })
  @ApiResponse({ status: 409, description: 'Folder with same name exists in parent' })
  async create(@Param('filebaseId') filebaseId: string, @Body() body: CreateFolderDto) {
    return this.foldersService.create({
      filebaseId,
      name: body.name,
      parentId: body.parentId ?? null,
    });
  }

  /**
   * Update a folder (rename)
   */
  @Patch(':folderId')
  @FilebaseRoles('editor')
  @ApiOperation({ summary: 'Rename a folder' })
  @ApiResponse({ status: 200, description: 'Folder updated' })
  @ApiResponse({ status: 400, description: 'Cannot rename root folder' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async update(@Param('folderId') folderId: string, @Body() dto: UpdateFolderDto) {
    return this.foldersService.update(folderId, dto);
  }

  /**
   * Move a folder
   */
  @Patch(':folderId/move')
  @FilebaseRoles('editor')
  @ApiOperation({ summary: 'Move a folder' })
  @ApiResponse({ status: 200, description: 'Folder moved' })
  @ApiResponse({ status: 400, description: 'Invalid move' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async move(@Param('folderId') folderId: string, @Body() dto: MoveFolderDto) {
    return this.foldersService.move(folderId, dto.parentId);
  }

  /**
   * Delete a folder
   */
  @Delete(':folderId')
  @FilebaseRoles('editor')
  @ApiOperation({ summary: 'Delete a folder' })
  @ApiResponse({ status: 200, description: 'Folder deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete root folder' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async delete(@Param('folderId') folderId: string) {
    return this.foldersService.delete(folderId);
  }

  /**
   * Get folder path (breadcrumb)
   */
  @Get(':folderId/path')
  @ApiOperation({ summary: 'Get folder path (breadcrumb)' })
  @ApiResponse({ status: 200, description: 'Folder path returned' })
  async getPath(@Param('folderId') folderId: string) {
    return this.foldersService.getPath(folderId);
  }
}
