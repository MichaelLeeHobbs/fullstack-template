# Pagination Guide

> **[Template]** This covers the base template feature. Extend or modify for your project.

All list endpoints that can return large datasets support pagination. This document describes the pagination pattern used across the API.

## Query Parameters

| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `page` | integer | 1 | 1 | -- | Page number to retrieve |
| `limit` | integer | 20 | 1 | 100 | Number of items per page |

All paginated endpoints accept these parameters as query strings. Both values are coerced from strings to integers automatically.

### Default Overrides

Some endpoints override the default `limit`:

| Endpoint | Default Limit | Max Limit |
|----------|---------------|-----------|
| `GET /admin/audit-logs` | 50 | 100 |
| All other paginated endpoints | 20 | 100 |

## Response Format

Paginated responses include a `meta` object alongside the `data` array:

```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "..." },
    { "id": "...", "name": "..." }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### Meta Fields

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Items per page (as requested) |
| `total` | integer | Total number of items matching the query (across all pages) |
| `totalPages` | integer | Total number of pages (`Math.ceil(total / limit)`) |

### Empty Results

When no items match the query, an empty array is returned with zeroed meta:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### Beyond Last Page

Requesting a page number beyond the total pages returns an empty data array:

```
GET /api/v1/admin/users?page=999&limit=20
```

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 999,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Sorting

Many paginated endpoints support sorting via `sortBy` and `sortOrder` query parameters.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sortBy` | string | varies | Field to sort by (endpoint-specific) |
| `sortOrder` | string | `asc` | Sort direction: `asc` or `desc` |

### Available Sort Fields by Endpoint

| Endpoint | Sort Fields |
|----------|-------------|
| `GET /admin/users` | `email`, `createdAt`, `lastLoginAt` |
| `GET /admin/audit-logs` | `createdAt`, `action` |

Other paginated endpoints use a fixed default sort order (typically `createdAt desc`).

### Example

```
GET /api/v1/admin/users?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

---

## Filtering

Most paginated endpoints support filtering to narrow results.

### Admin Users (`GET /admin/users`)

| Filter | Type | Values | Description |
|--------|------|--------|-------------|
| `search` | string | any | Partial match on email |
| `isActive` | string | `"true"`, `"false"` | Filter by active status |
| `isAdmin` | string | `"true"`, `"false"` | Filter by admin status |

**Example**: Active admin users, sorted by most recent login:

```
GET /api/v1/admin/users?isActive=true&isAdmin=true&sortBy=lastLoginAt&sortOrder=desc
```

### Audit Logs (`GET /admin/audit-logs`)

| Filter | Type | Description |
|--------|------|-------------|
| `userId` | string (UUID) | Filter logs by user |

**Example**: Audit logs for a specific user:

```
GET /api/v1/admin/audit-logs?userId=a1b2c3d4-...&limit=50&sortBy=createdAt&sortOrder=desc
```

### API Keys (`GET /api-keys`)

| Filter | Type | Values | Description |
|--------|------|--------|-------------|
| `userId` | string (UUID) | any | Filter by owner |
| `isActive` | string | `"true"`, `"false"` | Filter by active status |

### Notifications (`GET /notifications`)

| Filter | Type | Default | Description |
|--------|------|---------|-------------|
| `unreadOnly` | boolean | `false` | Only return unread notifications |

### Certificate Authorities (`GET /ca`)

| Filter | Type | Values | Description |
|--------|------|--------|-------------|
| `status` | string | `active`, `suspended`, `retired` | Filter by CA status |
| `isRoot` | string | `"true"`, `"false"` | Filter root vs. intermediate CAs |

### Certificates (`GET /certificates`)

| Filter | Type | Values | Description |
|--------|------|--------|-------------|
| `caId` | string (UUID) | any | Filter by issuing CA |
| `status` | string | `active`, `revoked`, `expired`, `suspended` | Filter by status |
| `certType` | string | `server`, `client`, `user`, `ca`, `smime` | Filter by type |
| `search` | string | any | Search by common name (max 255 chars) |

### Certificate Profiles (`GET /profiles`)

| Filter | Type | Values | Description |
|--------|------|--------|-------------|
| `certType` | string | `server`, `client`, `user`, `ca`, `smime` | Filter by type |

### CSRs (`GET /certificates/requests`)

| Filter | Type | Values | Description |
|--------|------|--------|-------------|
| `status` | string | `pending`, `approved`, `rejected` | Filter by status |
| `targetCaId` | string (UUID) | any | Filter by target CA |

### CRL History (`GET /ca/:id/crl/history`)

No additional filters beyond standard pagination parameters.

---

## Paginated Endpoints Reference

| Endpoint | Default Limit | Supports Sorting | Supports Filtering |
|----------|---------------|-------------------|---------------------|
| `GET /admin/users` | 20 | Yes | Yes |
| `GET /admin/audit-logs` | 50 | Yes | Yes |
| `GET /api-keys` | 20 | No | Yes |
| `GET /notifications` | 20 | No | Yes |
| `GET /ca` | 20 | No | Yes |
| `GET /certificates` | 20 | No | Yes |
| `GET /profiles` | 20 | No | Yes |
| `GET /certificates/requests` | 20 | No | Yes |
| `GET /ca/:id/crl/history` | 20 | No | No |

---

## Best Practices

### Iterating Over All Pages

To retrieve all items across pages, use a loop that increments `page` until `page > totalPages`:

```typescript
async function fetchAll<T>(url: string, token: string): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(`${url}?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    allItems.push(...body.data);
    totalPages = body.meta.totalPages;
    page++;
  }

  return allItems;
}
```

### Performance Tips

- Use the maximum `limit` (100) when fetching data for background processing to reduce the number of round trips.
- Apply filters server-side rather than fetching all data and filtering client-side.
- For display purposes, use a reasonable `limit` (10-25) to keep response times fast.
- Cache page results on the client when the data does not change frequently.
