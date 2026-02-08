# Database Improvements

**Status:** Complete
**Priority:** Medium
**Created:** 2026-02-08
**Completed:** 2026-02-08
**Files:** See per-phase file lists

---

## Context

The database layer uses Drizzle ORM with `pg` (node-postgres) and PostgreSQL 17. The connection is established via `new Pool()` with default settings (no explicit pool size, timeout, or idle configuration). There are no explicit indexes beyond automatic ones from primary keys and unique constraints. No services use transactions, even for multi-step operations like user registration (create user + create verification token + send email). There is no documentation for connection pooling configuration or transaction patterns.

---

## Phases

### Phase 1: Index Optimization

**Layer:** Database
**Files:**
- `apps/api/src/db/schema/users.ts`
- `apps/api/src/db/schema/sessions.ts`
- `apps/api/src/db/schema/audit.ts`
- `apps/api/src/db/schema/roles.ts`
- `apps/api/src/db/schema/user-roles.ts`

**Indexes to add:**

Existing implicit indexes (from PK/UNIQUE — no action needed):
- `users.id` (PK)
- `users.email` (UNIQUE)
- `sessions.id` (PK)
- `sessions.refreshToken` (UNIQUE)
- `emailVerificationTokens.token` (UNIQUE)
- `passwordResetTokens.token` (UNIQUE)
- `systemSettings.key` (UNIQUE)
- `permissions.name` (UNIQUE)
- `roles.name` (UNIQUE)

**New indexes to add (based on actual query patterns in services):**

```typescript
// sessions — looked up by userId on login/refresh/revoke
// AdminService, AuthService: db.select().from(sessions).where(eq(sessions.userId, ...))
index('sessions_user_id_idx').on(sessions.userId)

// audit_logs — filtered by userId, ordered by createdAt DESC
// AdminService.getAuditLogs: .where(eq(auditLogs.userId, ...)).orderBy(desc(auditLogs.createdAt))
index('audit_logs_user_id_idx').on(auditLogs.userId)
index('audit_logs_created_at_idx').on(auditLogs.createdAt)

// user_roles — looked up by userId when loading permissions
// PermissionService: db.select().from(userRoles).where(eq(userRoles.userId, ...))
index('user_roles_user_id_idx').on(userRoles.userId)

// email_verification_tokens — looked up by userId when resending
index('email_verification_tokens_user_id_idx').on(emailVerificationTokens.userId)

// password_reset_tokens — looked up by userId when requesting reset
index('password_reset_tokens_user_id_idx').on(passwordResetTokens.userId)

// users — filtered by isActive in admin queries
// AdminService.getUsers: .where(eq(users.isActive, ...))
index('users_is_active_idx').on(users.isActive)
```

**Implementation:** Add indexes using Drizzle's `index()` in each schema file's table definition, then generate and apply migration.

---

### Phase 2: Transaction Patterns

**Layer:** Backend + Documentation
**Files:**
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/services/account.service.ts`
- `apps/api/src/services/role.service.ts`
- `apps/api/src/services/user-role.service.ts`
- `docs/architecture/CORE_PATTERNS.md`

**Identify operations that should be transactional:**

1. **`AuthService.register()`** — creates user + creates email verification token + triggers email. If token creation fails, orphan user remains.
   ```typescript
   // Current: sequential independent queries
   const [user] = await db.insert(users).values({...}).returning();
   await db.insert(emailVerificationTokens).values({...});

   // Should be:
   return tryCatch(async () => {
     return db.transaction(async (tx) => {
       const [user] = await tx.insert(users).values({...}).returning();
       await tx.insert(emailVerificationTokens).values({...});
       return user;
     });
   });
   ```

2. **`AccountService.resetPassword()`** — deletes token + updates password. If password update fails, token is already consumed.

3. **`AccountService.verifyEmail()`** — deletes token + updates user `emailVerified`. Same issue.

4. **`RoleService.delete()`** — should verify role has no assigned users before deleting (or delete assignments in same transaction).

5. **`UserRoleService.setUserRoles()`** — deletes existing roles + inserts new roles. If insert fails, user has no roles.

**Implementation pattern:**
```typescript
static async register(data: RegisterInput): Promise<Result<User>> {
  return tryCatch(async () => {
    return db.transaction(async (tx) => {
      // All queries use tx instead of db
      const [user] = await tx.insert(users).values({...}).returning();
      await tx.insert(emailVerificationTokens).values({...});
      return user;
    });
  });
}
```

**Documentation update — add to `CORE_PATTERNS.md`:**
- "When to use transactions" section: multi-table writes that must succeed or fail together
- Pattern: `tryCatch` wrapping `db.transaction`
- Note: email/external API calls should happen AFTER the transaction commits, not inside it

---

### Phase 3: Connection Pooling Documentation

**Layer:** Documentation + Backend (minor config)
**Files:**
- `apps/api/src/lib/db.ts`
- `docs/architecture/DEV_ENVIRONMENT.md`
- `docs/architecture/CORE_PATTERNS.md`

**Document current defaults (`pg.Pool` defaults):**
- `max`: 10 connections
- `idleTimeoutMillis`: 10000 (10 seconds)
- `connectionTimeoutMillis`: 0 (no timeout)
- `allowExitOnIdle`: false

**Add explicit configuration in `db.ts`:**
```typescript
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,                      // max connections in pool
  idleTimeoutMillis: 30000,     // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if can't connect in 5s
});
```

**Add pool health monitoring:**
```typescript
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});
```

**Documentation to add to `DEV_ENVIRONMENT.md`:**
- Pool configuration explanation
- How to tune `max` for production (rule of thumb: `max = (num_cores * 2) + spindle_count`)
- Docker PostgreSQL `max_connections` setting (default 100)
- How to monitor pool usage: `pool.totalCount`, `pool.idleCount`, `pool.waitingCount`

**Documentation to add to `CORE_PATTERNS.md`:**
- Database connection pattern section
- Pool lifecycle (app startup → pool created → connections acquired/released → graceful shutdown)
- Graceful shutdown: `pool.end()` in process exit handler

---

## Phase Dependency Order

```
Phase 1 (Indexes) — no dependencies, start first (schema change, generates migration)
Phase 2 (Transactions) — no dependencies, can run in parallel with Phase 1
Phase 3 (Pooling Docs) — no dependencies, can run in parallel

All three phases are independent.
```

---

## Verification

### After Phase 1
```bash
pnpm db:generate        # Should produce migration with CREATE INDEX statements
pnpm db:migrate         # Apply indexes
pnpm build && pnpm lint && pnpm test
# Manual: connect to PostgreSQL and verify indexes exist
# psql -U app -d app -c "\di" (list indexes)
```

### After Phase 2
```bash
pnpm build && pnpm lint && pnpm test
# Manual: register a user, verify both user and verification token are created
# Manual: simulate a failure mid-transaction (e.g., unique constraint) and verify rollback
```

### After Phase 3
```bash
pnpm build && pnpm lint && pnpm test
# Manual: start API, check logs for pool configuration message
# Manual: review documentation for accuracy
```
