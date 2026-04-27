import { Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilebaseAccessGuard, FilebaseRoles } from '../files/guards/filebaseAccess.guard';
import { StarsService } from './stars.service';
import { StarDto, StarredFolderDto, UnstarResponseDto } from './dto/stars.dto';

@Controller('filebases/:filebaseId')
@UseGuards(JwtAuthGuard, FilebaseAccessGuard)
@FilebaseRoles('viewer')
@ApiTags('stars')
@ApiCookieAuth('access_token')
export class StarsController {
  constructor(private readonly starsService: StarsService) {}

  @Get('stars')
  @ApiOperation({ summary: 'List starred folders for current user in a filebase' })
  @ApiParam({ name: 'filebaseId', description: 'Filebase ID' })
  @ApiResponse({
    status: 200,
    description: 'Starred folders returned',
    type: StarredFolderDto,
    isArray: true,
  })
  async listStars(@Param('filebaseId') filebaseId: string, @Request() req: any) {
    return this.starsService.listStars(filebaseId, req.user.sub);
  }

  @Post('folders/:folderId/star')
  @ApiOperation({ summary: 'Star a folder for the current user' })
  @ApiParam({ name: 'filebaseId', description: 'Filebase ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiResponse({ status: 201, description: 'Folder starred', type: StarDto })
  @ApiResponse({ status: 400, description: 'Folder does not belong to this filebase' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 409, description: 'Folder already starred' })
  async star(
    @Param('filebaseId') filebaseId: string,
    @Param('folderId') folderId: string,
    @Request() req: any
  ) {
    return this.starsService.star({
      filebaseId,
      folderId,
      userId: req.user.sub,
    });
  }

  @Delete('folders/:folderId/star')
  @ApiOperation({ summary: 'Remove a folder from current user starred list' })
  @ApiParam({ name: 'filebaseId', description: 'Filebase ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder unstarred', type: UnstarResponseDto })
  @ApiResponse({ status: 404, description: 'Star not found' })
  async unstar(
    @Param('filebaseId') filebaseId: string,
    @Param('folderId') folderId: string,
    @Request() req: any
  ) {
    await this.starsService.unstar({
      filebaseId,
      folderId,
      userId: req.user.sub,
    });

    return { success: true };
  }
}
