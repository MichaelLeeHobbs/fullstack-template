// ===========================================
// Notification Controller Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/notification.service.js', () => ({
  NotificationService: {
    list: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { NotificationController } from './notification.controller.js';
import { NotificationService } from '../services/notification.service.js';
import { createMockRequest, createMockResponse } from '../../test/utils/index.js';

const notificationId = '550e8400-e29b-41d4-a716-446655440000';

describe('NotificationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list()', () => {
    it('should return 200 with paginated notifications', async () => {
      const listResult = {
        notifications: [{ id: notificationId, title: 'Test' }],
        total: 1,
        unreadCount: 1,
        page: 1,
        limit: 20,
      };
      (NotificationService.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: listResult,
      });

      const req = createMockRequest({
        user: { id: 'u1' },
        query: { page: 1, limit: 20, unreadOnly: false },
      });
      const res = createMockResponse();

      await NotificationController.list(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: {
          notifications: listResult.notifications,
          meta: {
            total: 1,
            unreadCount: 1,
            page: 1,
            limit: 20,
          },
        },
      });
    });

    it('should return 500 on service error', async () => {
      (NotificationService.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({
        user: { id: 'u1' },
        query: { page: 1, limit: 20, unreadOnly: false },
      });
      const res = createMockResponse();

      await NotificationController.list(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('unreadCount()', () => {
    it('should return 200 with unread count', async () => {
      (NotificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: 5,
      });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await NotificationController.unreadCount(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { unreadCount: 5 } });
    });

    it('should return 500 on error', async () => {
      (NotificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await NotificationController.unreadCount(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('markRead()', () => {
    it('should return 200 on success', async () => {
      (NotificationService.markRead as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({
        user: { id: 'u1' },
        params: { id: notificationId },
      });
      const res = createMockResponse();

      await NotificationController.markRead(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'Notification marked as read' } });
    });

    it('should return 404 when not found', async () => {
      (NotificationService.markRead as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Notification not found'),
      });

      const req = createMockRequest({
        user: { id: 'u1' },
        params: { id: notificationId },
      });
      const res = createMockResponse();

      await NotificationController.markRead(req, res as any);

      expect(res._status).toBe(404);
    });
  });

  describe('markAllRead()', () => {
    it('should return 200 on success', async () => {
      (NotificationService.markAllRead as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await NotificationController.markAllRead(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'All notifications marked as read' } });
    });

    it('should return 500 on error', async () => {
      (NotificationService.markAllRead as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('DB error'),
      });

      const req = createMockRequest({ user: { id: 'u1' } });
      const res = createMockResponse();

      await NotificationController.markAllRead(req, res as any);

      expect(res._status).toBe(500);
    });
  });

  describe('remove()', () => {
    it('should return 200 on success', async () => {
      (NotificationService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const req = createMockRequest({
        user: { id: 'u1' },
        params: { id: notificationId },
      });
      const res = createMockResponse();

      await NotificationController.remove(req, res as any);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data: { message: 'Notification deleted' } });
    });

    it('should return 404 when not found', async () => {
      (NotificationService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: new Error('Notification not found'),
      });

      const req = createMockRequest({
        user: { id: 'u1' },
        params: { id: notificationId },
      });
      const res = createMockResponse();

      await NotificationController.remove(req, res as any);

      expect(res._status).toBe(404);
    });
  });
});
