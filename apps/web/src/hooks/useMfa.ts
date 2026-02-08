// ===========================================
// MFA Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mfaApi } from '../api/mfa.api.js';

export function useMfaMethods() {
  return useQuery({
    queryKey: ['mfa', 'methods'],
    queryFn: mfaApi.getMethods,
  });
}

export function useSetupTotp() {
  return useMutation({
    mutationFn: () => mfaApi.setupTotp(),
  });
}

export function useVerifyTotpSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => mfaApi.verifySetup(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa', 'methods'] });
    },
  });
}

export function useDisableMfa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ method, code }: { method: string; code: string }) =>
      mfaApi.disable(method, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa', 'methods'] });
    },
  });
}

export function useRegenerateBackupCodes() {
  return useMutation({
    mutationFn: ({ method, code }: { method: string; code: string }) =>
      mfaApi.regenerateBackupCodes(method, code),
  });
}
