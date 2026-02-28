# Authentication User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-AUTH-001: User Registration

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/auth/register |
| **Components** | RegisterPage, AuthController.register(), AuthService.register() |

**As a** new user, **I want to** create an account with my email and password, **so that** I can access the application.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit email and password to create an account | TC-AUTH-001 |
| 2 | Password must be 8-128 characters with at least one uppercase letter and one number | TC-AUTH-002 |
| 3 | Email must be a valid email format | TC-AUTH-003 |
| 4 | Duplicate email returns 409 Conflict | TC-AUTH-004 |
| 5 | Successful registration returns accessToken and refreshToken | TC-AUTH-005 |
| 6 | Password is hashed with bcrypt before storage (never stored in plaintext) | TC-AUTH-006 |
| 7 | A verification email is sent to the registered email address | TC-AUTH-007 |
| 8 | Registration event is recorded in the audit log | TC-AUTH-008 |
| 9 | Registration is rate-limited to prevent abuse | TC-AUTH-009 |
| 10 | Response body follows standard format: `{ success: true, data: { user, accessToken, refreshToken } }` | TC-AUTH-010 |

---

## US-AUTH-002: User Login

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/auth/login |
| **Components** | LoginPage, AuthController.login(), AuthService.login() |

**As a** registered user, **I want to** log in with my email and password, **so that** I can access my account and protected resources.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit email and password to authenticate | TC-AUTH-011 |
| 2 | Successful login returns accessToken and refreshToken | TC-AUTH-012 |
| 3 | Invalid credentials return 401 Unauthorized | TC-AUTH-013 |
| 4 | If MFA is enabled, response returns `mfaRequired: true` and a `tempToken` instead of access/refresh tokens | TC-AUTH-014 |
| 5 | Failed login increments the failed attempt counter for account lockout | TC-AUTH-015 |
| 6 | Locked accounts return 401 with a lockout message | TC-AUTH-016 |
| 7 | Login event is recorded in the audit log | TC-AUTH-017 |
| 8 | Login is rate-limited to prevent brute-force attacks | TC-AUTH-018 |
| 9 | Inactive accounts cannot log in | TC-AUTH-019 |

---

## US-AUTH-003: User Logout

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/auth/logout |
| **Components** | AppLayout (logout button), AuthController.logout(), AuthService.logout() |

**As a** logged-in user, **I want to** log out of my account, **so that** my session is terminated and my tokens are invalidated.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit their refreshToken to log out | TC-AUTH-020 |
| 2 | The refresh token is invalidated and cannot be reused | TC-AUTH-021 |
| 3 | The associated session record is revoked in the database | TC-AUTH-022 |
| 4 | Response returns `{ success: true }` | TC-AUTH-023 |
| 5 | Frontend clears stored tokens and redirects to login page | TC-AUTH-024 |

---

## US-AUTH-004: Token Refresh

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/auth/refresh |
| **Components** | auth.store.ts (automatic refresh), AuthController.refresh(), AuthService.refresh() |

**As a** logged-in user, **I want to** refresh my access token using my refresh token, **so that** I can maintain my session without re-entering credentials.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Valid refresh token returns a new accessToken and refreshToken | TC-AUTH-025 |
| 2 | The old refresh token is invalidated after rotation (single-use) | TC-AUTH-026 |
| 3 | Expired refresh token returns 401 Unauthorized | TC-AUTH-027 |
| 4 | Invalid or revoked refresh token returns 401 Unauthorized | TC-AUTH-028 |
| 5 | Token rotation ensures each refresh token can only be used once | TC-AUTH-029 |

---

## US-AUTH-005: Password Reset

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/account/forgot-password, POST /api/v1/account/reset-password |
| **Components** | ForgotPasswordPage, ResetPasswordPage, AccountController.forgotPassword(), AccountController.resetPassword(), AccountService |

**As a** user who forgot my password, **I want to** request a password reset email and set a new password, **so that** I can regain access to my account.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit their email to request a password reset | TC-AUTH-030 |
| 2 | Forgot-password always returns 200 to prevent email enumeration | TC-AUTH-031 |
| 3 | A password reset token is emailed to the user | TC-AUTH-032 |
| 4 | User can submit the token and a new password to reset their password | TC-AUTH-033 |
| 5 | New password must meet validation requirements (8-128 chars, uppercase, number) | TC-AUTH-034 |
| 6 | Invalid or expired token returns 400 Bad Request | TC-AUTH-035 |
| 7 | After password reset, all existing sessions are invalidated | TC-AUTH-036 |
| 8 | Password reset request is rate-limited | TC-AUTH-037 |

---

## US-AUTH-006: Email Verification

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/account/verify-email, POST /api/v1/account/resend-verification, POST /api/v1/account/resend-verification-public |
| **Components** | VerifyEmailPage, AccountController.verifyEmail(), AccountController.resendVerification(), AccountService |

**As a** newly registered user, **I want to** verify my email address using a token, **so that** the system can confirm I own the email and enable full account access.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit a verification token to verify their email | TC-AUTH-038 |
| 2 | Successful verification sets `emailVerified` to true on the user record | TC-AUTH-039 |
| 3 | Invalid or expired token returns 400 Bad Request | TC-AUTH-040 |
| 4 | Authenticated user can request a new verification email via resend-verification | TC-AUTH-041 |
| 5 | Unauthenticated user can request a new verification email via resend-verification-public (rate-limited) | TC-AUTH-042 |
| 6 | Already-verified users receive an appropriate message | TC-AUTH-043 |

---

## US-AUTH-007: Account Lockout

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/auth/login (lockout enforcement), PATCH /api/v1/admin/users/:id (admin unlock) |
| **Components** | AccountLockoutService, AuthService.login(), AdminController.updateUser() |

**As a** system administrator, **I want** accounts to be locked after repeated failed login attempts, **so that** brute-force attacks are mitigated.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Account is locked after 5 consecutive failed login attempts (configurable via settings) | TC-AUTH-044 |
| 2 | Locked account returns 401 with lockout message and remaining lockout time | TC-AUTH-045 |
| 3 | Account automatically unlocks after 15 minutes (configurable via settings) | TC-AUTH-046 |
| 4 | Successful login resets the failed attempt counter | TC-AUTH-047 |
| 5 | Administrator can manually unlock an account via PATCH /api/v1/admin/users/:id | TC-AUTH-048 |
| 6 | Lockout configuration is managed through system settings (security.max_login_attempts, security.lockout_duration_minutes) | TC-AUTH-049 |

---
