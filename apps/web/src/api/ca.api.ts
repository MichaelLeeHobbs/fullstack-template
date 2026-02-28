// ===========================================
// CA API
// ===========================================

import { api } from './client.js';
import type { CertificateAuthority, CreateCaInput, UpdateCaInput, PaginatedResponse } from '@fullstack-template/shared';

export const caApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<CertificateAuthority>>(`/ca${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api.get<CertificateAuthority>(`/ca/${id}`),

  getHierarchy: () => api.get<CertificateAuthority[]>('/ca/hierarchy'),

  create: (data: CreateCaInput) => api.post<CertificateAuthority>('/ca', data),

  update: (id: string, data: UpdateCaInput) => api.patch<CertificateAuthority>(`/ca/${id}`, data),

  suspend: (id: string) => api.post<CertificateAuthority>(`/ca/${id}/suspend`),

  retire: (id: string) => api.post<CertificateAuthority>(`/ca/${id}/retire`),

  getChain: (id: string) => api.get<string[]>(`/ca/${id}/chain`),
};
