// Base exception class
export { AppException } from './base.exception';

// Authentication exceptions
export {
  InvalidCredentialsException,
  UnauthorizedException,
  ForbiddenException,
  TokenExpiredException,
} from './auth.exception';

// Validation exception
export { ValidationException, type ValidationError } from './validation.exception';

// Resource exceptions
export { NotFoundException } from './not-found.exception';
export { ConflictException } from './conflict.exception';

// Server exceptions
export { InternalServerException } from './internal.exception';
