// ===========================================
// Default Roles
// ===========================================
// Default roles seeded on first run.
// System roles (isSystem=true) cannot be deleted.

import { type NewRole } from '../schema/index.js';
import { PERMISSIONS } from './permissions.js';

export interface RoleDefinition {
  role: NewRole;
  permissions: string[];
}

export const defaultRoles: RoleDefinition[] = [
  // ===========================================
  // Super Admin - All permissions, protected
  // ===========================================
  {
    role: {
      name: 'Super Admin',
      description: 'Full system access. Cannot be deleted or modified.',
      isSystem: true,
    },
    permissions: Object.values(PERMISSIONS), // All permissions
  },

  // ===========================================
  // Admin - User and system management
  // ===========================================
  {
    role: {
      name: 'Admin',
      description: 'User management and system settings access.',
      isSystem: false,
    },
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_UPDATE,
      PERMISSIONS.AUDIT_READ,
    ],
  },

  // ===========================================
  // User - Basic authenticated access
  // ===========================================
  {
    role: {
      name: 'User',
      description: 'Standard authenticated user. No admin privileges.',
      isSystem: false,
    },
    permissions: [], // No special permissions, just authenticated access
  },
];

// Role names as constants
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'User',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
