// ===========================================
// User Role Service Tests
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
  },
}));

import { UserRoleService } from './user-role.service.js';
import { db } from '../lib/db.js';
import { PermissionService } from './permission.service.js';

describe('UserRoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRoles()', () => {
    it('should return roles for a user', async () => {
      const roles = [
        { id: 'r1', name: 'admin', description: 'Admin', isSystem: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'r2', name: 'user', description: 'User', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(roles),
          }),
        }),
      });

      const result = await UserRoleService.getUserRoles('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should return empty array when user has no roles', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await UserRoleService.getUserRoles('user-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('userHasRole()', () => {
    it('should return true when user has the role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ roleId: 'r1' }]),
          }),
        }),
      });

      const result = await UserRoleService.userHasRole('user-1', 'admin');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when user does not have the role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await UserRoleService.userHasRole('user-1', 'admin');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('assignRole()', () => {
    it('should assign a role to a user', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Verify user exists
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Verify role exists
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1' }]),
            }),
          };
        }
        // Check existing assignment
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await UserRoleService.assignRole('user-1', 'r1');

      expect(result.ok).toBe(true);
      expect(PermissionService.invalidateUserCache).toHaveBeenCalledWith('user-1');
    });

    it('should no-op when role is already assigned', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'r1' }]),
            }),
          };
        }
        // Already assigned
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ userId: 'user-1' }]),
          }),
        };
      });

      const result = await UserRoleService.assignRole('user-1', 'r1');

      expect(result.ok).toBe(true);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await UserRoleService.assignRole('nonexistent', 'r1');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return NOT_FOUND when role does not exist', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            }),
          };
        }
        // Role not found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await UserRoleService.assignRole('user-1', 'nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('removeRole()', () => {
    it('should remove a role and invalidate cache', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await UserRoleService.removeRole('user-1', 'r1');

      expect(result.ok).toBe(true);
      expect(PermissionService.invalidateUserCache).toHaveBeenCalledWith('user-1');
    });
  });

  describe('setRoles()', () => {
    it('should replace all roles for a user', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Verify user exists
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            }),
          };
        }
        // Validate role IDs
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]),
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

      const result = await UserRoleService.setRoles('user-1', ['r1', 'r2']);

      expect(result.ok).toBe(true);
      expect(PermissionService.invalidateUserCache).toHaveBeenCalledWith('user-1');
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await UserRoleService.setRoles('nonexistent', ['r1']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return INVALID_INPUT for invalid role IDs', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            }),
          };
        }
        // Only 1 out of 2 found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'r1' }]),
          }),
        };
      });

      const result = await UserRoleService.setRoles('user-1', ['r1', 'invalid-id']);

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('should handle empty roleIds array', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
        }),
      });

      // Transaction: just delete all roles
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await UserRoleService.setRoles('user-1', []);

      expect(result.ok).toBe(true);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsersWithRoles()', () => {
    it('should return paginated users with their roles', async () => {
      const userList = [
        { id: 'u1', email: 'a@b.com' },
        { id: 'u2', email: 'c@d.com' },
      ];

      const allUserRoles = [
        { userId: 'u1', id: 'r1', name: 'admin', description: 'Admin', isSystem: true, createdAt: new Date(), updatedAt: new Date() },
        { userId: 'u2', id: 'r2', name: 'user', description: 'User', isSystem: false, createdAt: new Date(), updatedAt: new Date() },
      ];

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Count
          return {
            from: vi.fn().mockResolvedValue([{ count: 2 }]),
          };
        }
        if (selectCallCount === 2) {
          // Users
          return {
            from: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(userList),
                }),
              }),
            }),
          };
        }
        // User roles
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(allUserRoles),
            }),
          }),
        };
      });

      const result = await UserRoleService.getAllUsersWithRoles(1, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(2);
        expect(result.value.data[0]!.roles).toHaveLength(1);
        expect(result.value.pagination.total).toBe(2);
      }
    });

    it('should return empty result when no users', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockResolvedValue([{ count: 0 }]),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
      });

      const result = await UserRoleService.getAllUsersWithRoles(1, 20);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(0);
      }
    });
  });

  describe('getUsersWithRole()', () => {
    it('should return users with a specific role', async () => {
      const users = [
        { id: 'u1', email: 'a@b.com' },
        { id: 'u2', email: 'c@d.com' },
      ];

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(users),
          }),
        }),
      });

      const result = await UserRoleService.getUsersWithRole('r1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should return empty when no users have the role', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await UserRoleService.getUsersWithRole('r1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
