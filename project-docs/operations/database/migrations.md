# Database Migrations

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Drizzle ORM migration workflow, rollback strategies, and zero-downtime migration practices.

---

## Overview

Database migrations are managed by Drizzle ORM. Schema definitions in TypeScript serve as the source of truth, and Drizzle generates SQL migration files by comparing the current schema against the database state. Migrations are stored as versioned SQL files and applied sequentially.

---

## Migration Workflow

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%
graph LR
    A[Edit Schema<br/>apps/api/src/db/schema/] --> B[Build TypeScript<br/>pnpm build]
    B --> C[Generate Migration<br/>pnpm db:generate]
    C --> D[Review SQL<br/>Check generated file]
    D --> E[Apply Migration<br/>pnpm db:migrate]
    E --> F[Verify<br/>pnpm db:studio]
```

### Step 1: Modify the Schema

Schema files live in `apps/api/src/db/schema/`. Edit the relevant file or create a new one.

```typescript
// apps/api/src/db/schema/example.ts
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const examples = pgTable('examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('examples_name_idx').on(table.name),
]);
```

If creating a new schema file, export it from `apps/api/src/db/schema/index.ts`:

```typescript
export * from './example.js';
```

### Step 2: Generate the Migration

```bash
pnpm db:generate
```

**Important:** This command runs `pnpm build` first. TypeScript must compile successfully before migration generation. If you have type errors, fix them before generating.

The generated migration SQL file appears in the migrations directory with a timestamp prefix.

### Step 3: Review the Generated SQL

Always review the generated SQL before applying. Drizzle generates the migration automatically, but you should verify:

- The SQL matches your intent
- No unintended destructive changes (column drops, table drops)
- Index names are sensible
- Default values are correct

### Step 4: Apply the Migration

```bash
pnpm db:migrate
```

This applies all pending migrations in order. Drizzle tracks which migrations have been applied in a metadata table.

### Step 5: Verify

```bash
pnpm db:studio
```

Open Drizzle Studio in your browser to inspect the schema and data.

---

## Drizzle Schema Conventions

### Index Syntax (Drizzle 0.38.x+)

Indexes are defined as the third argument to `pgTable()`, using an array-returning function:

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => [
  index('users_is_active_idx').on(table.isActive),
]);
```

For tables that also need composite primary keys or other constraints, include them in the same array:

```typescript
export const apiKeyPermissions = pgTable('api_key_permissions', {
  apiKeyId: uuid('api_key_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.apiKeyId, table.permissionId] }),
]);
```

### Column Naming

- Use `snake_case` for database column names: `created_at`, `user_id`
- Use `camelCase` for TypeScript property names: `createdAt`, `userId`
- Drizzle maps between them: `userId: uuid('user_id')`

### Type Exports

Every schema file should export its select and insert types:

```typescript
export type Example = typeof examples.$inferSelect;
export type NewExample = typeof examples.$inferInsert;
```

---

## Rollback Strategies

Drizzle ORM does not generate automatic rollback scripts. You have several options:

### Option 1: Manual Rollback SQL

For each migration, prepare a corresponding rollback script:

```sql
-- Migration: add_status_column.sql
ALTER TABLE examples ADD COLUMN status varchar(20) DEFAULT 'active';

-- Rollback: rollback_add_status_column.sql
ALTER TABLE examples DROP COLUMN status;
```

Store rollback scripts alongside migrations or in a `rollbacks/` directory.

### Option 2: Backup Restore

For destructive changes, restore from a backup taken before the migration:

```bash
# Take a backup before migrating
pg_dump -h localhost -p 5433 -U app -d app -F c -f pre-migration-backup.dump

# Apply migration
pnpm db:migrate

# If something goes wrong, restore
pg_restore -h localhost -p 5433 -U app -d app -c pre-migration-backup.dump
```

### Option 3: Forward Fix

For non-destructive issues, create a new migration that corrects the problem rather than rolling back.

---

## Zero-Downtime Migration Practices

### Safe Operations (No Downtime)

| Operation | Safe? | Notes |
|-----------|-------|-------|
| Add a new table | Yes | No impact on existing queries |
| Add a nullable column | Yes | Existing rows get NULL |
| Add a column with a default | Yes | PostgreSQL 11+ applies defaults without rewriting |
| Add an index (CONCURRENTLY) | Yes | Does not lock the table |
| Add a new constraint (NOT VALID) | Yes | Deferred validation |

### Potentially Dangerous Operations

| Operation | Risk | Mitigation |
|-----------|------|------------|
| Drop a column | Data loss | Ensure no code references the column first. Deploy code removal before migration |
| Rename a column | App breakage | Use a two-phase approach (add new, migrate data, remove old) |
| Add NOT NULL to existing column | Fails if NULLs exist | Backfill data first, then add constraint |
| Drop a table | Data loss | Ensure no code references the table. Backup first |
| Change column type | Lock + potential failure | Create new column, migrate data, swap |

### Two-Phase Migration Pattern

For breaking schema changes, use a multi-deploy approach:

1. **Deploy 1:** Add the new column (nullable), start writing to both old and new
2. **Deploy 2:** Backfill historical data from old to new column
3. **Deploy 3:** Switch reads to the new column, stop writing to the old
4. **Deploy 4:** Drop the old column

---

## Production Migration Procedure

1. **Backup:** Take a full database backup before any migration
2. **Review:** Read the generated SQL carefully
3. **Test:** Apply the migration to a staging environment first
4. **Schedule:** Run migrations during low-traffic periods when possible
5. **Apply:** Run `pnpm db:migrate` (or equivalent in your deployment pipeline)
6. **Verify:** Check application health and run key queries
7. **Monitor:** Watch error rates for 15-30 minutes after migration

---

## Troubleshooting

### "TypeScript must compile before migration generation"

The `db:generate` command runs `pnpm build` first. Fix any TypeScript compilation errors before generating migrations.

### "Migration already applied"

Drizzle tracks applied migrations. If you need to re-apply, check the Drizzle metadata table. Never manually delete migration tracking records in production.

### "Schema drift"

If the database state has diverged from the migration history (e.g., manual SQL changes), you may need to:
1. Generate a new baseline migration
2. Or manually reconcile the differences

### "Index already exists"

If a migration fails because an index already exists, it likely means the index was created manually. Either drop the index first or modify the migration to use `IF NOT EXISTS`.

---

## Related Documentation

- [Database Operations Index](./README.md) - Overview of database documentation
- [Backup & Restore](./backup-restore.md) - Backup procedures before migrations
- [Seed Data](./seed-data.md) - Re-seeding after schema changes
