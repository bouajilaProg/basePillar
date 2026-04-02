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
import { FilebasesService } from './filebases.service';
import { FilebaseAccessGuard, FilebaseRoles } from './guards/filebaseAccess.guard';

/**
 * FilebasesController
 *
 * Handles filebase CRUD operations.
 */
@Controller('filebases')
@UseGuards(JwtAuthGuard)
export class FilebasesController {
  constructor(private readonly filebasesService: FilebasesService) {}

  /**
   * Create a new filebase for the current user
   */
  @Post()
  async create(@Request() req: any, @Body('name') name: string) {
    return this.filebasesService.create({
      ownerId: req.user.sub,
      name,
    });
  }

  /**
   * Get the current user's filebase
   */
  @Get('mine')
  async getMine(@Request() req: any) {
    return this.filebasesService.findByOwnerId(req.user.sub);
  }

  /**
   * Get a filebase by ID (requires membership)
   */
  @Get(':filebaseId')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('viewer')
  async findOne(@Param('filebaseId') filebaseId: string) {
    return this.filebasesService.findById(filebaseId);
  }

  /**
   * Update filebase name (requires admin)
   */
  @Patch(':filebaseId')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('admin')
  async update(@Param('filebaseId') filebaseId: string, @Body('name') name: string) {
    return this.filebasesService.update(filebaseId, { name });
  }

  /**
   * Delete a filebase (owner only)
   */
  @Delete(':filebaseId')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('admin')
  async delete(@Param('filebaseId') filebaseId: string) {
    return this.filebasesService.delete(filebaseId);
  }

  /**
   * Get the root folder of a filebase
   */
  @Get(':filebaseId/root')
  @UseGuards(FilebaseAccessGuard)
  @FilebaseRoles('viewer')
  async getRoot(@Param('filebaseId') filebaseId: string) {
    return this.filebasesService.getRootFolder(filebaseId);
  }
}
