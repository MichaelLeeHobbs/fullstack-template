# Permissions & Authorization

> Role-Based Access Control (RBAC) System

## Overview

This project uses a granular RBAC system with the following principles:

1. **Permissions are atomic** - Each permission represents a single action on a single resource
2. **Permissions are code-defined** - Seeded from code, read-only in database
3. **Roles group permissions** - Roles are configurable via admin UI
4. **System roles are protected** - Cannot be deleted (e.g., Super Admin)
5. **Permissions are cached** - User permissions cached in memory for performance

---

## Permission Naming Convention

Permissions follow the `resource:action` pattern:

```
users:read       # View user list
users:create     # Create new users
users:update     # Edit users
users:delete     # Delete users
settings:read    # View system settings
settings:update  # Modify settings
roles:read       # View roles
roles:create     # Create roles
roles:update     # Edit roles
roles:delete     # Delete roles
audit:read       # View audit logs
```

### Standard Actions

| Action   | Description                    |
|----------|--------------------------------|
| `read`   | View/list resources            |
| `create` | Create new resources           |
| `update` | Modify existing resources      |
| `delete` | Remove resources               |
| `manage` | Full control (used sparingly)  |

---

## Database Schema

### Permissions Table (Seeded)

```typescript
// src/db/schema/permissions.ts
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),      // 'users:read'
  description: varchar('description', { length: 255 }).notNull(), // 'View user list'
  resource: varchar('resource', { length: 50 }).notNull(),        // 'users'
  action: varchar('action', { length: 50 }).notNull(),            // 'read'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Roles Table (CRUD)

```typescript
// src/db/schema/roles.ts
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  isSystem: boolean('is_system').default(false).notNull(), // Protected roles
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));
```

### User Roles Junction

```typescript
// src/db/schema/user-roles.ts
export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));
```

---

## Entity Relationship

```
┌──────────┐       ┌──────────────────┐       ┌─────────────┐
│  Users   │──────<│   user_roles     │>──────│    Roles    │
└──────────┘       └──────────────────┘       └─────────────┘
                                                     │
                                                     │
                                              ┌──────────────────┐
                                              │ role_permissions │
                                              └──────────────────┘
                                                     │
                                                     │
                                              ┌─────────────┐
                                              │ Permissions │
                                              └─────────────┘
```

---

## Default Roles (Seeded)

| Role         | System | Description                          |
|--------------|--------|--------------------------------------|
| Super Admin  | Yes    | All permissions, cannot be deleted   |
| Admin        | No     | User and settings management         |
| User         | No     | Basic authenticated user access      |

---

## Seeded Permissions

```typescript
// src/db/seeds/permissions.seed.ts
export const PERMISSIONS = [
  // Users
  { name: 'users:read', description: 'View user list', resource: 'users', action: 'read' },
  { name: 'users:create', description: 'Create new users', resource: 'users', action: 'create' },
  { name: 'users:update', description: 'Edit users', resource: 'users', action: 'update' },
  { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },

  // Settings
  { name: 'settings:read', description: 'View system settings', resource: 'settings', action: 'read' },
  { name: 'settings:update', description: 'Modify system settings', resource: 'settings', action: 'update' },

  // Roles
  { name: 'roles:read', description: 'View roles', resource: 'roles', action: 'read' },
  { name: 'roles:create', description: 'Create new roles', resource: 'roles', action: 'create' },
  { name: 'roles:update', description: 'Edit roles', resource: 'roles', action: 'update' },
  { name: 'roles:delete', description: 'Delete non-system roles', resource: 'roles', action: 'delete' },

  // Audit
  { name: 'audit:read', description: 'View audit logs', resource: 'audit', action: 'read' },
] as const;
```

---

## Permission Middleware

### Route Protection

```typescript
// src/middleware/permission.middleware.ts
import { PermissionService } from '../services/permission.service.js';

export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const hasPermission = await PermissionService.userHasAnyPermission(
      req.user.id,
      permissions
    );

    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    next();
  };
}
```

### Route Usage

```typescript
// src/routes/admin.routes.ts
import { requirePermission } from '../middleware/permission.middleware.js';

router.get('/users', requirePermission('users:read'), UserController.list);
router.post('/users', requirePermission('users:create'), UserController.create);
router.put('/users/:id', requirePermission('users:update'), UserController.update);
router.delete('/users/:id', requirePermission('users:delete'), UserController.delete);

// Multiple permissions (user needs ANY of these)
router.get('/dashboard', requirePermission('dashboard:read', 'admin:read'), DashboardController.get);
```

---

## Permission Caching

User permissions are cached in memory to avoid repeated database queries:

```typescript
// src/services/permission.service.ts
const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class PermissionService {
  static async getUserPermissions(userId: string): Promise<Set<string>> {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const permissions = await this.fetchUserPermissions(userId);
    permissionCache.set(userId, {
      permissions,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return permissions;
  }

  static invalidateUserCache(userId: string): void {
    permissionCache.delete(userId);
  }

  static invalidateAllCache(): void {
    permissionCache.clear();
  }
}
```

### Cache Invalidation

Invalidate cache when:
- User roles are modified
- Role permissions are modified
- User logs out

---

## Authentication vs Authorization

| Concern           | Layer              | Responsibility                     |
|-------------------|--------------------|------------------------------------|
| **Authentication** | `auth.middleware`  | Verify JWT, attach `req.user`      |
| **Authorization**  | `permission.middleware` | Check user has required permission |

```typescript
// Route with both
router.get(
  '/admin/users',
  authenticate,                      // Must be logged in
  requirePermission('users:read'),   // Must have permission
  UserController.list
);
```

---

## API Responses

```json
// 401 Unauthorized (not logged in)
{
  "success": false,
  "error": "Unauthorized"
}

// 403 Forbidden (logged in but no permission)
{
  "success": false,
  "error": "Forbidden"
}
```

---

## Frontend Integration

### Permission Check Hook

```typescript
// src/hooks/usePermission.ts
export function usePermission(permission: string): boolean {
  const { user } = useAuthStore();
  return user?.permissions?.includes(permission) ?? false;
}

export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuthStore();
  return permissions.some(p => user?.permissions?.includes(p)) ?? false;
}
```

### Conditional Rendering

```tsx
function AdminPanel() {
  const canManageUsers = usePermission('users:read');
  const canManageSettings = usePermission('settings:read');

  return (
    <div>
      {canManageUsers && <UserManagement />}
      {canManageSettings && <SettingsPanel />}
    </div>
  );
}
```

### Protected Routes

```tsx
function ProtectedRoute({ permission, children }) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}
```

---

## Migration from isAdmin

The template previously used a simple `isAdmin` boolean. Migration steps:

1. Create new permission tables
2. Seed permissions and roles
3. Migrate existing admins to Admin role:
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id
   FROM users u, roles r
   WHERE u.is_admin = true AND r.name = 'Admin';
   ```
4. Update auth middleware to load permissions
5. Replace `isAdmin` checks with permission checks
6. Remove `isAdmin` column (optional, can keep for backwards compatibility)

---

## Adding New Permissions

When adding a new feature:

1. Define permissions in seed file:
   ```typescript
   { name: 'posts:read', description: 'View posts', resource: 'posts', action: 'read' },
   { name: 'posts:create', description: 'Create posts', resource: 'posts', action: 'create' },
   ```

2. Run seed to add permissions:
   ```bash
   pnpm db:seed
   ```

3. Assign to appropriate roles via admin UI

4. Add middleware to routes:
   ```typescript
   router.get('/posts', requirePermission('posts:read'), PostController.list);
   ```
