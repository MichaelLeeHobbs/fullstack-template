// ===========================================
// CSR Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { csrApi } from '../api/csr.api.js';
import type { SubmitCsrInput, ApproveCsrInput, RejectCsrInput } from '@fullstack-template/shared';
import { certificateKeys } from './useCertificates.js';

export const csrKeys = {
  all: ['csrs'] as const,
  lists: () => [...csrKeys.all, 'list'] as const,
  list: (filters?: object) => [...csrKeys.lists(), filters] as const,
  details: () => [...csrKeys.all, 'detail'] as const,
  detail: (id: string) => [...csrKeys.details(), id] as const,
};

export function useCsrList(params?: { page?: number; limit?: number; status?: string; targetCaId?: string }) {
  return useQuery({
    queryKey: csrKeys.list(params),
    queryFn: () => csrApi.list(params),
  });
}

export function useCsr(id: string) {
  return useQuery({
    queryKey: csrKeys.detail(id),
    queryFn: () => csrApi.getById(id),
    enabled: !!id,
  });
}

export function useSubmitCsr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitCsrInput) => csrApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csrKeys.lists() });
    },
  });
}

export function useApproveCsr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveCsrInput }) => csrApi.approve(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: csrKeys.lists() });
      queryClient.invalidateQueries({ queryKey: csrKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: certificateKeys.lists() });
    },
  });
}

export function useRejectCsr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectCsrInput }) => csrApi.reject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: csrKeys.lists() });
      queryClient.invalidateQueries({ queryKey: csrKeys.detail(id) });
    },
  });
}
