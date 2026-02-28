# Coding Standards

> **[Template]** This covers the base template feature. Extend or modify for your project.

This document defines the coding standards enforced across the fullstack template. All contributors must follow these conventions to maintain consistency.

---

## TypeScript Conventions

### No Enums -- Use Const Objects or Union Types

TypeScript enums have runtime quirks and numeric reverse-mapping issues. Use const objects or union types instead:

```typescript
// BAD -- TypeScript enum
enum Status { Active, Inactive }

// GOOD -- Union type (when no runtime iteration needed)
type Status = 'active' | 'inactive';

// GOOD -- Const object (when you need runtime values or iteration)
const Status = {
  Active: 'active',
  Inactive: 'inactive',
} as const;
type Status = typeof Status[keyof typeof Status];
```

### No `any` -- Use `unknown`

Always prefer `unknown` over `any`. Narrow the type before using it:

```typescript
// BAD
function process(data: any) {
  return data.name;
}

// GOOD
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    return (data as { name: string }).name;
  }
  throw new Error('Invalid data');
}
```

### Strict Compiler Configuration

The project enforces strict TypeScript settings:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- `exactOptionalPropertyTypes: true`
- `forceConsistentCasingInFileNames: true`

### Prefer `const`, Then `let`. Never `var`.

```typescript
const immutableValue = 42;
let mutableCounter = 0;
// Never: var x = 1;
```

### Prefer `readonly` Properties

```typescript
interface User {
  readonly id: string;
  readonly email: string;
}
```

---

## Error Handling -- Result Pattern

Services must **never throw exceptions**. All service methods return `Result<T>` using `tryCatch()` from `stderr-lib`:

```typescript
import { tryCatch, type Result } from 'stderr-lib';

export class ItemService {
  static async getById(id: string): Promise<Result<Item>> {
    return tryCatch(async () => {
      const [item] = await db.select().from(items).where(eq(items.id, id));
      if (!item) throw new Error('Item not found');
      return item;
    });
  }
}
```

Controllers check `result.ok` and translate errors to HTTP responses:

```typescript
const result = await ItemService.getById(id);
if (!result.ok) {
  logger.error({ error: result.error.toString() }, 'Failed to get item');
  return void res.status(404).json({ success: false, error: 'Not found' });
}
res.json({ success: true, data: result.value });
```

The `Result<T>` type:

```typescript
type Result<T, E = StdError> =
  | { ok: true; value: T; error: null }
  | { ok: false; value: null; error: E };
```

For custom error codes, use `ServiceError`:

```typescript
import { ServiceError } from '../lib/service-error.js';

throw new ServiceError('ALREADY_EXISTS', 'Email already exists');
throw new ServiceError('ACCOUNT_LOCKED', 'Account is locked', { minutesRemaining: 10 });
```

---

## Validation -- Zod v4

All request validation uses Zod v4. Import from `zod/v4`:

```typescript
import { z } from 'zod/v4';

const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

// In the controller or validation middleware:
const result = createItemSchema.safeParse(req.body);
if (!result.success) {
  return void res.status(400).json({
    success: false,
    error: z.prettifyError(result.error),
  });
}

const data = result.data; // Fully typed
```

> **Note**: Zod v4 `.uuid()` validates RFC 4122. Fake UUIDs like `00000000-0000-0000-0000-000000000001` will fail validation. Use valid v4 UUIDs in tests (char 13 = `4`, char 17 = `8/9/a/b`), for example: `10000000-0000-4000-8000-000000000001`.

---

## Logging -- Pino

**Never use `console.log`**. All logging must use the Pino logger:

```typescript
import logger from '../lib/logger.js';

// Pino argument order: (object, message) -- NOT (message, object)
logger.info({ userId: user.id, email: user.email }, 'User created');
logger.error({ error: err.toString(), context: { id } }, 'Operation failed');
logger.warn({ attemptCount: 3 }, 'Rate limit approaching');
```

The argument order is enforced by TypeScript types. Putting the message first will cause a compilation error.

---

## File Naming

Use **kebab-case** for all file names with role-based suffixes:

| File Type     | Pattern                        | Example                       |
|---------------|--------------------------------|-------------------------------|
| Service       | `<name>.service.ts`            | `auth.service.ts`             |
| Controller    | `<name>.controller.ts`         | `auth.controller.ts`          |
| Router        | `<name>.routes.ts`             | `auth.routes.ts`              |
| Middleware    | `<name>.middleware.ts`         | `admin.middleware.ts`          |
| Schema        | `<name>.ts` (in `db/schema/`)  | `users.ts`                    |
| Test          | `<name>.<role>.test.ts`        | `auth.service.test.ts`        |
| Hook          | `use<Name>.ts`                 | `usePermission.ts`            |
| Store         | `<name>.store.ts`              | `auth.store.ts`               |

---

## Import Conventions

### Node Built-in Modules

Use the `node:` prefix for built-in modules:

```typescript
import { randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
```

### ESM Extensions

Always include `.js` extensions in relative imports (required by ESM):

```typescript
import { AuthService } from './auth.service.js';
import { db } from '../lib/db.js';
import { users } from '../db/schema/index.js';
```

### Import Order

1. Node built-ins (`node:crypto`, `node:fs`)
2. External packages (`express`, `drizzle-orm`, `zod/v4`)
3. Internal absolute paths (`@fullstack-template/shared`)
4. Relative imports (`./auth.service.js`, `../lib/db.js`)

### Shared Package vs Local Types

Domain types, API response types, and constants shared between frontend and backend must live in `@fullstack-template/shared`:

```typescript
// GOOD -- import from shared package
import type { User, Permission, CertificateAuthority } from '@fullstack-template/shared';
import { PERMISSIONS } from '@fullstack-template/shared';

// BAD -- define locally when the type exists in shared
interface User { id: string; email: string; ... }
```

App-specific types that are only used within one package (e.g., component props, store state, Drizzle schema types) should remain local to that package.

---

## API Response Format

All API responses follow a consistent envelope format:

```typescript
// Success response
{
  "success": true,
  "data": { /* payload */ }
}

// Error response
{
  "success": false,
  "error": "Human-readable error description"
}

// Paginated response
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Controller Pattern

Controllers extract the response data and set the appropriate HTTP status:

```typescript
export class ItemController {
  static async getById(req: Request, res: Response) {
    const result = await ItemService.getById(req.params.id);
    if (!result.ok) {
      return void res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: result.value });
  }
}
```

Note the `return void res.status(...).json(...)` pattern -- the `void` prevents TypeScript from complaining about the return type.

---

## Database Access -- Drizzle ORM

All database access must go through Drizzle ORM. No raw SQL queries:

```typescript
import { db } from '../lib/db.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

// Select
const [user] = await db.select().from(users).where(eq(users.id, userId));

// Insert with returning
const [newUser] = await db.insert(users).values({ email, passwordHash }).returning();

// Update
await db.update(users).set({ isActive: false }).where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));

// Transaction
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ email }).returning();
  await tx.insert(roles).values({ userId: user.id, name: 'default' });
  return user;
});
```

---

## Async/Await

### No Floating Promises

Every promise must be `await`-ed or explicitly voided:

```typescript
// BAD -- floating promise
doAsyncThing();

// GOOD
await doAsyncThing();

// GOOD -- explicitly fire-and-forget
void doAsyncThing();
```

---

## Function Design

- **Single responsibility** -- one function, one purpose
- **Under 50 lines** -- extract into smaller functions if longer
- **Under 5 parameters** -- use an options object for more:

```typescript
// BAD -- too many parameters
function createUser(name: string, email: string, age: number, role: string, team: string) {}

// GOOD -- options object
interface CreateUserOptions {
  name: string;
  email: string;
  age?: number;
  role: string;
}
function createUser(options: CreateUserOptions) {}
```

---

## SQL Template Literals

When using Drizzle SQL template literals, disable the formatter to prevent breakage:

```typescript
const conditions = [
  //@formatter:off
  sql`${users.emailVerifiedAt} IS NOT NULL`,
  sql`${users.lockedUntil} IS NOT NULL`,
  //@formatter:on
];
```

---

## Quick Reference

| Do                              | Do Not                |
|---------------------------------|-----------------------|
| `unknown`                       | `any`                 |
| Union types / const objects     | TypeScript enums      |
| `tryCatch()` + `Result<T>`     | Naked try/catch       |
| `zod/v4` + `prettifyError`     | Manual validation     |
| `await` or `void` promises     | Floating promises     |
| `const` / `let`                | `var`                 |
| Pino structured logging        | `console.log`         |
| Options objects                | 5+ parameters         |
| `.js` extensions in imports    | Extensionless imports |
| `node:` prefix for built-ins   | Bare `crypto`, `fs`   |

---

## Further Reading

- `docs/architecture/CODING_STANDARD.md` -- extended coding standards with compiler configuration details
- `docs/architecture/CORE_PATTERNS.md` -- full architecture patterns (Router, Controller, Service, Model)
