# Administration User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-ADMIN-001: User List

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/admin/users |
| **Components** | UsersPage, AdminController.listUsers(), AdminService, usePermission hook |

**As an** administrator, **I want to** view a paginated list of all users with search and filter capabilities, **so that** I can manage user accounts efficiently.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can retrieve a paginated list of users (default page=1, limit=20) | TC-ADMIN-001 |
| 2 | Users can be searched by email using the `search` query parameter | TC-ADMIN-002 |
| 3 | Users can be filtered by active status using `isActive` query parameter (true/false) | TC-ADMIN-003 |
| 4 | Users can be filtered by admin status using `isAdmin` query parameter (true/false) | TC-ADMIN-004 |
| 5 | Results can be sorted using `sortBy` and `sortOrder` (asc/desc) query parameters | TC-ADMIN-005 |
| 6 | Response includes pagination metadata (page, limit, total, totalPages) | TC-ADMIN-006 |
| 7 | Requires `users:read` permission; insufficient permission returns 403 Forbidden | TC-ADMIN-007 |
| 8 | Response uses no-cache headers (Cache-Control: max-age=0, must-revalidate, private) | TC-ADMIN-008 |

---

## US-ADMIN-002: User Detail

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/admin/users/:id |
| **Components** | UsersPage (detail view), AdminController.getUser(), AdminService |

**As an** administrator, **I want to** view the full profile of a specific user, **so that** I can review their account details, roles, and MFA status.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can retrieve a user's full profile by their UUID | TC-ADMIN-009 |
| 2 | Response includes user profile data (email, isActive, isAdmin, emailVerified, createdAt) | TC-ADMIN-010 |
| 3 | Response includes the user's assigned roles | TC-ADMIN-011 |
| 4 | Response includes the user's MFA enrollment status | TC-ADMIN-012 |
| 5 | Non-existent user ID returns 404 Not Found | TC-ADMIN-013 |
| 6 | Requires `users:read` permission; insufficient permission returns 403 Forbidden | TC-ADMIN-014 |
| 7 | User ID must be a valid UUID (validated by schema) | TC-ADMIN-015 |

---

## US-ADMIN-003: Activate/Deactivate User

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | PATCH /api/v1/admin/users/:id |
| **Components** | UsersPage (toggle active), AdminController.updateUser(), AdminService |

**As an** administrator, **I want to** activate or deactivate a user account, **so that** I can control who has access to the system without deleting their data.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can set `isActive` to true or false on a user via PATCH request | TC-ADMIN-016 |
| 2 | Admin can set `isAdmin` to true or false on a user via PATCH request | TC-ADMIN-017 |
| 3 | Admin cannot deactivate their own account (returns 400 Bad Request) | TC-ADMIN-018 |
| 4 | Deactivated users cannot log in (enforced at login) | TC-ADMIN-019 |
| 5 | User can be deleted via DELETE /api/v1/admin/users/:id | TC-ADMIN-020 |
| 6 | Admin cannot delete their own account (returns 400 Bad Request) | TC-ADMIN-021 |
| 7 | Requires `users:update` permission for PATCH, `users:delete` permission for DELETE | TC-ADMIN-022 |
| 8 | Validation errors return 400 Bad Request | TC-ADMIN-023 |

---

## US-ADMIN-004: Audit Logs

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/admin/audit-logs |
| **Components** | AuditLogsPage, AdminController.listAuditLogs(), AuditService |

**As an** administrator, **I want to** view a paginated audit log with user filtering, **so that** I can track security events and user activity across the system.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can retrieve a paginated list of audit logs (default page=1, limit=50, max 100) | TC-ADMIN-024 |
| 2 | Audit logs can be filtered by `userId` query parameter | TC-ADMIN-025 |
| 3 | Results can be sorted using `sortBy` and `sortOrder` (asc/desc) query parameters | TC-ADMIN-026 |
| 4 | Each audit log entry includes action, userId, timestamp, and metadata | TC-ADMIN-027 |
| 5 | Response includes pagination metadata (page, limit, total, totalPages) | TC-ADMIN-028 |
| 6 | Requires `audit:read` permission; insufficient permission returns 403 Forbidden | TC-ADMIN-029 |
| 7 | Audit logs record key events: login, logout, registration, password reset, MFA changes, role changes | TC-ADMIN-030 |

---

## US-ADMIN-005: System Settings

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/admin/settings, GET /api/v1/admin/settings/:key, PATCH /api/v1/admin/settings/:key |
| **Components** | SettingsPage, SettingsController.list(), SettingsController.get(), SettingsController.update(), SettingsService |

**As an** administrator, **I want to** view and edit system settings, **so that** I can configure application behavior (such as lockout thresholds) without code changes.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can list all system settings via GET /api/v1/admin/settings | TC-ADMIN-031 |
| 2 | Admin can retrieve a single setting by key via GET /api/v1/admin/settings/:key | TC-ADMIN-032 |
| 3 | Non-existent setting key returns 404 Not Found | TC-ADMIN-033 |
| 4 | Admin can update a setting value via PATCH /api/v1/admin/settings/:key | TC-ADMIN-034 |
| 5 | Setting values support string, number, and boolean types | TC-ADMIN-035 |
| 6 | Requires `settings:read` permission for GET, `settings:update` permission for PATCH | TC-ADMIN-036 |
| 7 | Settings list responses are cached for 60 seconds (private, Cache-Control) | TC-ADMIN-037 |
| 8 | Settings are stored as key-value pairs in the database | TC-ADMIN-038 |

---

## US-ADMIN-006: Service Accounts

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | GET /api/v1/api-keys/service-accounts, POST /api/v1/api-keys/service-accounts, DELETE /api/v1/api-keys/service-accounts/:id |
| **Components** | ServiceAccountsPage, ApiKeyController.listServiceAccounts(), ApiKeyController.createServiceAccount(), ServiceAccountService |

**As an** administrator, **I want to** create and manage headless service accounts, **so that** automated systems and integrations can authenticate via API keys without a human user account.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Admin can list all service accounts with pagination | TC-ADMIN-039 |
| 2 | Admin can create a service account by providing an email address | TC-ADMIN-040 |
| 3 | Duplicate service account email returns 409 Conflict | TC-ADMIN-041 |
| 4 | Successful creation returns 201 with the new service account data | TC-ADMIN-042 |
| 5 | Admin can delete a service account via DELETE /api/v1/api-keys/service-accounts/:id | TC-ADMIN-043 |
| 6 | Requires `service-accounts:read` permission for listing, `service-accounts:create` for creation, `service-accounts:delete` for deletion | TC-ADMIN-044 |
| 7 | Service accounts are flagged as non-human accounts (isServiceAccount) | TC-ADMIN-045 |
| 8 | API keys can be associated with service accounts for headless authentication | TC-ADMIN-046 |

---
