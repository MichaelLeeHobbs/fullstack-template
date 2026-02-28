// ===========================================
// Default Permissions
// ===========================================
// Permissions are seeded and read-only. New permissions are added here.
// Uses resource:action naming convention.

import { type NewPermission } from '../schema/index.js';
import { PERMISSIONS, type PermissionName } from '@fullstack-template/shared';

export { PERMISSIONS, type PermissionName };

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

  // ===========================================
  // Certificate Authorities
  // ===========================================
  {
    name: 'ca:read',
    description: 'View certificate authorities',
    resource: 'ca',
    action: 'read',
  },
  {
    name: 'ca:create',
    description: 'Create certificate authorities',
    resource: 'ca',
    action: 'create',
  },
  {
    name: 'ca:update',
    description: 'Update, suspend, or retire certificate authorities',
    resource: 'ca',
    action: 'update',
  },

  // ===========================================
  // Certificates
  // ===========================================
  {
    name: 'certificates:read',
    description: 'View certificates',
    resource: 'certificates',
    action: 'read',
  },
  {
    name: 'certificates:issue',
    description: 'Issue new certificates',
    resource: 'certificates',
    action: 'issue',
  },
  {
    name: 'certificates:revoke',
    description: 'Revoke certificates',
    resource: 'certificates',
    action: 'revoke',
  },
  {
    name: 'certificates:renew',
    description: 'Renew certificates',
    resource: 'certificates',
    action: 'renew',
  },
  {
    name: 'certificates:download',
    description: 'Download certificates and keys',
    resource: 'certificates',
    action: 'download',
  },

  // ===========================================
  // Certificate Signing Requests
  // ===========================================
  {
    name: 'csr:read',
    description: 'View certificate signing requests',
    resource: 'csr',
    action: 'read',
  },
  {
    name: 'csr:submit',
    description: 'Submit certificate signing requests',
    resource: 'csr',
    action: 'submit',
  },
  {
    name: 'csr:approve',
    description: 'Approve or reject certificate signing requests',
    resource: 'csr',
    action: 'approve',
  },

  // ===========================================
  // Certificate Revocation Lists
  // ===========================================
  {
    name: 'crl:read',
    description: 'View certificate revocation lists',
    resource: 'crl',
    action: 'read',
  },
  {
    name: 'crl:generate',
    description: 'Generate certificate revocation lists',
    resource: 'crl',
    action: 'generate',
  },

  // ===========================================
  // Certificate Profiles
  // ===========================================
  {
    name: 'profiles:read',
    description: 'View certificate profiles',
    resource: 'profiles',
    action: 'read',
  },
  {
    name: 'profiles:create',
    description: 'Create certificate profiles',
    resource: 'profiles',
    action: 'create',
  },
  {
    name: 'profiles:update',
    description: 'Update certificate profiles',
    resource: 'profiles',
    action: 'update',
  },
  {
    name: 'profiles:delete',
    description: 'Delete certificate profiles',
    resource: 'profiles',
    action: 'delete',
  },

  // ===========================================
  // PKI Audit
  // ===========================================
  {
    name: 'pki_audit:read',
    description: 'View PKI audit logs',
    resource: 'pki_audit',
    action: 'read',
  },
];

