// ===========================================
// Auth API
// ===========================================
// Auth-related API calls.

import { api } from './client.js';
import type { User } from '../stores/auth.store.js';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterInput) =>
    api.post<AuthResponse>('/auth/register', data, { skipAuth: true }),

  login: (data: LoginInput) =>
    api.post<AuthResponse>('/auth/login', data, { skipAuth: true }),

  logout: (refreshToken: string) =>
    api.post<{ message: string }>('/auth/logout', { refreshToken }),

  me: () => api.get<User>('/auth/me'),
};

