# Future Auth Enhancements

**Status:** Draft
**Priority:** High
**Created:** 2026-02-08
**Files:** See per-phase file lists

---

## Context

The auth system has JWT-based login/registration, email verification, password reset, and IP-based rate limiting via `express-rate-limit`. However, it lacks account lockout after failed login attempts (only IP-level rate limiting exists), two-factor authentication, and a UI for users to view/manage their active sessions. The `sessions` table already stores refresh tokens with expiry but has no device metadata or user-facing management.

---

## Phases

### Phase 1: Account Lockout After Failed Attempts

**Layer:** Full Stack
**Files:**
- `apps/api/src/db/schema/users.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/services/account-lockout.service.ts` (new)
- `apps/api/src/controllers/auth.controller.ts`
- `apps/api/src/db/schema/index.ts`
- `apps/web/src/pages/LoginPage.tsx`
- `docs/architecture/DATA_MODEL.md`

**Database changes to `users` table:**
- Add `failedLoginAttempts` column (integer, default 0, NOT NULL)
- Add `lockedUntil` column (timestamp, nullable)

**Backend:**
- Create `AccountLockoutService` with methods:
  - `recordFailedAttempt(userId: string): Promise<Result<{ locked: boolean; attemptsRemaining: number }>>` — increments `failedLoginAttempts`, sets `lockedUntil` if threshold reached
  - `resetAttempts(userId: string): Promise<Result<void>>` — resets counter to 0 and clears `lockedUntil` on successful login
  - `isLocked(userId: string): Promise<Result<boolean>>` — checks if `lockedUntil` is in the future
  - `getConfig(): { maxAttempts: number; lockoutDurationMinutes: number }` — reads from `system_settings` table (keys: `security.max_login_attempts` default 5, `security.lockout_duration_minutes` default 15)
- Update `AuthService.login()`:
  - Before password check: call `AccountLockoutService.isLocked()`, return error if locked with remaining lockout time
  - On failed password: call `AccountLockoutService.recordFailedAttempt()`
  - On successful login: call `AccountLockoutService.resetAttempts()`
- Update `AuthController.login()` to return appropriate error messages:
  - Locked: `"Account temporarily locked. Try again in X minutes."` (status 429)
  - Failed with remaining attempts: `"Invalid credentials. X attempts remaining."` (status 401)
- Add audit log actions: `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`

**Seed data:**
- Add `system_settings` entries for `security.max_login_attempts` (default: 5) and `security.lockout_duration_minutes` (default: 15)

**Frontend:**
- Update `LoginPage.tsx` to display lockout message with countdown when login returns 429

**Best practices followed:**
- Lockout is per-account, not per-IP (complements existing IP rate limiting)
- Lockout duration is configurable via system settings (admin UI already exists)
- Successful login resets the counter
- Lockout auto-expires (no admin intervention required)
- Audit trail for lock/unlock events

---

### Phase 2: Two-Factor Authentication (2FA)

**Layer:** Full Stack
**Files:**
- `apps/api/src/db/schema/user-2fa.ts` (new)
- `apps/api/src/db/schema/index.ts`
- `apps/api/src/services/two-factor.service.ts` (new)
- `apps/api/src/controllers/two-factor.controller.ts` (new)
- `apps/api/src/routes/two-factor.routes.ts` (new)
- `apps/api/src/routes/index.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/controllers/auth.controller.ts`
- `apps/api/src/schemas/two-factor.schema.ts` (new)
- `apps/web/src/pages/TwoFactorSetupPage.tsx` (new)
- `apps/web/src/pages/TwoFactorVerifyPage.tsx` (new)
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/api/two-factor.api.ts` (new)
- `apps/web/src/hooks/useTwoFactor.ts` (new)
- `apps/web/src/stores/auth.store.ts`
- `apps/web/src/pages/ProfilePage.tsx`
- `docs/architecture/DATA_MODEL.md`

**Dependencies:** Install `otpauth` (TOTP library) and `qrcode` (QR code generation) in `apps/api`

**Database — new `user_2fa` table:**
- `id` (uuid, PK)
- `userId` (uuid, FK to users.id, CASCADE DELETE, UNIQUE)
- `secret` (varchar 255, NOT NULL) — encrypted TOTP secret
- `isEnabled` (boolean, default false)
- `backupCodes` (jsonb) — array of hashed backup codes
- `createdAt` (timestamp, default now())
- `updatedAt` (timestamp, default now())

**Backend — `TwoFactorService`:**
- `generateSecret(userId: string): Promise<Result<{ secret: string; qrCodeUrl: string }>>` — generates TOTP secret, returns QR code data URL, stores secret in DB with `isEnabled: false`
- `verifyAndEnable(userId: string, token: string): Promise<Result<{ backupCodes: string[] }>>` — verifies TOTP token against stored secret, sets `isEnabled: true`, generates and returns 10 backup codes
- `verify(userId: string, token: string): Promise<Result<boolean>>` — verifies TOTP token or backup code
- `disable(userId: string, token: string): Promise<Result<void>>` — verifies token then deletes 2FA record
- `regenerateBackupCodes(userId: string, token: string): Promise<Result<{ backupCodes: string[] }>>` — verifies token, generates fresh backup codes

**Backend — `TwoFactorController`:**
- `POST /api/v1/2fa/setup` — protected, calls `generateSecret()`, returns QR code
- `POST /api/v1/2fa/verify-setup` — protected, calls `verifyAndEnable()`, returns backup codes
- `POST /api/v1/2fa/verify` — public (during login), calls `verify()`
- `DELETE /api/v1/2fa` — protected, calls `disable()`
- `POST /api/v1/2fa/backup-codes` — protected, calls `regenerateBackupCodes()`

**Login flow changes:**
- `AuthService.login()`: after password verification, check if user has 2FA enabled
  - If 2FA enabled: return `{ requires2FA: true, tempToken: string }` instead of full auth tokens. The `tempToken` is a short-lived JWT (5 min) with `{ userId, purpose: '2fa' }`
  - If 2FA not enabled: return tokens as usual
- New `AuthService.verifyLoginWith2FA(tempToken: string, totpCode: string)`:
  - Verify `tempToken`, verify TOTP code, then issue full auth tokens
- `AuthController.login()`: return `{ success: true, data: { requires2FA: true } }` when 2FA needed

**Frontend:**
- `LoginPage.tsx`: after login response with `requires2FA: true`, show TOTP input field instead of redirecting. Submit code to `POST /api/v1/2fa/verify`, then complete login
- `TwoFactorSetupPage.tsx`: show QR code, input for verification code, display backup codes on success
- `ProfilePage.tsx`: add "Two-Factor Authentication" section with enable/disable toggle and backup code regeneration
- `auth.store.ts`: add `tempToken` state for 2FA login flow

**Audit log actions:** `2FA_ENABLED`, `2FA_DISABLED`, `2FA_BACKUP_USED`, `2FA_BACKUP_REGENERATED`

---

### Phase 3: Session Management UI

**Layer:** Full Stack
**Files:**
- `apps/api/src/db/schema/sessions.ts`
- `apps/api/src/db/schema/index.ts`
- `apps/api/src/services/session.service.ts` (new)
- `apps/api/src/controllers/session.controller.ts` (new)
- `apps/api/src/routes/session.routes.ts` (new)
- `apps/api/src/routes/index.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/schemas/session.schema.ts` (new)
- `apps/web/src/pages/SessionsPage.tsx` (new)
- `apps/web/src/api/sessions.api.ts` (new)
- `apps/web/src/hooks/useSessions.ts` (new)
- `apps/web/src/pages/ProfilePage.tsx`
- `docs/architecture/DATA_MODEL.md`

**Database changes to `sessions` table:**
- Add `userAgent` column (varchar 500, nullable)
- Add `ipAddress` column (varchar 45, nullable)
- Add `lastUsedAt` column (timestamp, nullable)

**Backend — update `AuthService`:**
- `login()` and `refresh()`: populate `userAgent` (from `req.headers['user-agent']`), `ipAddress` (from `req.ip`), and `lastUsedAt` on session creation/refresh

**Backend — `SessionService`:**
- `getActiveSessions(userId: string): Promise<Result<Session[]>>` — returns all non-expired sessions for user, ordered by `lastUsedAt DESC`
- `revokeSession(userId: string, sessionId: string): Promise<Result<void>>` — deletes a specific session (prevents revoking own current session)
- `revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<Result<void>>` — deletes all sessions except the current one

**Backend — `SessionController`:**
- `GET /api/v1/sessions` — protected, returns active sessions with device info
- `DELETE /api/v1/sessions/:id` — protected, revokes a specific session
- `DELETE /api/v1/sessions` — protected, revokes all other sessions

**Frontend — `SessionsPage.tsx`:**
- List of active sessions showing: device/browser (parsed from user agent), IP address, last active time, created time
- Highlight current session with "(This device)" label
- "Revoke" button per session (disabled for current session)
- "Revoke All Other Sessions" button
- Accessible from ProfilePage link

**Audit log actions:** `SESSION_REVOKED`, `ALL_SESSIONS_REVOKED`

---

## Phase Dependency Order

```
Phase 1 (Account Lockout) — no dependencies, can start immediately
Phase 2 (2FA) — no dependencies, can start immediately
Phase 3 (Session Management) — no dependencies, can start immediately

All three phases are independent and can be implemented in parallel.
Within each phase, follow: Database → Service → Controller/Routes → Frontend
```

---

## Verification

### After each phase

```bash
pnpm db:generate        # Generate migration
pnpm db:migrate         # Apply migration
pnpm build              # All packages compile
pnpm lint               # 0 errors
pnpm test               # All tests pass
pnpm dev                # Manual testing in browser
```

### After all phases

```bash
pnpm docker:reset && pnpm docker:up && pnpm db:migrate && pnpm db:seed
pnpm build && pnpm lint && pnpm test
```

Verify:
- Login with wrong password N times, confirm lockout occurs and auto-expires
- Enable 2FA, log out, log back in with TOTP code
- Use a backup code to log in when TOTP unavailable
- View active sessions, revoke a session, confirm it's invalidated
- Admin can configure lockout thresholds via system settings UI
