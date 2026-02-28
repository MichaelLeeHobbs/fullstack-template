# Test Utilities Reference

> **[Template]** This covers the base template feature. Extend or modify for your project.

This document is a reference for the shared test utilities located in `apps/api/test/utils/`. All utilities are barrel-exported from `apps/api/test/utils/index.ts`.

---

## Import

All utilities are available from a single import:

```typescript
import {
  // DB mock chain helpers
  mockSelectChain,
  mockSelectWithJoinChain,
  mockInsertChain,
  mockUpdateChain,
  mockUpdateSetWhereChain,
  mockDeleteChain,

  // Express mock helpers
  createMockRequest,
  createMockResponse,
  createMockNext,

  // Data factories
  createTestUser,
  createTestSession,
  createTestRole,
  createTestPermission,
  createTestApiKey,
} from '../../test/utils/index.js';
```

For integration tests, adjust the import path:

```typescript
import { mockSelectChain, createTestUser } from '../utils/index.js';
```

---

## DB Mock Chain Helpers

**Source**: `apps/api/test/utils/mock-db.ts`

These helpers configure Drizzle-style mock return values for chained method calls. Each helper takes a mock function (from the DB mock) and the data to return.

### Prerequisites

Before using chain helpers, you must set up the database mock in your test file:

```typescript
vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(
    async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
      return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
    }
  );
  return {
    db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, transaction: mockTransaction },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});
```

> **Note**: `createMockDbModule()` cannot be used inside `vi.mock()` factories due to hoisting. You must inline the factory as shown above.

---

### `mockSelectChain(mockSelect, data)`

Configures `select().from().where()` to resolve with the given data array.

**Drizzle equivalent**: `db.select().from(table).where(condition)`

```typescript
import { db } from '../lib/db.js';

// Returns a user
const user = createTestUser({ email: 'test@example.com' });
mockSelectChain(db.select as ReturnType<typeof vi.fn>, [user]);

// Returns empty (not found)
mockSelectChain(db.select as ReturnType<typeof vi.fn>, []);
```

---

### `mockSelectWithJoinChain(mockSelect, data)`

Configures `select().from().innerJoin().where()` to resolve with the given data array.

**Drizzle equivalent**: `db.select().from(table).innerJoin(other, condition).where(condition)`

```typescript
// Returns joined data
const joined = { user: { id: 'u1' }, role: { name: 'admin' } };
mockSelectWithJoinChain(db.select as ReturnType<typeof vi.fn>, [joined]);
```

---

### `mockInsertChain(mockInsert, data)`

Configures `insert().values().returning()` to resolve with the given data array.

**Drizzle equivalent**: `db.insert(table).values({ ... }).returning()`

```typescript
// Returns the inserted record
const newUser = createTestUser({ id: 'new-id' });
mockInsertChain(db.insert as ReturnType<typeof vi.fn>, [newUser]);
```

---

### `mockUpdateChain(mockUpdate, data)`

Configures `update().set().where().returning()` to resolve with the given data array.

**Drizzle equivalent**: `db.update(table).set({ ... }).where(condition).returning()`

```typescript
// Returns the updated record
const updatedUser = createTestUser({ isAdmin: true });
mockUpdateChain(db.update as ReturnType<typeof vi.fn>, [updatedUser]);
```

---

### `mockUpdateSetWhereChain(mockUpdate)`

Configures `update().set().where()` to resolve with `undefined` (no returning clause).

**Drizzle equivalent**: `db.update(table).set({ ... }).where(condition)` (void update)

```typescript
// Void update (e.g., updating lastLoginAt)
mockUpdateSetWhereChain(db.update as ReturnType<typeof vi.fn>);
```

---

### `mockDeleteChain(mockDelete)`

Configures `delete().where()` to resolve with `undefined`.

**Drizzle equivalent**: `db.delete(table).where(condition)`

```typescript
// Delete operation
mockDeleteChain(db.delete as ReturnType<typeof vi.fn>);
```

---

### Chain Helper Summary

| Helper                    | Chain Mocked                          | Returns     |
|---------------------------|---------------------------------------|-------------|
| `mockSelectChain`         | `.select().from().where()`            | `data[]`    |
| `mockSelectWithJoinChain` | `.select().from().innerJoin().where()` | `data[]`   |
| `mockInsertChain`         | `.insert().values().returning()`      | `data[]`    |
| `mockUpdateChain`         | `.update().set().where().returning()`  | `data[]`   |
| `mockUpdateSetWhereChain` | `.update().set().where()`             | `undefined` |
| `mockDeleteChain`         | `.delete().where()`                   | `undefined` |

---

## Express Mock Helpers

**Source**: `apps/api/test/utils/mock-express.ts`

These helpers create mock Express `Request`, `Response`, and `NextFunction` objects for controller unit tests.

---

### `createMockRequest(overrides?)`

Creates a mock Express `Request` object with sensible defaults. Pass an overrides object to customize specific fields.

**Signature**:

```typescript
function createMockRequest(overrides?: {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  cookies?: Record<string, string>;
  ip?: string;
  user?: { id: string; email?: string; isAdmin?: boolean };
  sessionId?: string;
}): Request;
```

**Defaults**:

| Property  | Default Value  |
|-----------|----------------|
| `headers` | `{}`           |
| `body`    | `{}`           |
| `params`  | `{}`           |
| `query`   | `{}`           |
| `cookies` | `{}`           |
| `ip`      | `'127.0.0.1'`  |

**Usage**:

```typescript
// Minimal request
const req = createMockRequest();

// With body
const req = createMockRequest({
  body: { email: 'test@example.com', password: 'Password123!' },
});

// With params and authenticated user
const req = createMockRequest({
  params: { id: 'user-1' },
  user: { id: 'user-1', email: 'test@example.com', isAdmin: false },
  sessionId: 'session-1',
});

// With cookies
const req = createMockRequest({
  cookies: { refreshToken: 'some-token' },
});

// With query parameters
const req = createMockRequest({
  query: { page: '1', limit: '20', search: 'admin' },
});

// With custom IP
const req = createMockRequest({
  ip: '192.168.1.100',
});
```

---

### `createMockResponse()`

Creates a mock Express `Response` object that tracks the status code, JSON body, headers, cookies, and cleared cookies. The `status()` and `json()` methods are also spied on for assertion compatibility.

**Signature**:

```typescript
function createMockResponse(): Response & {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
  _cookies: Record<string, { value: string; options?: unknown }>;
  _clearedCookies: string[];
};
```

**Tracked Properties**:

| Property          | Type                                  | Description                  |
|-------------------|---------------------------------------|------------------------------|
| `_status`         | `number`                              | HTTP status code (default: 200) |
| `_json`           | `unknown`                             | JSON response body           |
| `_headers`        | `Record<string, string>`              | Response headers             |
| `_cookies`        | `Record<string, { value, options }>`  | Cookies set via `res.cookie()` |
| `_clearedCookies` | `string[]`                            | Cookie names cleared via `res.clearCookie()` |

**Usage**:

```typescript
const res = createMockResponse();

await MyController.create(req, res as any);

// Assert status
expect(res._status).toBe(201);

// Assert JSON body
expect(res._json).toEqual({
  success: true,
  data: { id: 'new-id', name: 'Test' },
});

// Assert headers
expect(res._headers['X-Custom-Header']).toBe('value');

// Assert cookies
expect(res._cookies['session']).toBeDefined();
expect(res._cookies['session'].value).toBe('token-value');

// Assert cleared cookies
expect(res._clearedCookies).toContain('refreshToken');

// Spy-style assertions
expect(res.status).toHaveBeenCalledWith(201);
expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
```

---

### `createMockNext()`

Creates a mock Express `NextFunction` (a `vi.fn()`). Used primarily in middleware tests.

**Signature**:

```typescript
function createMockNext(): NextFunction;
```

**Usage**:

```typescript
const next = createMockNext();

await myMiddleware(req, res as any, next);

// Assert the middleware called next()
expect(next).toHaveBeenCalled();

// Assert the middleware did NOT call next() (handled the response itself)
expect(next).not.toHaveBeenCalled();

// Assert next was called with an error
expect(next).toHaveBeenCalledWith(expect.any(Error));
```

---

## Data Factories

**Source**: `apps/api/test/utils/factories.ts`

Data factories create complete test objects matching the Drizzle `$inferSelect` types. Each factory provides sensible defaults and accepts an optional overrides object.

---

### `createTestUser(overrides?)`

Creates a complete user record.

**Defaults**:

| Field                 | Default Value                        |
|-----------------------|--------------------------------------|
| `id`                  | `randomUUID()`                       |
| `email`               | `user-<timestamp>@example.com`       |
| `passwordHash`        | `'$2b$12$hashedpassword'`            |
| `accountType`         | `'user'`                             |
| `isAdmin`             | `false`                              |
| `isActive`            | `true`                               |
| `emailVerified`       | `true`                               |
| `preferences`         | `{ theme: 'system' }`               |
| `failedLoginAttempts` | `0`                                  |
| `lockedUntil`         | `null`                               |
| `lastLoginAt`         | `null`                               |
| `createdAt`           | `new Date()`                         |
| `updatedAt`           | `new Date()`                         |

**Usage**:

```typescript
// Default user
const user = createTestUser();

// Admin user
const admin = createTestUser({ isAdmin: true, email: 'admin@example.com' });

// Inactive user
const inactive = createTestUser({ isActive: false });

// Service account (no password)
const service = createTestUser({ accountType: 'service', passwordHash: null });

// Locked user
const locked = createTestUser({
  failedLoginAttempts: 5,
  lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
});

// Unverified email
const unverified = createTestUser({ emailVerified: false });
```

---

### `createTestSession(overrides?)`

Creates a complete session record.

**Defaults**:

| Field          | Default Value                        |
|----------------|--------------------------------------|
| `id`           | `randomUUID()`                       |
| `userId`       | `randomUUID()`                       |
| `refreshToken` | `refresh-<uuid>`                     |
| `userAgent`    | `'Mozilla/5.0 Test'`                |
| `ipAddress`    | `'127.0.0.1'`                       |
| `lastUsedAt`   | `new Date()`                         |
| `expiresAt`    | `new Date()` + 7 days               |
| `createdAt`    | `new Date()`                         |

**Usage**:

```typescript
// Default session
const session = createTestSession();

// Session linked to a specific user
const session = createTestSession({ userId: user.id });

// Expired session
const expired = createTestSession({
  expiresAt: new Date(Date.now() - 1000),
});
```

---

### `createTestRole(overrides?)`

Creates a complete role record.

**Defaults**:

| Field        | Default Value          |
|--------------|------------------------|
| `id`         | `randomUUID()`         |
| `name`       | `role-<timestamp>`     |
| `description`| `'Test role'`          |
| `isSystem`   | `false`                |
| `createdAt`  | `new Date()`           |
| `updatedAt`  | `new Date()`           |

**Usage**:

```typescript
// Default role
const role = createTestRole();

// Named role
const editorRole = createTestRole({ name: 'editor', description: 'Can edit content' });

// System role (cannot be deleted)
const systemRole = createTestRole({ name: 'admin', isSystem: true });
```

---

### `createTestPermission(overrides?)`

Creates a complete permission record.

**Defaults**:

| Field        | Default Value    |
|--------------|------------------|
| `id`         | `randomUUID()`   |
| `name`       | `'users:read'`   |
| `description`| `'Read users'`   |
| `resource`   | `'users'`        |
| `action`     | `'read'`         |
| `createdAt`  | `new Date()`     |

**Usage**:

```typescript
// Default permission
const perm = createTestPermission();

// Custom permission
const writePerm = createTestPermission({
  name: 'posts:write',
  description: 'Write posts',
  resource: 'posts',
  action: 'write',
});
```

---

### `createTestApiKey(overrides?)`

Creates a complete API key record.

**Defaults**:

| Field        | Default Value              |
|--------------|----------------------------|
| `id`         | `randomUUID()`             |
| `userId`     | `randomUUID()`             |
| `name`       | `'Test API Key'`           |
| `prefix`     | `'fst_test'`               |
| `keyHash`    | 64 `'a'` characters        |
| `expiresAt`  | `null`                     |
| `isActive`   | `true`                     |
| `lastUsedAt` | `null`                     |
| `createdAt`  | `new Date()`               |
| `updatedAt`  | `new Date()`               |

**Usage**:

```typescript
// Default API key
const key = createTestApiKey();

// Key for a specific user
const key = createTestApiKey({ userId: user.id, name: 'CI Pipeline Key' });

// Expired key
const expired = createTestApiKey({
  expiresAt: new Date(Date.now() - 1000),
});

// Deactivated key
const deactivated = createTestApiKey({ isActive: false });
```

---

## Combining Utilities: Full Test Example

Here is a complete test demonstrating all three utility categories working together:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(
    async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
      return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
    }
  );
  return {
    db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, transaction: mockTransaction },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});

vi.mock('../services/user.service.js', () => ({
  UserService: { getById: vi.fn(), update: vi.fn() },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { UserController } from './user.controller.js';
import { UserService } from '../services/user.service.js';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
} from '../../test/utils/index.js';

describe('UserController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile()', () => {
    it('should return 200 with user profile', async () => {
      // Factory: create test data
      const user = createTestUser({ id: 'u1', email: 'alice@example.com' });

      // Mock: service returns the user
      (UserService.getById as ReturnType<typeof vi.fn>)
        .mockResolvedValue({ ok: true, value: user });

      // Express mocks: request with authenticated user, response tracker
      const req = createMockRequest({
        user: { id: 'u1', email: 'alice@example.com' },
      });
      const res = createMockResponse();

      // Act
      await UserController.getProfile(req, res as any);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: expect.objectContaining({ email: 'alice@example.com' }),
      });
    });

    it('should return 404 when user not found', async () => {
      (UserService.getById as ReturnType<typeof vi.fn>)
        .mockResolvedValue({ ok: false, error: new Error('User not found') });

      const req = createMockRequest({ user: { id: 'nonexistent' } });
      const res = createMockResponse();

      await UserController.getProfile(req, res as any);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({
        success: false,
        error: expect.any(String),
      });
    });
  });
});
```

---

## File Listing

| File                       | Exports                                                    |
|----------------------------|------------------------------------------------------------|
| `test/utils/mock-db.ts`    | `mockSelectChain`, `mockSelectWithJoinChain`, `mockInsertChain`, `mockUpdateChain`, `mockUpdateSetWhereChain`, `mockDeleteChain` |
| `test/utils/mock-express.ts` | `createMockRequest`, `createMockResponse`, `createMockNext` |
| `test/utils/factories.ts`  | `createTestUser`, `createTestSession`, `createTestRole`, `createTestPermission`, `createTestApiKey` |
| `test/utils/index.ts`      | Barrel re-export of all above                              |
