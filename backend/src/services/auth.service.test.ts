import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

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

describe('AuthService', () => {
  const JWT_SECRET = 'test-secret-key';
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(JWT_SECRET, '8h');
    jest.clearAllMocks();
  });

  describe('verifyCredentials', () => {
    it('returns admin for valid email and password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      const mockAdmin = {
        id: 'admin-uuid',
        email: 'admin@test.com',
        passwordHash,
        createdAt: new Date(),
      };
      mockFindUnique.mockResolvedValue(mockAdmin);

      const result = await authService.verifyCredentials('admin@test.com', 'correct-password');

      expect(result).toEqual(mockAdmin);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: 'admin@test.com' } });
    });

    it('returns null for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      const mockAdmin = {
        id: 'admin-uuid',
        email: 'admin@test.com',
        passwordHash,
        createdAt: new Date(),
      };
      mockFindUnique.mockResolvedValue(mockAdmin);

      const result = await authService.verifyCredentials('admin@test.com', 'wrong-password');

      expect(result).toBeNull();
    });

    it('returns null for non-existent email', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await authService.verifyCredentials('nonexistent@test.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('returns a valid 8-hour admin JWT', () => {
      const admin = { id: 'admin-uuid', email: 'admin@test.com' };

      const token = authService.generateToken(admin);
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

      expect(decoded.adminId).toBe('admin-uuid');
      expect(decoded.email).toBe('admin@test.com');
      // Check expiry is roughly 8 hours from now
      const eightHoursFromNow = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThanOrEqual(eightHoursFromNow + 10);
    });
  });

  describe('verifyToken', () => {
    it('returns decoded payload for valid token', () => {
      const admin = { id: 'admin-uuid', email: 'admin@test.com' };
      const token = authService.generateToken(admin);

      const payload = authService.verifyToken(token);

      expect(payload.adminId).toBe('admin-uuid');
      expect(payload.email).toBe('admin@test.com');
    });

    it('throws for expired token', () => {
      const expiredService = new AuthService(JWT_SECRET, '0s');
      const token = expiredService.generateToken({
        id: 'admin-uuid',
        email: 'admin@test.com',
      });

      // Expired tokens throw on verify
      expect(() => authService.verifyToken(token)).toThrow();
    });

    it('throws for tampered token', () => {
      const token = authService.generateToken({
        id: 'admin-uuid',
        email: 'admin@test.com',
      });
      const tamperedToken = token + 'tampered';

      expect(() => authService.verifyToken(tamperedToken)).toThrow();
    });

    it('throws for token signed with wrong secret', () => {
      const wrongService = new AuthService('wrong-secret');
      const token = wrongService.generateToken({
        id: 'admin-uuid',
        email: 'admin@test.com',
      });

      expect(() => authService.verifyToken(token)).toThrow();
    });
  });
});
