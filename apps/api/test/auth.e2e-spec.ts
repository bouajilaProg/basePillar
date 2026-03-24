import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

/**
 * AGGRESSIVE E2E TEST SUITE: Authentication
 *
 * Why E2E tests for auth?
 * 1. Integration verification - all layers work together
 * 2. Cookie handling - ensure cookies are set/cleared correctly in real HTTP
 * 3. Validation pipeline - class-validator rejects invalid input
 * 4. Guard protection - unauthorized requests are rejected
 *
 * NOTE: These tests require a running PostgreSQL database.
 * In CI, use docker-compose to spin up a test database.
 *
 * Skip if DATABASE_URL is not set (for environments without DB)
 */

const runE2E = process.env.DATABASE_URL ? describe : describe.skip;

runE2E('Auth E2E (requires database)', () => {
  let app: INestApplication;
  let authCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    /**
     * WHY: Validation must reject invalid email format
     */
    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);
    });

    /**
     * WHY: Validation must reject short passwords
     */
    it('should reject password shorter than 8 characters', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '1234567',
          name: 'Test User',
        })
        .expect(400);
    });

    /**
     * WHY: Validation must reject missing name
     */
    it('should reject missing name', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    /**
     * WHY: Successful registration must set cookie
     */
    it('should register and set auth cookie', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: 'Test User',
        })
        .expect(201);

      expect(response.body.user.email).toBe(uniqueEmail);
      expect(response.body.organization).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();

      // Save cookie for later tests
      const cookies = response.headers['set-cookie'];
      authCookie = Array.isArray(cookies) ? cookies[0] : cookies;
    });
  });

  describe('POST /api/auth/login', () => {
    /**
     * WHY: Invalid credentials must return 401
     */
    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    /**
     * WHY: Valid credentials must return user and set cookie
     */
    it('should login with valid credentials', async () => {
      // First register a user
      const email = `login-test-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
          name: 'Login Test',
        });

      // Then login
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'password123',
        })
        .expect(200);

      expect(response.body.user.email).toBe(email);
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    /**
     * WHY: Protected route must reject requests without cookie
     */
    it('should reject request without auth cookie', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    /**
     * WHY: Protected route must accept valid cookie
     */
    it('should return user with valid auth cookie', async () => {
      // Register and get cookie
      const email = `me-test-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'password123',
          name: 'Me Test',
        });

      const cookies = registerResponse.headers['set-cookie'];
      const cookie = Array.isArray(cookies) ? cookies[0] : cookies;

      // Use cookie to access protected route
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body.email).toBe(email);
      expect(response.body.organizations).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    /**
     * WHY: Logout must clear the cookie
     */
    it('should clear auth cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
      // Cookie should be cleared (set to empty with past expiry)
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });
});
