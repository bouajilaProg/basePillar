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
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileService } from './files.service';
import { FilebaseAccessGuard, FilebaseRoles } from './guards/filebaseAccess.guard';
import { UploadFileDto, CreateShortcutDto, RenameFileDto, MoveFileDto } from './dto/file.dto';

/**
 * FilesController
 *
 * Handles file uploads, downloads, and pointer management.
 */
@Controller('filebases/:filebaseId/files')
@UseGuards(JwtAuthGuard, FilebaseAccessGuard)
@FilebaseRoles('viewer')
@ApiTags('files')
export class FilesController {
  constructor(private readonly fileService: FileService) {}

  /**
   * List files in a folder
   */
  @Get('folder/:folderId')
  @ApiOperation({ summary: 'List files in a folder' })
  @ApiResponse({ status: 200, description: 'File pointers returned' })
  async listByFolder(@Param('folderId') folderId: string) {
    return this.fileService.findByFolderId(folderId);
  }

  /**
   * Get file pointer details
   */
  @Get(':pointerId')
  @ApiOperation({ summary: 'Get file pointer details' })
  @ApiResponse({ status: 200, description: 'File pointer returned' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async findOne(@Param('pointerId') pointerId: string) {
    return this.fileService.findById(pointerId);
  }

  /**
   * Get signed download URL
   */
  @Get(':pointerId/download')
  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL returned' })
  @ApiResponse({ status: 404, description: 'File not found' })
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: { type: 'string', example: 'folder-uuid' },
        name: { type: 'string', example: 'Q1 Report.pdf' },
      },
      required: ['file', 'folderId'],
    },
  })
  @ApiOperation({ summary: 'Upload a file and create a pointer' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 409, description: 'File with same name exists in folder' })
  async upload(
    @Request() req: any,
    @Param('filebaseId') filebaseId: string,
    @Body() body: UploadFileDto,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    return this.fileService.upload({
      filebaseId,
      folderId: body.folderId,
      name: body.name || file.originalname,
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
  @ApiOperation({ summary: 'Create a file shortcut' })
  @ApiResponse({ status: 201, description: 'Shortcut created' })
  @ApiResponse({ status: 404, description: 'Source file not found' })
  @ApiResponse({ status: 409, description: 'File with same name exists in target folder' })
  async createShortcut(
    @Param('pointerId') sourcePointerId: string,
    @Body() body: CreateShortcutDto
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
  @ApiOperation({ summary: 'Rename a file pointer' })
  @ApiResponse({ status: 200, description: 'File pointer updated' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'File with same name exists in folder' })
  async rename(@Param('pointerId') pointerId: string, @Body() body: RenameFileDto) {
    return this.fileService.rename(pointerId, body.name);
  }

  /**
   * Move a file pointer to another folder
   */
  @Patch(':pointerId/move')
  @FilebaseRoles('editor')
  @ApiOperation({ summary: 'Move a file pointer' })
  @ApiResponse({ status: 200, description: 'File pointer moved' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'File with same name exists in target folder' })
  async move(@Param('pointerId') pointerId: string, @Body() body: MoveFileDto) {
    return this.fileService.move(pointerId, body.folderId);
  }

  /**
   * Delete a file pointer
   */
  @Delete(':pointerId')
  @FilebaseRoles('editor')
  @ApiOperation({ summary: 'Delete a file pointer' })
  @ApiResponse({ status: 200, description: 'File pointer deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async delete(@Param('pointerId') pointerId: string) {
    return this.fileService.delete(pointerId);
  }
}
