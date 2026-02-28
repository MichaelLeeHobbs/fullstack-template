# API Documentation

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Complete API reference for the fullstack template backend. Interactive docs are also available at `/api/docs` (Swagger/OpenAPI) when the server is running.

---

## Overview

The API follows RESTful conventions with consistent JSON response formatting, JWT-based authentication, and comprehensive error handling.

**Base URL:** `http://localhost:3000/api` (development)

**Response format:**
```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error description" }

// Paginated
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }
```

---

## Sections

### Authentication

> [`authentication.md`](./authentication.md)

How authentication works in the API:
- JWT access tokens (short-lived) + refresh tokens (httpOnly cookies)
- Token type discrimination (`access`, `refresh`, `mfa`)
- Refresh token rotation and hashing
- MFA/TOTP flow
- Account lockout mechanics

---

### Endpoint Reference

> [`endpoints/`](./endpoints/)

Detailed endpoint documentation organized by domain:

| File | Domain | Key Endpoints |
|------|--------|---------------|
| [`auth-account.md`](./endpoints/auth-account.md) | Auth & Account | Register, login, logout, refresh, password reset, email verify, MFA |
| [`admin-users.md`](./endpoints/admin-users.md) | Admin - Users | List users, get user, update user, delete user, unlock account |
| [`rbac-sessions.md`](./endpoints/rbac-sessions.md) | RBAC & Sessions | Roles, permissions, user-role assignments, session management |
| [`pki.md`](./endpoints/pki.md) | PKI / CA | Certificate authorities, certificates, CSR signing |
| [`system.md`](./endpoints/system.md) | System | Health check, settings, feature flags, API info |

Each endpoint document includes:
- HTTP method and path
- Authentication requirements
- Request body schema (Zod)
- Response schema with examples
- Error responses
- Rate limiting details

---

### Rate Limiting

> [`rate-limiting.md`](./rate-limiting.md)

Rate limiting policies applied to API endpoints:
- Global rate limits
- Per-endpoint limits (auth endpoints have stricter limits)
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Account lockout thresholds

---

### Error Codes

> [`error-codes.md`](./error-codes.md)

Standard error codes and their meanings:
- HTTP status code usage
- Application-specific error codes
- Validation error format (Zod v4 `prettifyError`)
- Error response examples

---

### Pagination

> [`pagination.md`](./pagination.md)

Pagination conventions for list endpoints:
- Query parameters (`page`, `limit`, `sort`, `order`)
- Response metadata format
- Default and maximum page sizes
- Cursor-based pagination (where applicable)

---

## Quick Reference

### Authentication Header

```
Authorization: Bearer <access_token>
```

### Common HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource (e.g., email already registered) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

## Related Documentation

- [Core Patterns](../../docs/architecture/CORE_PATTERNS.md) - Router -> Controller -> Service -> Model flow
- [Permissions](../../docs/architecture/PERMISSIONS.md) - RBAC and authorization model
- [Configuration](../../docs/architecture/CONFIG.md) - Environment variables including JWT settings
- [OpenAPI/Swagger](http://localhost:3000/api/docs) - Interactive API docs (dev server must be running)
