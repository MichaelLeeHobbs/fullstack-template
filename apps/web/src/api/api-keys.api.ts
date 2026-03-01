// ===========================================
// API Keys API
// ===========================================
// API calls for API key and service account management.

import { api } from './client.js';
import type {
  ApiKey,
  ApiKeyListItem,
  PaginatedResponse,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  UpdateApiKeyPermissionsInput,
  ServiceAccount,
  CreateServiceAccountInput,
} from '@fullstack-template/shared';

export const apiKeysApi = {
  // ===========================================
  // Self-Service
  // ===========================================

  listMy: () => api.get<ApiKey[]>('/api-keys/my'),

  // ===========================================
  // Admin API Keys
  // ===========================================

  list: (params?: { page?: number; limit?: number; userId?: string; isActive?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<ApiKeyListItem>>(`/api-keys${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<ApiKey>(`/api-keys/${id}`),

  create: (data: CreateApiKeyInput) => api.post<CreateApiKeyResponse>('/api-keys', data),

  setPermissions: (id: string, data: UpdateApiKeyPermissionsInput) =>
    api.put<{ id: string }>(`/api-keys/${id}/permissions`, data),

  revoke: (id: string) => api.post<{ id: string }>(`/api-keys/${id}/revoke`),

  delete: (id: string) => api.delete<{ deleted: boolean }>(`/api-keys/${id}`),

  // ===========================================
  // Service Accounts
  // ===========================================

  listServiceAccounts: () => api.get<PaginatedResponse<ServiceAccount>>('/api-keys/service-accounts'),

  createServiceAccount: (data: CreateServiceAccountInput) =>
    api.post<ServiceAccount>('/api-keys/service-accounts', data),

  deleteServiceAccount: (id: string) =>
    api.delete<{ deleted: boolean }>(`/api-keys/service-accounts/${id}`),
};
