import { Request, Response, NextFunction } from 'express';
import { createAuthMiddleware } from './auth';
import { AuthService } from '../services';

describe('Auth Middleware', () => {
  const JWT_SECRET = 'test-secret';
  const authService = new AuthService(JWT_SECRET);
  const middleware = createAuthMiddleware(authService);

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockReq = { headers: {} };
    mockRes = { status: statusFn };
    mockNext = jest.fn();
  });

  it('returns 401 when Authorization header is missing', () => {
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      error: 'Missing or invalid authorization header',
      code: 'UNAUTHORIZED',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    mockReq.headers = { authorization: 'Basic abc123' };

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const expiredService = new AuthService(JWT_SECRET, '0s');
    const token = expiredService.generateToken({ id: 'admin-id', email: 'admin@test.com' });
    mockReq.headers = { authorization: `Bearer ${token}` };

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('attaches decoded payload to req.admin and calls next() for valid token', () => {
    const token = authService.generateToken({ id: 'admin-id', email: 'admin@test.com' });
    mockReq.headers = { authorization: `Bearer ${token}` };

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.admin).toBeDefined();
    expect(mockReq.admin!.adminId).toBe('admin-id');
    expect(mockReq.admin!.email).toBe('admin@test.com');
  });
});
