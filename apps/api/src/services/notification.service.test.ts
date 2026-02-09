// ===========================================
// Notification Service Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so these are available inside hoisted vi.mock() factories
const { mockSelect, mockInsert, mockUpdate, mockDelete, mockEmit, mockTo, mockOf } = vi.hoisted(() => {
  const mockEmit = vi.fn();
  const mockTo = vi.fn(() => ({ emit: mockEmit }));
  const mockOf = vi.fn(() => ({ to: mockTo }));
  return {
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockEmit,
    mockTo,
    mockOf,
  };
});

vi.mock('../lib/db.js', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('../lib/socket.js', () => ({
  getIO: () => ({ of: mockOf }),
}));

vi.mock('../lib/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { NotificationService } from './notification.service.js';

const testNotification = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-123',
  title: 'Test notification',
  body: 'Test body',
  type: 'info',
  category: 'general',
  link: null,
  metadata: null,
  readAt: null,
  createdAt: new Date(),
};

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification and push via socket', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([testNotification]),
        }),
      });

      const result = await NotificationService.create({
        userId: 'user-123',
        title: 'Test notification',
        body: 'Test body',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe('Test notification');
      }
      expect(mockEmit).toHaveBeenCalledWith('notification:new', testNotification);
      expect(mockTo).toHaveBeenCalledWith('user:user-123');
    });

    it('should fail when insert returns empty', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await NotificationService.create({
        userId: 'user-123',
        title: 'Test',
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('list', () => {
    it('should return paginated notifications', async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([testNotification]),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        };
      });

      const result = await NotificationService.list('user-123', 1, 20, false);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.notifications).toHaveLength(1);
        expect(result.value.total).toBe(1);
        expect(result.value.page).toBe(1);
      }
    });
  });

  describe('markRead', () => {
    it('should mark a notification as read', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: testNotification.id }]),
          }),
        }),
      });

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const result = await NotificationService.markRead('user-123', testNotification.id);

      expect(result.ok).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('notification:read', { id: testNotification.id });
    });

    it('should fail when notification not found', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await NotificationService.markRead('user-123', 'nonexistent');

      expect(result.ok).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await NotificationService.markAllRead('user-123');

      expect(result.ok).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('notification:read_all', {});
      expect(mockEmit).toHaveBeenCalledWith('notification:count_update', { unreadCount: 0 });
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: testNotification.id }]),
        }),
      });

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const result = await NotificationService.delete('user-123', testNotification.id);

      expect(result.ok).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('notification:deleted', { id: testNotification.id });
    });

    it('should fail when notification not found', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await NotificationService.delete('user-123', 'nonexistent');

      expect(result.ok).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await NotificationService.getUnreadCount('user-123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(5);
      }
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old notifications', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        }),
      });

      const count = await NotificationService.deleteOlderThan(90);

      expect(count).toBe(2);
    });
  });
});
