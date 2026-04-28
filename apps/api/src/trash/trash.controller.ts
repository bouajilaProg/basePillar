import { Controller, UseGuards, Post, Get, Param } from '@nestjs/common';
import { FilebaseAccessGuard, FilebaseRoles } from '@/files/guards/filebaseAccess.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiResponse, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { TrashService } from './trash.service';
import { TrashedFilePointerDto } from './dto/trashed-file-pointer.dto';

@Controller('filebases/:filebaseId')
@UseGuards(JwtAuthGuard, FilebaseAccessGuard)
@FilebaseRoles('editor') // Only editors and above can manage trash
@ApiTags('trash')
@ApiCookieAuth('access_token')
export class TrashController {
  constructor(private readonly trashService: TrashService) {}
  
  // Endpoint to move a file pointer to trash
  @Post('files/:filepointerId/trash')
  @ApiOperation({ summary: 'Move a file pointer to trash' })
  @ApiParam({ name: 'filepointerId', description: 'ID of the file pointer to move to trash' })
  @ApiParam({ name: 'filebaseId', description: 'ID of the filebase for which to move the item to trash' })
  @ApiResponse({ status: 200, description: 'File pointer moved to trash' })
  @ApiResponse({ status: 404, description: 'File pointer not found' })
  async moveToTrash(@Param('filepointerId') filepointerId: string) {
    await this.trashService.moveToTrash(filepointerId);
  }
  
  // Endpoint to restore a file pointer from trash
  @Post('files/:filepointerId/restore')
  @ApiOperation({ summary: 'Restore a file pointer from trash' })
  @ApiParam({ name: 'filepointerId', description: 'ID of the file pointer to restore from trash' })
  @ApiParam({ name: 'filebaseId', description: 'ID of the filebase for which to restore the item' })
  @ApiResponse({ status: 200, description: 'File pointer restored from trash' })
  @ApiResponse({ status: 404, description: 'File pointer not found or not in trash' })
  async restoreFromTrash(@Param('filepointerId') filepointerId: string) {
    await this.trashService.restoreFromTrash(filepointerId);
  }

  // Endpoint to list all file pointers in trash for a filebase 
  @Get('list-trash')
  @ApiOperation({ summary: 'List all file pointers in trash for a filebase' })
  @ApiParam({ name: 'filebaseId', description: 'ID of the filebase for which to list trashed items' })
  @ApiOkResponse({ type: TrashedFilePointerDto, isArray: true })
  @ApiResponse({ status: 404, description: 'File pointer not found' })
  async listTrash(@Param('filebaseId') filebaseId: string): Promise<TrashedFilePointerDto[]> {
    return this.trashService.listTrashedItems(filebaseId);
  }
}
