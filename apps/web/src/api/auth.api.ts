// ===========================================
// Auth API
// ===========================================
// Auth-related API calls.

import { api } from './client.js';
import type {
  User,
  AuthSuccessResponse,
  MfaRequiredResponse,
  AuthResponse,
  LoginInput,
  RegisterInput,
} from '@fullstack-template/shared';

export type { AuthSuccessResponse, MfaRequiredResponse, AuthResponse, LoginInput, RegisterInput };

export type RegisterApiInput = Omit<RegisterInput, 'confirmPassword'>;

export const authApi = {
  register: (data: RegisterApiInput) =>
    api.post<AuthResponse>('/auth/register', data, { skipAuth: true }),

  login: (data: LoginInput) =>
    api.post<AuthResponse>('/auth/login', data, { skipAuth: true }),

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
};

