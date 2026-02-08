# API Reference

> Complete endpoint reference for the Fullstack Template API.
>
> **Base URL:** `http://localhost:3000/api/v1`
> **Interactive docs:** `http://localhost:3000/api/docs` (non-production only)

---

## Table of Contents

- [Conventions](#conventions)
- [Authentication](#authentication)
- [Auth](#auth-apiv1auth)
- [Account](#account-apiv1account)
- [Users](#users-apiv1users)
- [Sessions](#sessions-apiv1sessions)
- [MFA](#mfa-apiv1mfa)
- [Admin](#admin-apiv1admin)
- [Settings](#settings-apiv1adminsettings)
- [Roles](#roles-apiv1roles)
- [API Keys](#api-keys-apiv1api-keys)
- [Health](#health)

---

## Conventions

### Response Format

All responses follow a consistent JSON envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Paginated:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (duplicate resource) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Request Headers

| Header | Value | When |
|--------|-------|------|
| `Content-Type` | `application/json` | All requests with body |
| `Authorization` | `Bearer <accessToken>` | Protected endpoints |
| `X-API-Key` | `<apiKey>` | API key authentication (alternative to Bearer) |

Every response includes an `X-Request-ID` header for log correlation.

---

## Authentication

Protected endpoints require a JWT access token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained via `POST /auth/login` or `POST /auth/register`. Access tokens are short-lived; use `POST /auth/refresh` with the refresh token to get new tokens.

Alternatively, API key authentication is supported via the `X-API-Key` header. API keys have scoped permissions and are used for programmatic access.

---

## Auth — `/api/v1/auth`

### POST /auth/register

Register a new user account.

**Auth:** None (public)
**Rate Limit:** 5 per hour per IP

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | yes | Valid email |
| password | string | yes | Min 8 chars, 1 uppercase, 1 number |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "string", "isAdmin": false, ... },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid request body |
| 409 | Email already registered |

---

### POST /auth/login

Log in with email and password.

**Auth:** None (public)
**Rate Limit:** 5 per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | yes | Valid email |
| password | string | yes | Min 1 character |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "string", ... },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

If MFA is enabled, the response instead contains:
```json
{
  "success": true,
  "data": {
    "mfaRequired": true,
    "tempToken": "string",
    "mfaMethods": ["totp"]
  }
}
```
Use `POST /mfa/verify` with the `tempToken` to complete login.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid request body |
| 401 | Invalid credentials |
| 403 | Email not verified / account deactivated |
| 429 | Account locked (too many failed attempts) |

---

### POST /auth/refresh

Refresh access token using a refresh token.

**Auth:** None (public)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| refreshToken | string | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Invalid or expired refresh token |

---

### POST /auth/logout

Log out and invalidate the refresh token.

**Auth:** None (public)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| refreshToken | string | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### GET /auth/me

Get the current authenticated user.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "string",
    "isAdmin": false,
    "isActive": true,
    "emailVerified": true,
    "permissions": ["users:read", ...]
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | User not found |

---

## Account — `/api/v1/account`

### POST /account/forgot-password

Request a password reset email.

**Auth:** None (public)
**Rate Limit:** 3 per hour per IP

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| email | string | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "If an account with that email exists, a reset link has been sent." }
}
```

> Always returns 200 to prevent email enumeration.

---

### POST /account/reset-password

Reset password using a token from the email link.

**Auth:** None (public)

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| token | string | yes | From email link |
| password | string | yes | Min 8 characters |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password reset successful. You can now log in." }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid or expired reset token |

---

### POST /account/verify-email

Verify email address using a token.

**Auth:** None (public)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| token | string | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Email verified successfully." }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid or expired verification token |

---

### POST /account/resend-verification

Resend the email verification link.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Verification email sent." }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |

---

## Users — `/api/v1/users`

All user routes require authentication.

### GET /users/me

Get current user profile.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "string",
    "isAdmin": false,
    "isActive": true,
    "emailVerified": true,
    "accountType": "user",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | User not found |

---

### PATCH /users/me/password

Change current user's password.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| currentPassword | string | yes | Min 1 character |
| newPassword | string | yes | Min 8 characters |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Current password incorrect |
| 401 | Not authenticated |

---

### GET /users/me/preferences

Get current user's preferences.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": { "theme": "system" }
}
```

---

### PATCH /users/me/preferences

Update current user's preferences.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| theme | string | no | `light`, `dark`, `system` |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "theme": "dark" }
}
```

---

## Sessions — `/api/v1/sessions`

All session routes require authentication.

### GET /sessions

List current user's active sessions.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userAgent": "string",
      "ipAddress": "string",
      "lastActive": "2026-01-01T00:00:00.000Z",
      "isCurrent": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### DELETE /sessions

Revoke all sessions except the current one.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Revoked 3 session(s)" }
}
```

---

### DELETE /sessions/:id

Revoke a specific session by ID.

**Auth:** Bearer token

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Session revoked" }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Cannot revoke current session |
| 404 | Session not found |

---

## MFA — `/api/v1/mfa`

### POST /mfa/verify

Verify MFA code during login. Uses a temporary token (not JWT).

**Auth:** None (uses `tempToken` from login response)
**Rate Limit:** 5 per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tempToken | string | yes | From login response when `mfaRequired: true` |
| method | string | yes | MFA method (`totp` or `backup`) |
| code | string | yes | Verification code |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "string", ... },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 401 | Invalid MFA code or expired temp token |

---

### GET /mfa/methods

Get enabled MFA methods for the current user.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    { "method": "totp", "enabled": true }
  ]
}
```

---

### POST /mfa/totp/setup

Begin TOTP setup. Returns a secret and QR code for the authenticator app.

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "secret": "string",
    "qrCode": "data:image/png;base64,..."
  }
}
```

---

### POST /mfa/totp/verify-setup

Verify TOTP setup with a code from the authenticator app. Enables TOTP and returns backup codes.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| code | string | yes | Exactly 6 digits |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "backupCodes": ["abc123", "def456", ...]
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid verification code |

---

### POST /mfa/disable

Disable an MFA method. Requires verification code to confirm identity.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| method | string | yes | MFA method to disable |
| code | string | yes | Current TOTP code for verification |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "MFA disabled" }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid code or method not enabled |

---

### POST /mfa/backup-codes

Regenerate backup codes. Requires verification code to confirm identity.

**Auth:** Bearer token

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| method | string | yes | Active MFA method for verification |
| code | string | yes | Current TOTP code for verification |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "backupCodes": ["abc123", "def456", ...]
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid code or MFA not enabled |

---

## Admin — `/api/v1/admin`

All admin routes require authentication and specific permissions.

### GET /admin/users

List all users (paginated).

**Auth:** Bearer token
**Permission:** `users:read`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |
| search | string | — | Search by email |
| isActive | `true`/`false` | — | Filter by active status |
| isAdmin | `true`/`false` | — | Filter by admin status |
| sortBy | string | — | Column to sort by |
| sortOrder | `asc`/`desc` | `desc` | Sort direction |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      { "id": "uuid", "email": "string", "isAdmin": false, "isActive": true, ... }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
  }
}
```

---

### GET /admin/users/:id

Get a user by ID.

**Auth:** Bearer token
**Permission:** `users:read`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "string", "isAdmin": false, ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | User not found |

---

### PATCH /admin/users/:id

Update a user (activate/deactivate, promote/demote admin).

**Auth:** Bearer token
**Permission:** `users:update`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| isActive | boolean | no |
| isAdmin | boolean | no |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "string", "isAdmin": true, ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Cannot remove your own admin privileges |
| 404 | User not found |

---

### DELETE /admin/users/:id

Delete a user.

**Auth:** Bearer token
**Permission:** `users:delete`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "string", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Cannot delete own account / other error |
| 404 | User not found |

---

### GET /admin/audit-logs

List audit logs (paginated).

**Auth:** Bearer token
**Permission:** `audit:read`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |
| userId | uuid | — | Filter by user ID |
| sortBy | string | — | Column to sort by |
| sortOrder | `asc`/`desc` | `desc` | Sort direction |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "userId": "uuid",
        "action": "string",
        "resource": "string",
        "details": {},
        "ipAddress": "string",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 200, "totalPages": 4 }
  }
}
```

---

## Settings — `/api/v1/admin/settings`

### GET /admin/settings

List all system settings.

**Auth:** Bearer token
**Permission:** `settings:read`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": [
      { "key": "string", "value": "string | number | boolean", "description": "string", "updatedAt": "..." }
    ],
    "grouped": {
      "category": [ ... ]
    }
  }
}
```

---

### GET /admin/settings/:key

Get a single system setting by key.

**Auth:** Bearer token
**Permission:** `settings:read`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| key | path | string | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "key": "string", "value": "string | number | boolean", "description": "string", "updatedAt": "..." }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | Setting not found |

---

### PATCH /admin/settings/:key

Update a system setting.

**Auth:** Bearer token
**Permission:** `settings:update`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| key | path | string | yes |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| value | string / number / boolean | yes | New setting value |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "message": "Setting updated successfully" }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | Setting not found |

---

## Roles — `/api/v1/roles`

All role routes require authentication and `roles:*` permissions.

### GET /roles/permissions

List all available permissions.

**Auth:** Bearer token
**Permission:** `roles:read`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "users:read", "resource": "users", "action": "read" }
  ]
}
```

---

### GET /roles/permissions/grouped

List permissions grouped by resource.

**Auth:** Bearer token
**Permission:** `roles:read`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      { "id": "uuid", "name": "users:read", "resource": "users", "action": "read" },
      { "id": "uuid", "name": "users:create", "resource": "users", "action": "create" }
    ],
    "roles": [ ... ]
  }
}
```

---

### GET /roles

List all roles.

**Auth:** Bearer token
**Permission:** `roles:read`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "string", "description": "string", "isSystem": false, "createdAt": "..." }
  ]
}
```

---

### GET /roles/:id

Get a role by ID (includes permissions).

**Auth:** Bearer token
**Permission:** `roles:read`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "isSystem": false,
    "permissions": [ ... ],
    "createdAt": "..."
  }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | Role not found |

---

### POST /roles

Create a new role.

**Auth:** Bearer token
**Permission:** `roles:create`

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | yes | 1-100 characters |
| description | string | no | Max 255 characters |
| permissionIds | uuid[] | no | Initial permissions to assign |

**Success Response (201):**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "string", "description": "string", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 409 | Role name already exists |

---

### PUT /roles/:id

Update a role.

**Auth:** Bearer token
**Permission:** `roles:update`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | no | 1-100 characters |
| description | string | no | Max 255 characters |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "string", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 403 | Cannot modify system role |
| 404 | Role not found |
| 409 | Role name already exists |

---

### DELETE /roles/:id

Delete a role.

**Auth:** Bearer token
**Permission:** `roles:delete`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 403 | Cannot delete system role |
| 404 | Role not found |

---

### PUT /roles/:id/permissions

Set permissions for a role (replaces all existing permissions).

**Auth:** Bearer token
**Permission:** `roles:update`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| permissionIds | uuid[] | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "string", "permissions": [ ... ] }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 403 | Cannot modify system role |
| 404 | Role not found |

---

### GET /roles/users/:userId

Get roles assigned to a user.

**Auth:** Bearer token
**Permission:** `users:read`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| userId | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "string", "description": "string", ... }
  ]
}
```

---

### PUT /roles/users/:userId

Set roles for a user (replaces all existing role assignments).

**Auth:** Bearer token
**Permission:** `users:update`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| userId | path | uuid | yes |

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| roleIds | uuid[] | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "string", ... }
  ]
}
```

---

## API Keys — `/api/v1/api-keys`

All API key routes require authentication.

### GET /api-keys/my

List the current user's own API keys (no special permissions required).

**Auth:** Bearer token

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "prefix": "fst_",
      "isActive": true,
      "expiresAt": "2026-12-31T00:00:00.000Z",
      "createdAt": "...",
      "lastUsedAt": "..."
    }
  ]
}
```

---

### GET /api-keys/service-accounts

List all service accounts.

**Auth:** Bearer token
**Permission:** `service_accounts:read`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "email": "string", "accountType": "service", ... }
  ]
}
```

---

### POST /api-keys/service-accounts

Create a new service account.

**Auth:** Bearer token
**Permission:** `service_accounts:create`

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| email | string | yes |

**Success Response (201):**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "string", "accountType": "service", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 409 | Email already in use |

---

### DELETE /api-keys/service-accounts/:id

Delete a service account and all its API keys.

**Auth:** Bearer token
**Permission:** `service_accounts:delete`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "string", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | Service account not found |

---

### POST /api-keys

Create a new API key.

**Auth:** Bearer token
**Permission:** `api_keys:create`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Max 100 characters |
| permissionIds | uuid[] | no | Permissions to assign (defaults to []) |
| expiresAt | date-time | no | Expiration date |
| userId | uuid | no | Assign to specific user (admin only) |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "apiKey": { "id": "uuid", "name": "string", "prefix": "fst_", ... },
    "secret": "fst_abc123..."
  }
}
```

> The `secret` (plaintext key) is only returned at creation time. Store it securely.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 403 | Insufficient permissions |

---

### GET /api-keys

List all API keys (paginated).

**Auth:** Bearer token
**Permission:** `api_keys:read`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |
| userId | uuid | — | Filter by user |
| isActive | `true`/`false` | — | Filter by status |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [ { "id": "uuid", "name": "string", "prefix": "fst_", ... } ],
    "pagination": { "page": 1, "limit": 20, "total": 10, "totalPages": 1 }
  }
}
```

---

### GET /api-keys/:id

Get an API key by ID.

**Auth:** Bearer token
**Permission:** `api_keys:read`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "string", "prefix": "fst_", "isActive": true, ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | API key not found |

---

### PUT /api-keys/:id/permissions

Set permissions for an API key (replaces all existing).

**Auth:** Bearer token
**Permission:** `api_keys:update`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| permissionIds | uuid[] | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "string", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 403 | Insufficient permissions |
| 404 | API key not found |

---

### POST /api-keys/:id/revoke

Revoke an API key (deactivate without deleting).

**Auth:** Bearer token
**Permission:** `api_keys:delete`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "isActive": false, ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | API key not found |

---

### DELETE /api-keys/:id

Permanently delete an API key.

**Auth:** Bearer token
**Permission:** `api_keys:delete`

**Parameters:**

| Param | Location | Type | Required |
|-------|----------|------|----------|
| id | path | uuid | yes |

**Success Response (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "string", ... }
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 404 | API key not found |

---

## Health

### GET /health

Health check endpoint (outside the `/api/v1` prefix).

**Auth:** None (public)
**URL:** `http://localhost:3000/health`

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```
