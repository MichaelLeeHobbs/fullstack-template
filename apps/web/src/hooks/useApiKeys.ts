// ===========================================
// API Keys Hooks
// ===========================================
// TanStack Query hooks for API key management.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '../api/api-keys.api.js';
import type {
  CreateApiKeyInput,
  UpdateApiKeyPermissionsInput,
  CreateServiceAccountInput,
} from '../types/api-key.js';

// ===========================================
// Query Keys
// ===========================================

export const apiKeyKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...apiKeyKeys.lists(), params] as const,
  my: () => [...apiKeyKeys.all, 'my'] as const,
  details: () => [...apiKeyKeys.all, 'detail'] as const,
  detail: (id: string) => [...apiKeyKeys.details(), id] as const,
  serviceAccounts: () => [...apiKeyKeys.all, 'service-accounts'] as const,
};

// ===========================================
// Self-Service
// ===========================================

export function useMyApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.my(),
    queryFn: apiKeysApi.listMy,
  });
}

// ===========================================
// Admin Queries
// ===========================================

export function useApiKeys(params?: { page?: number; limit?: number; userId?: string; isActive?: string }) {
  return useQuery({
    queryKey: apiKeyKeys.list(params),
    queryFn: () => apiKeysApi.list(params),
  });
}

export function useApiKey(id: string) {
  return useQuery({
    queryKey: apiKeyKeys.detail(id),
    queryFn: () => apiKeysApi.get(id),
    enabled: !!id,
  });
}

// ===========================================
// API Key Mutations
// ===========================================

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyInput) => apiKeysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.my() });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.my() });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.my() });
    },
  });
}

export function useSetApiKeyPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyPermissionsInput }) =>
      apiKeysApi.setPermissions(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.my() });
    },
  });
}

// ===========================================
// Service Accounts
// ===========================================

export function useServiceAccounts() {
  return useQuery({
    queryKey: apiKeyKeys.serviceAccounts(),
    queryFn: apiKeysApi.listServiceAccounts,
  });
}

export function useCreateServiceAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceAccountInput) => apiKeysApi.createServiceAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.serviceAccounts() });
    },
  });
}

export function useDeleteServiceAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeysApi.deleteServiceAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.serviceAccounts() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
  });
}
