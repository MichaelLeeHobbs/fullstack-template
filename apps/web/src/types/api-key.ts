// ===========================================
// API Key Types
// ===========================================

export interface ApiKeyPermission {
  id: string;
  name: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  expiresAt: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: ApiKeyPermission[];
  hasOrphanedPermissions?: boolean;
}

export interface ApiKeyListItem {
  id: string;
  userId: string;
  ownerEmail: string;
  name: string;
  prefix: string;
  expiresAt: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  permissionCount: number;
}

export interface PaginatedApiKeys {
  data: ApiKeyListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateApiKeyInput {
  name: string;
  permissionIds: string[];
  expiresAt?: string;
  userId?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  rawKey: string;
}

export interface UpdateApiKeyPermissionsInput {
  permissionIds: string[];
}

export interface ServiceAccount {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  apiKeyCount: number;
}

export interface CreateServiceAccountInput {
  email: string;
}
