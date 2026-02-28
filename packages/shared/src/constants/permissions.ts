// ===========================================
// Permission Constants (Single Source of Truth)
// ===========================================

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

  // PKI
  CA_READ: 'ca:read',
  CA_CREATE: 'ca:create',
  CA_UPDATE: 'ca:update',
  CERTIFICATES_READ: 'certificates:read',
  CERTIFICATES_ISSUE: 'certificates:issue',
  CERTIFICATES_REVOKE: 'certificates:revoke',
  CERTIFICATES_RENEW: 'certificates:renew',
  CERTIFICATES_DOWNLOAD: 'certificates:download',
  CSR_READ: 'csr:read',
  CSR_SUBMIT: 'csr:submit',
  CSR_APPROVE: 'csr:approve',
  CRL_READ: 'crl:read',
  CRL_GENERATE: 'crl:generate',
  PROFILES_READ: 'profiles:read',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_UPDATE: 'profiles:update',
  PROFILES_DELETE: 'profiles:delete',
  PKI_AUDIT_READ: 'pki_audit:read',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
