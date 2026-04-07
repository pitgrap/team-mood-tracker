import { Router, Request, Response } from 'express';
import { AuthService } from '../services';

export function createAdminAuthRouter(authService: AuthService) {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const admin = await authService.verifyCredentials(email, password);

    if (!admin) {
      res.status(401).json({
        error: 'Invalid email or password',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const token = authService.generateToken(admin);

    res.status(200).json({ token });
  });

  return router;
}
