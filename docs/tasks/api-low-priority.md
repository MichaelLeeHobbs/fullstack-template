# API Layer — Low Priority

**Status:** Phase 3 Complete
**Priority:** Low
**Created:** 2026-02-08
**Files:** See per-phase file lists

---

## Context

The API has no compression, no HTTP caching headers, and validation is done inline in controllers/route handlers rather than via a reusable per-route validation middleware. These are polish items that improve performance and code consistency but are not blocking any features. The existing middleware chain in `app.ts` is: helmet → cors → json parser → urlencoded → pino-http → routes → error handlers.

---

## Phases

### Phase 1: Compression Middleware

**Layer:** Backend
**Files:**
- `apps/api/src/app.ts`
- `apps/api/package.json`

**Dependencies:** Install `compression` and `@types/compression` in `apps/api`

**Changes:**
- Add `compression()` middleware in `app.ts` after `helmet()` and before `express.json()`
- Default config: gzip, threshold 1kb (responses smaller than 1kb are not worth compressing)
- No custom filter needed — the default `filter` function in the `compression` package already skips responses with `Cache-Control: no-transform`

```typescript
import compression from 'compression';
app.use(compression({ threshold: 1024 }));
```

---

### Phase 2: HTTP Caching Headers

**Layer:** Backend
**Files:**
- `apps/api/src/middleware/cache.middleware.ts` (new)
- `apps/api/src/routes/admin.routes.ts`
- `apps/api/src/routes/user.routes.ts`
- `apps/api/src/routes/role.routes.ts`
- `apps/api/src/routes/auth.routes.ts`

**Middleware — `cacheControl(options)`:**
```typescript
type CacheOptions = {
  maxAge?: number;      // seconds, default 0
  private?: boolean;    // default true (user-specific data)
  noStore?: boolean;    // default false
  mustRevalidate?: boolean; // default true
};

function cacheControl(options: CacheOptions): RequestHandler;
```

**Middleware — `noCache()`:**
- Shorthand for `cacheControl({ noStore: true })` — for auth endpoints and mutations

**Middleware — `etag()`:**
- Express has built-in ETag support (`app.set('etag', 'weak')`) — enable this in `app.ts`
- For list endpoints (users, audit logs), the built-in ETag based on response body is sufficient

**Apply per-route:**
- `GET /auth/me` → `noCache()` (always fresh auth state)
- `GET /admin/users` → `cacheControl({ maxAge: 0, mustRevalidate: true, private: true })` (revalidate on every request but allow 304)
- `GET /admin/settings` → `cacheControl({ maxAge: 60, private: true })` (settings change rarely)
- `GET /roles` → `cacheControl({ maxAge: 60, private: true })`
- `GET /roles/permissions` → `cacheControl({ maxAge: 300, private: true })` (permissions are quasi-static)
- All `POST/PATCH/PUT/DELETE` → `noCache()` (mutations)

---

### Phase 3: Request Validation Middleware (Per-Route)

**Layer:** Backend
**Files:**
- `apps/api/src/middleware/validate.middleware.ts` (new)
- `apps/api/src/routes/auth.routes.ts`
- `apps/api/src/routes/account.routes.ts`
- `apps/api/src/routes/admin.routes.ts`
- `apps/api/src/routes/user.routes.ts`
- `apps/api/src/routes/role.routes.ts`
- `apps/api/src/controllers/auth.controller.ts`
- `apps/api/src/controllers/account.controller.ts`
- `apps/api/src/controllers/admin.controller.ts`
- `apps/api/src/controllers/user.controller.ts`
- `apps/api/src/controllers/role.controller.ts`

**Middleware — `validate(schema)`:**
```typescript
type ValidationTarget = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

function validate(schema: ValidationTarget): RequestHandler;
```
- Validates `req.body`, `req.query`, and/or `req.params` against provided Zod schemas
- On failure: returns `400` with `{ success: false, error: z.prettifyError(result.error) }`
- On success: replaces `req.body`/`req.query`/`req.params` with parsed (coerced, defaulted) values
- Replaces the repeated `safeParse` + error check pattern currently duplicated across controllers

**Refactor existing controllers:**
- Move all `schema.safeParse(req.body)` blocks out of controllers
- Attach `validate({ body: loginSchema })` as route middleware instead
- Controllers can then trust `req.body` is already validated and typed

**Example route transformation:**
```typescript
// Before
router.post('/login', authRateLimiter, AuthController.login);
// AuthController.login does: const result = loginSchema.safeParse(req.body); if (!result.success) ...

// After
router.post('/login', authRateLimiter, validate({ body: loginSchema }), AuthController.login);
// AuthController.login directly uses req.body as LoginInput
```

---

## Phase Dependency Order

```
Phase 1 (Compression) — no dependencies, standalone
Phase 2 (Caching) — no dependencies, standalone
Phase 3 (Validation Middleware) — no dependencies, standalone

All three phases are independent and can be implemented in any order.
```

---

## Verification

### After Phase 1
```bash
pnpm build && pnpm lint && pnpm test
# Manual: curl -H "Accept-Encoding: gzip" -v http://localhost:3000/api/v1/admin/users
# Verify Content-Encoding: gzip in response headers for responses > 1kb
```

### After Phase 2
```bash
pnpm build && pnpm lint && pnpm test
# Manual: curl -v http://localhost:3000/api/v1/admin/settings
# Verify Cache-Control header present
# Manual: curl -H "If-None-Match: <etag>" — verify 304 response
```

### After Phase 3
```bash
pnpm build && pnpm lint && pnpm test
# Manual: POST /auth/login with empty body — verify 400 with prettified Zod error
# Manual: POST /auth/login with valid body — verify login succeeds
# Verify no safeParse calls remain in controller files (grep for safeParse in controllers/)
```
