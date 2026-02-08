# Task Execution Order

**Created:** 2026-02-08
**Last Updated:** 2026-02-08

This document defines the recommended order for executing all tasks in
`docs/tasks/`. The ordering accounts for cross-task dependencies, file conflicts, and the practical reality that tests and documentation should target stable code.

---

## Guiding Principles

1. **Infrastructure before features.
   ** Pagination helpers, validation middleware, and database indexes improve the foundation that features build on.
2. **Test stable code.** Writing auth service tests before modifying
   `auth.service.ts` for account lockout, 2FA, and service account guards means rewriting those tests. Test after the code stabilizes.
3. **Document last.
   ** The API reference and OpenAPI spec should reflect the final set of routes, not a moving target.
4. **Minimize migration conflicts.** Multiple tasks modify the
   `users` table schema (`api-key-management` adds `accountType`,
   `future-auth` adds `failedLoginAttempts`/
   `lockedUntil`). Running these sequentially avoids migration merge conflicts.
5. **Parallelize where safe.
   ** Independent tasks that touch different files can overlap.

---

## Cross-Task Dependencies

| Dependency                                                     | Reason                                                                                             |
|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `documentation.md` Phase 2 → `api-high-priority.md` Phases 2-3 | OpenAPI spec documents the finalized pagination/filtering patterns                                 |
| `testing.md` Phases 2-4 → all feature tasks                    | Tests should target the final shape of services, controllers, and middleware                       |
| `documentation.md` Phase 1 → all route-adding tasks            | API reference should include all routes (`api-key-management` adds 10 new endpoints)               |
| `api-low-priority.md` Phase 3 → `testing.md` Phase 3           | Validation middleware refactors all controllers — write controller tests against the clean version |

---

## File Conflict Map

These tasks modify the same files. Execute them sequentially (not in parallel):

| File                                         | Modified By                                                                             |
|----------------------------------------------|-----------------------------------------------------------------------------------------|
| `apps/api/src/db/schema/users.ts`            | `api-key-management` Phase 1, `future-auth` Phases 1-3, `database-improvements` Phase 1 |
| `apps/api/src/services/auth.service.ts`      | `api-key-management` Phase 1, `future-auth` Phases 1-2, `database-improvements` Phase 2 |
| `apps/api/src/middleware/auth.middleware.ts` | `api-key-management` Phase 4, `future-auth` Phase 2                                     |
| `apps/api/src/routes/index.ts`               | `api-key-management` Phase 5                                                            |
| `apps/api/src/db/seeds/permissions.ts`       | `api-key-management` Phase 2                                                            |
| `apps/api/src/db/seeds/roles.ts`             | `api-key-management` Phase 2                                                            |
| Controllers (all)                            | `api-low-priority` Phase 3 (validation middleware refactor)                             |
| Routes (all)                                 | `api-low-priority` Phase 2 (caching headers)                                            |

---

## Execution Order

### Step 1: Database Improvements -- COMPLETE

**Task:** `database-improvements.md` (all 3 phases)
**Priority:** Medium
**Completed:** 2026-02-08
**Why first:
** Indexes, transactions, and pooling make the existing codebase more robust. No API surface changes, no new routes, no frontend work. Pure infrastructure hardening that every subsequent task benefits from. Transaction patterns in
`auth.service.ts` should be in place before adding more complexity to that file.

- Phase 1: Index optimization (schema change + migration)
- Phase 2: Transaction patterns (wrap multi-step operations)
- Phase 3: Connection pooling docs

**Verification:**
`pnpm db:generate && pnpm db:migrate && pnpm build && pnpm lint && pnpm test`

---

### Step 2: API High Priority (Phases 1-3) -- COMPLETE

**Task:** `api-high-priority.md` Phases 1-3
**Priority:** High
**Completed:** 2026-02-08
**Why now:
** Request ID tracking, pagination helpers, and filtering utilities are infrastructure that the API key management endpoints and admin queries will use. Get these patterns in place before building new features on top.

- Phase 1: Request ID middleware (`X-Request-ID`)
- Phase 2: Pagination helpers (reusable schema + offset/result builders)
- Phase 3: Filtering and sorting utilities

**Verification:** `pnpm build && pnpm lint && pnpm test`

**Note:
** Phase 4 (OpenAPI/Swagger) is deferred to Step 7 — it should document the finalized routes, including API key endpoints.

---

### Step 3: API Low Priority — Validation Middleware Only -- COMPLETE

**Task:** `api-low-priority.md` Phase 3
**Priority:** Low (but do it now)
**Completed:** 2026-02-08
**Why now:** This refactors all controllers to move Zod validation from inline
`safeParse` blocks into route-level `validate()` middleware. Doing this
*before* writing new controllers (API key management) means the new code follows the clean pattern from the start, and existing controllers are cleaner for when we write tests later.

- Phase 3: Create
  `validate()` middleware, refactor all existing controllers and routes

**Verification:** `pnpm build && pnpm lint && pnpm test`

---

### Step 4: API Key Management -- COMPLETE

**Task:** `api-key-management.md` (all 8 phases)
**Priority:** High
**Completed:** 2026-02-08
**Why now:** Largest feature task. Modifies `users.ts` schema (nullable
`passwordHash`,
`accountType` column), adds new tables, services, middleware changes, routes, and full frontend UI. Best done before
`future-auth` since both modify `auth.service.ts` and
`users.ts` — API key management's changes are more structural (nullable
`passwordHash` affects login guards).

- Phase 1: Database schema (users changes, new tables, migration)
- Phase 2: Seed data (8 new permissions)
- Phase 3: Backend services (`ApiKeyService`, `ServiceAccountService`)
- Phase 4: Auth middleware (X-API-Key handling)
- Phase 5: Controller, schemas, routes (10 new endpoints)
- Phase 6: Frontend types, API client, hooks
- Phase 7: Frontend UI (admin pages, profile self-service)
- Phase 8: Tests (service + middleware tests)

**Verification:**
`pnpm docker:reset && pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm build && pnpm lint && pnpm test`

---

### Step 5: Future Auth -- COMPLETE

**Task:** `future-auth.md` (all 3 phases)
**Priority:** High
**Completed:** 2026-02-08
**Why now:** After API key management, `auth.service.ts` and
`users.ts` have their structural changes in place. Future auth builds on top with additional columns and service logic. All three phases are independent of each other.

- Phase 1: Account lockout (new columns on users,
  `AccountLockoutService`, system settings)
- Phase 2: Two-Factor Authentication (new
  `user_2fa` table, TOTP, backup codes, modified login flow)
- Phase 3: Session management UI (new columns on sessions,
  `SessionService`, frontend page)

**Verification:**
`pnpm docker:reset && pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm build && pnpm lint && pnpm test`

---

### Step 6: Testing -- COMPLETE

**Task:** `testing.md` (all 4 phases)
**Priority:** High
**Completed:** 2026-02-08
**Why now:
** All feature work that modifies services, controllers, and middleware is complete. Tests written now target the final code shape and won't need rewriting. The test utilities (Phase 1) are prerequisites for all other test phases.

- Phase 1: Test utilities and factories (mock-db, mock-express, data factories)
- Phase 2: Auth service tests (~23 tests covering login, register, refresh, logout including lockout/2FA/service account guards)
- Phase 3: Controller tests (~86 tests across all 8 controllers)
- Phase 4: Integration tests (~16 tests with supertest)

**Verification:** `pnpm test && pnpm build && pnpm lint`

---

### Step 7: API High Priority — OpenAPI/Swagger -- COMPLETE

**Task:** `api-high-priority.md` Phase 4 (also referenced by
`documentation.md` Phase 2)
**Priority:** High
**Why now:
** All routes exist (including API key endpoints). Pagination, filtering, and validation middleware patterns are finalized. The OpenAPI spec can document everything in its final form.

- Phase 4: Install `swagger-jsdoc` +
  `swagger-ui-express`, annotate all routes, mount at `/api/docs`

**Verification:** `pnpm build && pnpm lint && pnpm test` + manual check at
`http://localhost:3000/api/docs`

---

### Step 8: Documentation (High Priority Phases) -- COMPLETE

**Task:** `documentation.md` Phase 1
**Priority:** High
**Completed:** 2026-02-08
**Why now:
** All routes are finalized and the OpenAPI spec exists. The API reference documents everything in one place.

- Phase 1: API endpoint reference (`docs/API_REFERENCE.md`) — all routes including API key management

**Verification:** Cross-check every route in `apps/api/src/routes/` against the reference document.

---

### Step 9: API Low Priority (Remaining Phases)

**Task:** `api-low-priority.md` Phases 1-2
**Priority:** Low
**Why now:
** Compression and caching are performance polish. No functional changes, no new routes. Safe to add after all features and tests are in place.

- Phase 1: Compression middleware (`compression` package, 1kb threshold)
- Phase 2: HTTP caching headers (`cacheControl()`, `noCache()`, ETag support)

**Verification:** `pnpm build && pnpm lint && pnpm test`

---

### Step 10: Documentation (Low Priority Phases)

**Task:** `documentation.md` Phases 3-5
**Priority:** Low
**Why now:
** The codebase is feature-complete and tested. These docs capture the final state for production deployment.

- Phase 3: Database schema diagram (Mermaid ERD in
  `DATA_MODEL.md` — including api_keys, user_2fa tables)
- Phase 4: Deployment guide (`docs/DEPLOYMENT.md`)
- Phase 5: Production checklist (`docs/PRODUCTION_CHECKLIST.md`)

**Verification:** Review docs for accuracy against actual codebase.

---

## Summary Table

| Step | Task                                    | Priority | Phases | Est. Files Changed |
|------|-----------------------------------------|----------|--------|--------------------|
| 1    | Database Improvements                   | Medium   | 1-3    | ~8                 |
| 2    | API High Priority                       | High     | 1-3    | ~10                |
| 3    | API Low Priority (validation only)      | Low      | 3      | ~12                |
| 4    | API Key Management                      | High     | 1-8    | ~24                |
| 5    | Future Auth                             | High     | 1-3    | ~20                |
| 6    | Testing                                 | High     | 1-4    | ~12                |
| 7    | API High Priority (OpenAPI)             | High     | 4      | ~8                 |
| 8    | Documentation (API Reference)           | High     | 1      | ~2                 |
| 9    | API Low Priority (compression, caching) | Low      | 1-2    | ~7                 |
| 10   | Documentation (deploy, checklist, ERD)  | Low      | 3-5    | ~4                 |

**Total estimated files:
** ~13 new, ~25+ modified (some modified multiple times across steps)

---

## Notes

- Steps 1-3 are infrastructure. If time is limited, these give the highest bang-for-buck.
- Steps 4-5 are the two major feature additions. They could theoretically be swapped, but API key management's structural changes to
  `users.ts` (nullable `passwordHash`) make it cleaner to go first.
- Step 6 (testing) deliberately comes after all feature work. Writing tests against a moving target wastes effort.
- Steps 7-10 are documentation and polish. They have the lowest risk and can be deprioritized if needed.
- Each step should be committed independently. Smaller, focused commits make rollback easier.
