# API Design Guidelines

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Overview

This document defines the REST API conventions for the Fullstack Template. All API endpoints follow these patterns to ensure consistency, predictability, and developer ergonomics. The API is versioned, JSON-based, and follows standard HTTP semantics.

## Base URL

All API endpoints are served under the versioned base path:

```
/api/v1
```

Examples:
- `GET /api/v1/users`
- `POST /api/v1/auth/login`
- `PATCH /api/v1/account/profile`

## Versioning Strategy

The API uses **URL path versioning** (`/api/v1`). This approach was chosen for its simplicity and explicitness:

- Major version in the URL path: `/api/v1`, `/api/v2`
- Breaking changes require a new version
- Non-breaking additions (new fields, new optional params) do not require a version bump
- Old versions can be maintained alongside new ones during migration periods

## Response Format

All responses follow a consistent JSON envelope structure.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "isAdmin": false,
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

### Success Response with Pagination Meta

```json
{
  "success": true,
  "data": [
    { "id": "...", "email": "user1@example.com" },
    { "id": "...", "email": "user2@example.com" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "User not found"
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "email": "Invalid email address",
    "password": "Must be at least 8 characters"
  }
}
```

The `error` field is a string for simple errors, or an object keyed by field name for Zod v4 validation errors (produced by `z.prettifyError()`).

## HTTP Methods

| Method | Purpose | Request Body | Idempotent | Example |
|--------|---------|-------------|------------|---------|
| `GET` | Retrieve resource(s) | No | Yes | `GET /api/v1/users` |
| `POST` | Create resource or trigger action | Yes | No | `POST /api/v1/auth/login` |
| `PATCH` | Partial update of resource | Yes (partial) | Yes | `PATCH /api/v1/account/profile` |
| `PUT` | Full replacement of resource | Yes (complete) | Yes | `PUT /api/v1/roles/:id` |
| `DELETE` | Remove resource | No | Yes | `DELETE /api/v1/sessions/:id` |

### Method Selection Rules

1. **GET** -- Always safe (no side effects). Never use GET for mutations.
2. **POST** -- Used for resource creation and for RPC-style actions (e.g., `/auth/login`, `/auth/refresh`, `/mfa/verify`).
3. **PATCH** -- Preferred over PUT for updates. Only include the fields being changed.
4. **PUT** -- Used only when the client is replacing the entire resource representation (e.g., role with full permission set).
5. **DELETE** -- Removes the resource. Returns 200 with confirmation or 204 with no body.

## Status Codes

### Success Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200 OK` | Request succeeded | GET, PATCH, PUT, DELETE, POST (actions) |
| `201 Created` | Resource created | POST (creation) |
| `204 No Content` | Success with no body | DELETE (when no body needed) |

### Client Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `400 Bad Request` | Invalid request body or params | Validation failure, malformed input |
| `401 Unauthorized` | No valid authentication | Missing/expired/invalid token or API key |
| `403 Forbidden` | Authenticated but not authorized | Insufficient permissions, not admin |
| `404 Not Found` | Resource does not exist | Invalid ID, deleted resource |
| `409 Conflict` | State conflict | Duplicate email, role already assigned |
| `422 Unprocessable Entity` | Semantically invalid | Business rule violation |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in window |

### Server Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `500 Internal Server Error` | Unexpected failure | Unhandled exception, database error |
| `503 Service Unavailable` | Maintenance mode | System in maintenance (via settings) |

## Authentication

The API supports two authentication methods.

### JWT Bearer Token (Primary)

Used by the React SPA and any client that performs the login flow.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token lifecycle:**
1. Client sends `POST /api/v1/auth/login` with credentials
2. Server returns `accessToken` (short-lived, ~15 min) in response body
3. Server sets `refreshToken` as httpOnly cookie (long-lived, ~7 days)
4. Client includes `accessToken` in `Authorization` header for all requests
5. On 401, client calls `POST /api/v1/auth/refresh` (cookie sent automatically)
6. Server returns new `accessToken`

### API Key (Programmatic Access)

Used by service accounts and external integrations.

```
X-API-Key: fst_a1b2c3d4...
```

**API key properties:**
- Prefixed with `fst_` for identification
- Only the SHA-256 hash is stored; the full key is shown once at creation
- Scoped to specific permissions (subset of the owning user's permissions)
- Optional expiry date
- Can be individually revoked

### Certificate-Based Authentication (mTLS)

Used when NGINX is configured for mutual TLS. The client certificate is presented during the TLS handshake, and NGINX forwards the certificate DN via headers.

```
X-SSL-Client-S-DN: CN=user@example.com,O=Example Corp
X-SSL-Client-Verify: SUCCESS
X-SSL-Client-Serial: 0A1B2C3D
```

The `ssl-header` middleware extracts these headers and the `cert-login` service binds certificates to user accounts.

## Pagination

All list endpoints support pagination via query parameters.

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: 100) |

### Example Request

```
GET /api/v1/users?page=2&limit=25
```

### Example Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 2,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

### Meta Object

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Items per page |
| `total` | integer | Total matching records |
| `totalPages` | integer | `Math.ceil(total / limit)` |

## Sorting

List endpoints support sorting via query parameters.

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sortBy` | string | Varies by endpoint | Column to sort by |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

### Example Request

```
GET /api/v1/admin/users?sortBy=createdAt&sortOrder=desc
```

### Supported Sort Fields

Sort fields are endpoint-specific and validated by the Zod schema. Common sortable fields include:

- `createdAt` -- Record creation timestamp (default for most endpoints)
- `updatedAt` -- Last modification timestamp
- `email` -- Alphabetical by email
- `name` -- Alphabetical by name
- `status` -- Status value

## Filtering

List endpoints support field-specific filtering via query parameters. Available filters vary by endpoint.

### Common Filter Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `search` | string | `?search=john` | Full-text search across relevant fields |
| `isActive` | boolean | `?isActive=true` | Filter by active status |
| `isAdmin` | boolean | `?isAdmin=false` | Filter by admin status |
| `status` | string | `?status=active` | Filter by status value |
| `type` | string | `?type=info` | Filter by type value |
| `category` | string | `?category=security` | Filter by category |
| `dateFrom` | ISO date | `?dateFrom=2026-01-01` | Records created after this date |
| `dateTo` | ISO date | `?dateTo=2026-02-01` | Records created before this date |

### Example Filtered Request

```
GET /api/v1/admin/users?search=john&isActive=true&sortBy=email&sortOrder=asc&page=1&limit=20
```

## Rate Limiting

Rate limiting is applied per-endpoint group using a sliding window algorithm. Limits are configurable per environment.

### Rate Limit Headers

All rate-limited responses include these headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709157600
```

### Default Rate Limits

| Endpoint Group | Limit | Window | Description |
|----------------|-------|--------|-------------|
| Authentication | 10 requests | 15 minutes | Login, register, password reset |
| Token Refresh | 30 requests | 15 minutes | Token refresh endpoint |
| General API | 100 requests | 1 minute | Standard authenticated endpoints |
| Admin API | 200 requests | 1 minute | Admin endpoints (higher limit) |
| PKI Operations | 50 requests | 1 minute | Certificate issuance, CRL generation |

### Rate Limit Exceeded Response

```
HTTP/1.1 429 Too Many Requests
Retry-After: 45

{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

## Validation

All request input is validated using Zod v4 schemas applied via the `validate` middleware.

### Validation Targets

| Target | Middleware Usage | Description |
|--------|-----------------|-------------|
| `body` | `validate(schema)` | Request body (POST, PATCH, PUT) |
| `query` | `validate(schema, 'query')` | Query string parameters |
| `params` | `validate(schema, 'params')` | URL path parameters |

### Validation Error Format

```json
{
  "success": false,
  "error": {
    "email": "Invalid email address",
    "password": "String must contain at least 8 character(s)"
  }
}
```

Validation errors use `z.prettifyError()` from Zod v4, which produces a flat object keyed by field path with human-readable messages.

### UUID Validation

All resource IDs in URL parameters are validated as RFC 4122 UUIDs:

```
GET /api/v1/users/550e8400-e29b-41d4-a716-446655440000  -- Valid
GET /api/v1/users/not-a-uuid                             -- 400 Bad Request
```

## Endpoint Organization

### Route Groups

| Route Group | Base Path | Auth Required | Admin Required |
|-------------|-----------|---------------|----------------|
| Auth | `/api/v1/auth` | Mixed | No |
| Account | `/api/v1/account` | Yes | No |
| Users | `/api/v1/users` | Yes | No |
| Sessions | `/api/v1/sessions` | Yes | No |
| MFA | `/api/v1/mfa` | Yes | No |
| API Keys | `/api/v1/api-keys` | Yes | No |
| Notifications | `/api/v1/notifications` | Yes | No |
| Admin | `/api/v1/admin` | Yes | Yes |
| Roles | `/api/v1/roles` | Yes | Yes |
| Settings | `/api/v1/settings` | Yes | Yes |
| CA Management | `/api/v1/ca` | Yes | Yes |
| Certificates | `/api/v1/certificates` | Yes | Mixed |
| Certificate Profiles | `/api/v1/certificate-profiles` | Yes | Yes |
| CSR | `/api/v1/csr` | Yes | Mixed |
| Certificate Login | `/api/v1/cert-login` | Special | No |

### Naming Conventions

- **Nouns for resources**: `/users`, `/roles`, `/certificates` (not `/getUsers`)
- **Plural for collections**: `/users` (not `/user`)
- **Kebab-case for multi-word**: `/api-keys`, `/certificate-profiles`, `/cert-login`
- **Nested resources sparingly**: Prefer `/certificates?caId=X` over `/ca/X/certificates` for flexibility
- **Actions as sub-paths**: `/auth/login`, `/auth/refresh`, `/mfa/verify` (for RPC-style operations)

## Error Handling Pattern

The API uses a consistent error handling pipeline:

1. **Validation middleware** catches malformed input and returns 400 with field-level errors.
2. **Auth middleware** catches unauthenticated requests and returns 401.
3. **Permission middleware** catches unauthorized requests and returns 403.
4. **Controller** calls service, checks `Result<T>`, and returns appropriate 4xx status.
5. **Global error middleware** catches any unhandled errors and returns 500.

```
Request
  |
  v
[Validation MW] -- 400 if invalid
  |
  v
[Auth MW] -- 401 if no valid token
  |
  v
[Permission MW] -- 403 if not authorized
  |
  v
[Controller]
  |
  v
[Service] -- returns Result<T>
  |
  v
[Controller formats response] -- 200/201/4xx
  |
  v
[Global Error MW] -- catches unhandled 500s
```

### Error Response Examples

**Authentication failure:**
```json
// 401 Unauthorized
{ "success": false, "error": "Invalid credentials" }
```

**Permission denied:**
```json
// 403 Forbidden
{ "success": false, "error": "Insufficient permissions" }
```

**Resource not found:**
```json
// 404 Not Found
{ "success": false, "error": "User not found" }
```

**Conflict:**
```json
// 409 Conflict
{ "success": false, "error": "Email already registered" }
```

**Rate limited:**
```json
// 429 Too Many Requests
{ "success": false, "error": "Too many requests. Please try again later." }
```

## Request Headers

### Required Headers

| Header | Value | When |
|--------|-------|------|
| `Content-Type` | `application/json` | All requests with a body (POST, PATCH, PUT) |

### Authentication Headers (one of)

| Header | Value | When |
|--------|-------|------|
| `Authorization` | `Bearer <accessToken>` | JWT-authenticated requests |
| `X-API-Key` | `fst_<key>` | API key-authenticated requests |

### Optional Headers

| Header | Value | Description |
|--------|-------|-------------|
| `X-Request-ID` | UUID | Client-provided request correlation ID (auto-generated if absent) |

## CORS Configuration

In development, the Vite dev server proxies API requests, so CORS is not an issue. In production:

- **Allowed Origins**: Configured via `CORS_ORIGIN` environment variable
- **Allowed Methods**: `GET, POST, PATCH, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization, X-API-Key, X-Request-ID`
- **Credentials**: `true` (required for httpOnly refresh token cookies)
- **Max Age**: `86400` (24 hours for preflight cache)

## WebSocket API (Socket.IO)

In addition to the REST API, the application provides real-time events via Socket.IO.

### Connection

```javascript
const socket = io('/api/v1', {
  auth: { token: accessToken }
});
```

### Events (Server -> Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `notification:new` | `{ id, title, type }` | New notification received |
| `notification:count` | `{ unread: number }` | Updated unread count |
| `session:revoked` | `{ sessionId }` | Current session was revoked |
| `settings:updated` | `{ key, value }` | System setting changed |

### Authentication

Socket.IO connections are authenticated via the `socket-auth` middleware, which validates the JWT token provided in the `auth` object during the handshake. Connections are rejected with a `401` error if the token is invalid or expired.
