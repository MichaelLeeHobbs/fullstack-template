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
      PERMISSIONS.API_KEYS_READ,
      PERMISSIONS.API_KEYS_CREATE,
      PERMISSIONS.API_KEYS_UPDATE,
      PERMISSIONS.API_KEYS_DELETE,
      PERMISSIONS.SERVICE_ACCOUNTS_READ,
      PERMISSIONS.SERVICE_ACCOUNTS_CREATE,
      PERMISSIONS.SERVICE_ACCOUNTS_UPDATE,
      PERMISSIONS.SERVICE_ACCOUNTS_DELETE,
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

  // ===========================================
  // PKI Admin - Full PKI management
  // ===========================================
  {
    role: {
      name: 'PKI Admin',
      description: 'Full PKI management including CA creation and profile management.',
      isSystem: false,
    },
    permissions: [
      PERMISSIONS.CA_READ,
      PERMISSIONS.CA_CREATE,
      PERMISSIONS.CA_UPDATE,
      PERMISSIONS.CERTIFICATES_READ,
      PERMISSIONS.CERTIFICATES_ISSUE,
      PERMISSIONS.CERTIFICATES_REVOKE,
      PERMISSIONS.CERTIFICATES_RENEW,
      PERMISSIONS.CERTIFICATES_DOWNLOAD,
      PERMISSIONS.CSR_READ,
      PERMISSIONS.CSR_SUBMIT,
      PERMISSIONS.CSR_APPROVE,
      PERMISSIONS.CRL_READ,
      PERMISSIONS.CRL_GENERATE,
      PERMISSIONS.PROFILES_READ,
      PERMISSIONS.PROFILES_CREATE,
      PERMISSIONS.PROFILES_UPDATE,
      PERMISSIONS.PROFILES_DELETE,
      PERMISSIONS.PKI_AUDIT_READ,
    ],
  },

  // ===========================================
  // PKI Operator - Day-to-day cert operations
  // ===========================================
  {
    role: {
      name: 'PKI Operator',
      description: 'Issue, revoke, and renew certificates. Approve CSRs.',
      isSystem: false,
    },
    permissions: [
      PERMISSIONS.CA_READ,
      PERMISSIONS.CERTIFICATES_READ,
      PERMISSIONS.CERTIFICATES_ISSUE,
      PERMISSIONS.CERTIFICATES_REVOKE,
      PERMISSIONS.CERTIFICATES_RENEW,
      PERMISSIONS.CERTIFICATES_DOWNLOAD,
      PERMISSIONS.CSR_READ,
      PERMISSIONS.CSR_APPROVE,
      PERMISSIONS.CRL_READ,
      PERMISSIONS.PROFILES_READ,
      PERMISSIONS.PKI_AUDIT_READ,
    ],
  },
];

// Role names as constants
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'User',
  PKI_ADMIN: 'PKI Admin',
  PKI_OPERATOR: 'PKI Operator',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
