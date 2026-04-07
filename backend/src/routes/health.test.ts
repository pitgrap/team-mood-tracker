import { createApp } from '../app';
import request from 'supertest';
import { EnvConfig } from '../config';

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

describe('GET /api/health', () => {
  const app = createApp(mockConfig);

  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('requires no authentication', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
  });
});
