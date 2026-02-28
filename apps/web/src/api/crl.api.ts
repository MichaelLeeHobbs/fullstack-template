// ===========================================
// CRL API
// ===========================================

import { api } from './client.js';
import type { CRL, PaginatedResponse } from '@fullstack-template/shared';

export const crlApi = {
  generate: (caId: string, caPassphrase: string) =>
    api.post<CRL>(`/ca/${caId}/crl`, { caPassphrase }),

  getLatest: (caId: string) => api.get<CRL>(`/ca/${caId}/crl/latest`),

  getHistory: (caId: string, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<CRL>>(`/ca/${caId}/crl/history${qs ? `?${qs}` : ''}`);
  },
};
