import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { EnvConfig } from '../config';

// Mock prisma
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    admin: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../lib/prisma';

const mockFindUnique = prisma.admin.findUnique as jest.Mock;

const mockConfig: EnvConfig = {
  DATABASE_URL: 'postgresql://test:test@localhost:5433/moodtracker_test',
  JWT_SECRET: 'test-jwt-secret',
  SURVEY_TOKEN_SECRET: 'test-survey-token-secret',
  SURVEY_TOKEN_EXPIRY: '7d',
  METABASE_ENDPOINT: undefined,
  METABASE_API_KEY: undefined,
  ADMIN_SEED_EMAIL: undefined,
  ADMIN_SEED_PASSWORD: undefined,
  FRONTEND_URL: 'http://localhost:5173',
  PORT: 3001,
};

describe('POST /api/admin/login', () => {
  const app = createApp(mockConfig);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with JWT token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('valid-password', 10);
    mockFindUnique.mockResolvedValue({
      id: 'admin-uuid',
      email: 'admin@test.com',
      passwordHash,
      createdAt: new Date(),
    });

    const response = await request(app).post('/api/admin/login').send({
      email: 'admin@test.com',
      password: 'valid-password',
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();

    // Verify the token is valid
    const decoded = jwt.verify(response.body.token, mockConfig.JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.adminId).toBe('admin-uuid');
    expect(decoded.email).toBe('admin@test.com');
  });

  it('returns 401 UNAUTHORIZED for invalid password', async () => {
    const passwordHash = await bcrypt.hash('valid-password', 10);
    mockFindUnique.mockResolvedValue({
      id: 'admin-uuid',
      email: 'admin@test.com',
      passwordHash,
      createdAt: new Date(),
    });

    const response = await request(app).post('/api/admin/login').send({
      email: 'admin@test.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('returns 401 UNAUTHORIZED for non-existent email', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await request(app).post('/api/admin/login').send({
      email: 'nonexistent@test.com',
      password: 'password',
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when email is missing', async () => {
    const response = await request(app).post('/api/admin/login').send({
      password: 'password',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password is missing', async () => {
    const response = await request(app).post('/api/admin/login').send({
      email: 'admin@test.com',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when body is empty', async () => {
    const response = await request(app).post('/api/admin/login').send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('Protected admin routes', () => {
  const app = createApp(mockConfig);

  it('returns 401 when accessing a protected route without token', async () => {
    const response = await request(app).get('/api/admin/teams');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when accessing a protected route with invalid token', async () => {
    const response = await request(app)
      .get('/api/admin/teams')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('health check still works without auth', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
