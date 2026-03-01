# Coding Standard

> **Note:** For extended coding standards with additional examples, see [project-docs/developer/coding-standards.md](../../project-docs/developer/coding-standards.md).

> Concise TypeScript coding standards for this project.

---

## 1. Compiler Configuration

```json
// tsconfig.json (strict settings)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

---

## 2. Type Safety

### No `any` - Use `unknown`

```typescript
// ❌ BAD
function process(data: any) { ...
}

// ✅ GOOD
function process(data: unknown) {
    if (typeof data === 'string') { ...
    }
}
```

### No Traditional Enums - Use Const Objects or Union Types

```typescript
// ❌ BAD - TypeScript enums have quirks
enum Status { Active, Inactive }

// ✅ GOOD - Union type
type Status = 'active' | 'inactive';

// ✅ GOOD - Const object (when you need runtime values)
const Status = {
    Active: 'active',
    Inactive: 'inactive',
} as const;
type Status = typeof Status[keyof typeof Status];
```

---

## 3. Error Handling with stderr-lib

Use `tryCatch()` for Result-based error handling. No floating try/catch.

```typescript
import {tryCatch, stderr} from 'stderr-lib';

// ✅ Route handlers
const result = await tryCatch(async () => {
    return await UserService.create(data);
});

if (!result.ok) {
    logger.error('Failed', {error: result.error.toString()});
    return void res.status(500).json({success: false, error: 'Internal error'});
}

res.json({success: true, data: result.value});

// ✅ Normalizing unknown errors
catch
(error: unknown)
{
    const err = stderr(error);
    logger.error('Operation failed', {error: err.toString()});
}
```

**Result Type:**

```typescript
type Result<T, E = StdError> =
    | { ok: true; value: T; error: null }
    | { ok: false; value: null; error: E };
```

---

## 4. Validation with Zod v4

```typescript
import {z} from 'zod/v4';

const schema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
});

const result = schema.safeParse(req.body);
if (!result.success) {
    return void res.status(400).json({
        success: false,
        error: z.prettifyError(result.error)
    });
}

const data = result.data; // Typed!
```

---

## 5. Async/Await

### No Floating Promises

```typescript
// ❌ BAD - Promise ignored
doAsyncThing();

// ✅ GOOD - Awaited
await doAsyncThing();

// ✅ GOOD - Explicitly ignored
void doAsyncThing();
```

### Timeouts for External Calls

```typescript
// ✅ AI API calls need timeouts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
    const response = await fetch(url, {signal: controller.signal});
} finally {
    clearTimeout(timeout);
}
```

---

## 6. Resource Management

### Explicit Disposal

```typescript
// ✅ Clean up resources
const connection = await db.connect();
try {
    await connection.query(...);
} finally {
    await connection.release();
}

// ✅ Or use using (TS 5.2+)
    await using connection = await db.connect();
```

### Scoped Variables Only

```typescript
// ❌ BAD - var hoists
var x = 1;

// ✅ GOOD
const x = 1;  // Prefer const
let y = 2;    // When reassignment needed
```

---

## 7. Immutability

```typescript
// ✅ Prefer readonly
interface User {
    readonly id: string;
    readonly email: string;
}

// ✅ Prefer immutable operations
const newArray = [...oldArray, newItem];
const newObject = {...oldObject, updatedField: value};
```

---

## 8. Logging with Pino

```typescript
import logger from '../lib/logger';

// ✅ Structured logging
logger.info('User created', {userId: user.id, email: user.email});
logger.error('Operation failed', {error: err.toString(), context: {...}});

// ❌ No console.log in production code
console.log('debugging...');
```

---

## 9. Function Design

- **Single responsibility** - one function, one purpose
- **< 50 lines** - extract if longer
- **< 5 parameters** - use options object if more
- **Pure when possible** - no side effects

```typescript
// ❌ BAD - Too many params
function createUser(name, email, age, role, team, manager) { ...
}

// ✅ GOOD - Options object
interface CreateUserOptions {
    name: string;
    email: string;
    age?: number;
    role: UserRole;
}

function createUser(options: CreateUserOptions) { ...
}
```

---

## 10. Documentation

```typescript
/**
 * Creates a new user in the system.
 *
 * @param options - User creation options
 * @returns Result containing the created user or error
 *
 * @example
 * const result = await createUser({ email: 'test@example.com', name: 'Test' });
 */
function createUser(options: CreateUserOptions): Promise<Result<User>> { ...
}
```

---

## 11. Testing

- Unit tests for services/handlers
- Integration tests for API routes
- Aim for 80%+ coverage on business logic
- Use Vitest for consistency with Vite

```typescript
import {describe, it, expect} from 'vitest';

describe('UserService', () => {
    it('should create user with valid data', async () => {
        const result = await UserService.create({...});
        expect(result.ok).toBe(true);
    });
});
```

---

## 12. Dependency Management

- **Pin versions** - Use exact versions in `package.json`
- **Lock files** - Always commit `pnpm-lock.yaml`
- **Regular updates** - Monthly dependency review

```json
{
  "dependencies": {
    "express": "4.21.0", // ✅ Pinned
    "zod": "^3.24.0"      // ❌ Floating (use 3.24.0)
  }
}
```

---

## 13. SQL Template Literals and Formatter Control

WebStorm's formatter can break Drizzle SQL template literals. Use formatter comments to preserve them:

```typescript
// ❌ BAD - Formatter may break these
const conditions = [
  sql`${users.emailVerifiedAt} IS NOT NULL`,
  sql`${users.lockedUntil} IS NOT NULL`,
];

// ✅ GOOD - Disable formatter for SQL template literals
const conditions = [
  //@formatter:off
  sql`${users.emailVerifiedAt} IS NOT NULL`,
  sql`${users.lockedUntil} IS NOT NULL`,
  //@formatter:on
];

// ✅ GOOD - Also for complex SQL expressions
const result = await db.select()
  .from(entities)
  .where(and(
    eq(entities.worldId, worldId),
    //@formatter:off
    sql`${entities.aliases}::jsonb @> ${JSON.stringify([searchTerm])}::jsonb`,
    sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${entities.aliases}) AS alias WHERE LOWER(alias) LIKE ${pattern})`,
    //@formatter:on
  ));
```

### When to Use

- SQL template literals with embedded expressions
- Complex raw SQL fragments
- JSONB operations and array queries
- Any SQL that spans multiple lines or has special formatting

---

## Quick Reference

| Do                              | Don't             |
|---------------------------------|-------------------|
| `unknown`                       | `any`             |
| Union types / const objects     | TypeScript enums  |
| `tryCatch()` + Result           | Naked try/catch   |
| `zod/v4` + `prettifyError`      | Manual validation |
| `await` or `void` promises      | Floating promises |
| `const` / `let`                 | `var`             |
| Structured logging              | `console.log`     |
| Options objects                 | 5+ parameters     |
| `//@formatter:off` for SQL      | Let formatter break SQL |

