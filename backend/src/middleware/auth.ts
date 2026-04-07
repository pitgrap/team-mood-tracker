import { Request, Response, NextFunction } from 'express';
import { AuthService, AdminPayload } from '../services';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = authService.verifyToken(token);
      req.admin = payload;
      next();
    } catch {
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      });
      return;
    }
  };
}
