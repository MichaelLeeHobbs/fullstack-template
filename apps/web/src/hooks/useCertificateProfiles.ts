// ===========================================
// Certificate Profile Hooks
// ===========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificateProfilesApi } from '../api/certificate-profiles.api.js';
import type { CreateProfileInput, UpdateProfileInput } from '@fullstack-template/shared';

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters?: object) => [...profileKeys.lists(), filters] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
};

export function useProfileList(params?: { page?: number; limit?: number; certType?: string }) {
  return useQuery({
    queryKey: profileKeys.list(params),
    queryFn: () => certificateProfilesApi.list(params),
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: () => certificateProfilesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProfileInput) => certificateProfilesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileInput }) => certificateProfilesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => certificateProfilesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}
