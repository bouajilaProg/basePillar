import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { InvalidCredentialsException, ConflictException, NotFoundException } from '@repo/types';
import { DB_CONNECTION, type Database } from '../db/db.module';
import * as schema from '../db/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Authentication Service
 *
 * Handles user registration, login, and token management.
 *
 * Security considerations:
 * - Passwords are hashed with bcrypt (cost factor 10)
 * - JWT tokens are stored in HttpOnly cookies
 * - Generic error messages prevent user enumeration
 *
 * NOTE: Organization/membership logic is commented out for now.
 * Users can optionally create a filebase after registration.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Register a new user
   *
   * Creates user only - filebase creation is handled separately.
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('email', dto.email);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // NOTE: Organization creation is commented out for now
    // Users can create a filebase after registration
    // -----------------------------------------------
    // // Generate organization slug from email
    // const slug = this.generateSlug(dto.email);
    //
    // // Check if organization slug exists
    // const existingOrg = await this.db
    //   .select()
    //   .from(schema.organizations)
    //   .where(eq(schema.organizations.slug, slug))
    //   .limit(1);
    //
    // const orgSlug = existingOrg.length > 0 ? `${slug}-${Date.now()}` : slug;
    // const orgName = dto.organizationName || `${dto.name}'s Organization`;
    //
    // // Create organization
    // const [organization] = await this.db
    //   .insert(schema.organizations)
    //   .values({
    //     name: orgName,
    //     slug: orgSlug,
    //   })
    //   .returning();

    // Create user
    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: dto.email,
        password: passwordHash,
        name: dto.name,
      })
      .returning();

    // NOTE: Membership creation is commented out for now
    // -----------------------------------------------
    // // Create admin membership
    // await this.db.insert(schema.memberships).values({
    //   userId: user.id,
    //   organizationId: organization.id,
    //   role: 'admin',
    // });

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      // NOTE: Organization is commented out - will be replaced by filebase
      // organization: {
      //   id: organization.id,
      //   name: organization.name,
      //   slug: organization.slug,
      // },
      token,
    };
  }

  /**
   * Login user
   *
   * Validates credentials and returns JWT token.
   */
  async login(dto: LoginDto) {
    // Find user by email
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1);

    if (!user) {
      // Generic error to prevent user enumeration
      throw new InvalidCredentialsException({ email: dto.email });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException({ email: dto.email });
    }

    // NOTE: Organization/membership queries are commented out for now
    // Will be replaced by filebase queries
    // -----------------------------------------------
    // // Get user's organizations
    // const userMemberships = await this.db
    //   .select({
    //     organization: schema.organizations,
    //     role: schema.memberships.role,
    //   })
    //   .from(schema.memberships)
    //   .innerJoin(
    //     schema.organizations,
    //     eq(schema.memberships.organizationId, schema.organizations.id)
    //   )
    //   .where(eq(schema.memberships.userId, user.id));

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      // NOTE: Organizations are commented out - will be replaced by filebases
      // organizations: userMemberships.map((m) => ({
      //   id: m.organization.id,
      //   name: m.organization.name,
      //   slug: m.organization.slug,
      //   role: m.role,
      // })),
      token,
    };
  }

  /**
   * Get current user from JWT payload
   */
  async getCurrentUser(userId: string) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User', userId);
    }

    // NOTE: Organization/membership queries are commented out for now
    // Will be replaced by filebase queries
    // -----------------------------------------------
    // // Get user's organizations
    // const userMemberships = await this.db
    //   .select({
    //     organization: schema.organizations,
    //     role: schema.memberships.role,
    //   })
    //   .from(schema.memberships)
    //   .innerJoin(
    //     schema.organizations,
    //     eq(schema.memberships.organizationId, schema.organizations.id)
    //   )
    //   .where(eq(schema.memberships.userId, user.id));

    return {
      ...user,
      // NOTE: Organizations are commented out - will be replaced by filebases
      // organizations: userMemberships.map((m) => ({
      //   id: m.organization.id,
      //   name: m.organization.name,
      //   slug: m.organization.slug,
      //   role: m.role,
      // })),
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }

  /**
   * Generate URL-friendly slug from email
   *
   * NOTE: Kept for future filebase slug generation
   */
  private generateSlug(email: string): string {
    return email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
