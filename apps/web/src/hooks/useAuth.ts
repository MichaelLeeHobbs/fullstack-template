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
  const navigate = useNavigate();
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
      setAuth(successData.user, successData.accessToken, successData.refreshToken);
      queryClient.clear();
      navigate('/');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: (data) => {
      // Register never returns MFA required
      const successData = data as AuthSuccessResponse;
      setAuth(successData.user, successData.accessToken, successData.refreshToken);
      queryClient.clear();
      navigate('/');
    },
  });
}

export function useLogout() {
  const { refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });
}
