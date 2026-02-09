// ===========================================
// Permission Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockSelectDistinct = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      select: mockSelect,
      selectDistinct: mockSelectDistinct,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
    __mocks: { mockSelect, mockSelectDistinct, mockInsert, mockUpdate, mockDelete },
  };
});

vi.mock('../lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { PermissionService } from './permission.service.js';
import { db } from '../lib/db.js';

// Access internal selectDistinct mock
const mockSelectDistinct = (db as any).selectDistinct ?? (await import('../lib/db.js') as any).__mocks?.mockSelectDistinct;

describe('PermissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the internal cache between tests
    PermissionService.invalidateAllCache();
  });

  describe('getAll()', () => {
    it('should return all permissions ordered', async () => {
      const perms = [
        { id: 'p1', name: 'users:read', description: 'Read users', resource: 'users', action: 'read', createdAt: new Date() },
        { id: 'p2', name: 'users:write', description: 'Write users', resource: 'users', action: 'write', createdAt: new Date() },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(perms),
        }),
      });

      const result = await PermissionService.getAll();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('getAllGrouped()', () => {
    it('should return permissions grouped by resource', async () => {
      const perms = [
        { id: 'p1', name: 'roles:read', description: 'Read roles', resource: 'roles', action: 'read', createdAt: new Date() },
        { id: 'p2', name: 'users:read', description: 'Read users', resource: 'users', action: 'read', createdAt: new Date() },
        { id: 'p3', name: 'users:write', description: 'Write users', resource: 'users', action: 'write', createdAt: new Date() },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(perms),
        }),
      });

      const result = await PermissionService.getAllGrouped();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Object.keys(result.value)).toEqual(['roles', 'users']);
        expect(result.value.users).toHaveLength(2);
        expect(result.value.roles).toHaveLength(1);
      }
    });
  });

  describe('getUserPermissions()', () => {
    it('should fetch permissions from DB on first call', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { permissionName: 'users:read' },
                { permissionName: 'users:write' },
              ]),
            }),
          }),
        }),
      });

      const permissions = await PermissionService.getUserPermissions('user-1');

      expect(permissions).toBeInstanceOf(Set);
      expect(permissions.has('users:read')).toBe(true);
      expect(permissions.has('users:write')).toBe(true);
    });

    it('should return cached result on second call', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { permissionName: 'users:read' },
              ]),
            }),
          }),
        }),
      });

      // First call populates cache
      await PermissionService.getUserPermissions('user-1');

      // Second call should use cache
      const permissions = await PermissionService.getUserPermissions('user-1');

      expect(permissions.has('users:read')).toBe(true);
      // selectDistinct should have been called once (first call)
      expect(db.selectDistinct).toHaveBeenCalledTimes(1);
    });
  });

  describe('userHasPermission()', () => {
    it('should return true when user has the permission', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { permissionName: 'users:read' },
              ]),
            }),
          }),
        }),
      });

      const result = await PermissionService.userHasPermission('user-1', 'users:read');

      expect(result).toBe(true);
    });

    it('should return false when user does not have the permission', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await PermissionService.userHasPermission('user-1', 'admin:delete');

      expect(result).toBe(false);
    });
  });

  describe('userHasAnyPermission()', () => {
    it('should return true when user has at least one permission', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { permissionName: 'users:read' },
              ]),
            }),
          }),
        }),
      });

      const result = await PermissionService.userHasAnyPermission('user-1', ['users:read', 'admin:delete']);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await PermissionService.userHasAnyPermission('user-1', ['admin:delete', 'admin:write']);

      expect(result).toBe(false);
    });
  });

  describe('userHasAllPermissions()', () => {
    it('should return true when user has all permissions', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { permissionName: 'users:read' },
                { permissionName: 'users:write' },
              ]),
            }),
          }),
        }),
      });

      const result = await PermissionService.userHasAllPermissions('user-1', ['users:read', 'users:write']);

      expect(result).toBe(true);
    });

    it('should return false when user is missing a permission', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { permissionName: 'users:read' },
              ]),
            }),
          }),
        }),
      });

      const result = await PermissionService.userHasAllPermissions('user-1', ['users:read', 'users:write']);

      expect(result).toBe(false);
    });
  });

  describe('getUserRolesWithPermissions()', () => {
    it('should return roles grouped with their permissions', async () => {
      const data = [
        { roleName: 'admin', permissionName: 'users:read' },
        { roleName: 'admin', permissionName: 'users:write' },
        { roleName: 'viewer', permissionName: 'users:read' },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(data),
              }),
            }),
          }),
        }),
      });

      const result = await PermissionService.getUserRolesWithPermissions('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        const adminRole = result.value.find((r) => r.role === 'admin');
        expect(adminRole?.permissions).toHaveLength(2);
        const viewerRole = result.value.find((r) => r.role === 'viewer');
        expect(viewerRole?.permissions).toHaveLength(1);
      }
    });

    it('should handle roles without permissions', async () => {
      const data = [
        { roleName: 'empty-role', permissionName: null },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(data),
              }),
            }),
          }),
        }),
      });

      const result = await PermissionService.getUserRolesWithPermissions('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.permissions).toHaveLength(0);
      }
    });
  });

  describe('cache management', () => {
    it('invalidateUserCache() should clear specific user cache', async () => {
      // Populate cache
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ permissionName: 'users:read' }]),
            }),
          }),
        }),
      });

      await PermissionService.getUserPermissions('user-1');
      expect(db.selectDistinct).toHaveBeenCalledTimes(1);

      // Invalidate cache for this user
      PermissionService.invalidateUserCache('user-1');

      // Next call should hit DB again
      await PermissionService.getUserPermissions('user-1');
      expect(db.selectDistinct).toHaveBeenCalledTimes(2);
    });

    it('invalidateUsersCache() should clear multiple users', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ permissionName: 'users:read' }]),
            }),
          }),
        }),
      });

      await PermissionService.getUserPermissions('user-1');
      await PermissionService.getUserPermissions('user-2');

      PermissionService.invalidateUsersCache(['user-1', 'user-2']);

      // Both should need to fetch again
      await PermissionService.getUserPermissions('user-1');
      await PermissionService.getUserPermissions('user-2');

      // 2 initial + 2 after invalidation
      expect(db.selectDistinct).toHaveBeenCalledTimes(4);
    });

    it('invalidateAllCache() should clear all cached entries', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await PermissionService.getUserPermissions('user-1');
      await PermissionService.getUserPermissions('user-2');

      PermissionService.invalidateAllCache();

      const stats = PermissionService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });

    it('getCacheStats() should return cache info', async () => {
      (db.selectDistinct as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ permissionName: 'users:read' }]),
            }),
          }),
        }),
      });

      await PermissionService.getUserPermissions('user-1');

      const stats = PermissionService.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0]!.userId).toBe('user-1');
      expect(stats.entries[0]!.expiresIn).toBeGreaterThan(0);
    });
  });
});
