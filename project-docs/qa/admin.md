# Test Cases: Admin Panel

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-ADMIN-001 through US-ADMIN-020

## User Management

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-ADMIN-001 | List users with pagination | Admin authenticated; multiple users exist | 1. GET `/api/admin/users?page=1&limit=10` with admin authentication | 200 OK; response contains data array of users and meta object with page, limit, total, totalPages | US-ADMIN-001 | P0 | Yes |
| TC-ADMIN-002 | Search users by email | Admin authenticated; users with various emails exist | 1. GET `/api/admin/users?search=test@example` with admin authentication | 200 OK; response contains only users whose email matches the search query | US-ADMIN-002 | P0 | Yes |
| TC-ADMIN-003 | Filter users by isActive | Admin authenticated; both active and inactive users exist | 1. GET `/api/admin/users?isActive=true` with admin authentication | 200 OK; response contains only users where isActive=true | US-ADMIN-002 | P1 | Yes |
| TC-ADMIN-004 | Filter users by isAdmin | Admin authenticated; both admin and non-admin users exist | 1. GET `/api/admin/users?isAdmin=true` with admin authentication | 200 OK; response contains only users with admin privileges | US-ADMIN-002 | P1 | Yes |
| TC-ADMIN-005 | Get user by ID | Admin authenticated; target user exists | 1. GET `/api/admin/users/:id` with valid user ID | 200 OK; response contains full user object including id, name, email, isActive, isAdmin, createdAt, roles | US-ADMIN-003 | P0 | Yes |
| TC-ADMIN-006 | Get non-existent user | Admin authenticated | 1. GET `/api/admin/users/:id` with a UUID that does not match any user | 404 Not Found; error indicates user not found | US-ADMIN-003 | P1 | Yes |
| TC-ADMIN-007 | Update user isActive status | Admin authenticated; target user exists and is active | 1. PATCH `/api/admin/users/:id` with body { isActive: false } | 200 OK; user isActive is now false; user can no longer log in; audit log entry created | US-ADMIN-004 | P0 | Yes |
| TC-ADMIN-008 | Cannot delete own admin account | Admin authenticated | 1. DELETE `/api/admin/users/:id` where id is the current admin's own user ID | 400 Bad Request; error indicates cannot delete your own account | US-ADMIN-005 | P0 | Yes |

## Audit Logs

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-ADMIN-009 | List audit logs with pagination | Admin authenticated; audit log entries exist | 1. GET `/api/admin/audit-logs?page=1&limit=20` with admin authentication | 200 OK; response contains data array of audit log entries and meta pagination object | US-ADMIN-006 | P0 | Yes |
| TC-ADMIN-010 | Filter audit logs by userId | Admin authenticated; audit logs from multiple users exist | 1. GET `/api/admin/audit-logs?userId=<target-user-id>` with admin authentication | 200 OK; response contains only audit log entries for the specified user | US-ADMIN-007 | P1 | Yes |
| TC-ADMIN-011 | Audit log created on login | User successfully logs in | 1. POST `/api/auth/login` with valid credentials 2. GET `/api/admin/audit-logs?userId=<user-id>` as admin | Audit log contains entry with action "login" for the user, including timestamp and IP address | US-ADMIN-008 | P0 | Yes |
| TC-ADMIN-012 | Audit log created on admin action | Admin performs a user management action | 1. PATCH `/api/admin/users/:id` to update a user as admin 2. GET `/api/admin/audit-logs` as admin | Audit log contains entry recording the admin action with actor ID, target, and action type | US-ADMIN-008 | P0 | Yes |

## Settings

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-ADMIN-013 | List all settings | Admin authenticated | 1. GET `/api/admin/settings` with admin authentication | 200 OK; response contains array of all application settings with key, value, and description | US-ADMIN-009 | P0 | Yes |
| TC-ADMIN-014 | Get setting by key | Admin authenticated; setting with key exists | 1. GET `/api/admin/settings/:key` with valid setting key | 200 OK; response contains the setting object with key, value, type, and description | US-ADMIN-010 | P0 | Yes |
| TC-ADMIN-015 | Get non-existent setting | Admin authenticated | 1. GET `/api/admin/settings/:key` with a key that does not exist | 404 Not Found; error indicates setting not found | US-ADMIN-010 | P1 | Yes |
| TC-ADMIN-016 | Update setting value | Admin authenticated; setting exists | 1. PATCH `/api/admin/settings/:key` with new value | 200 OK; setting value is updated; response contains updated setting object; audit log entry created | US-ADMIN-011 | P0 | Yes |

## Service Accounts

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-ADMIN-017 | List service accounts | Admin authenticated | 1. GET `/api/admin/service-accounts` with admin authentication | 200 OK; response contains array of service accounts with id, name, description, isActive, createdAt | US-ADMIN-012 | P0 | Yes |
| TC-ADMIN-018 | Create service account | Admin authenticated | 1. POST `/api/admin/service-accounts` with name and description | 201 Created; response contains new service account object with generated ID and credentials | US-ADMIN-013 | P0 | Yes |
| TC-ADMIN-019 | Create duplicate service account | Admin authenticated; service account with name exists | 1. POST `/api/admin/service-accounts` with name that already exists | 409 Conflict; error indicates service account name already exists | US-ADMIN-014 | P1 | Yes |
| TC-ADMIN-020 | Delete service account | Admin authenticated; service account exists | 1. DELETE `/api/admin/service-accounts/:id` with valid service account ID | 200 OK; service account is removed; associated API keys are invalidated; audit log entry created | US-ADMIN-015 | P0 | Yes |
