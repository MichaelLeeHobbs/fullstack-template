# Test Cases: Role-Based Access Control (RBAC)

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-RBAC-001 through US-RBAC-012

## Permissions

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-RBAC-001 | List all permissions | User authenticated with admin privileges | 1. GET `/api/permissions` with admin authentication | 200 OK; response contains array of all defined permissions with id, action, resource, and description | US-RBAC-001 | P0 | Yes |
| TC-RBAC-002 | List permissions grouped by resource | User authenticated with admin privileges | 1. GET `/api/permissions?grouped=true` with admin authentication | 200 OK; response contains permissions organized by resource (e.g., users, roles, settings) | US-RBAC-001 | P1 | Yes |

## Role Management

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-RBAC-003 | Create role with name | User authenticated with admin privileges | 1. POST `/api/roles` with body containing name and optional description | 201 Created; response contains new role object with generated ID, name, description, and isSystem=false | US-RBAC-002 | P0 | Yes |
| TC-RBAC-004 | Create role with duplicate name | Role "editor" already exists | 1. POST `/api/roles` with name "editor" | 409 Conflict; error indicates role name already exists | US-RBAC-003 | P0 | Yes |
| TC-RBAC-005 | Get role by ID | Role exists in system | 1. GET `/api/roles/:id` with valid role ID | 200 OK; response contains role object with id, name, description, isSystem, and associated permissions | US-RBAC-004 | P0 | Yes |
| TC-RBAC-006 | Update role name | Custom (non-system) role exists | 1. PATCH `/api/roles/:id` with new name and/or description | 200 OK; response contains updated role object with new values | US-RBAC-005 | P1 | Yes |
| TC-RBAC-007 | Cannot modify system role | System role (e.g., "admin") exists | 1. PATCH `/api/roles/:id` targeting a system role with isSystem=true | 403 Forbidden; error indicates system roles cannot be modified | US-RBAC-006 | P0 | Yes |
| TC-RBAC-008 | Delete custom role | Custom (non-system) role exists with no assigned users | 1. DELETE `/api/roles/:id` with custom role ID | 200 OK; role is removed; subsequent GET returns 404 | US-RBAC-007 | P1 | Yes |
| TC-RBAC-009 | Cannot delete system role | System role exists | 1. DELETE `/api/roles/:id` targeting a system role with isSystem=true | 403 Forbidden; error indicates system roles cannot be deleted | US-RBAC-006 | P0 | Yes |

## Role Permissions

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-RBAC-010 | Set role permissions | Custom role exists; permissions exist | 1. PUT `/api/roles/:id/permissions` with array of permission IDs | 200 OK; role now has exactly the specified permissions; previous permissions replaced | US-RBAC-008 | P0 | Yes |

## User Role Assignment

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-RBAC-011 | Get user roles | User exists with assigned roles | 1. GET `/api/users/:id/roles` with admin authentication | 200 OK; response contains array of roles assigned to the user | US-RBAC-009 | P0 | Yes |
| TC-RBAC-012 | Set user roles | User exists; roles exist | 1. PUT `/api/users/:id/roles` with array of role IDs | 200 OK; user now has exactly the specified roles; previous role assignments replaced | US-RBAC-010 | P0 | Yes |
