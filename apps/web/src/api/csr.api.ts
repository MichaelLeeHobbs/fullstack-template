// ===========================================
// CSR API
// ===========================================

import { api } from './client.js';
import type { CertificateRequest, SubmitCsrInput, ApproveCsrInput, RejectCsrInput, PaginatedResponse } from '@fullstack-template/shared';

export const csrApi = {
  list: (params?: { page?: number; limit?: number; status?: string; targetCaId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.targetCaId) searchParams.set('targetCaId', params.targetCaId);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<CertificateRequest>>(`/certificates/requests${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api.get<CertificateRequest>(`/certificates/requests/${id}`),

  submit: (data: SubmitCsrInput) => api.post<CertificateRequest>('/certificates/requests', data),

  approve: (id: string, data: ApproveCsrInput) => api.post<CertificateRequest>(`/certificates/requests/${id}/approve`, data),

  reject: (id: string, data: RejectCsrInput) => api.post<CertificateRequest>(`/certificates/requests/${id}/reject`, data),
};
