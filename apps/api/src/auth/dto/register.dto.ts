import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Registration DTO
 *
 * Validates user registration input.
 */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must be at most 72 characters long' }) // bcrypt limit
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name: string;

  @ApiProperty({ example: 'My Company', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Organization name must be at most 255 characters long' })
  organizationName?: string;
}
