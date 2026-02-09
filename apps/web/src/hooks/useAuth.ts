// ===========================================
// Auth Hook
// ===========================================
// TanStack Query mutations for auth operations.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginInput, type RegisterInput, type AuthSuccessResponse } from '../api/auth.api.js';
import { useAuthStore } from '../stores/auth.store.js';

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setMfaRequired = useAuthStore((state) => state.setMfaRequired);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      if ('mfaRequired' in data && data.mfaRequired) {
        setMfaRequired(data.tempToken, data.mfaMethods);
        // Don't navigate — LoginPage will show MFA input
        return;
      }
      const successData = data as AuthSuccessResponse;
      setAuth(successData.user, successData.accessToken);
      queryClient.clear();
      // Navigation is handled by the caller (LoginPage)
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    // Don't auto-authenticate — user must verify email first.
    // The caller (RegisterPage) handles the success flow.
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });
}
