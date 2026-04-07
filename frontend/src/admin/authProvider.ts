const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'mood_tracker_admin_token';

export interface AuthProvider {
  login: (params: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkError: (error: { status: number }) => Promise<void>;
  getIdentity: () => Promise<{ id: string; fullName: string }>;
}

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid email or password');
    }

    const { token } = await response.json();
    localStorage.setItem(TOKEN_KEY, token);
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Decode and check expiry (without verifying signature — server does that)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Token expired');
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error('Invalid token');
    }
  },

  checkError: async (error) => {
    if (error.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error('Unauthorized');
    }
  },

  getIdentity: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.adminId, fullName: payload.email };
    } catch {
      throw new Error('Invalid token');
    }
  },
};

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
