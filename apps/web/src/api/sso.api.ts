// ===========================================
// SSO API
// ===========================================
// API calls for SSO provider management and public provider listing.

import { api } from './client.js';
import type {
  SsoProviderPublic,
  SsoProviderAdmin,
  CreateSsoProviderInput,
  UpdateSsoProviderInput,
} from '@fullstack-template/shared';

export const ssoApi = {
  // ===========================================
  // Public (no auth)
  // ===========================================

  listPublicProviders: () =>
    api.get<SsoProviderPublic[]>('/sso/providers', { skipAuth: true }),

  // ===========================================
  // Admin CRUD
  // ===========================================

  listProviders: () =>
    api.get<SsoProviderAdmin[]>('/admin/sso/providers'),

  getProvider: (id: string) =>
    api.get<SsoProviderAdmin>(`/admin/sso/providers/${id}`),

  createProvider: (data: CreateSsoProviderInput) =>
    api.post<SsoProviderAdmin>('/admin/sso/providers', data),

  updateProvider: (id: string, data: UpdateSsoProviderInput) =>
    api.patch<SsoProviderAdmin>(`/admin/sso/providers/${id}`, data),

  deleteProvider: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/sso/providers/${id}`),

  toggleProvider: (id: string, isEnabled: boolean) =>
    api.patch<SsoProviderAdmin>(`/admin/sso/providers/${id}/toggle`, { isEnabled }),
};
