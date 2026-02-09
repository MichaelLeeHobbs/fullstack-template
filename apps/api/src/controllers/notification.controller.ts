// ===========================================
// Notification Controller
// ===========================================
// Handles notification CRUD HTTP endpoints.

import type { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';
import type { ListNotificationsQuery, NotificationIdParam } from '../schemas/notification.schema.js';
import logger from '../lib/logger.js';

export class NotificationController {
  /**
   * GET /api/v1/notifications
   */
  static async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { page, limit, unreadOnly } = req.query as unknown as ListNotificationsQuery;

    const result = await NotificationService.list(userId, page, limit, unreadOnly);

    if (!result.ok) {
      logger.error({ error: result.error.toString() }, 'Failed to list notifications');
      return void res.status(500).json({ success: false, error: 'Failed to list notifications' });
    }

    res.json({
      success: true,
      data: {
        notifications: result.value.notifications,
        meta: {
          total: result.value.total,
          unreadCount: result.value.unreadCount,
          page: result.value.page,
          limit: result.value.limit,
        },
      },
    });
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  static async unreadCount(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const result = await NotificationService.getUnreadCount(userId);

    if (!result.ok) {
      logger.error({ error: result.error.toString() }, 'Failed to get unread count');
      return void res.status(500).json({ success: false, error: 'Failed to get unread count' });
    }

    res.json({ success: true, data: { unreadCount: result.value } });
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params as unknown as NotificationIdParam;

    const result = await NotificationService.markRead(userId, id);

    if (!result.ok) {
      return void res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: { message: 'Notification marked as read' } });
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  static async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const result = await NotificationService.markAllRead(userId);

    if (!result.ok) {
      logger.error({ error: result.error.toString() }, 'Failed to mark all read');
      return void res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }

    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  }

  /**
   * DELETE /api/v1/notifications/:id
   */
  static async remove(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params as unknown as NotificationIdParam;

    const result = await NotificationService.delete(userId, id);

    if (!result.ok) {
      return void res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: { message: 'Notification deleted' } });
  }
}
