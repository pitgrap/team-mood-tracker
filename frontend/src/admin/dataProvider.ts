import { DataProvider } from 'react-admin';
import { getAuthToken } from './authProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || 'API error') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return {};
  }
  return response.json();
}

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const page = params.pagination?.page ?? 1;
    const perPage = params.pagination?.perPage ?? 25;
    const url = `${API_URL}/api/admin/${resource}?page=${page}&perPage=${perPage}`;

    const response = await fetch(url, { headers: getHeaders() });
    const json = await handleResponse(response);

    return {
      data: json.data,
      total: json.total,
    };
  },

  getOne: async (resource, params) => {
    const response = await fetch(`${API_URL}/api/admin/${resource}/${params.id}`, {
      headers: getHeaders(),
    });
    const json = await handleResponse(response);

    return { data: json };
  },

  create: async (resource, params) => {
    const response = await fetch(`${API_URL}/api/admin/${resource}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params.data),
    });
    const json = await handleResponse(response);

    return { data: json };
  },

  update: async (resource, params) => {
    const response = await fetch(`${API_URL}/api/admin/${resource}/${params.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(params.data),
    });
    const json = await handleResponse(response);

    return { data: json };
  },

  delete: async (resource, params) => {
    const response = await fetch(`${API_URL}/api/admin/${resource}/${params.id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    await handleResponse(response);

    return { data: { id: params.id } as never };
  },

  getMany: async () => ({ data: [] }),
  getManyReference: async () => ({ data: [], total: 0 }),
  updateMany: async () => ({ data: [] }),
  deleteMany: async () => ({ data: [] }),
};
