# Test Cases: Multi-Factor Authentication (MFA)

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-MFA-001 through US-MFA-015

## TOTP Setup

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-MFA-001 | Setup returns secret and QR code | User authenticated; MFA not enabled | 1. POST `/api/auth/mfa/setup` with valid authentication | 200 OK; response contains TOTP secret string and QR code data URL for authenticator app enrollment | US-MFA-001 | P0 | Yes |
| TC-MFA-002 | Verify setup with valid TOTP code | MFA setup initiated; secret returned | 1. Generate valid TOTP code from the secret 2. POST `/api/auth/mfa/verify-setup` with valid code | 200 OK; MFA is enabled on account; response contains array of single-use backup codes | US-MFA-001 | P0 | Yes |
| TC-MFA-003 | Verify setup with invalid TOTP code | MFA setup initiated; secret returned | 1. POST `/api/auth/mfa/verify-setup` with incorrect code (e.g., "000000") | 400 Bad Request; error indicates invalid verification code; MFA remains not enabled | US-MFA-002 | P0 | Yes |
| TC-MFA-004 | Setup when MFA already enabled | User authenticated; MFA already enabled | 1. POST `/api/auth/mfa/setup` with valid authentication | 400 Bad Request; error indicates MFA is already enabled on this account | US-MFA-002 | P1 | Yes |

## TOTP Login

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-MFA-005 | Verify MFA with valid TOTP code | User logged in; received mfaRequired=true and temp token | 1. Generate valid TOTP code from enrolled secret 2. POST `/api/auth/mfa/verify` with temp token and valid TOTP code | 200 OK; response contains access token and refresh token; full session established | US-MFA-003 | P0 | Yes |
| TC-MFA-006 | Verify MFA with invalid TOTP code | User logged in; received mfaRequired=true and temp token | 1. POST `/api/auth/mfa/verify` with temp token and incorrect code | 401 Unauthorized; error indicates invalid MFA code; no tokens issued | US-MFA-004 | P0 | Yes |
| TC-MFA-007 | Verify MFA with expired temp token | User logged in but temp token has expired | 1. Wait for temp token to expire 2. POST `/api/auth/mfa/verify` with expired temp token and valid TOTP code | 401 Unauthorized; error indicates token is expired; user must re-authenticate | US-MFA-004 | P0 | Yes |
| TC-MFA-008 | Verify MFA with backup code | User logged in; received mfaRequired=true and temp token; has unused backup code | 1. POST `/api/auth/mfa/verify` with temp token and valid backup code | 200 OK; response contains access token and refresh token; backup code is consumed and cannot be reused | US-MFA-005 | P0 | Yes |

## Backup Codes

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-MFA-009 | Regenerate backup codes | User authenticated; MFA enabled | 1. POST `/api/auth/mfa/backup-codes` with valid TOTP code for confirmation | 200 OK; response contains new set of backup codes; all previous backup codes are invalidated | US-MFA-006 | P0 | Yes |
| TC-MFA-010 | Used backup code cannot be reused | User has used one backup code for MFA verification | 1. POST `/api/auth/mfa/verify` with the same backup code that was already used | 401 Unauthorized; error indicates invalid code; used backup codes are permanently consumed | US-MFA-007 | P0 | Yes |
| TC-MFA-011 | Regenerate requires valid TOTP code | User authenticated; MFA enabled | 1. POST `/api/auth/mfa/backup-codes` with invalid TOTP code | 400 Bad Request; error indicates invalid verification code; backup codes are not regenerated | US-MFA-006 | P1 | Yes |

## Disable MFA

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-MFA-012 | Disable MFA with valid TOTP code | User authenticated; MFA enabled | 1. POST `/api/auth/mfa/disable` with valid current TOTP code | 200 OK; MFA is disabled; future logins no longer require MFA challenge | US-MFA-008 | P0 | Yes |
| TC-MFA-013 | Disable MFA with invalid TOTP code | User authenticated; MFA enabled | 1. POST `/api/auth/mfa/disable` with incorrect TOTP code | 400 Bad Request; error indicates invalid verification code; MFA remains enabled | US-MFA-008 | P0 | Yes |
| TC-MFA-014 | Get MFA methods shows enabled status | User authenticated; MFA enabled | 1. GET `/api/auth/mfa/methods` with valid authentication | 200 OK; response shows TOTP method with enabled=true and enrollment date | US-MFA-009 | P1 | Yes |
| TC-MFA-015 | Get MFA methods when none enabled | User authenticated; MFA not enabled | 1. GET `/api/auth/mfa/methods` with valid authentication | 200 OK; response shows empty methods list or all methods with enabled=false | US-MFA-009 | P1 | Yes |
