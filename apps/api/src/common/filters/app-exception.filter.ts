import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '@repo/types';
import type { Logger } from '@repo/logger';

/**
 * Global Exception Filter for AppException
 *
 * This filter catches all AppException instances thrown in the application
 * and converts them to proper HTTP responses while logging them.
 *
 * Design decisions:
 * 1. Uses @repo/logger for consistent log format across services
 * 2. Returns JSON response matching AppException.toJSON() format
 * 3. Falls back to 500 for unknown exceptions
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle our custom AppException
    if (exception instanceof AppException) {
      this.logger.exception(exception);

      return response.status(exception.statusCode).json(exception.toJSON());
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      this.logger.error('HttpException', {
        status,
        message: exception.message,
        response: exceptionResponse,
      });

      return response.status(status).json({
        code: 'HTTP_ERROR',
        statusCode: status,
        message: exception.message,
        timestamp: new Date().toISOString(),
        ...(typeof exceptionResponse === 'object' ? exceptionResponse : {}),
      });
    }

    // Handle unknown exceptions (catch-all)
    const error = exception as Error;
    this.logger.error('Unhandled exception', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });

    return response.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      message: 'An unexpected error occurred. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  }
}
