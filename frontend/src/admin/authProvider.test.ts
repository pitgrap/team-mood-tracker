import { authProvider, getAuthToken } from './authProvider';
import { server } from '../mocks/setup';

// Helper to create a fake JWT with specific payload
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa('fake-signature');
  return `${header}.${body}.${signature}`;
}

describe('authProvider', () => {
  // MSW server is started/stopped in the test setup file

  beforeEach(() => {
    localStorage.clear();
    server.resetHandlers();
  });

  describe('login', () => {
    it('stores JWT in localStorage on valid credentials', async () => {
      await authProvider.login({ username: 'admin@test.com', password: 'password' });

      const token = getAuthToken();
      expect(token).toBeTruthy();
      expect(localStorage.getItem('mood_tracker_admin_token')).toBe(token);
    });

    it('throws on invalid credentials', async () => {
      await expect(
        authProvider.login({ username: 'admin@test.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');

      expect(getAuthToken()).toBeNull();
    });
  });

  describe('logout', () => {
    it('removes token from localStorage', async () => {
      localStorage.setItem('mood_tracker_admin_token', 'some-token');

      await authProvider.logout();

      expect(getAuthToken()).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('resolves when valid token exists', async () => {
      const token = createFakeJwt({
        adminId: 'admin-uuid',
        email: 'admin@test.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      localStorage.setItem('mood_tracker_admin_token', token);

      await expect(authProvider.checkAuth()).resolves.not.toThrow();
    });

    it('rejects when no token exists', async () => {
      await expect(authProvider.checkAuth()).rejects.toThrow();
    });

    it('rejects and clears expired token', async () => {
      const token = createFakeJwt({
        adminId: 'admin-uuid',
        email: 'admin@test.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1h ago
      });
      localStorage.setItem('mood_tracker_admin_token', token);

      await expect(authProvider.checkAuth()).rejects.toThrow();
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('checkError', () => {
    it('clears token on 401 error', async () => {
      localStorage.setItem('mood_tracker_admin_token', 'some-token');

      await expect(authProvider.checkError({ status: 401 })).rejects.toThrow();
      expect(getAuthToken()).toBeNull();
    });

    it('does not clear token on non-401 error', async () => {
      localStorage.setItem('mood_tracker_admin_token', 'some-token');

      await authProvider.checkError({ status: 500 });
      expect(getAuthToken()).toBe('some-token');
    });
  });

  describe('getIdentity', () => {
    it('returns admin identity from token', async () => {
      const token = createFakeJwt({
        adminId: 'admin-uuid',
        email: 'admin@test.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      localStorage.setItem('mood_tracker_admin_token', token);

      const identity = await authProvider.getIdentity();
      expect(identity.id).toBe('admin-uuid');
      expect(identity.fullName).toBe('admin@test.com');
    });

    it('throws when no token exists', async () => {
      await expect(authProvider.getIdentity()).rejects.toThrow();
    });
  });
});
