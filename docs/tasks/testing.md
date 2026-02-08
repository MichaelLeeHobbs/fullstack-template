# Testing — High Priority

**Status:** Draft
**Priority:** High
**Created:** 2026-02-08
**Files:** See per-phase file lists

---

## Context

The project has 60 test cases across 9 files (~10% coverage). Backend has tests for JWT utilities, admin middleware, auth schemas, and 4 services (account, audit, email, storage). Frontend has tests for 2 Zustand stores (auth, theme). The core auth service, all controllers, most middleware, all frontend components/pages/hooks, and all integration tests are missing. Test infrastructure exists (Vitest, jsdom, Testing Library) but has no shared test utilities or factories. The backend test setup file (`apps/api/test/setup.ts`) is empty.

**Current test inventory:**
- `apps/api/src/lib/jwt.test.ts` — 8 tests (JWT sign/verify)
- `apps/api/src/middleware/admin.middleware.test.ts` — 3 tests (admin guard)
- `apps/api/src/schemas/auth.schema.test.ts` — 10 tests (Zod schemas)
- `apps/api/src/services/account.service.test.ts` — 9 tests (verification, password reset)
- `apps/api/src/services/audit.service.test.ts` — 5 tests (audit logging)
- `apps/api/src/services/email.service.test.ts` — 5 tests (email sending)
- `apps/api/src/services/storage.service.test.ts` — 6 tests (S3 operations)
- `apps/web/src/stores/auth.store.test.ts` — 8 tests (auth state)
- `apps/web/src/stores/theme.store.test.ts` — 4 tests (theme state)

---

## Phases

### Phase 1: Test Utilities and Factories

**Layer:** Backend
**Files:**
- `apps/api/test/setup.ts`
- `apps/api/test/utils/mock-db.ts` (new)
- `apps/api/test/utils/mock-express.ts` (new)
- `apps/api/test/utils/factories.ts` (new)
- `apps/api/test/utils/index.ts` (new)

**Test setup (`test/setup.ts`):**
- Currently empty — add global mocks that apply to all tests:
  - Mock `../lib/logger.js` globally (every test file currently mocks it individually)
  - Set `process.env.JWT_SECRET` and other required env vars for test mode

**Database mock helper (`test/utils/mock-db.ts`):**
- Extract the chainable mock pattern used in `account.service.test.ts` into a reusable helper
- Provide `createMockDb()` that returns a mock `db` object with chainable `select().from().where()`, `insert().values().returning()`, `update().set().where()`, `delete().where()`
- Each chain method returns `vi.fn()` so tests can configure return values and assert calls

**Express mock helper (`test/utils/mock-express.ts`):**
- Extract the pattern from `admin.middleware.test.ts` into reusable `createMockRequest(overrides?)` and `createMockResponse()` factories
- `createMockRequest()` returns a partial `Request` with configurable `headers`, `body`, `params`, `query`, `user`, `ip`
- `createMockResponse()` returns a mock `Response` with `status().json()` chain, `setHeader()`, and assertion helpers

**Data factories (`test/utils/factories.ts`):**
- `createTestUser(overrides?)` — returns a valid user object with defaults (random UUID, email, hashed password, `isActive: true`, `emailVerified: true`, etc.)
- `createTestSession(overrides?)` — returns a valid session object
- `createTestRole(overrides?)` — returns a valid role object
- Factories use sensible defaults but allow any field to be overridden

---

### Phase 2: Auth Service Tests

**Layer:** Backend
**Files:**
- `apps/api/src/services/auth.service.test.ts` (new)

**Test cases for `AuthService`:**

`register()`:
- Should create user with hashed password and return tokens
- Should return error if email already exists (unique constraint)
- Should create email verification token
- Should audit log the registration

`login()`:
- Should return tokens for valid credentials
- Should return error for invalid email (user not found)
- Should return error for invalid password (bcrypt mismatch)
- Should return error if email not verified (`emailVerified: false`)
- Should return error if account deactivated (`isActive: false`)
- Should update `lastLoginAt` timestamp on success
- Should audit log successful and failed logins

`refresh()`:
- Should return new tokens for valid refresh token
- Should return error for expired refresh token
- Should return error for invalid/missing session
- Should delete old session and create new one (token rotation)

`logout()`:
- Should delete session by refresh token
- Should not error if session doesn't exist

`getCurrentUser()`:
- Should return user data for valid user ID
- Should return error if user not found

**Mocking strategy:**
- Use `test/utils/mock-db.ts` for database operations
- Mock `bcrypt.hash()` and `bcrypt.compare()`
- Mock `jwt.ts` functions (`signAccessToken`, `signRefreshToken`)
- Mock `email.service.ts` for verification email
- Mock `audit.service.ts` for audit logging
- All return values validated against `Result<T>` pattern (`result.ok`, `result.value`, `result.error`)

---

### Phase 3: Controller Tests

**Layer:** Backend
**Files:**
- `apps/api/src/controllers/auth.controller.test.ts` (new)
- `apps/api/src/controllers/account.controller.test.ts` (new)
- `apps/api/src/controllers/admin.controller.test.ts` (new)
- `apps/api/src/controllers/user.controller.test.ts` (new)
- `apps/api/src/controllers/role.controller.test.ts` (new)

**Pattern for all controller tests:**
- Mock the corresponding service module (`vi.mock('../services/auth.service.js')`)
- Use `createMockRequest()` and `createMockResponse()` from test utils
- Verify controllers call the correct service method with correct arguments
- Verify correct HTTP status codes for success and error cases
- Verify response body matches `{ success: true/false, data/error }` format
- Do NOT test validation (that's the schema/middleware's job)

**`AuthController` tests:**
- `register()`: calls `AuthService.register()`, returns 201 with tokens on success, 409 on duplicate email, 400 on validation error
- `login()`: calls `AuthService.login()`, returns 200 with tokens, 401 on bad credentials, 403 on unverified email
- `refresh()`: returns 200 with new tokens, 401 on invalid refresh token
- `logout()`: returns 200, handles missing refresh token
- `me()`: returns 200 with user data from `req.user`

**`AccountController` tests:**
- `forgotPassword()`: always returns 200 (prevents email enumeration)
- `resetPassword()`: returns 200 on success, 400 on invalid/expired token
- `verifyEmail()`: returns 200 on success, 400 on invalid token
- `resendVerification()`: returns 200, 400 if already verified

**`AdminController` tests:**
- `getUsers()`: returns paginated user list, validates pagination params
- `getUserById()`: returns 200 with user, 404 if not found
- `updateUser()`: returns 200 on success, 404 if not found
- `deleteUser()`: returns 200 on success, 404 if not found

**`UserController` tests:**
- `getProfile()`: returns current user profile
- `changePassword()`: returns 200 on success, 400 on wrong current password
- `getPreferences()` / `updatePreferences()`: get/set user preferences

**`RoleController` tests:**
- CRUD operations: create (201), read (200), update (200), delete (200/404)
- Permission assignment: set role permissions
- User role assignment: set user roles

---

### Phase 4: Integration Tests

**Layer:** Backend
**Files:**
- `apps/api/test/integration/auth.integration.test.ts` (new)
- `apps/api/test/integration/admin.integration.test.ts` (new)
- `apps/api/test/integration/setup.ts` (new)

**Integration test setup (`test/integration/setup.ts`):**
- Import the Express `app` from `src/app.ts`
- Use `supertest` for HTTP testing (install `supertest` and `@types/supertest`)
- Option A (mock DB): mock database at the `db` module level, test the full Express middleware chain
- Option B (real DB): use a test database with Docker — require `DATABASE_URL` pointing to a test database, run migrations before suite, truncate tables between tests
- Start with Option A (faster, no Docker dependency in CI) — can add Option B later

**Auth integration tests:**
- `POST /api/v1/auth/register` → 201 with tokens, 409 on duplicate
- `POST /api/v1/auth/login` → 200 with tokens, 401 on bad credentials
- `POST /api/v1/auth/refresh` → 200 with new tokens
- `POST /api/v1/auth/logout` → 200
- `GET /api/v1/auth/me` → 200 with user (with valid token), 401 without token
- Verify full middleware chain: rate limiting headers present, CORS headers, helmet headers

**Admin integration tests:**
- `GET /api/v1/admin/users` → 200 with pagination (with admin token), 401 without, 403 without permission
- Verify permission middleware blocks unauthorized access
- Verify pagination response shape: `{ success, data: { data: [], pagination: { page, limit, total, totalPages } } }`

**What these test that unit tests don't:**
- Middleware chain execution order
- Route parameter parsing
- Full request/response cycle through Express
- Header handling (Authorization, Content-Type)
- Error middleware catching thrown errors

---

## Phase Dependency Order

```
Phase 1 (Test Utilities) — do first, all other phases depend on it
Phase 2 (Auth Service) — depends on Phase 1
Phase 3 (Controllers) — depends on Phase 1, can run in parallel with Phase 2
Phase 4 (Integration) — depends on Phase 1, can run in parallel with Phases 2-3
```

---

## Verification

### After Phase 1
```bash
pnpm test:api    # Existing 48 tests still pass
pnpm build && pnpm lint
```

### After Phase 2
```bash
pnpm test:api    # ~65+ tests (48 existing + ~17 new auth service tests)
pnpm lint
```

### After Phase 3
```bash
pnpm test:api    # ~100+ tests (adding ~35+ controller tests)
pnpm lint
```

### After Phase 4
```bash
pnpm test:api    # ~115+ tests (adding ~15+ integration tests)
pnpm test:api -- --coverage  # Check coverage report
pnpm lint
```

### Final
```bash
pnpm test        # All tests pass (API + web)
pnpm build && pnpm lint
```
