// ===========================================
// Certificate Profiles API
// ===========================================

import { api } from './client.js';
import type { CertificateProfile, CreateProfileInput, UpdateProfileInput, PaginatedResponse } from '@fullstack-template/shared';

export const certificateProfilesApi = {
  list: (params?: { page?: number; limit?: number; certType?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.certType) searchParams.set('certType', params.certType);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<CertificateProfile>>(`/profiles${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api.get<CertificateProfile>(`/profiles/${id}`),

  create: (data: CreateProfileInput) => api.post<CertificateProfile>('/profiles', data),

  update: (id: string, data: UpdateProfileInput) => api.patch<CertificateProfile>(`/profiles/${id}`, data),

  delete: (id: string) => api.delete<{ deleted: boolean }>(`/profiles/${id}`),
};
