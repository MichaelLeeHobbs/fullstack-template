// ===========================================
// Role Types
// ===========================================

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

export interface SetPermissionsInput {
  permissionIds: string[];
}

export interface SetUserRolesInput {
  roleIds: string[];
}

// Permission name constants (mirrors backend)
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  AUDIT_READ: 'audit:read',
  API_KEYS_READ: 'api_keys:read',
  API_KEYS_CREATE: 'api_keys:create',
  API_KEYS_UPDATE: 'api_keys:update',
  API_KEYS_DELETE: 'api_keys:delete',
  SERVICE_ACCOUNTS_READ: 'service_accounts:read',
  SERVICE_ACCOUNTS_CREATE: 'service_accounts:create',
  SERVICE_ACCOUNTS_UPDATE: 'service_accounts:update',
  SERVICE_ACCOUNTS_DELETE: 'service_accounts:delete',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
