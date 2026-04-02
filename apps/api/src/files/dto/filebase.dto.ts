import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Filebase DTOs
 */
export class CreateFilebaseDto {
  @ApiProperty({ example: 'My Files' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name: string;
}

export class UpdateFilebaseDto {
  @ApiPropertyOptional({ example: 'Renamed Filebase' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name?: string;
}
