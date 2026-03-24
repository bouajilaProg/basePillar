import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedException, TokenExpiredException } from '@repo/types';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Auth Guard
 *
 * Custom guard that validates JWT tokens without Passport.js dependency.
 * Extracts token from HttpOnly cookie or Authorization header.
 *
 * Security benefits:
 * - HttpOnly cookies cannot be accessed by JavaScript (XSS protection)
 * - SameSite=strict prevents CSRF attacks
 * - Secure flag ensures HTTPS-only transmission
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const payload = jwt.verify(token, secret) as JwtPayload;

      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Attach user to request
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof UnauthorizedException || error instanceof TokenExpiredException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Extract JWT token from cookie or Authorization header
   */
  private extractToken(request: Request): string | null {
    // First try to get from cookie
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
      return cookieToken;
    }

    // Fallback to Authorization header for API clients
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
