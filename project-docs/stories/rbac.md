# Role-Based Access Control User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-RBAC-001: Create Role

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/roles, GET /api/v1/roles, GET /api/v1/roles/:id, PUT /api/v1/roles/:id, DELETE /api/v1/roles/:id |
| **Components** | RolesPage, RoleController.createRole(), RoleService, useRoles hook |

**As an** administrator, **I want to** create custom roles with a name and description, **so that** I can define access groupings tailored to my organization.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can create a new role with a name (required, max 100 chars) and description (optional, max 255 chars) | TC-RBAC-001 |
| 2 | Role name must be unique; duplicate name returns 409 Conflict | TC-RBAC-002 |
| 3 | Optional permissionIds array can be provided at creation to assign initial permissions | TC-RBAC-003 |
| 4 | Successful creation returns 201 with the new role data | TC-RBAC-004 |
| 5 | Requires `roles:create` permission; insufficient permission returns 403 Forbidden | TC-RBAC-005 |
| 6 | Roles can be listed (GET /api/v1/roles) with their associated permissions | TC-RBAC-006 |
| 7 | Individual role can be retrieved by ID (GET /api/v1/roles/:id) | TC-RBAC-007 |
| 8 | Roles can be updated (PUT /api/v1/roles/:id) with new name/description | TC-RBAC-008 |
| 9 | System roles cannot be modified or deleted (returns 403 Forbidden) | TC-RBAC-009 |
| 10 | Roles can be deleted (DELETE /api/v1/roles/:id) | TC-RBAC-010 |

---

## US-RBAC-002: Assign Permissions

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | PUT /api/v1/roles/:id/permissions, GET /api/v1/roles/permissions, GET /api/v1/roles/permissions/grouped |
| **Components** | RolesPage, RoleController.setRolePermissions(), RoleController.listPermissions(), RoleService, PermissionService |

**As an** administrator, **I want to** assign a set of permissions to a role, **so that** all users with that role receive the correct access rights.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can set permissions on a role by providing an array of permissionIds (replaces all existing permissions) | TC-RBAC-011 |
| 2 | All available permissions can be listed via GET /api/v1/roles/permissions | TC-RBAC-012 |
| 3 | Permissions can be retrieved grouped by resource via GET /api/v1/roles/permissions/grouped | TC-RBAC-013 |
| 4 | Setting empty permissionIds array removes all permissions from the role | TC-RBAC-014 |
| 5 | Invalid permission IDs are rejected with a validation error | TC-RBAC-015 |
| 6 | Requires `roles:update` permission; insufficient permission returns 403 Forbidden | TC-RBAC-016 |
| 7 | Permission list responses are cached for 5 minutes (private, Cache-Control) | TC-RBAC-017 |

---

## US-RBAC-003: Assign Role to User

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | PUT /api/v1/roles/users/:userId, GET /api/v1/roles/users/:userId |
| **Components** | UsersPage (role assignment), RoleController.setUserRoles(), RoleController.getUserRoles(), UserRoleService |

**As an** administrator, **I want to** assign or replace roles for a specific user, **so that** their permissions are updated to match their responsibilities.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can set roles for a user by providing an array of roleIds (replaces all existing roles) | TC-RBAC-018 |
| 2 | Admin can view the current roles assigned to a user via GET /api/v1/roles/users/:userId | TC-RBAC-019 |
| 3 | Setting empty roleIds array removes all roles from the user | TC-RBAC-020 |
| 4 | Requires `users:update` permission for setting roles | TC-RBAC-021 |
| 5 | Requires `users:read` permission for viewing user roles | TC-RBAC-022 |
| 6 | User's effective permissions are the union of all permissions from all assigned roles | TC-RBAC-023 |

---

## US-RBAC-004: Permission-Gated Access

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | All protected endpoints |
| **Components** | requirePermission middleware, PermissionService, usePermission hook |

**As a** system, **I want to** enforce permission checks on all protected endpoints, **so that** users can only access resources they are authorized to use.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | The `requirePermission` middleware checks the user's effective permissions before allowing access | TC-RBAC-024 |
| 2 | Users without the required permission receive 403 Forbidden | TC-RBAC-025 |
| 3 | Unauthenticated users receive 401 Unauthorized (before permission check) | TC-RBAC-026 |
| 4 | Admin users (isAdmin flag) bypass permission checks | TC-RBAC-027 |
| 5 | Permission checks evaluate the union of all roles assigned to the user | TC-RBAC-028 |
| 6 | Frontend uses usePermission hook to conditionally render UI elements based on user permissions | TC-RBAC-029 |
| 7 | API key requests are checked against the key's scoped permissions | TC-RBAC-030 |

---
