import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileService } from './files.service';
import { FilebaseAccessGuard, FilebaseRoles } from './guards/filebaseAccess.guard';

/**
 * FilesController
 *
 * Handles file uploads, downloads, and pointer management.
 */
@Controller('filebases/:filebaseId/files')
@UseGuards(JwtAuthGuard, FilebaseAccessGuard)
@FilebaseRoles('viewer')
export class FilesController {
  constructor(private readonly fileService: FileService) {}

  /**
   * List files in a folder
   */
  @Get('folder/:folderId')
  async listByFolder(@Param('folderId') folderId: string) {
    return this.fileService.findByFolderId(folderId);
  }

  /**
   * Get file pointer details
   */
  @Get(':pointerId')
  async findOne(@Param('pointerId') pointerId: string) {
    return this.fileService.findById(pointerId);
  }

  /**
   * Get signed download URL
   */
  @Get(':pointerId/download')
  async getDownloadUrl(@Param('pointerId') pointerId: string) {
    const url = await this.fileService.getDownloadUrl(pointerId);
    return { url };
  }

  /**
   * Upload a new file
   */
  @Post()
  @FilebaseRoles('editor')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: any,
    @Param('filebaseId') filebaseId: string,
    @Body('folderId') folderId: string,
    @Body('name') name: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    return this.fileService.upload({
      filebaseId,
      folderId,
      name: name || file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      uploadedBy: req.user.sub,
    });
  }

  /**
   * Create a shortcut to an existing file
   */
  @Post(':pointerId/shortcut')
  @FilebaseRoles('editor')
  async createShortcut(
    @Param('pointerId') sourcePointerId: string,
    @Body() body: { targetFolderId: string; name: string }
  ) {
    return this.fileService.createShortcut({
      sourcePointerId,
      targetFolderId: body.targetFolderId,
      name: body.name,
    });
  }

  /**
   * Rename a file pointer
   */
  @Patch(':pointerId')
  @FilebaseRoles('editor')
  async rename(@Param('pointerId') pointerId: string, @Body('name') name: string) {
    return this.fileService.rename(pointerId, name);
  }

  /**
   * Move a file pointer to another folder
   */
  @Patch(':pointerId/move')
  @FilebaseRoles('editor')
  async move(@Param('pointerId') pointerId: string, @Body('folderId') folderId: string) {
    return this.fileService.move(pointerId, folderId);
  }

  /**
   * Delete a file pointer
   */
  @Delete(':pointerId')
  @FilebaseRoles('editor')
  async delete(@Param('pointerId') pointerId: string) {
    return this.fileService.delete(pointerId);
  }
}
