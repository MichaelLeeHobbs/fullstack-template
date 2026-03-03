// ===========================================
// SSO Hooks
// ===========================================
// TanStack Query hooks for SSO provider management.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ssoApi } from '../api/sso.api.js';
import type { CreateSsoProviderInput, UpdateSsoProviderInput } from '@fullstack-template/shared';

// ===========================================
// Query Keys
// ===========================================

export const ssoKeys = {
  all: ['sso'] as const,
  publicProviders: () => [...ssoKeys.all, 'public-providers'] as const,
  adminProviders: () => [...ssoKeys.all, 'admin-providers'] as const,
  adminProvider: (id: string) => [...ssoKeys.all, 'admin-provider', id] as const,
};

// ===========================================
// Public Queries
// ===========================================

export function useSsoProviders() {
  return useQuery({
    queryKey: ssoKeys.publicProviders(),
    queryFn: ssoApi.listPublicProviders,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ===========================================
// Admin Queries
// ===========================================

export function useAdminSsoProviders() {
  return useQuery({
    queryKey: ssoKeys.adminProviders(),
    queryFn: ssoApi.listProviders,
  });
}

export function useAdminSsoProvider(id: string) {
  return useQuery({
    queryKey: ssoKeys.adminProvider(id),
    queryFn: () => ssoApi.getProvider(id),
    enabled: !!id,
  });
}

// ===========================================
// Admin Mutations
// ===========================================

export function useCreateSsoProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSsoProviderInput) => ssoApi.createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoKeys.adminProviders() });
      queryClient.invalidateQueries({ queryKey: ssoKeys.publicProviders() });
    },
  });
}

export function useUpdateSsoProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSsoProviderInput }) =>
      ssoApi.updateProvider(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ssoKeys.adminProviders() });
      queryClient.invalidateQueries({ queryKey: ssoKeys.adminProvider(id) });
      queryClient.invalidateQueries({ queryKey: ssoKeys.publicProviders() });
    },
  });
}

export function useDeleteSsoProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ssoApi.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoKeys.adminProviders() });
      queryClient.invalidateQueries({ queryKey: ssoKeys.publicProviders() });
    },
  });
}

export function useToggleSsoProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      ssoApi.toggleProvider(id, isEnabled),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ssoKeys.adminProviders() });
      queryClient.invalidateQueries({ queryKey: ssoKeys.adminProvider(id) });
      queryClient.invalidateQueries({ queryKey: ssoKeys.publicProviders() });
    },
  });
}
