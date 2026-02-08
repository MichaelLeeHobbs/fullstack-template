// ===========================================
// Auth API
// ===========================================
// Auth-related API calls.

import { api } from './client.js';
import type { User } from '../stores/auth.store.js';

export interface AuthSuccessResponse {
  user: User;
  accessToken: string;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaMethods: string[];
  tempToken: string;
}

export type AuthResponse = AuthSuccessResponse | MfaRequiredResponse;

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

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
};

