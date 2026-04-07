import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes';
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

  return app;
}
