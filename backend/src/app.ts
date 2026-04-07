import express from 'express';
import cors from 'cors';
import { healthRouter, createAdminAuthRouter } from './routes';
import { createAuthMiddleware } from './middleware';
import { AuthService } from './services';
import { EnvConfig } from './config';

export function createApp(config: EnvConfig) {
  const app = express();

  // CORS configuration (US-07)
  app.use(
    cors({
      origin: config.FRONTEND_URL,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    }),
  );

  // Body parsing
  app.use(express.json());

  // Health check - registered before any auth middleware (US-06)
  app.use('/api', healthRouter);

  // Auth service (US-10)
  const authService = new AuthService(config.JWT_SECRET);

  // Admin login - no auth required (US-10)
  app.use('/api/admin', createAdminAuthRouter(authService));

  // Auth middleware for all other /api/admin/* routes (US-11)
  const authMiddleware = createAuthMiddleware(authService);
  app.use('/api/admin', authMiddleware);

  // Protected admin routes will be added here in M3

  return app;
}
