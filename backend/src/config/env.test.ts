import { validateEnv } from './env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws if DATABASE_URL is missing', () => {
    process.env.JWT_SECRET = 'secret';
    process.env.SURVEY_TOKEN_SECRET = 'secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    delete process.env.DATABASE_URL;

    expect(() => validateEnv()).toThrow('DATABASE_URL');
  });

  it('throws if JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    process.env.SURVEY_TOKEN_SECRET = 'secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  it('throws if SURVEY_TOKEN_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    process.env.JWT_SECRET = 'secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    delete process.env.SURVEY_TOKEN_SECRET;

    expect(() => validateEnv()).toThrow('SURVEY_TOKEN_SECRET');
  });

  it('throws if FRONTEND_URL is missing', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    process.env.JWT_SECRET = 'secret';
    process.env.SURVEY_TOKEN_SECRET = 'secret';
    delete process.env.FRONTEND_URL;

    expect(() => validateEnv()).toThrow('FRONTEND_URL');
  });

  it('returns config when all required vars are set', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.SURVEY_TOKEN_SECRET = 'survey-secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    const config = validateEnv();

    expect(config.DATABASE_URL).toBe('postgresql://test:test@localhost:5433/test');
    expect(config.JWT_SECRET).toBe('jwt-secret');
    expect(config.SURVEY_TOKEN_SECRET).toBe('survey-secret');
    expect(config.FRONTEND_URL).toBe('http://localhost:5173');
    expect(config.SURVEY_TOKEN_EXPIRY).toBe('7d');
    expect(config.PORT).toBe(3001);
  });

  it('uses custom SURVEY_TOKEN_EXPIRY if provided', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    process.env.JWT_SECRET = 'secret';
    process.env.SURVEY_TOKEN_SECRET = 'secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.SURVEY_TOKEN_EXPIRY = '14d';

    const config = validateEnv();

    expect(config.SURVEY_TOKEN_EXPIRY).toBe('14d');
  });

  it('uses custom PORT if provided', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    process.env.JWT_SECRET = 'secret';
    process.env.SURVEY_TOKEN_SECRET = 'secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.PORT = '4000';

    const config = validateEnv();

    expect(config.PORT).toBe(4000);
  });
});
