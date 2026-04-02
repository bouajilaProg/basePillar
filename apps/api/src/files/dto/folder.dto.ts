import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Folder DTOs
 */
export class CreateFolderDto {
  @ApiProperty({ example: 'Design Docs' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name: string;

  @ApiPropertyOptional({ example: 'folder-uuid', nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateFolderDto {
  @ApiPropertyOptional({ example: 'Renamed Folder' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name?: string;
}

export class MoveFolderDto {
  @ApiProperty({ example: 'parent-folder-uuid' })
  @IsString()
  parentId: string;
}
