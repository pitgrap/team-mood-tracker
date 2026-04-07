import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const handlers = [
  http.get(`${API_URL}/api/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];
