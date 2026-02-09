// ===========================================
// Notification Service
// ===========================================
// CRUD for notifications with real-time push via Socket.IO.

import { tryCatch, type Result } from 'stderr-lib';
import { ServiceError } from '../lib/service-error.js';
import { db } from '../lib/db.js';
import { notifications, type NewNotification } from '../db/schema/index.js';
import { eq, and, isNull, desc, count, lt } from 'drizzle-orm';
import { getIO } from '../lib/socket.js';
import { NOTIFICATION_EVENTS } from '../socket/notifications.namespace.js';
import logger from '../lib/logger.js';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  category?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListResult {
  notifications: typeof notifications.$inferSelect[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export class NotificationService {
  static async create(input: CreateNotificationInput): Promise<Result<typeof notifications.$inferSelect>> {
    return tryCatch(async () => {
      const values: NewNotification = {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type ?? 'info',
        category: input.category ?? 'general',
        link: input.link,
        metadata: input.metadata,
      };

      const [notification] = await db
        .insert(notifications)
        .values(values)
        .returning();

      if (!notification) {
        throw new Error('Failed to create notification');
      }

      // Push real-time event (fire-and-forget)
      this.pushToUser(input.userId, NOTIFICATION_EVENTS.NEW, notification);

      return notification;
    });
  }

  static async list(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): Promise<Result<NotificationListResult>> {
    return tryCatch(async () => {
      const offset = (page - 1) * limit;

      const whereClause = unreadOnly
        ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
        : eq(notifications.userId, userId);

      const [items, [totalRow], [unreadRow]] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(whereClause)
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(notifications)
          .where(whereClause),
        db
          .select({ count: count() })
          .from(notifications)
          .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
      ]);

      return {
        notifications: items,
        total: totalRow?.count ?? 0,
        unreadCount: unreadRow?.count ?? 0,
        page,
        limit,
      };
    });
  }

  static async markRead(userId: string, notificationId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const [updated] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
        .returning({ id: notifications.id });

      if (!updated) {
        throw new ServiceError('NOT_FOUND', 'Notification not found');
      }

      // Push updated unread count
      const unreadCount = await this.getUnreadCountInternal(userId);
      this.pushToUser(userId, NOTIFICATION_EVENTS.READ, { id: notificationId });
      this.pushToUser(userId, NOTIFICATION_EVENTS.COUNT_UPDATE, { unreadCount });
    });
  }

  static async markAllRead(userId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

      this.pushToUser(userId, NOTIFICATION_EVENTS.READ_ALL, {});
      this.pushToUser(userId, NOTIFICATION_EVENTS.COUNT_UPDATE, { unreadCount: 0 });
    });
  }

  static async delete(userId: string, notificationId: string): Promise<Result<void>> {
    return tryCatch(async () => {
      const [deleted] = await db
        .delete(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
        .returning({ id: notifications.id });

      if (!deleted) {
        throw new ServiceError('NOT_FOUND', 'Notification not found');
      }

      const unreadCount = await this.getUnreadCountInternal(userId);
      this.pushToUser(userId, NOTIFICATION_EVENTS.DELETED, { id: notificationId });
      this.pushToUser(userId, NOTIFICATION_EVENTS.COUNT_UPDATE, { unreadCount });
    });
  }

  static async getUnreadCount(userId: string): Promise<Result<number>> {
    return tryCatch(async () => {
      return this.getUnreadCountInternal(userId);
    });
  }

  // --- Private helpers ---

  private static async getUnreadCountInternal(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.count ?? 0;
  }

  private static pushToUser(userId: string, event: string, data: unknown): void {
    try {
      const io = getIO();
      if (io) {
        io.of('/notifications').to(`user:${userId}`).emit(event, data);
      }
    } catch (error) {
      logger.debug({ error, userId, event }, 'Failed to push socket event');
    }
  }

  /**
   * Delete notifications older than the given number of days.
   * Used by the cleanup job.
   */
  static async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const deleted = await db
      .delete(notifications)
      .where(lt(notifications.createdAt, cutoff))
      .returning({ id: notifications.id });

    return deleted.length;
  }
}
