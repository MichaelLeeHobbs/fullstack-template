// ===========================================
// Default Permissions
// ===========================================
// Permissions are seeded and read-only. New permissions are added here.
// Uses resource:action naming convention.

import { type NewPermission } from '../schema/index.js';

export const defaultPermissions: NewPermission[] = [
  // ===========================================
  // Users
  // ===========================================
  {
    name: 'users:read',
    description: 'View user list and details',
    resource: 'users',
    action: 'read',
  },
  {
    name: 'users:create',
    description: 'Create new users',
    resource: 'users',
    action: 'create',
  },
  {
    name: 'users:update',
    description: 'Edit user details',
    resource: 'users',
    action: 'update',
  },
  {
    name: 'users:delete',
    description: 'Delete users',
    resource: 'users',
    action: 'delete',
  },

  // ===========================================
  // Roles
  // ===========================================
  {
    name: 'roles:read',
    description: 'View roles and permissions',
    resource: 'roles',
    action: 'read',
  },
  {
    name: 'roles:create',
    description: 'Create new roles',
    resource: 'roles',
    action: 'create',
  },
  {
    name: 'roles:update',
    description: 'Edit roles and assign permissions',
    resource: 'roles',
    action: 'update',
  },
  {
    name: 'roles:delete',
    description: 'Delete non-system roles',
    resource: 'roles',
    action: 'delete',
  },

  // ===========================================
  // Settings
  // ===========================================
  {
    name: 'settings:read',
    description: 'View system settings',
    resource: 'settings',
    action: 'read',
  },
  {
    name: 'settings:update',
    description: 'Modify system settings',
    resource: 'settings',
    action: 'update',
  },

  // ===========================================
  // Audit
  // ===========================================
  {
    name: 'audit:read',
    description: 'View audit logs',
    resource: 'audit',
    action: 'read',
  },

  // ===========================================
  // API Keys
  // ===========================================
  {
    name: 'api_keys:read',
    description: 'View API keys',
    resource: 'api_keys',
    action: 'read',
  },
  {
    name: 'api_keys:create',
    description: 'Create API keys',
    resource: 'api_keys',
    action: 'create',
  },
  {
    name: 'api_keys:update',
    description: 'Update API key permissions',
    resource: 'api_keys',
    action: 'update',
  },
  {
    name: 'api_keys:delete',
    description: 'Revoke and delete API keys',
    resource: 'api_keys',
    action: 'delete',
  },

  // ===========================================
  // Service Accounts
  // ===========================================
  {
    name: 'service_accounts:read',
    description: 'View service accounts',
    resource: 'service_accounts',
    action: 'read',
  },
  {
    name: 'service_accounts:create',
    description: 'Create service accounts',
    resource: 'service_accounts',
    action: 'create',
  },
  {
    name: 'service_accounts:update',
    description: 'Update service accounts',
    resource: 'service_accounts',
    action: 'update',
  },
  {
    name: 'service_accounts:delete',
    description: 'Delete service accounts',
    resource: 'service_accounts',
    action: 'delete',
  },
];

// Permission names as constants for type-safe usage
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
