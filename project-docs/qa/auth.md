# Test Cases: Authentication

> **[Template]** Base template test cases. Extend for your project.
> Traceability: US-AUTH-001 through US-AUTH-025

## Registration

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-001 | Register with valid credentials | No existing user with email | 1. POST `/api/auth/register` with valid name, email, password (meets all requirements) | 201 Created; response contains user object and access/refresh tokens | US-AUTH-001 | P0 | Yes |
| TC-AUTH-002 | Reject password under 8 characters | None | 1. POST `/api/auth/register` with password "Ab1defg" (7 chars) | 400 Bad Request; validation error indicates minimum length | US-AUTH-002 | P0 | Yes |
| TC-AUTH-003 | Reject password over 128 characters | None | 1. POST `/api/auth/register` with password of 129 characters meeting all other requirements | 400 Bad Request; validation error indicates maximum length exceeded | US-AUTH-002 | P1 | Yes |
| TC-AUTH-004 | Reject password without uppercase letter | None | 1. POST `/api/auth/register` with password "abcdefg1" (no uppercase) | 400 Bad Request; validation error indicates uppercase letter required | US-AUTH-002 | P0 | Yes |
| TC-AUTH-005 | Reject password without number | None | 1. POST `/api/auth/register` with password "Abcdefgh" (no digit) | 400 Bad Request; validation error indicates number required | US-AUTH-002 | P0 | Yes |
| TC-AUTH-006 | Reject duplicate email registration | User with email "test@example.com" exists | 1. POST `/api/auth/register` with email "test@example.com" | 409 Conflict; error indicates email already registered | US-AUTH-003 | P0 | Yes |

## Login

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-007 | Login with valid credentials | Registered and active user exists | 1. POST `/api/auth/login` with valid email and password | 200 OK; response contains access token and refresh token; audit log entry created | US-AUTH-004 | P0 | Yes |
| TC-AUTH-008 | Login with wrong password | Registered user exists | 1. POST `/api/auth/login` with valid email and incorrect password | 401 Unauthorized; generic "Invalid credentials" message (no password hint) | US-AUTH-005 | P0 | Yes |
| TC-AUTH-009 | Login with non-existent email | No user with given email | 1. POST `/api/auth/login` with email that does not exist in system | 401 Unauthorized; generic "Invalid credentials" message (prevents enumeration) | US-AUTH-005 | P0 | Yes |
| TC-AUTH-010 | Login with inactive account | User exists with isActive=false | 1. POST `/api/auth/login` with credentials of inactive user | 401 Unauthorized; error indicates account is inactive or disabled | US-AUTH-006 | P0 | Yes |
| TC-AUTH-011 | Login returns MFA challenge when MFA enabled | User has TOTP MFA enabled | 1. POST `/api/auth/login` with valid credentials | 200 OK; response contains mfaRequired=true and temporary token; no access/refresh tokens issued | US-AUTH-007 | P0 | Yes |
| TC-AUTH-012 | Login rate limited after threshold | None | 1. POST `/api/auth/login` with incorrect password repeatedly until rate limit is hit | 429 Too Many Requests; response includes retry-after header or message | US-AUTH-008 | P1 | Yes |

## Logout

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-013 | Logout invalidates refresh token | User is logged in with valid session | 1. POST `/api/auth/logout` with valid refresh token in body 2. Attempt to use the same refresh token to get new tokens | 200 OK on logout; subsequent refresh attempt returns 401 | US-AUTH-009 | P0 | Yes |
| TC-AUTH-014 | Logout with invalid refresh token returns 200 (idempotent) | User is authenticated | 1. POST `/api/auth/logout` with an invalid or already-revoked refresh token | 200 OK; logout is idempotent and does not reveal token validity | US-AUTH-009 | P1 | Yes |

## Token Refresh

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-015 | Refresh with valid token | User has a valid, non-expired refresh token | 1. POST `/api/auth/refresh` with valid refresh token | 200 OK; response contains new access token and new refresh token; old refresh token is invalidated | US-AUTH-010 | P0 | Yes |
| TC-AUTH-016 | Refresh with expired token | User has an expired refresh token | 1. POST `/api/auth/refresh` with expired refresh token | 401 Unauthorized; error indicates token is expired | US-AUTH-011 | P0 | Yes |
| TC-AUTH-017 | Refresh with revoked token | Refresh token has been revoked (e.g., by logout) | 1. POST `/api/auth/refresh` with revoked refresh token | 401 Unauthorized; error indicates token is invalid or revoked | US-AUTH-011 | P0 | Yes |

## Password Reset

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-018 | Forgot password sends email (prevents enumeration) | None | 1. POST `/api/auth/forgot-password` with any email address | 200 OK always returned regardless of whether email exists; if email exists, password reset email is sent | US-AUTH-012 | P0 | Yes |
| TC-AUTH-019 | Reset password with valid token | User requested password reset; valid token exists | 1. POST `/api/auth/reset-password` with valid reset token and new password meeting requirements | 200 OK; password is updated; user can login with new password; reset token is consumed | US-AUTH-013 | P0 | Yes |
| TC-AUTH-020 | Reset password with expired token | Reset token has passed its expiry time | 1. POST `/api/auth/reset-password` with expired reset token and new password | 400 Bad Request; error indicates token is expired | US-AUTH-014 | P0 | Yes |
| TC-AUTH-021 | Reset password with already-used token | Reset token has been used once already | 1. POST `/api/auth/reset-password` with previously used reset token and new password | 400 Bad Request; error indicates token is invalid or already used | US-AUTH-014 | P0 | Yes |

## Email Verification

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-022 | Verify email with valid token | User registered; verification token exists | 1. POST `/api/auth/verify-email` with valid verification token | 200 OK; user's emailVerified flag set to true | US-AUTH-015 | P0 | Yes |
| TC-AUTH-023 | Verify email with expired token | Verification token has passed its expiry time | 1. POST `/api/auth/verify-email` with expired verification token | 400 Bad Request; error indicates token is expired | US-AUTH-016 | P0 | Yes |
| TC-AUTH-024 | Resend verification email | User is authenticated; email not yet verified | 1. POST `/api/auth/resend-verification` with authentication | 200 OK; new verification email sent; previous token invalidated | US-AUTH-017 | P1 | Yes |

## Account Lockout

| TC ID | Description | Preconditions | Steps | Expected Result | Story | Priority | Automated |
|-------|-------------|---------------|-------|-----------------|-------|----------|-----------|
| TC-AUTH-025 | Account locked after 5 failed login attempts | Registered active user exists | 1. POST `/api/auth/login` with correct email and wrong password 5 times in succession 2. POST `/api/auth/login` with correct credentials on 6th attempt | First 5 attempts return 401; 6th attempt returns 401 with account locked message even though credentials are correct | US-AUTH-018 | P0 | Yes |
