# Auth & Account Endpoints

> **[Template]** This covers the base template feature. Extend or modify for your project.

Base URL: `/api/v1`

---

## Auth Endpoints (`/auth`)

### POST /auth/register

Create a new user account. Returns the user object along with access and refresh tokens.

**Authentication**: None (public)
**Rate Limit**: 5 requests per hour per IP

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| email | body | string | Yes | Valid email address |
| password | body | string | Yes | 8-128 characters |

**Success (201)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "user@example.com",
      "isAdmin": false,
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid email format or password too short/long |
| 409 | Email already registered | An account with this email already exists |
| 429 | Too many accounts created | Registration rate limit exceeded |

---

### POST /auth/login

Authenticate with email and password. If MFA is enabled on the account, returns a temporary token instead of full credentials.

**Authentication**: None (public)
**Rate Limit**: 5 requests per 15 minutes per IP

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| email | body | string | Yes | Valid email address |
| password | body | string | Yes | Account password |

**Success -- No MFA (200)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "user@example.com",
      "isAdmin": false,
      "isActive": true,
      "emailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Success -- MFA Required (200)**:

```json
{
  "success": true,
  "data": {
    "mfaRequired": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIs...",
    "availableMethods": ["totp"]
  }
}
```

When `mfaRequired` is `true`, the client must call `POST /mfa/verify` with the `tempToken` and a valid MFA code within 5 minutes.

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid credentials | Wrong email or password |
| 401 | Account is deactivated | Account has been disabled by an admin |
| 429 | Too many login attempts | Auth rate limit exceeded |

---

### POST /auth/refresh

Exchange a valid refresh token for new access and refresh tokens. The old refresh token is invalidated (single-use rotation).

**Authentication**: None (public)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| refreshToken | body | string | No | The refresh token from login or a previous refresh. If omitted, the request will fail. |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid or expired refresh token | Token is expired, already used, or does not exist |

---

### POST /auth/logout

Invalidate the provided refresh token and its associated session.

**Authentication**: None (public)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| refreshToken | body | string | No | The refresh token to invalidate |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

This endpoint always returns 200, even if the token is already invalid, to prevent information leakage.

---

### GET /auth/me

Get the currently authenticated user's profile.

**Authentication**: Required (Bearer token or API key)

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "email": "user@example.com",
    "isAdmin": false,
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "lastLoginAt": "2025-06-01T14:22:00.000Z"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |

---

## Account Endpoints (`/account`)

### POST /account/forgot-password

Request a password reset email. Always returns 200 to prevent email enumeration, regardless of whether the email exists.

**Authentication**: None (public)
**Rate Limit**: 3 requests per hour per IP

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| email | body | string | Yes | Email address associated with the account |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a reset link has been sent."
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 429 | Too many password reset requests | Rate limit exceeded |

---

### POST /account/reset-password

Reset the account password using a token received via email.

**Authentication**: None (public)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| token | body | string | Yes | Password reset token from the email link |
| password | body | string | Yes | New password (8-128 characters) |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid or expired token | Reset token has expired or has already been used |
| 400 | Validation error | Password does not meet requirements |

---

### POST /account/verify-email

Verify an email address using a token sent to the user's email after registration.

**Authentication**: None (public)

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| token | body | string | Yes | Email verification token |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid or expired token | Verification token has expired or has already been used |

---

### POST /account/resend-verification-public

Resend the email verification link. This is the public variant that accepts an email in the body (no authentication required).

**Authentication**: None (public)
**Rate Limit**: 3 requests per hour per IP

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| email | body | string | Yes | Email address to resend verification to |

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "If the email is registered and unverified, a new verification link has been sent."
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 429 | Too many requests | Rate limit exceeded |

---

### POST /account/resend-verification

Resend the email verification link for the currently authenticated user.

**Authentication**: Required (Bearer token)

**Success (200)**:

```json
{
  "success": true,
  "data": {
    "message": "Verification email sent"
  }
}
```

**Errors**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
