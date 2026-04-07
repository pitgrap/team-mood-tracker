import express from 'express';
import cors from 'cors';
import {
  healthRouter,
  createAdminAuthRouter,
  adminTeamsRouter,
  adminDashboardRouter,
  createAdminSurveysRouter,
  createParticipantRouter,
} from './routes';
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

  // Protected admin routes (M3)
  app.use('/api/admin', adminDashboardRouter);
  app.use('/api/admin', adminTeamsRouter);
  app.use(
    '/api/admin',
    createAdminSurveysRouter(config.SURVEY_TOKEN_SECRET, config.SURVEY_TOKEN_EXPIRY, config.FRONTEND_URL),
  );

  // Participant routes - no auth required (M3.3)
  app.use('/api', createParticipantRouter(config.SURVEY_TOKEN_SECRET));

  return app;
}
