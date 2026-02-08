# API Key Management System

**Status:** Complete
**Priority:** High
**Created:** 2026-02-08
**Files:** See per-phase file lists

---

## Context

External systems need programmatic access to API endpoints. The current auth system only supports JWT Bearer tokens from interactive user login. There is no API key mechanism, no service account concept, and `passwordHash` is NOT NULL on the users table — meaning every identity must have a password. This task adds a full API key management system with service accounts, per-key permissions, secure key hashing, and both admin and self-service UI.

**Key design decisions:**
- API keys belong to users (regular or service accounts)
- Each key has its own permissions via `api_key_permissions` junction table
- At creation: non-admin users can only assign permissions they themselves have
- At runtime: only the key's own permissions are checked (not the owner's)
- Admin UI warns when a key has permissions its owner no longer has
- Service accounts: `accountType` column on users, nullable `passwordHash`, skip email verification
- Keys use `X-API-Key` header (not Bearer) for unambiguous auth
- SHA-256 hashing (not bcrypt — keys are 256-bit random, fast lookup needed on every request)
- Raw key shown ONCE at creation, never stored or retrievable

---

## Phases

### Phase 1: Database Schema

**Layer:** Database
**Files:**
- `apps/api/src/db/schema/users.ts` — make `passwordHash` nullable, add `accountType` column (varchar, default `'user'`)
- `apps/api/src/db/schema/api-keys.ts` (new) — `api_keys` table + `api_key_permissions` junction table
- `apps/api/src/db/schema/index.ts` — export new schema
- `apps/api/src/db/schema/audit.ts` — add audit actions: `API_KEY_CREATED`, `API_KEY_REVOKED`, `API_KEY_DELETED`, `API_KEY_PERMISSIONS_UPDATED`, `SERVICE_ACCOUNT_CREATED`, `SERVICE_ACCOUNT_DELETED`
- `apps/api/src/services/auth.service.ts` — guard service account login

**`api_keys` table:**
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, defaultRandom |
| user_id | uuid | FK → users.id CASCADE, NOT NULL |
| name | varchar(100) | NOT NULL |
| prefix | varchar(8) | NOT NULL (first 8 chars of raw key, for identification) |
| key_hash | varchar(255) | NOT NULL, UNIQUE (SHA-256 hex) |
| expires_at | timestamp | nullable (null = no expiration) |
| is_active | boolean | default true, NOT NULL |
| last_used_at | timestamp | nullable |
| created_at | timestamp | defaultNow, NOT NULL |
| updated_at | timestamp | defaultNow, NOT NULL |

**`api_key_permissions` junction table:**
| Column | Type | Constraints |
|--------|------|-------------|
| api_key_id | uuid | FK → api_keys.id CASCADE |
| permission_id | uuid | FK → permissions.id CASCADE |
| | | composite PK (api_key_id, permission_id) |

**`users` table changes:**
- `passwordHash`: change from `.notNull()` to nullable
- Add: `accountType: varchar('account_type', { length: 20 }).default('user').notNull()`
- Add `ACCOUNT_TYPES` const: `{ USER: 'user', SERVICE: 'service' } as const`

**Guard in `AuthService.login()`** (`apps/api/src/services/auth.service.ts`):
- Before `bcrypt.compare` (line 104), add check: if `user.accountType === 'service'` or `!user.passwordHash`, throw `'Service accounts cannot log in'`
- This prevents null `passwordHash` from reaching `bcrypt.compare()`

Then: `pnpm db:generate && pnpm db:migrate`

---

### Phase 2: Seed Data

**Layer:** Database
**Files:**
- `apps/api/src/db/seeds/permissions.ts` — add 8 new permissions + PERMISSIONS consts
- `apps/api/src/db/seeds/roles.ts` — add new permissions to Admin role

**New permissions:**
- `api_keys:read`, `api_keys:create`, `api_keys:update`, `api_keys:delete`
- `service_accounts:read`, `service_accounts:create`, `service_accounts:update`, `service_accounts:delete`

**New PERMISSIONS consts:**
- `API_KEYS_READ`, `API_KEYS_CREATE`, `API_KEYS_UPDATE`, `API_KEYS_DELETE`
- `SERVICE_ACCOUNTS_READ`, `SERVICE_ACCOUNTS_CREATE`, `SERVICE_ACCOUNTS_UPDATE`, `SERVICE_ACCOUNTS_DELETE`

Super Admin auto-inherits all (uses `Object.values(PERMISSIONS)`). Add api_keys + service_accounts permissions to Admin role array.

Then: `pnpm db:seed`

---

### Phase 3: Backend Services

**Layer:** Backend
**Files:**
- `apps/api/src/services/api-key.service.ts` (new)
- `apps/api/src/services/service-account.service.ts` (new)

**`ApiKeyService` methods:**
- `generateKey()` — private, returns `{ rawKey: 'fst_<64-hex-chars>', prefix: 'fst_a1b2', keyHash: '<sha256-hex>' }`. Uses `crypto.randomBytes(32)` for 256-bit key
- `hashKey(rawKey)` — static, SHA-256 for lookup
- `create(data, creatorId, creatorIsAdmin)` — validates permission subset (non-admin users can only assign permissions they have; admins can assign any permissions to service account keys), inserts key + junction rows, returns `Result<{ apiKey, rawKey }>`
- `validateKey(rawKey)` — hashes key, looks up by hash, checks isActive/expiresAt, loads key's permissions from junction table, updates lastUsedAt (fire-and-forget), returns `Result<{ apiKey, userId, permissions: Set<string> }>`
- `getById(id)` — returns key with permissions and `hasOrphanedPermissions` flag (compares key perms vs owner's current perms via `PermissionService`)
- `listByUser(userId)` — returns all keys for a user
- `listAll({ page, limit, userId?, isActive? })` — paginated admin list with owner email join
- `revoke(id)` — sets `isActive: false`
- `delete(id)` — hard delete from DB
- `setPermissions(apiKeyId, permissionIds, updaterId, updaterIsAdmin)` — validates subset, deletes existing junction rows, inserts new ones

**`ServiceAccountService` methods:**
- `create(email)` — inserts user with `accountType: 'service'`, `passwordHash: null`, `emailVerified: true`, `isActive: true`
- `list()` — queries users where `accountType = 'service'`
- `delete(id)` — verifies accountType is 'service', deletes user (cascade deletes all API keys)

---

### Phase 4: Auth Middleware

**Layer:** Backend
**Files:**
- `apps/api/src/middleware/auth.middleware.ts` — add X-API-Key handling + `req.apiKeyId`
- `apps/api/src/middleware/rateLimit.middleware.ts` — add `apiKeyRateLimiter`

**Middleware changes:**
- Extend `Express.Request` type: add `apiKeyId?: string`
- In `authenticate()`: check `req.headers['x-api-key']` FIRST. If present, call new `authenticateApiKey()` helper. Otherwise, fall through to existing JWT Bearer flow (unchanged)
- `authenticateApiKey(rawKey, req, res, next)`:
  1. Call `ApiKeyService.validateKey(rawKey)`
  2. Fetch owning user from DB, check `user.isActive`
  3. Populate `req.user` with key's permissions (NOT the user's role-based permissions)
  4. Set `req.apiKeyId = apiKey.id`
- `requirePermission()` works unchanged — it already reads from `req.user.permissions`

**Rate limiter:**
- Add `apiKeyRateLimiter`: 60 req/min, keyed by `req.apiKeyId || req.ip`

---

### Phase 5: Controller, Schemas, Routes

**Layer:** Backend
**Files:**
- `apps/api/src/schemas/api-key.schema.ts` (new)
- `apps/api/src/controllers/api-key.controller.ts` (new)
- `apps/api/src/routes/api-key.routes.ts` (new)
- `apps/api/src/routes/index.ts` — mount `/api-keys`

**Zod schemas:**
- `createApiKeySchema` — name (string 1-100), permissionIds (uuid[]), expiresAt (coerced date, optional), userId (uuid, optional — defaults to req.user.id)
- `updateApiKeyPermissionsSchema` — permissionIds (uuid[])
- `listApiKeysQuerySchema` — page, limit, userId?, isActive?
- `createServiceAccountSchema` — email (valid email)

**Routes (`/api/v1/api-keys`):**

| Method | Path | Auth | Permission | Handler |
|--------|------|------|------------|---------|
| GET | `/my` | authenticate | none (self-service) | listMy |
| POST | `/` | authenticate | `api_keys:create` | create |
| GET | `/` | authenticate | `api_keys:read` | list |
| GET | `/:id` | authenticate | `api_keys:read` | get |
| PUT | `/:id/permissions` | authenticate | `api_keys:update` | setPermissions |
| POST | `/:id/revoke` | authenticate | `api_keys:delete` | revoke |
| DELETE | `/:id` | authenticate | `api_keys:delete` | delete |
| GET | `/service-accounts` | authenticate | `service_accounts:read` | listServiceAccounts |
| POST | `/service-accounts` | authenticate | `service_accounts:create` | createServiceAccount |
| DELETE | `/service-accounts/:id` | authenticate | `service_accounts:delete` | deleteServiceAccount |

**Route ordering:** `/my` and `/service-accounts` must come BEFORE `/:id` to avoid being swallowed by the param route.

---

### Phase 6: Frontend Types, API Client, Hooks

**Layer:** Frontend
**Files:**
- `apps/web/src/types/api-key.ts` (new) — `ApiKey`, `CreateApiKeyInput`, `CreateApiKeyResponse`, `ServiceAccount` types
- `apps/web/src/api/api-keys.api.ts` (new) — API client functions (follows `roles.api.ts` pattern)
- `apps/web/src/hooks/useApiKeys.ts` (new) — TanStack Query hooks (follows `useRoles.ts` pattern)

**Hooks to create:**
- `useMyApiKeys()`, `useApiKeys(params)`, `useApiKey(id)`
- `useCreateApiKey()`, `useRevokeApiKey()`, `useDeleteApiKey()`, `useSetApiKeyPermissions()`
- `useServiceAccounts()`, `useCreateServiceAccount()`, `useDeleteServiceAccount()`

---

### Phase 7: Frontend UI

**Layer:** Frontend
**Files:**
- `apps/web/src/pages/admin/ApiKeysPage.tsx` (new)
- `apps/web/src/pages/admin/ServiceAccountsPage.tsx` (new)
- `apps/web/src/pages/ProfilePage.tsx` — add API Keys card section
- `apps/web/src/App.tsx` — add routes
- `apps/web/src/components/layout/Sidebar.tsx` — add nav items (VpnKey, ManageAccounts icons)
- `apps/web/src/components/AdminRoute.tsx` — add new permissions
- `apps/web/src/types/role.ts` — add new permission consts

**ApiKeysPage.tsx (admin):**
- Table: name, prefix (`fst_a1b2...`), owner email, status chip (active/revoked/expired), permission chips, lastUsedAt, actions
- Warning icon (amber) on rows where `hasOrphanedPermissions` is true — tooltip: "This key has permissions its owner no longer has"
- Create dialog: name field, user selector dropdown, expiration date picker (optional), permission checkboxes grouped by resource (Accordion pattern from RolesPage)
- **One-time key display dialog:** after creation, show raw key in monospace TextField with Copy button and warning: "This key will not be shown again. Store it securely."
- Revoke and delete confirmation dialogs
- Edit permissions dialog

**ServiceAccountsPage.tsx (admin):**
- Table: email, status, API key count, createdAt, actions
- Create dialog: email field
- Delete confirmation dialog
- Link to ApiKeysPage filtered by userId

**ProfilePage.tsx (user self-service):**
- New "API Keys" card below "Change Password"
- Table of user's own keys (name, prefix, status, lastUsedAt)
- Create Key button + dialog (userId locked to self, permissions limited to user's own)
- Revoke button per key
- Same one-time key display after creation

**Navigation:**
- Sidebar: "API Keys" (VpnKey icon) and "Service Accounts" (ManageAccounts icon) in admin section
- Gated by `api_keys:read` and `service_accounts:read` permissions

---

### Phase 8: Tests

**Layer:** Backend
**Files:**
- `apps/api/src/services/api-key.service.test.ts` (new)
- `apps/api/src/middleware/auth.middleware.test.ts` (update existing)

**Service tests:**
- Key generation format (prefix starts with `fst_`, hash is 64-char hex)
- Create with valid permission subset succeeds
- Create with excess permissions fails for non-admin
- Create for service account by admin with any permissions succeeds
- validateKey returns correct permissions for valid key
- validateKey rejects revoked key
- validateKey rejects expired key
- revoke sets isActive false
- setPermissions enforces subset constraint

**Middleware tests:**
- X-API-Key header populates req.user and req.apiKeyId
- JWT Bearer still works unchanged (regression)
- Invalid API key returns 401
- Revoked API key returns 401
- Expired API key returns 401
- Deactivated owner's API key returns 403

---

## Phase Dependency Order

```
Phase 1 (Schema) → Phase 2 (Seed) → Phase 3 (Services) → Phase 4 (Middleware) → Phase 5 (Routes)
                                                                                 ↓
                                                                          Phase 6 (Frontend client)
                                                                                 ↓
                                                                          Phase 7 (Frontend UI)
                                                                                 ↓
                                                                          Phase 8 (Tests — can also run parallel with 6-7)
```

---

## Files Summary

**New (13):**
- `apps/api/src/db/schema/api-keys.ts`
- `apps/api/src/services/api-key.service.ts`
- `apps/api/src/services/service-account.service.ts`
- `apps/api/src/schemas/api-key.schema.ts`
- `apps/api/src/controllers/api-key.controller.ts`
- `apps/api/src/routes/api-key.routes.ts`
- `apps/web/src/types/api-key.ts`
- `apps/web/src/api/api-keys.api.ts`
- `apps/web/src/hooks/useApiKeys.ts`
- `apps/web/src/pages/admin/ApiKeysPage.tsx`
- `apps/web/src/pages/admin/ServiceAccountsPage.tsx`
- `apps/api/src/services/api-key.service.test.ts`
- `apps/api/src/middleware/auth.middleware.test.ts` (may update existing)

**Modified (14):**
- `apps/api/src/db/schema/users.ts`
- `apps/api/src/db/schema/index.ts`
- `apps/api/src/db/schema/audit.ts`
- `apps/api/src/db/seeds/permissions.ts`
- `apps/api/src/db/seeds/roles.ts`
- `apps/api/src/services/auth.service.ts` (guard service account login)
- `apps/api/src/middleware/auth.middleware.ts`
- `apps/api/src/middleware/rateLimit.middleware.ts`
- `apps/api/src/routes/index.ts`
- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/AdminRoute.tsx`
- `apps/web/src/types/role.ts`

---

## Verification

After each phase: `pnpm build && pnpm lint && pnpm test`

After Phase 1: `pnpm db:generate && pnpm db:migrate`
After Phase 2: `pnpm db:seed`

After all phases:
```bash
pnpm docker:reset && pnpm docker:up && pnpm db:migrate && pnpm db:seed
pnpm build && pnpm lint && pnpm test
```

Manual verification:
- Create a service account via admin UI
- Create an API key for that service account with specific permissions
- Copy the raw key from the one-time display
- Call a protected endpoint with `X-API-Key: <raw-key>` header — verify access granted
- Call an endpoint the key lacks permission for — verify 403
- Revoke the key — verify subsequent calls return 401
- Create a key as a regular user — verify only own permissions are available to assign
- Verify admin warning badge shows when key has orphaned permissions
