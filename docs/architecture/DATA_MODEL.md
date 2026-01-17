# Data Model

> Database schema documentation for the fullstack template.

## Overview

This template includes a core set of database tables for authentication, user management, and system configuration. All schemas use Drizzle ORM with PostgreSQL.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    │         │              │              │
    ▼         ▼              ▼              ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌──────────┐
│Session │ │ Audit  │ │   Email    │ │ Password │
│        │ │  Log   │ │   Token    │ │  Token   │
└────────┘ └────────┘ └────────────┘ └──────────┘

┌─────────────────┐
│ System Settings │  (standalone)
└─────────────────┘
```

---

## Core Tables

### Users

Primary user account table with authentication and preferences.

```typescript
// src/db/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  // Role & Status
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),

  // Preferences (JSONB for extensibility)
  preferences: jsonb('preferences').$type<UserPreferences>().default(defaultPreferences).notNull(),

  // Timestamps
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Sessions

JWT refresh token storage for authenticated sessions.

```typescript
// src/db/schema/sessions.ts
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: varchar('refresh_token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Email Verification Tokens

Tokens for verifying user email addresses.

```typescript
// src/db/schema/tokens.ts
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Password Reset Tokens

Tokens for secure password reset flow.

```typescript
// src/db/schema/tokens.ts
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Audit Logs

Security event logging for compliance and debugging.

```typescript
// src/db/schema/audit.ts
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: varchar('details', { length: 1000 }),
  success: boolean('success').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Audit Actions:**
- Auth: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `REGISTER`
- Password: `PASSWORD_CHANGE`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_SUCCESS`
- Email: `EMAIL_VERIFICATION_SENT`, `EMAIL_VERIFIED`
- Admin: `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `USER_ACTIVATED`, `USER_DELETED`, `ADMIN_GRANTED`, `ADMIN_REVOKED`

### System Settings

Runtime-configurable application settings.

```typescript
// src/db/schema/settings.ts
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  type: settingTypeEnum('type').notNull().default('string'),
  description: text('description'),
  category: varchar('category', { length: 100 }).default('general'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Setting Types:** `string`, `number`, `boolean`, `json`

---

## Schema Index

All schemas are exported from a central index:

```typescript
// src/db/schema/index.ts
export * from './users.js';
export * from './sessions.js';
export * from './settings.js';
export * from './tokens.js';
export * from './audit.js';
```

---

## Common Query Patterns

### Basic CRUD

```typescript
import { db } from '../lib/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Select
const [user] = await db.select().from(users).where(eq(users.id, userId));

// Insert
const [newUser] = await db.insert(users)
  .values({ email, passwordHash })
  .returning();

// Update
const [updated] = await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, userId))
  .returning();

// Delete
await db.delete(users).where(eq(users.id, userId));
```

### Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users)
    .values({ email, passwordHash })
    .returning();

  await tx.insert(auditLogs).values({
    userId: user.id,
    action: 'REGISTER',
  });

  return user;
});
```

---

## Adding New Tables

1. Create a new schema file in `src/db/schema/`
2. Export from `src/db/schema/index.ts`
3. Run `pnpm db:generate` to create migration
4. Run `pnpm db:migrate` to apply migration

See [GETTING_STARTED.md](../GETTING_STARTED.md) for detailed instructions.
