const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'SURVEY_TOKEN_SECRET', 'FRONTEND_URL'] as const;

export interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SURVEY_TOKEN_SECRET: string;
  SURVEY_TOKEN_EXPIRY: string;
  METABASE_ENDPOINT: string | undefined;
  METABASE_API_KEY: string | undefined;
  ADMIN_SEED_EMAIL: string | undefined;
  ADMIN_SEED_PASSWORD: string | undefined;
  FRONTEND_URL: string;
  PORT: number;
}

export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Please set them in your .env file or environment.`,
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    SURVEY_TOKEN_SECRET: process.env.SURVEY_TOKEN_SECRET!,
    SURVEY_TOKEN_EXPIRY: process.env.SURVEY_TOKEN_EXPIRY || '7d',
    METABASE_ENDPOINT: process.env.METABASE_ENDPOINT,
    METABASE_API_KEY: process.env.METABASE_API_KEY,
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    PORT: parseInt(process.env.PORT || '3001', 10),
  };
}
