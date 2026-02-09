// ===========================================
// Notifications Table Schema
// ===========================================

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// ===========================================
// Notification Types & Categories (const objects, no enums)
// ===========================================

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SYSTEM: 'system',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_CATEGORIES = {
  ACCOUNT: 'account',
  SECURITY: 'security',
  ADMIN: 'admin',
  SYSTEM: 'system',
  GENERAL: 'general',
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  type: varchar('type', { length: 20 }).default('info').notNull(),
  category: varchar('category', { length: 30 }).default('general').notNull(),
  link: varchar('link', { length: 500 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('notifications_user_id_idx').on(table.userId),
  index('notifications_user_id_read_at_idx').on(table.userId, table.readAt),
  index('notifications_user_id_created_at_idx').on(table.userId, table.createdAt),
]);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
