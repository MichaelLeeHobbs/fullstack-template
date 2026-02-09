// ===========================================
// Shared Types & Utilities
// ===========================================

// -----------------------------
// Validation Schemas
// -----------------------------

export * from './schemas/auth.schema.js';

// -----------------------------
// API Response Types
// -----------------------------

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// -----------------------------
// User Types
// -----------------------------

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// -----------------------------
// Type Guards
// -----------------------------

export function isApiError(result: ApiResult<unknown>): result is ApiError {
  return !result.success;
}

export function isApiResponse<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return result.success;
}

