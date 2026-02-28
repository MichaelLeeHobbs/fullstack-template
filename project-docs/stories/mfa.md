# Multi-Factor Authentication User Stories

> **[Template]** Base template stories. Extend for your project.

---

## US-MFA-001: TOTP Setup

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/mfa/totp/setup, POST /api/v1/mfa/totp/verify-setup, GET /api/v1/mfa/methods |
| **Components** | MfaCard (ProfilePage), MfaController.setupTotp(), MfaController.verifySetup(), MfaService |

**As a** security-conscious user, **I want to** set up TOTP-based multi-factor authentication, **so that** my account has an additional layer of protection beyond my password.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Authenticated user can initiate TOTP setup, receiving a secret and QR code (base64 image) | TC-MFA-001 |
| 2 | User scans QR code with authenticator app and submits a 6-digit verification code | TC-MFA-002 |
| 3 | Valid verification code enables TOTP and returns a set of one-time backup codes | TC-MFA-003 |
| 4 | Invalid verification code returns 400 Bad Request | TC-MFA-004 |
| 5 | User can view their enabled MFA methods via GET /api/v1/mfa/methods | TC-MFA-005 |
| 6 | TOTP secret is securely stored (encrypted) in the database | TC-MFA-006 |
| 7 | Setup requires an active authenticated session (JWT) | TC-MFA-007 |

---

## US-MFA-002: TOTP Login

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/auth/login, POST /api/v1/mfa/verify |
| **Components** | LoginPage (MFA challenge step), MfaController.verifyLogin(), MfaService |

**As a** user with TOTP enabled, **I want to** provide my TOTP code after entering my password, **so that** my identity is verified with two factors before granting access.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | Login with valid credentials and MFA enabled returns `{ mfaRequired: true, tempToken: "..." }` instead of access tokens | TC-MFA-008 |
| 2 | User submits tempToken, method "totp", and 6-digit code to POST /api/v1/mfa/verify | TC-MFA-009 |
| 3 | Valid TOTP code returns accessToken and refreshToken (completing login) | TC-MFA-010 |
| 4 | Invalid TOTP code returns 401 Unauthorized | TC-MFA-011 |
| 5 | Expired tempToken returns 401 Unauthorized | TC-MFA-012 |
| 6 | MFA verification endpoint is rate-limited | TC-MFA-013 |

---

## US-MFA-003: Backup Codes

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/mfa/verify (method: "backup"), POST /api/v1/mfa/backup-codes |
| **Components** | MfaCard (ProfilePage), MfaController.verifyLogin(), MfaController.regenerateBackupCodes(), MfaService |

**As a** user with MFA enabled, **I want to** use a backup code if I lose access to my authenticator app, **so that** I can still log in to my account.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User can submit a backup code (method: "backup") during MFA verification to complete login | TC-MFA-014 |
| 2 | Each backup code can only be used once | TC-MFA-015 |
| 3 | Used backup code returns 401 on second use | TC-MFA-016 |
| 4 | User can regenerate backup codes by verifying with a current TOTP code | TC-MFA-017 |
| 5 | Regeneration requires method and code in the request body for identity verification | TC-MFA-018 |
| 6 | New backup codes replace all previous backup codes | TC-MFA-019 |
| 7 | Invalid verification code for regeneration returns 400 Bad Request | TC-MFA-020 |

---

## US-MFA-004: Disable MFA

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Status** | Implemented |
| **Endpoints** | POST /api/v1/mfa/disable |
| **Components** | MfaCard (ProfilePage), MfaController.disable(), MfaService |

**As a** user with MFA enabled, **I want to** disable MFA by verifying with my current code, **so that** I can simplify my login process if I choose.

### Acceptance Criteria

| # | Criterion | Test Case |
|---|-----------|-----------|
| 1 | User submits method and verification code to disable MFA | TC-MFA-021 |
| 2 | Valid code disables the specified MFA method and removes associated secrets | TC-MFA-022 |
| 3 | Invalid code returns 400 Bad Request | TC-MFA-023 |
| 4 | Attempting to disable a method that is not enabled returns 400 Bad Request | TC-MFA-024 |
| 5 | Disabling MFA requires an active authenticated session (JWT) | TC-MFA-025 |
| 6 | Future logins no longer require MFA challenge after disabling | TC-MFA-026 |

---
