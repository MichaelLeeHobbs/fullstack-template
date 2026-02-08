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
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
