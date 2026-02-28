// ===========================================
// Certificates API
// ===========================================

import { api } from './client.js';
import type {
  Certificate,
  IssueCertificateInput,
  IssueCertificateResponse,
  RevokeCertificateInput,
  RenewCertificateInput,
  PaginatedResponse,
} from '../types/pki.js';

export const certificatesApi = {
  list: (params?: { page?: number; limit?: number; caId?: string; status?: string; certType?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.caId) searchParams.set('caId', params.caId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.certType) searchParams.set('certType', params.certType);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<Certificate>>(`/certificates${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api.get<Certificate>(`/certificates/${id}`),

  issue: (data: IssueCertificateInput) => api.post<IssueCertificateResponse>('/certificates/issue', data),

  revoke: (id: string, data: RevokeCertificateInput) => api.post<{ message: string }>(`/certificates/${id}/revoke`, data),

  renew: (id: string, data: RenewCertificateInput) => api.post<IssueCertificateResponse>(`/certificates/${id}/renew`, data),

  download: (id: string, params: { format: 'pem' | 'der' | 'pkcs12'; password?: string; includeChain?: boolean }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('format', params.format);
    if (params.password) searchParams.set('password', params.password);
    if (params.includeChain) searchParams.set('includeChain', 'true');
    const qs = searchParams.toString();
    return api.get<Blob>(`/certificates/${id}/download?${qs}`);
  },

  getChain: (id: string) => api.get<string[]>(`/certificates/${id}/chain`),
};
