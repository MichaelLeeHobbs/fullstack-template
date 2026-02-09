// ===========================================
// Notification Validation Schemas
// ===========================================

import { z } from 'zod/v4';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
