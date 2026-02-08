# API Layer — High Priority

**Status:** Draft
**Priority:** High
**Created:** 2026-02-08
**Files:** See per-phase file lists

---

## Context

The API layer has a solid foundation (Express, helmet, cors, pino-http, rate limiting, Zod validation) but lacks reusable infrastructure for common API concerns. Pagination exists in `AdminService.getUsers()` and `AdminService.getAuditLogs()` but is implemented inline with duplicated logic. There is no request ID tracking for correlating logs across services, no reusable pagination/filtering/sorting helpers, and no OpenAPI documentation. Each controller manually builds pagination queries and response shapes.

---

## Phases

### Phase 1: Request ID Tracking (X-Request-ID)

**Layer:** Backend
**Files:**
- `apps/api/src/middleware/request-id.middleware.ts` (new)
- `apps/api/src/app.ts`
- `apps/api/src/lib/logger.ts`

**Middleware — `requestId()`:**
- Read `X-Request-ID` header from incoming request (if provided by load balancer/client)
- If not present, generate a UUID v4
- Attach to `req.id` (Express `Request` augmentation)
- Set `X-Request-ID` response header
- Pass request ID to pino-http logger context so all log lines for a request include `requestId`

**Integration:**
- Add middleware to `app.ts` before route mounting (after `express.json()`, before pino-http)
- Update pino-http config in `app.ts` to include `requestId` in log serializer via `customProps: (req) => ({ requestId: req.id })`

**Type augmentation:**
- Extend Express `Request` interface to include `id: string` (in existing type augmentation file or new `src/types/express.d.ts`)

---

### Phase 2: Pagination Helpers

**Layer:** Backend
**Files:**
- `apps/api/src/lib/pagination.ts` (new)
- `apps/api/src/schemas/pagination.schema.ts` (new)
- `apps/api/src/services/admin.service.ts`
- `apps/api/src/controllers/admin.controller.ts`

**Shared Zod schema — `paginationSchema`:**
```typescript
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```
- Replaces duplicated pagination parsing in `admin.controller.ts` user list and audit log schemas

**Pagination helper — `paginate()`:**
```typescript
type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T>;

function paginationToOffset(page: number, limit: number): { offset: number; limit: number };
```

**Refactor existing code:**
- `AdminService.getUsers()`: replace inline offset calculation `(page - 1) * limit` and response shaping with `paginationToOffset()` and `buildPaginationResult()`
- `AdminService.getAuditLogs()`: same refactor
- `AdminController`: use shared `paginationSchema` via `.merge()` with endpoint-specific schemas

---

### Phase 3: Filtering and Sorting Utilities

**Layer:** Backend
**Files:**
- `apps/api/src/lib/query.ts` (new)
- `apps/api/src/schemas/query.schema.ts` (new)
- `apps/api/src/services/admin.service.ts`
- `apps/api/src/controllers/admin.controller.ts`

**Sorting schema and helper:**
```typescript
const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

**Sorting helper — `buildOrderBy()`:**
```typescript
function buildOrderBy(
  table: PgTable,
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc',
  allowedColumns: string[],
  defaultColumn: string
): SQL;
```
- Validates `sortBy` against `allowedColumns` whitelist (prevents SQL injection via column name)
- Falls back to `defaultColumn` if `sortBy` is not provided or not in the whitelist
- Returns a Drizzle `asc()` or `desc()` expression

**Filtering helper — `buildWhereConditions()`:**
```typescript
function buildWhereConditions(
  filters: Record<string, unknown>,
  columnMap: Record<string, { column: PgColumn; operator: 'eq' | 'like' | 'gte' | 'lte' }>
): SQL | undefined;
```
- Takes validated filter values and a mapping of filter names to Drizzle columns and operators
- Returns combined `and()` condition or `undefined` if no filters active
- Handles `like` with `%${value}%` wrapping

**Refactor existing code:**
- `AdminService.getUsers()`: replace inline `search`/`isActive`/`isAdmin` filter building with `buildWhereConditions()` and `buildOrderBy()`
- `AdminService.getAuditLogs()`: replace inline `userId` filter and hardcoded `desc(auditLogs.createdAt)` with helpers
- Update admin schemas to merge `sortSchema` for endpoints that support sorting

---

### Phase 4: OpenAPI/Swagger Documentation

**Layer:** Backend
**Files:**
- `apps/api/src/lib/swagger.ts` (new)
- `apps/api/src/app.ts`
- `apps/api/src/routes/*.ts` (all route files — add JSDoc annotations)
- `apps/api/package.json`

**Dependencies:** Install `swagger-jsdoc` and `swagger-ui-express` in `apps/api`

**Swagger config — `swagger.ts`:**
- OpenAPI 3.0 spec
- Info: title, version, description from package.json
- Servers: `http://localhost:3000/api/v1`
- Security schemes: Bearer JWT
- Tags: Auth, Account, Users, Admin, Roles, Sessions, Settings, Audit
- Component schemas generated from Zod schemas using `zod-openapi` or manually defined

**Integration in `app.ts`:**
- Mount Swagger UI at `/api/docs` using `swagger-ui-express`
- Mount raw spec at `/api/docs/json` for client generation
- Only enable in non-production environments (gate behind `NODE_ENV !== 'production'`)

**Route annotations:**
- Add JSDoc `@openapi` comments to each route handler with:
  - Summary and description
  - Request body schema (referencing Zod schemas)
  - Response schemas (success and error shapes)
  - Security requirements
  - Tags
- Annotate all routes in: `auth.routes.ts`, `account.routes.ts`, `user.routes.ts`, `admin.routes.ts`, `role.routes.ts`

**Standard response schemas to define:**
```yaml
SuccessResponse:
  properties:
    success: { type: boolean, enum: [true] }
    data: { type: object }

ErrorResponse:
  properties:
    success: { type: boolean, enum: [false] }
    error: { type: string }

PaginatedResponse:
  properties:
    success: { type: boolean }
    data:
      properties:
        data: { type: array }
        pagination:
          properties:
            page: { type: integer }
            limit: { type: integer }
            total: { type: integer }
            totalPages: { type: integer }
```

---

## Phase Dependency Order

```
Phase 1 (Request ID) — no dependencies, start first (smallest scope, highest value)
Phase 2 (Pagination) — no dependencies, can run in parallel with Phase 1
Phase 3 (Filtering/Sorting) — depends on Phase 2 (builds on pagination schema patterns)
Phase 4 (OpenAPI) — depends on Phases 2 and 3 (documents the finalized query patterns)
```

---

## Verification

### After Phase 1
```bash
pnpm build && pnpm lint && pnpm test
# Manual: curl -v http://localhost:3000/health — verify X-Request-ID in response headers
# Manual: check pino logs include requestId field
```

### After Phase 2
```bash
pnpm build && pnpm lint && pnpm test
# Manual: GET /api/v1/admin/users?page=1&limit=5 — verify pagination response shape unchanged
```

### After Phase 3
```bash
pnpm build && pnpm lint && pnpm test
# Manual: GET /api/v1/admin/users?sortBy=email&sortOrder=asc — verify sorting works
# Manual: GET /api/v1/admin/users?sortBy=DROP_TABLE — verify rejected (not in whitelist)
```

### After Phase 4
```bash
pnpm build && pnpm lint && pnpm test
# Manual: open http://localhost:3000/api/docs — verify Swagger UI loads with all endpoints
# Manual: try "Try it out" on a public endpoint (e.g., POST /auth/login)
```
