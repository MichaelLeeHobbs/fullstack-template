// ===========================================
// Certificate Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../api/certificates.api.js';
import type { IssueCertificateInput, RevokeCertificateInput, RenewCertificateInput } from '../types/pki.js';

export const certificateKeys = {
  all: ['certificates'] as const,
  lists: () => [...certificateKeys.all, 'list'] as const,
  list: (filters?: object) => [...certificateKeys.lists(), filters] as const,
  details: () => [...certificateKeys.all, 'detail'] as const,
  detail: (id: string) => [...certificateKeys.details(), id] as const,
  chain: (id: string) => [...certificateKeys.all, 'chain', id] as const,
};

export function useCertificateList(params?: { page?: number; limit?: number; caId?: string; status?: string; certType?: string; search?: string }) {
  return useQuery({
    queryKey: certificateKeys.list(params),
    queryFn: () => certificatesApi.list(params),
  });
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: certificateKeys.detail(id),
    queryFn: () => certificatesApi.getById(id),
    enabled: !!id,
  });
}

export function useCertificateChain(id: string) {
  return useQuery({
    queryKey: certificateKeys.chain(id),
    queryFn: () => certificatesApi.getChain(id),
    enabled: !!id,
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IssueCertificateInput) => certificatesApi.issue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
    },
  });
}

export function useRevokeCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RevokeCertificateInput }) => certificatesApi.revoke(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: certificateKeys.detail(id) });
    },
  });
}

export function useRenewCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RenewCertificateInput }) => certificatesApi.renew(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: certificateKeys.detail(id) });
    },
  });
}
