// ===========================================
// API Client
// ===========================================
// Fetch wrapper with automatic token refresh.

import { useAuthStore } from '../stores/auth.store.js';

const API_URL = '/api/v1';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

// Mutex for token refresh — prevents concurrent 401s from triggering multiple refreshes
let refreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  const { accessToken, setAccessToken, clearAuth } =
    useAuthStore.getState();

  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });
  };

  let response = await makeRequest(accessToken);

  // If 401, try to refresh using httpOnly cookie (with mutex)
  if (response.status === 401 && !skipAuth) {
    try {
      // If a refresh is already in progress, wait for it instead of starting another
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              setAccessToken(refreshData.data.accessToken);
              return refreshData.data.accessToken as string;
            } else {
              clearAuth();
              return null;
            }
          } catch {
            clearAuth();
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken) {
        response = await makeRequest(newToken);
      } else {
        throw new ApiError(401, 'Session expired');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      clearAuth();
      throw new ApiError(401, 'Session expired');
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Request failed');
  }

  return data.data as T;
}

// Convenience methods
export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

