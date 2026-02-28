# Error Codes & Response Format

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Response Format

All API responses follow a consistent JSON format.

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

For paginated endpoints, a `meta` field is included alongside `data`:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Human-readable error description"
}
```

The `error` field always contains a string description. In production, internal error details are hidden and replaced with a generic message. In development, the actual error message is returned.

---

## HTTP Status Codes

### 200 OK

The request was successful. Used for all successful GET, PATCH, PUT, DELETE, and some POST operations.

### 201 Created

A new resource was created. Used for:
- `POST /auth/register` -- New user account
- `POST /roles` -- New role
- `POST /api-keys` -- New API key
- `POST /api-keys/service-accounts` -- New service account
- `POST /ca` -- New Certificate Authority
- `POST /profiles` -- New certificate profile
- `POST /certificates/issue` -- New certificate
- `POST /certificates/requests` -- New CSR
- `POST /ca/:id/crl` -- New CRL
- `POST /cert-attach` -- New certificate binding
- `POST /cert-attach/code` -- New attach code

### 400 Bad Request

The request was malformed or contained invalid data.

**Common causes**:
- Request body fails Zod schema validation
- Invalid UUID format in path parameters
- Missing required fields
- Password does not meet requirements
- Current password incorrect (password change)
- Invalid or expired token (password reset, email verification)
- Cannot delete/modify own account
- Business logic violation (e.g., CSR already approved)

**Validation error example** (using Zod `prettifyError`):

```json
{
  "success": false,
  "error": {
    "email": "Invalid email address",
    "password": "Password must be at least 8 characters"
  }
}
```

Note: Validation errors may return the error as a structured object (from `z.prettifyError()`) rather than a plain string.

### 401 Unauthorized

Authentication is required but was not provided, or the provided credentials are invalid.

**Common causes**:
- No `Authorization` header or `X-API-Key` header provided
- Bearer token is expired or malformed
- Refresh token is invalid or already used
- API key is invalid, expired, or revoked
- Invalid email/password during login
- Invalid MFA code or expired temp token
- User account not found

**Response examples**:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

```json
{
  "success": false,
  "error": "Invalid or expired API key"
}
```

### 403 Forbidden

The user is authenticated but does not have permission to perform the requested action.

**Common causes**:
- User lacks the required permission (e.g., `users.read`, `roles.create`)
- User account is deactivated (`isActive: false`)
- Attempting to modify or delete a system role
- API key owner account is deactivated

**Response examples**:

```json
{
  "success": false,
  "error": "Forbidden"
}
```

```json
{
  "success": false,
  "error": "Account is deactivated"
}
```

```json
{
  "success": false,
  "error": "Cannot modify system role"
}
```

### 404 Not Found

The requested resource does not exist.

**Common causes**:
- User, role, session, API key, or other resource with the given ID does not exist
- Setting key not found
- Route does not exist

**Response examples**:

```json
{
  "success": false,
  "error": "User not found"
}
```

For non-existent routes:

```json
{
  "success": false,
  "error": "Route GET /api/v1/nonexistent not found"
}
```

### 409 Conflict

The request conflicts with existing data.

**Common causes**:
- Registering with an email that already exists
- Creating a role with a name that already exists
- Creating a service account with an email already in use
- Attaching a certificate that is already bound to an account

**Response example**:

```json
{
  "success": false,
  "error": "Email already registered"
}
```

### 429 Too Many Requests

The client has sent too many requests in a given time period.

**Response example**:

```json
{
  "success": false,
  "error": "Too many login attempts. Please try again in 15 minutes."
}
```

See [Rate Limiting](rate-limiting.md) for details on rate limit tiers and response headers.

### 500 Internal Server Error

An unexpected error occurred on the server.

**Production response**:

```json
{
  "success": false,
  "error": "Internal server error"
}
```

**Development response** (includes actual error message):

```json
{
  "success": false,
  "error": "Cannot read properties of undefined (reading 'id')"
}
```

In production, error details are never leaked to clients. All 500 errors are logged server-side with Pino and reported to Sentry (if configured).

---

## Error Handling by Authentication Method

### JWT Bearer Token Errors

| Scenario | Status | Error |
|----------|--------|-------|
| No Authorization header | 401 | Unauthorized |
| Malformed header (not "Bearer ...") | 401 | Unauthorized |
| Expired access token | 401 | Invalid or expired token |
| Token signed with wrong secret | 401 | Invalid or expired token |
| Refresh token used as access token | 401 | Invalid or expired token |
| User deleted after token issued | 401 | User not found |
| User deactivated after token issued | 403 | Account is deactivated |

### API Key Errors

| Scenario | Status | Error |
|----------|--------|-------|
| Invalid API key | 401 | Invalid or expired API key |
| Expired API key | 401 | Invalid or expired API key |
| Revoked API key | 401 | Invalid or expired API key |
| Key owner deleted | 401 | API key owner not found |
| Key owner deactivated | 403 | API key owner account is deactivated |

### Permission Errors

| Scenario | Status | Error |
|----------|--------|-------|
| Missing required permission | 403 | Forbidden |
| Insufficient role | 403 | Forbidden |

---

## Tips for API Consumers

1. **Check `success` first**: Always check the `success` boolean before accessing `data` or `error`.
2. **Handle 401 with refresh**: When you receive a 401 on a protected endpoint, attempt to refresh the access token before prompting the user to log in again.
3. **Display validation errors**: For 400 responses, the `error` field may be a structured object with field-specific messages. Display these next to the relevant form fields.
4. **Never assume error format**: While `error` is typically a string, validation errors may return an object. Handle both cases.
5. **Log 500 errors**: If you receive a 500 error, log the response and request context for debugging. The server-side logs will have more detail.
