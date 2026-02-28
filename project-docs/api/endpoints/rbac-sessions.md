# RBAC & Sessions Endpoints

> **[Template]** This covers the base template feature. Extend or modify for your project.

Base URL: `/api/v1`

---

## Permissions (`/roles/permissions`)

All permission endpoints require authentication and the `roles.read` permission.

### GET /roles/permissions

List all available permissions in the system.

**Authentication**: Required
**Permission**: `roles.read`

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "p1a2b3c4-...",
      "name": "users.read",
      "description": "View user accounts",
      "resource": "users",
      "action": "read"
    },
    {
      "id": "p2b3c4d5-...",
      "name": "users.update",
      "description": "Update user accounts",
      "resource": "users",
      "action": "update"
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `roles.read` permission |

---

### GET /roles/permissions/grouped

List all permissions grouped by their resource category (e.g., `users`, `roles`, `settings`).

**Authentication**: Required
**Permission**: `roles.read`

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "p1a2b3c4-...",
        "name": "users.read",
        "description": "View user accounts",
        "resource": "users",
        "action": "read"
      },
      {
        "id": "p2b3c4d5-...",
        "name": "users.update",
        "description": "Update user accounts",
        "resource": "users",
        "action": "update"
      }
    ],
    "roles": [
      {
        "id": "p3c4d5e6-...",
        "name": "roles.read",
        "description": "View roles",
        "resource": "roles",
        "action": "read"
      }
    ]
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `roles.read` permission |

---

## Role Management (`/roles`)

### GET /roles

List all roles with their assigned permissions.

**Authentication**: Required
**Permission**: `roles.read`

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "r1a2b3c4-...",
      "name": "Admin",
      "description": "Full system administrator",
      "isSystem": true,
      "permissions": [
        {
          "id": "p1a2b3c4-...",
          "name": "users.read"
        }
      ],
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `roles.read` permission |

---

### GET /roles/:id

Get a single role by ID, including its assigned permissions.

**Authentication**: Required
**Permission**: `roles.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Role ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "r1a2b3c4-...",
    "name": "Editor",
    "description": "Content editor role",
    "isSystem": false,
    "permissions": [
      {
        "id": "p1a2b3c4-...",
        "name": "users.read"
      }
    ],
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `roles.read` permission |
| 404 | Not found | Role with the given ID does not exist |

---

### POST /roles

Create a new custom role with optional initial permissions.

**Authentication**: Required
**Permission**: `roles.create`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| name | body | string | Yes | Role name (max 100 characters) |
| description | body | string | No | Role description (max 255 characters) |
| permissionIds | body | string[] (UUIDs) | No | Array of permission IDs to assign |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "id": "r2b3c4d5-...",
    "name": "Auditor",
    "description": "Read-only access to audit logs",
    "isSystem": false,
    "permissions": [
      {
        "id": "p1a2b3c4-...",
        "name": "audit.read"
      }
    ],
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid name or permission IDs |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `roles.create` permission |
| 409 | Role name already exists | A role with this name already exists |

---

### PUT /roles/:id

Update an existing role's name or description. System roles (built-in) cannot be modified.

**Authentication**: Required
**Permission**: `roles.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Role ID |
| name | body | string | No | New role name (max 100 characters) |
| description | body | string | No | New role description (max 255 characters) |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "r2b3c4d5-...",
    "name": "Senior Auditor",
    "description": "Extended audit access",
    "isSystem": false,
    "permissions": [],
    "createdAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Cannot modify system role | The target role is a built-in system role |
| 403 | Forbidden | User lacks `roles.update` permission |

---

### DELETE /roles/:id

Delete a role. System roles cannot be deleted. Users currently assigned this role will lose its permissions.

**Authentication**: Required
**Permission**: `roles.delete`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Role ID |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Role deleted successfully"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Cannot delete system role | The target role is a built-in system role |
| 403 | Forbidden | User lacks `roles.delete` permission |

---

### PUT /roles/:id/permissions

Replace all permissions for a role. This is a full replacement -- any permissions not included in the array will be removed.

**Authentication**: Required
**Permission**: `roles.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Role ID |
| permissionIds | body | string[] (UUIDs) | Yes | Complete list of permission IDs |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Role permissions updated"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid permission IDs |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `roles.update` permission |

---

## User Roles (`/roles/users`)

### GET /roles/users/:userId

Get all roles assigned to a specific user.

**Authentication**: Required
**Permission**: `users.read`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| userId | path | string (UUID) | Yes | Target user ID |

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "r1a2b3c4-...",
      "name": "Admin",
      "description": "Full system administrator",
      "isSystem": true
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `users.read` permission |

---

### PUT /roles/users/:userId

Replace all role assignments for a user. This is a full replacement -- any roles not included in the array will be removed.

**Authentication**: Required
**Permission**: `users.update`

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| userId | path | string (UUID) | Yes | Target user ID |
| roleIds | body | string[] (UUIDs) | Yes | Complete list of role IDs to assign |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "User roles updated"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid role IDs |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks `users.update` permission |

---

## Session Management (`/sessions`)

All session endpoints require authentication. Users manage their own sessions -- no special permissions required.

### GET /sessions

List all active sessions for the current user, including information about the device and last activity.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "s1a2b3c4-...",
      "userId": "a1b2c3d4-...",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "createdAt": "2025-06-01T14:22:00.000Z",
      "lastActivityAt": "2025-06-01T15:30:00.000Z",
      "isCurrent": true
    },
    {
      "id": "s2b3c4d5-...",
      "userId": "a1b2c3d4-...",
      "ipAddress": "10.0.0.5",
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS)...",
      "createdAt": "2025-05-28T09:00:00.000Z",
      "lastActivityAt": "2025-05-30T11:15:00.000Z",
      "isCurrent": false
    }
  ]
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### DELETE /sessions

Revoke all sessions except the current one. This is useful for "log out everywhere else" functionality.

**Authentication**: Required

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "All other sessions revoked"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

### DELETE /sessions/:id

Revoke a specific session by ID. Cannot revoke the current session (use `/auth/logout` instead).

**Authentication**: Required

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| id | path | string (UUID) | Yes | Session ID to revoke |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Session revoked"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Cannot revoke current session | Use `/auth/logout` to end the current session |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Session not found | Session does not exist or belongs to another user |
