// ===========================================
// Role Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
    return cb({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
  });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      transaction: mockTransaction,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete, mockTransaction },
  };
});

vi.mock('./permission.service.js', () => ({
  PermissionService: {
    invalidateUserCache: vi.fn(),
    invalidateUsersCache: vi.fn(),
  },
}));

import { RoleService } from './role.service.js';
import { db } from '../lib/db.js';
import { PermissionService } from './permission.service.js';

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll()', () => {
    it('should return all roles ordered by name', async () => {
      const roleList = [
        { id: 'r1', name: 'admin', description: 'Admin role', isSystem: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'r2', name: 'user', description: 'User role', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(roleList),
        }),
      });

      const result = await RoleService.getAll();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('getAllWithPermissions()', () => {
    it('should return roles with their permissions', async () => {
      const roleList = [
        { id: 'r1', name: 'admin', description: 'Admin', isSystem: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      const rolePerms = [
        { roleId: 'r1', id: 'p1', name: 'users:read', description: 'Read users', resource: 'users', action: 'read' },
      ];

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(roleList),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(rolePerms),
            }),
          }),
        };
      });

      const result = await RoleService.getAllWithPermissions();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]!.permissions).toHaveLength(1);
      }
    });

    it('should return empty array when no roles exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.getAllWithPermissions();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('getById()', () => {
    it('should return role with permissions', async () => {
      const role = { id: 'r1', name: 'admin', description: 'Admin', isSystem: true, createdAt: new Date(), updatedAt: new Date() };
      const perms = [{ id: 'p1', name: 'users:read', description: 'Read users', resource: 'users', action: 'read' }];

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([role]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(perms),
            }),
          }),
        };
      });

      const result = await RoleService.getById('r1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('admin');
        expect(result.value.permissions).toHaveLength(1);
      }
    });

    it('should return NOT_FOUND for nonexistent role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.getById('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('getByName()', () => {
    it('should return role when found', async () => {
      const role = { id: 'r1', name: 'admin', description: 'Admin', isSystem: true, createdAt: new Date(), updatedAt: new Date() };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([role]),
        }),
      });

      const result = await RoleService.getByName('admin');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.name).toBe('admin');
      }
    });

    it('should return null when not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.getByName('nonexistent');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('create()', () => {
    it('should create a new role with permissions', async () => {
      const createdRole = { id: 'r-new', name: 'editor', description: 'Editor role', isSystem: false, createdAt: new Date(), updatedAt: new Date() };

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Check for existing name
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // getById: find role
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([createdRole]),
            }),
          };
        }
        // getById: find permissions
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { id: 'p1', name: 'users:read', description: 'Read users', resource: 'users', action: 'read' },
              ]),
            }),
          }),
        };
      });

      // Transaction mocks: insert role + insert permissions
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdRole]),
        }),
      });

      const result = await RoleService.create({ name: 'editor', description: 'Editor role', permissionIds: ['p1'] });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('editor');
      }
    });

    it('should return ALREADY_EXISTS for duplicate name', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'r1', name: 'admin' }]),
        }),
      });

      const result = await RoleService.create({ name: 'admin' });

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'ALREADY_EXISTS');
    });
  });

  describe('update()', () => {
    it('should update a non-system role', async () => {
      const existing = { id: 'r1', name: 'editor', isSystem: false };
      const updated = { id: 'r1', name: 'senior-editor', description: 'Updated', isSystem: false, createdAt: new Date(), updatedAt: new Date() };

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Find existing
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([existing]),
            }),
          };
        }
        // Check name uniqueness
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      const result = await RoleService.update('r1', { name: 'senior-editor' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('senior-editor');
      }
    });

    it('should return NOT_FOUND for nonexistent role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.update('nonexistent', { name: 'new-name' });

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return SYSTEM_PROTECTED for system roles', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'r1', name: 'admin', isSystem: true }]),
        }),
      });

      const result = await RoleService.update('r1', { name: 'renamed' });

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'SYSTEM_PROTECTED');
    });
  });

  describe('delete()', () => {
    it('should delete a non-system role and invalidate cache', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1', name: 'editor', isSystem: false }]),
            }),
          };
        }
        // Affected users
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]),
          }),
        };
      });

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await RoleService.delete('r1');

      expect(result.ok).toBe(true);
      expect(PermissionService.invalidateUsersCache).toHaveBeenCalledWith(['u1', 'u2']);
    });

    it('should return NOT_FOUND for nonexistent role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.delete('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return SYSTEM_PROTECTED for system roles', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'r1', name: 'admin', isSystem: true }]),
        }),
      });

      const result = await RoleService.delete('r1');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'SYSTEM_PROTECTED');
    });
  });

  describe('setPermissions()', () => {
    it('should replace permissions for a non-system role', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Find role
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1', name: 'editor', isSystem: false }]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Validate permission IDs
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
            }),
          };
        }
        // Affected users
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ userId: 'u1' }]),
          }),
        };
      });

      // Transaction mocks
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await RoleService.setPermissions('r1', ['p1', 'p2']);

      expect(result.ok).toBe(true);
      expect(PermissionService.invalidateUsersCache).toHaveBeenCalled();
    });

    it('should return NOT_FOUND for nonexistent role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.setPermissions('nonexistent', ['p1']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return SYSTEM_PROTECTED for system roles', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'r1', isSystem: true }]),
        }),
      });

      const result = await RoleService.setPermissions('r1', ['p1']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'SYSTEM_PROTECTED');
    });

    it('should return INVALID_INPUT for invalid permission IDs', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1', isSystem: false }]),
            }),
          };
        }
        // Only 1 out of 2 permissions found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'p1' }]),
          }),
        };
      });

      const result = await RoleService.setPermissions('r1', ['p1', 'invalid-id']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('addPermissions()', () => {
    it('should add new permissions skipping duplicates', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1', isSystem: false }]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Existing permissions
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ permissionId: 'p1' }]),
            }),
          };
        }
        // Affected users
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ userId: 'u1' }]),
          }),
        };
      });

      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await RoleService.addPermissions('r1', ['p1', 'p2']);

      expect(result.ok).toBe(true);
      // Only p2 should be inserted (p1 already exists)
      expect(db.insert).toHaveBeenCalled();
    });

    it('should return NOT_FOUND for nonexistent role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await RoleService.addPermissions('nonexistent', ['p1']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('removePermissions()', () => {
    it('should remove permissions and invalidate cache', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1', isSystem: false }]),
            }),
          };
        }
        // Affected users
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ userId: 'u1' }]),
          }),
        };
      });

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await RoleService.removePermissions('r1', ['p1']);

      expect(result.ok).toBe(true);
      expect(PermissionService.invalidateUsersCache).toHaveBeenCalled();
    });

    it('should return SYSTEM_PROTECTED for system roles', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'r1', isSystem: true }]),
        }),
      });

      const result = await RoleService.removePermissions('r1', ['p1']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'SYSTEM_PROTECTED');
    });
  });
});
