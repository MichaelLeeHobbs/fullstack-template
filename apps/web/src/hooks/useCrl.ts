// ===========================================
// CRL Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crlApi } from '../api/crl.api.js';

export const crlKeys = {
  all: ['crls'] as const,
  latest: (caId: string) => [...crlKeys.all, 'latest', caId] as const,
  history: (caId: string, filters?: object) => [...crlKeys.all, 'history', caId, filters] as const,
};

export function useCrlLatest(caId: string) {
  return useQuery({
    queryKey: crlKeys.latest(caId),
    queryFn: () => crlApi.getLatest(caId),
    enabled: !!caId,
  });
}

export function useCrlHistory(caId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: crlKeys.history(caId, params),
    queryFn: () => crlApi.getHistory(caId, params),
    enabled: !!caId,
  });
}

export function useGenerateCrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caId, caPassphrase }: { caId: string; caPassphrase: string }) =>
      crlApi.generate(caId, caPassphrase),
    onSuccess: (_, { caId }) => {
      queryClient.invalidateQueries({ queryKey: crlKeys.latest(caId) });
      queryClient.invalidateQueries({ queryKey: crlKeys.history(caId) });
    },
  });
}
