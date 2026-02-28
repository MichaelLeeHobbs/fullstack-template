# Test Cases: API Keys

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-APIKEY-001 through US-APIKEY-012

## Key Creation

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-APIKEY-001 | Create API key | User authenticated | 1. POST `/api/api-keys` with name and optional expiresAt | 201 Created; response contains API key object with id, name, prefix, and the plaintext key value | US-APIKEY-001 | P0 | Yes |
| TC-APIKEY-002 | Plaintext key only returned at creation | API key was previously created | 1. POST `/api/api-keys` to create a key; note the plaintext key 2. GET `/api/api-keys/:id` to retrieve the same key | Creation response includes plaintext key; subsequent GET does not include plaintext key (only prefix/masked value) | US-APIKEY-002 | P0 | Yes |

## Key Listing

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-APIKEY-003 | List own API keys | User authenticated; user has created API keys | 1. GET `/api/api-keys` with user authentication | 200 OK; response contains array of the current user's API keys with id, name, prefix, createdAt, expiresAt, isRevoked | US-APIKEY-003 | P0 | Yes |
| TC-APIKEY-004 | List all API keys as admin (paginated) | Admin authenticated; multiple users have API keys | 1. GET `/api/admin/api-keys?page=1&limit=10` with admin authentication | 200 OK; response contains paginated list of all API keys across all users with meta pagination object | US-APIKEY-004 | P1 | Yes |
| TC-APIKEY-005 | Get API key by ID | User authenticated; API key exists belonging to user | 1. GET `/api/api-keys/:id` with valid key ID | 200 OK; response contains API key object with id, name, prefix, permissions, createdAt, expiresAt, lastUsedAt | US-APIKEY-005 | P0 | Yes |

## Key Permissions

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-APIKEY-006 | Set API key permissions | User authenticated; API key exists | 1. PUT `/api/api-keys/:id/permissions` with array of permission scopes | 200 OK; API key now has exactly the specified permission scopes; previous scopes replaced | US-APIKEY-006 | P0 | Yes |

## Key Lifecycle

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-APIKEY-007 | Revoke API key | User authenticated; active API key exists | 1. POST `/api/api-keys/:id/revoke` with valid key ID | 200 OK; API key isRevoked set to true; key can no longer be used for authentication | US-APIKEY-007 | P0 | Yes |
| TC-APIKEY-008 | Delete API key | User authenticated; API key exists | 1. DELETE `/api/api-keys/:id` with valid key ID | 200 OK; API key is permanently removed from system | US-APIKEY-008 | P1 | Yes |

## API Key Authentication

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-APIKEY-009 | Authenticate with valid API key | Active, non-expired API key exists | 1. Make API request with `X-API-Key` header set to valid plaintext key | Request succeeds; API key's lastUsedAt is updated; request is processed with key owner's identity | US-APIKEY-009 | P0 | Yes |
| TC-APIKEY-010 | Authenticate with revoked API key | API key has been revoked | 1. Make API request with `X-API-Key` header set to revoked key | 401 Unauthorized; error indicates API key is invalid or revoked | US-APIKEY-010 | P0 | Yes |
| TC-APIKEY-011 | API key respects scoped permissions | API key exists with limited permission scopes | 1. Make API request to an endpoint the key does not have permission for 2. Make API request to an endpoint the key does have permission for | Unpermitted request returns 403 Forbidden; permitted request succeeds | US-APIKEY-011 | P0 | Yes |
| TC-APIKEY-012 | Authenticate with expired API key | API key exists with expiresAt in the past | 1. Make API request with `X-API-Key` header set to expired key | 401 Unauthorized; error indicates API key is expired | US-APIKEY-012 | P0 | Yes |
