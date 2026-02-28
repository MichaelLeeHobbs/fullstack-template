# Admin & Users Endpoints

> **[Template]** This covers the base template feature. Extend or modify for your project.

Base URL: `/api/v1`

---

## Admin -- Settings Management (`/admin/settings`)

All settings endpoints require authentication and the `settings.read` or `settings.update` permission.

### GET /admin/settings

List all system settings.

**Authentication**: Required
**Permission**: `settings.read`

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "key": "maintenance_mode",
      "value": false,
      "description": "Enable maintenance mode",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "key": "registration_enabled",
      "value": true,
      "description": "Allow new user registrations",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `settings.read` permission |

---

### GET /admin/settings/:key

Get a single system setting by its key.

**Authentication**: Required
**Permission**: `settings.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| key | path | string | Yes | Setting key identifier |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "key": "maintenance_mode",
    "value": false,
    "description": "Enable maintenance mode",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `settings.read` permission |
| 404 | Not found | Setting key does not exist |

---

### PATCH /admin/settings/:key

Update a system setting's value.

**Authentication**: Required
**Permission**: `settings.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| key | path | string | Yes | Setting key identifier |
| value | body | string / number / boolean | Yes | New value for the setting |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "key": "maintenance_mode",
    "value": true,
    "description": "Enable maintenance mode",
    "updatedAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid value type or format |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `settings.update` permission |

---

## Admin -- User Management (`/admin/users`)

All user management endpoints require authentication and the appropriate `users.*` permission.

### GET /admin/users

List all users with pagination, filtering, and sorting.

**Authentication**: Required
**Permission**: `users.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number (min: 1) |
| limit | query | integer | No | 20 | Items per page (min: 1, max: 100) |
| search | query | string | No | -- | Search by email (partial match) |
| isActive | query | string | No | -- | Filter by active status: `"true"` or `"false"` |
| isAdmin | query | string | No | -- | Filter by admin status: `"true"` or `"false"` |
| sortBy | query | string | No | -- | Sort field: `email`, `createdAt`, `lastLoginAt` |
| sortOrder | query | string | No | -- | Sort direction: `asc` or `desc` |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "email": "admin@example.com",
      "isAdmin": true,
      "isActive": true,
      "emailVerified": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "lastLoginAt": "2025-06-01T14:22:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid query parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `users.read` permission |

---

### GET /admin/users/:id

Get detailed information about a specific user.

**Authentication**: Required
**Permission**: `users.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | User ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "email": "user@example.com",
    "isAdmin": false,
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "lastLoginAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `users.read` permission |
| 404 | Not found | User with the given ID does not exist |

---

### PATCH /admin/users/:id

Update a user's admin status or active status. Cannot modify your own account through this endpoint.

**Authentication**: Required
**Permission**: `users.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | User ID |
| isActive | body | boolean | No | Enable or disable the account |
| isAdmin | body | boolean | No | Grant or revoke admin status |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "email": "user@example.com",
    "isAdmin": true,
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid request body or attempting to modify own account |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `users.update` permission |

---

### DELETE /admin/users/:id

Permanently delete a user account. Cannot delete your own account.

**Authentication**: Required
**Permission**: `users.delete`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | User ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Cannot delete own account | You cannot delete the account you are logged in as |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `users.delete` permission |

---

## Admin -- Audit Logs (`/admin/audit-logs`)

### GET /admin/audit-logs

List audit log entries with pagination, filtering, and sorting. Audit logs record security-relevant actions such as logins, password changes, and permission modifications.

**Authentication**: Required
**Permission**: `audit.read`

| Parameter | Location | Type | Required | Default | Description |
|-----------|----------|------|----------|---------|-------------|
| page | query | integer | No | 1 | Page number (min: 1) |
| limit | query | integer | No | 50 | Items per page (min: 1, max: 100) |
| userId | query | string (UUID) | No | -- | Filter logs by user ID |
| sortBy | query | string | No | -- | Sort field: `createdAt`, `action` |
| sortOrder | query | string | No | -- | Sort direction: `asc` or `desc` |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "f1e2d3c4-...",
      "userId": "a1b2c3d4-...",
      "action": "user.login",
      "details": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "createdAt": "2025-06-01T14:22:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid query parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `audit.read` permission |

---

## User Profile Endpoints (`/users`)

All user profile endpoints require authentication. No special permissions are needed -- users manage their own profile.

### GET /users/me

Get the current user's profile information.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "email": "user@example.com",
    "isAdmin": false,
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "lastLoginAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### PATCH /users/me/password

Change the current user's password. Requires the current password for verification.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| currentPassword | body | string | Yes | Current account password |
| newPassword | body | string | Yes | New password (8-128 characters) |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Current password is incorrect | The provided current password does not match |
| 400 | Validation error | New password does not meet requirements |
| 401 | Unauthorized | Missing or invalid token |

---

### GET /users/me/preferences

Get the current user's display preferences.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "theme": "system"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### PATCH /users/me/preferences

Update the current user's display preferences.

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| theme | body | string | No | Theme preference: `light`, `dark`, or `system` |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "theme": "dark"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid theme value |
| 401 | Unauthorized | Missing or invalid token |
