import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create a fake JWT for tests
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa('fake-signature');
  return `${header}.${body}.${signature}`;
}

export const handlers = [
  http.get(`${API_URL}/api/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  http.post(`${API_URL}/api/admin/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { error: 'Email and password are required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    if (body.email === 'admin@test.com' && body.password === 'password') {
      const token = createFakeJwt({
        adminId: 'admin-uuid',
        email: 'admin@test.com',
        exp: Math.floor(Date.now() / 1000) + 8 * 3600,
      });
      return HttpResponse.json({ token });
    }

    return HttpResponse.json(
      { error: 'Invalid email or password', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }),

  // Admin teams list (placeholder for M3)
  http.get(`${API_URL}/api/admin/teams`, () => {
    return HttpResponse.json({ data: [], total: 0 });
  }),
];
