// ===========================================
// CA Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caApi } from '../api/ca.api.js';
import type { CreateCaInput, UpdateCaInput } from '@fullstack-template/shared';

export const caKeys = {
  all: ['ca'] as const,
  lists: () => [...caKeys.all, 'list'] as const,
  list: (filters?: object) => [...caKeys.lists(), filters] as const,
  details: () => [...caKeys.all, 'detail'] as const,
  detail: (id: string) => [...caKeys.details(), id] as const,
  hierarchy: () => [...caKeys.all, 'hierarchy'] as const,
  chain: (id: string) => [...caKeys.all, 'chain', id] as const,
};

export function useCaList(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: caKeys.list(params),
    queryFn: () => caApi.list(params),
  });
}

export function useCa(id: string) {
  return useQuery({
    queryKey: caKeys.detail(id),
    queryFn: () => caApi.getById(id),
    enabled: !!id,
  });
}

export function useCaHierarchy() {
  return useQuery({
    queryKey: caKeys.hierarchy(),
    queryFn: caApi.getHierarchy,
  });
}

export function useCaChain(id: string) {
  return useQuery({
    queryKey: caKeys.chain(id),
    queryFn: () => caApi.getChain(id),
    enabled: !!id,
  });
}

export function useCreateCa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCaInput) => caApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caKeys.hierarchy() });
    },
  });
}

export function useUpdateCa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCaInput }) => caApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: caKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caKeys.detail(id) });
    },
  });
}

export function useSuspendCa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => caApi.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caKeys.hierarchy() });
    },
  });
}

export function useRetireCa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => caApi.retire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caKeys.lists() });
      queryClient.invalidateQueries({ queryKey: caKeys.hierarchy() });
    },
  });
}
