// ===========================================
// Notifications Namespace
// ===========================================
// Socket.IO /notifications namespace for real-time notification delivery.

import type { Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/socket-auth.middleware.js';
import logger from '../lib/logger.js';

export const NOTIFICATION_EVENTS = {
  NEW: 'notification:new',
  READ: 'notification:read',
  READ_ALL: 'notification:read_all',
  DELETED: 'notification:deleted',
  COUNT_UPDATE: 'notification:count_update',
} as const;

export function registerNotificationsNamespace(io: SocketIOServer): void {
  const nsp = io.of('/notifications');

  nsp.use(socketAuthMiddleware);

  nsp.on('connection', (socket) => {
    const userId = socket.data.user.id;

    // Join user-specific room
    socket.join(`user:${userId}`);

    logger.debug({ userId }, 'Socket connected to /notifications');

    // Convenience: client can emit mark_read directly over socket
    socket.on('notification:mark_read', async (notificationId: string) => {
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        await NotificationService.markRead(userId, notificationId);
      } catch {
        // Fire-and-forget — errors handled inside service
      }
    });

    socket.on('disconnect', () => {
      logger.debug({ userId }, 'Socket disconnected from /notifications');
    });
  });
}
