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
import { FilebasesService } from './filebases.service';
import { FilebaseAccessGuard, FilebaseRoles } from './guards/filebaseAccess.guard';
import { CreateFilebaseDto, UpdateFilebaseDto } from './dto/filebase.dto';

/**
 * FilebasesController
 *
 * Handles filebase CRUD operations.
 */
@Controller('filebases')
@UseGuards(JwtAuthGuard)
@ApiTags('filebases')
export class FilebasesController {
  constructor(private readonly filebasesService: FilebasesService) {}

  /**
   * Create a new filebase for the current user
   */
  @Post()
  @ApiOperation({ summary: 'Create a filebase for the current user' })
  @ApiResponse({ status: 201, description: 'Filebase created' })
  @ApiResponse({ status: 409, description: 'User already has a filebase' })
  async create(@Request() req: any, @Body() dto: CreateFilebaseDto) {
    return this.filebasesService.create({
      ownerId: req.user.sub,
      name: dto.name,
    });
  }

  /**
   * Get the current user's filebase
   */
  @Get('mine')
  @ApiOperation({ summary: "Get the current user's filebase" })
  @ApiResponse({ status: 200, description: 'Filebase returned' })
  async getMine(@Request() req: any) {
    return this.filebasesService.findByOwnerId(req.user.sub);
  }

  /**
   * Get a filebase by ID (requires membership)
   */
  @Get(':filebaseId')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('viewer')
  @ApiOperation({ summary: 'Get a filebase by id' })
  @ApiResponse({ status: 200, description: 'Filebase returned' })
  @ApiResponse({ status: 404, description: 'Filebase not found' })
  async findOne(@Param('filebaseId') filebaseId: string) {
    return this.filebasesService.findById(filebaseId);
  }

  /**
   * Update filebase name (requires admin)
   */
  @Patch(':filebaseId')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('admin')
  @ApiOperation({ summary: 'Update a filebase name' })
  @ApiResponse({ status: 200, description: 'Filebase updated' })
  @ApiResponse({ status: 404, description: 'Filebase not found' })
  async update(@Param('filebaseId') filebaseId: string, @Body() dto: UpdateFilebaseDto) {
    return this.filebasesService.update(filebaseId, dto);
  }

  /**
   * Delete a filebase (owner only)
   */
  @Delete(':filebaseId')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('admin')
  @ApiOperation({ summary: 'Delete a filebase' })
  @ApiResponse({ status: 200, description: 'Filebase deleted' })
  @ApiResponse({ status: 404, description: 'Filebase not found' })
  async delete(@Param('filebaseId') filebaseId: string) {
    return this.filebasesService.delete(filebaseId);
  }

  /**
   * Get the root folder of a filebase
   */
  @Get(':filebaseId/root')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('viewer')
  @ApiOperation({ summary: 'Get root folder for a filebase' })
  @ApiResponse({ status: 200, description: 'Root folder returned' })
  async getRoot(@Param('filebaseId') filebaseId: string) {
    return this.filebasesService.getRootFolder(filebaseId);
  }
}
