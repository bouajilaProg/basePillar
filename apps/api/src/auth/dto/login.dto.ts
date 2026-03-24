import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Login DTO
 *
 * Validates login credentials.
 */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
