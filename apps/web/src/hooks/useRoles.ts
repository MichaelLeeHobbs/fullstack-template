// ===========================================
// Roles Hooks
// ===========================================
// TanStack Query hooks for role management.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/roles.api.js';
import type {
  CreateRoleInput,
  UpdateRoleInput,
  SetPermissionsInput,
  SetUserRolesInput,
} from '../types/role.js';

// ===========================================
// Query Keys
// ===========================================

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: () => [...roleKeys.lists()] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
  permissions: () => [...roleKeys.all, 'permissions'] as const,
  permissionsGrouped: () => [...roleKeys.all, 'permissions', 'grouped'] as const,
  userRoles: (userId: string) => [...roleKeys.all, 'user', userId] as const,
};

// ===========================================
// Permissions Queries
// ===========================================

export function usePermissionsList() {
  return useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: rolesApi.listPermissions,
  });
}

export function usePermissionsGrouped() {
  return useQuery({
    queryKey: roleKeys.permissionsGrouped(),
    queryFn: rolesApi.listPermissionsGrouped,
  });
}

// ===========================================
// Roles Queries
// ===========================================

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: rolesApi.listRoles,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesApi.getRole(id),
    enabled: !!id,
  });
}

// ===========================================
// Roles Mutations
// ===========================================

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleInput) => rolesApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleInput }) =>
      rolesApi.updateRole(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rolesApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: SetPermissionsInput }) =>
      rolesApi.setRolePermissions(roleId, data),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
    },
  });
}

// ===========================================
// User Roles
// ===========================================

export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: roleKeys.userRoles(userId),
    queryFn: () => rolesApi.getUserRoles(userId),
    enabled: !!userId,
  });
}

export function useSetUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: SetUserRolesInput }) =>
      rolesApi.setUserRoles(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.userRoles(userId) });
    },
  });
}
