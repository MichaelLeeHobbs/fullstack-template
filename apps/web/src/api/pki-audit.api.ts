// ===========================================
// PKI Audit API
// ===========================================

import { api } from './client.js';
import type { PkiAuditLog, PaginatedResponse } from '@fullstack-template/shared';

export const pkiAuditApi = {
  list: (params?: { page?: number; limit?: number; action?: string; actorId?: string; targetType?: string; targetId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.action) searchParams.set('action', params.action);
    if (params?.actorId) searchParams.set('actorId', params.actorId);
    if (params?.targetType) searchParams.set('targetType', params.targetType);
    if (params?.targetId) searchParams.set('targetId', params.targetId);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<PkiAuditLog>>(`/pki-audit${qs ? `?${qs}` : ''}`);
  },
};
