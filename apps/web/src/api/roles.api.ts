// ===========================================
// Roles API
// ===========================================
// API calls for role and permission management.

import { api } from './client.js';
import type {
  Role,
  Permission,
  CreateRoleInput,
  UpdateRoleInput,
  SetPermissionsInput,
  SetUserRolesInput,
} from '@fullstack-template/shared';

export const rolesApi = {
  // ===========================================
  // Permissions
  // ===========================================

  listPermissions: () => api.get<Permission[]>('/roles/permissions'),

  listPermissionsGrouped: () =>
    api.get<Record<string, Permission[]>>('/roles/permissions/grouped'),

  // ===========================================
  // Roles
  // ===========================================

  listRoles: () => api.get<Role[]>('/roles'),

  getRole: (id: string) => api.get<Role>(`/roles/${id}`),

  createRole: (data: CreateRoleInput) => api.post<Role>('/roles', data),

  updateRole: (id: string, data: UpdateRoleInput) => api.put<Role>(`/roles/${id}`, data),

  deleteRole: (id: string) => api.delete<{ deleted: boolean }>(`/roles/${id}`),

  setRolePermissions: (roleId: string, data: SetPermissionsInput) =>
    api.put<Role>(`/roles/${roleId}/permissions`, data),

  // ===========================================
  // User Roles
  // ===========================================

  getUserRoles: (userId: string) => api.get<Role[]>(`/roles/users/${userId}`),

  setUserRoles: (userId: string, data: SetUserRolesInput) =>
    api.put<Role[]>(`/roles/users/${userId}`, data),
};
