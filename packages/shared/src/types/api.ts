// ===========================================
// API Response Types
// ===========================================

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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
