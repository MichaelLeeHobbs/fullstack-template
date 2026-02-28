# System Endpoints

> **[Template]** This covers the base template feature. Extend or modify for your project.

Base URL: `/api/v1`

This document covers Notifications, API Keys, and Multi-Factor Authentication (MFA) endpoints.

---

## Notifications (`/notifications`)

All notification endpoints require authentication. Users manage their own notifications -- no special permissions are needed.

### GET /notifications

List notifications for the current user with pagination and filtering.

**Authentication**: Required

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number (min: 1) |
| limit | query | integer | No | 20 | Items per page (min: 1, max: 100) |
| unreadOnly | query | boolean | No | false | Only return unread notifications |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "n1a2b3c4-...",
      "userId": "a1b2c3d4-...",
      "type": "security",
      "title": "New login detected",
      "message": "A new login was detected from 192.168.1.1",
      "isRead": false,
      "metadata": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "createdAt": "2025-06-01T14:22:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid query parameters |
| 401 | Unauthorized | Missing or invalid token |

---

### GET /notifications/unread-count

Get the number of unread notifications for the current user.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "count": 3
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### PATCH /notifications/read-all

Mark all notifications as read for the current user.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### PATCH /notifications/:id/read

Mark a single notification as read.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Notification ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "n1a2b3c4-...",
    "isRead": true
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not found | Notification does not exist or belongs to another user |

---

### DELETE /notifications/:id

Delete a notification.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Notification ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Notification deleted"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not found | Notification does not exist or belongs to another user |

---

## API Keys (`/api-keys`)

All API key endpoints require authentication. Self-service endpoints (listing your own keys) do not require special permissions. Admin CRUD operations require the appropriate `api_keys.*` permission.

### GET /api-keys/my

List all API keys belonging to the current user. No special permissions required.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "key-uuid-...",
      "name": "CI/CD Pipeline",
      "keyPrefix": "fst_abc...",
      "isActive": true,
      "expiresAt": "2026-01-15T00:00:00.000Z",
      "lastUsedAt": "2025-06-01T14:22:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### GET /api-keys/service-accounts

List all service accounts (headless user accounts for API key usage).

**Authentication**: Required
**Permission**: `service_accounts.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| (query params) | query | -- | No | Standard query filtering |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "sa-uuid-...",
      "email": "ci-pipeline@service.local",
      "isActive": true,
      "isServiceAccount": true,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `service_accounts.read` permission |

---

### POST /api-keys/service-accounts

Create a new service account. A service account is a headless user designed for API key authentication.

**Authentication**: Required
**Permission**: `service_accounts.create`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| email | body | string | Yes | Unique email identifier for the service account |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "sa-uuid-...",
    "email": "ci-pipeline@service.local",
    "isActive": true,
    "isServiceAccount": true,
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid email format |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `service_accounts.create` permission |
| 409 | Email already in use | A user or service account with this email already exists |

---

### DELETE /api-keys/service-accounts/:id

Delete a service account and all of its associated API keys.

**Authentication**: Required
**Permission**: `service_accounts.delete`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Service account ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Service account deleted"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `service_accounts.delete` permission |
| 404 | Not found | Service account does not exist |

---

### POST /api-keys

Create a new API key. The plaintext key is only returned once in the response -- it cannot be retrieved later.

**Authentication**: Required
**Permission**: `api_keys.create`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| name | body | string | Yes | Key name/description (max 100 chars) |
| permissionIds | body | string[] (UUIDs) | No | Permissions to grant to this key |
| expiresAt | body | string (datetime) | No | Expiration date (ISO 8601) |
| userId | body | string (UUID) | No | Assign to a specific user/service account (admin only) |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "key-uuid-...",
      "name": "CI/CD Pipeline",
      "keyPrefix": "fst_abc...",
      "userId": "a1b2c3d4-...",
      "isActive": true,
      "expiresAt": "2026-01-15T00:00:00.000Z",
      "permissions": [
        {
          "id": "p1a2b3c4-...",
          "name": "certificates.read"
        }
      ],
      "createdAt": "2025-06-01T14:22:00.000Z"
    },
    "key": "fst_abc123def456ghi789..."
  }
}
```

IMPORTANT: The `key` field contains the plaintext API key. Store it securely -- it will never be returned again.

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Missing name or invalid parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `api_keys.create` permission |

---

### GET /api-keys

List all API keys with pagination and filtering.

**Authentication**: Required
**Permission**: `api_keys.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number |
| limit | query | integer | No | 20 | Items per page (max 100) |
| userId | query | string (UUID) | No | -- | Filter by owner user ID |
| isActive | query | string | No | -- | Filter: `"true"` or `"false"` |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "key-uuid-...",
      "name": "CI/CD Pipeline",
      "keyPrefix": "fst_abc...",
      "userId": "a1b2c3d4-...",
      "isActive": true,
      "expiresAt": "2026-01-15T00:00:00.000Z",
      "lastUsedAt": "2025-06-01T14:22:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `api_keys.read` permission |

---

### GET /api-keys/:id

Get detailed information about a specific API key.

**Authentication**: Required
**Permission**: `api_keys.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | API key ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "key-uuid-...",
    "name": "CI/CD Pipeline",
    "keyPrefix": "fst_abc...",
    "userId": "a1b2c3d4-...",
    "isActive": true,
    "expiresAt": "2026-01-15T00:00:00.000Z",
    "permissions": [
      {
        "id": "p1a2b3c4-...",
        "name": "certificates.read"
      }
    ],
    "lastUsedAt": "2025-06-01T14:22:00.000Z",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `api_keys.read` permission |
| 404 | Not found | API key does not exist |

---

### PUT /api-keys/:id/permissions

Replace all permissions for an API key. This is a full replacement -- permissions not included will be removed.

**Authentication**: Required
**Permission**: `api_keys.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | API key ID |
| permissionIds | body | string[] (UUIDs) | Yes | Complete list of permission IDs |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "API key permissions updated"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid permission IDs |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `api_keys.update` permission |
| 404 | Not found | API key does not exist |

---

### POST /api-keys/:id/revoke

Revoke an API key, making it permanently inactive. Unlike deletion, the key record is preserved for audit purposes.

**Authentication**: Required
**Permission**: `api_keys.delete`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | API key ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "API key revoked"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `api_keys.delete` permission |
| 404 | Not found | API key does not exist |

---

### DELETE /api-keys/:id

Permanently delete an API key record.

**Authentication**: Required
**Permission**: `api_keys.delete`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | API key ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "API key deleted"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `api_keys.delete` permission |
| 404 | Not found | API key does not exist |

---

## Multi-Factor Authentication (`/mfa`)

MFA endpoints manage TOTP (Time-based One-Time Password) setup and verification. The `/mfa/verify` endpoint is public (uses a temporary token); all other endpoints require authentication.

### POST /mfa/verify

Verify an MFA code during the login flow. This endpoint is called after a login attempt returns `mfaRequired: true`.

**Authentication**: None (uses temporary MFA token)
**Rate Limit**: 5 requests per 15 minutes per IP

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| tempToken | body | string | Yes | Temporary token from the login response |
| method | body | string | Yes | MFA method: `totp` or `backup` |
| code | body | string | Yes | TOTP code (6 digits) or backup code |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "user@example.com",
      "isAdmin": false,
      "isActive": true,
      "emailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid MFA code | The provided code is incorrect |
| 401 | Expired temp token | The temporary token has expired (5-minute lifetime) |
| 429 | Too many attempts | MFA verification rate limit exceeded |

---

### GET /mfa/methods

Get the MFA methods available for the current user and their enabled status.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "method": "totp",
      "enabled": true
    },
    {
      "method": "backup",
      "enabled": true
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### POST /mfa/totp/setup

Begin TOTP setup. Returns a secret key and a QR code image for scanning with an authenticator app. The setup is not finalized until the user verifies a code via `/mfa/totp/verify-setup`.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

The `secret` is the TOTP secret in Base32 encoding. The `qrCode` is a data URI containing a PNG image of the QR code that can be scanned by authenticator apps (Google Authenticator, Authy, 1Password, etc.).

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### POST /mfa/totp/verify-setup

Complete TOTP setup by verifying a code from the authenticator app. On success, TOTP is enabled and backup codes are generated.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| code | body | string | Yes | 6-digit TOTP code from the authenticator app |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "a1b2c3d4",
      "e5f6g7h8",
      "i9j0k1l2",
      "m3n4o5p6",
      "q7r8s9t0",
      "u1v2w3x4",
      "y5z6a7b8",
      "c9d0e1f2"
    ]
  }
}
```

IMPORTANT: Backup codes are only shown once. Store them securely. Each backup code can only be used once.

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid code | The TOTP code does not match the secret |
| 401 | Unauthorized | Missing or invalid token |

---

### POST /mfa/disable

Disable an MFA method. Requires a valid verification code to confirm the user's identity.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| method | body | string | Yes | MFA method to disable (e.g., `totp`) |
| code | body | string | Yes | Current TOTP code or backup code for verification |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "MFA method disabled"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid code | Verification code is incorrect |
| 400 | Method not enabled | The specified MFA method is not currently active |
| 401 | Unauthorized | Missing or invalid token |

---

### POST /mfa/backup-codes

Regenerate backup codes. This invalidates all existing backup codes and generates new ones. Requires a valid MFA code to confirm identity.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| method | body | string | Yes | Active MFA method for verification (e.g., `totp`) |
| code | body | string | Yes | Current TOTP code for identity verification |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "a1b2c3d4",
      "e5f6g7h8",
      "i9j0k1l2",
      "m3n4o5p6",
      "q7r8s9t0",
      "u1v2w3x4",
      "y5z6a7b8",
      "c9d0e1f2"
    ]
  }
}
```

IMPORTANT: All previous backup codes are invalidated when new ones are generated.

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid code | Verification code is incorrect |
| 400 | MFA not enabled | No MFA method is currently active |
| 401 | Unauthorized | Missing or invalid token |
