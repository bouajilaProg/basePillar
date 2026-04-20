import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * File DTOs
 */
export class UploadFileDto {
  @ApiProperty({ example: 'folder-uuid' })
  @IsString()
  folderId: string;

  @ApiPropertyOptional({ example: 'Q1 Report.pdf' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name?: string;
}

export class CreateShortcutDto {
  @ApiProperty({ example: 'target-folder-uuid' })
  @IsString()
  targetFolderId: string;

  @ApiProperty({ example: 'Shortcut Name' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name: string;
}

export class RenameFileDto {
  @ApiProperty({ example: 'Renamed File' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name: string;
}

export class MoveFileDto {
  @ApiProperty({ example: 'folder-uuid' })
  @IsString()
  folderId: string;
}

export class DuplicateFileDto {}
