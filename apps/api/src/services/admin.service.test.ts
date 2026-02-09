// ===========================================
// Admin Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
    __mocks: { mockSelect, mockInsert, mockUpdate, mockDelete },
  };
});

vi.mock('./permission.service.js', () => ({
  PermissionService: {
    invalidateUserCache: vi.fn(),
    invalidateUsersCache: vi.fn(),
  },
}));

import { AdminService } from './admin.service.js';
import { db } from '../lib/db.js';

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers()', () => {
    it('should return paginated user list', async () => {
      const users = [
        { id: 'u1', email: 'a@b.com', isAdmin: false, isActive: true, emailVerified: true, createdAt: new Date(), lastLoginAt: null },
      ];

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Count query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          };
        }
        // Users query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(users),
                }),
              }),
            }),
          }),
        };
      });

      const result = await AdminService.listUsers({ page: 1, limit: 10 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.pagination.total).toBe(1);
      }
    });

    it('should return empty results when no users match', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        };
      });

      const result = await AdminService.listUsers({ page: 1, limit: 10, search: 'nonexistent' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(0);
      }
    });

    it('should support filtering by isActive', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        };
      });

      const result = await AdminService.listUsers({ page: 1, limit: 10, isActive: true });

      expect(result.ok).toBe(true);
    });
  });

  describe('getUser()', () => {
    it('should return user details', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        isAdmin: false,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([user]),
        }),
      });

      const result = await AdminService.getUser('u1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe('a@b.com');
      }
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await AdminService.getUser('nonexistent');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('updateUser()', () => {
    it('should update user and return updated record', async () => {
      const updated = {
        id: 'u1',
        email: 'a@b.com',
        isAdmin: true,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      const result = await AdminService.updateUser('u1', { isAdmin: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isAdmin).toBe(true);
      }
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await AdminService.updateUser('nonexistent', { isActive: false });

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should invalidate permission cache when isAdmin changes', async () => {
      const { PermissionService } = await import('./permission.service.js');

      const updated = {
        id: 'u1',
        email: 'a@b.com',
        isAdmin: true,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      await AdminService.updateUser('u1', { isAdmin: true });

      expect(PermissionService.invalidateUserCache).toHaveBeenCalledWith('u1');
    });
  });

  describe('deleteUser()', () => {
    it('should delete user successfully', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });

      const result = await AdminService.deleteUser('u1', 'admin-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.message).toContain('deleted');
      }
    });

    it('should return NOT_FOUND when user does not exist', async () => {
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });

      const result = await AdminService.deleteUser('nonexistent', 'admin-1');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should prevent self-deletion', async () => {
      const result = await AdminService.deleteUser('admin-1', 'admin-1');

      expect(result.ok).toBe(false);
      expect(result.error).toHaveProperty('code', 'SELF_ACTION');
    });
  });

  describe('listAuditLogs()', () => {
    it('should return paginated audit logs', async () => {
      const logs = [
        { id: 'log-1', userId: 'u1', action: 'login', ipAddress: '127.0.0.1', userAgent: 'Chrome', details: null, success: true, createdAt: new Date(), actorEmail: 'a@b.com' },
      ];

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(logs),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await AdminService.listAuditLogs(1, 10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toHaveLength(1);
        expect(result.value.pagination.total).toBe(1);
      }
    });

    it('should filter by userId when provided', async () => {
      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await AdminService.listAuditLogs(1, 10, 'user-1');

      expect(result.ok).toBe(true);
    });
  });
});
