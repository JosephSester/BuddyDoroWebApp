const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('authToken');
}

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return { ...headers, ...extra };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
  return handleResponse<T>(res);
}

export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse<T>(res);
}
