// ===========================================
// PKI Audit Hooks
// ===========================================

import { useQuery } from '@tanstack/react-query';
import { pkiAuditApi } from '../api/pki-audit.api.js';

export const pkiAuditKeys = {
  all: ['pki-audit'] as const,
  lists: () => [...pkiAuditKeys.all, 'list'] as const,
  list: (filters?: object) => [...pkiAuditKeys.lists(), filters] as const,
};

export function usePkiAuditList(params?: { page?: number; limit?: number; action?: string; actorId?: string; targetType?: string; targetId?: string }) {
  return useQuery({
    queryKey: pkiAuditKeys.list(params),
    queryFn: () => pkiAuditApi.list(params),
  });
}
