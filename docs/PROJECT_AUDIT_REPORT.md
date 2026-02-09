# Fullstack Template — Comprehensive Audit Report

> Date: 2026-02-08
> Scope: Full codebase review (backend, frontend, database, infrastructure) + industry feature/security research

---

## Executive Summary

This audit reviewed all 128+ source files across the backend, frontend, and shared packages. Six parallel deep-dive analyses covered: backend code, frontend code, database layer, infrastructure/config, security standards research, and feature gap analysis against modern SaaS templates.

**Headline findings:**

| Severity | Count | Key Themes |
|----------|-------|------------|
| Critical | 7 | SQL logic bug causing data corruption, JWT token type confusion, TOTP secrets in plaintext, race conditions, vulnerable dependencies |
| High | 15 | CORS misconfiguration, refresh tokens in plaintext, sessions not invalidated on password reset, N+1 queries, token refresh race condition, no CI/CD |
| Medium | 25+ | Missing rate limiting, unused feature flags, password policy inconsistencies, no graceful shutdown, weak test coverage |
| Low | 30+ | Dead code, accessibility gaps, missing indexes, inconsistent patterns |

The template has a **strong architectural foundation** — the 4-layer pattern, Result type, Zod validation, RBAC, and structured logging are all well-implemented. The critical issues are concentrated in **JWT security**, **one SQL operator bug**, and **token storage**.

---

## Part 1: Critical & High Severity Issues

### CRITICAL-1: JavaScript `&&` Instead of Drizzle `and()` — Data Corruption Bug

**File:** `apps/api/src/services/role.service.ts:356-361`

```typescript
await db.delete(rolePermissions).where(
  eq(rolePermissions.roleId, roleId) &&
    inArray(rolePermissions.permissionId, permissionIds)
);
```

JavaScript's `&&` returns the last truthy operand, so the `roleId` condition is **silently dropped**. This deletes the specified permissions from **ALL roles**, not just the target role.

**Fix:** Replace `&&` with `and()`:
```typescript
.where(and(eq(rolePermissions.roleId, roleId), inArray(rolePermissions.permissionId, permissionIds)))
```

---

### CRITICAL-2: JWT Access/Refresh Tokens Are Interchangeable

**File:** `apps/api/src/lib/jwt.ts:13-31`

Both token types use the same `JWT_SECRET` with identical payload structures. The only difference is `expiresIn`. A refresh token (7-day lifetime) can be used as an access token in the `Authorization` header. The MFA temp token (with `purpose: 'mfa'`) is similarly interchangeable since `verifyAccessToken` doesn't check for a `purpose` field.

**Fix:** Add a `type` claim to all tokens (`access`, `refresh`, `mfa`) and validate it in each verify function. Alternatively, use separate signing secrets.

---

### CRITICAL-3: TOTP Secrets Stored in Plaintext

**File:** `apps/api/src/db/schema/user-mfa-methods.ts:26-29`

The TOTP secret is stored as plaintext in the `config` JSONB column. Backup codes are properly bcrypt-hashed, but the TOTP secret is not encrypted. A database breach exposes all TOTP secrets, completely bypassing MFA.

**Fix:** Encrypt TOTP secrets at rest using an application-level encryption key (AES-256-GCM).

---

### CRITICAL-4: Race Condition on User Registration

**File:** `apps/api/src/services/auth.service.ts:66-100`

The email uniqueness check (`SELECT`) happens outside the transaction that creates the user. Two concurrent registrations for the same email can both pass the check. The unique constraint prevents duplicates but produces a 500 error instead of a clean "Email already exists" message.

**Fix:** Move the existence check inside the transaction, or handle the unique constraint violation explicitly.

---

### CRITICAL-5: Token Refresh Race Condition (Frontend)

**File:** `apps/web/src/api/client.ts:48-72`

When multiple API requests hit 401 simultaneously, each independently calls `/auth/refresh`. With refresh token rotation, all but the first will fail (the old token is already invalidated), causing an unexpected logout.

**Fix:** Implement a mutex/queue pattern where concurrent 401s wait behind a single refresh attempt.

---

### CRITICAL-6: Vulnerable Dependencies

`pnpm audit` reveals:
- **CRITICAL:** `vitest@2.1.8` — Remote Code Execution (needs >= 2.1.9)
- **HIGH:** `qs@6.13.0` (via `express@4.21.2`) — DoS via memory exhaustion
- **HIGH:** `@remix-run/router@1.21.0` (via `react-router-dom@6.28.0`) — XSS via open redirects
- **HIGH:** `tar@6.2.1` (via `bcrypt`) — Arbitrary file overwrite (3 CVEs)

**Fix:** Update dependencies. `vitest` and `react-router-dom` are direct dependencies. `qs` and `tar` require upstream updates.

---

### CRITICAL-7: Tokens Stored in localStorage (XSS-Vulnerable)

**File:** `apps/web/src/stores/auth.store.ts:80-88`

Both access and refresh tokens are persisted to `localStorage` via Zustand's `persist` middleware. Any XSS vulnerability exposes both tokens. The refresh token (7-day lifetime) is especially dangerous.

**Fix:** Store refresh tokens in `httpOnly` cookies (set by the server). Keep access tokens in memory only.

---

### HIGH-1: CORS Misconfigured for Both Dev and Production

**File:** `apps/api/src/app.ts:27-32`

```typescript
cors({ origin: config.NODE_ENV === 'development' ? '*' : undefined, credentials: true })
```

- Dev: `origin: '*'` with `credentials: true` is **invalid per the CORS spec** — browsers block this combination
- Production: `origin: undefined` means no `Access-Control-Allow-Origin` header, blocking all cross-origin requests

**Fix:** Use `config.FRONTEND_URL` as the allowed origin in both environments.

---

### HIGH-2: Refresh Tokens Stored in Plaintext in Database

**File:** `apps/api/src/services/auth.service.ts:307-314`

The JWT refresh token is stored verbatim in `sessions.refreshToken`. API keys are SHA-256 hashed before storage, but refresh tokens are not.

**Fix:** Store only a hash of the refresh token.

---

### HIGH-3: Password Reset/Change Don't Invalidate Sessions

**Files:** `apps/api/src/services/account.service.ts:147-181`, `apps/api/src/services/user.service.ts:50-77`

After a password reset or change, all existing sessions and refresh tokens remain valid. An attacker with a stolen session retains access even after the user resets their password.

**Fix:** Delete all sessions for the user as part of the password reset/change operation.

---

### HIGH-4: N+1 Query Patterns in 5 Services

**Files:**
- `role.service.ts:62-87` — `getAllWithPermissions`: 1 + N queries
- `user-role.service.ts:163-196` — `getAllUsersWithRoles`: 1 + N queries
- `api-key.service.ts:236-262` — `listByUser`: 1 + N queries
- `api-key.service.ts:289-322` — `listAll`: 1 + N queries
- `service-account.service.ts:58-85` — `list`: 1 + N queries

**Fix:** Use JOIN queries or batch fetches with `inArray()`.

---

### HIGH-5: No Expired Data Cleanup

Sessions, email verification tokens, and password reset tokens accumulate forever. No background job or cron purges expired rows.

**Fix:** Add a periodic cleanup job (the jobs infrastructure already exists).

---

### HIGH-6: `updatedAt` Never Auto-Updates

All `updatedAt` columns rely on manual `.set({ updatedAt: new Date() })` in every update. Multiple code paths miss it (account lockout, login timestamp, etc.).

**Fix:** Add a PostgreSQL trigger: `BEFORE UPDATE SET NEW.updated_at = NOW()`.

---

### HIGH-7: No CI/CD Pipeline

No `Dockerfile`, no `.github/workflows/`. No automated testing, linting, build verification, or deployment pipeline.

---

### HIGH-8: Seed Script Logs Admin Password

**File:** `apps/api/src/db/seeds/run-seed.ts:208`

```typescript
logger.warn(`Default password is: ${DEFAULT_ADMIN_PASSWORD}`);
```

Hardcoded `Admin123!` is logged to console/CloudWatch.

---

### HIGH-9: State Updates During Render (React Anti-Pattern)

Three components call `setState` during the render phase:
- `ProtectedRoute.tsx:15` — `setIntendedDestination()`
- `UsersPage.tsx:140` — `setSelectedRoles()`
- `SettingsPage.tsx:61` — `setActiveTab()`

**Fix:** Move to `useEffect` hooks.

---

### HIGH-10: Login Navigation Conflict

Both `useLogin` hook (navigates to `/`) and `LoginPage` (navigates to `intendedDestination || '/home'`) fire on success. Double navigation, flash of wrong page.

**Fix:** Remove hardcoded navigation from the hook; let the caller decide.

---

### HIGH-11: `SettingCard` Reset Logic Is Dead Code

**File:** `apps/web/src/pages/admin/SettingsPage.tsx:143-149`

The condition `setting.value !== localValue && !hasChanges` is a logical contradiction (always `false`). Local values never reset after server-side updates.

---

### HIGH-12: Resend Verification Calls Wrong API

**File:** `apps/web/src/pages/LoginPage.tsx:58-66`

"Resend verification email" calls `accountApi.forgotPassword` (sends a password reset email) instead of `accountApi.resendVerification`.

---

### HIGH-13: `.env.example` Doesn't Match Config Schema

- `.env.example` has `JWT_EXPIRES_IN` but config expects `JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN`
- Missing `EMAIL_PROVIDER`, `SMTP_*` variables from the example

---

### HIGH-14: `useLogout` Closes Over Stale Token + Double Logout

**File:** `apps/web/src/hooks/useAuth.ts:50-67`

The `refreshToken` is captured at render time and may be stale when `mutate()` is called. Additionally, `clearAuth()` is called both in the hook's `onSettled` and in `TopNav`'s `onSuccess`.

---

### HIGH-15: No Global API Rate Limiter

The `apiRateLimiter` (100 req/min) is defined but never applied. Only auth-specific endpoints have rate limiting. All admin/user/role/session/API-key endpoints are unprotected.

---

## Part 2: Medium Severity Issues

### Security
- ~~**Password validation inconsistency**: Registration requires uppercase + number, but password reset (`account.schema.ts:12`) and change (`user.schema.ts:9`) only require 8 chars~~
- **Password policy violates NIST 800-63B Rev 4**: Composition rules (uppercase, number) are explicitly discouraged by NIST. Should use minimum length + breached password checking instead
- ~~**`optionalAuth` middleware ignores API keys**: Only checks Bearer JWT, silently ignores `X-API-Key`~~
- ~~**API key creation allows non-admin user assignment**: `api-key.service.ts:80-86` — `userId` override not restricted to admins~~
- ~~**No `trust proxy` configuration**: `req.ip` behind a load balancer returns the proxy's IP, breaking rate limiting~~
- ~~**10MB JSON body limit**: Excessive for an API handling small payloads; enables DoS~~
- ~~**No database SSL configuration**: `lib/db.ts` has no `ssl` option for production~~
- ~~**Timestamps without timezone**: All `timestamp()` columns use `WITHOUT TIME ZONE`, risking misinterpretation across timezones~~
- ~~**Email HTML templates use unescaped interpolation**: Safe today (hex tokens) but fragile if token format changes~~

### Functionality
- ~~**`feature.registration_enabled` setting is never checked**: Registration can't be disabled~~
- ~~**`feature.email_verification_required` setting is never checked**: Setting exists but isn't used~~
- ~~**`app.maintenance_mode` setting is never checked**: No middleware reads it~~
- ~~**`sortBy` query parameter not validated against allowlist at schema level**~~
- ~~**`SettingsController.get` fetches ALL settings to find one**: Should query by key directly~~
- ~~**No UUID validation on `:id` path parameters** for most admin routes~~
- ~~**Permission cache not invalidated when `isAdmin` changes**~~
- ~~**`UserRoleService.getAllUsersWithRoles()` has no pagination** — fetches ALL users~~
- ~~**`ServiceAccountService.list()` has no pagination**~~
- ~~**`usePermissions` name collision**: Both `usePermission.ts` and `useRoles.ts` export `usePermissions` with different semantics~~

### Frontend
- ~~**No debounce on user search** in `UsersPage.tsx` — fires API request per keystroke~~
- ~~**`response.json()` called without checking Content-Type** in `client.ts` — non-JSON responses throw `SyntaxError`~~
- ~~**`apiFetch` always sets `Content-Type: application/json`** — prevents file uploads~~
- ~~**`AdminRoute` doesn't save `intendedDestination`** before redirect to login~~
- ~~**`useTheme` returns stale `toggleTheme` function** — not in `useMemo` deps~~
- ~~**TopNav theme toggle ignores "system" mode** — always shows binary dark/light~~
- ~~**`useRegister` marks user as authenticated before email verification**~~
- ~~**No error boundary at route level** — any page error replaces the entire UI~~
- ~~**`ErrorBoundary` "Try Again" doesn't navigate away** — deterministic errors cause a loop~~

### Database
- ~~**Redundant index on `api_keys.key_hash`** — already has unique constraint~~
- ~~**Missing index on `audit_logs.action`**~~
- ~~**Missing index on `sessions.expiresAt`**~~
- ~~**Missing composite unique constraint on `permissions(resource, action)`**~~
- ~~**No `CHECK` constraint on `users.accountType`**~~
- ~~**`audit_logs.details` uses VARCHAR(1000)** — should be TEXT~~
- ~~**Seed script not wrapped in a transaction**~~

---

## Part 3: Low Severity Issues

- ~~No audit logging for login success/failure, password changes, session revocations, or MFA events (all `AUDIT_ACTIONS` are defined but unused)~~
- ~~No graceful server shutdown (SIGTERM/SIGINT handlers)~~
- ~~Inconsistent error message matching in controllers (string matching vs error codes)~~
- ~~`pino-pretty` is a production dependency (should be devDependency)~~
- ~~Compiled `.js`/`.d.ts` artifacts in `test/utils/` not gitignored~~
- ~~Test files compiled into production `dist/` (tsconfig includes `*.test.ts`)~~
- ~~No React ESLint plugins (`eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`)~~
- ~~No code splitting / lazy loading for routes (entire admin bundle downloaded for non-admin users)~~
- ~~Hardcoded "App Name" and "v0.1.0" scattered across frontend~~
- ~~Missing `aria-label` on multiple interactive elements~~
- ~~`LoadingSpinner` props spread overwrites merged `sx`~~
- ~~`Header` component is unused dead code~~
- ~~Dual export pattern (named + default) inconsistency across pages~~
- ~~`ProfilePage` is ~715 lines with 14 useState hooks — needs decomposition~~
- ~~`UserPreferences` type duplicated between store and API~~
- ~~Drizzle config reads from compiled JS (fragile coupling)~~
- ~~Swagger docs hardcoded to localhost~~
- ~~No `engines` enforcement (`.npmrc` with `engine-strict=true`)~~
- ~~Dependency version pinning inconsistent (mix of `^` and exact)~~
- Migrations not reversible (no DOWN scripts)

---

## Part 4: Security Assessment (vs. Industry Standards)

### What the Template Does Well

| Area | Implementation | Rating |
|------|---------------|--------|
| Password hashing | bcrypt with 12 rounds | **Strong** |
| Input validation | Zod schemas at middleware layer | **Strong** |
| SQL injection prevention | Drizzle ORM parameterized queries | **Strong** |
| Error handling | Result pattern prevents unhandled throws | **Strong** |
| Config validation | Zod-validated env vars at startup | **Strong** |
| Rate limiting (auth) | Tiered per-endpoint limits | **Good** |
| Account lockout | Integrated lockout service | **Good** |
| MFA | TOTP support with temp token flow | **Good** |
| Token rotation | Refresh tokens rotated on use | **Good** |
| Security headers | Helmet with defaults | **Good** |
| RBAC | Permission middleware with caching | **Good** |
| Request ID tracking | Per-request correlation IDs | **Good** |

### Gaps vs. Security Standards

| Standard | Requirement | Template Status |
|----------|-------------|-----------------|
| **OWASP API #1** (BOLA) | Object-level authorization | Per-endpoint; no framework-level enforcement |
| **OWASP Top 10 #3** (Supply Chain) | Dependency scanning in CI | No CI/CD at all |
| **NIST 800-63B Rev 4** | No composition rules, breach checking | Violates: requires uppercase+number |
| **JWT Best Practices** | Separate keys per token type, algorithm enforcement | Same secret, no algorithm restriction |
| **OWASP Session Mgmt** | HttpOnly cookie for refresh tokens | localStorage (XSS-vulnerable) |
| **RFC 9700** (OAuth BCP) | Refresh token replay detection | Not implemented |
| **Express Security** | `trust proxy` for reverse proxy deployments | Not configured |
| **PostgreSQL Security** | TLS for client connections | No SSL config |
| **CSP** | Customized Content-Security-Policy | Helmet default only |

---

## Part 5: Feature Gap Analysis

### Core Features — Current vs. Expected

| Feature | Status | Gap |
|---------|--------|-----|
| Email/password auth | **Complete** | — |
| Social OAuth login | **Missing** | Google/GitHub OAuth is expected baseline |
| Magic link / passwordless | **Missing** | Increasingly expected |
| MFA (TOTP) | **Complete** | — |
| Session management | **Complete** | — |
| RBAC | **Complete** | — |
| Password reset | **Complete** | — |
| Account lockout | **Complete** | — |
| Email verification | **Complete** | — |
| User profile CRUD | **Complete** | — |
| Admin user management | **Complete** | — |
| API key management | **Complete** | — |
| RESTful API with docs | **Complete** | OpenAPI/Swagger at `/api/docs` |
| Request validation | **Complete** | Zod v4 |
| Rate limiting | **Partial** | Auth only; global limiter defined but unused |
| Pagination/filtering/sorting | **Complete** | — |
| Response compression | **Complete** | gzip/brotli |
| Database + ORM + migrations | **Complete** | Drizzle + PostgreSQL |
| Component library | **Complete** | Material UI 6 |
| State management | **Complete** | Zustand + TanStack Query |
| Dark mode | **Complete** | System/light/dark |
| Docker Compose | **Complete** | PostgreSQL + MinIO |
| CI/CD pipeline | **Missing** | No GitHub Actions |
| Dockerfile | **Missing** | No containerized deployment |
| Security headers | **Complete** | Helmet |
| Structured logging | **Complete** | Pino |
| Error tracking | **Missing** | No Sentry integration |
| Health endpoints | **Complete** | `/health` |
| Unit tests | **Partial** | 5/15 services tested; 0 frontend components |
| Integration tests | **Complete** | Auth + admin flows |
| E2E tests | **Missing** | No Playwright/Cypress |

### High-Impact Missing Features (Differentiators)

| Feature | Impact | Complexity | Recommendation |
|---------|--------|------------|----------------|
| **Social OAuth** (Google/GitHub) | Very High | Medium | Should be next auth feature — most users expect it |
| **Background job queue** (BullMQ + Redis) | High | Medium | Needed for email, cleanup, async processing |
| **Billing/Subscriptions** (Stripe) | Very High | Medium-High | The #1 differentiator for SaaS templates |
| **Multi-tenancy** (teams/orgs) | Very High | High | Critical for B2B SaaS |
| ~~**Notification system** (in-app + email)~~ | ~~High~~ | ~~Medium~~ | ~~In-app notification center with preferences~~ |
| **File upload pipeline** (presigned URLs) | High | Medium | S3/MinIO infrastructure already exists |
| **i18n** | Medium-High | Medium | Must be built in early — painful to retrofit |
| **Feature flags** (advanced) | Medium-High | Low-Medium | DB-backed flags exist; need user targeting + percentage rollout |
| **Outbound webhooks** | Medium-High | Medium | Standard SaaS integration pattern |
| **Full-text search** | Medium | Low | PostgreSQL FTS requires no extra infrastructure |
| ~~**Real-time** (WebSocket/SSE)~~ | ~~High~~ | ~~Medium-High~~ | ~~Live notifications, collaborative features~~ |
| **AI integration patterns** | Very High | Medium-High | Fastest-growing category; LLM wrapper + streaming |

---

## Part 6: Prioritized Action Plan

### Tier 1 — Fix Before Any Production Use (Critical Security + Data Integrity)

1. ~~**Fix `&&` vs `and()` bug** in `role.service.ts` — active data corruption risk~~
2. ~~**Add JWT token type discrimination** — prevents refresh/MFA tokens being used as access tokens~~
3. ~~**Encrypt TOTP secrets at rest** — plaintext MFA secrets defeat the purpose of MFA~~
4. ~~**Fix CORS configuration** — currently broken in both dev and production~~
5. ~~**Update vulnerable dependencies** — RCE in vitest, XSS in react-router-dom~~
6. ~~**Add token refresh mutex** (frontend) — prevents unexpected logouts~~
7. ~~**Move refresh tokens to httpOnly cookies** — eliminates XSS token theft~~

### Tier 2 — Critical for Production Readiness

8. ~~Hash refresh tokens before database storage~~
9. ~~Invalidate all sessions on password reset/change~~
10. ~~Apply global API rate limiter~~
11. ~~Add graceful server shutdown handler~~
12. ~~Add expired session/token cleanup job~~
13. ~~Create Dockerfile and GitHub Actions CI/CD pipeline~~
14. ~~Fix `.env.example` to match config schema~~
15. ~~Add `trust proxy` configuration~~
16. ~~Reduce JSON body limit to 1MB~~

### Tier 3 — Important Quality Improvements

17. ~~Fix all state-updates-during-render (React anti-pattern)~~
18. ~~Fix login navigation conflict and double-logout~~
19. ~~Resolve N+1 query patterns across 5 services~~
20. ~~Add missing audit logging (login, password change, session, MFA events)~~
21. ~~Wire up unused feature flags (registration, email verification, maintenance mode)~~
22. ~~Apply consistent password validation across all schemas~~
23. ~~Add database SSL configuration for production~~
24. ~~Use `timestamp({ withTimezone: true })` in schema~~
25. ~~Add `updatedAt` database trigger~~
26. ~~Increase test coverage (10/15 services untested, 0 frontend component tests)~~

### Tier 4 — Feature Additions (Next Milestone)

27. Social OAuth (Google, GitHub)
28. ~~Background job queue (BullMQ + Redis) — implemented with pg-boss (PostgreSQL-backed)~~
29. Stripe billing integration
30. ~~In-app notification system~~
31. File upload pipeline with presigned URLs
32. E2E test suite (Playwright)
33. Sentry error tracking integration

---

## Appendix: Files Reviewed

- **Backend:** 76 source files across `controllers/`, `services/`, `routes/`, `middleware/`, `providers/`, `jobs/`, `lib/`, `config/`, `db/schema/`, `db/seeds/`, `schemas/`
- **Frontend:** 52 source files across `components/`, `pages/`, `hooks/`, `api/`, `stores/`, `styles/`, `lib/`, `types/`
- **Infrastructure:** `package.json` (4), `tsconfig.json` (4), `docker-compose.yml`, `drizzle.config.ts`, `vitest.config.ts` (2), `eslint.config.js`, `.env.example`, `.gitignore`
- **Tests:** 19 test files (backend), 2 test files (frontend), 2 integration test files
- **External Research:** OWASP Top 10 2025, OWASP API Security Top 10, NIST 800-63B Rev 4, RFC 9700, 40+ industry sources on SaaS boilerplate features and security standards
