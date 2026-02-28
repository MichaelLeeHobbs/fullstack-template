# API Key Management User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-APIKEY-001: Create API Key

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/api-keys |
| **Components** | ApiKeysPage, ApiKeysCard (ProfilePage), ApiKeyController.create(), ApiKeyService, useApiKeys hook |

**As an** administrator, **I want to** create an API key with a name, optional permissions, and optional expiry, **so that** external systems can authenticate programmatically.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can create an API key with a name (required, max 100 chars) | TC-APIKEY-001 |
| 2 | Optional permissionIds array scopes the key to specific permissions | TC-APIKEY-002 |
| 3 | Optional expiresAt sets an expiration date-time for the key | TC-APIKEY-003 |
| 4 | Optional userId assigns the key to a specific user (admin-only) | TC-APIKEY-004 |
| 5 | Plaintext API key is returned only once at creation (never retrievable again) | TC-APIKEY-005 |
| 6 | Successful creation returns 201 with `{ apiKey: {...}, key: "plaintext-key" }` | TC-APIKEY-006 |
| 7 | API key hash is stored in the database (plaintext is not persisted) | TC-APIKEY-007 |
| 8 | Requires `api-keys:create` permission; insufficient permission returns 403 Forbidden | TC-APIKEY-008 |
| 9 | Users can list their own keys via GET /api/v1/api-keys/my (no special permissions needed) | TC-APIKEY-009 |

---

## US-APIKEY-002: Revoke API Key

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/api-keys/:id/revoke, DELETE /api/v1/api-keys/:id |
| **Components** | ApiKeysPage, ApiKeyController.revoke(), ApiKeyController.remove(), ApiKeyService |

**As an** administrator, **I want to** revoke or delete an active API key, **so that** I can immediately cut off access for compromised or no-longer-needed keys.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can revoke an API key by ID via POST /api/v1/api-keys/:id/revoke | TC-APIKEY-010 |
| 2 | Revoked key is marked inactive and can no longer authenticate requests | TC-APIKEY-011 |
| 3 | Admin can permanently delete an API key via DELETE /api/v1/api-keys/:id | TC-APIKEY-012 |
| 4 | Revoking an already-revoked key returns an appropriate error | TC-APIKEY-013 |
| 5 | Requires `api-keys:delete` permission; insufficient permission returns 403 Forbidden | TC-APIKEY-014 |
| 6 | API key ID must be a valid UUID (validated by schema) | TC-APIKEY-015 |

---

## US-APIKEY-003: Scoped Permissions

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | PUT /api/v1/api-keys/:id/permissions, GET /api/v1/api-keys/:id |
| **Components** | ApiKeysPage, ApiKeyController.setPermissions(), ApiKeyController.get(), ApiKeyService |

**As an** administrator, **I want to** assign specific permissions to an API key, **so that** the key is limited to only the operations it needs (principle of least privilege).

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can set permissions on an API key by providing an array of permissionIds (replaces all existing permissions) | TC-APIKEY-016 |
| 2 | Admin can view an API key's current permissions via GET /api/v1/api-keys/:id | TC-APIKEY-017 |
| 3 | Admin can list all API keys with pagination via GET /api/v1/api-keys | TC-APIKEY-018 |
| 4 | API keys can be filtered by userId and isActive query parameters | TC-APIKEY-019 |
| 5 | Setting empty permissionIds array removes all scoped permissions from the key | TC-APIKEY-020 |
| 6 | Requires `api-keys:update` permission for setting permissions, `api-keys:read` for viewing | TC-APIKEY-021 |

---

## US-APIKEY-004: API Key Authentication

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | All protected endpoints (via X-API-Key header) |
| **Components** | auth.middleware.ts (API key detection), ApiKeyService.validateKey(), PermissionService |

**As an** external system, **I want to** authenticate API requests using an API key in the `X-API-Key` header, **so that** I can access protected resources without user credentials.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Requests with a valid `X-API-Key` header are authenticated | TC-APIKEY-022 |
| 2 | The key's scoped permissions are enforced by the `requirePermission` middleware | TC-APIKEY-023 |
| 3 | Expired API keys are rejected with 401 Unauthorized | TC-APIKEY-024 |
| 4 | Revoked API keys are rejected with 401 Unauthorized | TC-APIKEY-025 |
| 5 | Invalid API keys return 401 Unauthorized | TC-APIKEY-026 |
| 6 | API key `lastUsedAt` timestamp is updated on each successful authentication | TC-APIKEY-027 |
| 7 | Requests without both JWT and API key return 401 Unauthorized | TC-APIKEY-028 |

---
