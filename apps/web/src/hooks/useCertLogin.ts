// ===========================================
// Certificate Login Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certLoginApi } from '../api/cert-login.api.js';

export const certLoginKeys = {
  all: ['cert-login'] as const,
  status: () => [...certLoginKeys.all, 'status'] as const,
};

export function useCertStatus() {
  return useQuery({
    queryKey: certLoginKeys.status(),
    queryFn: certLoginApi.getCertStatus,
  });
}

export function useCertLogin() {
  return useMutation({
    mutationFn: certLoginApi.login,
  });
}

export function useGenerateAttachCode() {
  return useMutation({
    mutationFn: certLoginApi.generateAttachCode,
  });
}

export function useAttachCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; label?: string }) => certLoginApi.attachCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certLoginKeys.status() });
    },
  });
}

export function useRemoveCertBinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => certLoginApi.removeBinding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certLoginKeys.status() });
    },
  });
}
