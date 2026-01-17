# Permissions & Authorization

> Last Updated: 2024-12-28

## Overview

This project uses a layered permission system. For MVP (v1), we implement single-user ownership. The architecture is designed to support multi-user collaboration in v2.

---

## MVP (v1): Single-User Ownership

### Principle
- Every resource belongs to exactly one user
- Users can only access their own resources
- No sharing or collaboration

### Implementation

All queries filter by `createdByUserId`:

```typescript
// Service layer - always filter by user
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db';
import { worlds } from '../db/schema';
import { eq } from 'drizzle-orm';

export class WorldService {
  static async getById(userId: string, worldId: string): Promise<Result<World>> {
    return tryCatch(async () => {
      const [world] = await db.select().from(worlds)
        .where(eq(worlds.id, worldId));

      if (!world || world.createdByUserId !== userId) {
        throw new Error('World not found');
      }

      return world;
    });
  }
}
```

### Database Schema (v1)

```typescript
// src/db/schema/worlds.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const worlds = pgTable('worlds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## Future (v2): Role-Based Permissions

### Roles

| Role | Description |
|------|-------------|
| `owner` | Full access, can delete, can manage permissions |
| `editor` | Can create/edit content, cannot delete world |
| `viewer` | Read-only access |

### Permission Table

```typescript
// src/db/schema/permissions.ts
import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { worlds } from './worlds';
import { users } from './users';

export const worldPermissions = pgTable('world_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldId: uuid('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('viewer').notNull(), // owner, editor, viewer
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  worldUserUnique: unique('world_user_unique').on(table.worldId, table.userId),
}));

// Role type
export const Role = {
  Owner: 'owner',
  Editor: 'editor',
  Viewer: 'viewer',
} as const;
export type Role = typeof Role[keyof typeof Role];
```

### Permission Check Helper

```typescript
// src/lib/permissions.ts
import { tryCatch, type Result } from 'stderr-lib';
import { db } from './db';
import { worldPermissions } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export type Permission = 'read' | 'write' | 'delete' | 'manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['read', 'write', 'delete', 'manage'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

export async function checkWorldPermission(
  userId: string,
  worldId: string,
  requiredPermission: Permission
): Promise<Result<void>> {
  return tryCatch(async () => {
    const [permission] = await db.select().from(worldPermissions)
      .where(and(
        eq(worldPermissions.worldId, worldId),
        eq(worldPermissions.userId, userId)
      ));

    if (!permission) {
      throw new Error('Access denied');
    }

    const allowedPermissions = ROLE_PERMISSIONS[permission.role];

    if (!allowedPermissions.includes(requiredPermission)) {
      throw new Error('Insufficient permissions');
    }
  });
}
```

### Usage in Service

```typescript
// v2 service with permission checks
export class WorldService {
  static async update(userId: string, worldId: string, data: UpdateWorldDto): Promise<Result<World>> {
    return tryCatch(async () => {
      const permResult = await checkWorldPermission(userId, worldId, 'write');
      if (!permResult.ok) {
        throw new Error(permResult.error.message);
      }

      const [updated] = await db.update(worlds)
        .set(data)
        .where(eq(worlds.id, worldId))
        .returning();

      return updated;
    });
  }

  static async delete(userId: string, worldId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const permResult = await checkWorldPermission(userId, worldId, 'delete');
      if (!permResult.ok) {
        throw new Error(permResult.error.message);
      }

      await db.delete(worlds).where(eq(worlds.id, worldId));
    });
  }
}
```

---

## Row-Level Security (RLS) - PostgreSQL

For additional database-level protection (v2), enable RLS:

```sql
-- Enable RLS on worlds table
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see worlds they have permission to
CREATE POLICY worlds_select_policy ON worlds
  FOR SELECT
  USING (
    id IN (
      SELECT world_id FROM world_permissions 
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Set user context before queries
SET app.current_user_id = 'user-uuid-here';
```

---

## Resource Hierarchy

Permissions cascade through the hierarchy:

```
World (permission check here)
  └── Epoch (inherits from World)
        └── Entity Epoch State
  └── Entity (inherits from World)
  └── Narrative (inherits from World)
        └── Arc
              └── Chapter
                    └── Scene
```

### Cascade Logic

```typescript
// Check world permission for any nested resource
export async function checkScenePermission(
  userId: string,
  sceneId: string,
  permission: Permission
): Promise<Result<void>> {
  return tryCatch(async () => {
    const [scene] = await db.select()
      .from(scenes)
      .leftJoin(chapters, eq(scenes.chapterId, chapters.id))
      .leftJoin(narratives, eq(chapters.narrativeId, narratives.id))
      .where(eq(scenes.id, sceneId));

    if (!scene) {
      throw new Error('Scene not found');
    }

    const permResult = await checkWorldPermission(userId, scene.narratives.worldId, permission);
    if (!permResult.ok) {
      throw new Error(permResult.error.message);
    }
  });
}
```

---

## Authentication vs Authorization

| Concern | Where | What |
|---------|-------|------|
| **Authentication** | `auth.middleware.ts` | Verify JWT, attach `req.user` |
| **Authorization** | Service layer | Check permissions before action |

```typescript
// Authentication (middleware)
router.use(authenticate);  // All routes require valid token

// Authorization (service)
const permResult = await checkWorldPermission(userId, worldId, 'write');
if (!permResult.ok) { ... }
```

---

## API Response for Permission Errors

```json
// 401 Unauthorized (not logged in)
{
  "success": false,
  "error": "Unauthorized"
}

// 403 Forbidden (logged in but no permission)
{
  "success": false,
  "error": "Access denied"
}

// 404 Not Found (resource doesn't exist OR user has no read access)
{
  "success": false,
  "error": "World not found"
}
```

**Security Note:** Return 404 instead of 403 when checking existence to prevent resource enumeration attacks.

---

## Migration Path: v1 → v2

When enabling multi-user:

1. Create `world_permissions` table
2. Run migration to create `owner` permission for all existing `createdByUserId` entries:
   ```sql
   INSERT INTO world_permissions (id, world_id, user_id, role)
   SELECT gen_random_uuid(), id, created_by_user_id, 'owner'
   FROM worlds;
   ```
3. Update services to use `checkWorldPermission()` instead of `createdByUserId` filter
4. Enable `FEATURE_MULTI_USER` flag

